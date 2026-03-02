const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkConstraints() {
  console.log('Checking audit_logs foreign keys...');
  const { data, error } = await supabase.rpc('get_table_info', { table_name: 'audit_logs' });

  if (error) {
    // RPC might not exist, let's try to insert an ID that definitely doesn't exist in users
    console.log('RPC failed, testing FK by inserting dummy ID...');
    const dummyId = '00000000-0000-0000-0000-000000000000';
    const { error: insError } = await supabase.from('audit_logs').insert({
      action: 'TEST_FK',
      user_id: dummyId
    });

    if (insError) {
      console.log('Insert failed (likely due to FK):', insError.message);
    } else {
      console.log('Insert succeeded! No strict FK constraint on user_id.');
      await supabase.from('audit_logs').delete().eq('action', 'TEST_FK');
    }
  } else {
    console.log('Table info:', data);
  }
}

checkConstraints();
