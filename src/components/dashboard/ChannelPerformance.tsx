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
import { isBeforeDateKey, isAfterDateKey } from "@/shared/lib/date";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/shared/lib/utils";

type DateRange = { from?: Date; to?: Date };

interface ChannelPerformanceProps {
  rows: DatasetRow[];
  adSpends: AdSpend[];
  dateRange?: DateRange;
  showSubTable?: boolean;
  showDayTable?: boolean;
  showHighlights?: boolean;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);

const cleanNumber = (value: any): number => {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    let cleaned = value.replace(/R\$/gi, "").replace(/\s+/g, "");
    const hasComma = cleaned.includes(",");
    const hasDot = cleaned.includes(".");
    if (hasComma && hasDot) cleaned = cleaned.replace(/\./g, "").replace(/,/g, ".");
    else if (hasComma) cleaned = cleaned.replace(/\./g, "").replace(/,/g, ".");
    const num = Number(cleaned);
    return Number.isFinite(num) ? num : 0;
  }
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const getAffiliateCommission = (row: DatasetRow) => {
  const raw = (row as any).raw_data || {};
  const affiliate = cleanNumber(raw["Comissão líquida do afiliado(R$)"]);
  if (affiliate) return affiliate;
  return cleanNumber(raw["Comissão do Item da Shopee(R$)"]);
};

const ChannelPerformance = ({
  rows,
  adSpends,
  dateRange,
  showSubTable = true,
  showDayTable = true,
  showHighlights = true,
}: ChannelPerformanceProps) => {
  // Filter rows by dateRange
  const filteredRows = useMemo(() => {
    if (!dateRange?.from && !dateRange?.to) return rows;
    return rows.filter((r) => {
      if (dateRange.from && isBeforeDateKey(r.date, dateRange.from)) return false;
      if (dateRange.to && isAfterDateKey(r.date, dateRange.to)) return false;
      return true;
    });
  }, [rows, dateRange]);

  // Filter adSpends by dateRange
  const filteredAdSpends = useMemo(() => {
    if (!dateRange?.from && !dateRange?.to) return adSpends;
    return adSpends.filter((spend) => {
      const spendDate = spend.date;
      if (dateRange.from && isBeforeDateKey(spendDate, dateRange.from)) return false;
      if (dateRange.to && isAfterDateKey(spendDate, dateRange.to)) return false;
      return true;
    });
  }, [adSpends, dateRange]);

  const metrics = useMemo(() => {
    const channelMap = new Map<string, { commission: number; spend: number; orders: number }>();

    // 1. Processar Comissões por canal (Sub ID)
    filteredRows.forEach((row) => {
      const channel = row.sub_id1 || "Orgânico/Outros";
      const current = channelMap.get(channel) || { commission: 0, spend: 0, orders: 0 };
      
      const commission = getAffiliateCommission(row);

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
        const channel = spend.sub_id;
        const current = channelMap.get(channel) || { revenue: 0, commission: 0, spend: 0, orders: 0 };
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

      const receita = vals.commission; // receita = comissão (pedido do usuário)
      const profit = vals.commission - totalSpend; // lucro: comissão - gasto
      const roas = totalSpend > 0 ? vals.commission / totalSpend : vals.commission > 0 ? 999 : 0;
      const roi = totalSpend > 0 ? (profit / totalSpend) * 100 : 0;
      const cpa = vals.orders > 0 ? totalSpend / vals.orders : 0;

      return {
        name,
        commission: vals.commission,
        spend: totalSpend, // Agora inclui o rateio
        profit,
        revenue: receita,
        roas,
        roi,
        cpa,
        orders: vals.orders,
      };
    });

    return data.sort((a, b) => b.revenue - a.revenue); // Ordenar por receita padrão
  }, [filteredRows, filteredAdSpends]);

  const MAX_ROWS = 50;
  const limitedChannels = metrics.slice(0, MAX_ROWS);
  const [subPageSize, setSubPageSize] = useState<number>(5);
  const [subPage, setSubPage] = useState<number>(0);
  const [dayPageSize, setDayPageSize] = useState<number>(5);
  const [dayPage, setDayPage] = useState<number>(0);
  const [daySortColumn, setDaySortColumn] = useState<string | null>(null);
  const [daySortDirection, setDaySortDirection] = useState<"asc" | "desc">("desc");
  
  if (!metrics.length) return null;

  // Encontrar destaques
  const starChannel = metrics.reduce((prev, current) => (current.roas > prev.roas && current.spend > 0) ? current : prev, metrics[0]);
  const alertChannel = metrics.find(m => m.profit < 0 && m.spend > 0);
  const volumeChannel = metrics.reduce((prev, current) => (current.revenue > prev.revenue) ? current : prev, metrics[0]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {showHighlights && (
        <div className="grid md:grid-cols-3 gap-4">
          {/* Card Estrela */}
          <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-xl p-4 flex items-center gap-4">
            <div className="p-3 bg-indigo-500/20 rounded-lg text-indigo-500">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Campeão de ROAS</p>
              <p className="text-lg font-bold text-foreground">{starChannel?.name || "N/A"}</p>
              <p className="text-xs text-indigo-400 font-medium">
                {starChannel?.spend > 0 ? `${starChannel.roas.toFixed(1)}x retorno` : "Sem gastos registrados"}
              </p>
            </div>
          </div>

          {/* Card Volume */}
          <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 rounded-lg text-blue-500">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Maior Volume</p>
              <p className="text-lg font-bold text-foreground">{volumeChannel?.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(volumeChannel?.revenue)} em vendas
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tabela Visual */}
      {showSubTable && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="p-6 border-b border-border">
            <h3 className="font-display font-semibold text-lg">Performance Detalhada por Sub ID</h3>
            <p className="text-sm text-muted-foreground">Análise de investimento vs retorno real. (máx. {MAX_ROWS} linhas)</p>
          </div>
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Sub ID</TableHead>
                <TableHead className="text-right">Investimento (Gasto Anúncio)</TableHead>
                <TableHead className="text-right">Receita (Comissão)</TableHead>
                <TableHead className="text-right">Lucro (Comissão - Gasto)</TableHead>
                <TableHead className="text-center">ROAS</TableHead>
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
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="p-6 border-b border-border">
            <h3 className="font-display font-semibold text-lg">Performance por Dia</h3>
            <p className="text-sm text-muted-foreground">Investimento vs comissão diária.</p>
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
                    Investimento (Gasto Anúncio)
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
                  const day = row.date || "Sem data";
                  const commission = getAffiliateCommission(row);
                  const cur = dayMap.get(day) || { commission: 0, spend: 0, orders: 0 };
                  dayMap.set(day, {
                    commission: cur.commission + commission,
                    spend: cur.spend,
                    orders: cur.orders + 1,
                  });
                });
                filteredAdSpends.forEach((spend) => {
                  const day = spend.date ? new Date(spend.date).toISOString().slice(0, 10) : "Sem data";
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
                              if (!m) return new Date(d.day).toLocaleDateString("pt-BR");
                              const local = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
                              return isNaN(local.getTime())
                                ? new Date(d.day).toLocaleDateString("pt-BR")
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
