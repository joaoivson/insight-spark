import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import KPICards from "@/components/dashboard/KPICards";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Receipt,
  Save,
  Loader2,
  Wallet,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Percent,
  BarChart3,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useAdSpendsStore } from "@/stores/adSpendsStore";
import { useDatasetStore } from "@/stores/datasetStore";
import { getTaxSettings, updateTaxSettings } from "@/services/tax_settings.service";
import { calcTaxRows, calcTaxTotals } from "@/shared/lib/taxes";
import type { KPIData } from "@/components/dashboard/KPICards";

const currency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v ?? 0);

const pct = (v: number) => `${v.toFixed(2)}%`;

type SortKey = "monthKey" | "investimento" | "impostosAnuncios" | "investimentoTotal" | "comissoes" | "impostosSaidas" | "lucroLiquido" | "margemLucro";
type SortDir = "asc" | "desc";

export default function ImpostosMeta() {
  const { toast } = useToast();
  const { fullAdSpends, fetchAdSpends, loading: adLoading } = useAdSpendsStore();
  const { fullRows, fetchRows, loading: rowsLoading } = useDatasetStore();

  const [adTaxRate, setAdTaxRate] = useState<string>("0");
  const [commTaxRate, setCommTaxRate] = useState<string>("0");
  const [saving, setSaving] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);

  const [sortKey, setSortKey] = useState<SortKey>("monthKey");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [pageSize, setPageSize] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);

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

  const adRate = parseFloat(adTaxRate) || 0;
  const commRate = parseFloat(commTaxRate) || 0;

  const taxRows = useMemo(
    () => calcTaxRows(fullAdSpends, fullRows, adRate, commRate),
    [fullAdSpends, fullRows, adTaxRate, commTaxRate]
  );

  const totals = useMemo(() => calcTaxTotals(taxRows), [taxRows]);

  const sortedRows = useMemo(() => {
    return [...taxRows].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const cmp = typeof av === "string" ? av.localeCompare(bv as string) : (av as number) - (bv as number);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [taxRows, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pagedRows = sortedRows.slice((safePage - 1) * pageSize, safePage * pageSize);

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setCurrentPage(1);
  };

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ArrowUpDown className="ml-1 w-3 h-3 inline opacity-40" />;
    return sortDir === "asc"
      ? <ArrowUp className="ml-1 w-3 h-3 inline text-primary" />
      : <ArrowDown className="ml-1 w-3 h-3 inline text-primary" />;
  };

  const kpis: KPIData[] = [
    {
      title: "Invest. Anúncios",
      value: currency(totals.investimento),
      icon: Wallet,
      iconColor: "text-warning",
    },
    {
      title: "Impostos Anúncios",
      value: currency(totals.impostosAnuncios),
      icon: BarChart3,
      iconColor: "text-warning",
    },
    {
      title: "Invest. Total",
      value: currency(totals.investimentoTotal),
      icon: DollarSign,
      iconColor: "text-chart-5",
    },
    {
      title: "Comissões",
      value: currency(totals.comissoes),
      icon: Percent,
      iconColor: "text-success",
    },
    {
      title: "Impostos Saídas",
      value: currency(totals.impostosSaidas),
      icon: TrendingDown,
      iconColor: "text-warning",
    },
    {
      title: "Lucro Líquido",
      value: currency(totals.lucroLiquido),
      changeType: totals.lucroLiquido >= 0 ? "positive" : "negative",
      icon: TrendingUp,
      iconColor: totals.lucroLiquido >= 0 ? "text-success" : "text-accent",
    },
    {
      title: "Margem de Lucro",
      value: pct(totals.margemLucro),
      changeType: totals.margemLucro >= 0 ? "positive" : "negative",
      icon: Receipt,
      iconColor: totals.margemLucro >= 0 ? "text-success" : "text-accent",
    },
  ];

  const handleSave = async () => {
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
    <DashboardLayout title="Impostos Meta">
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
              <p className="text-xs text-muted-foreground">Aplicado sobre o Investimento em Anúncios</p>
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
              <p className="text-xs text-muted-foreground">Aplicado sobre as Comissões recebidas</p>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvar Alíquotas
            </Button>
          </div>
        </Card>

        {/* KPI Cards */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <KPICards kpis={kpis} />
        )}

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
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort("monthKey")}>
                        Mês<SortIcon k="monthKey" />
                      </TableHead>
                      <TableHead className="text-right cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort("investimento")}>
                        Invest. Anúncios<SortIcon k="investimento" />
                      </TableHead>
                      <TableHead className="text-right cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort("impostosAnuncios")}>
                        Impostos Anúncios<SortIcon k="impostosAnuncios" />
                      </TableHead>
                      <TableHead className="text-right cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort("investimentoTotal")}>
                        Invest. Total<SortIcon k="investimentoTotal" />
                      </TableHead>
                      <TableHead className="text-right cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort("comissoes")}>
                        Comissões<SortIcon k="comissoes" />
                      </TableHead>
                      <TableHead className="text-right cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort("impostosSaidas")}>
                        Impostos Saídas<SortIcon k="impostosSaidas" />
                      </TableHead>
                      <TableHead className="text-right cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort("lucroLiquido")}>
                        Lucro Líquido<SortIcon k="lucroLiquido" />
                      </TableHead>
                      <TableHead className="text-right cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort("margemLucro")}>
                        Margem %<SortIcon k="margemLucro" />
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedRows.map((row) => (
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

              {/* Pagination controls */}
              <div className="flex items-center justify-between mt-4 gap-4 flex-wrap">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Linhas por página:</span>
                  <Select
                    value={String(pageSize)}
                    onValueChange={(v) => { setPageSize(Number(v)); setCurrentPage(1); }}
                  >
                    <SelectTrigger className="w-20 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[5, 10, 15, 20].map((n) => (
                        <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>
                    {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, sortedRows.length)} de {sortedRows.length}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={safePage === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={safePage === totalPages}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
