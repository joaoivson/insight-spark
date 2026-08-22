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
 */
const ExclusaoDeDados = () => {
  const [params] = useSearchParams();
  const codigo = params.get("code");

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-6 px-6 py-16">
      <h1 className="text-2xl font-bold text-foreground">Exclusão de dados</h1>

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

      {codigo && (
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Código de confirmação</p>
          <p className="font-mono text-sm text-foreground">{codigo}</p>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Dúvidas sobre este pedido? Fale com o suporte informando o código acima.
      </p>
    </main>
  );
};

export default ExclusaoDeDados;
