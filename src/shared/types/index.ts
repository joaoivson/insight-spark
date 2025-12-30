/**
 * Shared Types
 * Tipos e interfaces compartilhados em toda a aplicação
 */

export interface User {
  id: string;
  nome: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: unknown;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

