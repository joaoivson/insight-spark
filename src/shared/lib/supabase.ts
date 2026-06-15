import { createClient } from '@supabase/supabase-js';
import { tokenStorage } from '@/shared/lib/storage';

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

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        // Renova o access_token em background antes de expirar (mantém a sessão viva
        // durante o uso) e persiste a sessão entre reloads.
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
    },
});

// Mantém o token do app (tokenStorage) em sincronia com a renovação automática do Supabase.
// Sem isso, o Supabase renova a sessão dele mas o app continua usando o token velho → 401 →
// logout no meio do uso (bug de "deslogou sozinho").
supabase.auth.onAuthStateChange((event, session) => {
    if ((event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') && session?.access_token) {
        try {
            tokenStorage.set(session.access_token);
        } catch {
            /* storage indisponível — ignora */
        }
    }
});
