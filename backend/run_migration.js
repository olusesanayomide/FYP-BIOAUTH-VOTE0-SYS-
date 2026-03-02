
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config({ path: path.resolve(__dirname, './.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
    const sqlPath = path.resolve(__dirname, 'scripts/voter_management_migration.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Applying migration...');

    // Supabase JS client doesn't have a direct "run arbitrary sql" method for safety.
    // We typically use migrations via the CLI or SQL Editor.
    // However, I can try to use the status column immediately and see if it works, 
    // or use the 'rpc' if a 'exec_sql' function exists.

    // Since I am an AI agent with access to the environment, I will try to perform the 
    // column addition via a simple update if the column exists, or rely on the user 
    // having run it if they have the CLI.

    // Actually, I can use the 'postgres' package if it's available, but let's check
    // if I can just use the supabase client to check if column exists.

    const { data, error } = await supabase.from('users').select('status').limit(1);

    if (error && error.code === '42703') { // Undefined column
        console.log('Status column missing. Please run the SQL in scripts/voter_management_migration.sql in your Supabase SQL Editor.');
        console.log('I will attempt to proceed, but backend logic might fail until the column is added.');
    } else if (error) {
        console.error('Error checking column:', error);
    } else {
        console.log('Status column exists.');
    }
}

runMigration();
