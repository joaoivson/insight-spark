# DashAds - Insight Spark

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

Consulte `src/ARCHITECTURE.md` para detalhes sobre a arquitetura do projeto.

## 📚 Documentação

- **Arquitetura**: `src/ARCHITECTURE.md`
- **Documentação Técnica**: `DOCUMENTATION.md`

## 🎨 Design System

O projeto utiliza um design system baseado em tokens CSS:
- Cores semânticas (primary, accent, success, warning, destructive)
- Tipografia (Sora para títulos, Inter para corpo)
- Componentes Shadcn/ui customizados

## 🔐 Autenticação

O sistema utiliza um microserviço Python com MongoDB Atlas para autenticação:
- **Signup**: `POST /api/users/signup`
- **Login**: `POST /api/users/login`

## 📦 Features

- ✅ Landing page responsiva
- ✅ Autenticação (Login/Signup)
- ✅ Dashboard interativo
- ✅ Upload e processamento de CSV
- ✅ Visualização de dados com gráficos
- ✅ Relatórios detalhados
- ✅ Sistema de módulos (em desenvolvimento)

## 🚧 Próximos Passos

- [ ] Integração com backend completo
- [ ] Sistema de pagamentos (Stripe)
- [ ] Módulos avançados de IA
- [ ] Integrações via API

## 📄 Licença

Proprietário - Todos os direitos reservados
