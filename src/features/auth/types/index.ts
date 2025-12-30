/**
 * Auth Feature Types
 * Tipos específicos do módulo de autenticação
 */

import { User } from "@/shared/types";

export interface SignupData {
  nome: string;
  email: string;
  senha: string;
}

export interface LoginData {
  email: string;
  senha: string;
}

export interface SignupResponse {
  success: boolean;
  user?: User;
  error?: string;
}

export interface LoginResponse {
  success: boolean;
  user?: User;
  token?: string | null;
  error?: string;
}

