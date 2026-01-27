import { Calendar, Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState, useMemo } from "react";
import { useIsMobile } from "@/shared/hooks/use-mobile";

type DateRange = { from?: Date; to?: Date };

interface DashboardFiltersProps {
  dateRange: DateRange;
  onDateRangeApply: (range: DateRange) => void;
  onClear: () => void;
  hasActive: boolean;
  loading?: boolean;
  // Additional filters
  statusFilter?: string;
  categoryFilter?: string;
  subIdFilter?: string;
  onStatusFilterChange?: (value: string) => void;
  onCategoryFilterChange?: (value: string) => void;
  onSubIdFilterChange?: (value: string) => void;
  statusOptions?: string[];
  categoryOptions?: string[];
  subIdOptions?: string[];
  // Data for calculating max date
  rows?: Array<{ date: string }>;
  adSpends?: Array<{ date: string }>;
}

const DashboardFilters = ({
  dateRange,
  onDateRangeApply,
  onClear,
  hasActive,
  loading = false,
  statusFilter = "",
  categoryFilter = "",
  subIdFilter = "",
  onStatusFilterChange,
  onCategoryFilterChange,
  onSubIdFilterChange,
  statusOptions = [],
  categoryOptions = [],
  subIdOptions = [],
  rows = [],
  adSpends = [],
}: DashboardFiltersProps) => {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [localRange, setLocalRange] = useState<DateRange>({ from: dateRange.from, to: dateRange.to });

  const maxDays = 90;
  const today = new Date();
  const minDate = new Date(today);
  minDate.setDate(today.getDate() - (maxDays - 1));
  
  // Calculate max date from available data (rows and adSpends)
  const maxDate = useMemo(() => {
    const dates: Date[] = [];
    
    // Get dates from rows
    rows.forEach((row) => {
      if (row.date) {
        const date = new Date(row.date);
        if (!isNaN(date.getTime())) {
          dates.push(date);
        }
      }
    });
    
    // Get dates from adSpends
    adSpends.forEach((spend) => {
      if (spend.date) {
        const date = new Date(spend.date);
        if (!isNaN(date.getTime())) {
          dates.push(date);
        }
      }
    });
    
    if (dates.length === 0) return today;
    
    // Return the maximum date, but not less than today
    const max = new Date(Math.max(...dates.map(d => d.getTime())));
    return max > today ? max : today;
  }, [rows, adSpends]);
  
  // Calculate previous month for defaultMonth (to show "Previous Month | Current Month")
  const previousMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);

  const applyPreset = (days: number | "all" | "currentMonth" | "previousMonth") => {
    if (days === "all") {
      setLocalRange({});
      setOpen(false);
      onDateRangeApply({});
      return;
    }
    if (days === "currentMonth") {
      const now = new Date();
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setLocalRange({ from, to });
      setOpen(false);
      onDateRangeApply({ from, to });
      return;
    }
    if (days === "previousMonth") {
      const now = new Date();
      const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const to = new Date(now.getFullYear(), now.getMonth(), 0);
      setLocalRange({ from, to });
      setOpen(false);
      onDateRangeApply({ from, to });
      return;
    }
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - (days - 1));
    setLocalRange({ from, to });
    setOpen(false);
    onDateRangeApply({ from, to });
  };

  const handleApply = () => {
    if (localRange.from && localRange.to && isValidRange) {
      setOpen(false);
      onDateRangeApply(localRange);
    }
  };

  const isValidRange = (() => {
    const { from, to } = localRange;
    if (from && to) {
      const diff = Math.abs(to.getTime() - from.getTime());
      return diff <= maxDays * 24 * 60 * 60 * 1000 && from >= minDate && to <= maxDate;
    }
    return false;
  })();

  const calendarContent = (
    <>
      <CalendarComponent
        mode="range"
        selected={{ from: localRange.from, to: localRange.to }}
        onSelect={(range) => {
          let from = range?.from;
          let to = range?.to;
          if (from && from < minDate) from = minDate;
          if (to && to < minDate) to = minDate;
          if (from && to) {
            const diff = Math.abs(to.getTime() - from.getTime());
            if (diff > maxDays * 24 * 60 * 60 * 1000) return;
          }
          setLocalRange({ from, to });
        }}
        locale={ptBR}
        numberOfMonths={isMobile ? 1 : 2}
        defaultMonth={isMobile ? today : previousMonth}
        fromDate={minDate}
        toDate={maxDate}
        className={isMobile ? "w-full" : ""}
      />
      <div className="p-3 border-t border-border space-y-2">
        <div className="text-xs text-muted-foreground">Atalhos</div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={() => applyPreset("all")}>
            Todo período
          </Button>
          <Button size="sm" variant="secondary" onClick={() => applyPreset(7)}>
            Últimos 7 dias
          </Button>
          <Button size="sm" variant="secondary" onClick={() => applyPreset("currentMonth")}>
            Mês atual
          </Button>
          <Button size="sm" variant="secondary" onClick={() => applyPreset("previousMonth")}>
            Mês Passado
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={() => applyPreset(15)}>
            Últimos 15 dias
          </Button>
          <Button size="sm" variant="secondary" onClick={() => applyPreset(30)}>
            Últimos 30 dias
          </Button>
          <Button size="sm" variant="secondary" onClick={() => applyPreset(60)}>
            Últimos 60 dias
          </Button>
        </div>
            <div className="flex items-center gap-2">
              <Button 
                size="sm" 
                onClick={handleApply} 
                disabled={!isValidRange || loading}
                loading={loading}
                loadingText="Aplicando..."
                className="w-full sm:w-auto"
                aria-label="Aplicar filtro de data"
              >
                Aplicar
              </Button>
            </div>
      </div>
    </>
  );

  const dateButton = (
    <Button variant="outline" className="w-full sm:w-auto sm:min-w-[220px] justify-start" aria-label="Selecionar período">
      <Calendar className="w-4 h-4 mr-2" aria-hidden="true" />
      {dateRange.from || dateRange.to ? (
        dateRange.from && dateRange.to ? (
          <>
            {format(dateRange.from, "dd/MM/yy", { locale: ptBR })} -{" "}
            {format(dateRange.to, "dd/MM/yy", { locale: ptBR })}
          </>
        ) : dateRange.from ? (
          format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })
        ) : dateRange.to ? (
          format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })
        ) : null
      ) : (
        "Todo período"
      )}
    </Button>
  );

  return (
    <div className="bg-card rounded-xl border border-border p-4 mb-6 flex flex-wrap items-center gap-4">
      {/* Date Range - Mobile uses Sheet, Desktop uses Popover */}
      <div className="flex items-center gap-2">
        <Label htmlFor="period-filter" className="text-sm font-medium text-muted-foreground whitespace-nowrap">
          Período:
        </Label>
        {isMobile ? (
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>{dateButton}</SheetTrigger>
            <SheetContent side="bottom" className="h-[90vh] overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Selecionar Período</SheetTitle>
                <SheetDescription>Escolha o intervalo de datas para filtrar os dados</SheetDescription>
              </SheetHeader>
              <div className="mt-4">{calendarContent}</div>
            </SheetContent>
          </Sheet>
        ) : (
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>{dateButton}</PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              {calendarContent}
            </PopoverContent>
          </Popover>
        )}
      </div>

      {/* Status Filter */}
      {onStatusFilterChange && (
        <div className="flex items-center gap-2">
          <Label htmlFor="status-filter" className="text-sm font-medium text-muted-foreground whitespace-nowrap">
            Status:
          </Label>
          <Select value={statusFilter || "all"} onValueChange={(v) => onStatusFilterChange(v === "all" ? "" : v)}>
            <SelectTrigger id="status-filter" className="w-full sm:w-[200px]" aria-label="Filtrar por status do pedido">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {statusOptions.map((s) => (
                <SelectItem key={s} value={s || "unknown"}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Category Filter */}
      {onCategoryFilterChange && (
        <div className="flex items-center gap-2">
          <Label htmlFor="category-filter" className="text-sm font-medium text-muted-foreground whitespace-nowrap">
            Categoria:
          </Label>
          <Select value={categoryFilter || "all"} onValueChange={(v) => onCategoryFilterChange(v === "all" ? "" : v)}>
            <SelectTrigger id="category-filter" className="w-full sm:w-[200px]" aria-label="Filtrar por categoria global">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {categoryOptions.map((c) => (
                <SelectItem key={c} value={c || "unknown"}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Sub ID Filter */}
      {onSubIdFilterChange && (
        <div className="flex items-center gap-2">
          <Label htmlFor="subid-filter" className="text-sm font-medium text-muted-foreground whitespace-nowrap">
            SubId:
          </Label>
          <Select value={subIdFilter || "all"} onValueChange={(v) => onSubIdFilterChange(v === "all" ? "" : v)}>
            <SelectTrigger id="subid-filter" className="w-full sm:w-[200px]" aria-label="Filtrar por canal ou sub ID">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {subIdOptions.map((s) => (
                <SelectItem key={s} value={s || "unknown"}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Clear */}
      <Button variant="ghost" size="sm" onClick={onClear} disabled={loading} className="w-full sm:w-auto" aria-label="Limpar filtros">
        <X className="w-4 h-4 mr-1" aria-hidden="true" />
        <span className="sm:inline">Limpar filtros</span>
      </Button>
    </div>
  );
};

export default DashboardFilters;
