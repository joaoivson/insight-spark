import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Loader2, Plus, Smartphone } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ResponsiveModal } from "@/components/shared/ResponsiveModal";
import { ConviteConexaoModal } from "@/components/whatsapp/ConviteConexaoModal";
import { DispositivoCard } from "@/components/whatsapp/DispositivoCard";
import { GerenciarDispositivoModal } from "@/components/whatsapp/GerenciarDispositivoModal";
import { GruposDoDispositivo } from "@/components/whatsapp/GruposDoDispositivo";
import { useToast } from "@/hooks/use-toast";
import { usePlanStore } from "@/stores/planStore";
import type { PlanContext } from "@/services/plan.service";
import { useWhatsappConexoesStore } from "@/stores/whatsappConexoesStore";
import {
  qrDaInstancia,
  type InstanciaConexao,
  type QrInstancia,
} from "@/services/whatsapp_conexoes.service";
import { isUnlimited, planLimit } from "@/shared/lib/plans";

/** Pareamento é interativo — 5s mantém o QR vivo sem martelar a API. */
const POLL_QR_MS = 5_000;

export function NumerosSection() {
  const { toast } = useToast();
  const { context, plan, loaded: planLoaded, fetch: fetchPlan } = usePlanStore();
  const {
    instancias,
    grupos,
    loaded,
    loading,
    error,
    fetch,
    criar,
    remover,
    sincronizar,
    definirPausa,
  } = useWhatsappConexoesStore();

  const montado = useRef(true);
  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
    };
  }, []);

  useEffect(() => {
    void fetchPlan();
  }, [fetchPlan]);

  // O contrato do plano ainda não expõe os campos de WhatsApp no tipo — lê com
  // fallback para o catálogo local (espelho de app/core/plans.py).
  type ContextoComWhatsapp = PlanContext & {
    limites_whatsapp_numeros?: number;
    limites: PlanContext["limites"] & { whatsapp_numeros?: number };
  };
  const ctxWhatsapp = context as ContextoComWhatsapp | null;
  const limite =
    ctxWhatsapp?.limites_whatsapp_numeros ??
    ctxWhatsapp?.limites?.whatsapp_numeros ??
    planLimit(plan, "whatsapp_numeros");
  const temRecurso = limite !== 0;

  useEffect(() => {
    if (temRecurso) void fetch();
  }, [temRecurso, fetch]);

  // ── Criação ────────────────────────────────────────────────────────────────
  const [modalCriar, setModalCriar] = useState(false);
  const [nome, setNome] = useState("");
  const [criando, setCriando] = useState(false);

  // ── QR / pareamento ───────────────────────────────────────────────────────
  const [qrAlvo, setQrAlvo] = useState<InstanciaConexao | null>(null);
  const [qr, setQr] = useState<QrInstancia | null>(null);

  useEffect(() => {
    if (!qrAlvo) return;
    let ativo = true;
    const consultar = async () => {
      try {
        const r = await qrDaInstancia(qrAlvo.id);
        if (!ativo || !montado.current) return;
        setQr(r);
        if (r.estado === "conectada") {
          toast({ title: "Número conectado" });
          setQrAlvo(null);
          void fetch({ force: true });
        }
      } catch {
        if (ativo && montado.current) setQr({ estado: "erro: falha na consulta", qrcode: null });
      }
    };
    setQr(null);
    void consultar();
    const id = setInterval(() => void consultar(), POLL_QR_MS);
    return () => {
      ativo = false;
      clearInterval(id);
    };
  }, [qrAlvo, fetch, toast]);

  // ── Link de conexão externa (item 18) ─────────────────────────────────────
  const [conviteAlvo, setConviteAlvo] = useState<InstanciaConexao | null>(null);

  // ── Gerenciar / sincronizar / remover ─────────────────────────────────────
  const [gerenciarAlvo, setGerenciarAlvo] = useState<InstanciaConexao | null>(null);
  const [sincronizandoId, setSincronizandoId] = useState<number | null>(null);
  const [paraRemover, setParaRemover] = useState<InstanciaConexao | null>(null);
  const [removendo, setRemovendo] = useState(false);

  const confirmarCriacao = async () => {
    setCriando(true);
    try {
      const instancia = await criar(nome.trim() || undefined);
      if (!montado.current) return;
      setModalCriar(false);
      setNome("");
      setQrAlvo(instancia);
    } catch (e) {
      toast({
        title: e instanceof Error ? e.message : "Não foi possível criar o número.",
        variant: "destructive",
      });
    } finally {
      if (montado.current) setCriando(false);
    }
  };

  const sincronizarInstancia = async (instancia: InstanciaConexao) => {
    setSincronizandoId(instancia.id);
    try {
      const r = await sincronizar(instancia.id);
      // `ignorados` só aparece quando existe: é sintoma de formato novo do
      // WhatsApp, e some da tela no caminho feliz.
      toast({
        title: `${r.vistos} grupos, ${r.novos} novos`,
        description: r.ignorados
          ? `${r.ignorados} não reconhecidos — avise o suporte`
          : undefined,
      });
    } catch (e) {
      toast({
        title: e instanceof Error ? e.message : "Não foi possível sincronizar os grupos.",
        variant: "destructive",
      });
    } finally {
      if (montado.current) setSincronizandoId(null);
    }
  };

  const alternarPausa = async (instancia: InstanciaConexao, pausado: boolean) => {
    try {
      await definirPausa(instancia.id, pausado);
      toast({ title: pausado ? "Envio pausado neste número" : "Envio retomado" });
    } catch (e) {
      toast({
        title: e instanceof Error ? e.message : "Não foi possível alterar o envio.",
        variant: "destructive",
      });
    }
  };

  const confirmarRemocao = async () => {
    if (!paraRemover) return;
    setRemovendo(true);
    try {
      await remover(paraRemover.id);
      toast({ title: "Número removido" });
    } catch (e) {
      toast({
        title: e instanceof Error ? e.message : "Não foi possível remover o número.",
        variant: "destructive",
      });
    } finally {
      if (montado.current) {
        setRemovendo(false);
        setParaRemover(null);
      }
    }
  };

  /**
   * Grupos por dispositivo + o que sobrou.
   *
   * O vínculo grupo↔número é N:N: o mesmo grupo pode estar em dois chips (é o
   * desenho — o motor faz failover entre eles) e por isso aparece nos dois
   * blocos, marcado com "também em".
   *
   * O bucket órfão existe porque remover um número é soft-delete: o vínculo
   * histórico continua no banco e, sem ele, os grupos sumiriam da tela sem
   * explicação.
   */
  const { porInstancia, orfaos } = useMemo(() => {
    const ids = new Set(instancias.map((i) => i.id));
    const mapa = new Map<number, typeof grupos>();
    instancias.forEach((i) => mapa.set(i.id, []));
    const sobra: typeof grupos = [];
    grupos.forEach((g) => {
      const donos = g.instancia_ids.filter((id) => ids.has(id));
      if (donos.length === 0) {
        sobra.push(g);
        return;
      }
      donos.forEach((id) => mapa.get(id)!.push(g));
    });
    return { porInstancia: mapa, orfaos: sobra };
  }, [instancias, grupos]);

  const atingiuLimite = !isUnlimited(limite) && instancias.length >= limite;
  const contador = isUnlimited(limite) ? "" : ` (${instancias.length}/${limite})`;

  const shell = (children: ReactNode) => (
    <div className="bg-card border border-border rounded-2xl p-5 md:p-6">
      <div className="flex items-start gap-3 md:gap-4 mb-5">
        <div className="w-11 h-11 md:w-12 md:h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
          <Smartphone className="w-6 h-6 text-emerald-500" />
        </div>
        <div className="min-w-0">
          <h3 className="text-lg font-bold text-foreground">Números</h3>
          <p className="text-sm text-muted-foreground">
            Conecte dispositivos por QR code e sincronize os grupos deles.
          </p>
        </div>
      </div>
      {children}
    </div>
  );

  if (!planLoaded) {
    return shell(
      <div className="space-y-3">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-20 w-full rounded-xl" />
      </div>,
    );
  }

  if (!temRecurso) {
    return shell(
      <div className="rounded-xl border border-dashed border-border p-6 text-center space-y-3">
        <p className="text-sm text-muted-foreground">
          Dispositivos fazem parte do plano MAX.
        </p>
        <Button asChild>
          <Link to="/dashboard/planos">Ver planos</Link>
        </Button>
      </div>,
    );
  }

  if (loading && !loaded) {
    return shell(
      <div className="space-y-3">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>,
    );
  }

  if (error) {
    return shell(
      <div className="space-y-3 py-2">
        <p className="text-sm text-destructive">{error}</p>
        <Button variant="outline" size="sm" onClick={() => void fetch({ force: true })}>
          Tentar novamente
        </Button>
      </div>,
    );
  }

  return shell(
    <div className="space-y-4">
      {instancias.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-6 text-center space-y-3">
          <p className="text-sm text-muted-foreground">Nenhum número conectado ainda.</p>
          <Button onClick={() => setModalCriar(true)} disabled={atingiuLimite}>
            <Plus className="h-4 w-4 mr-1.5" />
            Conectar número{contador}
          </Button>
        </div>
      ) : (
        <>
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setModalCriar(true)} disabled={atingiuLimite}>
              <Plus className="h-4 w-4 mr-1.5" />
              Conectar número{contador}
            </Button>
          </div>

          <div className="space-y-4">
            {instancias.map((i) => (
              <DispositivoCard
                key={i.id}
                instancia={i}
                grupos={porInstancia.get(i.id) ?? []}
                instancias={instancias}
                sincronizando={sincronizandoId === i.id}
                onSincronizar={(x) => void sincronizarInstancia(x)}
                onConectar={setQrAlvo}
                onConectarPorLink={setConviteAlvo}
                onGerenciar={setGerenciarAlvo}
                onRemover={setParaRemover}
                onAlternarPausa={(x, pausado) => void alternarPausa(x, pausado)}
              />
            ))}
          </div>
        </>
      )}

      {atingiuLimite && (
        <p className="text-xs text-muted-foreground">
          Limite de {limite} números do plano atingido.
        </p>
      )}

      {orfaos.length > 0 && (
        <div className="rounded-xl border border-dashed border-border p-4 space-y-3">
          <div>
            <h4 className="text-sm font-bold text-foreground">Grupos sem dispositivo ativo</h4>
            <p className="text-xs text-muted-foreground">
              O número que trouxe estes grupos foi removido. Conecte-o de novo para voltar a
              enviar neles.
            </p>
          </div>
          <GruposDoDispositivo grupos={orfaos} instancias={instancias} instanciaId={null} />
        </div>
      )}

      <ResponsiveModal
        open={modalCriar}
        onOpenChange={(o) => {
          setModalCriar(o);
          if (!o) setNome("");
        }}
        title="Conectar número"
      >
        <div className="space-y-4 pb-2">
          <div className="space-y-2">
            <Label htmlFor="nome-numero">Nome do número (opcional)</Label>
            <Input
              id="nome-numero"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Principal"
              maxLength={60}
            />
          </div>
          <Button className="w-full" onClick={() => void confirmarCriacao()} disabled={criando}>
            {criando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Gerar QR code
          </Button>
        </div>
      </ResponsiveModal>

      <ResponsiveModal
        open={!!qrAlvo}
        onOpenChange={(o) => {
          if (!o) setQrAlvo(null);
        }}
        title="Conectar número"
        description="No celular: WhatsApp → Aparelhos conectados → Conectar aparelho."
      >
        <div className="space-y-4 pb-2">
          <div className="flex justify-center">
            {qr?.qrcode ? (
              <img
                src={qr.qrcode}
                alt="QR code para conectar o WhatsApp"
                className="h-64 w-64 rounded-lg bg-white p-2"
              />
            ) : qr && qr.estado.startsWith("erro") ? (
              <p className="py-10 text-center text-sm text-destructive">
                Não foi possível gerar o QR code agora. Aguarde — tentamos de novo sozinhos.
              </p>
            ) : (
              <div className="flex h-64 w-64 items-center justify-center rounded-lg border border-dashed border-border">
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Gerando o QR code…
                </span>
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            O envio é feito pelo seu número. Uso excessivo pode levar o WhatsApp a restringi-lo —
            respeite os limites do painel.
          </p>
        </div>
      </ResponsiveModal>

      <GerenciarDispositivoModal
        instancia={gerenciarAlvo}
        totalDeGrupos={gerenciarAlvo ? (porInstancia.get(gerenciarAlvo.id)?.length ?? 0) : 0}
        onOpenChange={(o) => {
          if (!o) setGerenciarAlvo(null);
        }}
        onConectarPorLink={(i) => {
          setGerenciarAlvo(null);
          setConviteAlvo(i);
        }}
        onRemover={(i) => {
          setGerenciarAlvo(null);
          setParaRemover(i);
        }}
      />

      <ConviteConexaoModal
        instancia={conviteAlvo}
        onOpenChange={(o) => {
          if (!o) setConviteAlvo(null);
        }}
      />

      <AlertDialog open={!!paraRemover} onOpenChange={(o) => !o && setParaRemover(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Remover {paraRemover?.nome_exibicao || paraRemover?.numero_mascarado || "número"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              O número é desconectado e os grupos dele deixam de sincronizar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removendo}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={removendo}
              onClick={(e) => {
                e.preventDefault();
                void confirmarRemocao();
              }}
            >
              {removendo && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>,
  );
}
