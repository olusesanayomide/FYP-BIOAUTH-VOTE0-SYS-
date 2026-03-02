
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
    const { data: logs, error } = await supabase.from('audit_logs').select('*').limit(1);

    if (error) {
        console.error(error);
    } else if (logs && logs.length > 0) {
        console.log('Columns in audit_logs table:', Object.keys(logs[0]));
    } else {
        // If no logs, check schema another way if possible, or just log that no logs found.
        console.log('No audit logs found to check columns.');
        // Let's try to get table info from postgres if we can, but usually select * limit 1 is enough if there is data.
        // If no data, I'll insert a dummy one then delete it.
    }
}

run();
