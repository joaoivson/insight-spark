import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, RefreshCw } from "lucide-react";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CORES_DO_STATUS } from "@/components/whatsapp/DispositivoCard";
import { TabelaDeGrupos } from "@/components/whatsapp/TabelaDeGrupos";
import { useToast } from "@/hooks/use-toast";
import { mensagemAmigavel } from "@/services/http-error";
import type { GrupoWhatsapp } from "@/services/whatsapp_conexoes.service";
import { rotuloDoGrupo } from "@/shared/lib/grupo";
import { isUnlimited, planLimit } from "@/shared/lib/plans";
import { cn } from "@/shared/lib/utils";
import { usePlanStore } from "@/stores/planStore";
import { useWhatsappConexoesStore } from "@/stores/whatsappConexoesStore";

const VOLTAR_PARA = "/dashboard/configuracoes?tab=numeros";

const LinkVoltar = () => (
  <Link
    to={VOLTAR_PARA}
    className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
  >
    <ArrowLeft className="h-4 w-4" />
    Números
  </Link>
);

/**
 * Página de um número de WhatsApp (spec §6.2): os grupos saíram do card da
 * aba Números e vivem aqui, com o toggle "Ativo" por grupo. Uma aba só por
 * enquanto — a estrutura de Tabs fica pronta para as próximas (histórico,
 * saúde do número).
 */
const NumeroDetalhe = () => {
  const { id } = useParams<{ id: string }>();
  const instanciaId = Number(id);

  const { toast } = useToast();
  const { context, plan, fetch: fetchPlan } = usePlanStore();
  const { instancias, grupos, loaded, loading, error, fetch, sincronizar, definirAtivado } =
    useWhatsappConexoesStore();

  useEffect(() => {
    void fetchPlan();
    void fetch();
  }, [fetchPlan, fetch]);

  const instancia = instancias.find((i) => i.id === instanciaId) ?? null;
  const conectada = instancia?.status === "conectada";

  // O vínculo grupo↔número é N:N — filtra pelo vínculo, não por "dono".
  const gruposDoNumero = useMemo(
    () => grupos.filter((g) => g.instancia_ids.includes(instanciaId)),
    [grupos, instanciaId],
  );

  // ── Busca (client-side: a lista já está inteira em memória) ───────────────
  const [busca, setBusca] = useState("");
  const termo = busca.trim().toLowerCase();
  const filtrados = termo
    ? gruposDoNumero.filter((g) => rotuloDoGrupo(g.nome, g.id).toLowerCase().includes(termo))
    : gruposDoNumero;

  // ── Contador X/Y (spec §6.2) ──────────────────────────────────────────────
  // X = ativados DESTE número; Y = limite do plano (que é global, por conta).
  const ativos = gruposDoNumero.filter((g) => g.ativado).length;
  const limiteGrupos = context?.limites?.whatsapp_grupos ?? planLimit(plan, "whatsapp_grupos");
  const plural = ativos === 1 ? "grupo ativo" : "grupos ativos";
  // Sentinelas: -1 nunca aparece na tela; 0 não vira "X/0".
  const mostrarLimite = !isUnlimited(limiteGrupos) && limiteGrupos > 0;

  // ── Sincronizar ───────────────────────────────────────────────────────────
  const [sincronizando, setSincronizando] = useState(false);
  const sincronizarAgora = async () => {
    setSincronizando(true);
    try {
      const r = await sincronizar(instanciaId);
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
        title: mensagemAmigavel(e, "Não foi possível sincronizar os grupos."),
        variant: "destructive",
      });
    } finally {
      setSincronizando(false);
    }
  };

  // ── Toggle "Ativo" (spec §6.3) — otimista no store, rollback em erro ─────
  const alternarAtivado = async (grupo: GrupoWhatsapp, ativado: boolean) => {
    try {
      await definirAtivado(grupo.id, ativado);
    } catch (e) {
      // O 403 de limite (PLANO_INSUFICIENTE) vem com a mensagem pronta do
      // backend; o resto vira frase fixa — mensagem técnica não chega à tela.
      toast({
        title: mensagemAmigavel(e, "Não foi possível alterar o grupo."),
        variant: "destructive",
      });
    }
  };

  // ── Estados de página ─────────────────────────────────────────────────────
  if (!loaded || (loading && !instancia)) {
    return (
      <DashboardLayout title="Número">
        <div className="space-y-4">
          <LinkVoltar />
          <Skeleton className="h-10 w-64 rounded-lg" />
          <Skeleton className="h-72 w-full rounded-xl" />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !instancia) {
    return (
      <DashboardLayout title="Número">
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <p className="text-sm text-muted-foreground">
              {error ?? "Número não encontrado."}
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              {error && (
                <Button variant="outline" onClick={() => void fetch({ force: true })}>
                  Tentar novamente
                </Button>
              )}
              <Button asChild variant="ghost">
                <Link to={VOLTAR_PARA}>Voltar para Números</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  const cores = CORES_DO_STATUS[instancia.status];
  const nome = instancia.nome_exibicao || `Número ${instancia.id}`;

  return (
    <DashboardLayout
      title={nome}
      subtitle={instancia.numero_mascarado || "Número ainda não pareado"}
      action={
        <span className="flex items-center gap-2">
          <span className={cn("h-2 w-2 rounded-full", cores.dot)} />
          <span className={cn("text-sm font-medium whitespace-nowrap", cores.texto)}>
            {cores.rotulo}
          </span>
        </span>
      }
    >
      <div className="space-y-4">
        <LinkVoltar />

        <Tabs defaultValue="grupos" className="space-y-4">
          <TabsList>
            <TabsTrigger value="grupos">Grupos</TabsTrigger>
          </TabsList>

          <TabsContent value="grupos" className="mt-0 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground tabular-nums">
                  {ativos}
                  {mostrarLimite && `/${limiteGrupos}`}
                </span>{" "}
                {plural}
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => void sincronizarAgora()}
                disabled={sincronizando || !conectada}
              >
                {sincronizando ? (
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-1.5" />
                )}
                Sincronizar grupos
              </Button>
            </div>

            {gruposDoNumero.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  {conectada
                    ? "Nenhum grupo ainda. Use “Sincronizar grupos”."
                    : "Nenhum grupo ainda. Conecte este número e sincronize."}
                </p>
              </div>
            ) : (
              <>
                <Input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar grupo…"
                  className="h-9 w-full sm:max-w-[280px]"
                />

                {filtrados.length === 0 ? (
                  <p className="py-3 text-sm text-muted-foreground">
                    Nenhum grupo com esse nome.
                  </p>
                ) : (
                  <TabelaDeGrupos
                    grupos={filtrados}
                    onAlternarAtivado={(g, ativado) => void alternarAtivado(g, ativado)}
                  />
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default NumeroDetalhe;
