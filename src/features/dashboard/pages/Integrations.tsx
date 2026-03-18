import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { motion } from "framer-motion";
import { ShopeeIntegrationSettings } from "@/features/dashboard/components/ShopeeIntegrationSettings";

const IntegrationsPage = () => {
  return (
    <DashboardLayout title="Integração Shopee" subtitle="Sincronização automática de comissões do programa de afiliados Shopee">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-2xl mx-auto space-y-8"
      >
        {/* Shopee Card */}
        <div className="bg-card border border-border rounded-2xl p-8 shadow-sm">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center flex-shrink-0">
              <span className="text-2xl font-bold text-orange-500">S</span>
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground">Shopee Afiliados</h3>
              <p className="text-sm text-muted-foreground">
                Sincroniza automaticamente suas <strong>comissões</strong> toda manhã às 7h. Dados de cliques não estão disponíveis via API e devem ser importados via Upload Cliques.
              </p>
            </div>
          </div>

          <ShopeeIntegrationSettings />
        </div>
      </motion.div>
    </DashboardLayout>
  );
};

export default IntegrationsPage;
