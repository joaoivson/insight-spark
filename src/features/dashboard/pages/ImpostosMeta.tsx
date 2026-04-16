import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Receipt, Save, Loader2 } from "lucide-react";
import { useAdSpendsStore } from "@/stores/adSpendsStore";
import { useDatasetStore } from "@/stores/datasetStore";
import { getTaxSettings, updateTaxSettings } from "@/services/tax_settings.service";
import { calcTaxRows, calcTaxTotals } from "@/shared/lib/taxes";

const currency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v ?? 0);

const pct = (v: number) =>
  `${v.toFixed(2)}%`;

export default function ImpostosMeta() {
  const { toast } = useToast();
  const { fullAdSpends, fetchAdSpends, loading: adLoading } = useAdSpendsStore();
  const { fullRows, fetchRows, loading: rowsLoading } = useDatasetStore();

  const [adTaxRate, setAdTaxRate] = useState<string>("0");
  const [commTaxRate, setCommTaxRate] = useState<string>("0");
  const [saving, setSaving] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);

  // Load data stores and tax settings
  useEffect(() => {
    fetchAdSpends();
    fetchRows();
    getTaxSettings()
      .then((s) => {
        setAdTaxRate(String(s.ad_tax_rate));
        setCommTaxRate(String(s.commission_tax_rate));
      })
      .catch(() => {
        toast({ title: "Erro ao carregar configurações de impostos", variant: "destructive" });
      })
      .finally(() => setLoadingSettings(false));
  }, []);

  const taxRows = useMemo(() => {
    const adRate = parseFloat(adTaxRate) || 0;
    const commRate = parseFloat(commTaxRate) || 0;
    return calcTaxRows(fullAdSpends, fullRows, adRate, commRate);
  }, [fullAdSpends, fullRows, adTaxRate, commTaxRate]);

  const totals = useMemo(() => calcTaxTotals(taxRows), [taxRows]);

  const handleSave = async () => {
    const adRate = parseFloat(adTaxRate) || 0;
    const commRate = parseFloat(commTaxRate) || 0;
    if (adRate < 0 || adRate > 100 || commRate < 0 || commRate > 100) {
      toast({ title: "Alíquotas devem estar entre 0 e 100", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await updateTaxSettings(adRate, commRate);
      toast({ title: "Configurações salvas com sucesso" });
    } catch {
      toast({ title: "Erro ao salvar configurações", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const isLoading = adLoading || rowsLoading || loadingSettings;

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Receipt className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">Impostos Meta</h1>
        </div>

        {/* Config Card */}
        <Card className="p-6">
          <h2 className="text-base font-semibold mb-4">Configuração de Alíquotas</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="ad-tax">% Imposto Anúncios</Label>
              <div className="relative">
                <Input
                  id="ad-tax"
                  type="number"
                  min={0}
                  max={100}
                  step={0.01}
                  value={adTaxRate}
                  onChange={(e) => setAdTaxRate(e.target.value)}
                  className="pr-8"
                  placeholder="0"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Aplicado sobre o Investimento em Anúncios
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="comm-tax">% Imposto Saídas</Label>
              <div className="relative">
                <Input
                  id="comm-tax"
                  type="number"
                  min={0}
                  max={100}
                  step={0.01}
                  value={commTaxRate}
                  onChange={(e) => setCommTaxRate(e.target.value)}
                  className="pr-8"
                  placeholder="0"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Aplicado sobre as Comissões recebidas
              </p>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvar Alíquotas
            </Button>
          </div>
        </Card>

        {/* Table Card */}
        <Card className="p-6">
          <h2 className="text-base font-semibold mb-4">Análise Mensal de Impostos</h2>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : taxRows.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Nenhum dado encontrado. Faça upload de comissões e registre custos de anúncios.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mês</TableHead>
                    <TableHead className="text-right">Invest. Anúncios</TableHead>
                    <TableHead className="text-right">Impostos Anúncios</TableHead>
                    <TableHead className="text-right">Invest. Total</TableHead>
                    <TableHead className="text-right">Comissões</TableHead>
                    <TableHead className="text-right">Impostos Saídas</TableHead>
                    <TableHead className="text-right">Lucro Líquido</TableHead>
                    <TableHead className="text-right">Margem %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {taxRows.map((row) => (
                    <TableRow key={row.monthKey}>
                      <TableCell className="font-medium">{row.month}</TableCell>
                      <TableCell className="text-right">{currency(row.investimento)}</TableCell>
                      <TableCell className="text-right text-orange-400">{currency(row.impostosAnuncios)}</TableCell>
                      <TableCell className="text-right">{currency(row.investimentoTotal)}</TableCell>
                      <TableCell className="text-right text-green-400">{currency(row.comissoes)}</TableCell>
                      <TableCell className="text-right text-orange-400">{currency(row.impostosSaidas)}</TableCell>
                      <TableCell className={`text-right font-semibold ${row.lucroLiquido >= 0 ? "text-green-400" : "text-red-400"}`}>
                        {currency(row.lucroLiquido)}
                      </TableCell>
                      <TableCell className={`text-right font-semibold ${row.margemLucro >= 0 ? "text-green-400" : "text-red-400"}`}>
                        {pct(row.margemLucro)}
                      </TableCell>
                    </TableRow>
                  ))}

                  {/* Totals row */}
                  <TableRow className="border-t-2 font-bold bg-muted/30">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right">{currency(totals.investimento)}</TableCell>
                    <TableCell className="text-right text-orange-400">{currency(totals.impostosAnuncios)}</TableCell>
                    <TableCell className="text-right">{currency(totals.investimentoTotal)}</TableCell>
                    <TableCell className="text-right text-green-400">{currency(totals.comissoes)}</TableCell>
                    <TableCell className="text-right text-orange-400">{currency(totals.impostosSaidas)}</TableCell>
                    <TableCell className={`text-right ${totals.lucroLiquido >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {currency(totals.lucroLiquido)}
                    </TableCell>
                    <TableCell className={`text-right ${totals.margemLucro >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {pct(totals.margemLucro)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
