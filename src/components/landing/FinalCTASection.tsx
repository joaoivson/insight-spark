import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Loader2 } from "lucide-react";
import { useSubscribe } from "@/shared/hooks/useSubscribe";

const FinalCTASection = () => {
  const { handleSubscribe, loading } = useSubscribe();
  return (
    <section className="py-12 md:py-20">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="glass-card rounded-3xl p-6 sm:p-10 md:p-14 border-2 border-accent/30 relative overflow-hidden text-center"
        >
          {/* Background Glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent pointer-events-none" />

          <div className="relative z-10">
            <h2 className="font-display text-2xl sm:text-4xl md:text-6xl font-bold text-foreground mb-6">
              Assuma o controle das suas vendas na Shopee hoje.
            </h2>
            <p className="text-muted-foreground text-base sm:text-xl mb-8 md:mb-10 max-w-2xl mx-auto">
              Pare de queimar verba com achismo. Saiba seu lucro real por campanha e Sub ID, escale o que funciona e pause o que dá prejuízo — tudo no mesmo painel.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-8 md:mb-10">
              <Button
                variant="hero"
                size="xl"
                className="w-full sm:w-auto sm:px-12 text-base sm:text-xl md:text-2xl"
                onClick={() => handleSubscribe(true)}
                disabled={loading}
                aria-label="Começar agora"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-6 h-6 mr-2 animate-spin" />
                    Carregando...
                  </>
                ) : (
                  <>
                    🚀 Começar agora
                    <ArrowRight className="w-6 h-6 ml-2" />
                  </>
                )}
              </Button>
            </div>

            {/* Garantia e Benefícios */}
            <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
              <span>✓ Setup em 2 minutos</span>
              <span>•</span>
              <span>✓ Suporte em português</span>
              <span>•</span>
              <span>✓ Shopee + Meta integrados</span>
              <span>•</span>
              <span className="font-semibold text-accent">✓ 7 dias de Garantia</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default FinalCTASection;
