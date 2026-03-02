
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
    const { data: elections, error } = await supabase.from('elections').select('*').limit(1);

    if (error) {
        console.error(error);
    } else if (elections && elections.length > 0) {
        console.log('Columns in elections table:', Object.keys(elections[0]));
    } else {
        console.log('No elections found to check columns.');
    }
}

run();
