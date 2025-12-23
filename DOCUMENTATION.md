# 📚 DOCUMENTAÇÃO TÉCNICA - DASHADS

## Sistema SaaS de Análise de Dados via CSV

**Versão:** 1.0  
**Última Atualização:** Dezembro 2024

---

## 📋 ÍNDICE

1. [Visão Geral do Sistema](#1-visão-geral-do-sistema)
2. [Arquitetura Técnica](#2-arquitetura-técnica)
3. [Estrutura de Rotas](#3-estrutura-de-rotas)
4. [Área Institucional (Landing Page)](#4-área-institucional-landing-page)
5. [Sistema de Autenticação](#5-sistema-de-autenticação)
6. [Área Logada (Dashboard)](#6-área-logada-dashboard)
7. [Modelo de Dados](#7-modelo-de-dados)
8. [Próximos Passos - Implementação Backend](#8-próximos-passos-implementação-backend)

---

## 1. VISÃO GERAL DO SISTEMA

### 1.1 Descrição do Produto
DashAds é uma **plataforma SaaS de análise de dados** voltada para vendedores digitais, afiliados e empreendedores que precisam visualizar e analisar dados de vendas através de dashboards interativos.

### 1.2 Modelo de Negócio
| Plano | Preço | Recursos |
|-------|-------|----------|
| **Plano Básico** | R$ 67,00/mês | Upload CSV, Dashboards, Filtros, Relatórios |

### 1.3 Stack Tecnológico Atual

| Camada | Tecnologia | Status |
|--------|------------|--------|
| Frontend | React 18 + TypeScript | ✅ Implementado |
| Estilização | Tailwind CSS + Shadcn/ui | ✅ Implementado |
| Roteamento | React Router DOM v6 | ✅ Implementado |
| Visualização | Recharts | ✅ Implementado |
| Parsing CSV | PapaParse | ✅ Implementado |
| Animações | Framer Motion | ✅ Implementado |
| Backend | Lovable Cloud (Supabase) | ⏳ Pendente |
| Pagamentos | Stripe | ⏳ Pendente |

---

## 2. ARQUITETURA TÉCNICA

### 2.1 Estrutura de Pastas

```
src/
├── App.tsx                          # Configuração de rotas principal
├── main.tsx                         # Entry point
├── index.css                        # Design system (tokens CSS)
├── components/
│   ├── ui/                          # Componentes Shadcn/ui
│   ├── landing/                     # Componentes da landing page
│   │   ├── Header.tsx               # Navegação principal
│   │   ├── HeroSection.tsx          # Seção hero
│   │   ├── FeaturesSection.tsx      # Funcionalidades
│   │   ├── HowItWorksSection.tsx    # Como funciona
│   │   ├── PricingSection.tsx       # Preços
│   │   └── Footer.tsx               # Rodapé
│   └── dashboard/                   # Componentes do dashboard
│       ├── DashboardLayout.tsx      # Layout wrapper
│       ├── DashboardSidebar.tsx     # Sidebar navegação
│       ├── DashboardHeader.tsx      # Header do dashboard
│       ├── DashboardFilters.tsx     # Filtros de dados
│       ├── DashboardCharts.tsx      # Gráficos (Recharts)
│       ├── KPICards.tsx             # Cards de KPIs
│       └── DataTable.tsx            # Tabela de dados
├── pages/
│   ├── Index.tsx                    # Landing page
│   ├── Login.tsx                    # Tela de login
│   ├── Signup.tsx                   # Tela de cadastro
│   ├── Dashboard.tsx                # Dashboard principal
│   ├── UploadCSV.tsx                # Upload de arquivos
│   ├── Reports.tsx                  # Relatórios
│   ├── Modules.tsx                  # Módulos futuros
│   ├── Settings.tsx                 # Configurações
│   └── NotFound.tsx                 # Página 404
├── hooks/                           # Custom hooks
└── lib/                             # Utilitários
```

### 2.2 Design System

O sistema utiliza tokens CSS semânticos definidos em `index.css`:

```css
/* Cores Principais */
--primary: Navy Blue (222, 47%, 20%)
--accent: Teal (173, 80%, 40%)
--success: Verde (142, 76%, 36%)
--warning: Âmbar (38, 92%, 50%)
--destructive: Vermelho (0, 84%, 60%)

/* Tipografia */
--font-display: 'Sora', sans-serif    /* Títulos */
--font-body: 'Inter', sans-serif       /* Texto */
```

---

## 3. ESTRUTURA DE ROTAS

### 3.1 Mapa de Rotas

```typescript
// Arquivo: src/App.tsx

<Routes>
  {/* ÁREA PÚBLICA */}
  <Route path="/" element={<Index />} />           // Landing page
  <Route path="/login" element={<Login />} />      // Tela de login
  <Route path="/signup" element={<Signup />} />    // Tela de cadastro

  {/* ÁREA PROTEGIDA (requer autenticação + assinatura) */}
  <Route path="/dashboard" element={<Dashboard />} />
  <Route path="/dashboard/upload" element={<UploadCSV />} />
  <Route path="/dashboard/reports" element={<Reports />} />
  <Route path="/dashboard/modules" element={<Modules />} />
  <Route path="/dashboard/settings" element={<Settings />} />

  {/* FALLBACK */}
  <Route path="*" element={<NotFound />} />
</Routes>
```

### 3.2 Fluxo de Navegação

```
┌─────────────────┐
│  Landing Page   │ ─────► /login ou /signup
│      (/)        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐      ┌─────────────────┐
│     Login       │◄────►│     Signup      │
│   (/login)      │      │   (/signup)     │
└────────┬────────┘      └────────┬────────┘
         │                        │
         └──────────┬─────────────┘
                    ▼
         ┌─────────────────────────┐
         │   Verificar Assinatura  │
         │      (middleware)       │
         └────────────┬────────────┘
                      │
         ┌────────────┼────────────┐
         │            │            │
         ▼            ▼            ▼
   /dashboard   /upload    /reports ...
```

---

## 4. ÁREA INSTITUCIONAL (LANDING PAGE)

### 4.1 Estrutura da Página

**Arquivo:** `src/pages/Index.tsx`

```tsx
<Index>
  ├── <Header />           // Navegação fixa
  ├── <HeroSection />      // Headline + CTA
  ├── <FeaturesSection />  // 6 funcionalidades
  ├── <HowItWorksSection /> // 3 passos
  ├── <PricingSection />   // Card de preço
  └── <Footer />           // Links + termos
</Index>
```

### 4.2 Componentes Detalhados

#### Header (`src/components/landing/Header.tsx`)
| Elemento | Ação |
|----------|------|
| Logo | Redireciona para `/` |
| Funcionalidades | Scroll para `#features` |
| Preços | Scroll para `#pricing` |
| Login | Redireciona para `/login` |
| Criar Conta | Redireciona para `/signup` |

#### HeroSection (`src/components/landing/HeroSection.tsx`)
- **Badge:** "Plataforma de Análise de Dados"
- **Headline:** "Transforme seus dados em decisões inteligentes"
- **Stats:** R$ 67/mês | 100% Seguro | 5min Setup
- **CTAs:** "Começar Agora" → `/signup` | "Ver Funcionalidades" → `#features`
- **Preview:** Mock visual do dashboard

#### FeaturesSection (`src/components/landing/FeaturesSection.tsx`)
6 cards com ícones:
1. Upload de CSV
2. Dashboards Interativos
3. Filtros Avançados
4. Relatórios Detalhados
5. Dados Seguros
6. Atualizações em Tempo Real

#### HowItWorksSection (`src/components/landing/HowItWorksSection.tsx`)
3 passos:
1. Faça upload do CSV
2. Visualize os gráficos
3. Tome decisões

#### PricingSection (`src/components/landing/PricingSection.tsx`)
- **Plano Básico:** R$ 67/mês
- **Features listadas:** 8 benefícios
- **CTA:** "Assinar Agora" → `/signup`
- **Teaser:** "Em breve: Módulos avançados de IA..."

---

## 5. SISTEMA DE AUTENTICAÇÃO

### 5.1 Tela de Login (`/login`)

**Arquivo:** `src/pages/Login.tsx`

**Campos do Formulário:**
| Campo | Tipo | Validação |
|-------|------|-----------|
| Email | email | Obrigatório, formato válido |
| Senha | password | Obrigatório, mín. 6 caracteres |

**Ações:**
- "Entrar" → Autenticar via Supabase Auth
- "Esqueci minha senha" → Fluxo de reset (futuro)
- "Entrar com Google" → OAuth Google
- Link para `/signup`

### 5.2 Tela de Cadastro (`/signup`)

**Arquivo:** `src/pages/Signup.tsx`

**Campos do Formulário:**
| Campo | Tipo | Validação |
|-------|------|-----------|
| Nome | text | Obrigatório |
| Email | email | Obrigatório, único |
| Senha | password | Mín. 6 caracteres |

**Ações:**
- "Criar Conta" → Criar usuário + Redirecionar para pagamento
- "Cadastrar com Google" → OAuth Google
- Link para `/login`

### 5.3 Fluxo de Assinatura (A Implementar)

```
1. Usuário clica em "Assinar"
2. Redireciona para checkout (Stripe)
3. Pagamento aprovado
4. Webhook Stripe → Cria subscription
5. Usuário pode fazer login
6. Dashboard liberado
```

---

## 6. ÁREA LOGADA (DASHBOARD)

### 6.1 Layout Base

**Arquivo:** `src/components/dashboard/DashboardLayout.tsx`

```tsx
<DashboardLayout>
  ├── <DashboardSidebar />  // Navegação lateral
  ├── <DashboardHeader />   // Título + ações
  └── <main>{children}</main>
</DashboardLayout>
```

### 6.2 Sidebar (`DashboardSidebar.tsx`)

**Menu de Navegação:**
| Ícone | Label | Rota |
|-------|-------|------|
| LayoutDashboard | Dashboard | `/dashboard` |
| Upload | Upload CSV | `/dashboard/upload` |
| FileText | Relatórios | `/dashboard/reports` |
| Puzzle | Módulos | `/dashboard/modules` |
| Settings | Configurações | `/dashboard/settings` |
| LogOut | Sair | `/` (logout) |

**Funcionalidades:**
- Sidebar colapsável (20px → 64px)
- Indicador de rota ativa
- Toggle de colapso

### 6.3 Dashboard Principal (`/dashboard`)

**Arquivo:** `src/pages/Dashboard.tsx`

**Componentes:**
```tsx
<Dashboard>
  ├── <DashboardFilters />   // Filtros de período/produto
  ├── <KPICards />           // 4 cards de métricas
  ├── <DashboardCharts />    // Gráficos
  └── <DataTable />          // Tabela de dados
</Dashboard>
```

#### KPICards (`KPICards.tsx`)
4 métricas principais:
| KPI | Cor | Ícone |
|-----|-----|-------|
| Receita Total | Verde | DollarSign |
| Custos Totais | Âmbar | ShoppingCart |
| Comissões | Roxo | Percent |
| Lucro Líquido | Teal | Target |

#### DashboardCharts (`DashboardCharts.tsx`)
2 gráficos:
1. **AreaChart** - Evolução de Receita vs Lucro (grid 2/3)
2. **PieChart** - Distribuição por Produto (grid 1/3)

#### DashboardFilters (`DashboardFilters.tsx`)
| Filtro | Tipo | Opções |
|--------|------|--------|
| Período | Select | Últimos 7/30/90 dias, Ano |
| Produto | Select | Todos, Produto A/B/C/D |
| Busca | Input | Texto livre |
| Atualizar | Button | Recarrega dados |

### 6.4 Upload CSV (`/dashboard/upload`)

**Arquivo:** `src/pages/UploadCSV.tsx`

**Estados do Componente:**
| Estado | Tipo | Descrição |
|--------|------|-----------|
| dragActive | boolean | Zona de drop ativa |
| file | File | Arquivo selecionado |
| csvData | CSVData | Headers + Rows parseados |
| isProcessing | boolean | Carregando |
| error | string | Mensagem de erro |

**Fluxo de Upload:**
```
1. Drag & Drop ou Click para selecionar
2. Validação: .csv, < 10MB
3. PapaParse processa arquivo
4. Preview: primeiras 10 linhas
5. Botão "Processar Dados"
6. Salvar no Supabase (futuro)
```

**Formato Esperado do CSV:**
| Coluna | Tipo |
|--------|------|
| Data | date |
| Produto | string |
| Receita | number |
| Custo | number |
| Comissão | number |

### 6.5 Relatórios (`/dashboard/reports`)

**Arquivo:** `src/pages/Reports.tsx`

**Funcionalidades:**
- Filtros: Ano, Período (trimestre)
- Cards: Receita Total, Lucro Total
- Tabela: Relatório mensal com variação %
- Exportar CSV

**Estrutura da Tabela:**
| Coluna | Formato |
|--------|---------|
| Mês | "Janeiro 2024" |
| Receita | R$ XX.XXX |
| Custos | R$ XX.XXX |
| Comissão | R$ XX.XXX |
| Lucro | R$ XX.XXX |
| Variação | +XX.X% |

### 6.6 Módulos (`/dashboard/modules`)

**Arquivo:** `src/pages/Modules.tsx`

**Módulos Planejados (Em Breve):**
| Módulo | Descrição | Features |
|--------|-----------|----------|
| Análise Financeira Avançada | ML e projeções | Projeções, Sazonalidade, Alertas |
| Integrações via API | Conexão automática | Hotmart, Eduzz, Kiwify, Monetizze |
| Insights Inteligentes | IA generativa | Recomendações, Anomalias, Relatórios Auto |

### 6.7 Configurações (`/dashboard/settings`)

**Arquivo:** `src/pages/Settings.tsx`

**Seções:**
1. **Perfil** - Nome, Email
2. **Notificações** - Toggles (relatórios, alertas, novidades)
3. **Assinatura** - Status do plano, gerenciar
4. **Zona de Perigo** - Excluir conta

---

## 7. MODELO DE DADOS

### 7.1 Diagrama ER (A Criar no Supabase)

```
┌─────────────────┐       ┌─────────────────┐
│    profiles     │       │      plans      │
├─────────────────┤       ├─────────────────┤
│ id (PK)         │       │ id (PK)         │
│ user_id (FK)    │       │ name            │
│ name            │       │ price           │
│ created_at      │       │ is_active       │
└────────┬────────┘       └────────┬────────┘
         │                         │
         │    ┌────────────────────┘
         │    │
         ▼    ▼
┌─────────────────────┐
│   subscriptions     │
├─────────────────────┤
│ id (PK)             │
│ user_id (FK)        │
│ plan_id (FK)        │
│ status              │  // active, canceled, expired
│ started_at          │
│ expires_at          │
└─────────────────────┘

┌─────────────────┐       ┌─────────────────────┐
│    datasets     │       │    dataset_rows     │
├─────────────────┤       ├─────────────────────┤
│ id (PK)         │◄──────│ id (PK)             │
│ user_id (FK)    │       │ dataset_id (FK)     │
│ name            │       │ user_id (FK)        │
│ uploaded_at     │       │ date                │
└─────────────────┘       │ product             │
                          │ revenue             │
                          │ cost                │
                          │ commission          │
                          │ profit              │
                          └─────────────────────┘

┌─────────────────┐       ┌─────────────────────┐
│    modules      │       │    user_modules     │
├─────────────────┤       ├─────────────────────┤
│ id (PK)         │◄──────│ user_id (FK)        │
│ name            │       │ module_id (FK)      │
│ code            │       │ enabled             │
└─────────────────┘       └─────────────────────┘
```

### 7.2 SQL de Criação (Para Supabase)

```sql
-- Tipos Enum
CREATE TYPE subscription_status AS ENUM ('active', 'canceled', 'expired');

-- Tabela de Planos
CREATE TABLE plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir plano inicial
INSERT INTO plans (name, price) VALUES ('Plano Básico', 67.00);

-- Tabela de Perfis
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Assinaturas
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plan_id UUID REFERENCES plans(id) NOT NULL,
  status subscription_status DEFAULT 'active',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- Tabela de Datasets
CREATE TABLE datasets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Linhas do Dataset
CREATE TABLE dataset_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id UUID REFERENCES datasets(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE,
  product TEXT,
  revenue DECIMAL(12,2),
  cost DECIMAL(12,2),
  commission DECIMAL(12,2),
  profit DECIMAL(12,2) GENERATED ALWAYS AS (revenue - cost - commission) STORED
);

-- Índices para performance
CREATE INDEX idx_dataset_rows_user ON dataset_rows(user_id);
CREATE INDEX idx_dataset_rows_date ON dataset_rows(date);
CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);

-- RLS (Row Level Security)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE dataset_rows ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own subscription" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own datasets" ON datasets
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own data rows" ON dataset_rows
  FOR ALL USING (auth.uid() = user_id);

-- Trigger para criar perfil ao registrar
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (user_id, name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

---

## 8. PRÓXIMOS PASSOS - IMPLEMENTAÇÃO BACKEND

### 8.1 Ordem de Implementação Recomendada

```
FASE 1: AUTENTICAÇÃO
├── Habilitar Lovable Cloud
├── Configurar Supabase Auth
├── Implementar Login/Signup reais
├── Criar middleware de proteção de rotas
└── Implementar logout

FASE 2: BANCO DE DADOS
├── Criar tabelas via SQL
├── Configurar RLS
├── Conectar formulários com Supabase
└── Testar isolamento de dados

FASE 3: UPLOAD CSV FUNCIONAL
├── Salvar arquivo no Supabase Storage
├── Parsear e inserir em dataset_rows
├── Atualizar dashboard com dados reais
└── Implementar filtros reais

FASE 4: PAGAMENTOS
├── Integrar Stripe
├── Criar checkout session
├── Configurar webhooks
├── Validar assinatura antes de liberar dashboard

FASE 5: DEPLOY
├── Configurar variáveis de ambiente
├── Deploy no Lovable
└── Testes em produção
```

### 8.2 Checklist de Implementação

**Autenticação:**
- [ ] Habilitar Lovable Cloud
- [ ] Login com email/senha
- [ ] Cadastro com email/senha
- [ ] Login com Google OAuth
- [ ] Proteção de rotas do dashboard
- [ ] Persistência de sessão

**Banco de Dados:**
- [ ] Criar schema no Supabase
- [ ] Configurar RLS em todas as tabelas
- [ ] Trigger para criação de perfil
- [ ] Índices de performance

**Upload CSV:**
- [ ] Validação de arquivo
- [ ] Upload para Supabase Storage
- [ ] Parsing e inserção no banco
- [ ] Feedback de progresso
- [ ] Tratamento de erros

**Dashboard:**
- [ ] Buscar dados reais do banco
- [ ] Filtros funcionais
- [ ] Atualização em tempo real
- [ ] Cache de queries

**Pagamentos:**
- [ ] Integração Stripe
- [ ] Página de checkout
- [ ] Webhook de confirmação
- [ ] Verificação de status da assinatura

---

## 📝 NOTAS FINAIS

### Convenções de Código
- Componentes: PascalCase
- Arquivos: PascalCase.tsx
- Variáveis CSS: kebab-case
- Funções: camelCase

### Padrões de Design
- Mobile-first responsive
- Tokens semânticos do design system
- Framer Motion para animações
- Toast para feedback do usuário

### Segurança
- RLS obrigatório em todas as tabelas
- Nunca expor API keys no frontend
- Validar assinatura antes de liberar features
- HTTPS em produção

---

**Documentação criada para implementação completa do DashAds.**
