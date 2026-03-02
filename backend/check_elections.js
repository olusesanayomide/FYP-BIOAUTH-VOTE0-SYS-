
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
    console.log('Querying elections...');
    const { data: elections, error } = await supabase.from('elections').select('*');

    if (error) {
        console.error('Error fetching elections:', error);
    } else {
        console.log(`Found ${elections.length} elections:`);
        elections.forEach(e => {
            console.log(`- ID: ${e.id}, Title: ${e.title}, Type: ${e.type}, Faculty: ${e.scope_faculty}, Dept: ${e.scope_department}`);
        });
    }
}

run();
