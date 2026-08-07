import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, Loader2, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { parseDateOnly, todayKeyBR, addDaysKey } from "@/shared/lib/date";
import { mensagemDoErro } from "../lib/erro";
import { ChatDiagnostico } from "../components/ChatDiagnostico";
import { RelatorioDiagnostico } from "../components/RelatorioDiagnostico";
import {
  buscarDiagnostico,
  fetchSaldoIA,
  gerarDiagnostico,
  listarDiagnosticos,
  type Diagnostico,
  type DiagnosticoResumo,
  type SaldoIA,
} from "@/services/ai-diagnostic.service";

const ATALHOS = [
  { label: "7 dias", dias: 7 },
  { label: "14 dias", dias: 14 },
  { label: "30 dias", dias: 30 },
];

/**
 * Período do atalho, cortando no fim do dia anterior em Brasília.
 *
 * Mesmo critério do dashboard: o dia corrente ainda está incompleto, e incluí-lo
 * faria a análise comparar um dia pela metade com dias inteiros.
 */
function periodoDeDias(dias: number) {
  const fim = addDaysKey(todayKeyBR(), -1);
  return { inicio: addDaysKey(fim, -(dias - 1)), fim };
}

function formatarData(iso?: string | null) {
  return parseDateOnly(iso)?.toLocaleDateString("pt-BR") ?? iso ?? "—";
}

export default function DiagnosticoIAPage() {
  const [saldo, setSaldo] = useState<SaldoIA | null>(null);
  const [historico, setHistorico] = useState<DiagnosticoResumo[]>([]);
  const [atual, setAtual] = useState<Diagnostico | null>(null);
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [dias, setDias] = useState(7);

  const [saldoIndisponivel, setSaldoIndisponivel] = useState(false);

  // Gerar leva 5-15s. Nesse meio-tempo a aluna pode clicar no histórico, e a
  // resposta antiga chegaria depois, apagando da tela uma análise recém-paga.
  // Cada pedido leva um número; só o mais recente tem permissão de escrever.
  const pedidoAtual = useRef(0);
  const montado = useRef(true);
  useEffect(() => () => { montado.current = false; }, []);

  // print.css zera a altura de tudo fora do relatório. Sem essa marca no body
  // a regra valeria para o bundle inteiro e imprimir qualquer outra tela sairia
  // em branco — o CSS é global, não fica preso a esta página.
  useEffect(() => {
    document.body.classList.add("imprimir-diagnostico");
    return () => document.body.classList.remove("imprimir-diagnostico");
  }, []);

  const recarregarSaldo = () => {
    void fetchSaldoIA()
      .then((s) => {
        if (!montado.current) return;
        setSaldo(s);
        setSaldoIndisponivel(false);
      })
      .catch(() => montado.current && setSaldoIndisponivel(true));
  };

  const recarregarHistorico = () => {
    void listarDiagnosticos()
      .then((h) => montado.current && setHistorico(h))
      .catch(() => undefined);
  };

  useEffect(() => {
    recarregarSaldo();
    recarregarHistorico();
  }, []);

  /** Aplica a sessão só se este ainda for o pedido mais recente. */
  const aplicarSessao = (meuPedido: number, sessao: Diagnostico, msgErroPadrao: string) => {
    if (!montado.current || meuPedido !== pedidoAtual.current) return;
    setAtual(sessao);
    if (sessao.status === "erro") {
      setErro(sessao.erro_mensagem || msgErroPadrao);
    }
  };

  const gerar = async () => {
    const meuPedido = ++pedidoAtual.current;
    setGerando(true);
    setErro(null);
    try {
      const { inicio, fim } = periodoDeDias(dias);
      const sessao = await gerarDiagnostico(inicio, fim);
      // A sessão pode voltar com status "erro" mesmo em resposta 201: a IA
      // falhou, o backend gravou o estado e não cobrou crédito.
      aplicarSessao(meuPedido, sessao, "A análise não pôde ser concluída.");
    } catch (e) {
      if (montado.current && meuPedido === pedidoAtual.current) setErro(mensagemDoErro(e));
    } finally {
      if (montado.current) setGerando(false);
      // Fora do try: falha ao atualizar saldo ou histórico não pode virar
      // "erro na análise" — a análise já foi gerada e cobrada.
      recarregarSaldo();
      recarregarHistorico();
    }
  };

  const abrir = async (id: number) => {
    const meuPedido = ++pedidoAtual.current;
    setErro(null);
    try {
      const sessao = await buscarDiagnostico(id);
      aplicarSessao(meuPedido, sessao, "Esta análise falhou ao ser gerada.");
    } catch (e) {
      if (montado.current && meuPedido === pedidoAtual.current) setErro(mensagemDoErro(e));
    }
  };

  const custoGeracao = saldo?.custo_geracao ?? 10;
  const semCredito = !!saldo && saldo.saldo < custoGeracao;
  const iaIndisponivel = !!saldo && !saldo.disponivel;
  const pronto = atual?.status === "pronto" && !!atual.relatorio;

  return (
    <DashboardLayout>
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Diagnóstico IA</h1>
          <p className="text-sm text-muted-foreground">
            Uma análise da sua operação: o que escalar, o que pausar e por quê.
          </p>
        </div>
        {saldo && (
          <Badge variant="outline" className="tabular-nums">
            {saldo.saldo} de {saldo.cota} créditos
          </Badge>
        )}
      </div>

      <Card className="nao-imprimir">
        <CardContent className="flex flex-wrap items-center gap-3 pt-6">
          {ATALHOS.map((a) => (
            <Button
              key={a.dias}
              size="sm"
              variant={dias === a.dias ? "default" : "outline"}
              onClick={() => setDias(a.dias)}
              disabled={gerando}
            >
              {a.label}
            </Button>
          ))}
          <Button
            onClick={() => void gerar()}
            disabled={gerando || semCredito || iaIndisponivel || saldoIndisponivel}
          >
            {gerando ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                Analisando…
              </>
            ) : (
              <>
                <Sparkles className="mr-1.5 h-4 w-4" />
                Gerar análise ({custoGeracao} créditos)
              </>
            )}
          </Button>

          {saldoIndisponivel ? (
            <p className="text-sm text-muted-foreground">
              Não consegui carregar seu saldo de créditos. Recarregue a página.
            </p>
          ) : iaIndisponivel ? (
            <p className="text-sm text-muted-foreground">
              A análise por IA está indisponível no momento.
            </p>
          ) : semCredito ? (
            <p className="text-sm text-muted-foreground">
              Seus créditos acabaram neste mês.{" "}
              <Link className="underline" to="/dashboard/planos">
                Ver planos
              </Link>
            </p>
          ) : null}
        </CardContent>
      </Card>

      {erro && (
        <div className="nao-imprimir flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{erro}</span>
        </div>
      )}

      {pronto && atual && (
        <>
          <RelatorioDiagnostico diagnostico={atual} />
          {/* key força remontagem: o chat carrega o histórico só no mount, e sem
              isso abrir outra análise mostraria a conversa da anterior. */}
          <ChatDiagnostico
            key={atual.id}
            diagnostico={atual}
            onCreditoGasto={recarregarSaldo}
          />
        </>
      )}

      {/* Sem isto, análise em andamento ou sem relatório deixa a área em branco
          e a aluna não sabe se travou. */}
      {atual && !pronto && atual.status !== "erro" && (
        <Card className="nao-imprimir">
          <CardContent className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            {atual.status === "gerando" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Esta análise ainda está sendo gerada.
              </>
            ) : (
              "Esta análise não tem relatório disponível."
            )}
          </CardContent>
        </Card>
      )}

      {historico.length > 0 && (
        <Card className="nao-imprimir">
          <CardContent className="space-y-1 pt-6">
            <p className="mb-2 text-sm font-medium">Análises anteriores</p>
            {historico.map((h) => (
              <button
                key={h.id}
                onClick={() => void abrir(h.id)}
                disabled={gerando}
                className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent disabled:opacity-50 ${
                  atual?.id === h.id ? "bg-accent" : ""
                }`}
              >
                <span>
                  {formatarData(h.periodo_inicio)} a {formatarData(h.periodo_fim)}
                </span>
                <Badge variant={h.status === "pronto" ? "outline" : "secondary"}>
                  {h.status === "pronto" ? "pronta" : h.status}
                </Badge>
              </button>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
    </DashboardLayout>
  );
}
