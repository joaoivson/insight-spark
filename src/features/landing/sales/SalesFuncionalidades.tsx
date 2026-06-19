import {
  Cable,
  Target,
  SlidersHorizontal,
  Link2,
  Zap,
  AlertTriangle,
  type LucideIcon,
} from "lucide-react";

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
}

const features: Feature[] = [
  {
    icon: Cable,
    title: "Integração automática",
    description:
      "Conecta Shopee e Meta uma vez. Comissão e gasto entram sozinhos, todo dia. Você nunca mais toca em planilha.",
  },
  {
    icon: Target,
    title: "ROAS Real por campanha",
    description:
      "O lucro de verdade de cada Sub ID, com imposto na conta. Sabe na hora o que escalar e o que cortar.",
  },
  {
    icon: SlidersHorizontal,
    title: "Controle das campanhas Meta",
    description: "Pause, ative e ajuste orçamento sem abrir o Gerenciador.",
  },
  {
    icon: Link2,
    title: "Crie e proteja seus links",
    description:
      "Cole o link do produto e gere seu link de afiliado já com Sub ID, sem sair da plataforma. Se o produto esgotar, troque o destino — o anúncio continua rodando, sem refazer nada.",
  },
  {
    icon: Zap,
    title: "Saiba antes de todo mundo",
    description:
      "Enquanto os outros ainda esperam o painel da Shopee atualizar, seus números já estão prontos aqui. Quem vê primeiro, decide primeiro — e escala antes da concorrência.",
  },
  {
    icon: AlertTriangle,
    title: "Alerta de campanha no vermelho",
    description:
      "O MarketDash te avisa quando uma campanha passa a gastar mais do que retorna. Você corta antes de perder mais.",
  },
];

export default function SalesFuncionalidades() {
  return (
    <section className="bg-[#090D16] py-24 px-6">
      <div className="mx-auto max-w-[1140px]">
        <div className="mx-auto max-w-2xl text-center">
          <span className="font-jbmono text-xs uppercase tracking-[0.14em] text-[#7CB8F2]">
            Tudo num lugar só
          </span>
          <h2 className="mt-4 font-grotesk text-3xl font-bold leading-tight tracking-tight text-[#F5F7FA] md:text-4xl">
            Mais que um painel.{" "}
            <span className="bg-gradient-to-r from-[#318CE9] to-[#2BD699] bg-clip-text text-transparent">
              Sua operação inteira.
            </span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-[#9aa3b2]">
            Feito pra quem vive de performance e não tem tempo de cruzar planilha.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="group rounded-2xl border border-white/[0.08] bg-[#10141F] p-[26px] transition-all duration-300 hover:-translate-y-1 hover:border-[#318CE9]/[0.4]"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#318CE9]/12">
                <Icon className="h-6 w-6 text-[#7CB8F2]" strokeWidth={1.75} />
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
