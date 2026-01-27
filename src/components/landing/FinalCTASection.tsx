import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, ShieldCheck, Users, Clock, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useSubscribe } from "@/shared/hooks/useSubscribe";

const FinalCTASection = () => {
  const { handleSubscribe, loading } = useSubscribe();
  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="glass-card rounded-3xl p-10 md:p-14 border-2 border-accent/30 relative overflow-hidden text-center"
        >
          {/* Background Glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent pointer-events-none" />
          
          <div className="relative z-10">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
              Pronto para aumentar suas comissões?
            </h2>
            <p className="text-muted-foreground text-lg mb-6 max-w-2xl mx-auto">
              Junte-se a mais de 300 afiliados que já transformaram seus resultados
            </p>

            {/* Prova Social */}
            <div className="flex flex-wrap items-center justify-center gap-6 mb-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-accent" />
                <span>+300 afiliados ativos</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-accent" />
                <span>Setup em 2 minutos</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-accent" />
                <span>7 dias de Garantia</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
              <Button 
                variant="hero" 
                size="xl" 
                onClick={() => handleSubscribe(true)}
                disabled={loading}
                aria-label="Adquirir ferramenta agora"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Carregando...
                  </>
                ) : (
                  <>
                    Adquirir Ferramenta Agora
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </Button>
              <Link to="/demo">
                <Button variant="hero-outline" size="xl" aria-label="Ver demonstração">
                  Ver Demonstração
                </Button>
              </Link>
            </div>

            {/* Garantia e Benefícios */}
            <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
              <span>✓ Setup em 2 minutos</span>
              <span>•</span>
              <span>✓ Suporte em português</span>
              <span>•</span>
              <span>✓ Todas as funcionalidades incluídas</span>
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
