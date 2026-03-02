
import { supabase } from './src/config/supabase';

async function checkSchema() {
    console.log('Checking users table schema...');
    const { data, error } = await supabase.rpc('get_table_info', { table_name: 'users' });

    if (error) {
        // If rpc doesn't exist, try a raw query if possible, but Supabase doesn't allow raw SQL via JS client easily
        // Let's just try to fetch one row and see the raw date string
        console.log('RPC get_table_info failed, fetching a sample user instead...');
        const { data: user, error: userError } = await supabase.from('users').select('*').limit(1).single();
        if (userError) {
            console.error('Failed to fetch user:', userError);
        } else {
            console.log('Sample user challenge_expires_at:', user.current_challenge_expires_at);
            console.log('Type of challenge_expires_at:', typeof user.current_challenge_expires_at);
        }
    } else {
        console.log('Schema info:', data);
    }
}

checkSchema();
