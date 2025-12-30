import type { LoginData, LoginResponse } from '../types';
import { getApiUrl } from '@/core/config/api.config';

export const loginService = async (data: LoginData): Promise<LoginResponse> => {
  try {
    const response = await fetch(getApiUrl('/api/users/login'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: data.email,
        senha: data.senha,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.detail || result.error || 'Erro ao fazer login');
    }

    return result;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Erro de conexão. Verifique se o servidor está rodando.');
  }
};

