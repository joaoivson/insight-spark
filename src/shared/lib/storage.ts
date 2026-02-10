/**
 * LocalStorage utilities
 * Token e user são sempre escopados por usuário (token:user_4, user:user_4).
 * Nenhuma chave global "token" ou "user" — apenas current_user_id indica quem está logado.
 */

import { APP_CONFIG } from "@/core/config/app.config";

const CURRENT_USER_ID_KEY = "current_user_id";

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

function getCurrentUserId(): string | null {
  return localStorage.getItem(CURRENT_USER_ID_KEY);
}

function normalizeUserId(id: string | number): string {
  const s = String(id).trim();
  return s.startsWith("user_") ? s : `user_${s}`;
}

// Migração: legado "user" (objeto) → current_user_id + user:user_4
function migrateLegacyUser(): void {
  const legacy = storage.get<{ id?: string | number } | null>(APP_CONFIG.STORAGE_KEYS.USER);
  if (!legacy || typeof legacy !== "object" || legacy.id == null) return;
  const id = normalizeUserId(legacy.id);
  storage.set(`${APP_CONFIG.STORAGE_KEYS.USER}:${id}`, legacy);
  localStorage.setItem(CURRENT_USER_ID_KEY, id);
  storage.remove(APP_CONFIG.STORAGE_KEYS.USER);
}

// Migração: legado "token" → token:user_4 (quando já temos current_user_id)
function migrateLegacyToken(): string | null {
  const currentId = getCurrentUserId();
  if (!currentId) return null;
  const legacy = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.TOKEN);
  if (!legacy) return localStorage.getItem(`${APP_CONFIG.STORAGE_KEYS.TOKEN}:${currentId}`);
  localStorage.setItem(`${APP_CONFIG.STORAGE_KEYS.TOKEN}:${currentId}`, legacy);
  localStorage.removeItem(APP_CONFIG.STORAGE_KEYS.TOKEN);
  return legacy;
}

export const userStorage = {
  get: () => {
    let currentId = getCurrentUserId();
    if (!currentId) {
      migrateLegacyUser();
      currentId = getCurrentUserId();
    }
    if (!currentId) return null;
    return storage.get(`${APP_CONFIG.STORAGE_KEYS.USER}:${currentId}`);
  },
  set: (user: any) => {
    if (!user || user.id == null) return;
    const id = normalizeUserId(user.id);
    storage.set(`${APP_CONFIG.STORAGE_KEYS.USER}:${id}`, user);
    localStorage.setItem(CURRENT_USER_ID_KEY, id);
  },
  remove: () => {
    const currentId = getCurrentUserId();
    if (currentId) {
      storage.remove(`${APP_CONFIG.STORAGE_KEYS.USER}:${currentId}`);
      localStorage.removeItem(`${APP_CONFIG.STORAGE_KEYS.TOKEN}:${currentId}`);
      localStorage.removeItem(CURRENT_USER_ID_KEY);
    }
  },
};

export const tokenStorage = {
  get: () => {
    let currentId = getCurrentUserId();
    if (!currentId) {
      migrateLegacyUser();
      currentId = getCurrentUserId();
    }
    if (!currentId) return null;
    const token = localStorage.getItem(`${APP_CONFIG.STORAGE_KEYS.TOKEN}:${currentId}`);
    if (token) return token;
    return migrateLegacyToken();
  },
  set: (token: string) => {
    const currentId = getCurrentUserId();
    if (!currentId) return;
    localStorage.setItem(`${APP_CONFIG.STORAGE_KEYS.TOKEN}:${currentId}`, token);
  },
  remove: () => {
    const currentId = getCurrentUserId();
    if (currentId) localStorage.removeItem(`${APP_CONFIG.STORAGE_KEYS.TOKEN}:${currentId}`);
  },
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

