import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Megaphone, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckboxQuadrado } from "@/components/shared/CheckboxQuadrado";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Paginacao, paginar } from "@/components/shared/Paginacao";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/shared/lib/utils";
import { presetRangeKeys, type PresetKind } from "@/shared/lib/date";
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

/**
 * Filtro de status (spec §4.2). Abre em "Ativas": no teste real eram 30+ linhas
 * quase todas pausadas, e as ativas ficavam perdidas no meio.
 *
 * "Ativa" aqui é VEICULAÇÃO REAL (`veiculando`), não `effective_status` — que
 * permanece ACTIVE indefinidamente em campanha com orçamento vitalício esgotado.
 */
type FiltroStatus = "ativas" | "pausadas" | "todas";

const FILTROS: { key: FiltroStatus; label: string }[] = [
  { key: "ativas", label: "Ativas" },
  { key: "pausadas", label: "Pausadas" },
  { key: "todas", label: "Todas" },
];

const PERIODOS: { key: PresetKind; label: string }[] = [
  { key: "7d", label: "7 dias" },
  { key: "14d", label: "14 dias" },
  { key: "30d", label: "30 dias" },
  { key: "month", label: "Mês atual" },
];

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Aba "Anúncios": escolhe quais campanhas de anúncio do Meta levam a estes grupos. */
export const AnunciosDaCampanha = ({ campanhaId }: { campanhaId: number }) => {
  const { toast } = useToast();
  const [anuncios, setAnuncios] = useState<AnuncioVinculavel[]>([]);
  const [selecionados, setSelecionados] = useState<Set<number>>(new Set());
  const [baseline, setBaseline] = useState("");
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<FiltroStatus>("ativas");
  const [periodo, setPeriodo] = useState<PresetKind>("30d");
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(25);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  /** Incrementado pelo "Tentar novamente" — refaz o effect sem duplicar a lógica. */
  const [tentativa, setTentativa] = useState(0);

  // Corte no fim do dia anterior em Brasília, igual ao resto do produto.
  const intervalo = useMemo(() => {
    const { startDate, endDate } = presetRangeKeys(periodo);
    return { inicio: startDate, fim: endDate };
  }, [periodo]);

  /**
   * `preservarSelecao` mantém o que a afiliada marcou e ainda não salvou.
   *
   * Trocar o período refaz o fetch, e reescrever a seleção com o que está no
   * banco jogava fora os checkboxes dela sem aviso — justamente quando ela
   * troca de janela para conferir o gasto ANTES de salvar.
   */
  const aplicar = useCallback(
    (lista: AnuncioVinculavel[], preservarSelecao = false) => {
      setAnuncios(lista);
      const doBanco = new Set(lista.filter((a) => a.vinculada).map((a) => a.id));
      setBaseline(assinatura(doBanco));
      if (!preservarSelecao) setSelecionados(doBanco);
    },
    [],
  );

  /** Recarrega a lista sem piscar a tela — usada depois de um 409. */
  const recarregarSilencioso = useCallback(async () => {
    try {
      aplicar(await listarAnunciosDaCampanha(campanhaId, intervalo));
    } catch {
      /* a lista na tela continua válida; o toast do 409 já explicou o que houve */
    }
  }, [campanhaId, aplicar, intervalo]);

  // Mesma guarda da aba Resultados: a resposta de uma campanha antiga não pode
  // cair em cima da tela de outra, nem setar estado depois do unmount.
  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    setErro(null);
    listarAnunciosDaCampanha(campanhaId, intervalo)
      .then((lista) => {
        if (!ativo) return;
        // `sujoRef` e não `sujo`: o effect não depende do estado de seleção
        // (dependeria e refaria o fetch a cada clique de checkbox).
        aplicar(lista, sujoRef.current);
        setErro(null);
      })
      .catch((e) => ativo && setErro(mensagemAmigavel(e, ERRO_CARGA)))
      .finally(() => {
        if (ativo) setCarregando(false);
      });
    return () => {
      ativo = false;
    };
  }, [campanhaId, aplicar, tentativa, intervalo]);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return anuncios.filter((a) => {
      // Anúncio JÁ VINCULADO nunca some por causa do filtro: sem ele na lista a
      // afiliada perde a única forma de desvincular, e o gasto continua
      // entrando no lucro sem ela poder ver por quê.
      const passaStatus =
        a.vinculada ||
        filtro === "todas" ||
        (filtro === "ativas" ? a.veiculando : !a.veiculando);
      if (!passaStatus) return false;
      if (!q) return true;
      return (
        (a.nome ?? "").toLowerCase().includes(q) ||
        (a.sub_id ?? "").toLowerCase().includes(q)
      );
    });
  }, [anuncios, busca, filtro]);

  // Filtrar/buscar na página 7 deixaria a lista vazia sem motivo aparente.
  useEffect(() => {
    setPagina(1);
  }, [busca, filtro, periodo]);

  const daPagina = useMemo(
    () => paginar(filtrados, pagina, porPagina),
    [filtrados, pagina, porPagina],
  );

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
  // Espelho do `sujo` para o effect de carga ler sem depender dele.
  const sujoRef = useRef(sujo);
  useEffect(() => {
    sujoRef.current = sujo;
  }, [sujo]);

  const salvar = async () => {
    setSalvando(true);
    try {
      // O período vai junto: sem ele a resposta trazia o gasto de 30 dias
      // com o chip da tela ainda marcando "7 dias".
      aplicar(await definirAnunciosDaCampanha(campanhaId, [...selecionados], intervalo));
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

  // Só a PRIMEIRA carga mostra esqueleto de tela inteira. Trocar o período
  // desmontava busca e chips junto com a lista: a barra de filtros sumia por
  // ~1s a cada clique, e comparar 7d × 14d virava um piscar de layout.
  if (carregando && anuncios.length === 0) {
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

      {/* Filtros em chips: visíveis e nomeados, como no resto do produto. */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1">
          {FILTROS.map((f) => (
            <Button
              key={f.key}
              size="sm"
              variant={filtro === f.key ? "default" : "outline"}
              onClick={() => setFiltro(f.key)}
            >
              {f.label}
            </Button>
          ))}
        </div>
        <span className="hidden h-5 w-px bg-border sm:block" aria-hidden />
        <div className="flex flex-wrap gap-1">
          {PERIODOS.map((p) => (
            <Button
              key={p.key}
              size="sm"
              variant={periodo === p.key ? "default" : "outline"}
              onClick={() => setPeriodo(p.key)}
              disabled={carregando}
            >
              {p.label}
            </Button>
          ))}
        </div>
      </div>

      {carregando ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-[52px] w-full rounded-xl" />
          ))}
        </div>
      ) : filtrados.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          {busca.trim()
            ? "Nenhum anúncio com esse nome."
            : filtro === "ativas"
              ? "Nenhum anúncio veiculando no período. Veja em Pausadas ou Todas."
              : "Nenhum anúncio neste filtro."}
        </p>
      ) : (
        <div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
          {daPagina.map((a) => {
            const dona = a.vinculada_em_outra;
            return (
              <label
                key={a.id}
                className={cn(
                  "flex min-h-[52px] items-center gap-3 px-4 py-3 transition-colors",
                  dona ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:bg-accent/40",
                )}
              >
                <CheckboxQuadrado
                  checked={selecionados.has(a.id)}
                  onCheckedChange={() => alternar(a.id, !!dona)}
                  disabled={salvando || !!dona}
                  aria-label={`Vincular ${a.nome ?? "anúncio"}`}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-foreground">
                    {a.nome ?? `Anúncio ${a.id}`}
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
                <Badge
                  variant="outline"
                  className={cn(
                    "flex-shrink-0 text-[11px] font-normal",
                    a.veiculando && "border-emerald-500/25 bg-emerald-500/10 text-emerald-500",
                  )}
                >
                  {a.veiculando ? "Veiculando" : (rotuloStatus(a.status) ?? "Parada")}
                </Badge>
                {/* Números à direita com tabular-nums: a afiliada compara as
                    colunas, e sem isso os dígitos não empilham. */}
                <span className="w-24 flex-shrink-0 text-right text-sm tabular-nums text-foreground">
                  {brl(a.gasto)}
                </span>
              </label>
            );
          })}
        </div>
      )}

      {filtrados.length > 0 && (
        <Paginacao
          pagina={pagina}
          total={filtrados.length}
          onChange={setPagina}
          porPagina={porPagina}
          onPorPaginaChange={setPorPagina}
          formato="intervalo"
        />
      )}
    </div>
  );
};
