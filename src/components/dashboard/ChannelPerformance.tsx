import { useMemo, useState } from "react";
import { DatasetRow } from "./DataTable";
import { AdSpend } from "@/shared/types/adspend";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Trophy,
  DollarSign,
  BarChart3,
  ArrowUpDown,
} from "lucide-react";
import { isBeforeDateKey, isAfterDateKey, parseDateOnly } from "@/shared/lib/date";
import { filterKpiRows, getComissaoCents, getComissaoAfiliado } from "@/shared/lib/kpi";
import { normalizeSubId } from "@/shared/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/shared/lib/utils";
import { toDateKey } from "@/shared/lib/date";

type DateRange = { from?: Date; to?: Date };

interface ChannelPerformanceProps {
  rows: DatasetRow[];
  adSpends: AdSpend[];
  dateRange?: DateRange;
  subIdFilter?: string;
  showSubTable?: boolean;
  showDayTable?: boolean;
  showHighlights?: boolean;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);

const ChannelPerformance = ({
  rows,
  adSpends,
  dateRange,
  subIdFilter = "",
  showSubTable = true,
  showDayTable = true,
  showHighlights = true,
}: ChannelPerformanceProps) => {
  // Filter rows by dateRange and KPI status (Pendente, Concluído) — mesma fonte que kpi.ts
  const filteredRows = useMemo(() => {
    let dateFiltered = rows;
    if (dateRange?.from || dateRange?.to) {
      dateFiltered = rows.filter((r) => {
        if (dateRange.from && isBeforeDateKey(r.date, dateRange.from)) return false;
        if (dateRange.to && isAfterDateKey(r.date, dateRange.to)) return false;
        return true;
      });
    }
    return filterKpiRows(dateFiltered);
  }, [rows, dateRange]);

  // Filter adSpends by dateRange and subIdFilter
  const filteredAdSpends = useMemo(() => {
    let result = adSpends;
    if (dateRange?.from || dateRange?.to) {
      result = result.filter((spend) => {
        if (dateRange.from && isBeforeDateKey(spend.date, dateRange.from)) return false;
        if (dateRange.to && isAfterDateKey(spend.date, dateRange.to)) return false;
        return true;
      });
    }
    if (subIdFilter) {
      result = result.filter((spend) =>
        (spend.sub_id || "").toLowerCase() === subIdFilter.toLowerCase()
      );
    }
    return result;
  }, [adSpends, dateRange, subIdFilter]);

  const MAX_ROWS = 50;

  const [subPageSize, setSubPageSize] = useState<number>(5);
  const [subPage, setSubPage] = useState<number>(0);
  const [subSortColumn, setSubSortColumn] = useState<string>("revenue");
  const [subSortDirection, setSubSortDirection] = useState<"asc" | "desc">("desc");

  const [dayPageSize, setDayPageSize] = useState<number>(5);
  const [dayPage, setDayPage] = useState<number>(0);
  const [daySortColumn, setDaySortColumn] = useState<string | null>(null);
  const [daySortDirection, setDaySortDirection] = useState<"asc" | "desc">("desc");

  const metrics = useMemo(() => {
    // Filter rows by dateRange and KPI status (Pendente, Concluído) — mesma fonte que kpi.ts
    const channelMap = new Map<string, { commission: number; spend: number; orders: number }>();

    // 1. Processar Comissões por canal (Sub ID)
    filteredRows.forEach((row) => {
      const rawId = normalizeSubId(row.sub_id1);
      const channel = rawId === "Sem Sub ID" ? "orgânico/outros" : rawId;
      const current = channelMap.get(channel) || { commission: 0, spend: 0, orders: 0 };

      const commission = getComissaoAfiliado(row);

      channelMap.set(channel, {
        ...current,
        commission: current.commission + commission,
        orders: current.orders + 1
      });
    });

    // 2. Processar Gastos (Ads)
    let totalGeneralSpend = 0;

    filteredAdSpends.forEach((spend) => {
      if (!spend.sub_id || spend.sub_id === "Geral/Institucional") {
        totalGeneralSpend += (spend.amount || 0);
      } else {
        const rawSpend = normalizeSubId(spend.sub_id);
        const channel = rawSpend === "Sem Sub ID" ? "orgânico/outros" : rawSpend;
        const current = channelMap.get(channel) || { commission: 0, spend: 0, orders: 0 };
        channelMap.set(channel, {
          ...current,
          spend: current.spend + (spend.amount || 0)
        });
      }
    });

    // Calcular total de comissão para rateio
    const totalCommission = Array.from(channelMap.values()).reduce((sum, val) => sum + val.commission, 0);

    // 3. Calcular KPIs Finais com Rateio proporcional à comissão
    const data = Array.from(channelMap.entries()).map(([name, vals]) => {
      const share = totalCommission > 0 ? vals.commission / totalCommission : 0;
      const allocatedGeneralSpend = totalGeneralSpend * share;
      const totalSpend = vals.spend + allocatedGeneralSpend;

      const commissionRounded = Math.round(vals.commission * 100) / 100;
      const profitRounded = Math.round((commissionRounded - totalSpend) * 100) / 100;
      const roas = totalSpend > 0 ? commissionRounded / totalSpend : 0;
      const roi = totalSpend > 0 ? profitRounded / totalSpend : 0;
      const cpa = vals.orders > 0 ? totalSpend / vals.orders : 0;

      return {
        name,
        commission: commissionRounded,
        spend: totalSpend,
        profit: profitRounded,
        revenue: commissionRounded,
        roas,
        roi,
        cpa,
        orders: vals.orders,
      };
    });

    return data.sort((a, b) => {
      let aVal: any = a[subSortColumn as keyof typeof a];
      let bVal: any = b[subSortColumn as keyof typeof b];

      if (aVal === bVal) return 0;
      if (aVal === undefined || aVal === null) return 1;
      if (bVal === undefined || bVal === null) return -1;

      if (typeof aVal === "number" && typeof bVal === "number") {
        return subSortDirection === "asc" ? aVal - bVal : bVal - aVal;
      }

      const comparison = String(aVal).localeCompare(String(bVal));
      return subSortDirection === "asc" ? comparison : -comparison;
    });
  }, [filteredRows, filteredAdSpends, subSortColumn, subSortDirection]);

  const limitedChannels = metrics.slice(0, MAX_ROWS);

  if (!metrics.length) return null;

  // Encontrar destaques
  const starChannel = metrics.reduce((prev, current) => (current.roas > prev.roas && current.spend > 0) ? current : prev, metrics[0]);
  const alertChannel = metrics.find(m => m.profit < 0 && m.spend > 0);
  const volumeChannel = metrics.reduce((prev, current) => (current.revenue > prev.revenue) ? current : prev, metrics[0]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Tabela Visual */}
      {showSubTable && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="p-6 border-b border-border">
            <h3 className="font-display font-semibold text-lg">Performance Detalhada por Sub ID</h3>
            <p className="text-sm text-muted-foreground">Análise de custos de anúncios vs retorno real. (máx. {MAX_ROWS} linhas)</p>
          </div>
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>
                  <button
                    className="flex items-center gap-1 hover:text-foreground transition-colors"
                    onClick={() => {
                      if (subSortColumn === "name") {
                        setSubSortDirection(subSortDirection === "asc" ? "desc" : "asc");
                      } else {
                        setSubSortColumn("name");
                        setSubSortDirection("asc");
                      }
                    }}
                  >
                    Sub ID
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </TableHead>
                <TableHead className="text-right">
                  <button
                    className="flex items-center gap-1 hover:text-foreground transition-colors ml-auto"
                    onClick={() => {
                      if (subSortColumn === "spend") {
                        setSubSortDirection(subSortDirection === "asc" ? "desc" : "asc");
                      } else {
                        setSubSortColumn("spend");
                        setSubSortDirection("desc");
                      }
                    }}
                  >
                    Custos de Anúncios
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </TableHead>
                <TableHead className="text-right">
                  <button
                    className="flex items-center gap-1 hover:text-foreground transition-colors ml-auto"
                    onClick={() => {
                      if (subSortColumn === "revenue") {
                        setSubSortDirection(subSortDirection === "asc" ? "desc" : "asc");
                      } else {
                        setSubSortColumn("revenue");
                        setSubSortDirection("desc");
                      }
                    }}
                  >
                    Receita (Comissão)
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </TableHead>
                <TableHead className="text-right">
                  <button
                    className="flex items-center gap-1 hover:text-foreground transition-colors ml-auto"
                    onClick={() => {
                      if (subSortColumn === "profit") {
                        setSubSortDirection(subSortDirection === "asc" ? "desc" : "asc");
                      } else {
                        setSubSortColumn("profit");
                        setSubSortDirection("desc");
                      }
                    }}
                  >
                    Lucro (Comissão - Gasto)
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </TableHead>
                <TableHead className="text-center">
                  <button
                    className="flex items-center gap-1 hover:text-foreground transition-colors mx-auto"
                    onClick={() => {
                      if (subSortColumn === "roas") {
                        setSubSortDirection(subSortDirection === "asc" ? "desc" : "asc");
                      } else {
                        setSubSortColumn("roas");
                        setSubSortDirection("desc");
                      }
                    }}
                  >
                    ROAS
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(() => {
                const totalPages = Math.max(1, Math.ceil(limitedChannels.length / subPageSize));
                const safePage = Math.min(subPage, totalPages - 1);
                const start = safePage * subPageSize;
                const pageRows = limitedChannels.slice(start, start + subPageSize);

                return (
                  <>
                    {pageRows.map((m) => {
                      const isProfit = m.profit > 0;
                      const roasColor = m.roas >= 1 ? "text-green-500" : "text-red-500";
                      const RoasIcon = m.roas >= 1 ? TrendingUp : TrendingDown;

                      return (
                        <TableRow key={m.name}>
                          <TableCell className="font-medium text-foreground">
                            {m.name}
                            <span className="block text-xs text-muted-foreground font-normal">{m.orders} pedidos • CPA {formatCurrency(m.cpa)}</span>
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">{formatCurrency(m.spend)}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(m.revenue)}</TableCell>
                          <TableCell className={cn("text-right font-bold", isProfit ? "text-green-500" : "text-red-500")}>
                            {formatCurrency(m.profit)}
                          </TableCell>
                          <TableCell className={cn("text-center font-semibold flex items-center justify-center gap-2", roasColor)}>
                            <RoasIcon className="w-4 h-4" />
                            {m.spend > 0 ? `${m.roas.toFixed(2)}x` : "∞"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    <TableRow>
                      <TableCell colSpan={5} className="p-3">
                        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <span>Linhas por página</span>
                            <select
                              className="bg-background border border-border rounded px-2 py-1"
                              value={String(subPageSize)}
                              onChange={(e) => {
                                const size = Number(e.target.value);
                                setSubPageSize(size);
                                setSubPage(0);
                              }}
                            >
                              {[5, 10, 25, 50, 100].map((n) => (
                                <option key={n} value={n}>{n}</option>
                              ))}
                            </select>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              className="px-2 py-1 rounded border border-border disabled:opacity-50"
                              onClick={() => setSubPage(0)}
                              disabled={safePage === 0}
                            >
                              Primeira
                            </button>
                            <button
                              className="px-2 py-1 rounded border border-border disabled:opacity-50"
                              onClick={() => setSubPage((p) => Math.max(0, p - 1))}
                              disabled={safePage === 0}
                            >
                              Anterior
                            </button>
                            <span>Página {safePage + 1} de {totalPages}</span>
                            <button
                              className="px-2 py-1 rounded border border-border disabled:opacity-50"
                              onClick={() => setSubPage((p) => Math.min(totalPages - 1, p + 1))}
                              disabled={safePage >= totalPages - 1}
                            >
                              Próxima
                            </button>
                            <button
                              className="px-2 py-1 rounded border border-border disabled:opacity-50"
                              onClick={() => setSubPage(totalPages - 1)}
                              disabled={safePage >= totalPages - 1}
                            >
                              Última
                            </button>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  </>
                );
              })()}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Performance por Dia */}
      {showDayTable && (
        <div className="bg-card border border-border rounded-xl overflow-hidden min-h-[320px]">
          <div className="p-6 border-b border-border">
            <h3 className="font-display font-semibold text-lg">Performance por Dia</h3>
            <p className="text-sm text-muted-foreground">Custos de anúncios vs comissão diária.</p>
          </div>
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>
                  <button
                    className="flex items-center gap-1 hover:text-foreground transition-colors"
                    onClick={() => {
                      if (daySortColumn === "day") {
                        setDaySortDirection(daySortDirection === "asc" ? "desc" : "asc");
                      } else {
                        setDaySortColumn("day");
                        setDaySortDirection("desc");
                      }
                    }}
                  >
                    Dia
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </TableHead>
                <TableHead className="text-right">
                  <button
                    className="flex items-center gap-1 hover:text-foreground transition-colors ml-auto"
                    onClick={() => {
                      if (daySortColumn === "spend") {
                        setDaySortDirection(daySortDirection === "asc" ? "desc" : "asc");
                      } else {
                        setDaySortColumn("spend");
                        setDaySortDirection("desc");
                      }
                    }}
                  >
                    Custos de Anúncios
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </TableHead>
                <TableHead className="text-right">
                  <button
                    className="flex items-center gap-1 hover:text-foreground transition-colors ml-auto"
                    onClick={() => {
                      if (daySortColumn === "commission") {
                        setDaySortDirection(daySortDirection === "asc" ? "desc" : "asc");
                      } else {
                        setDaySortColumn("commission");
                        setDaySortDirection("desc");
                      }
                    }}
                  >
                    Receita (Comissão)
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </TableHead>
                <TableHead className="text-right">
                  <button
                    className="flex items-center gap-1 hover:text-foreground transition-colors ml-auto"
                    onClick={() => {
                      if (daySortColumn === "profit") {
                        setDaySortDirection(daySortDirection === "asc" ? "desc" : "asc");
                      } else {
                        setDaySortColumn("profit");
                        setDaySortDirection("desc");
                      }
                    }}
                  >
                    Lucro (Comissão - Gasto)
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </TableHead>
                <TableHead className="text-center">
                  <button
                    className="flex items-center gap-1 hover:text-foreground transition-colors mx-auto"
                    onClick={() => {
                      if (daySortColumn === "roas") {
                        setDaySortDirection(daySortDirection === "asc" ? "desc" : "asc");
                      } else {
                        setDaySortColumn("roas");
                        setDaySortDirection("desc");
                      }
                    }}
                  >
                    ROAS
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(() => {
                const dayMap = new Map<string, { commission: number; spend: number; orders: number }>();
                filteredRows.forEach((row) => {
                  const day = row.date ? toDateKey(row.date) : "Sem data";
                  const commission = getComissaoAfiliado(row);
                  const cur = dayMap.get(day) || { commission: 0, spend: 0, orders: 0 };
                  dayMap.set(day, {
                    commission: cur.commission + commission,
                    spend: cur.spend,
                    orders: cur.orders + 1,
                  });
                });
                filteredAdSpends.forEach((spend) => {
                  const day = spend.date ? toDateKey(spend.date) : "Sem data";
                  const cur = dayMap.get(day) || { commission: 0, spend: 0, orders: 0 };
                  dayMap.set(day, {
                    ...cur,
                    spend: cur.spend + (spend.amount || 0),
                  });
                });
                let dayData = Array.from(dayMap.entries())
                  .map(([day, vals]) => {
                    const profit = vals.commission - vals.spend; // lucro: comissão - gasto
                    const roas = vals.spend > 0 ? vals.commission / vals.spend : vals.commission > 0 ? 999 : 0;
                    return { day, ...vals, profit, roas };
                  });

                // Apply sorting
                if (daySortColumn) {
                  dayData = dayData.sort((a, b) => {
                    let aVal: any = a[daySortColumn as keyof typeof a];
                    let bVal: any = b[daySortColumn as keyof typeof b];

                    if (daySortColumn === "day") {
                      aVal = a.day;
                      bVal = b.day;
                    }

                    if (aVal === bVal) return 0;
                    if (aVal === undefined || aVal === null) return 1;
                    if (bVal === undefined || bVal === null) return -1;

                    if (typeof aVal === "number" && typeof bVal === "number") {
                      return daySortDirection === "asc" ? aVal - bVal : bVal - aVal;
                    }

                    const comparison = String(aVal).localeCompare(String(bVal));
                    return daySortDirection === "asc" ? comparison : -comparison;
                  });
                } else {
                  // Default sort by day ascending
                  dayData = dayData.sort((a, b) => a.day.localeCompare(b.day));
                }

                const totalPages = Math.max(1, Math.ceil(dayData.length / dayPageSize));
                const safePage = Math.min(dayPage, totalPages - 1);
                const start = safePage * dayPageSize;
                const limited = dayData.slice(start, start + dayPageSize);

                return (
                  <>
                    {limited.map((d) => {
                      const isProfit = d.profit > 0;
                      const roasColor = d.roas >= 1 ? "text-green-500" : "text-red-500";
                      const RoasIcon = d.roas >= 1 ? TrendingUp : TrendingDown;
                      return (
                        <TableRow key={d.day}>
                          <TableCell className="font-medium text-foreground">
                            {(() => {
                              const m = d.day.match(/^(\d{4})-(\d{2})-(\d{2})$/);
                              if (!m) {
                                const parsed = parseDateOnly(d.day);
                                return parsed ? parsed.toLocaleDateString("pt-BR") : d.day;
                              }
                              const local = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
                              return isNaN(local.getTime())
                                ? (parseDateOnly(d.day)?.toLocaleDateString("pt-BR") ?? d.day)
                                : local.toLocaleDateString("pt-BR");
                            })()}
                            <span className="block text-xs text-muted-foreground font-normal">{d.orders} pedidos</span>
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">{formatCurrency(d.spend)}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(d.commission)}</TableCell>
                          <TableCell className={cn("text-right font-bold", isProfit ? "text-green-500" : "text-red-500")}>
                            {formatCurrency(d.profit)}
                          </TableCell>
                          <TableCell className={cn("text-center font-semibold flex items-center justify-center gap-2", roasColor)}>
                            <RoasIcon className="w-4 h-4" />
                            {d.spend > 0 ? `${d.roas.toFixed(2)}x` : "∞"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    <TableRow>
                      <TableCell colSpan={5} className="p-3">
                        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <span>Linhas por página</span>
                            <select
                              className="bg-background border border-border rounded px-2 py-1"
                              value={String(dayPageSize)}
                              onChange={(e) => {
                                const size = Number(e.target.value);
                                setDayPageSize(size);
                                setDayPage(0);
                              }}
                            >
                              {[5, 10, 25, 50, 100].map((n) => (
                                <option key={n} value={n}>{n}</option>
                              ))}
                            </select>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              className="px-2 py-1 rounded border border-border disabled:opacity-50"
                              onClick={() => setDayPage(0)}
                              disabled={safePage === 0}
                            >
                              Primeira
                            </button>
                            <button
                              className="px-2 py-1 rounded border border-border disabled:opacity-50"
                              onClick={() => setDayPage((p) => Math.max(0, p - 1))}
                              disabled={safePage === 0}
                            >
                              Anterior
                            </button>
                            <span>Página {safePage + 1} de {totalPages}</span>
                            <button
                              className="px-2 py-1 rounded border border-border disabled:opacity-50"
                              onClick={() => setDayPage((p) => Math.min(totalPages - 1, p + 1))}
                              disabled={safePage >= totalPages - 1}
                            >
                              Próxima
                            </button>
                            <button
                              className="px-2 py-1 rounded border border-border disabled:opacity-50"
                              onClick={() => setDayPage(totalPages - 1)}
                              disabled={safePage >= totalPages - 1}
                            >
                              Última
                            </button>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  </>
                );
              })()}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default ChannelPerformance;
