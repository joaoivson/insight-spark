## Visão Geral

Aplicação React + Vite com foco em dashboard de desempenho. O estado global e o cache são centralizados em Zustand com persistência em `localStorage`. Componentes não chamam API diretamente; todos os acessos passam por serviços e stores.

## Estrutura de Pastas (principal)

```
src/
├─ components/           # UI compartilhada e widgets de dashboard
├─ features/             # Páginas e fluxos por domínio (dashboard, reports, upload, auth)
├─ services/             # Chamadas de API centralizadas por domínio
├─ stores/               # Zustand stores por domínio
├─ utils/                # Utilitários (ex.: storage seguro)
├─ shared/types/         # Tipos compartilhados (ex.: AdSpend)
└─ core/config/          # Configurações de ambiente/API
```

## Stores (Zustand)

### `useDatasetStore`
- **Estado**: `rows`, `loading`, `error`, `hydrated`, `lastUpdated`
- **Ações**: `fetchRows({ range?, force?, includeRawData?, limit?, offset? })`, `invalidate()`
- **Cache**: lê/grava em `localStorage` com chave `dataset-cache:{userId}`. Na primeira carga tenta cache; se vazio ou `force`, chama API e persiste. Se API retornar vazio, preserva cache existente.

### `useAdSpendsStore`
- **Estado**: `adSpends`, `loading`, `error`, `hydrated`, `lastUpdated`
- **Ações**: `fetchAdSpends({ range?, force? })`, `create(payload)`, `update(id,payload)`, `remove(id)`, `invalidate()`
- **Cache**: chave `adspends-cache:{userId}`, mesmo fluxo de hidratação do dataset.

## Services

- `services/datasets.service.ts`: `fetchDatasetRows(query)` → `/api/datasets/all/rows`
- `services/adspends.service.ts`: `listAdSpends`, `createAdSpend`, `updateAdSpend`, `deleteAdSpend` → `/api/ad_spends`

Todos usam `getApiUrl` e lançam erro se a resposta não for OK.

## Fluxo de Dados (API → LocalStorage → Zustand → UI)
1) Componentes chamam ações do store (ex.: `fetchRows`).
2) Store tenta hidratar do `localStorage`. Se existir, preenche o estado e evita chamada de rede.
3) Se não houver cache ou `force=true`, store chama o service de API.
4) Resposta da API atualiza o estado do store e regrava o cache.
5) Componentes assinam o estado do store e reagem automaticamente.
6) Em operações de create/update/delete, o store chama a API, refaz o fetch (`force`) e persiste o novo cache.

## Boas Práticas Adotadas
- Componentes sem chamadas diretas a API.
- Stores pequenos e focados por domínio.
- Cache defensivo: não sobrescreve com payload vazio; preserva dados existentes em caso de erro.
- Tipagem forte para payloads e entidades (`shared/types`).
- Loaders consistentes nas telas para qualquer espera de API.
- Remoção de componentes/hooks não utilizados (ex.: `AdSpendDialog`, `useDatasetRows`).

## Páginas principais
- `Dashboard`: consome `useDatasetStore` e `useAdSpendsStore`; filtros acionam `fetchRows`/`fetchAdSpends` com `force`.
- `Reports`: carrega dados via `useDatasetStore` e filtra localmente.
- `AdSpends`: CRUD e importação de investimentos via `useAdSpendsStore`; opções de Sub ID derivam de `useDatasetStore`.
- `UploadCSV`: envia CSV, invalida cache do dataset e refaz fetch com `includeRawData`.

## Estratégia de Cache
- Chaves por usuário (`dataset-cache:{user}`, `adspends-cache:{user}`).
- Hidratação síncrona no primeiro acesso a cada store.
- Atualização de cache sempre que o store é atualizado.
- Em erros de rede, mantém o cache atual para evitar tela vazia.

## Manutenção e Evolução
- Para novos domínios, crie um service dedicado + store específico + tipos em `shared/types`.
- Componentes devem depender apenas de stores e nunca de serviços diretamente.
- Ao adicionar campos novos, atualize tipos, services e stores; o cache continuará funcionando.
- Estilos: manter coesão usando classes utilitárias existentes ou módulos por página quando precisar de escopo.
