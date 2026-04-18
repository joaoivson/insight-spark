import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
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
import {
  calcTaxRows,
  calcTaxTotals,
  calcTaxDayRows,
  calcTaxDayTotals,
  formatMonthFull,
  type TaxRow,
  type TaxDayRow,
} from "@/shared/lib/taxes";
import { toDateKey } from "@/shared/lib/date";
import { cn } from "@/shared/lib/utils";

const currency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v ?? 0);

const pct = (v: number) => `${v.toFixed(2)}%`;

type SortKey = "key" | "investimento" | "impostosAnuncios" | "investimentoTotal" | "comissoes" | "impostosSaidas" | "lucroLiquido" | "margemLucro";
type SortDir = "asc" | "desc";

type UnifiedRow = {
  key: string;
  label: string;
  investimento: number;
  impostosAnuncios: number;
  investimentoTotal: number;
  comissoes: number;
  impostosSaidas: number;
  lucroLiquido: number;
  margemLucro: number;
};

function toUnified(r: TaxRow): UnifiedRow {
  return { key: r.monthKey, label: r.month, ...r };
}
function toUnifiedDay(r: TaxDayRow): UnifiedRow {
  return { key: r.dateKey, label: r.dateDisplay, ...r };
}

export default function ImpostosMeta() {
  const { toast } = useToast();
  const { fullAdSpends, fetchAdSpends, loading: adLoading } = useAdSpendsStore();
  const { fullRows, fetchRows, loading: rowsLoading } = useDatasetStore();

  const [adTaxRate, setAdTaxRate] = useState<string>("0");
  const [commTaxRate, setCommTaxRate] = useState<string>("0");
  const [saving, setSaving] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>("all");

  const [sortKey, setSortKey] = useState<SortKey>("key");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [pageSize, setPageSize] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);

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

  // Available months derived from all data
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    fullAdSpends.forEach((s) => {
      const dk = toDateKey(s.date as string);
      if (dk) months.add(dk.slice(0, 7));
    });
    fullRows.forEach((r) => {
      const dk = toDateKey(r.date);
      if (dk) months.add(dk.slice(0, 7));
    });
    return Array.from(months).sort().reverse();
  }, [fullAdSpends, fullRows]);

  const isDailyMode = selectedMonth !== "all";

  const monthlyRows = useMemo(
    () => calcTaxRows(fullAdSpends, fullRows, adRate, commRate),
    [fullAdSpends, fullRows, adTaxRate, commTaxRate]
  );

  const dailyRows = useMemo(() => {
    if (!isDailyMode) return [];
    return calcTaxDayRows(fullAdSpends, fullRows, adRate, commRate, selectedMonth);
  }, [fullAdSpends, fullRows, adTaxRate, commTaxRate, selectedMonth, isDailyMode]);

  const unifiedRows: UnifiedRow[] = useMemo(
    () => isDailyMode ? dailyRows.map(toUnifiedDay) : monthlyRows.map(toUnified),
    [isDailyMode, dailyRows, monthlyRows]
  );

  const totals = useMemo(
    () => isDailyMode ? calcTaxDayTotals(dailyRows) : calcTaxTotals(monthlyRows),
    [isDailyMode, dailyRows, monthlyRows]
  );

  const sortedRows = useMemo(() => {
    return [...unifiedRows].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const cmp = typeof av === "string" ? av.localeCompare(bv as string) : (av as number) - (bv as number);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [unifiedRows, sortKey, sortDir]);

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

  const tableTitle = isDailyMode
    ? `Análise Diária — ${formatMonthFull(selectedMonth)}`
    : "Análise Mensal de Impostos";

  const dateColLabel = isDailyMode ? "Data" : "Mês";

  return (
    <DashboardLayout title="Impostos">
      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Receipt className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">Impostos</h1>
        </div>

        {/* Config Card — compact */}
        <Card className="px-4 py-3">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[160px] space-y-1">
              <Label htmlFor="ad-tax" className="text-xs">% Imposto Anúncios</Label>
              <div className="relative">
                <Input
                  id="ad-tax"
                  type="number"
                  min={0}
                  max={100}
                  step={0.01}
                  value={adTaxRate}
                  onChange={(e) => setAdTaxRate(e.target.value)}
                  className="pr-7 h-8 text-sm"
                  placeholder="0"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">%</span>
              </div>
            </div>
            <div className="flex-1 min-w-[160px] space-y-1">
              <Label htmlFor="comm-tax" className="text-xs">% Imposto Saídas</Label>
              <div className="relative">
                <Input
                  id="comm-tax"
                  type="number"
                  min={0}
                  max={100}
                  step={0.01}
                  value={commTaxRate}
                  onChange={(e) => setCommTaxRate(e.target.value)}
                  className="pr-7 h-8 text-sm"
                  placeholder="0"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">%</span>
              </div>
            </div>
            <Button onClick={handleSave} disabled={saving} size="sm" className="gap-1.5 h-8">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Salvar
            </Button>
          </div>
        </Card>

        {/* KPI Cards — 6 in one row (5 individual + 1 combined) */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Invest. Anúncios */}
            <div className="bg-card rounded-xl border border-border p-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center mb-2">
                <Wallet className="w-4 h-4 text-warning" />
              </div>
              <div className="text-base font-bold leading-tight truncate">{currency(totals.investimento)}</div>
              <div className="text-xs text-muted-foreground mt-0.5">Invest. Anúncios</div>
            </div>
            {/* Impostos Anúncios */}
            <div className="bg-card rounded-xl border border-border p-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center mb-2">
                <BarChart3 className="w-4 h-4 text-warning" />
              </div>
              <div className="text-base font-bold leading-tight truncate">{currency(totals.impostosAnuncios)}</div>
              <div className="text-xs text-muted-foreground mt-0.5">Impostos Anúncios</div>
            </div>
            {/* Invest. Total */}
            <div className="bg-card rounded-xl border border-border p-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-chart-5/10 flex items-center justify-center mb-2">
                <DollarSign className="w-4 h-4 text-chart-5" />
              </div>
              <div className="text-base font-bold leading-tight truncate">{currency(totals.investimentoTotal)}</div>
              <div className="text-xs text-muted-foreground mt-0.5">Invest. Total</div>
            </div>
            {/* Comissões */}
            <div className="bg-card rounded-xl border border-border p-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center mb-2">
                <Percent className="w-4 h-4 text-success" />
              </div>
              <div className="text-base font-bold leading-tight truncate">{currency(totals.comissoes)}</div>
              <div className="text-xs text-muted-foreground mt-0.5">Comissões</div>
            </div>
            {/* Impostos Saídas */}
            <div className="bg-card rounded-xl border border-border p-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center mb-2">
                <TrendingDown className="w-4 h-4 text-warning" />
              </div>
              <div className="text-base font-bold leading-tight truncate">{currency(totals.impostosSaidas)}</div>
              <div className="text-xs text-muted-foreground mt-0.5">Impostos Saídas</div>
            </div>
            {/* Lucro Líquido + Margem (combined) */}
            <div className={cn(
              "bg-card rounded-xl border border-border p-3 min-w-0",
              totals.lucroLiquido >= 0 ? "border-success/20" : "border-destructive/20"
            )}>
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center mb-2",
                totals.lucroLiquido >= 0 ? "bg-success/10" : "bg-destructive/10"
              )}>
                <TrendingUp className={cn("w-4 h-4", totals.lucroLiquido >= 0 ? "text-success" : "text-destructive")} />
              </div>
              <div className={cn(
                "text-base font-bold leading-tight truncate",
                totals.lucroLiquido >= 0 ? "text-success" : "text-destructive"
              )}>
                {currency(totals.lucroLiquido)}
              </div>
              <div className={cn(
                "text-xs font-medium",
                totals.margemLucro >= 0 ? "text-success" : "text-destructive"
              )}>
                {pct(totals.margemLucro)}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">Lucro Líquido</div>
            </div>
          </div>
        )}

        {/* Table Card */}
        <Card className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="text-base font-semibold">{tableTitle}</h2>
            <Select
              value={selectedMonth}
              onValueChange={(v) => { setSelectedMonth(v); setCurrentPage(1); setSortKey("key"); setSortDir("desc"); }}
            >
              <SelectTrigger className="w-52 h-8 text-sm">
                <SelectValue placeholder="Todos os meses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os meses</SelectItem>
                {availableMonths.map((mk) => (
                  <SelectItem key={mk} value={mk}>{formatMonthFull(mk)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : unifiedRows.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {isDailyMode
                ? "Nenhum dado para o mês selecionado."
                : "Nenhum dado encontrado. Faça upload de comissões e registre custos de anúncios."}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort("key")}>
                        {dateColLabel}<SortIcon k="key" />
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
                      <TableRow key={row.key}>
                        <TableCell className="font-medium">{row.label}</TableCell>
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

              {/* Pagination */}
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
