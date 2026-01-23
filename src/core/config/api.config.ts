import { tokenStorage, userStorage } from '@/shared/lib/storage';
import { APP_CONFIG } from '@/core/config/app.config';

/**
 * API Configuration
 * Centraliza todas as configurações relacionadas à API
 */

/**
 * Função para obter a URL base da API
 * 
 * Prioridade:
 * 1. Variável de ambiente VITE_API_URL
 * 2. Fallback para localhost em desenvolvimento
 * 
 * Em produção/homologação, VITE_API_URL deve sempre usar HTTPS.
 * Para emergências, pode-se usar FORCE_HTTP_FALLBACK=true (não recomendado).
 */
const getBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_URL;
  const forceHttp = import.meta.env.VITE_FORCE_HTTP_FALLBACK === 'true';
  
  // Se não houver URL configurada, usar localhost (desenvolvimento)
  if (!envUrl) {
    return 'http://localhost:8000';
  }
  
  // Mecanismo de rollback de emergência (apenas se explicitamente habilitado)
  // ATENÇÃO: Use apenas em emergências críticas. Deve ser removido assim que SSL for corrigido.
  if (forceHttp && envUrl.startsWith('https://')) {
    console.warn(
      '⚠️ FORCE_HTTP_FALLBACK está ativo! Isso é temporário e deve ser removido assim que SSL for corrigido.'
    );
    return envUrl.replace('https://', 'http://');
  }
  
  // Validar que URLs de produção/homologação usam HTTPS
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    const isProduction = window.location.hostname.includes('marketdash.com.br');
    const isStaging = window.location.hostname.includes('hml') || window.location.hostname.includes('staging');
    
    if ((isProduction || isStaging) && envUrl.startsWith('http://')) {
      console.error(
        '❌ Erro: URL da API deve usar HTTPS em produção/homologação. ' +
        'Configure VITE_API_URL com https:// no ambiente de build.'
      );
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
    let cleanToken = token.trim().replace(/^["']|["']$/g, '');
    
    // Remover "Bearer " se o token já contiver
    if (cleanToken.startsWith('Bearer ')) {
      cleanToken = cleanToken.substring(7).trim();
    }
    
    if (cleanToken) {
      headers.set('Authorization', `Bearer ${cleanToken}`);
      
    }
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
  const isMeRoute = url.includes('/auth/me'); // Rota de perfil pode ser chamada durante login
  
  // Verificar se o token foi criado recentemente (últimos 5 segundos)
  // Isso evita remover o token logo após o login
  const tokenCreatedAt = typeof window !== 'undefined' 
    ? sessionStorage.getItem('token_created_at')
    : null;
  const isRecentToken = tokenCreatedAt 
    ? (Date.now() - parseInt(tokenCreatedAt, 10)) < 5000 // 5 segundos
    : false;
  
  // Só tratar 401 se:
  // 1. Não for rota de autenticação
  // 2. Não for rota /me (pode ser chamada durante login)
  // 3. Não estiver na página de login (evita interferir no processo de login)
  // 4. Já havia um token (não é uma primeira requisição sem token)
  // 5. O token não foi criado recentemente (evita remover token logo após login)
  // 
  // IMPORTANTE: Não tratar 401 durante login ou logo após login para evitar remover token recém-criado
  if (response.status === 401 && !isAuthRoute && !isMeRoute && !isOnLoginPage && token && !isRecentToken) {
    // Remover token e dados do usuário
    tokenStorage.remove();
    userStorage.remove();
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('token_created_at');
    }
    
    // Redirecionar para login
    window.location.href = APP_CONFIG.ROUTES.LOGIN;
  }

  return response;
};
