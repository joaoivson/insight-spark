import type { LoginData, LoginResponse } from '../types';
import { getApiUrl } from '@/core/config/api.config';

export const loginService = async (data: LoginData): Promise<LoginResponse> => {
  try {
    const formData = new FormData();
    formData.append('email', data.email);
    formData.append('password', data.senha);

    const response = await fetch(getApiUrl('/api/v1/auth/login'), {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.detail || result.error || 'Erro ao fazer login');
    }

    return {
      success: true,
      token: result.access_token,
      token_type: result.token_type,
      user: result.user,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Erro de conexão. Verifique se o servidor está rodando.');
  }
};

