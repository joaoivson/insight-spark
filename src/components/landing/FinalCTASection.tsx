import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { APP_CONFIG } from "@/core/config/app.config";

const FinalCTASection = () => {
  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="glass-card rounded-3xl p-10 md:p-14 border border-border text-center"
        >
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
            Pronto para aumentar o ROAS e reduzir desperdícios?
          </h2>
          <p className="text-muted-foreground text-lg mb-8">
            Comece agora e veja seus indicadores reais em minutos. Sem planilhas, sem ruído.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href={APP_CONFIG.EXTERNALS.SUBSCRIBE_URL} target="_blank" rel="noreferrer">
              <Button variant="hero" size="xl">
                Assinar agora
                <ArrowRight className="w-5 h-5" />
              </Button>
            </a>
            <Link to="/demo">
              <Button variant="hero-outline" size="xl">
                Ver demo
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default FinalCTASection;
