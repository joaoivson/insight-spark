# Arquitetura do Projeto

Este documento descreve a arquitetura do projeto, seguindo as melhores práticas de desenvolvimento frontend.

## 📁 Estrutura de Pastas

```
src/
├── app/                    # Configuração da aplicação
│   ├── providers/         # Providers globais (QueryClient, Theme, etc)
│   └── routes/            # Configuração de rotas
│
├── features/               # Features organizadas por domínio
│   ├── auth/              # Módulo de autenticação
│   │   ├── pages/         # Páginas (Login, Signup)
│   │   ├── services/      # Serviços de API
│   │   └── types/         # Tipos específicos do módulo
│   ├── dashboard/         # Módulo do dashboard
│   │   └── pages/         # Páginas do dashboard
│   └── landing/          # Landing page
│       └── pages/         # Página inicial
│
├── shared/                 # Código compartilhado
│   ├── components/        # Componentes reutilizáveis (UI)
│   ├── hooks/            # Hooks customizados
│   ├── lib/              # Utilitários
│   ├── types/            # Tipos compartilhados
│   ├── constants/        # Constantes
│   └── pages/            # Páginas compartilhadas (404, etc)
│
└── core/                  # Configurações core
    └── config/           # Configurações (API, App)
```

## 🏗️ Princípios da Arquitetura

### 1. Feature-Based Organization
Cada feature é auto-contida com seus próprios:
- Páginas
- Componentes específicos
- Serviços/API
- Tipos
- Hooks (se necessário)

### 2. Separação de Responsabilidades
- **app/**: Configuração e setup da aplicação
- **features/**: Lógica de negócio por domínio
- **shared/**: Código reutilizável entre features
- **core/**: Configurações fundamentais

### 3. Stores e Services
- **services/**: chamadas de API centralizadas por dominio
- **stores/**: Zustand stores por dominio (dataset, ad spends)
- Componentes nao chamam API diretamente; usam stores

### 4. Cache Local
- Zustand persiste dados em `localStorage` por usuario
- Chaves de cache: `dataset-cache:{userId}` e `adspends-cache:{userId}`
- Em erro de rede, o cache atual e preservado

### 3. Shared Resources
Componentes, hooks, utils e tipos compartilhados ficam em `shared/` para evitar duplicação.

## 📦 Estrutura de uma Feature

```
features/auth/
├── pages/
│   ├── Login.tsx
│   └── Signup.tsx
├── services/
│   ├── login.service.ts
│   ├── signup.service.ts
│   └── index.ts          # Barrel export
└── types/
    └── index.ts           # Tipos da feature
```

## 🔧 Configurações

### API Configuration
Localizado em `core/config/api.config.ts`:
- Base URL da API
- Endpoints
- Timeouts

### Services e Stores
Localizados em:
- `services/` (ex: `datasets.service.ts`, `adspends.service.ts`)
- `stores/` (ex: `datasetStore.ts`, `adSpendsStore.ts`)

### App Configuration
Localizado em `core/config/app.config.ts`:
- Nome da aplicação
- Rotas
- Chaves de storage

## 🎯 Convenções

### Nomenclatura
- **Componentes**: PascalCase (ex: `DashboardHeader.tsx`)
- **Hooks**: camelCase com prefixo `use` (ex: `useIsMobile.tsx`)
- **Services**: camelCase com sufixo `.service.ts` (ex: `login.service.ts`)
- **Types**: PascalCase (ex: `User`, `SignupData`)
- **Constants**: UPPER_SNAKE_CASE (ex: `API_CONFIG`)

### Imports
- Use path aliases (`@/`) para imports absolutos
- Organize imports: externos → internos → relativos
- Use barrel exports (`index.ts`) quando apropriado

### Storage
Use os utilitários de `shared/lib/storage.ts`:
```typescript
import { userStorage, tokenStorage } from '@/shared/lib/storage';

// Salvar
userStorage.set(user);
tokenStorage.set(token);

// Ler
const user = userStorage.get();
const token = tokenStorage.get();
```

## 🚀 Adicionando uma Nova Feature

1. Crie a pasta em `features/[feature-name]/`
2. Organize em subpastas: `pages/`, `components/`, `services/`, `types/`
3. Crie barrel exports (`index.ts`) para facilitar imports
4. Adicione rotas em `app/routes/app-routes.tsx`
5. Documente tipos e interfaces

## 📝 Exemplo de Uso

### Criando um novo serviço
```typescript
// features/users/services/user.service.ts
import { getApiUrl } from '@/core/config/api.config';

export const getUserService = async (id: string) => {
  const response = await fetch(getApiUrl(`/api/users/${id}`));
  return response.json();
};
```

### Criando um novo hook
```typescript
// shared/hooks/use-user.tsx
import { useState, useEffect } from 'react';
import { userStorage } from '@/shared/lib/storage';

export const useUser = () => {
  const [user, setUser] = useState(userStorage.get());
  
  // ... lógica do hook
  
  return { user, setUser };
};
```

## 🔍 Manutenção

- Mantenha features isoladas
- Evite dependências circulares
- Use TypeScript para type safety
- Documente tipos complexos
- Mantenha imports organizados

