import { Calendar, Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  mesAnoOptions: string[];
  mesAno: string; // use a non-empty value (e.g., "all") to satisfy Radix
  onMesAnoChange: (value: string) => void;
  dateRange: DateRange;
  onDateRangeApply: (range: DateRange) => void;
  onClear: () => void;
  hasActive: boolean;
  loading?: boolean;
}

const DashboardFilters = ({
  mesAnoOptions,
  mesAno,
  onMesAnoChange,
  dateRange,
  onDateRangeApply,
  onClear,
  hasActive,
  loading = false,
}: DashboardFiltersProps) => {
  const safeMesAnoOptions = mesAnoOptions.filter(Boolean);
  const [open, setOpen] = useState(false);
  const [localRange, setLocalRange] = useState<DateRange>({ from: dateRange.from, to: dateRange.to });

  const maxDays = 90;
  const today = new Date();
  const minDate = new Date(today);
  minDate.setDate(today.getDate() - (maxDays - 1));

  const applyPreset = (days: number) => {
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - (days - 1));
    setLocalRange({ from, to });
    setOpen(false);
    onDateRangeApply({ from, to });
  };

  const applyMonth = (offsetMonths: number) => {
    const now = new Date();
    const to = new Date(now.getFullYear(), now.getMonth() + offsetMonths + 1, 0);
    const from = new Date(now.getFullYear(), now.getMonth() + offsetMonths, 1);
    setLocalRange({ from, to });
    setOpen(false);
    onDateRangeApply({ from, to });
  };

  const handleApply = () => {
    if (!isValidRange || !localRange.from || !localRange.to) return;
    setOpen(false);
    onDateRangeApply(localRange);
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
      {/* MesAno */}
      <Select value={mesAno} onValueChange={onMesAnoChange}>
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="MesAno" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          {safeMesAnoOptions.map((m) => (
            <SelectItem key={m} value={m}>
              {m}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Date Range */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="min-w-[220px] justify-start">
            <Calendar className="w-4 h-4 mr-2" />
            {dateRange.from ? (
              dateRange.to ? (
                <>
                  {format(dateRange.from, "dd/MM/yy", { locale: ptBR })} -{" "}
                  {format(dateRange.to, "dd/MM/yy", { locale: ptBR })}
                </>
              ) : (
                format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })
              )
            ) : (
              "Selecionar período"
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
            numberOfMonths={2}
            fromDate={minDate}
            toDate={today}
          />
          <div className="p-3 border-t border-border space-y-2">
            <div className="text-xs text-muted-foreground">Atalhos</div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={() => applyPreset(30)}>
                Últimos 30 dias
              </Button>
              <Button size="sm" variant="secondary" onClick={() => applyPreset(60)}>
                Últimos 60 dias
              </Button>
              <Button size="sm" variant="secondary" onClick={() => applyPreset(90)}>
                Últimos 90 dias
              </Button>
              <Button size="sm" variant="secondary" onClick={() => applyMonth(0)}>
                Mês atual
              </Button>
              <Button size="sm" variant="secondary" onClick={() => applyMonth(-1)}>
                Mês anterior
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
      {hasActive && (
        <Button variant="ghost" size="sm" onClick={onClear}>
          <X className="w-4 h-4 mr-1" />
          Limpar filtros
        </Button>
      )}

      <Button variant="outline" size="icon">
        <Filter className="w-4 h-4" />
      </Button>
    </div>
  );
};

export default DashboardFilters;
