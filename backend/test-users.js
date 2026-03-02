require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

supabase.from('users').select('email, matric_no, id').then(res => {
    console.log("Registered Users:");
    console.log(res.data);
}).catch(console.error);
