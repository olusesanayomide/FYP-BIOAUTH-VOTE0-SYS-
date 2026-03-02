
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, './.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function finalVerification() {
    const userEmail = 'ndidid3261@student.babcock.edu.ng';
    const { data: user } = await supabase.from('users').select('*').eq('email', userEmail).single();

    console.log(`Verifying for user: ${user.name} (${user.email})`);
    console.log(`- Faculty: ${user.faculty}, Dept: ${user.department}, Level: ${user.level}`);

    const { data: elections } = await supabase.from('elections').select('*').order('created_at', { ascending: false });

    console.log('\n--- Voter Dashboard Simulation ---');
    const visibleElections = elections.filter(election => {
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

    console.log(`Visible elections for voter: ${visibleElections.length}`);
    visibleElections.forEach(e => console.log(`- ${e.title} (${e.type})`));

    console.log('\n--- Admin Dashboard Simulation ---');
    for (const election of elections) {
        let usersQuery = supabase.from('users').select('id', { count: 'exact' }).eq('role', 'VOTER');

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

        const { count } = await usersQuery;
        console.log(`Election: ${election.title} | Voters in Scope: ${count}`);
    }
}

finalVerification();
