
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
    const { data, error } = await supabase
        .from('users')
        .update({
            faculty: 'Computing and Engineering Sciences',
            department: 'Software Engineering',
            level: 300
        })
        .eq('email', 'ndidid3261@student.babcock.edu.ng');

    if (error) {
        console.error('Error updating user:', error);
    } else {
        console.log('User updated successfully.');
    }
}

run();
