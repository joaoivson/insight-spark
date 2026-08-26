import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Megaphone, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/shared/lib/utils";
import { mensagemAmigavel } from "@/services/http-error";
import {
  definirAnunciosDaCampanha,
  listarAnunciosDaCampanha,
  type AnuncioVinculavel,
} from "@/services/campanhas_grupos.service";

/** O Meta manda o status em caixa alta; a tela fala português. */
const ROTULO_STATUS: Record<string, string> = {
  ACTIVE: "Ativa",
  PAUSED: "Pausada",
  ARCHIVED: "Arquivada",
  DELETED: "Excluída",
};

const rotuloStatus = (status: string | null) => {
  if (!status) return null;
  return ROTULO_STATUS[status.toUpperCase()] ?? status;
};

const ERRO_CARGA = "Não foi possível carregar os anúncios. Tente novamente.";
const ERRO_SALVAR = "Não foi possível salvar os vínculos. Tente novamente.";

/** Assinatura do conjunto selecionado — é o que o PUT persiste, então define "sujo". */
const assinatura = (ids: Set<number>) => [...ids].sort((a, b) => a - b).join(",");

/** Aba "Anúncios": escolhe quais campanhas de anúncio do Meta levam a estes grupos. */
export const AnunciosDaCampanha = ({ campanhaId }: { campanhaId: number }) => {
  const { toast } = useToast();
  const [anuncios, setAnuncios] = useState<AnuncioVinculavel[]>([]);
  const [selecionados, setSelecionados] = useState<Set<number>>(new Set());
  const [baseline, setBaseline] = useState("");
  const [busca, setBusca] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  /** Incrementado pelo "Tentar novamente" — refaz o effect sem duplicar a lógica. */
  const [tentativa, setTentativa] = useState(0);

  const aplicar = useCallback((lista: AnuncioVinculavel[]) => {
    setAnuncios(lista);
    const marcados = new Set(lista.filter((a) => a.vinculada).map((a) => a.id));
    setSelecionados(marcados);
    setBaseline(assinatura(marcados));
  }, []);

  /** Recarrega a lista sem piscar a tela — usada depois de um 409. */
  const recarregarSilencioso = useCallback(async () => {
    try {
      aplicar(await listarAnunciosDaCampanha(campanhaId));
    } catch {
      /* a lista na tela continua válida; o toast do 409 já explicou o que houve */
    }
  }, [campanhaId, aplicar]);

  // Mesma guarda da aba Resultados: a resposta de uma campanha antiga não pode
  // cair em cima da tela de outra, nem setar estado depois do unmount.
  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    setErro(null);
    listarAnunciosDaCampanha(campanhaId)
      .then((lista) => {
        if (!ativo) return;
        aplicar(lista);
        setErro(null);
      })
      .catch((e) => ativo && setErro(mensagemAmigavel(e, ERRO_CARGA)))
      .finally(() => {
        if (ativo) setCarregando(false);
      });
    return () => {
      ativo = false;
    };
  }, [campanhaId, aplicar, tentativa]);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return anuncios;
    return anuncios.filter(
      (a) =>
        a.nome.toLowerCase().includes(q) || (a.sub_id ?? "").toLowerCase().includes(q),
    );
  }, [anuncios, busca]);

  const alternar = (id: number, bloqueado: boolean) => {
    if (bloqueado) return;
    setSelecionados((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(id)) proximo.delete(id);
      else proximo.add(id);
      return proximo;
    });
  };

  const sujo = assinatura(selecionados) !== baseline;

  const salvar = async () => {
    setSalvando(true);
    try {
      aplicar(await definirAnunciosDaCampanha(campanhaId, [...selecionados]));
      toast({ title: "Vínculos salvos" });
    } catch (e) {
      // O 409 já vem com o texto pronto ("Já vinculado a outra campanha de grupos:
      // X. Desvincule lá antes de vincular aqui.") e marcado como amigável — texto
      // genérico esconderia qual anúncio é e o que fazer. A seleção NÃO é aplicada:
      // o checkbox continua sujo, porque nada foi salvo.
      toast({
        title: "Não foi possível salvar os vínculos",
        description: mensagemAmigavel(e, ERRO_SALVAR),
        variant: "destructive",
      });
      // O dono pode ter mudado noutra aba: recarrega para a linha aparecer bloqueada.
      void recarregarSilencioso();
    } finally {
      setSalvando(false);
    }
  };

  if (carregando) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-9 w-full rounded-lg" />
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (erro) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <p className="text-sm text-muted-foreground">{erro}</p>
          <Button variant="outline" onClick={() => setTentativa((n) => n + 1)}>
            Tentar novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (anuncios.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <span className="rounded-full bg-accent/10 p-3">
            <Megaphone className="h-6 w-6 text-accent" aria-hidden />
          </span>
          <p className="max-w-md text-sm text-muted-foreground">
            Nenhuma campanha de anúncio sincronizada ainda. Conecte o Facebook Ads para
            vincular os anúncios que levam a estes grupos.
          </p>
          <Button asChild variant="outline">
            <Link to="/dashboard/campanhas">Ir para Anúncios</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <p className="max-w-xl text-xs text-muted-foreground">
          Vincule os anúncios que levam a estes grupos — é o que permite calcular custo por
          entrada e por permanência.
        </p>
        <div className="flex flex-shrink-0 items-center gap-3">
          {sujo && <span className="text-xs text-amber-500">Alterações não salvas</span>}
          <Button onClick={() => void salvar()} disabled={!sujo || salvando}>
            {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar vínculos
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar anúncio"
          className="pl-9"
        />
      </div>

      {filtrados.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          Nenhum anúncio com esse nome.
        </p>
      ) : (
        <div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
          {filtrados.map((a) => {
            const dona = a.vinculada_em_outra;
            return (
              <label
                key={a.id}
                className={cn(
                  "flex min-h-[52px] items-center gap-3 px-4 py-3 transition-colors",
                  dona ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:bg-accent/40",
                )}
              >
                <Checkbox
                  checked={selecionados.has(a.id)}
                  onCheckedChange={() => alternar(a.id, !!dona)}
                  disabled={salvando || !!dona}
                  aria-label={`Vincular ${a.nome}`}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-foreground">
                    {a.nome}
                  </span>
                  {dona ? (
                    <Link
                      to={`/dashboard/grupos/${dona.id}?tab=anuncios`}
                      className="block truncate text-[11px] text-primary hover:underline"
                    >
                      Já vinculado a {dona.nome} — desvincule lá primeiro
                    </Link>
                  ) : (
                    a.sub_id && (
                      <span className="block truncate text-[11px] text-muted-foreground">
                        Sub ID {a.sub_id}
                      </span>
                    )
                  )}
                </span>
                {rotuloStatus(a.status) && (
                  <Badge variant="outline" className="flex-shrink-0 text-[11px] font-normal">
                    {rotuloStatus(a.status)}
                  </Badge>
                )}
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
};
