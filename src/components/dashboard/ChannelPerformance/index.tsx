import { useMemo } from "react";
import { ChannelPerformanceProps } from "./types";
import { useChannelMetrics } from "./hooks/useChannelMetrics";
import { MetricHighlights } from "./components/MetricHighlights";
import { SubIdTable } from "./components/SubIdTable";
import { DailyTable } from "./components/DailyTable";
import { useTaxSettingsStore } from "@/stores/taxSettingsStore";

const ChannelPerformance = ({
    rows,
    adSpends,
    dateRange,
    subIdFilter,
    showSubTable = true,
    showDayTable = true,
    showHighlights = true,
}: ChannelPerformanceProps) => {
    const adTaxRate = useTaxSettingsStore((s) => s.adTaxRate);
    const commissionTaxRate = useTaxSettingsStore((s) => s.commissionTaxRate);
    const tax = useMemo(() => ({ adTaxRate, commissionTaxRate }), [adTaxRate, commissionTaxRate]);
    const { channelMetrics, dailyMetrics, highlights } = useChannelMetrics(rows, adSpends, dateRange, subIdFilter, tax);

    if (!channelMetrics.length && !dailyMetrics.length) return null;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {showHighlights && channelMetrics.length > 0 && <MetricHighlights highlights={highlights} />}
            {showSubTable && channelMetrics.length > 0 && <SubIdTable metrics={channelMetrics} />}
            {showDayTable && dailyMetrics.length > 0 && <DailyTable metrics={dailyMetrics} />}
        </div>
    );
};

export default ChannelPerformance;
export * from "./types";
