import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://iprdyorxqdiivthtcvxf.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_wn-jD_u50_800ku-syYsxQ_WhI3j_6X';

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase credentials missing in env. Using default development keys.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
