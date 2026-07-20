import {
  Check,
  ArrowRight,
  Wallet,
  Megaphone,
  TrendingUp,
  Gauge,
  ShoppingBag,
} from "lucide-react";

/**
 * SalesHero — HERO da nova Página de Vendas (landing pública) do MarketDash.
 * Dark mode, mobile-first. Sem libs externas além de lucide-react.
 * Réplica visual estática do dashboard (preview) — sem dados reais.
 */

// Dados estáticos do mini gráfico (7 dias) usado no preview do dashboard.
const CHART_DAYS = [
  { day: "08/06", comissao: 64, gasto: 48, lucro: 22 },
  { day: "09/06", comissao: 52, gasto: 41, lucro: 16 },
  { day: "10/06", comissao: 78, gasto: 55, lucro: 30 },
  { day: "11/06", comissao: 70, gasto: 60, lucro: 18 },
  { day: "12/06", comissao: 88, gasto: 62, lucro: 34 },
  { day: "13/06", comissao: 60, gasto: 50, lucro: 14 },
  { day: "14/06", comissao: 95, gasto: 66, lucro: 38 },
];

const KPI_CARDS = [
  {
    label: "Comissão",
    value: "R$ 8.450",
    sub: "bruto: R$ 8.990",
    icon: Wallet,
    valueClass: "text-[#F5F7FA]",
    highlight: false,
  },
  {
    label: "Gasto Anúncios",
    value: "R$ 5.870",
    sub: "sem imposto: R$ 5.157",
    icon: Megaphone,
    valueClass: "text-[#F5F7FA]",
    highlight: false,
  },
  {
    label: "Lucro Líquido",
    value: "+R$ 2.580",
    sub: "depois do imposto",
    icon: TrendingUp,
    valueClass: "text-[#2BD699]",
    highlight: false,
  },
  {
    label: "ROAS Real",
    value: "1.44x",
    sub: "comissão / gasto",
    icon: Gauge,
    valueClass: "text-[#2BD699]",
    highlight: true,
  },
  {
    label: "Pedidos",
    value: "1.240",
    sub: "diretos: 612 · 49%",
    icon: ShoppingBag,
    valueClass: "text-[#F5F7FA]",
    highlight: false,
  },
];

const FILTER_CHIPS = [
  { label: "7 dias", active: true },
  { label: "14 dias", active: false },
  { label: "Mês atual", active: false },
  { label: "01/06 - 07/06", active: false },
  { label: "Status: Todos", active: false },
  { label: "Categoria: Todas", active: false },
  { label: "Sub ID: Todos", active: false },
];

const TRUST_ITEMS = [
  { label: "Conecta em minutos", strong: false },
  { label: "Sem planilha", strong: false },
  { label: "API oficial Shopee", strong: false },
  { label: "Integração Facebook Ads", strong: false },
  { label: "7 dias de garantia", strong: true },
];

const STATS = [
  { value: "Zero planilha", sub: "conecta e atualiza sozinho" },
  { value: "ROAS Real", sub: "com imposto descontado" },
  { value: "Controle total", sub: "pause e ajuste sem abrir o Gerenciador" },
];

// Escala máxima do gráfico para normalizar as alturas das barras.
const CHART_MAX = 100;

export default function SalesHero() {
  return (
    <header className="relative overflow-hidden bg-[#090D16] px-6 pt-8 pb-16 md:py-24 font-manrope text-[#F5F7FA]">
      {/* Brilho radial azul no topo */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-[-180px] -z-0 h-[420px] w-[820px] max-w-[140vw] -translate-x-1/2 rounded-full opacity-60 blur-[120px]"
        style={{
          background:
            "radial-gradient(closest-side, rgba(49,140,233,0.30), transparent 70%)",
        }}
      />
      {/* Grid sutil mascarado */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-0 opacity-[0.18]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(124,184,242,0.10) 1px, transparent 1px), linear-gradient(90deg, rgba(124,184,242,0.10) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage:
            "radial-gradient(ellipse 70% 55% at 50% 0%, #000 35%, transparent 75%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 70% 55% at 50% 0%, #000 35%, transparent 75%)",
        }}
      />

      <div className="relative z-10 mx-auto max-w-[1140px]">
        {/* Badges */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#318CE9]/30 bg-[#318CE9]/10 px-4 py-[7px] font-jbmono text-xs uppercase tracking-[0.06em] text-[#7CB8F2]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#318CE9]" />
            Para afiliados Shopee que rodam tráfego
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-[7px] font-jbmono text-xs uppercase tracking-[0.06em] text-[#9aa3b2]">
            <Check className="h-3.5 w-3.5 text-[#2BD699]" strokeWidth={3} />
            Com API oficial Shopee + Meta
          </span>
        </div>

        {/* H1 */}
        <h1 className="mx-auto mt-8 max-w-[920px] text-center font-grotesk text-5xl font-bold leading-tight tracking-tight md:text-6xl lg:text-7xl">
          Conecte Shopee e Meta.
          <br />
          Veja o{" "}
          <span className="bg-gradient-to-r from-[#318CE9] to-[#2BD699] bg-clip-text text-transparent">
            lucro real
          </span>{" "}
          de cada campanha — sem planilha.
        </h1>

        {/* Subtítulo */}
        <p className="mx-auto mt-6 max-w-[660px] text-center text-base text-[#9aa3b2] md:text-lg">
          O MarketDash junta seu gasto em anúncios com sua comissão da Shopee,
          por Sub ID, e mostra quanto cada campanha realmente lucra — já com
          imposto. Escale o que dá lucro, corte o que queima dinheiro. Tudo num
          lugar só.
        </p>

        {/* CTA */}
        <div className="mt-8 flex justify-center">
          <a
            href="#precos"
            className="inline-flex items-center gap-2 rounded-[13px] bg-[#318CE9] px-[30px] py-4 font-bold text-[#031426] transition-colors hover:bg-[#4a9bee]"
          >
            Começar agora
            <ArrowRight className="h-5 w-5" strokeWidth={2.5} />
          </a>
        </div>

        {/* Linha de confiança */}
        <ul className="mx-auto mt-7 flex max-w-[760px] flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm">
          {TRUST_ITEMS.map((item) => (
            <li
              key={item.label}
              className={`inline-flex items-center gap-1.5 ${
                item.strong ? "font-bold text-[#2BD699]" : "text-[#9aa3b2]"
              }`}
            >
              <Check
                className={`h-4 w-4 shrink-0 ${
                  item.strong ? "text-[#2BD699]" : "text-[#2BD699]"
                }`}
                strokeWidth={3}
              />
              {item.label}
            </li>
          ))}
        </ul>

        {/* Stats */}
        <div className="mt-12 flex flex-wrap items-start justify-center gap-x-12 gap-y-6 text-center">
          {STATS.map((stat) => (
            <div key={stat.value} className="min-w-[140px]">
              <div className="font-grotesk text-[22px] font-bold leading-tight text-[#F5F7FA]">
                {stat.value}
              </div>
              <div className="mt-1 text-xs text-[#9aa3b2]">{stat.sub}</div>
            </div>
          ))}
        </div>

        {/* ===================== PREVIEW DESKTOP ===================== */}
        <div className="mt-16 hidden md:block">
          <div className="overflow-hidden rounded-[18px] border border-white/[0.09] bg-[#0B0F17] shadow-2xl shadow-black/50">
            {/* Barra do navegador */}
            <div className="flex items-center gap-3 border-b border-white/[0.08] px-4 py-3">
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-[#FF6B66]" />
                <span className="h-3 w-3 rounded-full bg-[#F0A94A]" />
                <span className="h-3 w-3 rounded-full bg-[#2BD699]" />
              </div>
              <div className="ml-2 flex-1">
                <div className="inline-flex max-w-full items-center rounded-md bg-white/[0.04] px-3 py-1 font-jbmono text-xs text-[#9aa3b2]">
                  app.marketdash.com.br/dashboard
                </div>
              </div>
            </div>

            {/* Conteúdo do dashboard */}
            <div className="p-6">
              <div className="flex items-center justify-between">
                <h3 className="font-grotesk text-2xl font-bold text-[#F5F7FA]">
                  Dashboard
                </h3>
                {/* Tabs */}
                <div className="flex items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.03] p-1">
                  <span className="rounded-md bg-[#318CE9] px-3 py-1.5 text-xs font-semibold text-[#031426]">
                    Comissão
                  </span>
                  <span className="rounded-md px-3 py-1.5 text-xs font-semibold text-[#9aa3b2]">
                    Cliques
                  </span>
                </div>
              </div>

              {/* Filtros em chips */}
              <div className="mt-4 flex flex-wrap gap-2">
                {FILTER_CHIPS.map((chip) => (
                  <span
                    key={chip.label}
                    className={`rounded-full border px-3 py-1 text-xs ${
                      chip.active
                        ? "border-[#318CE9]/40 bg-[#318CE9]/15 text-[#7CB8F2]"
                        : "border-white/[0.08] bg-white/[0.02] text-[#9aa3b2]"
                    }`}
                  >
                    {chip.label}
                  </span>
                ))}
              </div>

              {/* KPI cards */}
              <div className="mt-5 grid grid-cols-5 gap-3">
                {KPI_CARDS.map((kpi) => {
                  const Icon = kpi.icon;
                  return (
                    <div
                      key={kpi.label}
                      className={`rounded-xl border p-3 ${
                        kpi.highlight
                          ? "border-[#318CE9]/40 bg-[#318CE9]/[0.08]"
                          : "border-white/[0.08] bg-[#10141F]"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 text-[#9aa3b2]">
                        <Icon className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate text-[11px] font-medium uppercase tracking-wide">
                          {kpi.label}
                        </span>
                      </div>
                      <div
                        className={`mt-2 truncate font-grotesk text-xl font-bold ${kpi.valueClass}`}
                      >
                        {kpi.value}
                      </div>
                      <div className="mt-0.5 truncate text-[11px] text-[#6B7280]">
                        {kpi.sub}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Gráfico */}
              <div className="mt-5 rounded-xl border border-white/[0.08] bg-[#10141F] p-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-grotesk text-sm font-bold text-[#F5F7FA]">
                    Comissão, Gasto e Lucro por dia
                  </h4>
                  <div className="flex items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.03] p-0.5">
                    <span className="rounded-md bg-[#318CE9] px-2.5 py-1 text-[11px] font-semibold text-[#031426]">
                      Dia
                    </span>
                    <span className="rounded-md px-2.5 py-1 text-[11px] font-semibold text-[#9aa3b2]">
                      Mês
                    </span>
                  </div>
                </div>

                <BarChart className="mt-4 h-44" />

                {/* Legenda */}
                <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-[11px] text-[#9aa3b2]">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-sm bg-[#318CE9]" />
                    Comissão líquida
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-sm bg-[#E58A7E]" />
                    Gasto c/ imposto
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-[3px] w-4 rounded-full bg-[#2BD699]" />
                    Lucro
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ===================== PREVIEW MOBILE ===================== */}
        <div className="mt-12 block md:hidden">
          <div className="overflow-hidden rounded-[18px] border border-white/[0.09] bg-[#0B0F17] p-4 shadow-xl shadow-black/40">
            {/* ROAS em destaque */}
            <div className="rounded-xl border border-[#318CE9]/40 bg-[#318CE9]/[0.08] p-4 text-center">
              <div className="flex items-center justify-center gap-1.5 text-[#9aa3b2]">
                <Gauge className="h-3.5 w-3.5" />
                <span className="text-[11px] font-medium uppercase tracking-wide">
                  ROAS Real
                </span>
              </div>
              <div className="mt-1 font-grotesk text-3xl font-bold text-[#2BD699]">
                1.44x
              </div>
              <div className="mt-0.5 text-[11px] text-[#6B7280]">
                com imposto descontado
              </div>
            </div>

            {/* Grid 2x2 de mini KPIs */}
            <div className="mt-3 grid grid-cols-2 gap-3">
              {[
                {
                  label: "Comissão",
                  value: "R$ 8.450",
                  icon: Wallet,
                  cls: "text-[#F5F7FA]",
                },
                {
                  label: "Gasto",
                  value: "R$ 5.870",
                  icon: Megaphone,
                  cls: "text-[#F5F7FA]",
                },
                {
                  label: "Lucro",
                  value: "+R$ 2.580",
                  icon: TrendingUp,
                  cls: "text-[#2BD699]",
                },
                {
                  label: "Pedidos",
                  value: "1.240",
                  icon: ShoppingBag,
                  cls: "text-[#F5F7FA]",
                },
              ].map((kpi) => {
                const Icon = kpi.icon;
                return (
                  <div
                    key={kpi.label}
                    className="rounded-xl border border-white/[0.08] bg-[#10141F] p-3"
                  >
                    <div className="flex items-center gap-1.5 text-[#9aa3b2]">
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate text-[11px] font-medium uppercase tracking-wide">
                        {kpi.label}
                      </span>
                    </div>
                    <div
                      className={`mt-1.5 truncate font-grotesk text-lg font-bold ${kpi.cls}`}
                    >
                      {kpi.value}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Mini gráfico de lucro por dia (barras verdes) */}
            <div className="mt-3 rounded-xl border border-white/[0.08] bg-[#10141F] p-3">
              <h4 className="font-grotesk text-xs font-bold text-[#F5F7FA]">
                Lucro por dia
              </h4>
              <div className="mt-3 flex h-20 items-end justify-between gap-1.5">
                {CHART_DAYS.map((d) => (
                  <div
                    key={d.day}
                    className="flex-1 rounded-t-sm bg-[#2BD699]"
                    style={{
                      height: `${Math.max((d.lucro / 40) * 100, 8)}%`,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

/**
 * BarChart — gráfico estático em divs: barras de comissão (azul) e gasto (coral)
 * por dia, com uma linha de lucro (verde) sobreposta via SVG.
 */
function BarChart({ className = "" }: { className?: string }) {
  const count = CHART_DAYS.length;

  return (
    <div className={`relative w-full ${className}`}>
      {/* Linha de lucro (SVG sobreposto) */}
      <svg
        className="pointer-events-none absolute inset-x-0 top-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <polyline
          fill="none"
          stroke="#2BD699"
          strokeWidth="0.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          points={CHART_DAYS.map((d, i) => {
            const x = ((i + 0.5) / count) * 100;
            const y = 100 - (d.lucro / CHART_MAX) * 100;
            return `${x},${y}`;
          }).join(" ")}
        />
      </svg>

      {/* Barras */}
      <div className="flex h-full items-end justify-between gap-2">
        {CHART_DAYS.map((d) => (
          <div
            key={d.day}
            className="flex h-full flex-1 flex-col items-center justify-end"
          >
            <div className="flex h-full w-full items-end justify-center gap-1">
              <div
                className="w-1/3 max-w-[14px] rounded-t-sm bg-[#318CE9]"
                style={{ height: `${(d.comissao / CHART_MAX) * 100}%` }}
              />
              <div
                className="w-1/3 max-w-[14px] rounded-t-sm bg-[#E58A7E]"
                style={{ height: `${(d.gasto / CHART_MAX) * 100}%` }}
              />
            </div>
            <span className="mt-1.5 text-[10px] text-[#6B7280]">{d.day}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
