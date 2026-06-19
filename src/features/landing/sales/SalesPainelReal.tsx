import { Search, Ban, Zap } from "lucide-react";

/* ------------------------------------------------------------------ */
/* Tipos auxiliares                                                    */
/* ------------------------------------------------------------------ */

type KpiCard = {
  label: string;
  value: string;
  sub?: string;
  valueClassName?: string;
  highlight?: boolean;
};

type CampaignMetric = {
  label: string;
  value: string;
  sub?: string;
  valueClassName?: string;
};

type Campaign = {
  barColor: string;
  toggleOn: boolean;
  title: string;
  subId: string;
  budget: string;
  metrics: CampaignMetric[];
};

/* ------------------------------------------------------------------ */
/* Dados estáticos (visual)                                            */
/* ------------------------------------------------------------------ */

const KPI_CARDS: KpiCard[] = [
  { label: "CPC médio", value: "R$ 0,07" },
  { label: "Gasto", value: "R$ 5.870", sub: "sem imposto: R$ 5.157" },
  { label: "Comissão", value: "R$ 8.450", sub: "bruto: R$ 8.990" },
  { label: "Lucro", value: "+R$ 2.580", valueClassName: "text-[#2BD699]" },
  {
    label: "ROAS Real",
    value: "1.44x",
    valueClassName: "text-[#2BD699]",
    highlight: true,
  },
  { label: "Orç/dia", value: "R$ 620,00", valueClassName: "text-[#7CB8F2]" },
];

const CAMPAIGNS: Campaign[] = [
  {
    barColor: "#FF6B66",
    toggleOn: true,
    title: "Publicação Instagram · achadinho verão",
    subId: "oferta_verao",
    budget: "R$ 150,00",
    metrics: [
      { label: "Gasto", value: "R$ 909,21", sub: "s/ imposto: R$ 798,74" },
      { label: "Comissão", value: "R$ 667,96", sub: "bruto: R$ 710,60" },
      { label: "Lucro", value: "-R$ 241,24", valueClassName: "text-[#FF6B66]" },
      { label: "ROAS Real", value: "0.72x", valueClassName: "text-[#FF6B66]" },
      { label: "CPC", value: "R$ 0,15" },
    ],
  },
  {
    barColor: "#2BD699",
    toggleOn: true,
    title: "Publicação Instagram · kit cozinha",
    subId: "kit_cozinha",
    budget: "R$ 120,00",
    metrics: [
      { label: "Gasto", value: "R$ 588,00", sub: "s/ imposto: R$ 517,00" },
      { label: "Comissão", value: "R$ 845,00", sub: "bruto: R$ 899,00" },
      { label: "Lucro", value: "+R$ 257,00", valueClassName: "text-[#2BD699]" },
      { label: "ROAS Real", value: "1.44x", valueClassName: "text-[#2BD699]" },
      { label: "CPC", value: "R$ 0,06" },
    ],
  },
  {
    barColor: "#F0A94A",
    toggleOn: true,
    title: "Publicação Instagram · linkpromo",
    subId: "linkpromo03",
    budget: "R$ 50,00",
    metrics: [
      { label: "Gasto", value: "R$ 408,73", sub: "s/ imposto: R$ 359,07" },
      { label: "Comissão", value: "R$ 501,23", sub: "bruto: R$ 533,22" },
      { label: "Lucro", value: "+R$ 92,50", valueClassName: "text-[#2BD699]" },
      { label: "ROAS Real", value: "1.23x", valueClassName: "text-[#2BD699]" },
      { label: "CPC", value: "R$ 0,07" },
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Subcomponentes visuais (puros, estáticos)                           */
/* ------------------------------------------------------------------ */

function Toggle({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
        on ? "bg-[#318CE9]" : "bg-white/[0.12]"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          on ? "translate-x-[18px]" : "translate-x-[2px]"
        }`}
      />
    </span>
  );
}

function ActiveBadge() {
  return (
    <span className="inline-flex items-center rounded-full bg-[#2BD699]/[0.12] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[#2BD699] ring-1 ring-inset ring-[#2BD699]/20">
      Ativa
    </span>
  );
}

function FilterChip({
  children,
  active,
}: {
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap ${
        active
          ? "bg-[#318CE9]/[0.16] text-[#7CB8F2] ring-1 ring-inset ring-[#318CE9]/30"
          : "bg-white/[0.04] text-[#9aa3b2] ring-1 ring-inset ring-white/[0.06]"
      }`}
    >
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Seção principal                                                     */
/* ------------------------------------------------------------------ */

export default function SalesPainelReal() {
  return (
    <section
      id="painel"
      className="bg-[#0B1018] px-6 py-20 md:py-24 font-manrope"
    >
      <div className="mx-auto max-w-[1140px]">
        {/* Cabeçalho centralizado */}
        <div className="flex flex-col items-center text-center">
          <span className="font-jbmono text-xs uppercase tracking-[0.14em] text-[#7CB8F2]">
            Painel real
          </span>
          <h2 className="mt-4 font-grotesk text-3xl font-bold leading-tight tracking-tight text-[#F5F7FA] md:text-4xl">
            Veja qual campanha dá lucro
            <br />
            —{" "}
            <span className="bg-gradient-to-r from-[#318CE9] to-[#2BD699] bg-clip-text text-transparent">
              aja na hora.
            </span>
          </h2>
          <p className="mt-5 max-w-[680px] text-[#9aa3b2]">
            Cada campanha com seu ROAS Real, lado a lado. Pause a que está no
            vermelho, aumente o orçamento da que voa — tudo de dentro do
            MarketDash, sem abrir o Gerenciador.
          </p>
        </div>

        {/* -------------------------------------------------------- */}
        {/* PREVIEW DESKTOP — frame de navegador                      */}
        {/* -------------------------------------------------------- */}
        <div className="mt-12 hidden md:block">
          <div className="overflow-hidden rounded-[18px] border border-white/[0.08] bg-[#0B0F17]">
            {/* Barra do navegador */}
            <div className="flex items-center gap-4 border-b border-white/[0.08] px-4 py-3">
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-[#FF6B66]/80" />
                <span className="h-3 w-3 rounded-full bg-[#F0A94A]/80" />
                <span className="h-3 w-3 rounded-full bg-[#2BD699]/80" />
              </div>
              <span className="flex-1 truncate rounded-md bg-white/[0.04] px-3 py-1 text-center font-jbmono text-xs text-[#9aa3b2]">
                app.marketdash.com.br/campanhas
              </span>
              <span className="hidden shrink-0 font-jbmono text-[11px] text-[#6B7280] lg:block">
                Facebook · hoje 09:42 / Shopee · hoje 11:48
              </span>
            </div>

            {/* Conteúdo do app */}
            <div className="space-y-5 p-6">
              {/* Header da tela */}
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 className="font-grotesk text-xl font-bold text-[#F5F7FA]">
                    Campanhas
                  </h3>
                  <p className="mt-1 max-w-[520px] text-sm text-[#9aa3b2]">
                    Ative, pause e ajuste o orçamento. Vincule ao Sub ID para ver
                    as vendas.
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-sm font-medium text-[#9aa3b2]">
                    Exportar
                  </span>
                  <span className="rounded-lg bg-[#318CE9] px-3 py-1.5 text-sm font-medium text-white">
                    Atualizar dados
                  </span>
                </div>
              </div>

              {/* Busca */}
              <div className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2">
                <Search className="h-4 w-4 text-[#6B7280]" />
                <input
                  readOnly
                  value=""
                  placeholder="Buscar campanha"
                  className="w-full bg-transparent text-sm text-[#F5F7FA] placeholder:text-[#6B7280] focus:outline-none"
                />
              </div>

              {/* Filtros */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <FilterChip>Todas</FilterChip>
                  <FilterChip>Gasto</FilterChip>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <FilterChip active>7 dias</FilterChip>
                  <FilterChip>14 dias</FilterChip>
                  <FilterChip>Mês atual</FilterChip>
                  <FilterChip>Personalizado</FilterChip>
                </div>
              </div>

              {/* KPI cards */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {KPI_CARDS.map((kpi) => (
                  <div
                    key={kpi.label}
                    className={`rounded-xl border bg-[#10141F] p-3 ${
                      kpi.highlight
                        ? "border-[#318CE9]/40 ring-1 ring-inset ring-[#318CE9]/20"
                        : "border-white/[0.08]"
                    }`}
                  >
                    <p className="font-jbmono text-[10px] uppercase tracking-wide text-[#6B7280]">
                      {kpi.label}
                    </p>
                    <p
                      className={`mt-1.5 truncate text-lg font-bold ${
                        kpi.valueClassName ?? "text-[#F5F7FA]"
                      }`}
                    >
                      {kpi.value}
                    </p>
                    {kpi.sub && (
                      <p className="mt-0.5 truncate text-[11px] text-[#6B7280]">
                        {kpi.sub}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* Banners de alerta */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] p-3.5">
                  <Ban className="h-5 w-5 shrink-0 text-[#9aa3b2]" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[#F5F7FA]">
                      5 campanhas sem vínculo
                    </p>
                    <p className="truncate text-xs text-[#9aa3b2]">
                      R$ 164,20 gastos sem vendas atribuídas
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-[#FF6B66]/30 bg-[#FF6B66]/[0.08] p-3.5">
                  <Zap className="h-5 w-5 shrink-0 text-[#FF6B66]" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[#F5F7FA]">
                      8 campanhas com ROAS abaixo de 1
                    </p>
                    <p className="truncate text-xs text-[#E58A7E]">
                      está gastando mais do que retorna
                    </p>
                  </div>
                </div>
              </div>

              {/* Cards de campanha */}
              <div className="space-y-3">
                {CAMPAIGNS.map((c) => (
                  <div
                    key={c.subId}
                    className="flex overflow-hidden rounded-xl border border-white/[0.08] bg-[#10141F]"
                  >
                    <span
                      aria-hidden
                      className="w-1 shrink-0"
                      style={{ backgroundColor: c.barColor }}
                    />
                    <div className="min-w-0 flex-1 p-4">
                      {/* Linha superior do card */}
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <Toggle on={c.toggleOn} />
                          <span className="truncate text-sm font-medium text-[#F5F7FA]">
                            {c.title}
                          </span>
                          <ActiveBadge />
                          <span className="font-jbmono text-xs text-[#7CB8F2]">
                            {c.subId}
                          </span>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="text-[11px] text-[#6B7280]">
                            Orç/dia
                          </span>
                          <input
                            readOnly
                            value={c.budget}
                            className="w-[96px] rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-right text-sm text-[#F5F7FA] focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Resumo de métricas */}
                      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                        {c.metrics.map((m) => (
                          <div key={m.label} className="min-w-0">
                            <p className="font-jbmono text-[10px] uppercase tracking-wide text-[#6B7280]">
                              {m.label}
                            </p>
                            <p
                              className={`mt-1 truncate text-sm font-semibold ${
                                m.valueClassName ?? "text-[#F5F7FA]"
                              }`}
                            >
                              {m.value}
                            </p>
                            {m.sub && (
                              <p className="mt-0.5 truncate text-[11px] text-[#6B7280]">
                                {m.sub}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* -------------------------------------------------------- */}
        {/* PREVIEW MOBILE — versão simplificada                      */}
        {/* -------------------------------------------------------- */}
        <div className="mt-10 block md:hidden">
          <div className="overflow-hidden rounded-[18px] border border-white/[0.08] bg-[#0B0F17] p-4">
            <h3 className="font-grotesk text-lg font-bold text-[#F5F7FA]">
              Campanhas
            </h3>

            {/* Banners menores */}
            <div className="mt-4 space-y-2.5">
              <div className="flex items-center gap-2.5 rounded-lg border border-white/[0.08] bg-white/[0.03] p-3">
                <Ban className="h-4 w-4 shrink-0 text-[#9aa3b2]" />
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-[#F5F7FA]">
                    5 campanhas sem vínculo
                  </p>
                  <p className="truncate text-[11px] text-[#9aa3b2]">
                    R$ 164,20 gastos sem vendas atribuídas
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 rounded-lg border border-[#FF6B66]/30 bg-[#FF6B66]/[0.08] p-3">
                <Zap className="h-4 w-4 shrink-0 text-[#FF6B66]" />
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-[#F5F7FA]">
                    8 campanhas com ROAS abaixo de 1
                  </p>
                  <p className="truncate text-[11px] text-[#E58A7E]">
                    está gastando mais do que retorna
                  </p>
                </div>
              </div>
            </div>

            {/* 2 cards de campanha (vertical) */}
            <div className="mt-4 space-y-3">
              {CAMPAIGNS.slice(0, 2).map((c) => (
                <div
                  key={c.subId}
                  className="flex overflow-hidden rounded-lg border border-white/[0.08] bg-[#10141F]"
                >
                  <span
                    aria-hidden
                    className="w-1 shrink-0"
                    style={{ backgroundColor: c.barColor }}
                  />
                  <div className="min-w-0 flex-1 p-3.5">
                    <div className="flex items-center gap-2">
                      <Toggle on={c.toggleOn} />
                      <span className="truncate text-[13px] font-medium text-[#F5F7FA]">
                        {c.title}
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <ActiveBadge />
                      <span className="font-jbmono text-[11px] text-[#7CB8F2]">
                        {c.subId}
                      </span>
                    </div>

                    {/* Métricas empilhadas (label/valor) */}
                    <dl className="mt-3 divide-y divide-white/[0.06]">
                      {c.metrics.map((m) => (
                        <div
                          key={m.label}
                          className="flex items-center justify-between gap-3 py-1.5"
                        >
                          <dt className="font-jbmono text-[11px] uppercase tracking-wide text-[#6B7280]">
                            {m.label}
                          </dt>
                          <dd className="min-w-0 text-right">
                            <span
                              className={`block truncate text-[13px] font-semibold ${
                                m.valueClassName ?? "text-[#F5F7FA]"
                              }`}
                            >
                              {m.value}
                            </span>
                            {m.sub && (
                              <span className="block truncate text-[10px] text-[#6B7280]">
                                {m.sub}
                              </span>
                            )}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Legenda final */}
        <p className="mx-auto mt-10 max-w-[680px] text-center text-[#9aa3b2]">
          Duas no verde, uma no vermelho. Você vê na hora qual cortar — e pausa
          sem sair daqui.
        </p>
      </div>
    </section>
  );
}
