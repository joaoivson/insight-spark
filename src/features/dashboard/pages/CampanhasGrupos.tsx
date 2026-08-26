import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, MessagesSquare, Plus, Send, Smartphone } from "lucide-react";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { ResponsiveModal } from "@/components/shared/ResponsiveModal";
import { EnvioRapidoModal } from "@/components/whatsapp/EnvioRapidoModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import type { StatusCampanha } from "@/services/campanhas_grupos.service";
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
  const { campanhas, loaded, loading, error, fetch, criar } = useCampanhasGruposStore();
  const {
    grupos: gruposSincronizados,
    loaded: conexoesLoaded,
    error: erroConexoes,
    fetch: fetchConexoes,
  } = useWhatsappConexoesStore();

  const [modalNova, setModalNova] = useState(false);
  const [modalEnvio, setModalEnvio] = useState(false);
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [criando, setCriando] = useState(false);

  useEffect(() => {
    void fetch();
    void fetchConexoes();
  }, [fetch, fetchConexoes]);

  const confirmarCriacao = async () => {
    const nomeLimpo = nome.trim();
    if (!nomeLimpo) return;
    setCriando(true);
    try {
      const campanha = await criar(nomeLimpo, descricao.trim() || undefined);
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

  const initialLoading = loading && !loaded;
  // Só afirma "não tem grupos" quando a carga REALMENTE deu certo: com erro,
  // a lista vem vazia e mandaria a usuária reconectar um número que já existe.
  const semGruposSincronizados =
    conexoesLoaded && !erroConexoes && gruposSincronizados.length === 0;

  return (
    <DashboardLayout title="Campanhas">
      <div className="space-y-5">
        {!initialLoading && (
          <div className="flex items-center justify-end gap-2">
            {campanhas.length > 0 && (
              <Button
                variant={semGruposSincronizados ? "default" : "outline"}
                onClick={() => setModalNova(true)}
              >
                <Plus className="mr-2 h-4 w-4" /> Nova campanha
              </Button>
            )}
            {/* Sem grupo sincronizado, "Enviar oferta" só levaria ao mesmo
                estado vazio que já está na tela — o CTA certo é conectar. */}
            <Button onClick={() => setModalEnvio(true)} disabled={semGruposSincronizados}>
              <Send className="mr-2 h-4 w-4" /> Enviar oferta
            </Button>
          </div>
        )}

        {semGruposSincronizados && (
          <Card>
            <CardContent className="flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center">
              <Smartphone className="h-5 w-5 flex-shrink-0 text-emerald-500" />
              <p className="min-w-0 flex-1 text-sm text-muted-foreground">
                Conecte um número e sincronize seus grupos para as campanhas terem onde
                distribuir as pessoas.
              </p>
              <Button asChild variant="outline">
                <Link to="/dashboard/configuracoes?tab=numeros">Conectar número</Link>
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
              <button
                key={c.id}
                type="button"
                onClick={() => navigate(`/dashboard/grupos/${c.id}`)}
                className="block w-full text-left"
                aria-label={`Abrir campanha ${c.nome}`}
              >
                <Card className="transition-colors hover:bg-accent/40">
                  <CardContent className="flex items-center gap-4 p-4">
                    <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <MessagesSquare className="h-5 w-5 text-primary" />
                    </span>
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-semibold text-foreground">
                          {c.nome}
                        </span>
                        <StatusCampanhaBadge status={c.status} />
                      </div>
                      {c.descricao && (
                        <p className="truncate text-xs text-muted-foreground">{c.descricao}</p>
                      )}
                    </div>
                    <div className="flex flex-shrink-0 flex-col items-end">
                      <span className="text-sm font-semibold tabular-nums text-foreground">
                        {rotuloGrupos(c.total_grupos)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(c.criado_em).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </button>
            ))}
          </div>
        )}
      </div>

      <ResponsiveModal
        open={modalNova}
        onOpenChange={(o) => {
          setModalNova(o);
          if (!o) {
            setNome("");
            setDescricao("");
          }
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
          <div className="space-y-2">
            <Label htmlFor="descricao-campanha">Descrição (opcional)</Label>
            <Textarea
              id="descricao-campanha"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              maxLength={2000}
              rows={3}
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

      <EnvioRapidoModal open={modalEnvio} onOpenChange={setModalEnvio} />
    </DashboardLayout>
  );
};

export default CampanhasGrupos;
