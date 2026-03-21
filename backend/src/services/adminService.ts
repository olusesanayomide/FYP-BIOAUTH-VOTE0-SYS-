import { supabase } from '../config/supabase';
import { ApiError } from '../middleware/errorHandler';
import bcrypt from 'bcryptjs';
import { parse } from 'csv-parse/sync';
import * as XLSX from 'xlsx';

/**
 * Retrieves high-level dashboard metrics for the Admin Command Center
 */
export const getDashboardStats = async () => {
    try {
        // 1. Admins Online
        // We approximate "online" as admins who logged in within the last 15 minutes.
        const onlineWindowMs = 15 * 60 * 1000;
        const onlineCutoff = new Date(Date.now() - onlineWindowMs).toISOString();
        const { count: totalAdmins, error: adminError } = await supabase
            .from('admin')
            .select('*', { count: 'exact', head: true })
            .gte('last_login_at', onlineCutoff);

        if (adminError) throw adminError;

        // 2. Total Voters
        // Count all users whose user_type is 'STUDENT' or role is 'VOTER'
        const { count: totalVoters, error: voterError } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true });

        if (voterError) throw voterError;

        // 3. Verified Bio
        // Count all users where registration is entirely completed (meaning face + otp done).
        const { count: verifiedBio, error: bioError } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('registration_completed', true);

        if (bioError) throw bioError;

        // 4. Fetch 3 Elections and compute progress
        const { data: dbElections, error: electionsError } = await supabase
            .from('elections')
            .select(`
                id, title, start_time, end_time, status,
                votes ( voter_id )
            `)
            .order('start_time', { ascending: false })
            .limit(3);

        const activeElections = (dbElections || []).map(el => {
            const now = new Date();
            const startStr = el.start_time;
            const endStr = el.end_time;

            // Handle potentially missing dates safely
            const start = startStr ? new Date(startStr) : new Date();
            const end = endStr ? new Date(endStr) : new Date();

            let status = 'completed';
            if (now >= start && now <= end) status = 'ongoing';
            else if (now < start) status = 'upcoming';

            const uniqueVoters = new Set((el.votes || []).map((v: any) => v.voter_id));
            const votesCount = uniqueVoters.size;

            let progress = 0;
            if (status === 'completed') progress = 100;
            else if (status === 'ongoing') {
                const totalDuration = end.getTime() - start.getTime();
                const elapsed = now.getTime() - start.getTime();
                progress = totalDuration > 0 ? Math.round((elapsed / totalDuration) * 100) : 0;
            }

            return {
                id: el.id,
                name: el.title,
                status,
                start: start.toLocaleDateString(),
                end: end.toLocaleDateString(),
                voters: totalVoters?.toLocaleString() || "0", // Total scope representation
                verified: votesCount.toLocaleString(), // Number of people who actually cast ballots
                progress: Math.min(100, Math.max(0, progress))
            };
        });

        // 5. Fetch 5 Recent Actions from Audit Logs
        const { data: dbLogs } = await supabase
            .from('audit_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(5);

        const recentActions = (dbLogs || []).map(log => ({
            text: `${log.action.replace(/_/g, ' ')} - ${log.resource_type || log.entity_type} ${log.status || log.entity_status}`,
            time: new Date(log.created_at).toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })
        }));

        return {
            success: true,
            data: {
                adminsOnline: totalAdmins || 0,
                totalVoters: totalVoters || 0,
                verifiedBio: verifiedBio || 0,
                elections: activeElections,
                recentActions: recentActions
            }
        };
    } catch (error: any) {
        console.error('Error fetching dashboard stats:', error);
        throw new ApiError(500, 'Failed to retrieve command center statistics', 'DATABASE_ERROR');
    }
};

/**
 * Creates a new election with advanced scope and integrity settings
 */
export const createElection = async (electionData: any, adminId: string) => {
    try {
        const {
            name, description, type, scopeFaculty, scopeDepartment, scopeLevel,
            startDate, endDate, votingMethod, maxVotes, biometricEnforced, realTimeMonitoring,
            eligibilityRules
        } = electionData;

        if (!name || !startDate || !endDate) {
            throw new ApiError(400, 'Name, start date, and end date are required', 'VALIDATION_ERROR');
        }

        const basePayload: any = {
            title: name,
            description: description,
            type: type,
            status: 'upcoming',
            start_time: startDate,
            end_time: endDate,
            voting_method: votingMethod,
            max_votes: maxVotes,
            require_biometrics: biometricEnforced,
            biometric_enforced: biometricEnforced,
            real_time_monitoring: realTimeMonitoring,
            scope_faculty: scopeFaculty,
            scope_department: scopeDepartment,
            scope_level: scopeLevel ? parseInt(scopeLevel) : 0,
        };

        if (eligibilityRules) {
            basePayload.eligibility_rules = eligibilityRules;
        }

        let { data, error } = await supabase
            .from('elections')
            .insert([basePayload])
            .select()
            .single();

        // Backward-compatibility: if the column does not exist yet, retry without it.
        if (error && eligibilityRules && String((error as any).message || '').toLowerCase().includes('eligibility_rules')) {
            const fallbackPayload = { ...basePayload };
            delete fallbackPayload.eligibility_rules;
            const retry = await supabase
                .from('elections')
                .insert([fallbackPayload])
                .select()
                .single();
            data = retry.data;
            error = retry.error;
        }

        if (error) throw error;

        // Log audit action
        await supabase.from('audit_logs').insert({
            action: 'ELECTION_CREATED',
            resource_type: 'ELECTION',
            resource_id: data.id,
            admin_id: adminId,
            status: 'SUCCESS',
            details: JSON.stringify({
                title: data.title,
                type: data.type,
                description: `Created new election: ${data.title}`
            })
        });

        return {
            success: true,
            message: 'Election successfully created',
            data
        };
    } catch (error: any) {
        console.error('Error creating election:', error);
        if (error instanceof ApiError) throw error;
        throw new ApiError(500, 'Failed to create election', 'DATABASE_ERROR');
    }
};

/**
 * Retrieves all elections for the admin dashboard
 */
export const getAllElections = async () => {
    try {
        const { data: elections, error } = await supabase
            .from('elections')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Populate analytics for each election
        const electionsWithStats = await Promise.all((elections || []).map(async (election) => {
            try {
                // Determine scope-based registered voters
                let usersQuery = supabase.from('users').select('id, registration_completed', { count: 'exact' }).eq('role', 'VOTER');

                if (election.type === 'Faculty' || election.type === 'Departmental') {
                    if (election.scope_faculty && election.scope_faculty !== 'All' && election.scope_faculty !== 'University-Wide') {
                        usersQuery = usersQuery.eq('faculty', election.scope_faculty);
                    }
                    if (election.type === 'Departmental' && election.scope_department && election.scope_department !== 'All' && election.scope_department !== 'University-Wide') {
                        usersQuery = usersQuery.eq('department', election.scope_department);
                    }
                }

                if (election.scope_level && election.scope_level > 0) {
                    usersQuery = usersQuery.eq('level', election.scope_level);
                }

                const { data: usersInScope } = await usersQuery;
                const totalRegistered = usersInScope ? usersInScope.length : 0;
                const totalVerified = usersInScope ? usersInScope.filter(u => u.registration_completed).length : 0;

                // Total unique votes cast
                const { data: voteRows } = await supabase
                    .from('votes')
                    .select('voter_id')
                    .eq('election_id', election.id);

                const uniqueVoters = new Set((voteRows || []).map(r => r.voter_id));
                const votesCast = uniqueVoters.size;

                return {
                    ...election,
                    registeredVoters: totalRegistered,
                    verifiedBiometric: totalVerified,
                    votesCast: votesCast,
                    fraudAlerts: 0 // Placeholder
                };
            } catch (err) {
                console.error(`Error fetching analytics for election ${election.id}:`, err);
                return {
                    ...election,
                    registeredVoters: 0,
                    verifiedBiometric: 0,
                    votesCast: 0,
                    fraudAlerts: 0
                };
            }
        }));

        return {
            success: true,
            data: electionsWithStats
        };
    } catch (error: any) {
        console.error('Error fetching elections:', error);
        throw new ApiError(500, 'Failed to retrieve elections', 'DATABASE_ERROR');
    }
};

/**
 * Retrieves all candidates
 */
export const getAllCandidates = async () => {
    try {
        const { data, error } = await supabase
            .from('candidates')
            .select(`
                *,
                elections:election_id (
                    title
                )
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;

        const candidateIds = (data || []).map((cand: any) => cand.id);
        let approvalHistoryByCandidate = new Map<string, any[]>();

        if (candidateIds.length > 0) {
            const { data: auditRows, error: auditError } = await supabase
                .from('audit_logs')
                .select(`
                    resource_id,
                    action,
                    created_at,
                    details,
                    admin:admin_id (username)
                `)
                .eq('resource_type', 'CANDIDATE')
                .in('resource_id', candidateIds)
                .in('action', ['CANDIDATE_CREATED', 'CANDIDATE_STATUS_UPDATED'])
                .order('created_at', { ascending: false });

            if (auditError) throw auditError;

            for (const log of (auditRows || [])) {
                const candidateId = (log as any).resource_id;
                const existing = approvalHistoryByCandidate.get(candidateId) || [];

                let details: any = {};
                try {
                    details = (log as any).details ? JSON.parse((log as any).details) : {};
                } catch {
                    details = {};
                }

                let actionLabel = 'Updated';
                if ((log as any).action === 'CANDIDATE_CREATED') {
                    actionLabel = 'Created';
                } else if ((log as any).action === 'CANDIDATE_STATUS_UPDATED') {
                    const status = String(details?.new_status || '').toLowerCase();
                    if (status === 'approved') actionLabel = 'Approved';
                    else if (status === 'rejected') actionLabel = 'Rejected';
                    else if (status === 'pending') actionLabel = 'Set to Pending';
                    else actionLabel = 'Status Updated';
                }

                existing.push({
                    date: (log as any).created_at,
                    action: actionLabel,
                    admin: (log as any).admin?.username || 'System',
                    note: details?.description || `${actionLabel} candidate`
                });

                approvalHistoryByCandidate.set(candidateId, existing);
            }
        }

        const normalized = (data || []).map((cand: any) => ({
            ...cand,
            election_name: cand?.elections?.title || 'Unknown Election',
            approval_history: approvalHistoryByCandidate.get(cand.id) || []
        }));

        return {
            success: true,
            data: normalized
        };
    } catch (error: any) {
        console.error('Error fetching candidates:', error);
        throw new ApiError(500, 'Failed to retrieve candidates', 'DATABASE_ERROR');
    }
};

/**
 * Retrieves all registered voters
 */
export const getAllVoters = async () => {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('id, matric_no, email, name, registration_completed, faculty, department, created_at, status')
            .eq('role', 'VOTER')
            .order('created_at', { ascending: false });

        if (error) throw error;

        const voterIds = (data || []).map((u: any) => u.id);
        let voteRows: any[] = [];

        if (voterIds.length > 0) {
            const { data: votesData, error: votesError } = await supabase
                .from('votes')
                .select('voter_id, created_at')
                .in('voter_id', voterIds);

            if (votesError) throw votesError;
            voteRows = votesData || [];
        }

        let loginRows: any[] = [];
        if (voterIds.length > 0) {
            const { data: auditData, error: auditError } = await supabase
                .from('audit_logs')
                .select('user_id, action, created_at, ip_address, user_agent')
                .in('user_id', voterIds)
                .in('action', ['WEBAUTHN_LOGIN_SUCCESS', 'LOGIN_OTP_SUCCESS'])
                .order('created_at', { ascending: false });

            if (auditError) throw auditError;
            loginRows = auditData || [];
        }

        const lastVotedAtByUser = new Map<string, string>();
        for (const row of voteRows) {
            const existing = lastVotedAtByUser.get(row.voter_id);
            if (!existing || new Date(row.created_at) > new Date(existing)) {
                lastVotedAtByUser.set(row.voter_id, row.created_at);
            }
        }

        const latestLoginByUser = new Map<string, any>();
        const loginHistoryByUser = new Map<string, any[]>();

        for (const row of loginRows) {
            if (!row.user_id) continue;

            if (!latestLoginByUser.has(row.user_id)) {
                latestLoginByUser.set(row.user_id, row);
            }

            const history = loginHistoryByUser.get(row.user_id) || [];
            if (history.length < 5) {
                history.push(row);
                loginHistoryByUser.set(row.user_id, history);
            }
        }

        const enriched = (data || []).map((u: any) => ({
            ...u,
            has_voted: lastVotedAtByUser.has(u.id),
            last_voted_at: lastVotedAtByUser.get(u.id) || null,
            last_login_at: latestLoginByUser.get(u.id)?.created_at || null,
            last_login_ip: latestLoginByUser.get(u.id)?.ip_address || null,
            last_login_user_agent: latestLoginByUser.get(u.id)?.user_agent || null,
            login_history: (loginHistoryByUser.get(u.id) || []).map((entry: any) => ({
                created_at: entry.created_at,
                ip_address: entry.ip_address,
                user_agent: entry.user_agent
            }))
        }));

        return {
            success: true,
            data: enriched
        };
    } catch (error: any) {
        console.error('Error fetching voters:', error);
        throw new ApiError(500, 'Failed to retrieve voters', 'DATABASE_ERROR');
    }
};

/**
 * Updates a voter's status (e.g., suspend or activate)
 */
export const updateVoterStatus = async (id: string, status: string, adminId: string) => {
    try {
        const { data, error } = await supabase
            .from('users')
            .update({ status })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        // Log audit action
        await supabase.from('audit_logs').insert({
            action: 'VOTER_STATUS_UPDATED',
            resource_type: 'VOTER',
            resource_id: id,
            admin_id: adminId, // The admin performing the action
            status: 'SUCCESS',
            details: JSON.stringify({
                name: (data as any)?.name,
                matric_no: (data as any)?.matric_no,
                new_status: status,
                description: `Updated status of voter ${(data as any)?.name} to ${status}`
            })
        });

        return {
            success: true,
            message: `Voter status updated to ${status}`,
            data
        };
    } catch (error: any) {
        console.error('Error updating voter status:', error);
        throw new ApiError(500, 'Failed to update voter status', 'DATABASE_ERROR');
    }
};

/**
 * Permanently deletes a voter
 */
export const deleteVoter = async (id: string, adminId: string) => {
    try {
        // 1. Fetch voter details for auditing before deletion
        const { data: voter } = await supabase
            .from('users')
            .select('name, email, matric_no')
            .eq('id', id)
            .single();

        // 2. Delete the voter
        const { error } = await supabase
            .from('users')
            .delete()
            .eq('id', id);

        if (error) throw error;

        // 3. Log audit action
        await supabase.from('audit_logs').insert({
            action: 'VOTER_DELETED',
            resource_type: 'VOTER',
            resource_id: id,
            admin_id: adminId,
            status: 'SUCCESS',
            details: JSON.stringify({
                name: voter?.name,
                email: voter?.email,
                matric_no: voter?.matric_no,
                description: `Permanently deleted voter ${voter?.name} (${voter?.matric_no})`
            })
        });

        return {
            success: true,
            message: 'Voter successfully deleted'
        };
    } catch (error: any) {
        console.error('Error deleting voter:', error);
        throw new ApiError(500, 'Failed to delete voter', 'DATABASE_ERROR');
    }
};

/**
 * Creates a new candidate
 */
export const createCandidate = async (candidateData: any, adminId: string) => {
    try {
        const {
            name, position, studentId, email, bio, electionId, status, party, photoUrl, manifestoUrl,
            faculty: manualFaculty, department: manualDepartment, level: manualLevel
        } = candidateData;

        if (!name || !position || !studentId || !electionId) {
            throw new ApiError(400, 'Missing required fields for candidate registration', 'VALIDATION_ERROR');
        }

        // Fetch election name for denormalized storage
        const { data: electionData, error: electionError } = await supabase
            .from('elections')
            .select('title')
            .eq('id', electionId)
            .single();

        const electionName = electionData ? electionData.title : 'Unknown Election';

        // Auto-lookup the student's real faculty, department and level from their registered user profile
        const { data: studentInfo } = await supabase
            .from('users')
            .select('faculty, department, level')
            .eq('matric_no', studentId)
            .single();

        const faculty = studentInfo?.faculty || manualFaculty || 'Unknown';
        const department = studentInfo?.department || manualDepartment || 'Unknown';
        const level = studentInfo?.level || manualLevel || 'Unknown';

        const { data, error } = await supabase
            .from('candidates')
            .insert([{
                name,
                position,
                student_id: studentId,
                email,
                bio,
                faculty,
                department,
                level,
                election_id: electionId,
                status: status || 'pending',
                party: party || 'Independent',
                photo_url: photoUrl,
                manifesto_url: manifestoUrl
            }])
            .select(`
                *,
                elections:election_id (
                    title
                )
            `)
            .single();

        if (error) throw error;

        // Log audit action
        await supabase.from('audit_logs').insert({
            action: 'CANDIDATE_CREATED',
            resource_type: 'CANDIDATE',
            resource_id: data.id,
            admin_id: adminId,
            status: 'SUCCESS',
            details: JSON.stringify({
                name: data.name,
                position: data.position,
                election_name: electionName,
                description: `Added candidate ${data.name} to election ${electionName}`
            })
        });

        const responseData = {
            ...data,
            election_name: data?.elections?.title || electionName
        };

        return {
            success: true,
            message: 'Candidate created successfully',
            data: responseData
        };
    } catch (error: any) {
        console.error('Error creating candidate:', error);
        if (error instanceof ApiError) throw error;
        throw new ApiError(500, 'Failed to create candidate', 'DATABASE_ERROR');
    }
};

/**
 * Updates a candidate's status
 */
export const updateCandidateStatus = async (id: string, status: string, adminId: string) => {
    try {
        const { data, error } = await supabase
            .from('candidates')
            .update({ status })
            .eq('id', id)
            .select('id, name, position, status')
            .single();

        if (error) throw error;

        // Log audit action
        await supabase.from('audit_logs').insert({
            action: 'CANDIDATE_STATUS_UPDATED',
            resource_type: 'CANDIDATE',
            resource_id: id,
            admin_id: adminId,
            status: 'SUCCESS',
            details: JSON.stringify({
                name: (data as any).name,
                new_status: status,
                description: `Updated status of candidate ${(data as any).name} to ${status}`
            })
        });

        return {
            success: true,
            message: `Candidate status updated to ${status}`,
            data
        };
    } catch (error: any) {
        console.error('Error updating candidate:', error);
        throw new ApiError(500, 'Failed to update candidate status', 'DATABASE_ERROR');
    }
};

/**
 * Deletes a rejected candidate 
 */
export const deleteCandidate = async (id: string, adminId: string) => {
    try {
        // Enforce they must be rejected first
        const { data: cand, error: fetchErr } = await supabase
            .from('candidates')
            .select('name, status')
            .eq('id', id)
            .single();

        if (fetchErr || !cand) throw new ApiError(404, 'Candidate not found', 'NOT_FOUND');
        if (cand.status !== 'rejected') throw new ApiError(400, 'Only rejected candidates can be deleted', 'VALIDATION_ERROR');

        const { error } = await supabase
            .from('candidates')
            .delete()
            .eq('id', id);

        if (error) throw error;

        // Log audit action
        await supabase.from('audit_logs').insert({
            action: 'CANDIDATE_DELETED',
            resource_type: 'CANDIDATE',
            resource_id: id,
            admin_id: adminId,
            status: 'SUCCESS',
            details: JSON.stringify({
                name: (cand as any).name,
                description: `Permanently deleted candidate ${(cand as any).name}`
            })
        });

        return {
            success: true,
            message: 'Candidate permanently deleted'
        };
    } catch (error: any) {
        console.error('Error deleting candidate:', error);
        if (error instanceof ApiError) throw error;
        throw new ApiError(500, 'Failed to delete candidate', 'DATABASE_ERROR');
    }
};

/**
 * Permanently deletes an election and all associated data
 */
export const deleteElection = async (id: string, adminId: string) => {
    try {
        // 0. Fetch election title for audit
        const { data: election } = await supabase.from('elections').select('title').eq('id', id).single();

        console.log(`[AdminService] Initiating permanent deletion for election: ${id}`);

        // 1. Delete associated votes
        const { error: votesError } = await supabase.from('votes').delete().eq('election_id', id);
        if (votesError) {
            console.error('Error deleting associated votes:', votesError);
            throw new ApiError(500, `Failed to delete associated votes: ${votesError.message}`, 'DATABASE_ERROR');
        }

        // 2. Delete associated voter records
        const { error: recError } = await supabase.from('voter_records').delete().eq('election_id', id);
        if (recError) {
            console.error('Error deleting voter records:', recError);
            throw new ApiError(500, `Failed to delete voter records: ${recError.message}`, 'DATABASE_ERROR');
        }

        // 3. Delete associated candidates (NOTE: should also cleanup storage files eventually)
        const { error: candError } = await supabase.from('candidates').delete().eq('election_id', id);
        if (candError) {
            console.error('Error deleting candidates:', candError);
            throw new ApiError(500, `Failed to delete candidates: ${candError.message}`, 'DATABASE_ERROR');
        }

        // 4. Delete associated positions
        const { error: posError } = await supabase.from('positions').delete().eq('election_id', id);
        if (posError) {
            console.error('Error deleting positions:', posError);
            throw new ApiError(500, `Failed to delete positions: ${posError.message}`, 'DATABASE_ERROR');
        }

        // 5. Finally delete the election itself
        const { error: electionError } = await supabase
            .from('elections')
            .delete()
            .eq('id', id);

        if (electionError) {
            console.error('Error deleting main election record:', electionError);
            throw new ApiError(500, `Failed to delete main election record: ${electionError.message}`, 'DATABASE_ERROR');
        }

        console.log(`[AdminService] Election ${id} and all associated data deleted successfully`);

        // Log audit action
        await supabase.from('audit_logs').insert({
            action: 'ELECTION_DELETED',
            resource_type: 'ELECTION',
            resource_id: id,
            admin_id: adminId,
            status: 'SUCCESS',
            details: JSON.stringify({
                title: election?.title,
                description: `Permanently deleted election ${election?.title} and all its associated data`
            })
        });

        return {
            success: true,
            message: 'Election and all associated data permanently deleted'
        };
    } catch (error: any) {
        console.error('Error in deleteElection service:', error);
        if (error instanceof ApiError) throw error;
        throw new ApiError(500, error.message || 'Failed to delete election and associated records', 'DATABASE_ERROR');
    }
};

/**
 * Updates a specific election
 */
export const updateElection = async (id: string, electionData: any, adminId: string) => {
    try {
        const {
            name, description, type, scopeFaculty, scopeDepartment, scopeLevel,
            startDate, endDate, votingMethod, maxVotes, biometricEnforced, realTimeMonitoring,
            eligibilityRules
        } = electionData;

        if (!name || !startDate || !endDate) {
            throw new ApiError(400, 'Name, start date, and end date are required', 'VALIDATION_ERROR');
        }

        const updatePayload: any = {
            title: name,
            description: description,
            type: type,
            start_time: startDate === "" ? null : startDate,
            end_time: endDate === "" ? null : endDate,
            voting_method: votingMethod,
            max_votes: maxVotes,
            require_biometrics: biometricEnforced,
            biometric_enforced: biometricEnforced,
            real_time_monitoring: realTimeMonitoring,
            scope_faculty: scopeFaculty,
            scope_department: scopeDepartment,
            scope_level: scopeLevel ? parseInt(scopeLevel.toString()) : 0,
        };

        if (typeof eligibilityRules === 'string') {
            updatePayload.eligibility_rules = eligibilityRules;
        }

        let { data, error } = await supabase
            .from('elections')
            .update(updatePayload)
            .eq('id', id)
            .select()
            .single();

        // Backward-compatibility: if the column does not exist yet, retry without it.
        if (error && typeof eligibilityRules === 'string' && String((error as any).message || '').toLowerCase().includes('eligibility_rules')) {
            const fallbackPayload = { ...updatePayload };
            delete fallbackPayload.eligibility_rules;
            const retry = await supabase
                .from('elections')
                .update(fallbackPayload)
                .eq('id', id)
                .select()
                .single();
            data = retry.data;
            error = retry.error;
        }

        if (error) throw error;

        // Log audit action
        await supabase.from('audit_logs').insert({
            action: 'ELECTION_UPDATED',
            resource_type: 'ELECTION',
            resource_id: id,
            admin_id: adminId,
            status: 'SUCCESS',
            details: JSON.stringify({
                title: (data as any).title,
                description: `Updated election settings for ${(data as any).title}`
            })
        });

        return {
            success: true,
            message: 'Election successfully updated',
            data
        };
    } catch (error: any) {
        console.error('Error updating election:', error);
        throw new ApiError(500, 'Failed to update election', 'DATABASE_ERROR');
    }
};

/**
 * Updates an election's status (e.g., suspending)
 */
export const updateElectionStatus = async (id: string, status: string, adminId: string) => {
    try {
        const { data, error } = await supabase
            .from('elections')
            .update({ status })
            .eq('id', id)
            .select('id, title, status')
            .single();

        if (error) throw error;

        // Log audit action
        await supabase.from('audit_logs').insert({
            action: 'ELECTION_STATUS_UPDATED',
            resource_type: 'ELECTION',
            resource_id: id,
            admin_id: adminId,
            status: 'SUCCESS',
            details: JSON.stringify({
                title: (data as any).title,
                new_status: status,
                description: `Updated status of election ${(data as any).title} to ${status}`
            })
        });

        return {
            success: true,
            message: `Election status updated to ${status}`,
            data
        };
    } catch (error: any) {
        console.error('Error updating election status:', error);
        throw new ApiError(500, 'Failed to update election status', 'DATABASE_ERROR');
    }
};

/**
 * Publishes or hides election results
 */
export const updateElectionResultsVisibility = async (id: string, publish: boolean, adminId: string) => {
    try {
        const { data, error } = await supabase
            .from('elections')
            .update({ results_published: publish })
            .eq('id', id)
            .select('id, title, results_published')
            .single();

        if (error) throw error;

        await supabase.from('audit_logs').insert({
            action: publish ? 'ELECTION_RESULTS_PUBLISHED' : 'ELECTION_RESULTS_HIDDEN',
            resource_type: 'ELECTION',
            resource_id: data.id,
            admin_id: adminId,
            status: 'SUCCESS',
            details: JSON.stringify({
                title: data.title,
                publish,
                description: publish ? `Published results for election ${data.title}` : `Hid results for election ${data.title}`
            })
        });

        return {
            success: true,
            message: publish ? 'Election results published' : 'Election results hidden',
            data
        };
    } catch (error: any) {
        console.error('Error updating election results visibility:', error);
        throw new ApiError(500, 'Failed to update election results visibility', 'DATABASE_ERROR');
    }
};

/**
 * Fetches real-time analytics for a specific election
 */
export const getElectionAnalytics = async (id: string) => {
    try {
        // 1. Fetch the election to understand its scope
        const { data: election, error: electionError } = await supabase
            .from('elections')
            .select('*')
            .eq('id', id)
            .single();

        if (electionError || !election) {
            throw new ApiError(404, 'Election not found', 'NOT_FOUND');
        }

        // 2. Build the exact voter pool query dynamically based on scope
        let usersQuery = supabase.from('users').select('id, registration_completed', { count: 'exact' }).eq('role', 'VOTER');

        if (election.type === 'Faculty' || election.type === 'Departmental') {
            if (election.scope_faculty && election.scope_faculty !== 'All' && election.scope_faculty !== 'University-Wide') {
                usersQuery = usersQuery.eq('faculty', election.scope_faculty);
            }
            if (election.type === 'Departmental' && election.scope_department && election.scope_department !== 'All' && election.scope_department !== 'University-Wide') {
                usersQuery = usersQuery.eq('department', election.scope_department);
            }
        }

        // Note: scope_level would need a 'level' column in users schema, skipping for now unless explicitly needed

        const { data: usersInScope, error: usersError } = await usersQuery;

        if (usersError) throw usersError;

        const totalRegistered = usersInScope ? usersInScope.length : 0;
        const totalVerified = usersInScope ? usersInScope.filter(u => u.registration_completed).length : 0;

        // 3. Aggregate Vote Casting numbers
        const { data: voteRows, error: votesError } = await supabase
            .from('votes')
            .select('voter_id')
            .eq('election_id', id);

        if (votesError) throw votesError;

        // Count unique voters who cast a ballot
        const uniqueVoters = new Set((voteRows || []).map(r => r.voter_id));
        const votesCast = uniqueVoters.size;

        return {
            success: true,
            data: {
                registeredVoters: totalRegistered,
                verifiedBiometric: totalVerified,
                votesCast: votesCast,
                fraudAlerts: 0  // Fallback until advanced fraud logic is implemented
            }
        };

    } catch (error: any) {
        console.error('Error fetching election analytics:', error);
        if (error instanceof ApiError) throw error;
        throw new ApiError(500, 'Failed to retrieve election analytics', 'DATABASE_ERROR');
    }
};

/**
 * Retrieves the global application settings (e.g. University Name)
 */
export const getSystemSettings = async () => {
    try {
        const { data, error } = await supabase
            .from('app_settings')
            .select('key, value, description');

        if (error) {
            // Handle fresh deployments where table might not exist yet gracefully
            if (error.code === '42P01') {
                return { success: true, data: [] };
            }
            throw error;
        }

        return {
            success: true,
            data
        };
    } catch (error: any) {
        console.error('Error fetching system settings:', error);
        throw new ApiError(500, 'Failed to retrieve system settings', 'DATABASE_ERROR');
    }
};

/**
 * Updates a specific application setting
 */
export const updateSystemSettings = async (settingsArray: { key: string, value: string, description?: string }[], adminId: string) => {
    try {
        if (!settingsArray || !Array.isArray(settingsArray) || settingsArray.length === 0) {
            throw new ApiError(400, 'Invalid settings format provided', 'VALIDATION_ERROR');
        }

        // Perform upsert for the provided keys
        const { data, error } = await supabase
            .from('app_settings')
            .upsert(settingsArray, { onConflict: 'key' })
            .select();

        if (error) throw error;

        // Log audit action
        await supabase.from('audit_logs').insert({
            action: 'SETTINGS_UPDATED',
            resource_type: 'SYSTEM',
            admin_id: adminId,
            status: 'SUCCESS',
            details: JSON.stringify({
                keys: settingsArray.map(s => s.key),
                description: `Updated system settings: ${settingsArray.map(s => s.key).join(', ')}`
            })
        });

        return {
            success: true,
            message: 'Settings updated successfully',
            data
        };
    } catch (error: any) {
        console.error('Error updating system settings:', error);
        if (error instanceof ApiError) throw error;
        throw new ApiError(500, 'Failed to update system settings', 'DATABASE_ERROR');
    }
}

/**
 * Retrieves full audit logs from the database
 */
export const getAuditLogs = async () => {
    try {
        const { data, error } = await supabase
            .from('audit_logs')
            .select(`
                *,
                admin:admin_id (username, email)
            `)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('getAuditLogs Error fetching from DB:', error);
            throw new ApiError(500, 'Failed to retrieve audit logs');
        }

        return {
            success: true,
            data: (data || []).map(log => ({
                ...log,
                admin_name: log.admin?.username || 'System'
            }))
        };
    } catch (error: any) {
        if (error instanceof ApiError) throw error;
        throw new ApiError(500, 'Unexpected error fetching audit logs');
    }
};

/**
 * Imports student data from CSV or Excel files
 * Supports Overwrite or Add modes
 */

// Local interface to satisfy TS when @types/multer is not found or conflicting
interface MulterFile {
    fieldname: string;
    originalname: string;
    encoding: string;
    mimetype: string;
    size: number;
    buffer: Buffer;
}

export const importStudentData = async (
    file: any, // Use any here but cast internal to handle typing issues with Express.Multer
    mode: 'overwrite' | 'add',
    adminId: string
) => {
    const multerFile = file as MulterFile;
    try {
        let rawData: any[] = [];
        const extension = multerFile.originalname.split('.').pop()?.toLowerCase();

        // 1. Parse File Content
        if (extension === 'csv') {
            const content = multerFile.buffer.toString('utf-8');
            rawData = parse(content, {
                columns: true,
                skip_empty_lines: true,
                trim: true,
            });
        } else if (extension === 'xlsx' || extension === 'xls') {
            const workbook = XLSX.read(file.buffer, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            rawData = XLSX.utils.sheet_to_json(sheet, { defval: '' });
        } else {
            throw new ApiError(400, 'Unsupported file format. Please upload CSV or Excel file.', 'INVALID_FILE');
        }

        if (!rawData || rawData.length === 0) {
            throw new ApiError(400, 'The uploaded file is empty.', 'EMPTY_FILE');
        }

        // 2. Validate Columns
        const firstRow = rawData[0];
        const normalizedRow: any = {};
        Object.keys(firstRow).forEach(key => {
            normalizedRow[key.trim().toLowerCase()] = key;
        });

        const requiredColumns = ['matric_no', 'email', 'faculty', 'department', 'level', 'full_name'];
        for (const col of requiredColumns) {
            if (!(col in normalizedRow)) {
                throw new ApiError(400, `Missing ${col} column`, 'MISSING_COLUMN');
            }
        }

        // 3. Process and Validate Row Data
        const processedData: any[] = [];
        const seenMatricNumbers = new Set<string>();
        const seenEmails = new Set<string>();

        for (const row of rawData) {
            const student: any = {};
            requiredColumns.forEach(col => {
                const originalKey = normalizedRow[col];
                student[col] = String(row[originalKey] || '').trim();
            });

            // Skip completely empty rows
            if (Object.values(student).every(val => !val)) continue;

            // Validate required fields
            if (!student.matric_no) throw new ApiError(400, 'Matric number cannot be empty', 'VALIDATION_ERROR');
            if (!student.email) throw new ApiError(400, `Email cannot be empty for matric_no ${student.matric_no}`, 'VALIDATION_ERROR');
            if (!student.full_name) throw new ApiError(400, `Full name cannot be empty for matric_no ${student.matric_no}`, 'VALIDATION_ERROR');
            if (!student.faculty) throw new ApiError(400, `Faculty cannot be empty for matric_no ${student.matric_no}`, 'VALIDATION_ERROR');
            if (!student.department) throw new ApiError(400, `Department cannot be empty for matric_no ${student.matric_no}`, 'VALIDATION_ERROR');
            if (!student.level) throw new ApiError(400, `Level cannot be empty for matric_no ${student.matric_no}`, 'VALIDATION_ERROR');

            // Validate Email Format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(student.email)) {
                throw new ApiError(400, `Invalid email format: ${student.email}`, 'VALIDATION_ERROR');
            }

            // Validate Level Format
            const levelNum = parseInt(student.level);
            const allowedLevels = [100, 200, 300, 400, 500, 600, 700, 800];
            if (isNaN(levelNum) || !allowedLevels.includes(levelNum)) {
                throw new ApiError(400, `Invalid level format for matric_no ${student.matric_no}`, 'VALIDATION_ERROR');
            }
            student.level = levelNum;

            // Check Duplicates in File
            if (seenMatricNumbers.has(student.matric_no)) {
                throw new ApiError(400, `Duplicate matric_no detected in file: ${student.matric_no}`, 'DUPLICATE_FILE');
            }
            if (seenEmails.has(student.email)) {
                throw new ApiError(400, `Duplicate email detected in file: ${student.email}`, 'DUPLICATE_FILE');
            }

            seenMatricNumbers.add(student.matric_no);
            seenEmails.add(student.email);
            processedData.push(student);
        }

        // 4. Database Operations with Mode Check
        if (mode === 'overwrite') {
            // NOTE: Ideally we use a single transaction. Supabase JS doesn't support multi-table transactions easily 
            // without RPC. However, here we only touch school_students.
            const { error: deleteError } = await supabase.from('school_students').delete().neq('id', '00000000-0000-0000-0000-000000000000');
            if (deleteError) throw deleteError;

            const { error: insertError } = await supabase.from('school_students').insert(processedData);
            if (insertError) throw insertError;

        } else {
            // Add mode: Insert only if not exists
            // Optimize: Check duplicates in bulk
            const matricNumbers = processedData.map(s => s.matric_no);
            const { data: existingRecords, error: fetchError } = await supabase
                .from('school_students')
                .select('matric_no')
                .in('matric_no', matricNumbers);

            if (fetchError) throw fetchError;

            if (existingRecords && existingRecords.length > 0) {
                const existingMatric = existingRecords[0].matric_no;
                throw new ApiError(400, `Matric number already exists: ${existingMatric}`, 'DUPLICATE_DB');
            }

            const { error: insertError } = await supabase.from('school_students').insert(processedData);
            if (insertError) throw insertError;
        }

        // 5. Audit Log
        await supabase.from('audit_logs').insert({
            action: 'STUDENTS_IMPORTED',
            resource_type: 'SYSTEM',
            admin_id: adminId,
            status: 'SUCCESS',
            details: JSON.stringify({
                mode,
                count: processedData.length,
                description: `Imported ${processedData.length} students via ${mode} mode`
            })
        });

        return {
            success: true,
            message: mode === 'overwrite'
                ? `Student table successfully overwritten with ${processedData.length} records.`
                : `${processedData.length} students successfully added.`
        };

    } catch (error: any) {
        console.error('Import students error:', error);
        if (error instanceof ApiError) throw error;
        throw new ApiError(500, error.message || 'Failed to import student data', 'DATABASE_ERROR');
    }
};

/**
 * Creates a new administrator account
 */
export const createAdmin = async (adminData: any, creatorId: string) => {
    try {
        const { username, email } = adminData;

        if (!username || !email) {
            throw new ApiError(400, 'Username and email are required', 'VALIDATION_ERROR');
        }

        const { data, error } = await supabase
            .from('admin')
            .insert([{
                username,
                email,
                can_manage_elections: true,
                can_manage_users: true,
                can_manage_candidates: true,
                can_view_audit_logs: true
            }])
            .select('id, username, email')
            .single();

        if (error) {
            if (error.code === '23505') {
                throw new ApiError(400, 'Admin with this username or email already exists', 'DUPLICATE_ERROR');
            }
            throw error;
        }

        // Log audit action
        await supabase.from('audit_logs').insert({
            action: 'ADMIN_CREATED',
            resource_type: 'ADMIN',
            resource_id: data.id,
            admin_id: creatorId,
            status: 'SUCCESS',
            details: JSON.stringify({
                username: data.username,
                email: data.email,
                description: `Created new admin account: ${data.username}`
            })
        });

        // 4. Automatically send setup link for biometric registration
        let setupLinkSent = false;
        try {
            const { requestAdminSetupLink } = await import('./authService');
            await requestAdminSetupLink(email);
            setupLinkSent = true;
        } catch (linkError) {
            console.error('[AdminService] Admin created but failed to send setup link:', linkError);
        }

        return {
            success: true,
            message: setupLinkSent 
                ? 'Admin account created and setup link sent successfully' 
                : 'Admin account created successfully (failed to send setup link)',
            data
        };
    } catch (error: any) {
        console.error('Error creating admin:', error);
        if (error instanceof ApiError) throw error;
        throw new ApiError(500, 'Failed to create admin account', 'DATABASE_ERROR');
    }
};

/**
 * Exports audit logs in various formats
 */
export const exportAuditLogs = async (format: string, filterAdminId?: string) => {
    try {
        let query = supabase
            .from('audit_logs')
            .select(`
                *,
                admin:admin_id (username, email)
            `)
            .order('created_at', { ascending: false });

        if (filterAdminId && filterAdminId !== 'all') {
            query = query.eq('admin_id', filterAdminId);
        }

        const { data: logs, error } = await query;
        if (error) throw error;

        const processedLogs = (logs || []).map(log => ({
            'Date': new Date(log.created_at).toLocaleString(),
            'Admin': log.admin?.username || 'System',
            'Action': log.action.replace(/_/g, ' '),
            'Type': log.resource_type,
            'Details': log.details ? (typeof log.details === 'string' ? JSON.parse(log.details).description : log.details.description) : '',
            'IP Address': log.ip_address || '---'
        }));

        if (format === 'json') {
            return {
                buffer: Buffer.from(JSON.stringify(processedLogs, null, 2)),
                contentType: 'application/json',
                fileName: `audit_logs_${new Date().getTime()}.json`
            };
        }

        // Use XLSX for CSV and Excel
        const worksheet = (XLSX.utils as any).json_to_sheet(processedLogs);
        const workbook = (XLSX.utils as any).book_new();
        (XLSX.utils as any).book_append_sheet(workbook, worksheet, 'Audit Logs');

        if (format === 'csv') {
            const csvOutput = (XLSX.utils as any).sheet_to_csv(worksheet);
            return {
                buffer: Buffer.from(csvOutput),
                contentType: 'text/csv',
                fileName: `audit_logs_${new Date().getTime()}.csv`
            };
        }

        // Default to XLSX
        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        return {
            buffer,
            contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            fileName: `audit_logs_${new Date().getTime()}.xlsx`
        };

    } catch (error: any) {
        console.error('Export audit logs error:', error);
        if (error instanceof ApiError) throw error;
        throw new ApiError(500, 'Failed to export audit logs', 'DATABASE_ERROR');
    }
};
