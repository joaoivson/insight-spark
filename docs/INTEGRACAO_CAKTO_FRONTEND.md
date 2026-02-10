# Integração Cakto - Frontend MarketDash

Este documento descreve a implementação completa da integração com o sistema de assinatura Cakto no frontend do MarketDash.

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura da Implementação](#arquitetura-da-implementação)
3. [Estrutura de Arquivos](#estrutura-de-arquivos)
4. [Serviços](#serviços)
5. [Hooks](#hooks)
6. [Componentes e Páginas](#componentes-e-páginas)
7. [Fluxos de Assinatura](#fluxos-de-assinatura)
8. [Proteção de Rotas](#proteção-de-rotas)
9. [Tratamento de Erros](#tratamento-de-erros)
10. [Configuração](#configuração)
11. [Boas Práticas](#boas-práticas)

---

## 🎯 Visão Geral

A integração Cakto permite que usuários assinem o MarketDash através do gateway de pagamento Cakto. O frontend gerencia:

- **Checkout**: Redirecionamento para página de pagamento da Cakto
- **Verificação de Status**: Validação periódica da assinatura ativa
- **Proteção de Rotas**: Bloqueio de acesso sem assinatura ativa
- **Callbacks**: Processamento do retorno após pagamento

### Características Principais

- ✅ Endpoint de checkout **público** (não requer autenticação)
- ✅ Verificação automática de assinatura a cada 5 minutos
- ✅ Redirecionamento inteligente baseado no estado do usuário
- ✅ Integração completa com site institucional
- ✅ Tratamento automático de erros 403 (assinatura inativa)
- ✅ Suporte a iframe com fallback automático para popup/redirecionamento

---

## 🏗️ Arquitetura da Implementação

```
┌─────────────────────────────────────────────────────────────┐
│                    Site Institucional                        │
│  (Header, HeroSection, FinalCTASection)                      │
│  └─> Botão "Assinar" → caktoService                         │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Página de Assinatura (/assinatura)             │
│  └─> Formulário opcional → caktoService.redirectToCheckout()│
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Cakto Checkout                            │
│  (https://pay.cakto.com.br/8e9qxyg_742442)                  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│         Callback (/assinatura/callback)                     │
│  └─> Processa retorno → Verifica status → Redireciona      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Rotas Protegidas (ProtectedRoute)               │
│  └─> useSubscriptionCheck → Verifica assinatura ativa       │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 Estrutura de Arquivos

```
src/
├── services/
│   ├── cakto.service.ts              # Serviço de integração Cakto
│   └── subscription.service.ts        # Serviço de status de assinatura
├── shared/
│   └── hooks/
│       └── useSubscriptionCheck.ts   # Hook de verificação de assinatura
├── features/
│   └── subscription/
│       ├── components/
│       │   └── CaktoCheckoutModal.tsx  # Modal com iframe/popup
│       └── pages/
│           ├── SubscriptionPage.tsx   # Página de assinatura
│           ├── SubscriptionCallback.tsx  # Callback após pagamento
│           ├── SubscriptionSuccess.tsx   # Página de sucesso (legado)
│           └── SubscriptionError.tsx     # Página de erro (legado)
├── components/
│   └── landing/
│       ├── Header.tsx                 # Header com botão "Assinar"
│       ├── HeroSection.tsx            # Hero com CTA "Assinar agora"
│       └── FinalCTASection.tsx        # CTA final "Assinar agora"
├── core/
│   └── config/
│       ├── api.config.ts              # fetchPublic, fetchWithAuth, interceptor 403
│       └── app.config.ts              # Rotas de assinatura
└── app/
    └── routes/
        └── app-routes.tsx             # Rotas e ProtectedRoute
```

---

## 🔧 Serviços

### `cakto.service.ts`

Serviço dedicado para integração com Cakto. **Não requer autenticação** para obter URL de checkout.

```typescript
import { getApiUrl, fetchPublic } from "@/core/config/api.config";

export interface CheckoutUrlParams {
  email?: string;  // Opcional
  name?: string;   // Opcional
  cpf_cnpj?: string; // Opcional
}

export const caktoService = {
  /**
   * Obtém URL de checkout da Cakto (público, sem autenticação)
   */
  async getCheckoutUrl(params: CheckoutUrlParams = {}): Promise<string> {
    // Usa fetchPublic (sem token)
    const url = getApiUrl(`/api/v1/cakto/checkout-url?email=...`);
    const res = await fetchPublic(url, { method: "GET" });
    return res.json().checkout_url;
  },

  /**
   * Redireciona para checkout com dados pré-preenchidos
   */
  async redirectToCheckout(params: CheckoutUrlParams = {}): Promise<void> {
    const checkoutUrl = await this.getCheckoutUrl(params);
    window.location.href = checkoutUrl;
  },

  /**
   * Redireciona diretamente para Cakto (sem pré-preenchimento)
   */
  redirectToCheckoutDirect(): void {
    window.location.href = 'https://pay.cakto.com.br/8e9qxyg_742442';
  },
};
```

**Uso:**
- Site institucional (usuário não logado): `caktoService.redirectToCheckoutDirect()`
- Site institucional (usuário logado): `caktoService.redirectToCheckout({ email, name, cpf_cnpj })`
- Página de assinatura: `caktoService.redirectToCheckout({ email, name, cpf_cnpj })`

### `subscription.service.ts`

Serviço para verificar status da assinatura. **Requer autenticação**.

```typescript
export interface SubscriptionStatus {
  is_active: boolean;
  plan: string; // "marketdash" ou "free"
  expires_at: string | null;
  last_validation_at: string | null;
  cakto_customer_id: string | null;
  needs_validation: boolean; // Se precisa validar (passou 30 dias)
}

export const getSubscriptionStatus = async (): Promise<SubscriptionStatus> => {
  const url = getApiUrl("/api/v1/subscription/status");
  const res = await fetchWithAuth(url, { method: "GET" });
  return res.json();
};
```

---

## 🪝 Hooks

### `useSubscriptionCheck`

Hook para verificar status da assinatura com verificação periódica automática.

```typescript
export const useSubscriptionCheck = (options?: { 
  redirectOnInactive?: boolean;  // Padrão: true
  checkInterval?: number;         // Padrão: 5 minutos (300000ms)
}) => {
  // Retorna:
  // - status: SubscriptionStatus | null
  // - loading: boolean
  // - error: string | null
  // - refetch: () => Promise<void>
  // - isActive: boolean (computed)
};
```

**Características:**
- Verifica status automaticamente ao montar
- Verifica periodicamente a cada 5 minutos (configurável)
- Redireciona para `/assinatura` se inativa (se `redirectOnInactive: true`)
- Trata erros 403 automaticamente

**Uso:**
```typescript
// Em ProtectedRoute
const { status, loading, isActive } = useSubscriptionCheck({ 
  redirectOnInactive: true 
});

// Em página de assinatura (sem redirecionamento)
const { status, isActive } = useSubscriptionCheck({ 
  redirectOnInactive: false 
});
```

---

## 🎨 Componentes e Páginas

### `SubscriptionPage.tsx`

Página principal de assinatura (`/assinatura`).

**Funcionalidades:**
- Verifica se usuário já tem assinatura ativa (mostra mensagem)
- Pré-preenche formulário se usuário estiver logado
- Campos opcionais (conforme documentação)
- Tenta abrir checkout em modal com iframe
- Fallback automático para popup se iframe não for suportado
- Fallback para redirecionamento se popup for bloqueado

**Fluxo:**
1. Verifica status da assinatura
2. Se ativa → mostra mensagem "Assinatura Ativa"
3. Se inativa → mostra formulário (opcional)
4. Ao submeter → obtém URL de checkout
5. Tenta abrir em modal com iframe
6. Se iframe não suportado → abre popup
7. Se popup bloqueado → mostra opções de redirecionamento

### `CaktoCheckoutModal.tsx`

Componente modal que gerencia checkout com iframe e fallbacks.

**Funcionalidades:**
- Verifica suporte a iframe automaticamente
- Carrega checkout em iframe se suportado
- Fallback automático para popup se iframe bloqueado
- Tratamento de erros com opções de redirecionamento
- Listener para eventos de popup fechado

**Estados:**
- `loading`: Verificando suporte a iframe
- `iframeSupported: true`: Exibe iframe
- `iframeSupported: false`: Abre popup automaticamente
- `iframeError: true`: Mostra opções de redirecionamento

### `SubscriptionCallback.tsx`

Página de callback após pagamento (`/assinatura/callback`).

**Funcionalidades:**
- Aguarda processamento do webhook (3 segundos)
- Verifica status da assinatura
- Redireciona baseado no estado:
  - **Logado + Ativo**: Dashboard
  - **Não logado**: Login
  - **Erro**: Página de erro

**Estados:**
- `processing`: Aguardando processamento
- `success`: Assinatura confirmada
- `error`: Erro ao processar

### Integração no Site Institucional

#### `Header.tsx`
```typescript
const handleSubscribe = async () => {
  const isAuthenticated = !!tokenStorage.get();
  const user = userStorage.get();
  
  if (isAuthenticated && user) {
    await caktoService.redirectToCheckout({
      email: user.email,
      name: user.name,
      cpf_cnpj: user.cpf_cnpj,
    });
  } else {
    caktoService.redirectToCheckoutDirect();
  }
};
```

#### `HeroSection.tsx` e `FinalCTASection.tsx`
Mesma lógica do Header: se logado, pré-preenche; se não, redireciona direto.

---

## 🔄 Fluxos de Assinatura

### Fluxo 1: Usuário Novo (Site Institucional)

```
1. Usuário acessa landing page
2. Clica em "Assinar" no header/hero
3. Frontend: caktoService.redirectToCheckoutDirect()
4. Redireciona para: https://pay.cakto.com.br/8e9qxyg_742442
5. Usuário preenche dados na Cakto
6. Completa pagamento
7. Cakto envia webhook → Backend cria usuário e ativa assinatura
8. Cakto redireciona para: /assinatura/callback
9. Callback aguarda 3s → Verifica status → Redireciona para /login
10. Usuário faz login → Acessa plataforma
```

### Fluxo 2: Usuário Logado (Renovação)

```
1. Usuário logado acessa landing page
2. Clica em "Assinar"
3. Frontend: caktoService.redirectToCheckout({ email, name, cpf_cnpj })
4. Redireciona para Cakto com dados pré-preenchidos
5. Completa pagamento
6. Cakto envia webhook → Backend atualiza assinatura
7. Cakto redireciona para: /assinatura/callback
8. Callback verifica status → Redireciona para /dashboard
```

### Fluxo 3: Acesso a Rota Protegida (Sem Assinatura)

```
1. Usuário tenta acessar /dashboard
2. ProtectedRoute verifica token → OK
3. ProtectedRoute chama useSubscriptionCheck()
4. Hook verifica status → is_active: false
5. Redireciona para /assinatura
6. Usuário vê página de assinatura
```

### Fluxo 4: Verificação Periódica

```
1. Usuário está na plataforma
2. useSubscriptionCheck verifica status a cada 5 minutos
3. Se assinatura expirar → Redireciona para /assinatura
4. Interceptor 403 também captura e redireciona
```

---

## 🛡️ Proteção de Rotas

### `ProtectedRoute`

Componente que protege rotas autenticadas e com assinatura ativa.

```typescript
const ProtectedRoute = ({ element }: { element: JSX.Element }) => {
  const token = tokenStorage.get();
  const { status, loading, isActive } = useSubscriptionCheck({ 
    redirectOnInactive: true 
  });

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!isActive) {
    return <Navigate to="/assinatura" replace />;
  }

  return element;
};
```

**Uso:**
```typescript
<Route 
  path="/dashboard" 
  element={<ProtectedRoute element={<Dashboard />} />} 
/>
```

---

## ⚠️ Tratamento de Erros

### Interceptor 403 (API)

Em `api.config.ts`, o `fetchWithAuth` intercepta erros 403 relacionados a assinatura:

```typescript
if (response.status === 403) {
  const errorData = await response.json().catch(() => ({}));
  const errorMessage = errorData.detail || errorData.message || '';
  const isSubscriptionError = 
    errorMessage.toLowerCase().includes("assinatura") ||
    errorMessage.toLowerCase().includes("subscription") ||
    errorMessage.toLowerCase().includes("não está ativa");
  
  if (isSubscriptionError && typeof window !== 'undefined') {
    if (!window.location.pathname.includes('/assinatura')) {
      window.dispatchEvent(new CustomEvent('subscription-required', {
        detail: { message: errorMessage }
      }));
      window.location.href = '/assinatura';
    }
  }
}
```

### Hook `useSubscriptionCheck`

O hook também trata erros 403:

```typescript
catch (err) {
  if (err instanceof Error && errorMessage.includes("403")) {
    if (redirectOnInactive) {
      navigate("/assinatura");
    }
  }
}
```

### Event Listener Global

Em `main.tsx`, há um listener para eventos de assinatura:

```typescript
import { setupSubscriptionListener } from "@/shared/utils/subscription-events";
setupSubscriptionListener();
```

---

## ⚙️ Configuração

### Rotas (`app.config.ts`)

```typescript
ROUTES: {
  SUBSCRIPTION: '/assinatura',
  SUBSCRIPTION_CALLBACK: '/assinatura/callback',
  SUBSCRIPTION_SUCCESS: '/assinatura/sucesso',
  SUBSCRIPTION_ERROR: '/assinatura/erro',
}
```

### URLs da Cakto

```typescript
// Em cakto.service.ts
const CAKTO_CHECKOUT_BASE_URL = 'https://pay.cakto.com.br/8e9qxyg_742442';
const PRODUCT_ID = '8e9qxyg_742442';
```

### Verificação Periódica

Padrão: 5 minutos (300000ms)

```typescript
// Em useSubscriptionCheck.ts
const checkInterval = 5 * 60 * 1000; // 5 minutos
```

---

## ✅ Boas Práticas

### 1. Sempre Use `caktoService`

Não chame a API diretamente. Use sempre o serviço:

```typescript
// ✅ Correto
await caktoService.redirectToCheckout({ email: user.email });

// ❌ Incorreto
const url = await fetch('/api/v1/cakto/checkout-url');
```

### 2. Verificação Periódica

Sempre use `useSubscriptionCheck` em rotas protegidas:

```typescript
// ✅ Correto
const { isActive } = useSubscriptionCheck({ redirectOnInactive: true });

// ❌ Incorreto
const status = await getSubscriptionStatus(); // Sem verificação periódica
```

### 3. Tratamento de Estados

Sempre trate estados de loading e erro:

```typescript
const { status, loading, error, isActive } = useSubscriptionCheck();

if (loading) return <LoadingSpinner />;
if (error) return <ErrorMessage />;
if (!isActive) return <SubscriptionRequired />;
```

### 4. Redirecionamento Inteligente

Sempre verifique se usuário está logado antes de pré-preencher:

```typescript
const isAuthenticated = !!tokenStorage.get();
const user = userStorage.get();

if (isAuthenticated && user) {
  await caktoService.redirectToCheckout({
    email: user.email,
    name: user.name,
    cpf_cnpj: user.cpf_cnpj,
  });
} else {
  caktoService.redirectToCheckoutDirect();
}
```

### 5. Campos Opcionais

Na página de assinatura, campos são opcionais (conforme documentação):

```typescript
// ✅ Correto - Campos opcionais
<Input value={formData.email} placeholder="Email (opcional)" />

// ❌ Incorreto - Campos obrigatórios
<Input value={formData.email} required />
```

### 6. Callback com Delay

Sempre aguarde processamento do webhook no callback:

```typescript
// Aguardar 3 segundos para webhook processar
await new Promise(resolve => setTimeout(resolve, 3000));
await refetch(); // Verificar status atualizado
```

---

## 🔍 Debugging

### Verificar Status da Assinatura

```typescript
// No console do navegador
const status = await fetch('/api/v1/subscription/status', {
  headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
}).then(r => r.json());
console.log(status);
```

### Verificar Cache

```typescript
// Verificar localStorage
localStorage.getItem('token');
localStorage.getItem('user');
```

### Logs de Erro

O interceptor 403 e o hook `useSubscriptionCheck` logam erros automaticamente. Verifique o console do navegador.

---

## 📚 Referências

- **Documentação Backend**: `../marketDash_backend/docs/INTEGRACAO_FRONTEND_CAKTO.md`
- **API Endpoints**: `/api/v1/cakto/checkout-url`, `/api/v1/subscription/status`
- **Cakto**: https://pay.cakto.com.br/8e9qxyg_742442

---

## 🖼️ Checkout em Iframe

### Funcionalidade

O sistema tenta abrir o checkout da Cakto em um iframe dentro de um modal. Se o iframe não for suportado (bloqueado por X-Frame-Options ou CSP), o sistema automaticamente faz fallback para popup window ou redirecionamento.

### Como Funciona

1. **Verificação Automática**: Ao tentar abrir checkout, o sistema verifica se a URL suporta iframe
2. **Iframe Suportado**: Carrega checkout dentro de modal com iframe
3. **Iframe Bloqueado**: Abre automaticamente em popup window
4. **Popup Bloqueado**: Mostra opções para abrir em nova aba ou redirecionar

### Uso do Componente

```typescript
import CaktoCheckoutModal from "@/features/subscription/components/CaktoCheckoutModal";

const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
const [showModal, setShowModal] = useState(false);

// Ao obter URL de checkout
const url = await caktoService.getCheckoutUrl(params);
setCheckoutUrl(url);
setShowModal(true);

// Renderizar modal
{checkoutUrl && (
  <CaktoCheckoutModal
    checkoutUrl={checkoutUrl}
    open={showModal}
    onClose={() => setShowModal(false)}
    onFallback={() => {
      // Callback quando popup é aberto
      toast({ title: "Checkout aberto em nova janela" });
    }}
  />
)}
```

### Eventos

O sistema dispara evento `cakto-checkout-closed` quando popup de checkout é fechado:

```typescript
useEffect(() => {
  const handleCheckoutClosed = async () => {
    await refetch(); // Verificar status atualizado
    if (isActive) {
      navigate('/dashboard');
    }
  };
  
  window.addEventListener('cakto-checkout-closed', handleCheckoutClosed);
  return () => window.removeEventListener('cakto-checkout-closed', handleCheckoutClosed);
}, []);
```

### Limitações

- **X-Frame-Options**: Se Cakto retornar `X-Frame-Options: DENY`, iframe será bloqueado
- **Content-Security-Policy**: Políticas `frame-ancestors 'none'` bloqueiam iframe
- **PCI-DSS**: Gateways de pagamento geralmente não permitem iframe por segurança
- **Popup Blockers**: Navegadores podem bloquear popups, exigindo fallback

### Recomendações

- **Testar em produção**: Verificar se Cakto permite iframe na prática
- **Fallback sempre ativo**: Sistema sempre tem fallback funcional
- **UX clara**: Informar usuário quando popup é aberto
- **Mobile**: Em mobile, redirecionamento pode ser melhor que popup

## 🚀 Próximos Passos

1. **Testes E2E**: Implementar testes com Playwright para fluxo completo
2. **Analytics**: Adicionar tracking de eventos de assinatura
3. **Notificações**: Implementar notificações push para expiração de assinatura
4. **Renovação Automática**: Implementar fluxo de renovação automática
5. **Teste Iframe**: Validar se Cakto realmente suporta iframe em produção

---

**Última atualização**: Janeiro 2025
