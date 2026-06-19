import { ArrowRight, ShieldCheck } from "lucide-react";

export default function SalesFinalCTA() {
  return (
    <section id="cta-final" className="bg-[#090D16] px-6 pb-24">
      <div className="mx-auto max-w-[1000px]">
        <div
          className="relative overflow-hidden rounded-3xl border border-[#318CE9]/[0.38] bg-[#10141F] p-10 text-center sm:p-16"
          style={{
            backgroundImage:
              "radial-gradient(120% 80% at 50% 0%, rgba(49,140,233,0.22) 0%, rgba(49,140,233,0.06) 38%, rgba(16,20,31,0) 70%)",
          }}
        >
          <h2 className="font-grotesk text-3xl font-bold leading-tight tracking-tight text-[#F5F7FA] md:text-4xl">
            Conecte e veja seu{" "}
            <span className="bg-gradient-to-r from-[#318CE9] to-[#2BD699] bg-clip-text text-transparent">
              lucro real
            </span>{" "}
            hoje.
          </h2>

          <p className="mx-auto mt-5 max-w-[600px] text-[#9aa3b2]">
            Pare de queimar dinheiro no achismo. Tenha a clareza que separa quem
            escala de quem só posta link.
          </p>

          <div className="mt-8 flex justify-center">
            <a
              href="#precos"
              className="inline-flex items-center gap-2 rounded-[13px] bg-[#318CE9] px-[30px] py-4 font-bold text-[#031426] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#4a9cef]"
            >
              Começar agora
              <ArrowRight className="h-5 w-5" strokeWidth={2.25} />
            </a>
          </div>

          {/* Linha de confiança */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-[#9aa3b2]">
            <span>Conecta em minutos</span>
            <span className="hidden h-1 w-1 rounded-full bg-[#6B7280] sm:inline-block" />
            <span>Suporte rápido</span>
            <span className="hidden h-1 w-1 rounded-full bg-[#6B7280] sm:inline-block" />
            <span className="inline-flex items-center gap-1.5 font-bold text-[#2BD699]">
              <ShieldCheck className="h-4 w-4" strokeWidth={2} />7 dias de
              garantia
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
