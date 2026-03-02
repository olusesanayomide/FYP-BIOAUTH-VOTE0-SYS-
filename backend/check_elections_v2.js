
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

async function run() {
    const { data: elections, error } = await supabase.from('elections').select('*');

    if (error) {
        console.error(error);
    } else {
        console.log(`Found ${elections.length} elections:`);
        elections.forEach(e => {
            console.log(`- ID: ${e.id}, Title: ${e.title}, Type: ${e.type}, Start: ${e.start_time}, End: ${e.end_time}, Status: ${e.status}`);
        });
    }
}

run();
