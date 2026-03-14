
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function createTestAdmin() {
    const email = "test-enroll@babcock.edu.ng";
    const password = "password123";
    const username = "test_enroll_admin";

    console.log(`Checking if test admin ${email} exists...`);
    const { data: existing } = await supabase.from('admin').select('id').eq('email', email).single();

    if (existing) {
        console.log("Test admin already exists. Removing to reset...");
        await supabase.from('admin').delete().eq('id', existing.id);
    }

    const password_hash = await bcrypt.hash(password, 10);

    console.log("Creating test admin...");
    const { data, error } = await supabase.from('admin').insert({
        username,
        email,
        password_hash,
        webauthn_registered: false,
        can_manage_elections: true,
        can_manage_users: true,
        can_manage_candidates: true,
        can_view_audit_logs: true
    }).select().single();

    if (error) {
        console.error("Error:", error);
    } else {
        console.log("Test admin created successfully!", data.id);
    }
}

createTestAdmin();
