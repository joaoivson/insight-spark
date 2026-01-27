import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { HelpCircle } from "lucide-react";

const faqs = [
  {
    question: "Quantas análises eu posso realizar?",
    answer: "As análises são ILIMITADAS, realize quantas você precisar. Não há limite de uploads, processamentos ou consultas aos seus dados.",
  },
  {
    question: "Consigo acessar pelo celular?",
    answer: "Sim, você pode acessar o sistema e analisar suas comissões pelo celular. A interface é totalmente responsiva e otimizada para dispositivos móveis.",
  },
  {
    question: "Quais são as formas de pagamento?",
    answer: "Você pode efetuar o pagamento via Cartão de Crédito, Boleto ou Pix através da plataforma Cakto, nosso parceiro de pagamentos seguro.",
  },
  {
    question: "Como receberei o acesso?",
    answer: "Após o pagamento ser aprovado, você receberá em seu email o link de acesso do sistema. O processo é automático e leva apenas alguns minutos.",
  },
  {
    question: "Quanto tempo tenho de garantia?",
    answer: "Você tem 7 dias de garantia. Caso não queira mais utilizar o sistema nesse período, basta pedir reembolso integral através do nosso suporte.",
  },
  {
    question: "Como tenho acesso às análises?",
    answer: "Dentro da plataforma há um tutorial que te ensina o passo a passo de como gerar os dados do seu painel da Shopee e importá-los via CSV. O processo é simples e leva menos de 5 minutos.",
  },
  {
    question: "Como entro em contato com o suporte?",
    answer: "Você pode entrar em contato através do email de suporte ou pelo WhatsApp disponível na área de membros. Nossa equipe está pronta para ajudar você.",
  },
  {
    question: "Os dados ficam seguros?",
    answer: "Sim, seus dados ficam completamente isolados por usuário e não são compartilhados. Utilizamos criptografia e seguimos as melhores práticas de segurança de dados.",
  },
  {
    question: "Preciso de conhecimento técnico para usar?",
    answer: "Não! A ferramenta foi desenvolvida para ser simples e intuitiva. Qualquer pessoa pode usar, mesmo sem conhecimento técnico. Basta importar o CSV e começar a analisar.",
  },
  {
    question: "Posso cancelar a qualquer momento?",
    answer: "Sim, você pode cancelar sua assinatura a qualquer momento. Não há fidelidade ou multa por cancelamento. Seu acesso permanece ativo até o final do período pago.",
  },
];

const FAQSection = () => {
  return (
    <section id="faq" className="py-24 bg-secondary/20 relative">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <span className="inline-block px-4 py-1 rounded-full bg-accent/10 text-accent text-sm font-medium mb-4">
            Dúvidas Frequentes
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
            Perguntas Frequentes
          </h2>
          <p className="text-muted-foreground text-lg">
            Tudo que você precisa saber sobre nossa ferramenta
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="max-w-3xl mx-auto"
        >
          <Accordion type="single" collapsible className="w-full space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="glass-card rounded-xl border border-border px-6"
              >
                <AccordionTrigger className="text-left hover:no-underline">
                  <div className="flex items-center gap-3">
                    <HelpCircle className="w-5 h-5 text-accent flex-shrink-0" />
                    <span className="font-semibold text-foreground">{faq.question}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed pt-2 pb-4">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
};

export default FAQSection;
