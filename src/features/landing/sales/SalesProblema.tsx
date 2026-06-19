import { Unplug, Clock, Sheet, type LucideIcon } from "lucide-react";

interface ProblemaCard {
  icon: LucideIcon;
  title: string;
  description: string;
}

const CARDS: ProblemaCard[] = [
  {
    icon: Unplug,
    title: "Você não liga gasto com venda",
    description:
      "Gasto fica no Meta, comissão fica na Shopee. Sem juntar os dois por Sub ID, você não faz ideia de qual campanha te paga e qual só consome orçamento.",
  },
  {
    icon: Clock,
    title: "O prejuízo fica ligado por dias",
    description:
      "Uma campanha no vermelho continua gastando enquanto você não percebe. Quando soma tudo no fim do mês, o dinheiro já foi — e não volta.",
  },
  {
    icon: Sheet,
    title: "A planilha nunca está certa",
    description:
      "Toda semana a mesma novela: exporta CSV, cola gasto, calcula imposto na mão. Dá trabalho, atrasa, e o número já nasce velho.",
  },
];

export default function SalesProblema() {
  return (
    <section id="problema" className="bg-[#090D16] py-20 px-6 md:py-24">
      <div className="mx-auto max-w-[1140px]">
        {/* Cabeçalho centralizado */}
        <div className="flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 font-jbmono text-xs uppercase tracking-[0.14em] text-[#ff938f]">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#FF6B66]" />
            O problema real
          </div>

          <h2 className="mt-5 font-grotesk text-3xl font-bold leading-tight tracking-tight text-[#F5F7FA] md:text-4xl">
            Tem campanha sua queimando dinheiro agora.
            <br />
            E você não sabe qual.
          </h2>

          <p className="mt-5 max-w-[700px] text-[#9aa3b2]">
            Você olha o gasto no Meta. Olha a comissão na Shopee. Mas nunca
            consegue cruzar os dois pra saber, campanha por campanha, o que dá
            lucro de verdade — ainda mais depois do imposto. Então roda no
            escuro: escala o que acha que vende e deixa o prejuízo ligado sem
            perceber.
          </p>
        </div>

        {/* Cards */}
        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {CARDS.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="group rounded-2xl border border-white/[0.08] bg-[#10141F] p-7 transition-all duration-200 hover:-translate-y-1 hover:border-[#FF6B66]/[0.4]"
            >
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#FF6B66]/12 text-[#FF6B66]">
                <Icon className="h-5 w-5" strokeWidth={1.75} />
              </div>

              <h3 className="mt-5 font-grotesk text-lg font-semibold leading-snug text-[#F5F7FA]">
                {title}
              </h3>

              <p className="mt-2.5 text-sm leading-relaxed text-[#9aa3b2]">
                {description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
