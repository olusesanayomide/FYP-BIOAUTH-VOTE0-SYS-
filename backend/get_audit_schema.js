const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log('Checking audit_logs schema...');
    const { data, error } = await supabase.from('audit_logs').select('*').limit(1);

    if (error) {
        console.error('Error:', error);
    } else if (data && data.length > 0) {
        console.log('Audit logs columns:', Object.keys(data[0]));
    } else {
        // If no data, try to get schema via RPC if enabled, or just insert a dummy and delete it
        console.log('No data found, trying to get schema by fetching null...');
        const { data: cols } = await supabase.from('audit_logs').select('*').limit(0);
        console.log('Query result keys (limit 0):', Object.keys(cols || {}));
    }
}

check();
