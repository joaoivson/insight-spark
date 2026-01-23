import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowUpDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export interface DatasetRow {
  id: number;
  date: string;
  time?: string | null;
  mes_ano?: string | null;
  product: string;
  product_name?: string | null;
  platform?: string | null;
  revenue: number;
  cost: number;
  commission: number;
  profit: number;
  status?: string | null;
  category?: string | null;
  sub_id1?: string | null;
   gross_value?: number | null;
   commission_value?: number | null;
   net_value?: number | null;
   quantity?: number | null;
   raw_data?: any;
}

interface DataTableProps {
  rows: DatasetRow[];
}

type ColumnId =
  | "date"
  | "time"
  | "product"
  | "product_name"
  | "platform"
  | "status"
  | "category"
  | "sub_id1"
  | "revenue"
  | "cost"
  | "commission"
  | "profit"
  | "gross_value"
  | "net_value"
  | "quantity"
  | "mes_ano"
  | "ad_spend";

const ALL_COLUMNS: { id: ColumnId; label: string; numeric?: boolean }[] = [
  { id: "date", label: "Data" },
  { id: "time", label: "Hora" },
  { id: "product", label: "Produto" },
  { id: "product_name", label: "Nome do Produto" },
  { id: "platform", label: "Plataforma" },
  { id: "status", label: "Status" },
  { id: "category", label: "Categoria" },
  { id: "sub_id1", label: "Sub ID" },
  { id: "revenue", label: "Receita", numeric: true },
  { id: "commission", label: "Comissão", numeric: true },
  { id: "profit", label: "Lucro", numeric: true },
  { id: "gross_value", label: "Valor Bruto", numeric: true },
  { id: "net_value", label: "Valor Líquido", numeric: true },
  { id: "quantity", label: "Qtd", numeric: true },
  { id: "mes_ano", label: "Mês/Ano" },
  { id: "ad_spend", label: "Gasto Anúncios", numeric: true },
];

const DataTable = ({ rows }: DataTableProps) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value || 0);
  };

  const tooltipStyle = {
    backgroundColor: "hsl(var(--card))",
    borderColor: "hsl(var(--border))",
    color: "hsl(var(--foreground))",
  };
  const tooltipCursor = { fill: "transparent" };

  const cleanNumber = (value: any): number | null => {
    if (value === null || value === undefined) return null;
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const cleaned = value
        .replace(/R\$/gi, "")
        .replace(/\s+/g, "")
        .replace(/\./g, "")
        .replace(/,/g, ".");
      const num = Number(cleaned);
      return Number.isFinite(num) ? num : null;
    }
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  };

  const getCommissionDisplay = (row: DatasetRow) => {
    const raw = row.raw_data || {};
    const direct =
      cleanNumber(row.commission) ??
      cleanNumber((row as any).commission_value);

    const fromRawScan = (() => {
      for (const key of Object.keys(raw)) {
        const lower = key.toLowerCase();
        if (lower.includes("comissao") || lower.includes("comissão")) {
          const maybe = cleanNumber(raw[key]);
          if (maybe !== null) return maybe;
        }
      }
      return null;
    })();

    return direct ?? fromRawScan ?? 0;
  };

  const getAffiliateCommission = (row: DatasetRow) => {
    const raw = row.raw_data || {};
    const direct = cleanNumber(raw["Comissão líquida do afiliado(R$)"]);
    if (direct !== null && direct !== undefined) return direct;
    return getCommissionDisplay(row);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

  const [pageSize, setPageSize] = useState<number>(10);
  const [page, setPage] = useState<number>(0);
  const [sortBy, setSortBy] = useState<ColumnId>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [visibleColumns, setVisibleColumns] = useState<ColumnId[]>(() =>
    ["product", "product_name", "platform", "status", "category", "sub_id1", "revenue", "commission", "profit", "net_value", "quantity", "mes_ano", "ad_spend"]
  );

  const toggleColumn = (col: ColumnId) => {
    setVisibleColumns((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
    );
  };

  const moveColumn = (col: ColumnId, direction: "up" | "down") => {
    setVisibleColumns((prev) => {
      const idx = prev.indexOf(col);
      if (idx === -1) return prev;
      const next = [...prev];
      const swapWith = direction === "up" ? idx - 1 : idx + 1;
      if (swapWith < 0 || swapWith >= next.length) return prev;
      [next[idx], next[swapWith]] = [next[swapWith], next[idx]];
      return next;
    });
  };

  const sortedRows = useMemo(() => {
    const col = sortBy;
    const factor = sortDir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const va = (a as any)[col];
      const vb = (b as any)[col];
      if (va === vb) return 0;
      if (va === undefined || va === null) return 1;
      if (vb === undefined || vb === null) return -1;
      if (typeof va === "number" && typeof vb === "number") return (va - vb) * factor;
      return String(va).localeCompare(String(vb)) * factor;
    });
  }, [rows, sortBy, sortDir]);

  const pagedRows = useMemo(() => {
    const start = page * pageSize;
    return sortedRows.slice(start, start + pageSize);
  }, [sortedRows, page, pageSize]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));

  const onChangeSort = (col: ColumnId) => {
    if (sortBy === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(col);
      setSortDir("asc");
    }
  };

  const getAdSpend = (row: DatasetRow) => {
    const raw = (row as any).raw_data || {};
    for (const key of Object.keys(raw)) {
      const lower = key.toLowerCase();
      if (lower.includes("valor gasto") && lower.includes("anuncio")) {
        const num = cleanNumber(raw[key]);
        if (num !== null && num !== undefined) return num;
      }
    }
    return 0;
  };

  const commissionSeries = useMemo(() => {
    if (!rows.length) return [];
    const dates = rows.map((r) => new Date(r.date));
    const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));
    const diffDays = Math.max(1, Math.round((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)));
    const groupByDay = diffDays <= 31;

    const fmtKey = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return groupByDay ? `${y}-${m}-${day}` : `${y}-${m}`;
    };

    const label = (key: string) => {
      if (groupByDay) {
        const [y, m, d] = key.split("-");
        return `${d}/${m}`;
      }
      const [y, m] = key.split("-");
      return `${m}/${y}`;
    };

    const map = new Map<string, number>();
    rows.forEach((r) => {
      const d = new Date(r.date);
      const key = fmtKey(d);
      const com = getAffiliateCommission(r);
      map.set(key, (map.get(key) || 0) + com);
    });

    return Array.from(map.entries())
      .map(([key, value]) => ({ key, label: label(key), value }))
      .sort((a, b) => a.key.localeCompare(b.key));
  }, [rows]);

  const isMobile = useIsMobile();

  return (
    <div className="bg-card rounded-xl border border-border mt-6 overflow-hidden">
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div>
            <h3 className="font-display font-semibold text-lg text-foreground">Evolução da Comissão</h3>
            <p className="text-sm text-muted-foreground">
              {commissionSeries.length > 0 ? "Distribuição por período filtrado" : "Sem dados para o período atual"}
            </p>
          </div>
        </div>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={commissionSeries} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" tick={false} tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(var(--muted-foreground))" tick={false} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={tooltipStyle}
                cursor={tooltipCursor}
                formatter={(v: number) => [formatCurrency(v), "Valor"]}
                labelFormatter={(l: string) => `Período ${l}`}
              />
              <Bar dataKey="value" fill="hsl(210, 80%, 55%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="p-6 border-b border-border flex flex-wrap gap-3 items-center justify-between">
        <div>
          <h3 className="font-display font-semibold text-lg text-foreground">Dados Recentes</h3>
          <p className="text-sm text-muted-foreground">Últimas transações registradas</p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                Colunas
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[320px] max-h-[360px] overflow-auto space-y-2">
              <div className="text-sm font-medium text-foreground">Selecionar colunas</div>
              {(() => {
                const orderedIds = [
                  ...visibleColumns,
                  ...ALL_COLUMNS.map((c) => c.id).filter((id) => !visibleColumns.includes(id)),
                ];
                return orderedIds.map((id) => {
                  const c = ALL_COLUMNS.find((col) => col.id === id)!;
                  const isVisible = visibleColumns.includes(c.id);
                  return (
                    <div key={c.id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={isVisible}
                        onCheckedChange={() => toggleColumn(c.id)}
                        aria-label={`Toggle column ${c.label}`}
                      />
                      <span className="flex-1">{c.label}</span>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={!isVisible}
                          onClick={() => moveColumn(c.id, "up")}
                        >
                          ↑
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={!isVisible}
                          onClick={() => moveColumn(c.id, "down")}
                        >
                          ↓
                        </Button>
                      </div>
                    </div>
                  );
                });
              })()}
            </PopoverContent>
          </Popover>
        </div>
      </div>
      {isMobile ? (
        <div className="p-4 space-y-4">
          {pagedRows.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm font-medium mb-1">Nenhum dado encontrado</p>
              <p className="text-xs">Ajuste os filtros para ver mais resultados</p>
            </div>
          ) : (
            pagedRows.map((row) => {
            const getValue = (colId: ColumnId) => {
              const col = ALL_COLUMNS.find((c) => c.id === colId);
              if (!col) return null;
              const value = (row as any)[col.id];
              let content: any = value ?? "-";
              if (col.id === "date" && value) content = formatDate(value);
              if (col.id === "product") content = <Badge variant="secondary">{value}</Badge>;
              if (col.numeric) {
                if (["revenue", "commission", "profit", "gross_value", "net_value"].includes(col.id)) {
                  if (col.id === "commission") {
                    content = formatCurrency(getCommissionDisplay(row));
                  } else if (col.id === "profit") {
                    const lucro = getAffiliateCommission(row) - getAdSpend(row);
                    content = formatCurrency(lucro);
                  } else {
                    content = formatCurrency(value || 0);
                  }
                } else if (col.id === "ad_spend") {
                  content = formatCurrency(getAdSpend(row));
                } else {
                  content = value ?? "-";
                }
              }
              return { label: col.label, content };
            };

            const mainCols = visibleColumns.slice(0, 3);
            const otherCols = visibleColumns.slice(3);

            return (
              <Card key={row.id} className="border-border">
                <CardContent className="p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    {mainCols.map((colId) => {
                      const { label, content } = getValue(colId) || {};
                      if (!label) return null;
                      return (
                        <div key={colId} className="space-y-1">
                          <div className="text-xs text-muted-foreground">{label}</div>
                          <div className="text-sm font-medium">{content}</div>
                        </div>
                      );
                    })}
                  </div>
                  {otherCols.length > 0 && (
                    <div className="pt-2 border-t border-border grid grid-cols-2 gap-2">
                      {otherCols.map((colId) => {
                        const { label, content } = getValue(colId) || {};
                        if (!label) return null;
                        return (
                          <div key={colId} className="space-y-1">
                            <div className="text-xs text-muted-foreground">{label}</div>
                            <div className="text-sm">{content}</div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table role="table" aria-label="Tabela de dados">
            <TableHeader>
              <TableRow className="bg-muted/50">
                {visibleColumns.map((colId) => {
                  const col = ALL_COLUMNS.find((c) => c.id === colId);
                  if (!col) return null;
                  return (
                    <TableHead
                      key={col.id}
                      className={col.numeric ? "text-right cursor-pointer select-none" : "cursor-pointer select-none"}
                      onClick={() => onChangeSort(col.id)}
                      role="columnheader"
                      aria-sort={sortBy === col.id ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onChangeSort(col.id);
                        }
                      }}
                    >
                      <span className="inline-flex items-center gap-1">
                        {col.label}
                        <ArrowUpDown className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                      </span>
                    </TableHead>
                  );
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={visibleColumns.length} className="text-center py-8">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <p className="text-sm font-medium">Nenhum dado encontrado</p>
                      <p className="text-xs">Ajuste os filtros para ver mais resultados</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                pagedRows.map((row) => (
                  <TableRow key={row.id} className="hover:bg-muted/30 transition-colors">
                    {visibleColumns.map((colId) => {
                      const col = ALL_COLUMNS.find((c) => c.id === colId);
                      if (!col) return null;
                      const value = (row as any)[col.id];
                      let content: any = value ?? "-";
                      if (col.id === "date" && value) content = formatDate(value);
                      if (col.id === "product")
                        content = <Badge variant="secondary">{value}</Badge>;
                      if (col.numeric) {
                        if (["revenue", "commission", "profit", "gross_value", "net_value"].includes(col.id)) {
                          if (col.id === "commission") {
                            content = formatCurrency(getCommissionDisplay(row));
                          } else if (col.id === "profit") {
                            const lucro = getAffiliateCommission(row) - getAdSpend(row);
                            content = formatCurrency(lucro);
                          } else {
                            content = formatCurrency(value || 0);
                          }
                        } else if (col.id === "ad_spend") {
                          content = formatCurrency(getAdSpend(row));
                        } else {
                          content = value ?? "-";
                        }
                      }
                      return (
                        <TableCell
                          key={col.id}
                          className={col.numeric ? "text-right" : ""}
                          role="cell"
                        >
                          {content}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
      <div className="p-4 border-t border-border flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Linhas por página</span>
          <Select
            value={String(pageSize)}
            onValueChange={(v) => {
              const size = Number(v);
              setPageSize(size);
              setPage(0);
            }}
          >
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[10, 25, 50, 100].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            aria-label="Página anterior"
          >
            Anterior
          </Button>
          <span className="text-sm text-muted-foreground" aria-live="polite">
            Página {page + 1} de {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            aria-label="Próxima página"
          >
            Próxima
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DataTable;
