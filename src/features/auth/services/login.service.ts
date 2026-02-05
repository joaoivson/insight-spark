import type { LoginData, LoginResponse } from '../types';
import { getApiUrl, fetchWithAuth } from '@/core/config/api.config';
import { supabase } from '@/shared/lib/supabase';
import { APP_CONFIG } from '@/core/config/app.config';

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

      const response = await fetchWithAuth(getApiUrl('/api/v1/auth/me'));
      const userResult = await response.json();

      if (response.ok) {
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
      body: JSON.stringify({ email: data.email, password: data.senha }),
    });

    const legacyData = await legacyResponse.json();

    if (legacyResponse.ok && legacyData.access_token) {
      localStorage.setItem(APP_CONFIG.STORAGE_KEYS.TOKEN, legacyData.access_token);
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

