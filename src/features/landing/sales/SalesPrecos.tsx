import { useState } from 'react';
import { Check } from 'lucide-react';

const KIWIFY = 'https://pay.kiwify.com.br/';

type PlanData = {
  big: string;
  unit: string;
  pill: string;
  /** Desconto do plano vs. pagar no mensal (vazio no período mensal). */
  discount: string;
  link: string;
};

type PeriodData = {
  essencial: PlanData;
  pro: PlanData;
  max: PlanData;
};

const PERIODS: Record<string, PeriodData> = {
  mensal: {
    essencial: { big: 'R$ 47', unit: '/mês', pill: '', discount: '', link: 'uMRfGkI' },
    pro: { big: 'R$ 67', unit: '/mês', pill: '', discount: '', link: 'u12boOS' },
    max: { big: 'R$ 97', unit: '/mês', pill: '', discount: '', link: 'rTfikTj' },
  },
  trimestral: {
    essencial: {
      big: 'R$ 117',
      unit: '/trimestre',
      pill: 'cobrança trimestral · equivale a R$ 39/mês',
      discount: '17%',
      link: 'vkKX959',
    },
    pro: {
      big: 'R$ 147',
      unit: '/trimestre',
      pill: 'cobrança trimestral · equivale a R$ 49/mês',
      discount: '27%',
      link: '9B9lXa6',
    },
    max: {
      big: 'R$ 207',
      unit: '/trimestre',
      pill: 'cobrança trimestral · equivale a R$ 69/mês',
      discount: '29%',
      link: 'HPql4oU',
    },
  },
  anual: {
    essencial: {
      big: 'R$ 327',
      unit: '/ano',
      pill: 'cobrança anual · equivale a R$ 27,25/mês',
      discount: '42%',
      link: 'EZ81jlu',
    },
    pro: {
      big: 'R$ 447',
      unit: '/ano',
      pill: 'cobrança anual · equivale a R$ 37,25/mês',
      discount: '44%',
      link: '4lhuudg',
    },
    max: {
      big: 'R$ 627',
      unit: '/ano',
      pill: 'cobrança anual · equivale a R$ 52,25/mês',
      discount: '46%',
      link: '5l1Sdau',
    },
  },
};

const ESSENCIAL_FEATURES = [
  'Integração automática Shopee + Meta',
  'Dashboard com ROAS Real e Lucro (já com imposto)',
  'ROAS Real e Lucro por Sub ID',
  'Controle das campanhas Meta (pausar / ativar / orçamento)',
  'Alerta de campanha no vermelho',
  'Números prontos antes do painel da Shopee',
  'Suporte rápido',
];

const PRO_BASE_FEATURES = ESSENCIAL_FEATURES.slice(0, 6);

const PRO_EXTRA_FEATURES = [
  'Páginas de captura',
  'Meus Links — até 30 links rastreáveis que não quebram',
  'Gere seu link de afiliado com Sub ID dentro da plataforma',
  'Suporte prioritário',
];

const MAX_EXTRA_FEATURES = [
  'Automação de Instagram: comentário vira link no direct, no automático',
  'Resposta pública no comentário + DM com botão, 24/7',
  'Páginas de captura ilimitadas',
  'Meus Links ilimitados',
];

// Teaser do toggle = MAIOR desconto entre os planos: Trimestral 29% e Anual 46%
// (ambos do Max). Por isso o "até". A pílula exata por plano fica em cada card.
const TOGGLE_OPTIONS = [
  { value: 'mensal', label: 'Mensal', teaser: '' },
  { value: 'trimestral', label: 'Trimestral', teaser: 'até 29%' },
  { value: 'anual', label: 'Anual', teaser: 'até 46%' },
];

function FeatureItem({ children, accent }: { children: string; accent?: boolean }) {
  return (
    <li className="flex items-start gap-3">
      <span
        className={`mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full ${
          accent ? 'bg-[#318CE9]/15' : 'bg-[#2BD699]/15'
        }`}
      >
        <Check className="h-3 w-3 text-[#2BD699]" strokeWidth={3} />
      </span>
      <span className="text-sm leading-relaxed text-[#9aa3b2]">{children}</span>
    </li>
  );
}

/** Pílula verde com o desconto do plano para o período selecionado. */
function DiscountPill({ discount }: { discount: string }) {
  if (!discount) return null;
  return (
    <span className="self-center rounded-full bg-[#2BD699]/15 px-2 py-0.5 font-jbmono text-[11px] font-medium leading-none text-[#2BD699]">
      −{discount}
    </span>
  );
}

export default function SalesPrecos() {
  const [period, setPeriod] = useState('mensal');

  const data = PERIODS[period];

  return (
    <section id="precos" className="bg-[#0B1018] px-6 py-24">
      <div className="mx-auto max-w-[1140px]">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <p className="font-jbmono text-xs uppercase tracking-[0.14em] text-[#7CB8F2]">
            Planos
          </p>
          <h2 className="mt-4 font-grotesk text-3xl font-bold leading-tight tracking-tight text-[#F5F7FA] md:text-4xl">
            Um plano pra crescer com clareza.
          </h2>
          <p className="mx-auto mt-4 text-[#9aa3b2]">
            Escolha seu plano. 7 dias de garantia — não gostou, devolvemos.
          </p>
        </div>

        {/* Toggle de período */}
        <div className="mt-8 flex justify-center">
          <div className="flex w-full max-w-[420px] items-stretch gap-1 rounded-xl border border-white/[0.08] bg-[#10141F] p-[5px]">
            {TOGGLE_OPTIONS.map((opt) => {
              const active = period === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPeriod(opt.value)}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2.5 text-sm font-medium transition-colors sm:px-4 ${
                    active
                      ? 'border border-[#318CE9]/50 bg-[#318CE9]/[0.16] text-[#7CB8F2]'
                      : 'border border-transparent text-[#9aa3b2] hover:text-[#F5F7FA]'
                  }`}
                >
                  <span className="truncate">{opt.label}</span>
                  {opt.teaser && (
                    <span className="rounded-full bg-[#2BD699]/15 px-1.5 py-0.5 font-jbmono text-[10px] font-medium leading-none text-[#2BD699]">
                      {opt.teaser}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Cards */}
        <div className="mx-auto mt-12 grid max-w-[1140px] grid-cols-1 items-stretch gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Essencial */}
          <div className="flex flex-col rounded-2xl border border-white/[0.08] bg-[#10141F] p-7">
            <h3 className="font-grotesk text-xl font-bold text-[#F5F7FA]">Essencial</h3>
            <p className="mt-2 text-sm leading-relaxed text-[#9aa3b2]">
              Veja o lucro real e controle suas campanhas.
            </p>

            <div className="mt-6 flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span className="font-grotesk text-[46px] font-bold leading-none text-[#F5F7FA]">
                {data.essencial.big}
              </span>
              <span className="text-sm text-[#9aa3b2]">{data.essencial.unit}</span>
              <DiscountPill discount={data.essencial.discount} />
            </div>
            {data.essencial.pill && (
              <p className="mt-3 font-jbmono text-xs text-[#6B7280]">
                {data.essencial.pill}
              </p>
            )}

            <a
              href={KIWIFY + data.essencial.link}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 flex items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.07] px-5 py-3 text-sm font-semibold text-[#F5F7FA] transition-colors hover:bg-white/[0.12]"
            >
              Começar agora →
            </a>

            <ul className="mt-7 space-y-3.5">
              {ESSENCIAL_FEATURES.map((f) => (
                <FeatureItem key={f}>{f}</FeatureItem>
              ))}
            </ul>

            <p className="mt-7 border-t border-white/[0.08] pt-5 font-jbmono text-xs text-[#6B7280]">
              7 dias de garantia · Cancele quando quiser
            </p>
          </div>

          {/* Pro */}
          <div className="relative flex flex-col rounded-2xl border border-[#318CE9]/[0.45] bg-gradient-to-b from-[#318CE9]/12 to-[#10141F] p-7 shadow-[0_0_40px_-12px_rgba(49,140,233,0.55)]">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-grotesk text-xl font-bold text-[#F5F7FA]">Pro</h3>
              <span className="rounded-full bg-[#318CE9] px-3 py-1 font-jbmono text-[10px] uppercase tracking-wide text-[#031426]">
                Mais popular
              </span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-[#9aa3b2]">
              Tudo pra ver, operar e escalar num lugar só.
            </p>

            <div className="mt-6 flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span className="font-grotesk text-[46px] font-bold leading-none text-[#F5F7FA]">
                {data.pro.big}
              </span>
              <span className="text-sm text-[#9aa3b2]">{data.pro.unit}</span>
              <DiscountPill discount={data.pro.discount} />
            </div>
            {data.pro.pill && (
              <p className="mt-3 font-jbmono text-xs text-[#7CB8F2]">{data.pro.pill}</p>
            )}

            <a
              href={KIWIFY + data.pro.link}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 flex items-center justify-center rounded-xl bg-[#318CE9] px-5 py-3 text-sm font-semibold text-[#031426] transition-colors hover:bg-[#318CE9]/90"
            >
              Começar agora →
            </a>

            <ul className="mt-7 space-y-3.5">
              {PRO_BASE_FEATURES.map((f) => (
                <FeatureItem key={f}>{f}</FeatureItem>
              ))}
            </ul>

            <p className="mt-6 font-jbmono text-xs uppercase tracking-[0.14em] text-[#7CB8F2]">
              Tudo isso, mais:
            </p>

            <ul className="mt-4 space-y-3.5">
              {PRO_EXTRA_FEATURES.map((f) => (
                <FeatureItem key={f} accent>
                  {f}
                </FeatureItem>
              ))}
            </ul>

            <p className="mt-7 border-t border-white/[0.08] pt-5 font-jbmono text-xs text-[#6B7280]">
              7 dias de garantia · Cancele quando quiser
            </p>
          </div>

          {/* Max */}
          <div className="relative flex flex-col rounded-2xl border border-[#F0A94A]/[0.45] bg-gradient-to-b from-[#F0A94A]/10 to-[#10141F] p-7 shadow-[0_0_40px_-12px_rgba(240,169,74,0.45)] md:col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-grotesk text-xl font-bold text-[#F5F7FA]">Max</h3>
              <span className="rounded-full bg-[#F0A94A] px-3 py-1 font-jbmono text-[10px] uppercase tracking-wide text-[#1A1205]">
                Novo
              </span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-[#9aa3b2]">
              Pra quem vende com conteúdo: automação de Instagram inclusa.
            </p>

            <div className="mt-6 flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span className="font-grotesk text-[46px] font-bold leading-none text-[#F5F7FA]">
                {data.max.big}
              </span>
              <span className="text-sm text-[#9aa3b2]">{data.max.unit}</span>
              <DiscountPill discount={data.max.discount} />
            </div>
            {data.max.pill && (
              <p className="mt-3 font-jbmono text-xs text-[#F0A94A]">{data.max.pill}</p>
            )}

            <a
              href={KIWIFY + data.max.link}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 flex items-center justify-center rounded-xl bg-[#F0A94A] px-5 py-3 text-sm font-semibold text-[#1A1205] transition-colors hover:bg-[#F0A94A]/90"
            >
              Começar agora →
            </a>

            <ul className="mt-7 space-y-3.5">
              <FeatureItem>Tudo do Essencial e do Pro incluído</FeatureItem>
            </ul>

            <p className="mt-6 font-jbmono text-xs uppercase tracking-[0.14em] text-[#F0A94A]">
              Só no Max:
            </p>

            <ul className="mt-4 space-y-3.5">
              {MAX_EXTRA_FEATURES.map((f) => (
                <FeatureItem key={f} accent>
                  {f}
                </FeatureItem>
              ))}
            </ul>

            <p className="mt-7 border-t border-white/[0.08] pt-5 font-jbmono text-xs text-[#6B7280]">
              7 dias de garantia · Cancele quando quiser
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
