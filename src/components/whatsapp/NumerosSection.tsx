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
import { SecaoCard } from "@/components/shared/SecaoCard";
import { ConviteConexaoModal } from "@/components/whatsapp/ConviteConexaoModal";
import { DispositivoCard } from "@/components/whatsapp/DispositivoCard";
import { GerenciarDispositivoModal } from "@/components/whatsapp/GerenciarDispositivoModal";
import { TabelaDeGrupos } from "@/components/whatsapp/TabelaDeGrupos";
import { useToast } from "@/hooks/use-toast";
import { usePlanStore } from "@/stores/planStore";
import { useWhatsappConexoesStore } from "@/stores/whatsappConexoesStore";
import {
  qrDaInstancia,
  type GrupoWhatsapp,
  type InstanciaConexao,
  type QrInstancia,
} from "@/services/whatsapp_conexoes.service";
import { mensagemAmigavel } from "@/services/http-error";
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
    definirPausa,
    definirAtivado,
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

  const limite =
    context?.limites_whatsapp_numeros ??
    context?.limites?.whatsapp_numeros ??
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

  // ── Gerenciar / remover ───────────────────────────────────────────────────
  const [gerenciarAlvo, setGerenciarAlvo] = useState<InstanciaConexao | null>(null);
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

  /** Toggle "Ativo" do bloco de grupos sem dispositivo (spec §6.3). */
  const alternarAtivado = async (grupo: GrupoWhatsapp, ativado: boolean) => {
    try {
      await definirAtivado(grupo.id, ativado);
    } catch (e) {
      // O 403 de limite vem com a mensagem pronta do backend; o resto vira
      // frase fixa — mensagem técnica nunca chega à tela.
      toast({
        title: mensagemAmigavel(e, "Não foi possível alterar o grupo."),
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
   * Contagem de grupos por dispositivo + o que sobrou.
   *
   * O vínculo grupo↔número é N:N: o mesmo grupo pode estar em dois chips (é o
   * desenho — o motor faz failover entre eles) e por isso conta nos dois.
   *
   * O bucket órfão existe porque remover um número é soft-delete: o vínculo
   * histórico continua no banco e, sem ele, os grupos sumiriam da tela sem
   * explicação.
   */
  const { contagem, orfaos } = useMemo(() => {
    const ids = new Set(instancias.map((i) => i.id));
    const mapa = new Map<number, number>();
    instancias.forEach((i) => mapa.set(i.id, 0));
    const sobra: GrupoWhatsapp[] = [];
    grupos.forEach((g) => {
      const donos = g.instancia_ids.filter((id) => ids.has(id));
      if (donos.length === 0) {
        sobra.push(g);
        return;
      }
      donos.forEach((id) => mapa.set(id, (mapa.get(id) ?? 0) + 1));
    });
    return { contagem: mapa, orfaos: sobra };
  }, [instancias, grupos]);

  const atingiuLimite = !isUnlimited(limite) && instancias.length >= limite;
  const contador = isUnlimited(limite) ? "" : ` (${instancias.length}/${limite})`;

  // Consequência real (limite de plano) fica visível junto ao botão — no MAX
  // não há tier acima, então só a explicação, sem link de upgrade.
  const explicacaoDoLimite = atingiuLimite && (
    <p className="text-xs text-muted-foreground">
      Limite de <span className="tabular-nums">{limite}</span> números do plano atingido.
      {plan !== "max" && (
        <>
          {" "}
          <Link to="/dashboard/planos" className="text-primary hover:underline">
            Fazer upgrade
          </Link>
        </>
      )}
    </p>
  );

  const shell = (children: ReactNode) => (
    <SecaoCard
      icon={<Smartphone className="w-5 h-5 text-emerald-500" />}
      iconBoxClassName="bg-emerald-500/10"
      title="Números"
      description="Conecte dispositivos por QR code e sincronize os grupos deles."
    >
      {children}
    </SecaoCard>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <Skeleton className="h-36 w-full rounded-xl" />
          <Skeleton className="h-36 w-full rounded-xl" />
          <Skeleton className="h-36 w-full rounded-xl" />
        </div>
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
          <div className="flex flex-col items-center gap-1.5">
            <Button onClick={() => setModalCriar(true)} disabled={atingiuLimite}>
              <Plus className="h-4 w-4 mr-1.5" />
              Conectar número{contador}
            </Button>
            {explicacaoDoLimite}
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-col items-end gap-1.5">
            <Button size="sm" onClick={() => setModalCriar(true)} disabled={atingiuLimite}>
              <Plus className="h-4 w-4 mr-1.5" />
              Conectar número{contador}
            </Button>
            {explicacaoDoLimite}
          </div>

          {/* Grid compacto (spec §6.1): a lista de grupos saiu do card — o
              corpo dele navega para a página do número. */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {instancias.map((i) => (
              <DispositivoCard
                key={i.id}
                instancia={i}
                totalDeGrupos={contagem.get(i.id) ?? 0}
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

      {orfaos.length > 0 && (
        <div className="rounded-xl border border-dashed border-border p-4 space-y-3">
          <div>
            <h4 className="text-sm font-bold text-foreground">Grupos sem dispositivo ativo</h4>
            <p className="text-xs text-muted-foreground">
              O número que trouxe estes grupos foi removido. Conecte-o de novo para voltar a
              enviar neles.
            </p>
          </div>
          <TabelaDeGrupos
            grupos={orfaos}
            onAlternarAtivado={(g, ativado) => void alternarAtivado(g, ativado)}
          />
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
        totalDeGrupos={gerenciarAlvo ? (contagem.get(gerenciarAlvo.id) ?? 0) : 0}
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
