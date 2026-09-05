import { useCallback, useEffect, useRef, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowDownLeft, ArrowUpRight, Loader2, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  listarAtividade,
  type EventoDeGrupo,
  type OrigemEventoGrupo,
  type TipoEventoGrupo,
} from "@/services/campanhas_grupos.service";
import { mensagemAmigavel } from "@/services/http-error";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/shared/lib/utils";

const PAGINA = 50;
const ERRO_CARGA = "Não foi possível carregar a atividade. Tente novamente.";

const ROTULO_ORIGEM: Record<OrigemEventoGrupo, string> = {
  link: "pelo link",
  organica: "orgânica",
  desconhecida: "origem desconhecida",
};

const FILTROS: { valor: TipoEventoGrupo | null; rotulo: string }[] = [
  { valor: null, rotulo: "Tudo" },
  { valor: "entrada", rotulo: "Entradas" },
  { valor: "saida", rotulo: "Saídas" },
];

const quandoRelativo = (iso: string | null) => {
  if (!iso) return "";
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return "";
  return formatDistanceToNow(data, { addSuffix: true, locale: ptBR });
};

const quandoExato = (iso: string | null) => {
  if (!iso) return undefined;
  const data = new Date(iso);
  return Number.isNaN(data.getTime()) ? undefined : data.toLocaleString("pt-BR");
};

/** Só a data, em BRT — para a frase "registradas desde…". */
/**
 * Encurta pelo MEIO, preservando o fim.
 *
 * Truncar no fim deixava os dois chips como "Promos da Beatriz …" —
 * indistinguíveis, porque o que separa os grupos ("#1"/"#2") é exatamente o
 * sufixo. Um filtro em que ela não sabe o que está escolhendo não é filtro.
 */
const encurtarMeio = (nome: string, maximo = 22) => {
  if (nome.length <= maximo) return nome;
  const fim = 8;
  return `${nome.slice(0, maximo - fim - 1)}…${nome.slice(-fim)}`;
};

const soData = (iso: string | null) => {
  if (!iso) return null;
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return null;
  return data.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
};

const LinhaEvento = ({ evento }: { evento: EventoDeGrupo }) => {
  const entrada = evento.tipo === "entrada";
  const Icone = entrada ? ArrowDownLeft : ArrowUpRight;
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <span
        className={cn(
          "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full",
          entrada ? "bg-emerald-500/10" : "bg-destructive/10",
        )}
      >
        <Icone
          className={cn("h-4 w-4", entrada ? "text-emerald-500" : "text-destructive")}
          aria-hidden
        />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">
          {entrada ? "Entrada" : "Saída"}
          {/* Origem só em ENTRADA: origem é de onde a pessoa VEIO. Saída não
              tem origem, e "Saída · origem desconhecida" fazia parecer que o
              sistema perdeu uma informação que nunca existiu. */}
          {entrada && evento.origem && (
            <span className="font-normal text-muted-foreground">
              {" "}
              · {ROTULO_ORIGEM[evento.origem]}
            </span>
          )}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {evento.grupo ?? "(grupo sem nome)"}
        </p>
      </div>
      <span
        className="flex-shrink-0 text-xs text-muted-foreground"
        title={quandoExato(evento.quando)}
      >
        {quandoRelativo(evento.quando)}
      </span>
    </div>
  );
};

/**
 * Aba "Atividade": entradas e saídas dos grupos da campanha.
 *
 * Pagina de 50 em 50 com "Carregar mais", do mais recente para o mais antigo.
 * Rolagem infinita não serve: ela vai querer chegar num dia específico, e não
 * dá para rolar dois meses.
 */
export const AtividadeDaCampanha = ({
  campanhaId,
  grupos = [],
}: {
  campanhaId: number;
  /** Vem da página pai — evita uma segunda request só para os nomes. */
  grupos?: { id: number; nome: string }[];
}) => {
  const { toast } = useToast();
  const [eventos, setEventos] = useState<EventoDeGrupo[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [desde, setDesde] = useState<string | null>(null);
  const [tipo, setTipo] = useState<TipoEventoGrupo | null>(null);
  const [grupoId, setGrupoId] = useState<number | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Guarda contra resposta obsoleta: trocar de filtro duas vezes rápido não
  // pode fazer a resposta antiga cair em cima da nova.
  const requisicao = useRef(0);

  const carregar = useCallback(
    async (silencioso = false) => {
      const meu = ++requisicao.current;
      if (silencioso) setAtualizando(true);
      else setCarregando(true);
      setErro(null);
      try {
        const pagina = await listarAtividade(campanhaId, {
          limite: PAGINA,
          tipo,
          grupoId,
        });
        if (meu !== requisicao.current) return;
        setEventos(pagina.eventos);
        setCursor(pagina.proximo_cursor);
        setDesde(pagina.registrando_desde);
      } catch (e) {
        if (meu !== requisicao.current) return;
        // Falha ao ATUALIZAR não pode apagar o feed que já está na tela —
        // erro passageiro destruiria 50 eventos já carregados.
        if (silencioso) {
          toast({
            title: "Não foi possível atualizar",
            description: mensagemAmigavel(e, ERRO_CARGA),
            variant: "destructive",
          });
        } else {
          // `mensagemAmigavel` e não `.message`: sem ele, uma falha de rede
          // vaza o "Failed to fetch" cru do navegador para a tela.
          setErro(mensagemAmigavel(e, ERRO_CARGA));
        }
      } finally {
        if (meu === requisicao.current) {
          setCarregando(false);
          setAtualizando(false);
        }
      }
    },
    [campanhaId, tipo, grupoId, toast],
  );

  const carregarMais = async () => {
    if (!cursor || carregandoMais) return;
    // LÊ o contador sem incrementar: "carregar mais" não invalida nada, mas
    // precisa ser invalidado por qualquer troca de filtro. Sem isto, clicar
    // "Carregar mais" e trocar o chip logo em seguida anexava a página do
    // recorte ANTIGO na lista já filtrada — e pior, gravava o cursor dela.
    // O cursor do backend é só `"<iso>|<id>"`, sem o filtro dentro, então as
    // páginas seguintes continuariam paginando a partir do outro recorte.
    const meu = requisicao.current;
    setCarregandoMais(true);
    try {
      const pagina = await listarAtividade(campanhaId, {
        limite: PAGINA,
        cursor,
        tipo,
        grupoId,
      });
      if (meu !== requisicao.current) return;
      setEventos((atual) => [...atual, ...pagina.eventos]);
      setCursor(pagina.proximo_cursor);
    } catch (e) {
      if (meu !== requisicao.current) return;
      toast({
        title: "Não foi possível carregar mais",
        description: mensagemAmigavel(e, ERRO_CARGA),
        variant: "destructive",
      });
    } finally {
      setCarregandoMais(false);
    }
  };

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const dataInicial = soData(desde);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        {/* "a partir de agora" não significava nada — e nem era "agora": é
            desde que o primeiro grupo começou a ser acompanhado. A data sai do
            evento mais antigo, não de quando o grupo entrou na campanha: o
            feed não corta por data, e um grupo pode estar gravando eventos
            desde antes de entrar aqui. */}
        {dataInicial ? (
          <p className="max-w-xl text-xs text-muted-foreground">
            Entradas e saídas registradas desde {dataInicial}.
          </p>
        ) : (
          <span />
        )}
        <Button
          variant="outline"
          size="sm"
          disabled={carregando || atualizando}
          onClick={() => void carregar(true)}
        >
          {atualizando ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Atualizar
        </Button>
      </div>

      {/* Filtros em chips (regra mobile-first): visíveis e removíveis, não
          escondidos num Select. Filtram no SERVIDOR — sobre uma página de 50,
          filtrar no cliente daria "3 saídas" numa campanha com 300. */}
      <div className="flex flex-wrap gap-2">
        <div className="flex flex-wrap gap-1">
          {FILTROS.map((f) => (
            <Button
              key={f.rotulo}
              size="sm"
              variant={tipo === f.valor ? "default" : "outline"}
              onClick={() => setTipo(f.valor)}
            >
              {f.rotulo}
            </Button>
          ))}
        </div>
        {grupos.length > 1 && (
          <div className="flex flex-wrap gap-1">
            <Button
              size="sm"
              variant={grupoId === null ? "default" : "outline"}
              onClick={() => setGrupoId(null)}
            >
              Todos os grupos
            </Button>
            {grupos.map((g) => (
              <Button
                key={g.id}
                size="sm"
                variant={grupoId === g.id ? "default" : "outline"}
                onClick={() => setGrupoId(g.id)}
                title={g.nome}
              >
                {encurtarMeio(g.nome)}
              </Button>
            ))}
          </div>
        )}
      </div>

      {carregando ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
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
      ) : eventos.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-muted-foreground">
              {tipo || grupoId
                ? "Nenhum evento com esses filtros."
                : "Nenhuma entrada ou saída registrada ainda."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
            {/* Key pelo id do evento: com append de página, key de índice faz o
                React reaproveitar o nó errado. */}
            {eventos.map((e) => (
              <LinhaEvento key={e.id} evento={e} />
            ))}
          </div>
          {cursor && (
            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={() => void carregarMais()}
                disabled={carregandoMais}
              >
                {carregandoMais && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Carregar mais
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
