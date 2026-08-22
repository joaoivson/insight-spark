# MarketDash - Insight Spark

Plataforma SaaS de análise de dados para vendedores digitais, afiliados e empreendedores.

## 🚀 Tecnologias

- **React 18** + **TypeScript**
- **Vite** - Build tool
- **Tailwind CSS** - Estilização
- **Shadcn/ui** - Componentes UI
- **React Router** - Roteamento
- **Framer Motion** - Animações
- **Recharts** - Gráficos
- **PapaParse** - Parsing de CSV
- **SASS** - Pré-processador CSS

## 📁 Estrutura do Projeto

```
src/
├── app/                    # Configuração da aplicação
│   ├── providers/         # Providers globais
│   └── routes/            # Configuração de rotas
├── features/               # Features organizadas por domínio
│   ├── auth/             # Autenticação (Login, Signup)
│   ├── dashboard/        # Dashboard e funcionalidades
│   └── landing/          # Landing page
├── shared/                # Código compartilhado
│   ├── components/       # Componentes UI reutilizáveis
│   ├── hooks/            # Hooks customizados
│   ├── lib/              # Utilitários
│   ├── styles/           # Estilos SCSS compartilhados
│   └── types/            # Tipos TypeScript
└── core/                  # Configurações core
    └── config/           # Configurações (API, App)
```

## 🛠️ Instalação

```bash
# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm run dev

# Build para produção
npm run build

# Preview do build
npm run preview
```

## 📝 Scripts Disponíveis

- `npm run dev` - Inicia servidor de desenvolvimento (porta 8080)
- `npm run build` - Build para produção
- `npm run preview` - Preview do build de produção
- `npm run lint` - Executa o linter

## 🔧 Configuração

### Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
VITE_API_URL=http://localhost:8000
```

### Arquitetura

Consulte `docs/ARCHITECTURE.md` para detalhes sobre a arquitetura do projeto.

## 📚 Documentação

- **Arquitetura**: `docs/ARCHITECTURE.md`
- **Documentacao tecnica**: `docs/architecture.md`

## 🎨 Design System

O projeto utiliza um design system baseado em tokens CSS:
- Cores semânticas (primary, accent, success, warning, destructive)
- Tipografia (Sora para títulos, Inter para corpo)
- Componentes Shadcn/ui customizados

## 🔐 Autenticacao

O frontend consome o backend FastAPI com PostgreSQL (Supabase):
- **Signup**: `POST /api/v1/auth/register`
- **Login**: `POST /api/v1/auth/login`
- **Me**: `GET /api/v1/auth/me`

## 🧭 Rotas Principais

- `/` - Landing page
- `/demo` - Demo
- `/login` - Login
- `/dashboard` - Dashboard principal
- `/dashboard/upload` - Upload CSV
- `/dashboard/reports` - Relatorios
- `/dashboard/investimentos` - Ad Spends
- `/dashboard/settings` - Configuracoes
- `/dashboard/modules` - Modulos (em desenvolvimento)

## 📦 Features

- ✅ Landing page responsiva
- ✅ Autenticacao (Login/Signup)
- ✅ Dashboard interativo com KPIs e graficos
- ✅ Upload e processamento de CSV
- ✅ Filtros avancados (periodo, status, categoria, sub_id)
- ✅ Relatorios detalhados
- ✅ Gestao de investimentos (Ad Spends) + importacao em lote
- ✅ Cache local com Zustand + localStorage
- ✅ Sistema de modulos (em desenvolvimento)

## 🚧 Proximos Passos

- [ ] Integracao completa com backend
- [ ] Exportacao de relatorios (PDF/CSV)
- [ ] Multiplos datasets
- [ ] Sistema de pagamentos (Stripe)
- [ ] Integracoes via API (Hotmart, Eduzz, Kiwify, Monetizze)

## 📄 Licença

Proprietário - Todos os direitos reservados
