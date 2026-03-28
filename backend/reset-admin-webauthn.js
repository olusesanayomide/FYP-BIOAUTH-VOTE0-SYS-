const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function resetAllAdmins() {
    console.log("Resetting WebAuthn for all admins...");
    const { data, error } = await supabase
        .from('admin')
        .update({ webauthn_registered: false });
    
    if (error) {
        console.error("Error updating admins:", error);
    } else {
        console.log("Successfully reset webauthn_registered for admins.");
    }
    
    // Also optional: clear authenticators table for admin, but let's just leave it,
    // if webauthn_registered is false, they should be prompted to register again.
}

resetAllAdmins();
