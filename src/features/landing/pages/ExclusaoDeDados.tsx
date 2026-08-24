import { useSearchParams } from "react-router-dom";

/**
 * Página pública exigida pela Meta como destino da **Data deletion request URL**.
 *
 * A doc da Meta obriga o callback a devolver `{url, confirmation_code}` e que essa
 * URL dê ao usuário "uma explicação legível do status do pedido". Sem esta página,
 * o link do callback levava a 404 — motivo documentado de reprovação/remoção do
 * callback pela Meta.
 *
 * Rota pública: quem chega aqui acabou de remover o app e não está autenticado.
 *
 * O texto de confirmação depende do `?code`. Quem chega SEM código não veio da
 * Meta — é visitante avulso — e não pode ler "já processamos o pedido de exclusão
 * dos seus dados", que seria uma afirmação falsa sobre uma conta que talvez nem
 * exista. Sem código a página explica o que é e como pedir; a confirmação real só
 * aparece para quem traz o código do callback.
 */
const ExclusaoDeDados = () => {
  const [params] = useSearchParams();
  const codigo = params.get("code");

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-6 px-6 py-16">
      <h1 className="text-2xl font-bold text-foreground">Exclusão de dados</h1>

      {codigo ? (
        <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            Recebemos e <strong className="text-foreground">já processamos</strong> o pedido de
            exclusão dos dados da sua conta do Instagram no MarketDash.
          </p>
          <p>Foram removidos, de forma permanente:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>a conexão com o seu perfil do Instagram e o token de acesso;</li>
            <li>todas as automações de comentário → direct configuradas por você;</li>
            <li>o histórico de comentários capturados e mensagens enviadas.</li>
          </ul>
          <p>
            Não guardamos cópia desses dados. Suas campanhas, comissões e demais informações do
            MarketDash não fazem parte deste pedido e continuam na sua conta.
          </p>
        </div>
      ) : (
        <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            Esta página confirma pedidos de exclusão dos dados da conta do Instagram conectada ao
            MarketDash. Ela é aberta automaticamente quando você remove o MarketDash das suas
            configurações do Instagram, e traz o código de confirmação do pedido.
          </p>
          <p>
            Para pedir a exclusão, remova o MarketDash em{" "}
            <strong className="text-foreground">
              Instagram → Configurações → Apps e sites
            </strong>
            , ou fale com o suporte. Você também pode desconectar o Instagram a qualquer momento
            dentro do MarketDash, em Configurações.
          </p>
          <p>
            Suas campanhas, comissões e demais informações do MarketDash não fazem parte deste
            pedido e continuam na sua conta.
          </p>
        </div>
      )}

      {codigo && (
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Código de confirmação</p>
          <p className="font-mono text-sm text-foreground">{codigo}</p>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {codigo
          ? "Dúvidas sobre este pedido? Fale com o suporte informando o código acima."
          : "Dúvidas? Fale com o suporte."}
      </p>
    </main>
  );
};

export default ExclusaoDeDados;
