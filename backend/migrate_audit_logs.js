const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function migrate() {
    console.log('Adding admin_id to audit_logs...');

    // Check if column exists
    const { data: cols } = await supabase.from('audit_logs').select('*').limit(1);
    if (cols && cols.length > 0 && 'admin_id' in cols[0]) {
        console.log('admin_id already exists.');
        return;
    }

    // Since we can't run raw SQL directly via JS client without RPC,
    // we assume there's an RPC or we use a workaround.
    // If there's no RPC, we might need to ask the user to run SQL.
    // However, I can try to use a migration runner if one exists.

    console.log('Attempting to add column via raw SQL if RPC exists...');
    const { error } = await supabase.rpc('exec_sql', {
        sql_query: 'ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS admin_id UUID REFERENCES public.admin(id);'
    });

    if (error) {
        console.error('Migration failed (exec_sql RPC likely missing):', error.message);
        console.log('\nPLEASE RUN THIS SQL IN SUPABASE SQL EDITOR:');
        console.log('ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS admin_id UUID REFERENCES public.admin(id);');
    } else {
        console.log('Successfully added admin_id column.');
    }
}

migrate();
