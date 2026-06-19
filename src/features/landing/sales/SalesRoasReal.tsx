import { Link2, Receipt, Layers } from "lucide-react";

const miniCards = [
  {
    icon: Link2,
    title: "Liga os dois lados",
    body: "Gasto do Meta + comissão da Shopee, casados por Sub ID. O número que nenhuma das duas plataformas te dá sozinha.",
  },
  {
    icon: Receipt,
    title: "Imposto na conta",
    body: "Markup do anúncio e imposto da comissão entram no cálculo — não na surpresa do fim do mês.",
  },
  {
    icon: Layers,
    title: "Bruto e líquido juntos",
    body: "Você vê os dois, sem maquiar o número ruim.",
  },
];

export default function SalesRoasReal() {
  return (
    <section className="bg-[#090D16] py-20 px-6 md:py-24">
      <div className="mx-auto max-w-[1140px]">
        {/* Header centralizado */}
        <div className="mx-auto flex max-w-[780px] flex-col items-center text-center">
          <span className="font-jbmono text-xs uppercase tracking-[0.14em] text-[#7CB8F2]">
            Por que somos diferentes
          </span>

          <h2 className="mt-4 font-grotesk text-3xl font-bold leading-tight tracking-tight text-[#F5F7FA] md:text-4xl">
            Você sabe quanto gastou. Sabe quanto recebeu.
            <br />
            Mas sabe quanto{" "}
            <span className="bg-gradient-to-r from-[#318CE9] to-[#2BD699] bg-clip-text text-transparent">
              sobrou?
            </span>
          </h2>

          <p className="mt-5 max-w-[680px] text-[#9aa3b2]">
            Esse é o número que ninguém te mostra. O Meta sabe só o gasto. A
            Shopee sabe só a comissão. E o imposto come um pedaço dos dois lados.
            O MarketDash junta tudo e te dá o ROAS Real de cada campanha — pra
            você escalar a que dá lucro e cortar a que só queima dinheiro, antes
            de perder mais.
          </p>
        </div>

        {/* Card central com a fórmula */}
        <div className="mx-auto mt-12 max-w-[780px] rounded-2xl border border-[#318CE9]/[0.38] bg-[#10141F] p-7 sm:p-9">
          <p className="font-jbmono text-xs uppercase tracking-[0.14em] text-[#7CB8F2]">
            ROAS Real =
          </p>

          {/* Fórmula: numerador / denominador */}
          <div className="mt-5 font-jbmono">
            <p className="text-base leading-snug sm:text-lg">
              <span className="text-[#2BD699]">comissão líquida</span>{" "}
              <span className="text-[#6B7280]">(depois do imposto)</span>
            </p>
            <div className="my-3 h-px w-full bg-white/[0.08]" />
            <p className="text-base leading-snug sm:text-lg">
              <span className="text-[#E58A7E]">gasto com anúncios</span>{" "}
              <span className="text-[#6B7280]">(com imposto)</span>
            </p>
          </div>

          {/* Escala breakeven */}
          <div className="mt-8">
            <div className="relative h-2.5 w-full rounded-full bg-gradient-to-r from-[#FF6B66] via-[#F0A94A] to-[#2BD699]">
              {/* Marcador em ~66.6% */}
              <div
                className="absolute top-1/2 h-5 w-[2px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#7CB8F2]"
                style={{ left: "66.6%" }}
              />
            </div>
            <div className="mt-3 flex items-center justify-between font-jbmono text-xs">
              <span className="text-[#FF6B66]">0,72x prejuízo</span>
              <span className="text-[#7CB8F2]">1,0x breakeven</span>
              <span className="text-[#2BD699]">1,44x lucro</span>
            </div>
          </div>

          <p className="mt-6 text-sm text-[#9aa3b2]">
            Breakeven em 1,0x. Abaixo disso, você está pagando pra vender.
          </p>
        </div>

        {/* 3 mini cards */}
        <div className="mx-auto mt-8 grid max-w-[780px] grid-cols-1 gap-4 sm:grid-cols-3">
          {miniCards.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="rounded-xl border border-white/[0.08] bg-[#0B1018] p-[22px]"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] bg-[#10141F]">
                <Icon className="h-4 w-4 text-[#7CB8F2]" />
              </div>
              <h3 className="mt-4 font-grotesk text-base font-semibold leading-snug text-[#F5F7FA]">
                {title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#9aa3b2]">
                {body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
