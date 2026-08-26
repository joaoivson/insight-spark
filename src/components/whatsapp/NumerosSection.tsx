import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Loader2, Plus, QrCode, RefreshCw, Smartphone, Trash2 } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataCard } from "@/components/shared/DataCard";
import { ResponsiveModal } from "@/components/shared/ResponsiveModal";
import { useToast } from "@/hooks/use-toast";
import { usePlanStore } from "@/stores/planStore";
import type { PlanContext } from "@/services/plan.service";
import { useWhatsappConexoesStore } from "@/stores/whatsappConexoesStore";
import {
  qrDaInstancia,
  type InstanciaConexao,
  type QrInstancia,
  type StatusInstancia,
} from "@/services/whatsapp_conexoes.service";
import { isUnlimited, planLimit } from "@/shared/lib/plans";
import { rotuloDoGrupo } from "@/shared/lib/grupo";

/** Pareamento é interativo — 5s mantém o QR vivo sem martelar a API. */
const POLL_QR_MS = 5_000;

function StatusBadge({ status }: { status: StatusInstancia }) {
  if (status === "conectada") {
    return (
      <Badge className="border-emerald-500/25 bg-emerald-500/10 text-emerald-500">Conectado</Badge>
    );
  }
  if (status === "desconectada") {
    return <Badge variant="destructive">Desconectado</Badge>;
  }
  return <Badge variant="secondary">Aguardando conexão</Badge>;
}

const BadgeEnvioOk = () => (
  <Badge className="border-emerald-500/25 bg-emerald-500/10 text-emerald-500">ok</Badge>
);

export function NumerosSection() {
  const { toast } = useToast();
  const { context, plan, loaded: planLoaded, fetch: fetchPlan } = usePlanStore();
  const { instancias, grupos, loaded, loading, error, fetch, criar, remover, sincronizar } =
    useWhatsappConexoesStore();

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

  // ── Sincronizar / remover ─────────────────────────────────────────────────
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
      toast({ title: `${r.vistos} grupos, ${r.novos} novos` });
    } catch (e) {
      toast({
        title: e instanceof Error ? e.message : "Não foi possível sincronizar os grupos.",
        variant: "destructive",
      });
    } finally {
      if (montado.current) setSincronizandoId(null);
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

  // ── Grupos (busca client-side) ────────────────────────────────────────────
  const [busca, setBusca] = useState("");
  const gruposFiltrados = busca.trim()
    ? grupos.filter((g) =>
        rotuloDoGrupo(g.nome, g.id).toLowerCase().includes(busca.trim().toLowerCase()),
      )
    : grupos;
  const algumaConectada = instancias.some((i) => i.status === "conectada");

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
            Conecte números de WhatsApp por QR code e sincronize os grupos deles.
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
          Números de WhatsApp fazem parte do plano MAX.
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
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
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
    <div className="space-y-6">
      {instancias.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-6 text-center space-y-3">
          <p className="text-sm text-muted-foreground">Nenhum número conectado ainda.</p>
          <Button onClick={() => setModalCriar(true)} disabled={atingiuLimite}>
            <Plus className="h-4 w-4 mr-1.5" />
            Conectar número{contador}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setModalCriar(true)} disabled={atingiuLimite}>
              <Plus className="h-4 w-4 mr-1.5" />
              Conectar número{contador}
            </Button>
          </div>
          {instancias.map((i) => (
            <div
              key={i.id}
              className="rounded-xl border border-border p-4 flex flex-wrap items-center gap-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm text-foreground">
                    {i.nome_exibicao || `Número ${i.id}`}
                  </span>
                  <StatusBadge status={i.status} />
                </div>
                {i.numero_mascarado && (
                  <p className="mt-0.5 text-sm text-muted-foreground tabular-nums">
                    {i.numero_mascarado}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {i.status === "conectada" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void sincronizarInstancia(i)}
                    disabled={sincronizandoId === i.id}
                  >
                    {sincronizandoId === i.id ? (
                      <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-1.5" />
                    )}
                    Sincronizar grupos
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => setQrAlvo(i)}>
                    <QrCode className="h-4 w-4 mr-1.5" />
                    Conectar
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setParaRemover(i)}
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="sr-only">Remover número</span>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {atingiuLimite && (
        <p className="text-xs text-muted-foreground">
          Limite de {limite} números do plano atingido.
        </p>
      )}

      {(algumaConectada || grupos.length > 0) && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h4 className="text-sm font-bold text-foreground">Grupos</h4>
            {grupos.length > 0 && (
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar grupo…"
                className="h-9 w-full sm:max-w-[240px]"
              />
            )}
          </div>
          {grupos.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">
              Nenhum grupo ainda. Conecte um número e sincronize.
            </p>
          ) : gruposFiltrados.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">Nenhum grupo com esse nome.</p>
          ) : (
            <>
              <div className="hidden md:block rounded-xl border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead className="text-right">Participantes</TableHead>
                      <TableHead>Envio</TableHead>
                      <TableHead className="text-right">Números</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {gruposFiltrados.map((g) => (
                      <TableRow key={g.id}>
                        <TableCell className="font-medium">{rotuloDoGrupo(g.nome, g.id)}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {g.participantes}
                        </TableCell>
                        <TableCell>
                          {g.permite_envio ? (
                            <BadgeEnvioOk />
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {g.instancia_ids.length}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="md:hidden space-y-3">
                {gruposFiltrados.map((g) => (
                  <DataCard
                    key={g.id}
                    title={rotuloDoGrupo(g.nome, g.id)}
                    badge={g.permite_envio ? <BadgeEnvioOk /> : undefined}
                    fields={[
                      {
                        label: "Participantes",
                        value: <span className="tabular-nums">{g.participantes}</span>,
                        emphasis: true,
                      },
                      {
                        label: "Números",
                        value: <span className="tabular-nums">{g.instancia_ids.length}</span>,
                      },
                    ]}
                  />
                ))}
              </div>
            </>
          )}
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
