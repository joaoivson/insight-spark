# Decisões, pendências e débitos — Frontend

> Mudança visível ao usuário vai no `CHANGELOG.md` da raiz. Aqui fica o
> **porquê** — o que o changelog não carrega.
>
> Decisão revogada **não some** — vira linha nova dizendo o que revogou.

## Decisões

| Data | Decisão | Por quê |
|---|---|---|
| — | **Componente nunca chama API direto**: `Components → stores → services → api.config` | O dia em que o header muda (auth, `X-User-Id`, retry de 401) é um arquivo, não trinta |
| — | **shadcn/ui em `components/ui/` não se modifica** — estende via wrapper | `npx shadcn add` sobrescreve o arquivo; customização feita dentro dele evapora sem aviso |
| — | **Tema dark é o padrão** e as cores saem das variáveis do tema | Cor hardcoded quebra no dia do tema claro e não aparece em review |
| — | **`isProductionHost()` compara host por igualdade exata**, nunca `.includes()` | `hml.marketdash.com.br` **contém** `marketdash.com.br` — `includes` classificaria homologação como produção e esconderia features do ambiente onde elas são testadas |
| 2026-08-11 | **Diagnóstico IA e aba WhatsApp ficam ocultos em produção** por `isProductionHost()` | Features em maturação: ficam disponíveis em hml para validação sem expor à base pagante |
| — | **`fetchWithAuth` injeta `user_id` como query param além do header** | Compatibilidade com endpoints antigos. **Consequência que virou regra do backend:** endpoint novo não pode usar `user_id` como nome de query param |
| — | **401 tenta renovar a sessão do Supabase UMA vez antes de deslogar** | Com requests paralelas, deslogar no primeiro 401 deixava a tela montar pela metade. Se a renovação falhar, desloga — sem dado falso |
| 2026-08-07 | **Stores usam stale-while-revalidate** (padrão do `adSpendsStore` replicado em `datasetStore` e `clicksStore`) | Sem revalidação, o cache em localStorage servia dado velho: celular e PC do mesmo usuário mostravam números diferentes |
| — | **KPI é calculado no frontend**, a partir das linhas cruas | Decisão herdada, não ideal — mas é o que a usuária vê. `get_kpis` do backend **não** alimenta o dashboard, e `cost`/`profit` de `dataset_rows_v2` estão mortos. Mudar o cálculo só no backend não muda nada na tela |
| — | **`Profit = Commission − Ad Spend`**, não `Revenue − Cost` | A afiliada não recebe a receita da venda, recebe a comissão |
| — | **Contagem de pedidos usa `order_id` distinto** | Venda com vários itens vira várias linhas no CSV |
| — | **Atalhos de período (Ontem/7d/14d/mês) cortam no fim do dia anterior em Brasília** — helpers `*BR` em `shared/lib/date.ts` | O corte em UTC fazia o painel virar o dia entre 21h e 0h BRT e a usuária via um período diferente do que pediu |
| — | **Comissão por canal usa o canal real dos cliques**, não o do pedido | Revoga a versão anterior que lia o canal do pedido |
| — | **Filtro de Categoria opera só no nível 1** | A hierarquia da Shopee é profunda demais para virar filtro útil |
| — | **Mobile é app-like**: bottom nav, `ResponsiveModal`, `DataCard`, tabela vira card | A usuária consulta pelo celular entre uma campanha e outra; tabela com scroll horizontal não se lê nessa situação |
| — | **Telas diretas e enxutas**, sem texto auxiliar decorativo | Texto explicativo só onde há consequência real (ação destrutiva, limite de plano). O resto vira ruído que ninguém lê |
| — | **Todo número alinhado à direita, com `tabular-nums`** | A usuária confere colunas contra o relatório da Shopee: casa decimal sob casa decimal faz a divergência saltar |
| 2026-08-19 | **Recarrega a página automaticamente quando um chunk dinâmico falha** | Aba aberta desde antes do deploy pedia um chunk que não existe mais e quebrava em branco |

## Pendências

| Prioridade | Item | Contexto | Status |
|---|---|---|---|
| Média | **Botão "Atualizar" do header é dead code** — os stores revalidam sozinhos desde a migração para SWR | Botão que não faz nada ensina o usuário a desconfiar da tela | Pendente — remover ou dar função |
| Média | **Badge de desconto do plano Pro** na página de vendas | Rodada da landing (11 seções em `features/landing/sales`) | Pendente |
| Baixa | **`CLAUDE.md` diz proxy → 8081; o `vite.config.ts` aponta para 8000** | Quem segue o doc não conecta no backend | Pendente — corrigir o doc |
| Baixa | **Dois `vite.config.ts.timestamp-*.mjs` versionados na raiz** | Artefato temporário do Vite | Pendente — apagar e ignorar |

## Débitos técnicos

| Item | Onde | Impacto | Plano |
|---|---|---|---|
| **Sem teste automatizado** | — | Playwright está no `package.json` mas não há suíte; toda verificação é manual | Validação por screenshot é obrigatória (`/validar-tela`) enquanto não houver |
| **Catálogo de planos duplicado** | `shared/lib/plans.ts` × `backend/app/core/plans.py` | Espelho manual: plano novo em um lado e não no outro dá gating divergente | Ao mexer em um, mexer no outro no mesmo commit |
| **`@typescript-eslint/no-explicit-any` é warn, não error** | `eslint.config.js` | `any` passa no lint | Não introduzir `any` novo; o legado fica |
