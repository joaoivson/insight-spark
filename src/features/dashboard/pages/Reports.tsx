import DashboardLayout from "@/components/dashboard/DashboardLayout";
import KPICards, { KPIData } from "@/components/dashboard/KPICards";
import { motion } from "framer-motion";
import {
  FileText,
  Download,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Target,
  BarChart2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useEffect, useMemo } from "react";
import type { DatasetRow } from "@/components/dashboard/DataTable";
import { Skeleton } from "@/components/ui/skeleton";
import { useDatasetStore } from "@/stores/datasetStore";
import { useAdSpendsStore } from "@/stores/adSpendsStore";
import { toDateKey, parseDateOnly } from "@/shared/lib/date";
import { calcTotals, getFaturamento, getComissaoAfiliado } from "@/shared/lib/kpi";
import * as XLSX from "xlsx";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);

const formatPercent = (value: number) =>
  new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1, minimumFractionDigits: 1 }).format(value || 0) + "%";

const ReportsPage = () => {
  const { rows, loading, fetchRows } = useDatasetStore();
  const { adSpends, loading: spendsLoading, fetchAdSpends } = useAdSpendsStore();

  useEffect(() => {
    fetchRows({});
    fetchAdSpends({});
  }, []);

  const getComissao = (row: DatasetRow) => getComissaoAfiliado(row);

  const monthly = useMemo(() => {
    const spendByMonth = new Map<string, number>();
    adSpends.forEach((spend) => {
      const spendDateKey = toDateKey(spend.date);
      const monthKey = spendDateKey ? spendDateKey.slice(0, 7) : "";
      if (!monthKey) return;
      spendByMonth.set(monthKey, (spendByMonth.get(monthKey) || 0) + (spend.amount || 0));
    });

    const map = new Map<
      string,
      {
        revenue: number;
        commission: number;
        monthDate: Date;
      }
    >();

    rows.forEach((r) => {
      const d = parseDateOnly(r.date);
      if (!d) return;
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const prev = map.get(monthKey) || { revenue: 0, commission: 0, monthDate: d };
      const faturamento = getFaturamento(r);
      const comissao = getComissao(r);
      map.set(monthKey, {
        revenue: prev.revenue + faturamento,
        commission: prev.commission + comissao,
        monthDate: d,
      });
    });

    return Array.from(map.entries())
      .map(([monthKey, vals]) => {
        const spend = spendByMonth.get(monthKey) || 0;
        const profit = vals.commission - spend;
        return {
          monthKey,
          month: vals.monthDate.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }),
          revenue: vals.revenue,
          commission: vals.commission,
          spend,
          profit,
        };
      })
      .sort((a, b) => a.monthKey.localeCompare(b.monthKey));
  }, [rows, adSpends]);

  const totals = useMemo(
    () => calcTotals(rows, adSpends, {}),
    [rows, adSpends]
  );

  const kpis: KPIData[] = useMemo(() => {
    const baseKpis = [
      {
        title: "Faturamento (Pend. + Concl.)",
        value: formatCurrency(totals.faturamento),
        icon: DollarSign,
        iconColor: "text-success",
      },
      {
        title: "Comissão (Pend. + Concl.)",
        value: formatCurrency(totals.comissao),
        icon: BarChart2,
        iconColor: "text-primary",
      },
      {
        title: "Valor Gasto Anúncios",
        value: formatCurrency(totals.gastoAnuncios),
        icon: ShoppingCart,
        iconColor: "text-warning",
      },
      {
        title: "Lucro",
        value: formatCurrency(totals.lucro),
        icon: Target,
        iconColor: "text-accent",
      },
      {
        title: "ROAS (Retorno)",
        value: `${totals.roas.toFixed(2)}x`,
        icon: TrendingUp,
        iconColor: "text-success",
      }
    ];
    return baseKpis;
  }, [totals]);

  const isLoading = loading || spendsLoading;

  const handleExportExcel = () => {
    const wsData = [
      ["Mês", "Faturamento", "Comissão", "Gasto Anúncios", "Lucro", "ROAS"],
      ...monthly.map((row) => [
        row.month,
        row.revenue,
        row.commission,
        row.spend,
        row.profit,
        row.spend > 0 ? (row.revenue / row.spend).toFixed(2) + "x" : "0.00x",
      ]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Relatório Mensal");
    XLSX.writeFile(wb, `relatorio_mensal_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <DashboardLayout 
      title="Relatórios" 
      subtitle="Análise detalhada dos seus dados"
      action={
        <div className="flex items-center gap-2">
          <Button onClick={handleExportExcel} className="gap-2" variant="accent">
            <Download className="w-4 h-4" />
            Exportar Excel
          </Button>
        </div>
      }
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {isLoading && !rows.length ? (
          <ReportsSkeleton />
        ) : (
          <>
            <KPICards kpis={kpis} />

            {/* Evidência de dados vazios */}
            {(!monthly.length || totals.faturamento === 0) && (
              <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-xl p-4 mb-8 flex items-start gap-3">
                <div className="mt-0.5 text-amber-700 dark:text-amber-200">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="space-y-1 text-amber-900 dark:text-amber-50">
                  <p className="font-semibold text-sm">Nenhum valor encontrado nesse período</p>
                  <p className="text-sm text-amber-800 dark:text-amber-100">
                    Ajuste o intervalo de datas ou selecione outro canal/status para visualizar resultados. Quando houver dados, os cards e a tabela serão preenchidos automaticamente.
                  </p>
                </div>
              </div>
            )}

            {/* Report Table */}
            <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden mt-8">
              <div className="p-6 border-b border-border flex items-center gap-3 bg-secondary/5">
                <div className="p-2 bg-background rounded-lg border border-border">
                  <FileText className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-foreground">Relatório Mensal</h3>
                  <p className="text-xs text-muted-foreground">Comparativo de performance por mês</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-secondary/20 hover:bg-secondary/20">
                      <TableHead className="w-[200px]">Mês</TableHead>
                      <TableHead className="text-right">Faturamento</TableHead>
                      <TableHead className="text-right">Comissão</TableHead>
                      <TableHead className="text-right">Gasto Anúncios</TableHead>
                      <TableHead className="text-right">Lucro (Comissão - Gasto)</TableHead>
                      <TableHead className="text-right">ROAS</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {monthly.map((row) => (
                      <TableRow key={row.month} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="font-medium text-foreground">{row.month}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{formatCurrency(row.revenue)}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{formatCurrency(row.commission)}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{formatCurrency(row.spend)}</TableCell>
                        <TableCell
                          className={`text-right font-bold ${row.profit < 0 ? "text-red-500" : "text-emerald-500"}`}
                        >
                          {formatCurrency(row.profit)}
                        </TableCell>
                        <TableCell
                          className={`text-right font-medium ${row.spend > 0 && row.revenue / row.spend >= 1 ? "text-emerald-500" : "text-red-500"}`}
                        >
                          {`${(row.spend > 0 ? row.revenue / row.spend : 0).toFixed(2)}x`}
                        </TableCell>
                      </TableRow>
                    ))}
                    {!monthly.length && (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        {isLoading ? "Carregando dados..." : "Nenhum dado encontrado para os filtros selecionados."}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </>
        )}
      </motion.div>
    </DashboardLayout>
  );
};

export default ReportsPage;

const ReportsSkeleton = () => {
  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-card rounded-xl border border-border p-6 space-y-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-8 w-40" />
          </div>
        ))}
      </div>
      <div className="bg-card rounded-xl border border-border p-4 space-y-3">
        <Skeleton className="h-5 w-40" />
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    </div>
  );
};
