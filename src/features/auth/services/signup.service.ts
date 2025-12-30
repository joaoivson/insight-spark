import type { SignupData, SignupResponse } from '../types';
import { getApiUrl } from '@/core/config/api.config';

export const signupService = async (data: SignupData): Promise<SignupResponse> => {
  try {
    const response = await fetch(getApiUrl('/api/users/signup'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        nome: data.nome,
        email: data.email,
        senha: data.senha,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.detail || result.error || 'Erro ao criar usuário');
    }

    return result;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Erro de conexão. Verifique se o servidor está rodando.');
  }
};

