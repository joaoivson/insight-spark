/**
 * Auth Feature Types
 * Tipos específicos do módulo de autenticação
 */

import { User } from "@/shared/types";

export interface LoginData {
  email: string;
  senha: string;
}

export interface LoginResponse {
  success: boolean;
  token?: string | null;
  token_type?: string;
  user?: User;
  error?: string;
}

