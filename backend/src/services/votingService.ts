import { supabase } from '../config/supabase';
import { ApiError } from '../middleware/errorHandler';
import { verifyWebauthnAuthentication } from './authService';
import { sendVoteConfirmationEmail } from '../utils/email';
import { createNotification } from './notificationService';

/**
 * Get all available elections dynamically filtered by voter's institution scope
 */
export const getElections = async (userIdStr?: string) => {
  const { data: rawElections, error } = await supabase
    .from('elections')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Fetch elections error:", error);
    throw new ApiError(500, 'Failed to fetch elections', 'FETCH_FAILED');
  }

  let elections = rawElections || [];
  console.log(`[getElections] Found ${elections.length} total elections in DB`);

  const electionIds = elections.map((e: any) => e.id);
  let candidatesByElection = new Map<string, any[]>();

  if (electionIds.length > 0) {
    const { data: candidateRows, error: candidateError } = await supabase
      .from('candidates')
      .select(`
        id,
        election_id,
        user_id,
        name,
        position,
        bio,
        photo_url,
        party,
        status,
        faculty,
        department,
        level,
        manifesto_url
      `)
      .in('election_id', electionIds);

    if (candidateError) {
      console.error("Fetch candidates for elections error:", candidateError);
      throw new ApiError(500, 'Failed to fetch elections', 'FETCH_FAILED');
    }

    for (const row of (candidateRows || [])) {
      const key = (row as any).election_id;
      const existing = candidatesByElection.get(key) || [];
      existing.push(row);
      candidatesByElection.set(key, existing);
    }
  }

  // Filter based on user profile logic if user is logged in
  if (userIdStr) {
    const { data: user } = await supabase
      .from('users')
      .select('faculty, department, level')
      .eq('id', userIdStr)
      .single();

    if (user) {
      const beforeCount = elections.length;
      elections = elections.filter((election: any) => {
        // Only apply scope filter if the election explicitly scopes to a specific group
        // If scope is 'All', 'University-Wide', or empty/null, it's open to everyone
        const isFacultyScoped = election.scope_faculty &&
          election.scope_faculty.trim() !== '' &&
          election.scope_faculty !== 'All' &&
          election.scope_faculty !== 'University-Wide';

        if (isFacultyScoped && election.scope_faculty !== user.faculty) return false;

        const isDeptScoped = election.scope_department &&
          election.scope_department.trim() !== '' &&
          election.scope_department !== 'All' &&
          election.scope_department !== 'University-Wide';

        if (isDeptScoped && election.scope_department !== user.department) return false;

        if (election.scope_level && election.scope_level > 0 && user.level && user.level !== election.scope_level) return false;

        return true;
      });
      console.log(`[getElections] Filtered to ${elections.length} elections (from ${beforeCount}) for user ${userIdStr}`);
    }
  }

  const getEligibleVoterCount = async (election: any) => {
    let usersQuery = supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'VOTER');

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

    const { count, error: countError } = await usersQuery;
    if (countError) {
      console.error('Eligible voter count error:', countError);
      return 0;
    }
    return count || 0;
  };

  // Format and map output for frontend — CRITICAL: map DB column names to frontend interface names
  return Promise.all(elections.map(async (election: any) => {
    const positionsMap = new Map();
    // Include all non-rejected candidates (approved + pending) so newly added candidates show
    const visibleCandidates = (candidatesByElection.get(election.id) || []).filter((c: any) => c.status !== 'rejected');
    const existingPositions = election.positions || [];

    visibleCandidates.forEach((c: any) => {
      const posName = c.position || 'General';

      // Try to find the actual UUID for this position name from the positions table
      const actualPosition = existingPositions.find((p: any) => p.name === posName);
      const positionId = actualPosition ? actualPosition.id : posName;

      if (!positionsMap.has(posName)) {
        positionsMap.set(posName, {
          id: positionId,
          title: posName,
          candidates: []
        });
      }
      positionsMap.get(posName).candidates.push({
        id: c.id,
        userId: c.user_id, // Include the actual user_id for voting
        name: c.name,
        platform: c.bio,
        imageUrl: c.photo_url || null,
        party: c.party || null,
        faculty: c.faculty || null,
        department: c.department || null,
        level: c.level || null,
        manifestoUrl: c.manifesto_url || null
      });
    });

    // CRITICAL FIX: explicitly remap DB column names → frontend interface field names
    const eligibleVoters = await getEligibleVoterCount(election);

    return {
      id: election.id,
      title: election.title,
      description: election.description,
      // Map start_time/end_time (DB) → startDate/endDate (frontend interface)
      startDate: election.start_time || election.startDate || null,
      endDate: election.end_time || election.endDate || null,
      status: election.status,
      require_biometrics: election.require_biometrics ?? election.biometric_enforced ?? false,
      required_level: election.scope_level ? String(election.scope_level) : null,
      type: election.type,
      eligible_voters: eligibleVoters,
      registeredVoters: eligibleVoters,
      results_published: election.results_published === true,
      positions: Array.from(positionsMap.values()),
    };
  }));
};

/**
 * Get specific election details
 */
export const getElectionById = async (electionId: string) => {
  const { data: election, error } = await supabase
    .from('elections')
    .select('*')
    .eq('id', electionId)
    .single();

  if (error || !election) {
    throw new ApiError(404, 'Election not found', 'ELECTION_NOT_FOUND');
  }

  const { data: candidateRows, error: candidateError } = await supabase
    .from('candidates')
    .select(`
      id,
      election_id,
      user_id,
      name,
      position,
      bio,
      photo_url,
      party,
      status,
      faculty,
      department,
      level,
      manifesto_url
    `)
    .eq('election_id', electionId);

  if (candidateError) {
    console.error('Fetch candidates for election by id failed:', candidateError);
    throw new ApiError(500, 'Failed to fetch election', 'FETCH_FAILED');
  }

  const positionsMap = new Map();
  const approvedCandidates = (candidateRows || []).filter((c: any) => c.status === 'approved');
  const existingPositions = election.positions || [];

  approvedCandidates.forEach((c: any) => {
    const posName = c.position || 'General';

    // Try to find the actual UUID for this position name from the positions table
    const actualPosition = existingPositions.find((p: any) => p.name === posName);
    const positionId = actualPosition ? actualPosition.id : posName;

    if (!positionsMap.has(posName)) {
      positionsMap.set(posName, {
        id: positionId, // Map position UUID if found, else name string
        title: posName,
        candidates: []
      });
    }
    positionsMap.get(posName).candidates.push({
      id: c.id,
      userId: c.user_id, // Include the actual user_id for voting
      name: c.name,
      platform: c.bio,
      imageUrl: c.photo_url || null,
      party: c.party || null,
      faculty: c.faculty || null,
      department: c.department || null,
      level: c.level || null,
      manifestoUrl: c.manifesto_url || null
    });
  });

  return {
    ...election,
    startDate: election.start_time,
    endDate: election.end_time,
    require_biometrics: election.require_biometrics ?? election.biometric_enforced ?? false,
    positions: Array.from(positionsMap.values())
  };
};

/**
 * Check if user is eligible to vote
 */
export const checkVotingEligibility = async (userId: string, electionId: string) => {
  // Get user
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (userError || !user) {
    throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');
  }

  // Get election
  const { data: election, error: electionError } = await supabase
    .from('elections')
    .select('*')
    .eq('id', electionId)
    .single();

  if (electionError || !election) {
    throw new ApiError(404, 'Election not found', 'ELECTION_NOT_FOUND');
  }

  // Check if user is eligible based on user type
  const eligibleTypes = election.eligible_types || [];
  if (!eligibleTypes.includes(user.user_type)) {
    throw new ApiError(
      403,
      `${user.user_type}s are not eligible to vote in this election`,
      'NOT_ELIGIBLE',
    );
  }

  // Check if user has already voted
  const { data: existingRecord, error: existingRecordError } = await supabase
    .from('voter_records')
    .select('id')
    .eq('user_id', userId)
    .eq('election_id', electionId)
    .limit(1);

  if (existingRecordError) {
    throw new ApiError(500, 'Failed to validate voting status', 'VOTE_STATUS_CHECK_FAILED');
  }

  const { data: existingVotes, error: existingVotesError } = await supabase
    .from('votes')
    .select('id')
    .eq('voter_id', userId)
    .eq('election_id', electionId)
    .limit(1);

  if (existingVotesError) {
    throw new ApiError(500, 'Failed to validate voting status', 'VOTE_STATUS_CHECK_FAILED');
  }

  const hasVoted = (existingRecord && existingRecord.length > 0) || (existingVotes && existingVotes.length > 0);
  if (hasVoted) {
    return {
      eligible: false,
      hasVoted: true,
      webauthnRegistered: !!user.webauthn_registered,
      message: 'You have already voted in this election. Double voting is not permitted.',
      electionTitle: election.title,
      userType: user.user_type,
    };
  }

  // Check election is ongoing
  const now = new Date();
  if (new Date(election.start_time) > now || new Date(election.end_time) < now) {
    throw new ApiError(403, 'This election is not currently open for voting', 'ELECTION_CLOSED');
  }

  return {
    eligible: true,
    hasVoted: false,
    webauthnRegistered: !!user.webauthn_registered,
    message: 'You are eligible to vote in this election.',
    electionTitle: election.title,
    userType: user.user_type,
  };
};

/**
 * Submit multiple votes in an election
 * CRITICAL: Time bound checking & double vote protection
 */
export const submitVote = async (
  userId: string,
  input: {
    electionId: string;
    votes: { positionId: string; candidateId: string }[];
    webauthnVerificationProof?: {
      assertionObject?: string;
      clientDataJSON?: string;
    };
  },
) => {
  // Validate array
  if (!Array.isArray(input.votes) || input.votes.length === 0) {
    throw new ApiError(400, 'Votes array is missing or empty', 'MISSING_FIELDS');
  }

  // Validate user exists
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (userError || !user) {
    throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');
  }

  // Validate election exists
  const { data: election, error: electionError } = await supabase
    .from('elections')
    .select('*')
    .eq('id', input.electionId)
    .single();

  if (electionError || !election) {
    throw new ApiError(404, 'Election not found', 'ELECTION_NOT_FOUND');
  }

  const biometricsRequired = election.require_biometrics !== false;
  let webauthnVerified = false;

  if (biometricsRequired) {
    const assertionObject = input.webauthnVerificationProof?.assertionObject;
    if (!assertionObject || typeof assertionObject !== 'string') {
      throw new ApiError(
        400,
        'Biometric verification proof is required to submit this ballot',
        'BIOMETRIC_PROOF_REQUIRED',
      );
    }

    let parsedAssertion: any;
    try {
      parsedAssertion = JSON.parse(assertionObject);
    } catch {
      throw new ApiError(400, 'Invalid biometric verification proof format', 'INVALID_BIOMETRIC_PROOF');
    }

    if (!parsedAssertion?.id || !parsedAssertion?.response) {
      throw new ApiError(400, 'Biometric verification proof is incomplete', 'INVALID_BIOMETRIC_PROOF');
    }

    const verificationResult = await verifyWebauthnAuthentication(userId, parsedAssertion);
    if (!verificationResult?.verified) {
      throw new ApiError(403, 'Biometric verification failed. Vote not accepted.', 'BIOMETRIC_VERIFICATION_FAILED');
    }
    webauthnVerified = true;
  }

  // Check election constraints globally (Time bounds)
  const now = new Date();
  const startTime = new Date(election.start_time);
  const endTime = new Date(election.end_time);

  if (now < startTime) {
    throw new ApiError(403, 'Election has not started yet', 'ELECTION_NOT_STARTED');
  }
  if (now > endTime) {
    throw new ApiError(403, 'Election has already concluded', 'ELECTION_ENDED');
  }

  // Check if user has already voted in this election globally
  const { data: existingVoterRecord, error: existingVoterRecordError } = await supabase
    .from('voter_records')
    .select('id')
    .eq('user_id', userId)
    .eq('election_id', input.electionId)
    .limit(1);

  if (existingVoterRecordError) {
    throw new ApiError(500, 'Failed to validate voting status', 'VOTE_STATUS_CHECK_FAILED');
  }

  if (existingVoterRecord && existingVoterRecord.length > 0) {
    throw new ApiError(
      409,
      'You have already participated in this election',
      'DOUBLE_VOTE_DETECTED',
    );
  }

  // Fallback protection: block if any votes already exist for this election/user
  // This guards against missing voter_records rows or failed inserts.
  const { data: existingVotes, error: existingVotesError } = await supabase
    .from('votes')
    .select('id')
    .eq('voter_id', userId)
    .eq('election_id', input.electionId)
    .limit(1);

  if (existingVotesError) {
    throw new ApiError(500, 'Failed to validate voting status', 'VOTE_STATUS_CHECK_FAILED');
  }

  if (existingVotes && existingVotes.length > 0) {
    throw new ApiError(
      409,
      'You have already voted in this election. Double voting is not permitted.',
      'ALREADY_VOTED',
    );
  }

  // Build a reliable position map and resolve incoming IDs/names
  const { data: existingPositions, error: positionsError } = await supabase
    .from('positions')
    .select('id, name')
    .eq('election_id', input.electionId);

  if (positionsError) {
    throw new ApiError(500, 'Failed to resolve election positions', 'POSITION_RESOLUTION_FAILED');
  }

  const positionById = new Map<string, { id: string; name: string }>();
  const positionByName = new Map<string, { id: string; name: string }>();
  (existingPositions || []).forEach((p: any) => {
    positionById.set(p.id, p);
    positionByName.set(String(p.name).trim().toLowerCase(), p);
  });

  const isUuid = (val: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);

  const resolvePositionId = async (incoming: string) => {
    if (!incoming) {
      throw new ApiError(400, 'Invalid vote payload: missing positionId', 'INVALID_BALLOT');
    }

    // Direct UUID match
    if (isUuid(incoming) && positionById.has(incoming)) {
      return incoming;
    }

    // Name-based match
    const byName = positionByName.get(incoming.trim().toLowerCase());
    if (byName) {
      return byName.id;
    }

    // If a name was supplied and no record exists, create the missing position row.
    // This supports elections configured only through candidate.position strings.
    if (!isUuid(incoming)) {
      const { data: created, error: createPosError } = await supabase
        .from('positions')
        .insert({
          election_id: input.electionId,
          name: incoming.trim(),
          description: null,
        })
        .select('id, name')
        .single();

      if (createPosError || !created) {
        throw new ApiError(500, 'Failed to create missing position for vote', 'POSITION_CREATE_FAILED');
      }

      positionById.set(created.id, created as any);
      positionByName.set(String(created.name).trim().toLowerCase(), created as any);
      return created.id;
    }

    throw new ApiError(400, 'Invalid position selected for this election', 'INVALID_BALLOT');
  };

  const votePayloads: any[] = [];
  const seenPositions = new Set<string>();
  for (const vote of input.votes) {
    const resolvedPositionId = await resolvePositionId(vote.positionId);
    if (seenPositions.has(resolvedPositionId)) {
      throw new ApiError(
        409,
        'Duplicate vote detected for the same position.',
        'DOUBLE_VOTE_DETECTED',
      );
    }
    seenPositions.add(resolvedPositionId);
    votePayloads.push({
      voter_id: userId,
      election_id: input.electionId,
      position_id: resolvedPositionId,
      selected_candidate_id: vote.candidateId,
      webauthn_verified: webauthnVerified,
      webauthn_timestamp: webauthnVerified ? new Date() : null,
    });
  }

  // Bulk Insert Votes
  const { error: insertError } = await supabase
    .from('votes')
    .insert(votePayloads);

  if (insertError) {
    console.error('Vote insert failed:', insertError);
    if (insertError.code === '23503') {
      throw new ApiError(400, 'Invalid ballot selection. Candidate or position does not exist.', 'INVALID_BALLOT');
    }
    if (insertError.code === '23505') {
      throw new ApiError(409, 'Duplicate vote detected for one or more positions.', 'DOUBLE_VOTE_DETECTED');
    }
    throw new ApiError(500, 'Failed to submit votes', 'VOTE_SUBMISSION_FAILED');
  }

  // Create voter record confirming participation
  const { error: recordError } = await supabase
    .from('voter_records')
    .insert({
      user_id: userId,
      election_id: input.electionId,
    });

  if (recordError) {
    // If we fail here, votes are logged but record is missing. Ideally a transaction should be used, but this suffices for Supabase standard.
    console.error('Failed to log voter record', recordError);
  }

  // We could log every individual vote locally, but just 1 audit is fine
  await logAuditAction(userId, 'VOTE_SUBMITTED', 'ELECTION', input.electionId, 'SUCCESS');

  // Notify voter (best-effort)
  try {
    await createNotification({
      recipientRole: 'voter',
      recipientId: userId,
      title: 'Vote recorded',
      description: `Your vote for "${election.title}" has been securely recorded.`,
      type: 'success',
      category: 'election',
      route: '/dashboard'
    });
  } catch (notifyError) {
    console.error('Vote notification failed:', notifyError);
  }

  // Best-effort vote confirmation email (do not block successful vote)
  if (user.email) {
    try {
      await sendVoteConfirmationEmail(
        user.email,
        user.name || 'Voter',
        election.title,
        votePayloads.length,
        new Date(),
      );
    } catch (emailError) {
      console.error('Vote confirmation email failed:', emailError);
    }
  }

  return {
    success: true,
    message: 'Votes recorded successfully',
    timestamp: new Date(),
  };
};

/**
 * Get voting results
 */
export const getVotingResults = async (electionId: string) => {
  const { data: election, error: electionError } = await supabase
    .from('elections')
    .select(`
      *,
      candidates (
        id,
        name,
        position
      ),
      votes (
        id,
        selected_candidate_id
      )
    `)
    .eq('id', electionId)
    .single();

  if (electionError || !election) {
    throw new ApiError(404, 'Election not found', 'ELECTION_NOT_FOUND');
  }

  const now = new Date();
  const endTime = election.end_time ? new Date(election.end_time) : null;
  const isEnded = endTime ? now > endTime : false;
  const isPublished = election.results_published === true;
  if (!isPublished) {
    throw new ApiError(403, 'Results are not available yet. The electoral committee has not officially published the final tallies.', 'RESULTS_NOT_PUBLISHED');
  }

  const positionsMap = new Map();
  (election.candidates || []).forEach((c: any) => {
    const posName = c.position || 'General';
    if (!positionsMap.has(posName)) {
      positionsMap.set(posName, {
        positionId: posName,
        positionName: posName,
        candidates: []
      });
    }
    const voteCount = (election.votes || []).filter((v: any) => v.selected_candidate_id === c.id).length;
    positionsMap.get(posName).candidates.push({
      candidateId: c.id,
      candidateName: c.name,
      voteCount,
    });
  });

  return {
    electionTitle: election.title,
    totalVotes: election.votes?.length || 0,
    results: Array.from(positionsMap.values()),
  };
};

/**
 * Get user's voting history
 */
export const getUserVotingHistory = async (userId: string) => {
  const { data: votes, error } = await supabase
    .from('votes')
    .select(`
      *,
      election: elections (id, title),
      selectedCandidate: candidates (id, name, position)
    `)
    .eq('voter_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new ApiError(500, 'Failed to fetch voting history', 'FETCH_FAILED');
  }

  // Group votes by election for the frontend UI
  const electionsMap = new Map();

  (votes || []).forEach((vote: any) => {
    if (!vote.election) return;

    if (!electionsMap.has(vote.election.id)) {
      electionsMap.set(vote.election.id, {
        electionId: vote.election.id,
        electionTitle: vote.election.title,
        votedAt: vote.created_at, // Use the most recent vote time for the election
        voteCount: 0,
        selections: []
      });
    }

    const entry = electionsMap.get(vote.election.id);
    entry.voteCount += 1;

    // Keep most recent votedAt
    if (new Date(vote.created_at) > new Date(entry.votedAt)) {
      entry.votedAt = vote.created_at;
    }

    // Add this position's selection
    if (vote.selectedCandidate) {
      entry.selections.push({
        positionTitle: vote.position_id || vote.selectedCandidate.position || 'Unknown Position',
        candidateName: vote.selectedCandidate.name
      });
    }
  });

  return Array.from(electionsMap.values());
};

/**
 * Log audit action
 */
const logAuditAction = async (
  userId: string,
  action: string,
  resourceType: string,
  resourceId: string,
  status: string,
) => {
  try {
    await supabase
      .from('audit_logs')
      .insert({
        user_id: userId,
        action,
        resource_type: resourceType,
        resource_id: resourceId,
        status,
      });
  } catch (error) {
    console.error('Failed to log audit action:', error);
  }
};
