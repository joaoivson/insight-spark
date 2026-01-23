import { tokenStorage } from '@/shared/lib/storage';

/**
 * API Configuration
 * Centraliza todas as configurações relacionadas à API
 */

// Função para detectar e corrigir URL da API
const getBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_URL;
  
  // Se não houver URL configurada, usar localhost
  if (!envUrl) {
    return 'http://localhost:8000';
  }
  
  // Se a URL começar com https mas estivermos em um ambiente que pode ter problemas de SSL,
  // tentar usar HTTP como fallback
  if (envUrl.startsWith('https://')) {
    // Verificar se estamos em homologação (hml.marketdash.com.br)
    if (typeof window !== 'undefined' && window.location.hostname.includes('hml.marketdash.com.br')) {
      // Usar HTTP para homologação se o certificado SSL não estiver funcionando
      return envUrl.replace('https://api.hml.marketdash.com.br', 'http://api.hml.marketdash.com.br');
    }
    // Verificar se estamos em produção e também pode ter problemas de SSL
    if (typeof window !== 'undefined' && window.location.hostname.includes('marketdash.com.br') && !window.location.hostname.includes('hml')) {
      // Manter HTTPS para produção, mas podemos adicionar fallback se necessário
      return envUrl;
    }
  }
  
  return envUrl;
};

export const API_CONFIG = {
  BASE_URL: getBaseUrl(),
  ENDPOINTS: {
    AUTH: {
      SIGNUP: '/api/v1/auth/register',
      LOGIN: '/api/v1/auth/login',
    },
  },
  TIMEOUT: 30000, // 30 segundos
} as const;

export const getApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

/**
 * Função helper para fazer requisições autenticadas
 * Adiciona automaticamente o token JWT no header Authorization
 * Trata erros 401 removendo token e redirecionando para login
 */
export const fetchWithAuth = async (
  url: string,
  options: RequestInit = {}
): Promise<Response> => {
  const token = tokenStorage.get();

  const headers = new Headers(options.headers);
  
  // Adicionar token se existir e não for vazio
  if (token && token.trim()) {
    // Remover possíveis aspas ou espaços extras
    const cleanToken = token.trim().replace(/^["']|["']$/g, '');
    if (cleanToken) {
      headers.set('Authorization', `Bearer ${cleanToken}`);
    }
  }
  
  // Se não houver token, a requisição ainda será feita
  // mas o backend retornará 401, que será tratado abaixo
  // Log apenas em desenvolvimento para debug
  if (import.meta.env.DEV && !token) {
    console.warn('[fetchWithAuth] Token não encontrado para requisição:', url);
  }

  // Adicionar Content-Type se não estiver definido e houver body
  if (options.body && !headers.has('Content-Type')) {
    if (options.body instanceof FormData) {
      // FormData define seu próprio Content-Type com boundary
    } else if (typeof options.body === 'string') {
      headers.set('Content-Type', 'application/json');
    }
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Se receber 401, token está inválido ou expirado - limpar e redirecionar
  // MAS não fazer isso para rotas de autenticação (login/register) ou durante o processo de login
  const isAuthRoute = url.includes('/auth/login') || url.includes('/auth/register');
  const isOnLoginPage = typeof window !== 'undefined' && window.location.pathname.includes('/login');
  
  // Só tratar 401 se:
  // 1. Não for rota de autenticação
  // 2. Não estiver na página de login (evita interferir no processo de login)
  // 3. Já havia um token (não é uma primeira requisição sem token)
  if (response.status === 401 && !isAuthRoute && !isOnLoginPage && token) {
    // Remover token e dados do usuário
    tokenStorage.remove();
    const { userStorage } = await import('@/shared/lib/storage');
    userStorage.remove();
    
    // Redirecionar para login
    const { APP_CONFIG } = await import('@/core/config/app.config');
    window.location.href = APP_CONFIG.ROUTES.LOGIN;
  }

  return response;
};
