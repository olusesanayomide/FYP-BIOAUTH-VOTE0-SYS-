
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

async function getAllElectionsSimulation() {
    const { data: elections, error } = await supabase.from('elections').select('*').order('created_at', { ascending: false });
    if (error) { console.error(error); return; }

    for (const election of elections) {
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

        console.log(`Election: ${election.title}`);
        console.log(`- Type: ${election.type}, Faculty: ${election.scope_faculty}, Dept: ${election.scope_department}`);
        console.log(`- Registered Voters in Scope: ${totalRegistered}`);
    }
}

getAllElectionsSimulation();
