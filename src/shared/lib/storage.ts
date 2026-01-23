/**
 * LocalStorage utilities
 * Funções auxiliares para gerenciar localStorage de forma type-safe
 */

import { APP_CONFIG } from "@/core/config/app.config";

export const storage = {
  get: <T>(key: string): T | null => {
    try {
      const item = localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : null;
    } catch {
      return null;
    }
  },

  set: <T>(key: string, value: T): void => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Erro silencioso ao salvar no localStorage
    }
  },

  remove: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch {
      // Erro silencioso ao remover do localStorage
    }
  },

  clear: (): void => {
    try {
      localStorage.clear();
    } catch {
      // Erro silencioso ao limpar localStorage
    }
  },
};

// Helpers específicos para dados da aplicação
export const userStorage = {
  get: () => storage.get(APP_CONFIG.STORAGE_KEYS.USER),
  set: (user: unknown) => storage.set(APP_CONFIG.STORAGE_KEYS.USER, user),
  remove: () => storage.remove(APP_CONFIG.STORAGE_KEYS.USER),
};

export const tokenStorage = {
  get: () => localStorage.getItem(APP_CONFIG.STORAGE_KEYS.TOKEN),
  set: (token: string) => localStorage.setItem(APP_CONFIG.STORAGE_KEYS.TOKEN, token),
  remove: () => storage.remove(APP_CONFIG.STORAGE_KEYS.TOKEN),
};

