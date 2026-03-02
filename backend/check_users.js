
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, './.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log('Querying users...');
    const { data: users, error } = await supabase.from('users').select('*');

    if (error) {
        console.error('Error fetching users:', error);
    } else {
        console.log(`Found ${users.length} users:`);
        users.forEach(u => {
            console.log(`- ID: ${u.id}, Name: ${u.name}, Faculty: ${u.faculty}, Dept: ${u.department}, Role: ${u.role}`);
        });
    }
}

run();
