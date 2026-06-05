import { useEffect, useState } from "react";
import { ShoppingBag, Facebook, Receipt, Save, Loader2 } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ShopeeIntegrationSettings } from "@/features/dashboard/components/ShopeeIntegrationSettings";
import { FacebookIntegrationSettings } from "@/features/dashboard/components/FacebookIntegrationSettings";
import { useTaxSettingsStore } from "@/stores/taxSettingsStore";

const Configuracoes = () => {
  return (
    <DashboardLayout title="Configurações" subtitle="Gerencie suas integrações e preferências">
      <Tabs defaultValue="shopee" className="max-w-3xl">
        <div className="-mx-4 px-4 md:mx-0 md:px-0 overflow-x-auto mb-6">
          <TabsList className="w-max">
            <TabsTrigger value="shopee" className="gap-2 whitespace-nowrap">
              <ShoppingBag className="w-4 h-4" /> <span className="hidden sm:inline">Integração</span> Shopee
            </TabsTrigger>
            <TabsTrigger value="facebook" className="gap-2 whitespace-nowrap">
              <Facebook className="w-4 h-4" /> <span className="hidden sm:inline">Integração</span> Facebook
            </TabsTrigger>
            <TabsTrigger value="impostos" className="gap-2 whitespace-nowrap">
              <Receipt className="w-4 h-4" /> Impostos
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="shopee">
          <div className="bg-card border border-border rounded-2xl p-5 md:p-6">
            <div className="flex items-start gap-3 md:gap-4 mb-5">
              <div className="w-11 h-11 md:w-12 md:h-12 rounded-xl bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                <span className="text-2xl font-bold text-orange-500">S</span>
              </div>
              <div className="min-w-0">
                <h3 className="text-lg font-bold text-foreground">Shopee Afiliados</h3>
                <p className="text-sm text-muted-foreground">
                  Sincroniza automaticamente suas <strong>comissões</strong> toda manhã às 7h. Dados de cliques devem ser
                  importados via Upload Cliques.
                </p>
              </div>
            </div>
            <ShopeeIntegrationSettings />
          </div>
        </TabsContent>

        <TabsContent value="facebook">
          <div className="bg-card border border-border rounded-2xl p-5 md:p-6">
            <div className="flex items-start gap-3 md:gap-4 mb-5">
              <div className="w-11 h-11 md:w-12 md:h-12 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                <Facebook className="w-6 h-6 text-blue-500" />
              </div>
              <div className="min-w-0">
                <h3 className="text-lg font-bold text-foreground">Facebook Ads</h3>
                <p className="text-sm text-muted-foreground">
                  Sincroniza campanhas, gasto e métricas. Permite pausar/ativar e ajustar orçamento direto do MarketDash.
                </p>
              </div>
            </div>
            <FacebookIntegrationSettings />
          </div>
        </TabsContent>

        <TabsContent value="impostos">
          <TaxSettingsCard />
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
};

const TaxSettingsCard = () => {
  const { toast } = useToast();
  const adTaxRate = useTaxSettingsStore((s) => s.adTaxRate);
  const commissionTaxRate = useTaxSettingsStore((s) => s.commissionTaxRate);
  const loaded = useTaxSettingsStore((s) => s.loaded);
  const fetchTax = useTaxSettingsStore((s) => s.fetch);
  const saveTax = useTaxSettingsStore((s) => s.save);

  const [adRate, setAdRate] = useState("0");
  const [commRate, setCommRate] = useState("0");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchTax().finally(() => setLoading(false));
  }, [fetchTax]);

  // Sincroniza os inputs quando as alíquotas chegam do backend
  useEffect(() => {
    if (loaded) {
      setAdRate(String(adTaxRate ?? 0));
      setCommRate(String(commissionTaxRate ?? 0));
    }
  }, [loaded, adTaxRate, commissionTaxRate]);

  const handleSave = async () => {
    const ad = parseFloat(adRate.replace(",", "."));
    const comm = parseFloat(commRate.replace(",", "."));
    if (isNaN(ad) || isNaN(comm) || ad < 0 || comm < 0) {
      toast({ title: "Informe alíquotas válidas", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await saveTax(ad, comm);
      toast({ title: "Impostos salvos", description: "Lucro e ROAS recalculam automaticamente em todos os dashboards." });
    } catch (e) {
      toast({ title: "Erro ao salvar", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-5 md:p-6">
      <div className="flex items-start gap-3 md:gap-4 mb-5">
        <div className="w-11 h-11 md:w-12 md:h-12 rounded-xl bg-purple-500/10 flex items-center justify-center flex-shrink-0">
          <Receipt className="w-6 h-6 text-purple-500" />
        </div>
        <div className="min-w-0">
          <h3 className="text-lg font-bold text-foreground">Impostos</h3>
          <p className="text-sm text-muted-foreground">
            Aplicados em tempo de cálculo sobre <strong>todos</strong> os dashboards (KPIs, gráficos, Sub ID, CPA, ROAS).
            O valor lançado em Custos de Anúncios continua sendo o que você pagou — o imposto é somado só no cálculo.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center text-muted-foreground py-6">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando…
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ad-rate">Imposto sobre anúncios — markup Meta (%)</Label>
              <Input id="ad-rate" type="number" min="0" step="0.01" value={adRate} onChange={(e) => setAdRate(e.target.value)} />
              <p className="text-xs text-muted-foreground">Gasto com imposto = gasto pago × (1 + %). Ex.: 17,65.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="comm-rate">Imposto sobre comissão (%)</Label>
              <Input id="comm-rate" type="number" min="0" step="0.01" value={commRate} onChange={(e) => setCommRate(e.target.value)} />
              <p className="text-xs text-muted-foreground">Comissão líquida = comissão × (1 − %). Ex.: 6.</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Salvar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Configuracoes;
