import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    if (import.meta.env.DEV) {
        console.error('Supabase credentials missing! Check your .env file or Vite configuration.');
    }
    throw new Error('Supabase configuration error: Missing URL or Anon Key.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
