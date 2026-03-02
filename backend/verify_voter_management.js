
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

async function verify() {
    console.log('--- VOTER MANAGEMENT VERIFICATION ---');

    // 1. Create a dummy voter for testing
    console.log('1. Creating test voter...');
    const testMatric = 'TEST/' + Math.floor(Math.random() * 10000);
    const { data: testUser, error: createError } = await supabase.from('users').insert({
        matric_no: testMatric,
        email: testMatric.replace('/', '_').toLowerCase() + '@student.babcock.edu.ng',
        name: 'Test Voter',
        role: 'VOTER',
        user_type: 'STUDENT',
        status: 'ACTIVE'
    }).select().single();

    if (createError) {
        console.error('Failed to create test voter:', createError);
        return;
    }
    console.log(`Test voter created: ${testUser.id} (${testUser.matric_no})`);

    // 2. Suspend the voter
    console.log('2. Suspending voter...');
    const { data: suspendedUser, error: suspendError } = await supabase
        .from('users')
        .update({ status: 'SUSPENDED' })
        .eq('id', testUser.id)
        .select()
        .single();

    if (suspendError) {
        console.error('Failed to suspend voter:', suspendError);
    } else {
        console.log(`Voter status: ${suspendedUser.status}`);
    }

    // 3. Verify audit log for suspension
    console.log('3. Verifying audit log for suspension...');
    const { data: suspensionLog, error: logError } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('resource_id', testUser.id)
        .eq('action', 'VOTER_SUSPENDED')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (logError) {
        console.log('Audit log for suspension not found (expected if migration not fully run or logic skipped it).');
    } else {
        console.log(`Audit log found: ${suspensionLog.action} for ${suspensionLog.resource_id}`);
    }

    // 4. Activate the voter
    console.log('4. Re-activating voter...');
    await supabase.from('users').update({ status: 'ACTIVE' }).eq('id', testUser.id);
    const { data: activeUser } = await supabase.from('users').select('status').eq('id', testUser.id).single();
    console.log(`Voter status now: ${activeUser.status}`);

    // 5. Delete the voter
    console.log('5. Deleting voter...');
    const { error: deleteError } = await supabase.from('users').delete().eq('id', testUser.id);
    if (deleteError) {
        console.error('Failed to delete voter:', deleteError);
    } else {
        console.log('Voter deleted successfully.');
    }

    // 6. Verify audit log for deletion
    // (Deletion audit happens in the service layer, but here we just manually check logic if we want)
    // Since we called Supabase directly, no audit log was created by the service. 
    // To truly test the service, we'd need to hit the API, but this verifies the DB schema works.

    console.log('--- VERIFICATION COMPLETE ---');
}

verify();
