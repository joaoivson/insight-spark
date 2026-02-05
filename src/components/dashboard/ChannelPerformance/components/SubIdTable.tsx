import { useState } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { cn } from "@/shared/lib/utils";
import { ChannelMetric } from "../types";

const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);

interface SubIdTableProps {
    metrics: ChannelMetric[];
}

export const SubIdTable = ({ metrics }: SubIdTableProps) => {
    const [pageSize, setPageSize] = useState<number>(5);
    const [page, setPage] = useState<number>(0);

    const MAX_ROWS = 50;
    const limitedChannels = metrics.slice(0, MAX_ROWS);
    const totalPages = Math.max(1, Math.ceil(limitedChannels.length / pageSize));
    const safePage = Math.min(page, totalPages - 1);
    const start = safePage * pageSize;
    const pageRows = limitedChannels.slice(start, start + pageSize);

    return (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="p-6 border-b border-border">
                <h3 className="font-display font-semibold text-lg">Performance Detalhada por Sub ID</h3>
                <p className="text-sm text-muted-foreground">Análise de custos de anúncios vs retorno real. (máx. {MAX_ROWS} linhas)</p>
            </div>
            <Table>
                <TableHeader className="bg-muted/50">
                    <TableRow>
                        <TableHead>Sub ID</TableHead>
                        <TableHead className="text-right">Custos de Anúncios</TableHead>
                        <TableHead className="text-right">Receita (Comissão)</TableHead>
                        <TableHead className="text-right">Lucro (Comissão - Gasto)</TableHead>
                        <TableHead className="text-center">ROAS</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
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
                                        value={String(pageSize)}
                                        onChange={(e) => {
                                            setPageSize(Number(e.target.value));
                                            setPage(0);
                                        }}
                                    >
                                        {[5, 10, 25, 50, 100].map((n) => (
                                            <option key={n} value={n}>{n}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button className="px-2 py-1 rounded border border-border disabled:opacity-50" onClick={() => setPage(0)} disabled={safePage === 0}>Primeira</button>
                                    <button className="px-2 py-1 rounded border border-border disabled:opacity-50" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={safePage === 0}>Anterior</button>
                                    <span>Página {safePage + 1} de {totalPages}</span>
                                    <button className="px-2 py-1 rounded border border-border disabled:opacity-50" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={safePage >= totalPages - 1}>Próxima</button>
                                    <button className="px-2 py-1 rounded border border-border disabled:opacity-50" onClick={() => setPage(totalPages - 1)} disabled={safePage >= totalPages - 1}>Última</button>
                                </div>
                            </div>
                        </TableCell>
                    </TableRow>
                </TableBody>
            </Table>
        </div>
    );
};
