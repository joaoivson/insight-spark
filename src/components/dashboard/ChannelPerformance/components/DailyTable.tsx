import { useState } from "react";
import { TrendingUp, TrendingDown, ArrowUpDown } from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { cn } from "@/shared/lib/utils";
import { DayMetric } from "../types";

const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);

interface DailyTableProps {
    metrics: DayMetric[];
}

export const DailyTable = ({ metrics }: DailyTableProps) => {
    const [pageSize, setPageSize] = useState<number>(5);
    const [page, setPage] = useState<number>(0);
    const [sortColumn, setSortColumn] = useState<keyof DayMetric>("day");
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

    const sortedData = [...metrics].sort((a, b) => {
        const aVal = a[sortColumn];
        const bVal = b[sortColumn];

        if (aVal === bVal) return 0;
        if (aVal === undefined || aVal === null) return 1;
        if (bVal === undefined || bVal === null) return -1;

        if (typeof aVal === "number" && typeof bVal === "number") {
            return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
        }

        const comparison = String(aVal).localeCompare(String(bVal));
        return sortDirection === "asc" ? comparison : -comparison;
    });

    const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
    const safePage = Math.min(page, totalPages - 1);
    const start = safePage * pageSize;
    const pageRows = sortedData.slice(start, start + pageSize);

    const toggleSort = (column: keyof DayMetric) => {
        if (sortColumn === column) {
            setSortDirection(sortDirection === "asc" ? "desc" : "asc");
        } else {
            setSortColumn(column);
            setSortDirection("desc");
        }
    };

    return (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="p-6 border-b border-border">
                <h3 className="font-display font-semibold text-lg">Performance por Dia</h3>
                <p className="text-sm text-muted-foreground">Custos de anúncios vs comissão diária.</p>
            </div>
            <Table>
                <TableHeader className="bg-muted/50">
                    <TableRow>
                        <TableHead>
                            <button className="flex items-center gap-1 hover:text-foreground transition-colors" onClick={() => toggleSort("day")}>
                                Dia <ArrowUpDown className="w-3 h-3" />
                            </button>
                        </TableHead>
                        <TableHead className="text-right">
                            <button className="flex items-center gap-1 hover:text-foreground transition-colors ml-auto" onClick={() => toggleSort("spend")}>
                                Custos de Anúncios <ArrowUpDown className="w-3 h-3" />
                            </button>
                        </TableHead>
                        <TableHead className="text-right">
                            <button className="flex items-center gap-1 hover:text-foreground transition-colors ml-auto" onClick={() => toggleSort("commission")}>
                                Receita (Comissão) <ArrowUpDown className="w-3 h-3" />
                            </button>
                        </TableHead>
                        <TableHead className="text-right">
                            <button className="flex items-center gap-1 hover:text-foreground transition-colors ml-auto" onClick={() => toggleSort("profit")}>
                                Lucro <ArrowUpDown className="w-3 h-3" />
                            </button>
                        </TableHead>
                        <TableHead className="text-center">
                            <button className="flex items-center gap-1 hover:text-foreground transition-colors mx-auto" onClick={() => toggleSort("roas")}>
                                ROAS <ArrowUpDown className="w-3 h-3" />
                            </button>
                        </TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {pageRows.map((d) => {
                        const isProfit = d.profit > 0;
                        const roasColor = d.roas >= 1 ? "text-green-500" : "text-red-500";
                        const RoasIcon = d.roas >= 1 ? TrendingUp : TrendingDown;
                        return (
                            <TableRow key={d.day}>
                                <TableCell className="font-medium text-foreground">
                                    {d.day}
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
