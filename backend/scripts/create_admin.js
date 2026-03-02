import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';

// Load env vars
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error("Missing Supabase credentials in .env");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function seedAdmin() {
    const email = "ayomide123@student.babcock.edu.ng";
    const password = "@123456789";
    const username = "admin_ayomide";

    // Check if admin exists
    const { data: existingAdmin } = await supabase
        .from('admin')
        .select('id')
        .eq('email', email)
        .single();

    if (existingAdmin) {
        console.log(`Admin ${email} already exists. Updating password...`);
        const password_hash = await bcrypt.hash(password, 10);
        const { error } = await supabase
            .from('admin')
            .update({ password_hash })
            .eq('id', existingAdmin.id);

        if (error) {
            console.error("Error updating admin:", error);
        } else {
            console.log("Admin password updated successfully!");
        }
        process.exit(0);
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Insert admin
    console.log(`Creating admin ${email}...`);
    const { error } = await supabase
        .from('admin')
        .insert({
            username,
            email,
            password_hash,
            can_manage_elections: true,
            can_manage_users: true,
            can_manage_candidates: true,
            can_view_audit_logs: true
        });

    if (error) {
        console.error("Error creating admin:", error);
    } else {
        console.log("Admin created successfully!");
    }
}

seedAdmin();
