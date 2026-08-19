import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

import { completeInstagramOAuth } from "@/services/instagram.service";

/**
 * Retorno do Business Login for Instagram.
 *
 * Rota própria, não a de Configurações: o card do Facebook lê `?code` da URL de
 * Configurações e consumiria o code do Instagram por engano, quebrando as duas
 * conexões. Caminhos separados eliminam a ambiguidade sem tocar no fluxo do
 * Meta Ads, que já roda em produção.
 */

const IG_OAUTH_SUCCESS = "instagram_oauth_success";
const IG_OAUTH_ERROR = "instagram_oauth_error";
const VOLTAR_PARA = "/dashboard/configuracoes?tab=instagram";

const AutomacoesCallback = () => {
  const [mensagem, setMensagem] = useState("Concluindo a conexão com o Instagram…");
  // StrictMode monta o efeito duas vezes em dev e o code do OAuth é de uso
  // único — a segunda tentativa mostraria um erro que não existe.
  const jaProcessou = useRef(false);

  useEffect(() => {
    if (jaProcessou.current) return;
    jaProcessou.current = true;

    void (async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const erroOAuth = params.get("error_description") || params.get("error");
      const emPopup = !!window.opener && !window.opener.closed;
      const redirectUri = `${window.location.origin}${window.location.pathname}`;

      const finalizar = (tipo: string, message?: string) => {
        if (emPopup) {
          window.opener?.postMessage({ type: tipo, message }, window.location.origin);
          window.close();
          return;
        }
        window.location.replace(
          tipo === IG_OAUTH_ERROR ? `${VOLTAR_PARA}&ig_error=1` : VOLTAR_PARA,
        );
      };

      if (erroOAuth && !code) {
        setMensagem(erroOAuth);
        finalizar(IG_OAUTH_ERROR, erroOAuth);
        return;
      }
      if (!code) {
        finalizar(IG_OAUTH_ERROR, "Código de autorização não recebido.");
        return;
      }

      try {
        await completeInstagramOAuth(code, redirectUri);
        finalizar(IG_OAUTH_SUCCESS);
      } catch (e) {
        const message = (e as Error).message;
        setMensagem(message);
        finalizar(IG_OAUTH_ERROR, message);
      }
    })();
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      <p className="max-w-md text-sm text-muted-foreground">{mensagem}</p>
    </div>
  );
};

export default AutomacoesCallback;
