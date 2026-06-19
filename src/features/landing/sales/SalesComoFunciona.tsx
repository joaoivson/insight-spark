import { Cable, RefreshCw, TrendingUp, type LucideIcon } from "lucide-react";

interface Step {
  number: string;
  icon: LucideIcon;
  title: string;
  description: string;
}

const STEPS: Step[] = [
  {
    number: "1",
    icon: Cable,
    title: "Conecte",
    description:
      "Cole o AppID + Secret da Shopee e conecte o Meta. Sem criar app, sem programar, sem planilha. Leva minutos.",
  },
  {
    number: "2",
    icon: RefreshCw,
    title: "Deixe rodar",
    description:
      "O MarketDash puxa suas comissões e seu gasto sozinho, todo dia. Cruza tudo por Sub ID e aplica o imposto automaticamente. Você não toca em CSV nunca mais.",
  },
  {
    number: "3",
    icon: TrendingUp,
    title: "Decida e aja",
    description:
      "Veja o ROAS Real de cada campanha. Escale a que dá lucro, pause a que queima dinheiro — sem sair do painel.",
  },
];

export default function SalesComoFunciona() {
  return (
    <section
      id="como-funciona"
      className="bg-[#0B1018] py-20 px-6 md:py-24"
    >
      <div className="mx-auto max-w-[1140px]">
        {/* Header */}
        <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
          <span className="inline-flex items-center rounded-full border border-[#318CE9]/20 bg-[#318CE9]/10 px-3 py-1 font-jbmono text-xs uppercase tracking-[0.14em] text-[#7CB8F2]">
            Simples assim
          </span>
          <h2 className="mt-5 font-grotesk text-3xl font-bold leading-tight tracking-tight text-[#F5F7FA] md:text-4xl">
            Do caos à clareza em{" "}
            <span className="bg-gradient-to-r from-[#318CE9] to-[#2BD699] bg-clip-text text-transparent">
              3 passos.
            </span>
          </h2>
        </div>

        {/* Cards */}
        <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {STEPS.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.number}
                className="group rounded-2xl border border-white/[0.08] bg-[#10141F] p-8 transition-all duration-300 hover:-translate-y-1 hover:border-[#318CE9]/[0.4]"
              >
                {/* Top row: big number + icon */}
                <div className="flex items-center justify-between">
                  <span
                    aria-hidden="true"
                    className="bg-gradient-to-r from-[#318CE9] to-[#2BD699] bg-clip-text font-grotesk text-[58px] font-bold leading-none tracking-tight text-transparent"
                  >
                    {step.number}
                  </span>
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#318CE9]/[0.12]">
                    <Icon className="h-5 w-5 text-[#7CB8F2]" strokeWidth={1.75} />
                  </span>
                </div>

                <h3 className="mt-6 font-grotesk text-xl font-bold tracking-tight text-[#F5F7FA]">
                  {step.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-[#9aa3b2]">
                  {step.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
