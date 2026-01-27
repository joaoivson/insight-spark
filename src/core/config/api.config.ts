import { tokenStorage, userStorage, getUserId } from '@/shared/lib/storage';
import { APP_CONFIG } from '@/core/config/app.config';

/**
 * API Configuration
 * Centraliza todas as configurações relacionadas à API
 */

/**
 * URLs da API por ambiente (runtime).
 * Garante que HML e produção usem a API correta mesmo se VITE_API_URL estiver incorreto no build.
 */
const API_BY_HOST: Record<string, string> = {
  'marketdash.com.br': 'https://api.marketdash.com.br',
  'www.marketdash.com.br': 'https://api.marketdash.com.br',
  'hml.marketdash.com.br': 'https://api.hml.marketdash.com.br',
  'marketdash.hml.com.br': 'https://api.marketdash.hml.com.br',
};

/**
 * Função para obter a URL base da API
 *
 * Prioridade:
 * 1. Runtime: hostname conhecido (marketdash.com.br, hml.marketdash.com.br) → API correspondente
 * 2. Variável de ambiente VITE_API_URL (build-time)
 * 3. Fallback para localhost em desenvolvimento
 *
 * Para emergências (SSL quebrado): FORCE_HTTP_FALLBACK=true usa API em HTTP.
 */
const getBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_URL;
  const forceHttp = import.meta.env.VITE_FORCE_HTTP_FALLBACK === 'true';

  // Runtime: detectar hostname e usar API do ambiente (corrige conexão HML e produção)
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    const apiByHost = API_BY_HOST[host];
    if (apiByHost) {
      if (forceHttp && apiByHost.startsWith('https://')) {
        return apiByHost.replace('https://', 'http://');
      }
      return apiByHost;
    }
  }

  // Se não houver URL configurada, usar proxy do Vite em desenvolvimento
  // O proxy redireciona /api para localhost:8000, evitando problemas de CORS
  if (!envUrl) {
    // Em desenvolvimento, usar proxy do Vite (sem porta, relativo ao host)
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      return ''; // Vazio = usar o mesmo host/porta do frontend (proxy do Vite)
    }
    return 'http://localhost:8000';
  }

  // Mecanismo de rollback de emergência (apenas se explicitamente habilitado)
  if (forceHttp && envUrl.startsWith('https://')) {
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
 * Função helper para fazer requisições públicas (sem autenticação)
 * Usada para endpoints que não requerem token, como checkout-url da Cakto
 */
export const fetchPublic = async (
  url: string,
  options: RequestInit = {}
): Promise<Response> => {
  const headers = new Headers(options.headers);

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

  return response;
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
  const userId = getUserId(); // Obter user_id no formato user_4

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

  // Adicionar user_id como header em todas as requisições (exceto rotas de autenticação)
  if (userId) {
    const isAuthRoute = url.includes('/auth/login') || url.includes('/auth/register');
    if (!isAuthRoute) {
      headers.set('X-User-Id', userId);
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

  // Adicionar user_id como query parameter também (para compatibilidade)
  let finalUrl = url;
  if (userId) {
    const isAuthRoute = url.includes('/auth/login') || url.includes('/auth/register');
    if (!isAuthRoute) {
      // Adicionar user_id como query parameter
      const separator = url.includes('?') ? '&' : '?';
      finalUrl = `${url}${separator}user_id=${encodeURIComponent(userId)}`;
    }
  }

  const response = await fetch(finalUrl, {
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

  // Tratamento de erro 403 - Assinatura inativa
  if (response.status === 403) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.detail || errorData.message || '';
    const isSubscriptionError = 
      errorMessage.toLowerCase().includes("assinatura") ||
      errorMessage.toLowerCase().includes("subscription") ||
      errorMessage.toLowerCase().includes("não está ativa") ||
      errorMessage.toLowerCase().includes("not active");
    
    if (isSubscriptionError && typeof window !== 'undefined') {
      // Não redirecionar se já estiver na página de assinatura ou checkout
      if (!window.location.pathname.includes('/assinatura') && !window.location.href.includes('cakto')) {
        // Importar dinamicamente para evitar dependência circular
        import('@/services/cakto.service').then(({ caktoService }) => {
          const user = userStorage.get() as { email?: string; name?: string; cpf_cnpj?: string } | null;
          if (user) {
            caktoService.redirectToCheckout({
              email: user.email,
              name: user.name,
              cpf_cnpj: user.cpf_cnpj,
            });
          } else {
            caktoService.redirectToCheckoutDirect();
          }
        }).catch(() => {
          // Fallback: redirecionar para página de assinatura se houver erro
          window.location.href = '/assinatura';
        });
      }
    }
  }

  return response;
};
