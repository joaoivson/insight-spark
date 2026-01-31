import { useMemo, useState } from "react";
import { ClickRow } from "@/services/clicks.service";
import { AdSpend } from "@/shared/types/adspend";
import { 
  MousePointerClick, 
  Share2, 
  Tag, 
  Instagram,
  Facebook,
  Link2,
  Calendar,
  ArrowUpDown,
  BarChart3
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn, normalizeSubId } from "@/shared/lib/utils";

interface DashboardClicksProps {
  clicks: ClickRow[];
  adSpends?: AdSpend[];
}

const DashboardClicks = ({ clicks, adSpends = [] }: DashboardClicksProps) => {
  // 1. Estados sempre no topo
  const [dayPage, setDayPage] = useState(0);
  const [dayPageSize, setDayPageSize] = useState(10);
  const [daySortDirection, setDaySortDirection] = useState<"asc" | "desc">("desc");

  // 2. Helpers
  const getItemClicks = (item: ClickRow): number => {
    return Number(item.clicks) || 0;
  };

  // 3. Cálculos Memorizados
  const totalClicks = useMemo(() => 
    clicks.reduce((acc, curr) => acc + getItemClicks(curr), 0), 
  [clicks]);

  // Comparação: Cliques Manuais (Ads) vs Cliques CSV por Sub ID
  const comparisonStats = useMemo(() => {
    const csvStats = clicks.reduce((acc, item) => {
      const subId = normalizeSubId(item.sub_id);
      acc[subId] = (acc[subId] || 0) + getItemClicks(item);
      return acc;
    }, {} as Record<string, number>);

    const adsStats = adSpends.reduce((acc, item) => {
      const subId = normalizeSubId(item.sub_id || "Geral");
      acc[subId] = (acc[subId] || 0) + (item.clicks || 0);
      return acc;
    }, {} as Record<string, number>);

    const allSubIds = Array.from(new Set([...Object.keys(csvStats), ...Object.keys(adsStats)]));

    return allSubIds.map(subId => {
      const csvClicks = csvStats[subId] || 0;
      const adsClicks = adsStats[subId] || 0;
      const diff = adsClicks - csvClicks;
      const diffPercent = csvClicks > 0 ? (diff / csvClicks) * 100 : 0;

      return {
        subId,
        csvClicks,
        adsClicks,
        diff,
        diffPercent
      };
    }).sort((a, b) => (b.csvClicks + b.adsClicks) - (a.csvClicks + a.adsClicks));
  }, [clicks, adSpends]);

  const channelStats = useMemo(() => {
    const stats = clicks.reduce((acc, item) => {
      const channel = (item.channel || "Others").trim();
      acc[channel] = (acc[channel] || 0) + getItemClicks(item);
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(stats)
      .map(([name, count]) => ({
        name,
        count,
        percentage: totalClicks > 0 ? (count / totalClicks) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [clicks, totalClicks]);

  const subIdStats = useMemo(() => {
    const stats = clicks.reduce((acc, item) => {
      const subId = normalizeSubId(item.sub_id);
      acc[subId] = (acc[subId] || 0) + getItemClicks(item);
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(stats)
      .map(([name, count]) => ({
        name,
        count,
        percentage: totalClicks > 0 ? (count / totalClicks) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [clicks, totalClicks]);

  const dailyStats = useMemo(() => {
    const stats = clicks.reduce((acc, item) => {
      const day = item.date || "Sem data";
      acc[day] = (acc[day] || 0) + getItemClicks(item);
      return acc;
    }, {} as Record<string, number>);

    const data = Object.entries(stats).map(([day, count]) => ({
      day,
      count,
    }));

    data.sort((a, b) => {
      const comparison = a.day.localeCompare(b.day);
      return daySortDirection === "asc" ? comparison : -comparison;
    });

    return data;
  }, [clicks, daySortDirection]);

  // 4. Lógica de Paginação do Dia
  const totalDayPages = Math.ceil(dailyStats.length / dayPageSize);
  const currentDayData = dailyStats.slice(dayPage * dayPageSize, (dayPage + 1) * dayPageSize);

  const getChannelIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes("instagram")) return <Instagram className="w-4 h-4 mr-2" />;
    if (lower.includes("facebook")) return <Facebook className="w-4 h-4 mr-2" />;
    return <Link2 className="w-4 h-4 mr-2" />;
  };

  if (!clicks.length) return null;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Total Clicks KPI */}
      <div className="flex justify-center">
        <div className="bg-card/50 border border-accent/20 rounded-full px-8 py-3 flex items-center gap-3 shadow-lg shadow-black/10">
          <span className="text-foreground font-display font-bold text-xl whitespace-nowrap">
            Total de Cliques: <span className="text-accent">{totalClicks.toLocaleString("pt-BR")}</span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Clicks by Channel */}
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-border bg-secondary/5 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            <Share2 className="w-4 h-4 text-accent" />
            <h3 className="font-display font-semibold text-sm uppercase tracking-wider">Cliques por Canal</h3>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-border/50">
                <TableHead className="text-xs font-bold uppercase tracking-wider">Canal</TableHead>
                <TableHead className="text-right text-xs font-bold uppercase tracking-wider">Cliques</TableHead>
                <TableHead className="text-right text-xs font-bold uppercase tracking-wider">%</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {channelStats.map((item) => (
                <TableRow key={item.name} className="hover:bg-secondary/20 border-border/50 transition-colors">
                  <TableCell className="font-medium flex items-center py-4">
                    {getChannelIcon(item.name)}
                    {item.name}
                  </TableCell>
                  <TableCell className="text-right font-mono py-4">{item.count.toLocaleString("pt-BR")}</TableCell>
                  <TableCell className="text-right text-muted-foreground py-4">{item.percentage.toFixed(1)}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Clicks by Sub ID */}
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-border bg-secondary/5 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            <Tag className="w-4 h-4 text-accent" />
            <h3 className="font-display font-semibold text-sm uppercase tracking-wider">Cliques por Sub ID</h3>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-border/50">
                <TableHead className="text-xs font-bold uppercase tracking-wider">Sub ID</TableHead>
                <TableHead className="text-right text-xs font-bold uppercase tracking-wider">Cliques</TableHead>
                <TableHead className="text-right text-xs font-bold uppercase tracking-wider">%</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subIdStats.map((item) => (
                <TableRow key={item.name} className="hover:bg-secondary/20 border-border/50 transition-colors">
                  <TableCell className="font-medium py-4">{item.name}</TableCell>
                  <TableCell className="text-right font-mono py-4">{item.count.toLocaleString("pt-BR")}</TableCell>
                  <TableCell className="text-right text-muted-foreground py-4">{item.percentage.toFixed(1)}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Comparison: Ads vs CSV */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border bg-secondary/5 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <BarChart3 className="w-4 h-4 text-primary" />
          <h3 className="font-display font-semibold text-sm uppercase tracking-wider">Comparativo: Anúncios vs CSV (por Sub ID)</h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-border/50">
              <TableHead className="text-xs font-bold uppercase tracking-wider">Sub ID</TableHead>
              <TableHead className="text-right text-xs font-bold uppercase tracking-wider">Cliques Anúncios</TableHead>
              <TableHead className="text-right text-xs font-bold uppercase tracking-wider">Cliques CSV (Importado)</TableHead>
              <TableHead className="text-right text-xs font-bold uppercase tracking-wider">Diferença</TableHead>
              <TableHead className="text-right text-xs font-bold uppercase tracking-wider">% Dif.</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {comparisonStats.map((item) => (
              <TableRow key={item.subId} className="hover:bg-secondary/20 border-border/50 transition-colors">
                <TableCell className="font-medium py-4">{item.subId}</TableCell>
                <TableCell className="text-right font-mono py-4">{item.adsClicks.toLocaleString("pt-BR")}</TableCell>
                <TableCell className="text-right font-mono py-4">{item.csvClicks.toLocaleString("pt-BR")}</TableCell>
                <TableCell className={cn(
                  "text-right font-mono py-4 font-bold",
                  item.diff > 0 ? "text-success" : item.diff < 0 ? "text-destructive" : "text-muted-foreground"
                )}>
                  {item.diff > 0 ? "+" : ""}{item.diff.toLocaleString("pt-BR")}
                </TableCell>
                <TableCell className={cn(
                  "text-right text-xs py-4",
                  item.diff > 0 ? "text-success" : item.diff < 0 ? "text-destructive" : "text-muted-foreground"
                )}>
                  {item.diffPercent > 0 ? "+" : ""}{item.diffPercent.toFixed(1)}%
                </TableCell>
              </TableRow>
            ))}
            {comparisonStats.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground italic">
                  Nenhum dado para comparação disponível.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Clicks by Day */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border bg-secondary/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            <Calendar className="w-4 h-4 text-accent" />
            <h3 className="font-display font-semibold text-sm uppercase tracking-wider">Cliques por Dia</h3>
          </div>
          <button 
            onClick={() => setDaySortDirection(prev => prev === "asc" ? "desc" : "asc")}
            className="text-xs flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            Ordernar por data
            <ArrowUpDown className="w-3 h-3" />
          </button>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-border/50">
              <TableHead className="text-xs font-bold uppercase tracking-wider">Data</TableHead>
              <TableHead className="text-right text-xs font-bold uppercase tracking-wider">Cliques</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentDayData.map((item) => (
              <TableRow key={item.day} className="hover:bg-secondary/20 border-border/50 transition-colors">
                <TableCell className="font-medium py-4">
                  {(() => {
                    const parts = item.day.split("-");
                    if (parts.length === 3) {
                      return `${parts[2]}/${parts[1]}/${parts[0]}`;
                    }
                    return item.day;
                  })()}
                </TableCell>
                <TableCell className="text-right font-mono py-4">{item.count.toLocaleString("pt-BR")}</TableCell>
              </TableRow>
            ))}
            
            {/* Pagination & Page Size */}
            <TableRow className="hover:bg-transparent border-t border-border/50">
              <TableCell colSpan={2} className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <span>Linhas por página:</span>
                    <select
                      className="bg-background border border-border rounded px-2 py-1"
                      value={dayPageSize}
                      onChange={(e) => {
                        setDayPageSize(Number(e.target.value));
                        setDayPage(0);
                      }}
                    >
                      {[5, 10, 25, 50].map((n) => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className="px-2 py-1 rounded border border-border disabled:opacity-50 hover:bg-secondary/50 transition-colors"
                      onClick={() => setDayPage(0)}
                      disabled={dayPage === 0}
                    >
                      Primeira
                    </button>
                    <button
                      className="px-2 py-1 rounded border border-border disabled:opacity-50 hover:bg-secondary/50 transition-colors"
                      onClick={() => setDayPage(p => Math.max(0, p - 1))}
                      disabled={dayPage === 0}
                    >
                      Anterior
                    </button>
                    <span className="min-w-[100px] text-center">Página {dayPage + 1} de {totalDayPages || 1}</span>
                    <button
                      className="px-2 py-1 rounded border border-border disabled:opacity-50 hover:bg-secondary/50 transition-colors"
                      onClick={() => setDayPage(p => Math.min(totalDayPages - 1, p + 1))}
                      disabled={dayPage >= totalDayPages - 1}
                    >
                      Próxima
                    </button>
                    <button
                      className="px-2 py-1 rounded border border-border disabled:opacity-50 hover:bg-secondary/50 transition-colors"
                      onClick={() => setDayPage(totalDayPages - 1)}
                      disabled={dayPage >= totalDayPages - 1}
                    >
                      Última
                    </button>
                  </div>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default DashboardClicks;
