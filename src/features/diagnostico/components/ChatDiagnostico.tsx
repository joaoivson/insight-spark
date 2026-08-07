// src/features/diagnostico/components/ChatDiagnostico.tsx
import { useState } from "react";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  enviarPergunta,
  type Diagnostico,
  type MensagemIA,
} from "@/services/ai-diagnostic.service";

const TETO_MENSAGENS = 20;

// mesmo racional do `paraArray` de RelatorioDiagnostico.tsx: `perguntas_sugeridas`
// vem de dentro do `relatorio`, que é json.loads cru da resposta da IA — o backend
// não valida o shape, só o prompt PEDE um array de strings. Se o modelo devolver
// null, omitir o campo, ou mandar outra coisa no lugar, um `?? []` não protege
// (o valor existe, só não é array) e o `.map` quebraria a tela inteira.
function paraArrayDeStrings(valor: unknown): string[] {
  return Array.isArray(valor) ? valor.filter((v): v is string => typeof v === "string") : [];
}

// status/detail são anexados ao Error pelo helper `json()` do serviço (Task 8)
// via cast — não fazem parte do tipo `Error` do JS, daí o tipo auxiliar aqui.
type ErroApi = Error & { status?: number; detail?: unknown };

// só o 402 (sem créditos) manda `detail` como objeto — o backend faz isso porque
// a tela precisa dos números (saldo/necessário) para orientar a aluna, não só de
// um texto solto. Os demais erros já chegam com a mensagem certa em `erro.message`
// (o helper `json()` usa `detail` como mensagem quando `detail` é string).
function mensagemDoErro(e: unknown): string {
  if (!(e instanceof Error)) return "Não foi possível responder agora.";
  const erro = e as ErroApi;
  if (erro.status === 402 && erro.detail && typeof erro.detail === "object") {
    const detalhe = erro.detail as { message?: unknown; saldo?: unknown; necessario?: unknown };
    if (typeof detalhe.message === "string") return detalhe.message;
    if (typeof detalhe.saldo === "number" && typeof detalhe.necessario === "number") {
      return `Créditos insuficientes: saldo ${detalhe.saldo}, necessário ${detalhe.necessario}.`;
    }
  }
  return erro.message;
}

export function ChatDiagnostico({
  diagnostico,
  onCreditoGasto,
}: {
  diagnostico: Diagnostico;
  onCreditoGasto: () => void;
}) {
  const [mensagens, setMensagens] = useState<MensagemIA[]>(diagnostico.mensagens || []);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const perguntasDaUsuaria = mensagens.filter((m) => m.papel === "user").length;
  const noLimite = perguntasDaUsuaria >= TETO_MENSAGENS;
  const sugeridas = paraArrayDeStrings(diagnostico.relatorio?.perguntas_sugeridas);

  const perguntar = async (pergunta: string) => {
    const limpo = pergunta.trim();
    if (!limpo || enviando || noLimite) return;
    setEnviando(true);
    setErro(null);
    const provisoria: MensagemIA = {
      id: Date.now(),
      papel: "user",
      conteudo: limpo,
    };
    setMensagens((m) => [...m, provisoria]);
    setTexto("");
    try {
      const resposta = await enviarPergunta(diagnostico.id, limpo);
      setMensagens((m) => [...m, resposta]);
      onCreditoGasto();
    } catch (e) {
      // desfaz a pergunta otimista: ela não foi gravada no servidor (a chamada
      // falhou), então mantê-la na tela enganaria a aluna — ao recarregar a
      // página a pergunta sumiria sem explicação, parecendo um bug.
      setMensagens((m) => m.filter((x) => x.id !== provisoria.id));
      setErro(mensagemDoErro(e));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Card className="nao-imprimir">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Perguntas sobre esta análise</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {mensagens.length === 0 && sugeridas.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {sugeridas.map((p) => (
              <Button
                key={p}
                size="sm"
                variant="outline"
                disabled={enviando}
                onClick={() => void perguntar(p)}
              >
                {p}
              </Button>
            ))}
          </div>
        )}

        <div className="space-y-3">
          {mensagens.map((m) => (
            <div
              key={m.id}
              className={m.papel === "user" ? "flex justify-end" : "flex justify-start"}
            >
              <div
                className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                  m.papel === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                }`}
              >
                {m.conteudo}
              </div>
            </div>
          ))}
          {enviando && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Analisando…
            </div>
          )}
        </div>

        {erro && <p className="text-sm text-destructive">{erro}</p>}

        {noLimite ? (
          <p className="text-sm text-muted-foreground">
            Esta conversa atingiu o limite de {TETO_MENSAGENS} perguntas. Gere um novo
            diagnóstico para continuar.
          </p>
        ) : (
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void perguntar(texto);
            }}
          >
            <Input
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Pergunte sobre esta análise…"
              disabled={enviando}
            />
            <Button type="submit" size="icon" disabled={enviando || !texto.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        )}
        <p className="text-xs text-muted-foreground">
          {perguntasDaUsuaria} de {TETO_MENSAGENS} perguntas · 1 crédito por pergunta
        </p>
      </CardContent>
    </Card>
  );
}
