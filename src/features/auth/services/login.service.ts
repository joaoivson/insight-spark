import type { LoginData, LoginResponse } from '../types';
import { getApiUrl, fetchWithAuth } from '@/core/config/api.config';
import { supabase } from '@/shared/lib/supabase';
import { APP_CONFIG } from '@/core/config/app.config';
import { getAffiliateRef, clearAffiliateRef } from '@/shared/utils/affiliate';

async function attachAffiliateRef(token: string): Promise<void> {
  const ref = getAffiliateRef();
  if (!ref) return;
  try {
    await fetch(getApiUrl('/api/v1/auth/attach-ref'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ referrer_user_id: ref }),
    });
    clearAffiliateRef();
  } catch {
    // não bloquear o login se o attach-ref falhar — pode tentar de novo no próximo login
  }
}

export const loginService = async (data: LoginData): Promise<LoginResponse> => {
  try {
    // 1. Tentar Autenticar no Supabase (Fluxo Moderno/Já Migrado)
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.senha,
    });

    if (!authError && authData.session) {
      const token = authData.session.access_token;
      localStorage.setItem(APP_CONFIG.STORAGE_KEYS.TOKEN, token);

      // Passar o token explicitamente, pois o current_user_id ainda não está no storage
      // e o fetchWithAuth depende dele para recuperar o token do localStorage.
      const response = await fetchWithAuth(getApiUrl('/api/v1/auth/me'), {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const userResult = await response.json();

      if (response.ok) {
        await attachAffiliateRef(token);
        return {
          success: true,
          token: token,
          token_type: 'bearer',
          user: userResult,
        };
      }
    }

    // 2. Fallback: Autenticar no Backend (Fluxo Lazy Migration)
    // Se o Supabase falhou ou o usuário não está lá, tentamos o login legacy do backend
    // que agora é inteligente o suficiente para migrar o usuário.
    const legacyResponse = await fetch(getApiUrl('/api/v1/auth/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: data.email,
        password: data.senha,
        referrer_user_id: getAffiliateRef() ?? undefined,
      }),
    });

    const legacyData = await legacyResponse.json();

    if (legacyResponse.ok && legacyData.access_token) {
      localStorage.setItem(APP_CONFIG.STORAGE_KEYS.TOKEN, legacyData.access_token);
      clearAffiliateRef();
      return {
        success: true,
        token: legacyData.access_token,
        token_type: 'bearer',
        user: legacyData.user,
      };
    }

    // Se ambos falharam, lançamos o erro
    throw new Error(legacyData.detail || 'Email ou senha inválidos.');

  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Erro de conexão com o servidor de autenticação.');
  }
};

