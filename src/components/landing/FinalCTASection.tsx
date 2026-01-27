import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { caktoService } from "@/services/cakto.service";
import { tokenStorage, userStorage } from "@/shared/lib/storage";
import { useToast } from "@/hooks/use-toast";

const FinalCTASection = () => {
  const { toast } = useToast();
  
  const handleSubscribe = async () => {
    try {
      const isAuthenticated = !!tokenStorage.get();
      const user = userStorage.get() as { email?: string; name?: string; cpf_cnpj?: string } | null;
      
      if (isAuthenticated && user) {
        // Usuário logado: pré-preenche dados
        await caktoService.redirectToCheckout({
          email: user.email,
          name: user.name,
          cpf_cnpj: user.cpf_cnpj,
        });
      } else {
        // Usuário não logado: redireciona direto para Cakto
        caktoService.redirectToCheckoutDirect();
      }
    } catch (error) {
      console.error('Erro ao redirecionar para checkout:', error);
      toast({
        title: "Erro ao acessar página de assinatura",
        description: "Tente novamente em instantes.",
        variant: "destructive",
      });
    }
  };
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
            <Button variant="hero" size="xl" onClick={handleSubscribe}>
              Assinar agora
              <ArrowRight className="w-5 h-5" />
            </Button>
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
