import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Copy, Loader2, MessagesSquare, MoreVertical, Pencil, Plus, Smartphone, Trash2,
} from "lucide-react";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { ResponsiveModal } from "@/components/shared/ResponsiveModal";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import type { StatusCampanha } from "@/services/campanhas_grupos.service";
import { mensagemAmigavel } from "@/services/http-error";
import type { CampanhaGrupos } from "@/services/campanhas_grupos.service";
import { useCampanhasGruposStore } from "@/stores/campanhasGruposStore";
import { useWhatsappConexoesStore } from "@/stores/whatsappConexoesStore";

export const StatusCampanhaBadge = ({ status }: { status: StatusCampanha }) => {
  if (status === "ativa") {
    return <Badge className="border-emerald-500/25 bg-emerald-500/10 text-emerald-500">Ativa</Badge>;
  }
  if (status === "pausada") {
    return <Badge variant="secondary">Pausada</Badge>;
  }
  return (
    <Badge variant="outline" className="text-muted-foreground">
      Arquivada
    </Badge>
  );
};

const rotuloGrupos = (n: number) => (n === 1 ? "1 grupo" : `${n} grupos`);

const CampanhasGrupos = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { campanhas, loaded, loading, error, fetch, criar, renomear, duplicar, excluir } =
    useCampanhasGruposStore();
  const {
    grupos: gruposSincronizados,
    instancias,
    loaded: conexoesLoaded,
    error: erroConexoes,
    fetch: fetchConexoes,
  } = useWhatsappConexoesStore();

  const [modalNova, setModalNova] = useState(false);
  const [nome, setNome] = useState("");
  const [criando, setCriando] = useState(false);
  // Nome, duplicar e excluir são ações SOBRE a campanha e pertencem à listagem
  // — em Configurações fica só o que muda comportamento.
  const [renomeando, setRenomeando] = useState<CampanhaGrupos | null>(null);
  const [novoNome, setNovoNome] = useState("");
  const [paraExcluir, setParaExcluir] = useState<CampanhaGrupos | null>(null);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    void fetch();
    void fetchConexoes();
  }, [fetch, fetchConexoes]);

  const confirmarCriacao = async () => {
    const nomeLimpo = nome.trim();
    if (!nomeLimpo) return;
    setCriando(true);
    try {
      const campanha = await criar(nomeLimpo);
      setModalNova(false);
      navigate(`/dashboard/grupos/${campanha.id}`);
    } catch (e) {
      toast({
        title: "Não foi possível criar a campanha",
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setCriando(false);
    }
  };

  const duplicarCampanhaDaLista = async (c: CampanhaGrupos) => {
    setOcupado(true);
    try {
      const nova = await duplicar(c.id);
      toast({
        title: "Campanha duplicada",
        description: "A cópia veio sem os grupos — escolha os dela na aba Grupos.",
      });
      navigate(`/dashboard/grupos/${nova.id}`);
    } catch (e) {
      toast({
        title: "Não foi possível duplicar",
        description: mensagemAmigavel(e, "Tente novamente."),
        variant: "destructive",
      });
    } finally {
      setOcupado(false);
    }
  };

  const confirmarRenome = async () => {
    if (!renomeando) return;
    const limpo = novoNome.trim();
    if (!limpo) return;
    setOcupado(true);
    try {
      await renomear(renomeando.id, limpo);
      setRenomeando(null);
    } catch (e) {
      toast({
        title: "Não foi possível renomear",
        description: mensagemAmigavel(e, "Tente novamente."),
        variant: "destructive",
      });
    } finally {
      setOcupado(false);
    }
  };

  const confirmarExclusao = async () => {
    if (!paraExcluir) return;
    setOcupado(true);
    try {
      await excluir(paraExcluir.id);
      setParaExcluir(null);
      toast({ title: "Campanha excluída" });
    } catch (e) {
      toast({
        title: "Não foi possível excluir",
        description: mensagemAmigavel(e, "Tente novamente."),
        variant: "destructive",
      });
    } finally {
      setOcupado(false);
    }
  };

  const initialLoading = loading && !loaded;
  // Só afirma "não tem grupos" quando a carga REALMENTE deu certo: com erro,
  // a lista vem vazia e mandaria a usuária reconectar um número que já existe.
  const semGruposSincronizados =
    conexoesLoaded && !erroConexoes && gruposSincronizados.length === 0;
  // "Sem dispositivo" e "dispositivo conectado, mas sem grupos" são estados
  // DIFERENTES. Tratá-los como um só mandava a afiliada conectar um número que
  // ela já tinha conectado — e escondia a ação que resolvia (sincronizar).
  const temDispositivoConectado =
    conexoesLoaded &&
    !erroConexoes &&
    instancias.some((i) => i.status === "conectada");

  return (
    <DashboardLayout title="Campanhas">
      <div className="space-y-5">
        {/* "Enviar oferta" saiu daqui (04/09): envio rápido é roteiro de um
            passo e pertence à aba Roteiros DENTRO da campanha — da listagem
            nem dá para saber para qual campanha o envio iria. O componente
            continua em uso em Roteiros e em Ofertas. */}
        {!initialLoading && campanhas.length > 0 && (
          <div className="flex items-center justify-end gap-2">
            <Button
              variant={semGruposSincronizados ? "default" : "outline"}
              onClick={() => setModalNova(true)}
            >
              <Plus className="mr-2 h-4 w-4" /> Nova campanha
            </Button>
          </div>
        )}

        {semGruposSincronizados && (
          <Card>
            <CardContent className="flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center">
              <Smartphone className="h-5 w-5 flex-shrink-0 text-emerald-500" />
              <p className="min-w-0 flex-1 text-sm text-muted-foreground">
                {temDispositivoConectado
                  ? "Seu dispositivo está conectado, mas nenhum grupo foi sincronizado ainda. Sincronize para as campanhas terem onde distribuir as pessoas."
                  : "Conecte um dispositivo e sincronize seus grupos para as campanhas terem onde distribuir as pessoas."}
              </p>
              <Button asChild variant="outline">
                <Link to="/dashboard/configuracoes?tab=numeros">
                  {temDispositivoConectado ? "Sincronizar grupos" : "Conectar dispositivo"}
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {initialLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : error && campanhas.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button variant="outline" onClick={() => void fetch({ force: true })}>
                Tentar novamente
              </Button>
            </CardContent>
          </Card>
        ) : campanhas.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <MessagesSquare className="h-6 w-6 text-primary" />
              </span>
              <p className="text-sm font-medium text-foreground">Nenhuma campanha ainda</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Uma campanha reúne grupos de WhatsApp e distribui as pessoas entre eles.
              </p>
              <Button onClick={() => setModalNova(true)}>
                <Plus className="mr-2 h-4 w-4" /> Nova campanha
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {campanhas.map((c) => (
              // O card NÃO pode ser um <button>: o trigger do menu é outro
              // botão, e botão dentro de botão é HTML inválido — além de o
              // clique borbulhar para o navigate.
              <Card key={c.id} className="transition-colors hover:bg-accent/40">
                <CardContent className="flex items-center gap-2 p-4">
                  <button
                    type="button"
                    onClick={() => navigate(`/dashboard/grupos/${c.id}`)}
                    className="flex min-w-0 flex-1 items-center gap-4 text-left"
                    aria-label={`Abrir campanha ${c.nome}`}
                  >
                    <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <MessagesSquare className="h-5 w-5 text-primary" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-semibold text-foreground">
                          {c.nome}
                        </span>
                        <StatusCampanhaBadge status={c.status} />
                      </span>
                    </span>
                    <span className="flex flex-shrink-0 flex-col items-end">
                      <span className="text-sm font-semibold tabular-nums text-foreground">
                        {rotuloGrupos(c.total_grupos)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(c.criado_em).toLocaleDateString("pt-BR")}
                      </span>
                    </span>
                  </button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="flex-shrink-0"
                        aria-label={`Ações da campanha ${c.nome}`}
                        disabled={ocupado}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => {
                          setRenomeando(c);
                          setNovoNome(c.nome);
                        }}
                      >
                        <Pencil className="mr-2 h-4 w-4" /> Editar nome
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => void duplicarCampanhaDaLista(c)}>
                        <Copy className="mr-2 h-4 w-4" /> Duplicar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setParaExcluir(c)}
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <ResponsiveModal
        open={modalNova}
        onOpenChange={(o) => {
          setModalNova(o);
          if (!o) setNome("");
        }}
        title="Nova campanha"
      >
        <div className="space-y-4 pb-2">
          <div className="space-y-2">
            <Label htmlFor="nome-campanha">Nome</Label>
            <Input
              id="nome-campanha"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Achadinhos"
              maxLength={120}
              autoFocus
            />
          </div>
          <Button
            className="w-full"
            onClick={() => void confirmarCriacao()}
            disabled={criando || !nome.trim()}
          >
            {criando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Criar campanha
          </Button>
        </div>
      </ResponsiveModal>

      <ResponsiveModal
        open={!!renomeando}
        onOpenChange={(o) => !o && setRenomeando(null)}
        title="Editar nome"
      >
        <div className="space-y-4 pb-2">
          <div className="space-y-2">
            <Label htmlFor="renomear-campanha">Nome</Label>
            <Input
              id="renomear-campanha"
              value={novoNome}
              onChange={(e) => setNovoNome(e.target.value)}
              maxLength={120}
              autoFocus
            />
          </div>
          <Button
            className="w-full"
            onClick={() => void confirmarRenome()}
            disabled={ocupado || !novoNome.trim()}
          >
            {ocupado && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </div>
      </ResponsiveModal>

      <AlertDialog
        open={!!paraExcluir}
        onOpenChange={(aberto) => !aberto && setParaExcluir(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir campanha</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm">
                <p>
                  Tem certeza que deseja excluir a campanha{" "}
                  <span className="font-medium text-foreground">{paraExcluir?.nome}</span>?
                </p>
                <p>Isso remove:</p>
                <ul className="list-disc space-y-1 pl-5">
                  <li>Roteiros e envios agendados</li>
                  <li>Vínculo com os anúncios</li>
                  <li>Resultados desta campanha</li>
                  <li>Link de entrada (para de funcionar)</li>
                </ul>
                {/* Texto auxiliar com consequência real: sem ele, a afiliada
                    acredita que perde os grupos e a comissão junto. */}
                <p className="text-muted-foreground">
                  Os grupos continuam em Configurações › WhatsApp › Números, e a comissão já
                  atribuída ao Sub ID permanece.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={ocupado}>NÃO</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                // O AlertDialogAction fecha o diálogo por conta própria; sem
                // isto o "excluindo…" some antes de a request voltar.
                e.preventDefault();
                void confirmarExclusao();
              }}
              disabled={ocupado}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {ocupado && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              SIM, EXCLUIR
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default CampanhasGrupos;
