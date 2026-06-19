import { useState } from "react";
import { ChevronDown } from "lucide-react";

const FAQ_ITEMS: { question: string; answer: string }[] = [
  {
    question: "Preciso saber mexer com isso ou criar algum app?",
    answer:
      "Não. Você cola o AppID + Secret da Shopee (a gente te mostra o passo a passo) e conecta o Meta. Em poucos minutos está rodando.",
  },
  {
    question: "É seguro conectar minhas contas?",
    answer:
      "Sim. O MarketDash lê seus dados de comissão e gasto; ações na campanha (pausar, orçamento) só acontecem quando você manda.",
  },
  {
    question: "E os meus dados de antes?",
    answer:
      "A integração puxa automaticamente o histórico recente e guarda daí pra frente — seus números ficam salvos mesmo quando saem da janela da Shopee.",
  },
  {
    question: "Qual a diferença entre o Essencial e o Pro?",
    answer:
      "O Essencial te dá toda a análise e o controle das campanhas. O Pro inclui tudo isso e ainda as ferramentas pra captar e escalar: páginas de captura, links rastreáveis e geração de link com Sub ID.",
  },
  {
    question: "Funciona no celular?",
    answer: "Sim, você acessa de qualquer lugar.",
  },
  {
    question: "Como recebo o acesso?",
    answer:
      "Assim que assina, o acesso é liberado na hora, com as aulas de uso na área de membros.",
  },
  {
    question: "E se eu não gostar?",
    answer:
      "Você tem 7 dias de garantia. Não curtiu, devolvemos o valor integral.",
  },
  {
    question: "Posso cancelar quando quiser?",
    answer: "Sim, sem multa nem burocracia.",
  },
];

export default function SalesFAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="bg-[#0B1018] py-24 px-6">
      <div className="max-w-[1140px] mx-auto">
        <div className="text-center">
          <span className="font-jbmono text-xs uppercase tracking-[0.14em] text-[#7CB8F2]">
            Dúvidas
          </span>
          <h2 className="mt-3 font-grotesk text-3xl md:text-4xl font-bold leading-tight tracking-tight text-[#F5F7FA]">
            Perguntas frequentes
          </h2>
        </div>

        <div className="mt-12 flex max-w-[760px] mx-auto flex-col gap-3">
          {FAQ_ITEMS.map((item, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={item.question}
                className="rounded-xl border border-white/[0.08] bg-[#10141F]"
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                >
                  <span className="font-medium text-[#F5F7FA]">
                    {item.question}
                  </span>
                  <ChevronDown
                    className={`h-5 w-5 shrink-0 text-[#9aa3b2] transition-transform duration-300 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                <div
                  className={`grid transition-all duration-300 ease-in-out ${
                    isOpen
                      ? "grid-rows-[1fr] opacity-100"
                      : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <div className="overflow-hidden">
                    <p className="px-5 pb-4 text-sm text-[#9aa3b2]">
                      {item.answer}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
