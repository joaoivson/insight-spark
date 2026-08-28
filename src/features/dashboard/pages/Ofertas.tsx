import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ExternalLink,
  ImageOff,
  Loader2,
  Search,
  Send,
  ShoppingBag,
  Store,
  X,
} from "lucide-react";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { EnvioRapidoModal } from "@/components/whatsapp/EnvioRapidoModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/shared/lib/chart-utils";
import { cn } from "@/shared/lib/utils";
import {
  BuscaOfertasError,
  buscarOfertas,
  listarIntegracoes,
  type Integracao,
  type Oferta,
  type OrdenacaoOferta,
} from "@/services/ofertas.service";

const LIMITE_POR_PAGINA = 20;

const ORDENACOES: { valor: OrdenacaoOferta; rotulo: string }[] = [
  { valor: "relevancia", rotulo: "Relevância" },
  { valor: "mais_vendidos", rotulo: "Mais vendidos" },
  { valor: "maior_comissao", rotulo: "Maior comissão" },
  { valor: "menor_preco", rotulo: "Menor preço" },
];

type Filtros = {
  ordenacao: OrdenacaoOferta;
  comissaoMin: number | null;
  precoMax: number | null;
  descontoMin: number | null;
};

const FILTROS_INICIAIS: Filtros = {
  // A tela abre nos mais vendidos: é o recorte que a afiliada quer ver primeiro,
  // e é o único em que a ordem da lista significa alguma coisa (o backend
  // ordena de fato por vendas — o `sortType` da Shopee é ranking, não ordenação).
  ordenacao: "mais_vendidos",
  comissaoMin: null,
  precoMax: null,
  descontoMin: null,
};

/** Texto pronto para o grupo. `{link}` é o que atribui a comissão — sempre presente. */
const textoSugerido = (oferta: Oferta) => {
  const por = formatCurrency(oferta.preco);
  const preco =
    oferta.preco_de && oferta.preco_de > oferta.preco
      ? `de ${formatCurrency(oferta.preco_de)} por ${por}`
      : por;
  return `${oferta.nome} — ${preco} 🔥\n{link}`;
};

// ── Chip de filtro numérico ──────────────────────────────────────────────────

type ChipNumericoProps = {
  rotulo: string;
  valor: number | null;
  onChange: (valor: number | null) => void;
  formatar: (valor: number) => string;
  passo?: string;
  ajuda: string;
};

const ChipNumerico = ({
  rotulo,
  valor,
  onChange,
  formatar,
  passo = "1",
  ajuda,
}: ChipNumericoProps) => {
  const [aberto, setAberto] = useState(false);
  const [rascunho, setRascunho] = useState("");
  const ativo = valor !== null;

  const abrir = (o: boolean) => {
    if (o) setRascunho(valor === null ? "" : String(valor));
    setAberto(o);
  };

  const aplicar = () => {
    const numero = parseFloat(rascunho.replace(",", "."));
    onChange(rascunho.trim() === "" || Number.isNaN(numero) || numero < 0 ? null : numero);
    setAberto(false);
  };

  return (
    <div
      className={cn(
        "inline-flex h-10 items-center rounded-full border transition-colors",
        ativo ? "border-primary/50 bg-primary/10" : "border-border bg-card hover:bg-accent/40",
      )}
    >
      <Popover open={aberto} onOpenChange={abrir}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "h-10 whitespace-nowrap rounded-full px-3.5 text-sm font-medium",
              ativo ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {ativo ? `${rotulo} ${formatar(valor)}` : rotulo}
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-60 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor={`filtro-${rotulo}`}>{rotulo}</Label>
            <Input
              id={`filtro-${rotulo}`}
              type="number"
              min="0"
              step={passo}
              inputMode="decimal"
              value={rascunho}
              onChange={(e) => setRascunho(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  aplicar();
                }
              }}
              placeholder={ajuda}
              autoFocus
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="flex-1" onClick={aplicar}>
              Aplicar
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-muted-foreground"
              onClick={() => {
                onChange(null);
                setAberto(false);
              }}
            >
              Limpar
            </Button>
          </div>
        </PopoverContent>
      </Popover>
      {ativo && (
        <button
          type="button"
          onClick={() => onChange(null)}
          aria-label={`Remover filtro ${rotulo}`}
          className="flex h-10 w-8 items-center justify-center rounded-r-full text-muted-foreground hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
};

// ── Card de oferta ───────────────────────────────────────────────────────────

const CardOferta = ({ oferta, onEnviar }: { oferta: Oferta; onEnviar: () => void }) => {
  const temDe = oferta.preco_de != null && oferta.preco_de > oferta.preco;
  return (
    /* No celular o card é horizontal: a imagem quadrada de largura total empurrava
       um único produto para a tela inteira e obrigava a rolar por oferta. */
    <article className="flex flex-row gap-3 overflow-hidden rounded-2xl border border-border bg-card p-3 sm:flex-col sm:gap-0 sm:p-0">
      <div className="relative aspect-square w-28 flex-shrink-0 self-start overflow-hidden rounded-xl bg-muted sm:w-full sm:self-auto sm:rounded-none">
        {oferta.imagem_url ? (
          <img
            src={oferta.imagem_url}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ImageOff className="h-8 w-8 text-muted-foreground" aria-hidden />
          </div>
        )}
        {oferta.desconto_pct > 0 && (
          <Badge className="absolute left-2 top-2 border-emerald-500/25 bg-emerald-500/90 text-white tabular-nums">
            -{Math.round(oferta.desconto_pct)}%
          </Badge>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2 sm:p-3">
        <h3 className="line-clamp-2 text-sm font-medium leading-snug text-foreground">
          {oferta.nome}
        </h3>
        {oferta.loja && (
          <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
            <Store className="h-3 w-3 flex-shrink-0" aria-hidden />
            <span className="truncate">{oferta.loja}</span>
          </p>
        )}

        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-base font-semibold tabular-nums text-foreground">
            {formatCurrency(oferta.preco)}
          </span>
          {temDe && (
            <span className="text-xs tabular-nums text-muted-foreground line-through">
              {formatCurrency(oferta.preco_de as number)}
            </span>
          )}
        </div>

        <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-xs">
          <dt className="text-muted-foreground">Comissão</dt>
          <dd className="text-right font-medium tabular-nums text-emerald-500">
            {oferta.comissao_pct.toFixed(1).replace(".", ",")}% ·{" "}
            {formatCurrency(oferta.comissao_valor)}
          </dd>
          <dt className="text-muted-foreground">Vendas</dt>
          <dd className="text-right tabular-nums text-foreground">
            {oferta.vendas.toLocaleString("pt-BR")}
          </dd>
        </dl>

        <div className="mt-auto flex gap-2 pt-2">
          <Button className="min-h-10 flex-1" onClick={onEnviar}>
            <Send className="mr-2 h-4 w-4" />
            Enviar agora
          </Button>
          <Button asChild variant="outline" className="min-h-10 w-10 flex-shrink-0 p-0">
            <a
              href={oferta.url}
              target="_blank"
              rel="noreferrer noopener"
              aria-label={`Abrir ${oferta.nome} na loja`}
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </div>
    </article>
  );
};

const GradeSkeleton = () => (
  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-6">
    {Array.from({ length: 12 }).map((_, i) => (
      <div
        key={i}
        className="flex flex-row gap-3 overflow-hidden rounded-2xl border border-border bg-card p-3 sm:flex-col sm:gap-0 sm:p-0"
      >
        <Skeleton className="aspect-square w-28 flex-shrink-0 rounded-xl sm:w-full sm:rounded-none" />
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:p-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    ))}
  </div>
);

// ── Página ───────────────────────────────────────────────────────────────────

const Ofertas = () => {
  const { toast } = useToast();

  const [termo, setTermo] = useState("");
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_INICIAIS);
  const [contaId, setContaId] = useState<number | null>(null);

  const [ofertas, setOfertas] = useState<Oferta[]>([]);
  const [pagina, setPagina] = useState(1);
  const [temProxima, setTemProxima] = useState(false);
  /** null = ninguém buscou ainda (estado inicial da tela). */
  const [termoBuscado, setTermoBuscado] = useState<string | null>(null);
  /** A tela abriu com a vitrine (sem termo) em vez de um resultado de busca. */
  const [ehVitrine, setEhVitrine] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [erro, setErro] = useState<BuscaOfertasError | null>(null);
  const [contas, setContas] = useState<Integracao[]>([]);

  const [ofertaEnvio, setOfertaEnvio] = useState<Oferta | null>(null);

  // Sequenciador: "Carregar mais" + troca de filtro rodam em paralelo, e a
  // resposta antiga chegando depois anexava ofertas que o filtro novo já
  // tinha excluído (e bagunçava pagina/temProxima).
  const pedidoAtual = useRef(0);

  const buscar = useCallback(
    async (
      termoBusca: string,
      paginaAlvo: number,
      filtrosAtuais: Filtros,
      integracaoId: number | null,
    ) => {
      const ehPrimeira = paginaAlvo === 1;
      const meuPedido = ++pedidoAtual.current;
      if (ehPrimeira) setCarregando(true);
      else setCarregandoMais(true);
      if (ehPrimeira) setErro(null);

      try {
        const resultado = await buscarOfertas({
          q: termoBusca,
          ordenacao: filtrosAtuais.ordenacao,
          pagina: paginaAlvo,
          limite: LIMITE_POR_PAGINA,
          comissao_minima: filtrosAtuais.comissaoMin ?? undefined,
          preco_max: filtrosAtuais.precoMax ?? undefined,
          desconto_minimo: filtrosAtuais.descontoMin ?? undefined,
          filter_integracao_id: integracaoId ?? undefined,
        });
        if (meuPedido !== pedidoAtual.current) return;   // chegou tarde
        setOfertas((atual) =>
          ehPrimeira ? resultado.ofertas : [...atual, ...resultado.ofertas],
        );
        setPagina(resultado.pagina);
        setTemProxima(resultado.tem_proxima);
        setTermoBuscado(termoBusca);
        setEhVitrine(Boolean(resultado.vitrine));
      } catch (e) {
        if (meuPedido !== pedidoAtual.current) return;   // erro de pedido velho
        const falha =
          e instanceof BuscaOfertasError
            ? e
            : new BuscaOfertasError((e as Error).message, "desconhecido");

        // Falha ao paginar não pode apagar o que já está na tela.
        if (!ehPrimeira) {
          toast({
            title: "Não foi possível carregar mais",
            description: falha.message,
            variant: "destructive",
          });
          return;
        }

        setErro(falha);
        setOfertas([]);
        setTemProxima(false);
        setTermoBuscado(termoBusca);
        if (falha.motivo === "escolha") {
          listarIntegracoes()
            .then(setContas)
            .catch(() => setContas([]));
        }
      } finally {
        if (meuPedido === pedidoAtual.current) {
          setCarregando(false);
          setCarregandoMais(false);
        }
      }
    },
    [toast],
  );

  // Abrir a tela já com ofertas, em vez de um campo de busca vazio. Sem termo,
  // a `productOfferV2` devolve a vitrine da conta — e o backend a ordena por
  // vendas de fato (o `sortType` da Shopee é ranking, não ordenação).
  const vitrineCarregada = useRef(false);
  useEffect(() => {
    if (vitrineCarregada.current) return;
    vitrineCarregada.current = true;
    void buscar("", 1, FILTROS_INICIAIS, null);
  }, [buscar]);

  const submeterBusca = (e: React.FormEvent) => {
    e.preventDefault();
    const q = termo.trim();
    if (!q) return;
    void buscar(q, 1, filtros, contaId);
  };

  const aplicarFiltros = (patch: Partial<Filtros>) => {
    const proximos = { ...filtros, ...patch };
    setFiltros(proximos);
    // `termoBuscado` é "" na vitrine — comparar com null, não por truthiness,
    // senão filtrar não faz nada na tela recém-aberta.
    if (termoBuscado !== null) void buscar(termoBuscado, 1, proximos, contaId);
  };

  const escolherConta = (id: number) => {
    setContaId(id);
    void buscar(termoBuscado ?? termo.trim(), 1, filtros, id);
  };

  const contasDaEscolha = contas.filter(
    (c) =>
      c.ativa &&
      (!erro?.provedor || c.provedor === erro.provedor) &&
      (erro?.escolha.length ? erro.escolha.includes(c.label) : true),
  );

  const contaAtiva = contaId ? contas.find((c) => c.id === contaId) : null;

  return (
    <DashboardLayout title="Ofertas">
      <div className="space-y-5">
        {/* Busca */}
        <form onSubmit={submeterBusca} className="flex gap-2">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={termo}
              onChange={(e) => setTermo(e.target.value)}
              placeholder="Buscar produto ou categoria…"
              aria-label="Buscar ofertas"
              className="h-11 pl-9"
            />
          </div>
          <Button
            type="submit"
            disabled={!termo.trim() || carregando}
            className="h-11 flex-shrink-0 px-4 sm:w-32"
          >
            {carregando ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Search className="mr-2 h-4 w-4" />
            )}
            Buscar
          </Button>
        </form>

        {/* Filtros em chips */}
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={filtros.ordenacao}
              onValueChange={(v) => aplicarFiltros({ ordenacao: v as OrdenacaoOferta })}
            >
              <SelectTrigger
                className="h-10 w-auto gap-2 rounded-full border-border bg-card px-3.5 text-sm font-medium"
                aria-label="Ordenação"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ORDENACOES.map((o) => (
                  <SelectItem key={o.valor} value={o.valor}>
                    {o.rotulo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <ChipNumerico
              rotulo="Comissão mín."
              valor={filtros.comissaoMin}
              onChange={(v) => aplicarFiltros({ comissaoMin: v })}
              formatar={(v) => `${v}%`}
              passo="0.5"
              ajuda="Ex.: 10"
            />
            <ChipNumerico
              rotulo="Preço máx."
              valor={filtros.precoMax}
              onChange={(v) => aplicarFiltros({ precoMax: v })}
              formatar={(v) => formatCurrency(v)}
              passo="1"
              ajuda="Ex.: 100"
            />
            <ChipNumerico
              rotulo="Desconto mín."
              valor={filtros.descontoMin}
              onChange={(v) => aplicarFiltros({ descontoMin: v })}
              formatar={(v) => `${v}%`}
              passo="5"
              ajuda="Ex.: 20"
            />

            {contaAtiva && (
              <div className="inline-flex h-10 items-center rounded-full border border-primary/50 bg-primary/10">
                <span className="px-3.5 text-sm font-medium text-foreground">
                  Conta: {contaAtiva.label}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setContaId(null);
                    if (termoBuscado !== null)
                      void buscar(termoBuscado, 1, filtros, null);
                  }}
                  aria-label="Remover filtro de conta"
                  className="flex h-10 w-8 items-center justify-center rounded-r-full text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Comissão, preço e desconto filtram a página exibida.
          </p>
        </div>

        {/* Resultado */}
        {erro?.motivo === "sem_conta" ? (
          <div className="rounded-2xl border border-border bg-card p-6 text-center">
            <ShoppingBag className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden />
            <p className="mt-3 font-medium text-foreground">Conecte sua conta Shopee</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
              A busca assina com a sua credencial — é ela que garante a comissão na sua conta.
            </p>
            <Button asChild className="mt-4 min-h-10">
              <Link to="/dashboard/configuracoes?tab=marketplaces">Conectar conta</Link>
            </Button>
          </div>
        ) : erro?.motivo === "escolha" ? (
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="font-medium text-foreground">Qual conta usar nesta busca?</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Você tem mais de uma conta conectada nesse marketplace.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {contasDaEscolha.length > 0 ? (
                contasDaEscolha.map((c) => (
                  <Button
                    key={c.id}
                    variant="outline"
                    className="min-h-10"
                    onClick={() => escolherConta(c.id)}
                  >
                    {c.label}
                  </Button>
                ))
              ) : (
                <Button asChild variant="outline" className="min-h-10">
                  <Link to="/dashboard/configuracoes?tab=marketplaces">Ver minhas contas</Link>
                </Button>
              )}
            </div>
          </div>
        ) : erro ? (
          <div className="rounded-2xl border border-border bg-card p-6 text-center">
            <p className="font-medium text-foreground">{erro.message}</p>
            {erro.motivo !== "termo" && (
              <Button
                variant="outline"
                className="mt-4 min-h-10"
                onClick={() =>
                  termoBuscado !== null && void buscar(termoBuscado, 1, filtros, contaId)
                }
              >
                Tentar de novo
              </Button>
            )}
          </div>
        ) : carregando ? (
          <GradeSkeleton />
        ) : termoBuscado === null ? (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center">
            <Search className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden />
            <p className="mt-3 font-medium text-foreground">
              Busque por um produto ou categoria para ver ofertas
            </p>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
              Ex.: air fryer, perfume importado, tênis de corrida.
            </p>
          </div>
        ) : ofertas.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <p className="font-medium text-foreground">
              {ehVitrine
                ? "Nenhuma oferta disponível agora — busque por um produto"
                : `Nada encontrado para “${termoBuscado}” — tente outro termo`}
            </p>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
              Filtros de comissão, preço ou desconto também podem estar cortando tudo desta página.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-6">
              {ofertas.map((o) => (
                <CardOferta
                  key={`${o.item_id}-${o.url}`}
                  oferta={o}
                  onEnviar={() => setOfertaEnvio(o)}
                />
              ))}
            </div>
            {temProxima && (
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  className="min-h-10 w-full sm:w-auto"
                  disabled={carregandoMais}
                  onClick={() =>
                    void buscar(termoBuscado ?? "", pagina + 1, filtros, contaId)
                  }
                >
                  {carregandoMais && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Carregar mais
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      <EnvioRapidoModal
        open={ofertaEnvio !== null}
        onOpenChange={(o) => {
          if (!o) setOfertaEnvio(null);
        }}
        valoresIniciais={
          ofertaEnvio
            ? { texto: textoSugerido(ofertaEnvio), oferta_url: ofertaEnvio.url }
            : undefined
        }
      />
    </DashboardLayout>
  );
};

export default Ofertas;
