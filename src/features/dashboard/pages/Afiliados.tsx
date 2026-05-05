import { useState } from "react";
import { motion } from "framer-motion";
import { Copy, Check, DollarSign, Target, CreditCard } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { userStorage } from "@/shared/lib/storage";

const AfiliadosPage = () => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const user = userStorage.get() as { id?: string | number } | null;
  const refCode = user?.id != null ? String(user.id) : "";
  const affiliateLink = refCode
    ? `https://marketdash.com.br/?ref=${refCode}`
    : "https://marketdash.com.br/";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(affiliateLink);
      setCopied(true);
      toast({ title: "Link copiado!", description: "Compartilhe e comece a ganhar." });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Erro ao copiar", variant: "destructive" });
    }
  };

  return (
    <DashboardLayout
      title="Indique & Ganhe"
      subtitle="Ganhe 40% Recorrente Indicando a MarketDash"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-3xl mx-auto space-y-6"
      >
        <p className="text-muted-foreground">
          Receba todos os meses enquanto seu indicado continuar ativo.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center mb-4">
              <DollarSign className="w-6 h-6 text-orange-500" />
            </div>
            <h3 className="font-bold text-foreground mb-2">40% Recorrente</h3>
            <p className="text-sm text-muted-foreground">
              Uma única indicação pode gerar receita todos os meses. Sem limite, sem teto, sem burocracia.
            </p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center mb-4">
              <Target className="w-6 h-6 text-orange-500" />
            </div>
            <h3 className="font-bold text-foreground mb-2">Modelo Último Clique</h3>
            <p className="text-sm text-muted-foreground">
              A comissão é atribuída ao último afiliado que gerou o clique antes da compra. Simples, justo, sem confusão.
            </p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center mb-4">
              <CreditCard className="w-6 h-6 text-orange-500" />
            </div>
            <h3 className="font-bold text-foreground mb-2">Pagamento Seguro</h3>
            <p className="text-sm text-muted-foreground">
              Pagamentos realizados pela plataforma Cakto. Transparência total no acompanhamento das vendas.
            </p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold text-foreground mb-2">Seu link de afiliação</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Compartilhe este link nas suas redes. Toda indicação ativa rende 40% recorrente.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              readOnly
              value={affiliateLink}
              className="flex-1 bg-muted border border-border rounded-lg px-4 py-2.5 text-sm text-foreground font-mono"
            />
            <Button onClick={handleCopy} className="gap-2">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copiado" : "Copiar link"}
            </Button>
          </div>
        </div>
      </motion.div>
    </DashboardLayout>
  );
};

export default AfiliadosPage;
