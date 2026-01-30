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

export interface CheckEmailResponse {
  exists: boolean;
  message?: string;
  email?: string;
  normalizedEmail?: string;
  matchedEmail?: string;
  user?: {
    email?: string;
  };
  data?: {
    email?: string;
  };
  user_email?: string;
}

export interface CheckEmailResult {
  exists: boolean;
  matchedEmail?: string;
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

  /**
   * Verifica se o email informado está cadastrado antes de iniciar o fluxo de reset de senha.
   * Caso o backend não ofereça esse endpoint, lança erro com código específico para fallback.
   */
  async checkEmailExists(email: string): Promise<CheckEmailResult> {
    const url = getApiUrl("/api/v1/auth/check-email");

    try {
      const response = await fetchPublic(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        const data: CheckEmailResponse = await response.json().catch(() => ({ exists: true }));

        const possibleMatches = [
          data.email,
          data.normalizedEmail,
          data.matchedEmail,
          data.user?.email,
          data.user_email,
          data.data?.email,
        ];

        const matchedEmail = possibleMatches.find((value): value is string => typeof value === "string" && value.trim().length > 0);

        const exists = typeof data.exists === "boolean" ? data.exists : true;

        return {
          exists,
          matchedEmail: matchedEmail ? matchedEmail.trim() : undefined,
        };
      }

      const error = await response.json().catch(() => ({} as Record<string, string>));
      const detail = (error.detail || error.message || error.error || "").toString();
      const normalizedDetail = detail.toLowerCase();

      if (
        response.status === 404 ||
        response.status === 422 ||
        normalizedDetail.includes("não encontrado") ||
        normalizedDetail.includes("nao encontrado") ||
        normalizedDetail.includes("não cadastrado") ||
        normalizedDetail.includes("nao cadastrado")
      ) {
        return { exists: false };
      }

      // Se a API não for encontrada (endpoint inexistente), avisar para permitir fallback
      if (response.status === 404 && normalizedDetail === "not found") {
        throw new Error("CHECK_ENDPOINT_UNAVAILABLE");
      }

      throw new Error(detail || "Erro ao verificar email");
    } catch (error) {
      if (error instanceof Error && error.message === "CHECK_ENDPOINT_UNAVAILABLE") {
        throw error;
      }

      // Se houver falha de rede ou outro erro inesperado, propagar para tratamento padrão
      throw new Error(error instanceof Error ? error.message : "Erro ao verificar email");
    }
  },
};
