import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, ShieldBan, Trash2 } from "lucide-react";

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
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataCard } from "@/components/shared/DataCard";
import { useToast } from "@/hooks/use-toast";
import { mensagemAmigavel } from "@/services/http-error";
import {
  adicionarNaBlacklist,
  listarBlacklist,
  removerDaBlacklist,
  type BlacklistItem,
} from "@/services/whatsapp_conexoes.service";
import { usePlanStore } from "@/stores/planStore";
import type { PlanContext } from "@/services/plan.service";
import { planLimit } from "@/shared/lib/plans";

/** `min_length=8` no backend: abaixo disso o 422 vem como lista do Pydantic,
 *  sem texto escrito para a usuária. Barrar aqui garante a frase certa. */
const MINIMO_DIGITADO = 8;

const dataCurta = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
};

const BadgeRemove = () => (
  <Badge className="whitespace-nowrap border-amber-500/25 bg-amber-500/10 text-amber-500">
    Remove dos grupos
  </Badge>
);

export function BlacklistSection() {
  const { toast } = useToast();
  const { context, plan, loaded: planLoaded, fetch: fetchPlan } = usePlanStore();

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

  // Mesma leitura da seção Números: o contrato do plano ainda não expõe os
  // campos de WhatsApp no tipo, então cai no catálogo local.
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

  const [itens, setItens] = useState<BlacklistItem[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  // Guarda de resposta obsoleta: o padrão do ResumoDeGruposCard. Sem ela, uma
  // busca lenta que terminar depois de um refresh sobrescreve a lista boa.
  const buscaAtual = useRef(0);

  const carregar = useCallback(async () => {
    const chamada = ++buscaAtual.current;
    setCarregando(true);
    setErro(null);
    try {
      const lista = await listarBlacklist();
      if (chamada !== buscaAtual.current || !montado.current) return;
      setItens(lista);
    } catch (e) {
      if (chamada !== buscaAtual.current || !montado.current) return;
      setErro(mensagemAmigavel(e, "Não foi possível carregar os números bloqueados."));
    } finally {
      if (chamada === buscaAtual.current && montado.current) setCarregando(false);
    }
  }, []);

  useEffect(() => {
    if (temRecurso) void carregar();
  }, [temRecurso, carregar]);

  // ── Formulário ────────────────────────────────────────────────────────────
  const campoNumero = useRef<HTMLInputElement>(null);
  const [numero, setNumero] = useState("");
  const [motivo, setMotivo] = useState("");
  const [removerDosGrupos, setRemoverDosGrupos] = useState(true);
  const [erroCampo, setErroCampo] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const bloquear = async () => {
    const valor = numero.trim();
    if (valor.length < MINIMO_DIGITADO) {
      setErroCampo("Número inválido. Use DDD + número, como (11) 99999-8888.");
      return;
    }
    setErroCampo(null);
    setSalvando(true);
    try {
      await adicionarNaBlacklist({
        numero: valor,
        motivo: motivo.trim() || null,
        remover_dos_grupos: removerDosGrupos,
      });
      if (!montado.current) return;
      setNumero("");
      setMotivo("");
      setRemoverDosGrupos(true);
      toast({ title: "Número bloqueado" });
      await carregar();
    } catch (e) {
      // 422 do backend traz o motivo em PT-BR; qualquer outro status vira a
      // frase fixa dentro do service.
      if (montado.current) {
        setErroCampo(mensagemAmigavel(e, "Não foi possível bloquear o número."));
      }
    } finally {
      if (montado.current) setSalvando(false);
    }
  };

  // ── Remoção ───────────────────────────────────────────────────────────────
  const [paraRemover, setParaRemover] = useState<BlacklistItem | null>(null);
  const [removendo, setRemovendo] = useState(false);

  const confirmarRemocao = async () => {
    if (!paraRemover) return;
    setRemovendo(true);
    try {
      await removerDaBlacklist(paraRemover.id);
      toast({ title: "Número desbloqueado" });
      await carregar();
    } catch (e) {
      toast({
        title: mensagemAmigavel(e, "Não foi possível desbloquear o número."),
        variant: "destructive",
      });
    } finally {
      if (montado.current) {
        setRemovendo(false);
        setParaRemover(null);
      }
    }
  };

  const shell = (children: React.ReactNode) => (
    <div className="bg-card border border-border rounded-2xl p-5 md:p-6">
      <div className="flex items-start gap-3 md:gap-4 mb-5">
        <div className="w-11 h-11 md:w-12 md:h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
          <ShieldBan className="w-6 h-6 text-emerald-500" />
        </div>
        <div className="min-w-0">
          <h3 className="text-lg font-bold text-foreground">Bloqueios</h3>
          <p className="text-sm text-muted-foreground">
            Número bloqueado não recebe o resumo diário.
          </p>
        </div>
      </div>
      {children}
    </div>
  );

  if (!planLoaded) {
    return shell(
      <div className="space-y-3">
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
      </div>,
    );
  }

  if (!temRecurso) {
    return shell(
      <div className="rounded-xl border border-dashed border-border p-6 text-center space-y-3">
        <p className="text-sm text-muted-foreground">
          Bloqueio de números faz parte do plano MAX.
        </p>
        <Button asChild>
          <Link to="/dashboard/planos">Ver planos</Link>
        </Button>
      </div>,
    );
  }

  return shell(
    <div className="space-y-6">
      <div className="space-y-4 rounded-xl border border-border p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="blacklist-numero">Número</Label>
            <Input
              id="blacklist-numero"
              ref={campoNumero}
              value={numero}
              onChange={(e) => {
                setNumero(e.target.value);
                if (erroCampo) setErroCampo(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") void bloquear();
              }}
              type="tel"
              inputMode="tel"
              autoComplete="off"
              placeholder="(11) 99999-8888"
              maxLength={24}
              aria-invalid={!!erroCampo}
              aria-describedby={erroCampo ? "blacklist-numero-erro" : undefined}
              className="h-11 tabular-nums"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="blacklist-motivo">Motivo (opcional)</Label>
            <Input
              id="blacklist-motivo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void bloquear();
              }}
              placeholder="Ex.: pediu para sair"
              maxLength={500}
              className="h-11"
            />
          </div>
        </div>

        {erroCampo && (
          <p id="blacklist-numero-erro" className="text-sm text-destructive" role="alert">
            {erroCampo}
          </p>
        )}

        <div className="flex items-start justify-between gap-3 rounded-xl border border-border p-3">
          <Label htmlFor="blacklist-remover" className="text-sm font-normal leading-snug">
            Remover dos meus grupos
            <span className="mt-1 block text-xs text-muted-foreground">
              Se esse número entrar em um grupo seu, ele é removido — só funciona nos grupos em
              que você é administradora.
            </span>
          </Label>
          <Switch
            id="blacklist-remover"
            checked={removerDosGrupos}
            onCheckedChange={setRemoverDosGrupos}
            className="mt-0.5 flex-shrink-0"
          />
        </div>

        <Button className="w-full sm:w-auto" onClick={() => void bloquear()} disabled={salvando}>
          {salvando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Bloquear número
        </Button>

        <p className="text-xs text-muted-foreground">
          Guardamos o número de forma irreversível — por isso a lista mostra só os últimos
          dígitos.
        </p>
      </div>

      {carregando ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
      ) : erro ? (
        <div className="space-y-3 py-2">
          <p className="text-sm text-destructive">{erro}</p>
          <Button variant="outline" size="sm" onClick={() => void carregar()}>
            Tentar novamente
          </Button>
        </div>
      ) : itens.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-6 text-center space-y-3">
          <p className="text-sm text-muted-foreground">Nenhum número bloqueado ainda.</p>
          <Button variant="outline" onClick={() => campoNumero.current?.focus()}>
            Bloquear um número
          </Button>
        </div>
      ) : (
        <>
          <div className="hidden md:block rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Número</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead className="whitespace-nowrap">Nos grupos</TableHead>
                  <TableHead className="whitespace-nowrap">Bloqueado em</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {itens.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="whitespace-nowrap font-medium tabular-nums">
                      {item.numero_mascarado || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{item.motivo || "—"}</TableCell>
                    <TableCell>
                      {item.remover_dos_grupos ? (
                        <BadgeRemove />
                      ) : (
                        <span className="text-muted-foreground">Só não recebe</span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap tabular-nums text-muted-foreground">
                      {dataCurta(item.criado_em)}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setParaRemover(item)}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Desbloquear número</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="md:hidden space-y-3">
            {itens.map((item) => (
              <DataCard
                key={item.id}
                title={<span className="tabular-nums">{item.numero_mascarado || "—"}</span>}
                badge={item.remover_dos_grupos ? <BadgeRemove /> : undefined}
                actions={
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-10 w-10 text-destructive hover:text-destructive"
                    onClick={() => setParaRemover(item)}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Desbloquear número</span>
                  </Button>
                }
                fields={[
                  { label: "Motivo", value: item.motivo || "—" },
                  {
                    label: "Bloqueado em",
                    value: <span className="tabular-nums">{dataCurta(item.criado_em)}</span>,
                  },
                ]}
              />
            ))}
          </div>
        </>
      )}

      <AlertDialog open={!!paraRemover} onOpenChange={(o) => !o && setParaRemover(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Desbloquear {paraRemover?.numero_mascarado || "número"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Ele volta a receber o resumo diário e deixa de ser removido dos seus grupos.
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
              Desbloquear
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>,
  );
}
