
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function diagnose() {
    console.log("Supabase URL:", SUPABASE_URL);
    console.log("Supabase Key present:", !!SUPABASE_KEY);

    if (!SUPABASE_URL || !SUPABASE_KEY) {
        console.error("Missing credentials!");
        return;
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    console.log("\n--- Checking 'admin' table ---");
    const { data: adminData, error: adminError } = await supabase.from('admin').select('id, email, username');
    if (adminError) {
        console.error("Error fetching from admin table:", adminError);
    } else {
        console.log("Admin users found:", adminData.length);
        console.log(adminData);
    }

    console.log("\n--- Checking 'users' table (voters) ---");
    const { data: userData, error: userError } = await supabase.from('users').select('id, email').limit(5);
    if (userError) {
        console.error("Error fetching from users table:", userError);
    } else {
        console.log("Voter users found (first 5):", userData.length);
        console.log(userData);
    }
}

diagnose();
