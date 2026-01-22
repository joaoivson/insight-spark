# GitHub Actions Workflows - Frontend

Este diretório contém os workflows do GitHub Actions para deploy automático do frontend MarketDash.

## Workflows Disponíveis

### 1. Deploy to Production (`deploy-production.yml`)

**Trigger**: Push para a branch `main`

**Processo**:
1. **Validação**: 
   - Executa linter (`npm run lint`)
   - Valida TypeScript (`tsc --noEmit`)
   - Testa build (`npm run build`)
   - Verifica artefatos de build
2. **Deploy**: 
   - Aciona webhook do Coolify para deploy em produção
   - Aplicação: `marketdash-frontend:main`
   - Domínio: `marketdash.com.br`

### 2. Deploy to Homologation (`deploy-homologation.yml`)

**Trigger**: Push para a branch `develop`

**Processo**:
1. **Validação**: 
   - Executa linter (`npm run lint`)
   - Valida TypeScript (`tsc --noEmit`)
   - Testa build (`npm run build`)
   - Verifica artefatos de build
2. **Deploy**: 
   - Aciona webhook do Coolify para deploy em homologação
   - Aplicação: `marketdash-frontend-hml`
   - Domínio: `hml.marketdash.com.br`

## Configuração de Secrets

Configure os seguintes secrets no GitHub:

1. Acesse: `https://github.com/joaoivson/marketdash-frontend/settings/secrets/actions`
2. Adicione:
   - **Name**: `COOLIFY_WEBHOOK_URL`
   - **Value**: `http://31.97.22.173:8000/webhooks/source/github/events/manual`
   - **Name**: `VITE_API_URL` (opcional, usado apenas para build de teste)
     - **Value para produção**: `https://api.marketdash.com.br`
     - **Value para homologação**: `https://api.hml.marketdash.com.br`

## Validações Implementadas

- ✅ Linter (`npm run lint`)
- ✅ Validação TypeScript (`tsc --noEmit`)
- ✅ Teste de build (`npm run build`)
- ✅ Verificação de artefatos de build (diretório `dist`)

## Próximas Melhorias

- [ ] Adicionar testes unitários com Vitest ou Jest
- [ ] Adicionar testes E2E com Playwright
- [ ] Adicionar verificação de dependências vulneráveis (`npm audit`)
- [ ] Adicionar análise de bundle size
- [ ] Adicionar notificações (Slack, Discord, Email)

## Troubleshooting

### Workflow não executa

- Verifique se o push foi feito para a branch correta (`main` ou `develop`)
- Verifique se os arquivos modificados não estão em `paths-ignore`

### Validação falha

- **Linter falha**: Execute `npm run lint` localmente e corrija os erros
- **TypeScript falha**: Execute `npx tsc --noEmit` localmente e corrija os erros
- **Build falha**: Execute `npm run build` localmente e verifique os erros

### Deploy não é acionado

- Verifique se o secret `COOLIFY_WEBHOOK_URL` está configurado corretamente
- Verifique se o Coolify está acessível e funcionando
- Verifique os logs do job `deploy` para identificar erros

## Variáveis de Ambiente

O build do frontend requer a variável `VITE_API_URL` para funcionar corretamente. No workflow, usamos valores padrão baseados no ambiente:

- **Produção**: `https://api.marketdash.com.br`
- **Homologação**: `https://api.hml.marketdash.com.br`

Você pode configurar um secret `VITE_API_URL` no GitHub para sobrescrever esses valores.

## Referências

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Coolify Documentation](https://coolify.io/docs)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [WEBHOOKS_SSL_CONFIG.md](../../WEBHOOKS_SSL_CONFIG.md)
