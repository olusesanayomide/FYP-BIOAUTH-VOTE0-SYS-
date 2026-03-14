
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkSchema() {
    console.log("Checking admin table structure...");
    const { data, error } = await supabase.from('admin').select('*').limit(1);

    if (error) {
        console.error("Error fetching admin:", error);
    } else {
        console.log("Admin table columns:", data.length > 0 ? Object.keys(data[0]) : "No data to check columns");
    }

    console.log("\nChecking admin_authenticators table structure...");
    const { data: authData, error: authError } = await supabase.from('admin_authenticators').select('*').limit(1);
    if (authError) {
        console.error("Error fetching admin_authenticators:", authError);
    } else {
        console.log("Admin_authenticators columns:", authData.length > 0 ? Object.keys(authData[0]) : "No data to check columns");
    }
}

checkSchema();
