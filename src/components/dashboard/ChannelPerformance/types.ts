import { DatasetRow } from "../DataTable";

export interface DateRange {
    from?: Date;
    to?: Date;
}

export interface ChannelMetric {
    name: string;
    commission: number;
    spend: number;
    profit: number;
    revenue: number;
    roas: number;
    roi: number;
    cpa: number;
    orders: number;
}

export interface DayMetric {
    day: string;
    commission: number;
    spend: number;
    orders: number;
    profit: number;
    roas: number;
}

export interface ChannelPerformanceProps {
    rows: DatasetRow[];
    adSpends: any[]; // Using any temporarily if adSpends type is complex or elsewhere
    dateRange?: DateRange;
    showSubTable?: boolean;
    showDayTable?: boolean;
    showHighlights?: boolean;
}
