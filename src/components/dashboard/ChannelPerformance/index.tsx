import { ChannelPerformanceProps } from "./types";
import { useChannelMetrics } from "./hooks/useChannelMetrics";
import { MetricHighlights } from "./components/MetricHighlights";
import { SubIdTable } from "./components/SubIdTable";
import { DailyTable } from "./components/DailyTable";

const ChannelPerformance = ({
    rows,
    adSpends,
    dateRange,
    subIdFilter,
    showSubTable = true,
    showDayTable = true,
    showHighlights = true,
}: ChannelPerformanceProps) => {
    const { channelMetrics, dailyMetrics, highlights } = useChannelMetrics(rows, adSpends, dateRange, subIdFilter);

    if (!channelMetrics.length) return null;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {showHighlights && <MetricHighlights highlights={highlights} />}
            {showSubTable && <SubIdTable metrics={channelMetrics} />}
            {showDayTable && <DailyTable metrics={dailyMetrics} />}
        </div>
    );
};

export default ChannelPerformance;
export * from "./types";
