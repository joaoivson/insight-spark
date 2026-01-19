import { Calendar, Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";

type DateRange = { from?: Date; to?: Date };

interface DashboardFiltersProps {
  dateRange: DateRange;
  onDateRangeApply: (range: DateRange) => void;
  onClear: () => void;
  hasActive: boolean;
  loading?: boolean;
}

const DashboardFilters = ({
  dateRange,
  onDateRangeApply,
  onClear,
  hasActive,
  loading = false,
}: DashboardFiltersProps) => {
  const [open, setOpen] = useState(false);
  const [localRange, setLocalRange] = useState<DateRange>({ from: dateRange.from, to: dateRange.to });

  const maxDays = 90;
  const today = new Date();
  const minDate = new Date(today);
  minDate.setDate(today.getDate() - (maxDays - 1));

  const applyPreset = (days: number | "all") => {
    if (days === "all") {
      setLocalRange({});
      setOpen(false);
      onDateRangeApply({});
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
      return diff <= maxDays * 24 * 60 * 60 * 1000 && from >= minDate && to <= today;
    }
    return false;
  })();

  return (
    <div className="bg-card rounded-xl border border-border p-4 mb-6 flex flex-wrap items-center gap-4">
      {/* Date Range */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full sm:w-auto sm:min-w-[220px] justify-start">
            <Calendar className="w-4 h-4 mr-2" />
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
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
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
            numberOfMonths={1}
            fromDate={minDate}
            toDate={today}
          />
          <div className="p-3 border-t border-border space-y-2">
            <div className="text-xs text-muted-foreground">Atalhos</div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={() => applyPreset("all")}>
                Todo período
              </Button>
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
              <Button size="sm" onClick={handleApply} disabled={!isValidRange || loading}>
                {loading ? "Aplicando..." : "Aplicar"}
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Clear */}
      <Button variant="ghost" size="sm" onClick={onClear} disabled={loading}>
        <X className="w-4 h-4 mr-1" />
        Limpar filtros
      </Button>
    </div>
  );
};

export default DashboardFilters;
