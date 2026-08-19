---
name: validar-tela
description: Validar visualmente uma mudanca do MarketDash com Playwright — screenshot em mobile e desktop, em todos os pontos afetados. Obrigatorio antes de dar tarefa de UI por concluida.
---

Valide o que a usuária vê. **Toda implementação que toca UI precisa de
screenshot em todos os pontos afetados** — não só na tela principal, e não só
no desktop.

Este projeto **não tem suíte de teste automatizada**. `tsc`, lint e build
passam com a tela quebrada. A imagem é a evidência.

## 1. Subir o ambiente

```bash
# backend (em marketdash-backend/)
docker-compose up -d          # app na 8000

# frontend
npm run dev                   # :8080, proxy /api → :8000
```

⚠️ **O CORS do backend só aceita `localhost:8080` e `localhost:5173`.**
Servir em outra porta dá erro que parece falha de autenticação e não é.

Credenciais: peça ao usuário ou use as do ambiente. **Não cole senha em
arquivo versionado.**

## 2. Mapear o que foi afetado

Liste as telas atingidas pela mudança. Mexeu em componente compartilhado
(`DataCard`, `ResponsiveModal`, gráfico, tabela)? **Toda tela que o usa entra
na lista.** Este é o passo que costuma ser pulado.

## 3. Capturar

Para cada tela da lista:

| Viewport | Tamanho |
|---|---|
| Desktop | ~1440×900 |
| Mobile | ~390×844 |

E os estados, não só o feliz: **carregando**, **vazio**, **erro**.

## 4. Interações

Abrir modal (virou drawer no mobile?), aplicar e **remover** filtro, trocar
período, paginar, ordenar coluna.

## 5. Conferir em cada imagem

- Número à direita, com `tabular-nums`
- **Nenhum "-1"** na tela (é a sentinela de ilimitado)
- **Nenhum "0/0"** onde o plano não tem o recurso (deve ser "—")
- Nada cortado: rótulo do último ponto do gráfico, célula colidindo, texto
  estourando card
- Mobile: página **não rola na horizontal**; número principal e filtro de
  período acima da dobra
- Filtro ativo como chip **nomeado e removível**
- Card que leva a uma lista abre a lista **já filtrada** pelo mesmo critério

## 6. Console

Erro de JS, warning de key do React e 4xx/5xx de rede contam como achado
mesmo com a tela bonita.

## 7. Reportar

Screenshots com legenda (tela · viewport · estado). Para cada achado: o
esperado, o que apareceu, em qual imagem.

**Não deu para validar?** Diga isso — explicitamente, e o motivo (sem
ambiente, sem credencial, sem browser). "Não validei" é informação; "está ok"
sem ver é o que já custou retrabalho aqui.
