import { supabase } from './src/config/supabase';

async function checkSchemas() {
    console.log('--- ADMIN TABLE ---');
    const { data: admin, error: adminErr } = await supabase.from('admin').select('*').limit(1).single();
    if (adminErr) console.error('Admin error:', adminErr);
    else console.log('Admin columns:', Object.keys(admin));

    console.log('\n--- AUDIT_LOGS TABLE ---');
    const { data: log, error: logErr } = await supabase.from('audit_logs').select('*').limit(1).single();
    if (logErr) console.error('Audit logs error:', logErr);
    else console.log('Audit logs columns:', Object.keys(log));
}

checkSchemas();
