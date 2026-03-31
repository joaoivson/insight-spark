# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Dev server on :8080, proxies /api → localhost:8081
npm run build        # Production build
npm run lint         # ESLint
npx tsc --noEmit     # Type check without emitting
```

## Architecture

Feature-based organization with Zustand for state management.

```
src/
├── app/
│   ├── routes/              # Route definitions (React Router)
│   └── providers/           # React context providers
├── features/                # Self-contained feature modules
│   ├── auth/                # Login, signup, password reset
│   ├── dashboard/
│   │   ├── pages/           # CapturaSite, Dashboard, Investimentos, etc.
│   │   └── components/      # Feature-specific components
│   ├── admin/               # Admin panel
│   ├── landing/             # Public landing page
│   └── subscription/        # Plan management
├── components/
│   ├── ui/                  # shadcn/ui primitives (do NOT modify directly)
│   ├── dashboard/           # Dashboard layout (DashboardLayout, Sidebar)
│   └── shared/              # Reusable business components
├── services/                # API service functions (*.service.ts)
├── stores/                  # Zustand state stores
├── hooks/                   # Custom hooks (queries/ for React Query)
├── core/config/             # api.config.ts (VITE_API_URL, base URL logic)
└── shared/                  # types/, utils/, constants/, styles/
```

## State & Data Flow

`Components` → `Zustand stores` → `services/*.service.ts` → `core/config/api.config.ts`

- Components never call API directly
- Zustand stores manage global state (dataset, ad spends, user)
- React Query for server state in `hooks/queries/`
- localStorage cache: `dataset-cache:{userId}`, `adspends-cache:{userId}`

## API Configuration

- `VITE_API_URL` in `.env` sets the backend URL
- Vite proxy in `vite.config.ts` forwards `/api` → backend in dev
- Auth token from Supabase SDK sent as `Authorization: Bearer`
- Base config: `core/config/api.config.ts`

## UI Patterns

- Use shadcn/ui components from `components/ui/` — extend via wrappers, don't modify originals
- Tailwind for all styling — inline styles only for dynamic values (colors from data)
- Dark theme is default
- Responsive: mobile-first (`sm:`, `md:`, `lg:`)
- Toasts via `useToast()` hook
- Add new shadcn components: `npx shadcn-ui@latest add [component-name]`

## Key Routes

- `/login` — Supabase Auth login
- `/dashboard` — Main analytics
- `/dashboard/captura-site` — Capture site builder
- `/dashboard/investimentos` — Ad spend management
- `/c/{slug}` — Public capture site (no auth)

## Conventions

- Components: `PascalCase.tsx` | Services: `snake_case.service.ts` | Hooks: `use-kebab-case.ts`
- Types: `PascalCase` | Constants: `UPPER_SNAKE_CASE`
- Always use `@/` alias for imports
- ESLint: `@typescript-eslint/no-explicit-any` is warn (not error)

## Adding a new feature page

1. Create page component in `features/{feature}/pages/`
2. Create service in `services/{feature}.service.ts`
3. Add route in `app/routes/`
4. Add sidebar navigation entry in `components/dashboard/`

## Testes e Verificação

```bash
npm run lint                # ESLint
npx tsc --noEmit            # Type check
npm run build               # Build completo (valida tudo)
```

Padrões:
- Type check antes de PR: `npx tsc --noEmit`
- Lint deve passar sem erros (warnings de `any` são tolerados)
- Testar responsividade em mobile e desktop

## Troubleshooting

| Problema | Causa provável | Solução |
|----------|---------------|---------|
| `VITE_API_URL` undefined | `.env` não configurado | Criar `.env` com `VITE_API_URL=http://localhost:8081` |
| Proxy error 502 | Backend não rodando | Iniciar uvicorn na porta 8081 |
| Import `@/` não resolve | Alias não configurado | Verificar `tsconfig.app.json` paths |
| shadcn component missing | Não instalado | `npx shadcn-ui@latest add [nome]` |
| Zustand state stale | Cache localStorage | Limpar `dataset-cache:{userId}` no DevTools |
