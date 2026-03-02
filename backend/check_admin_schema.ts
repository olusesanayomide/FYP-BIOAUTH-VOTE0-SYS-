import { supabase } from './src/config/supabase';

async function checkAdminSchema() {
    console.log('Checking admin table schema...');
    const { data: admin, error } = await supabase.from('admin').select('*').limit(1).single();

    if (error) {
        console.error('Error fetching admin:', error);
    } else {
        console.log('Admin columns:', Object.keys(admin));
        console.log('Sample admin:', admin);
    }
}

checkAdminSchema();
