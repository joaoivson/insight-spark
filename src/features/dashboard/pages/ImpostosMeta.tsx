import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import KPICards from "@/components/dashboard/KPICards";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  Receipt,
  Save,
  Loader2,
  Calendar as CalendarIcon,
  Wallet,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Percent,
  BarChart3,
} from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAdSpendsStore } from "@/stores/adSpendsStore";
import { useDatasetStore } from "@/stores/datasetStore";
import { getTaxSettings, updateTaxSettings } from "@/services/tax_settings.service";
import { calcTaxRows, calcTaxTotals } from "@/shared/lib/taxes";
import type { KPIData } from "@/components/dashboard/KPICards";

const currency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v ?? 0);

const pct = (v: number) => `${v.toFixed(2)}%`;

type DateRange = { from: Date; to: Date };

function currentMonthRange(): DateRange {
  const now = new Date();
  return { from: startOfMonth(now), to: endOfMonth(now) };
}

export default function ImpostosMeta() {
  const { toast } = useToast();
  const { fullAdSpends, fetchAdSpends, loading: adLoading } = useAdSpendsStore();
  const { fullRows, fetchRows, loading: rowsLoading } = useDatasetStore();

  const [adTaxRate, setAdTaxRate] = useState<string>("0");
  const [commTaxRate, setCommTaxRate] = useState<string>("0");
  const [saving, setSaving] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);

  const [dateRange, setDateRange] = useState<DateRange>(currentMonthRange());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [selecting, setSelecting] = useState<"from" | "to">("from");
  const [tempFrom, setTempFrom] = useState<Date | undefined>(dateRange.from);

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

  // KPI cards: filter rows by selected date range
  const filteredRows = useMemo(() => {
    const fromKey = format(dateRange.from, "yyyy-MM");
    const toKey = format(dateRange.to, "yyyy-MM");
    return taxRows.filter((r) => r.monthKey >= fromKey && r.monthKey <= toKey);
  }, [taxRows, dateRange]);

  const kpiTotals = useMemo(() => calcTaxTotals(filteredRows), [filteredRows]);

  const totals = useMemo(() => calcTaxTotals(taxRows), [taxRows]);

  const kpis: KPIData[] = [
    {
      title: "Invest. Anúncios",
      value: currency(kpiTotals.investimento),
      icon: Wallet,
      iconColor: "text-warning",
    },
    {
      title: "Impostos Anúncios",
      value: currency(kpiTotals.impostosAnuncios),
      icon: BarChart3,
      iconColor: "text-warning",
    },
    {
      title: "Invest. Total",
      value: currency(kpiTotals.investimentoTotal),
      icon: DollarSign,
      iconColor: "text-chart-5",
    },
    {
      title: "Comissões",
      value: currency(kpiTotals.comissoes),
      icon: Percent,
      iconColor: "text-success",
    },
    {
      title: "Impostos Saídas",
      value: currency(kpiTotals.impostosSaidas),
      icon: TrendingDown,
      iconColor: "text-warning",
    },
    {
      title: "Lucro Líquido",
      value: currency(kpiTotals.lucroLiquido),
      changeType: kpiTotals.lucroLiquido >= 0 ? "positive" : "negative",
      icon: TrendingUp,
      iconColor: kpiTotals.lucroLiquido >= 0 ? "text-success" : "text-accent",
    },
    {
      title: "Margem de Lucro",
      value: pct(kpiTotals.margemLucro),
      changeType: kpiTotals.margemLucro >= 0 ? "positive" : "negative",
      icon: Receipt,
      iconColor: kpiTotals.margemLucro >= 0 ? "text-success" : "text-accent",
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

  const handleCalendarSelect = (date: Date | undefined) => {
    if (!date) return;
    if (selecting === "from") {
      setTempFrom(date);
      setSelecting("to");
    } else {
      const from = tempFrom!;
      const to = date;
      if (to < from) {
        setDateRange({ from: startOfMonth(to), to: endOfMonth(from) });
      } else {
        setDateRange({ from: startOfMonth(from), to: endOfMonth(to) });
      }
      setCalendarOpen(false);
      setSelecting("from");
      setTempFrom(undefined);
    }
  };

  const dateRangeLabel =
    format(dateRange.from, "MMM/yyyy", { locale: ptBR }) ===
    format(dateRange.to, "MMM/yyyy", { locale: ptBR })
      ? format(dateRange.from, "MMM/yyyy", { locale: ptBR })
      : `${format(dateRange.from, "MMM/yyyy", { locale: ptBR })} – ${format(dateRange.to, "MMM/yyyy", { locale: ptBR })}`;

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

        {/* KPI Section */}
        <div className="space-y-4">
          {/* Period picker */}
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Resumo do Período</h2>
            <Popover open={calendarOpen} onOpenChange={(open) => {
              setCalendarOpen(open);
              if (!open) { setSelecting("from"); setTempFrom(undefined); }
            }}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2 text-sm">
                  <CalendarIcon className="w-4 h-4" />
                  <span className="capitalize">{dateRangeLabel}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <div className="p-3 text-xs text-muted-foreground border-b">
                  {selecting === "from" ? "Selecione o mês inicial" : "Selecione o mês final"}
                </div>
                <Calendar
                  mode="single"
                  selected={selecting === "to" ? tempFrom : dateRange.from}
                  onSelect={handleCalendarSelect}
                  locale={ptBR}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* KPI Cards */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <KPICards kpis={kpis} />
          )}
        </div>

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
