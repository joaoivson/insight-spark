import { Calendar, FilterX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
import { parseDateOnly, toDateKey, presetRangeDates } from "@/shared/lib/date";
import { cn, statusLabel } from "@/shared/lib/utils";
import { useIsMobile } from "@/shared/hooks/use-mobile";

type DateRange = { from?: Date; to?: Date };

interface CommissionFiltersProps {
  dateRange: DateRange;
  onDateRangeApply: (range: DateRange) => void;
  onClear: () => void;
  hasActive: boolean;
  loading?: boolean;
  statusFilter?: string;
  categoryFilter?: string;
  subIdFilter?: string;
  onStatusFilterChange?: (value: string) => void;
  onCategoryFilterChange?: (value: string) => void;
  onSubIdFilterChange?: (value: string) => void;
  statusOptions?: string[];
  categoryOptions?: string[];
  subIdOptions?: string[];
  rows?: Array<{ date: string }>;
  adSpends?: Array<{ date: string }>;
  clicks?: Array<{ date: string }>;
}

/** Atalhos cortam no fim do dia anterior fechado EM BRASÍLIA (o dia atual é parcial). */
function presetRange(kind: "yesterday" | "7d" | "14d" | "month"): DateRange {
  return presetRangeDates(kind);
}

const Chip = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "rounded-lg border px-3.5 py-2 text-[12.5px] transition-colors",
      active
        ? "border-[rgba(49,140,233,0.38)] bg-[rgba(49,140,233,0.12)] font-semibold text-[#7CB8F2]"
        : "border-border bg-card text-muted-foreground hover:border-white/15",
    )}
  >
    {children}
  </button>
);

const CommissionFilters = ({
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
  clicks = [],
}: CommissionFiltersProps) => {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [localRange, setLocalRange] = useState<DateRange>({ from: dateRange.from, to: dateRange.to });

  const today = new Date();

  const { minDate, maxDate } = useMemo(() => {
    const dates: Date[] = [];
    const processItems = (items: Array<{ date: string }>) => {
      items.forEach((item) => {
        if (item.date) {
          const date = parseDateOnly(item.date);
          if (date && !isNaN(date.getTime())) dates.push(date);
        }
      });
    };
    processItems(rows);
    processItems(adSpends);
    processItems(clicks);

    const ninetyDaysAgo = new Date(today);
    ninetyDaysAgo.setDate(today.getDate() - 89);

    if (dates.length === 0) return { minDate: ninetyDaysAgo, maxDate: today };
    const min = new Date(Math.min(...dates.map((d) => d.getTime())));
    const max = new Date(Math.max(...dates.map((d) => d.getTime())));
    return { minDate: min < ninetyDaysAgo ? min : ninetyDaysAgo, maxDate: max > today ? max : today };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, adSpends, clicks]);

  const previousMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);

  // Qual chip está ativo (compara as date-keys do range atual com cada preset).
  const keyEq = (a?: Date, b?: Date) => !!a && !!b && toDateKey(a) === toDateKey(b);
  const matchesPreset = (kind: "yesterday" | "7d" | "14d" | "month") => {
    const p = presetRange(kind);
    return keyEq(dateRange.from, p.from) && keyEq(dateRange.to, p.to);
  };
  const activeYesterday = matchesPreset("yesterday");
  const active7 = matchesPreset("7d");
  const active14 = matchesPreset("14d");
  const activeMonth = matchesPreset("month");
  const customActive =
    (!!dateRange.from || !!dateRange.to) && !activeYesterday && !active7 && !active14 && !activeMonth;

  const applyPreset = (kind: "yesterday" | "7d" | "14d" | "month") => {
    const range = presetRange(kind);
    setLocalRange(range);
    setOpen(false);
    onDateRangeApply(range);
  };

  const isValidRange = !!(localRange.from && localRange.to && localRange.from <= localRange.to);

  const handleApply = () => {
    if (isValidRange) {
      setOpen(false);
      onDateRangeApply(localRange);
    }
  };

  const calendarContent = (
    <>
      <CalendarComponent
        mode="range"
        selected={{ from: localRange.from, to: localRange.to }}
        onSelect={(range) => setLocalRange({ from: range?.from, to: range?.to })}
        locale={ptBR}
        numberOfMonths={isMobile ? 1 : 2}
        defaultMonth={isMobile ? today : previousMonth}
        fromDate={minDate}
        toDate={maxDate}
        className={isMobile ? "w-full" : ""}
      />
      <div className="space-y-2 border-t border-border p-3">
        <Button
          size="sm"
          onClick={handleApply}
          disabled={!isValidRange || loading}
          loading={loading}
          loadingText="Aplicando..."
          className="w-full sm:w-auto"
          aria-label="Aplicar período personalizado"
        >
          Aplicar
        </Button>
      </div>
    </>
  );

  const customLabel =
    customActive && dateRange.from && dateRange.to
      ? `${format(dateRange.from, "dd/MM", { locale: ptBR })} – ${format(dateRange.to, "dd/MM", { locale: ptBR })}`
      : "Personalizado";

  const customChip = (
    <button
      type="button"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-[12.5px] transition-colors",
        customActive
          ? "border-[rgba(49,140,233,0.38)] bg-[rgba(49,140,233,0.12)] font-semibold text-[#7CB8F2]"
          : "border-border bg-card text-muted-foreground hover:border-white/15",
      )}
      aria-label="Selecionar período personalizado"
    >
      <Calendar className="h-3.5 w-3.5" />
      {customLabel}
    </button>
  );

  return (
    <div className="mb-6 flex flex-col gap-3 rounded-xl border border-border bg-card p-3 md:flex-row md:flex-wrap md:items-center md:gap-x-3 md:gap-y-2 md:p-4">
      {/* Período em chips (cortam no fim de ontem) */}
      <div className="flex flex-wrap items-center gap-2">
        <Chip active={activeYesterday} onClick={() => applyPreset("yesterday")}>Ontem</Chip>
        <Chip active={active7} onClick={() => applyPreset("7d")}>7 dias</Chip>
        <Chip active={active14} onClick={() => applyPreset("14d")}>14 dias</Chip>
        <Chip active={activeMonth} onClick={() => applyPreset("month")}>Mês atual</Chip>
        {isMobile ? (
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>{customChip}</SheetTrigger>
            <SheetContent side="bottom" className="h-[90vh] overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Período personalizado</SheetTitle>
                <SheetDescription>Escolha o intervalo de datas</SheetDescription>
              </SheetHeader>
              <div className="mt-4">{calendarContent}</div>
            </SheetContent>
          </Sheet>
        ) : (
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>{customChip}</PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              {calendarContent}
            </PopoverContent>
          </Popover>
        )}
      </div>

      {/* Status */}
      {onStatusFilterChange && (
        <div className="flex flex-col gap-1.5 md:flex-row md:items-center">
          <Label htmlFor="status-filter" className="whitespace-nowrap text-xs font-medium text-muted-foreground">
            Status:
          </Label>
          <Select value={statusFilter || "all"} onValueChange={(v) => onStatusFilterChange(v === "all" ? "" : v)}>
            <SelectTrigger id="status-filter" className="h-9 w-full sm:w-[140px]" aria-label="Filtrar por status">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {statusOptions.map((s) => (
                <SelectItem key={s} value={s || "unknown"}>{statusLabel(s)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Categoria */}
      {onCategoryFilterChange && (
        <div className="flex flex-col gap-1.5 md:flex-row md:items-center">
          <Label htmlFor="category-filter" className="whitespace-nowrap text-xs font-medium text-muted-foreground">
            Categoria:
          </Label>
          <Select value={categoryFilter || "all"} onValueChange={(v) => onCategoryFilterChange(v === "all" ? "" : v)}>
            <SelectTrigger id="category-filter" className="h-9 w-full sm:w-[140px]" aria-label="Filtrar por categoria">
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

      {/* Sub ID */}
      {onSubIdFilterChange && (
        <div className="flex flex-col gap-1.5 md:flex-row md:items-center">
          <Label htmlFor="subid-filter" className="whitespace-nowrap text-xs font-medium text-muted-foreground">
            Sub ID:
          </Label>
          <Select value={subIdFilter || "all"} onValueChange={(v) => onSubIdFilterChange(v === "all" ? "" : v)}>
            <SelectTrigger id="subid-filter" className="h-9 w-full sm:w-[140px]" aria-label="Filtrar por sub ID">
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

      <div className="md:ml-auto">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={hasActive ? "destructive" : "ghost"}
              size="icon"
              onClick={onClear}
              disabled={loading || !hasActive}
              className={cn(
                "h-10 w-10 shrink-0 rounded-lg transition-all duration-300",
                hasActive
                  ? "shadow-sm shadow-destructive/20"
                  : "text-muted-foreground hover:bg-destructive/10 hover:text-destructive",
              )}
              aria-label="Limpar filtros"
            >
              <FilterX className={cn(hasActive ? "h-5 w-5" : "h-4 w-4", "transition-all")} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Limpar filtros</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
};

export default CommissionFilters;
