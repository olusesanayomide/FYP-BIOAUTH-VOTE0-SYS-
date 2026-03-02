const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkColumns() {
    const { data, error } = await supabase.rpc('get_table_columns', { table_name: 'school_students' });

    if (error) {
        // If RPC doesn't exist, try a simple select
        const { data: sample, error: selectError } = await supabase
            .from('school_students')
            .select('*')
            .limit(1);

        if (selectError) {
            console.error('Error fetching sample data:', selectError);
            return;
        }

        console.log('Columns found in sample:', Object.keys(sample[0] || {}));
    } else {
        console.log('Columns from RPC:', data);
    }
}

checkColumns();
