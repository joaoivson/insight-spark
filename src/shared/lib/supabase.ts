import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Em build de produção, se as variáveis não estiverem no .env durante o 'npm run build',
// elas ficarão 'undefined'. O erro no console ajuda a identificar se é falta no .env.
if (!supabaseUrl || !supabaseAnonKey) {
    const missing = [];
    if (!supabaseUrl) missing.push('VITE_SUPABASE_URL');
    if (!supabaseAnonKey) missing.push('VITE_SUPABASE_ANON_KEY');

    const errorMsg = `Supabase configuration missing: ${missing.join(', ')}. ` +
        `Certifique-se de que estas variáveis estão no seu arquivo .env durante o build.`;

    if (import.meta.env.DEV) {
        console.error(errorMsg);
    }

    // Lançamos o erro para evitar que a aplicação tente usar um cliente inválido
    throw new Error(errorMsg);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
