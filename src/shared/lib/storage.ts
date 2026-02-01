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
  set: (user: any) => {
    // 1. Salva na chave global (quem está logado agora)
    storage.set(APP_CONFIG.STORAGE_KEYS.USER, user);
    
    // 2. Salva na chave escopada se tiver ID
    if (user && user.id) {
      const id = String(user.id).startsWith('user_') ? user.id : `user_${user.id}`;
      storage.set(`${APP_CONFIG.STORAGE_KEYS.USER}:${id}`, user);
    }
  },
  remove: () => storage.remove(APP_CONFIG.STORAGE_KEYS.USER),
};

export const tokenStorage = {
  get: () => localStorage.getItem(APP_CONFIG.STORAGE_KEYS.TOKEN),
  set: (token: string) => {
    // 1. Salva na chave global
    localStorage.setItem(APP_CONFIG.STORAGE_KEYS.TOKEN, token);
    
    // 2. Salva na chave escopada se tiver usuário ativo
    const userId = getUserId();
    if (userId) {
      localStorage.setItem(`${APP_CONFIG.STORAGE_KEYS.TOKEN}:${userId}`, token);
    }
  },
  remove: () => storage.remove(APP_CONFIG.STORAGE_KEYS.TOKEN),
};

/**
 * Gera uma chave de cache escopada pelo usuário atual.
 * Ex: getScopedKey('clicks-cache') -> 'clicks-cache:user_4'
 */
export const getScopedKey = (baseKey: string): string => {
  const userId = getUserId();
  return userId ? `${baseKey}:${userId}` : `${baseKey}:anon`;
};

/**
 * Obtém o user_id no formato user_{id} para uso em APIs e localStorage
 * @returns string no formato "user_4" ou null se não houver usuário
 */
export const getUserId = (): string | null => {
  const user = userStorage.get() as { id?: string | number } | null;
  if (!user || !user.id) return null;
  const id = String(user.id).trim();
  if (!id) return null;
  // Se já estiver no formato user_X, retornar como está
  if (id.startsWith('user_')) return id;
  // Caso contrário, adicionar o prefixo user_
  return `user_${id}`;
};

/**
 * Obtém apenas o ID numérico do usuário (sem o prefixo user_)
 * @returns string com o ID numérico ou null
 */
export const getUserIdNumber = (): string | null => {
  const user = userStorage.get() as { id?: string | number } | null;
  if (!user || !user.id) return null;
  const id = String(user.id).trim();
  if (!id) return null;
  // Se estiver no formato user_X, remover o prefixo
  if (id.startsWith('user_')) return id.replace(/^user_/, '');
  return id;
};

