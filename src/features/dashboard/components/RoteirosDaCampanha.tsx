import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarClock, Copy, ListOrdered, Loader2, Pencil, Plus } from "lucide-react";

import { ResponsiveModal } from "@/components/shared/ResponsiveModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  criarRoteiro,
  duplicarRoteiro,
  listarRoteiros,
  type Roteiro,
} from "@/services/roteiros.service";

const rotuloPassos = (n: number) => (n === 1 ? "1 passo" : `${n} passos`);

const StatusRoteiroBadge = ({ status }: { status: string }) =>
  status === "pronto" ? (
    <Badge className="border-emerald-500/25 bg-emerald-500/10 text-emerald-500">Pronto</Badge>
  ) : (
    <Badge variant="secondary">Rascunho</Badge>
  );

/** Aba "Roteiros" da campanha: sequência de passos que a campanha dispara. */
export const RoteirosDaCampanha = ({ campanhaId }: { campanhaId: number }) => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [roteiros, setRoteiros] = useState<Roteiro[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const [modalNovo, setModalNovo] = useState(false);
  const [nome, setNome] = useState("");
  const [criando, setCriando] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      setRoteiros(await listarRoteiros(campanhaId));
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setCarregando(false);
    }
  }, [campanhaId]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const abrirEditor = (roteiroId: number) =>
    navigate(`/dashboard/grupos/${campanhaId}/roteiros/${roteiroId}`);

  const confirmarCriacao = async () => {
    const nomeLimpo = nome.trim();
    if (!nomeLimpo) return;
    setCriando(true);
    try {
      const criado = await criarRoteiro({ nome: nomeLimpo, campanha_id: campanhaId });
      setModalNovo(false);
      setNome("");
      abrirEditor(criado.id);
    } catch (e) {
      toast({
        title: "Não foi possível criar o roteiro",
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setCriando(false);
    }
  };

  const duplicar = async (roteiro: Roteiro) => {
    setOcupado(true);
    try {
      const copia = await duplicarRoteiro(roteiro.id);
      setRoteiros((atual) => [copia, ...atual]);
      toast({ title: "Roteiro duplicado" });
    } catch (e) {
      toast({
        title: "Não foi possível duplicar",
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setOcupado(false);
    }
  };

  return (
    <div className="space-y-4">
      {(carregando || roteiros.length > 0) && (
        <div className="flex items-center justify-end">
          <Button onClick={() => setModalNovo(true)} disabled={carregando}>
            <Plus className="mr-2 h-4 w-4" /> Novo roteiro
          </Button>
        </div>
      )}

      {carregando ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : erro ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="text-sm text-muted-foreground">{erro}</p>
            <Button variant="outline" onClick={() => void carregar()}>
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      ) : roteiros.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <ListOrdered className="h-6 w-6 text-primary" />
            </span>
            <p className="text-sm font-medium text-foreground">Nenhum roteiro ainda</p>
            <ol className="max-w-xs list-decimal space-y-1 pl-5 text-left text-sm text-muted-foreground">
              <li>Crie o roteiro e dê um nome.</li>
              <li>Monte os passos: hora, conteúdo e grupos.</li>
              <li>Escolha a data e agende.</li>
            </ol>
            <Button onClick={() => setModalNovo(true)}>
              <Plus className="mr-2 h-4 w-4" /> Novo roteiro
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {roteiros.map((r) => (
            <Card key={r.id}>
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <ListOrdered className="h-5 w-5 text-primary" />
                </span>

                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => abrirEditor(r.id)}
                      className="min-w-0 max-w-full truncate text-sm font-semibold text-foreground hover:underline"
                    >
                      {r.nome}
                    </button>
                    <StatusRoteiroBadge status={r.status} />
                  </div>
                  <p className="flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
                    <span className="tabular-nums">{rotuloPassos(r.total_passos)}</span>
                    <span className="tabular-nums">
                      {new Date(r.criado_em).toLocaleDateString("pt-BR")}
                    </span>
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:flex-shrink-0">
                  <Button variant="outline" size="sm" onClick={() => abrirEditor(r.id)}>
                    <Pencil className="mr-2 h-3.5 w-3.5" /> Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={ocupado}
                    onClick={() => void duplicar(r)}
                  >
                    <Copy className="mr-2 h-3.5 w-3.5" /> Duplicar
                  </Button>
                  <Button size="sm" onClick={() => abrirEditor(r.id)}>
                    <CalendarClock className="mr-2 h-3.5 w-3.5" /> Agendar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {ocupado && (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Salvando…
        </p>
      )}

      <ResponsiveModal
        open={modalNovo}
        onOpenChange={(o) => {
          setModalNovo(o);
          if (!o) setNome("");
        }}
        title="Novo roteiro"
      >
        <div className="space-y-4 pb-2">
          <div className="space-y-2">
            <Label htmlFor="nome-roteiro">Nome</Label>
            <Input
              id="nome-roteiro"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Terça de ofertas"
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
            Criar roteiro
          </Button>
        </div>
      </ResponsiveModal>
    </div>
  );
};
