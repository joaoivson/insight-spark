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
            <div className="p-4 md:p-6 border-b border-border">
                <h3 className="font-display font-semibold text-base md:text-lg">Performance por Dia</h3>
                <p className="text-sm text-muted-foreground">Custos de anúncios vs comissão diária.</p>
            </div>

            {/* Mobile: lista de cards */}
            <div className="md:hidden p-4 space-y-3">
                {pageRows.map((d) => {
                    const isProfit = d.profit > 0;
                    const roasColor = d.roas >= 1 ? "text-green-500" : "text-red-500";
                    const RoasIcon = d.roas >= 1 ? TrendingUp : TrendingDown;
                    return (
                        <div key={d.day} className="rounded-xl border border-border bg-background/40 p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="font-semibold text-foreground truncate">{d.day}</p>
                                    <p className="text-xs text-muted-foreground">{d.orders} pedidos</p>
                                </div>
                                <span className={cn("inline-flex items-center gap-1 text-sm font-semibold whitespace-nowrap", roasColor)}>
                                    <RoasIcon className="w-4 h-4" />
                                    {d.spend > 0 ? `${d.roas.toFixed(2)}x` : "∞"}
                                </span>
                            </div>
                            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
                                <div>
                                    <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Custos</dt>
                                    <dd className="text-sm text-foreground">{formatCurrency(d.spend)}</dd>
                                </div>
                                <div>
                                    <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Receita</dt>
                                    <dd className="text-sm font-medium text-foreground">{formatCurrency(d.commission)}</dd>
                                </div>
                                <div className="col-span-2">
                                    <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Lucro</dt>
                                    <dd className={cn("text-base font-bold", isProfit ? "text-green-500" : "text-red-500")}>{formatCurrency(d.profit)}</dd>
                                </div>
                            </dl>
                        </div>
                    );
                })}
            </div>

            <div className="overflow-x-auto hidden md:block">
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
                </TableBody>
            </Table>
            </div>

            {/* Paginação compartilhada */}
            <div className="p-3 border-t border-border">
                <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                        <span>Linhas por página</span>
                        <select
                            className="bg-background border border-border rounded-lg px-2 h-9"
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
                    <div className="flex items-center gap-2 flex-wrap">
                        <button className="h-9 px-3 rounded-lg border border-border disabled:opacity-50 transition-colors hover:bg-accent" onClick={() => setPage(0)} disabled={safePage === 0}>Primeira</button>
                        <button className="h-9 px-3 rounded-lg border border-border disabled:opacity-50 transition-colors hover:bg-accent" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={safePage === 0}>Anterior</button>
                        <span className="px-1">Página {safePage + 1} de {totalPages}</span>
                        <button className="h-9 px-3 rounded-lg border border-border disabled:opacity-50 transition-colors hover:bg-accent" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={safePage >= totalPages - 1}>Próxima</button>
                        <button className="h-9 px-3 rounded-lg border border-border disabled:opacity-50 transition-colors hover:bg-accent" onClick={() => setPage(totalPages - 1)} disabled={safePage >= totalPages - 1}>Última</button>
                    </div>
                </div>
            </div>
        </div>
    );
};
