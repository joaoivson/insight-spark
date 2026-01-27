import { getApiUrl, fetchPublic } from "@/core/config/api.config";

export interface SetPasswordRequest {
  token: string;
  password: string;
}

export interface SetPasswordResponse {
  message: string;
  user: {
    id: number;
    email: string;
    name: string;
  };
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ForgotPasswordResponse {
  message: string;
}

/**
 * Serviço para gerenciamento de senhas
 */
export const passwordService = {
  /**
   * Define senha do usuário usando token recebido por email
   */
  async setPassword(token: string, password: string): Promise<SetPasswordResponse> {
    const url = getApiUrl("/api/v1/auth/set-password");
    
    const response = await fetchPublic(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token, password }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || error.message || "Erro ao definir senha");
    }

    return response.json();
  },

  /**
   * Solicita reset de senha. Envia email com link para redefinir senha.
   */
  async forgotPassword(email: string): Promise<ForgotPasswordResponse> {
    const url = getApiUrl("/api/v1/auth/forgot-password");
    
    const response = await fetchPublic(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || error.message || "Erro ao solicitar reset de senha");
    }

    return response.json();
  },
};
