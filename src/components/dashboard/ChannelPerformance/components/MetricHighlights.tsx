import { TrendingUp, TrendingDown, AlertTriangle, Trophy, BarChart3 } from "lucide-react";
import { ChannelMetric } from "../types";

const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);

interface MetricHighlightsProps {
    highlights: {
        starChannel: ChannelMetric;
        alertChannel?: ChannelMetric;
        volumeChannel: ChannelMetric;
    } | null;
}

export const MetricHighlights = ({ highlights }: MetricHighlightsProps) => {
    if (!highlights) return null;

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Estrela de ROAS */}
            <div className="bg-card border border-border p-5 rounded-xl">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Top ROAS</p>
                        <h4 className="mt-1 font-semibold text-foreground truncate max-w-[200px]" title={highlights.starChannel.name}>
                            {highlights.starChannel.name}
                        </h4>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-green-500">{highlights.starChannel.roas.toFixed(2)}x</span>
                            <span className="text-xs text-muted-foreground font-normal">de retorno</span>
                        </div>
                    </div>
                    <div className="p-2 bg-green-500/10 rounded-lg">
                        <Trophy className="w-5 h-5 text-green-500" />
                    </div>
                </div>
            </div>

            {/* Maior Volume */}
            <div className="bg-card border border-border p-5 rounded-xl">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Maior Volume</p>
                        <h4 className="mt-1 font-semibold text-foreground truncate max-w-[200px]" title={highlights.volumeChannel.name}>
                            {highlights.volumeChannel.name}
                        </h4>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-blue-500">{formatCurrency(highlights.volumeChannel.revenue)}</span>
                            <span className="text-xs text-muted-foreground font-normal">gerados</span>
                        </div>
                    </div>
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                        <BarChart3 className="w-5 h-5 text-blue-500" />
                    </div>
                </div>
            </div>

            {/* Alerta de Prejuízo */}
            {highlights.alertChannel && (
                <div className="bg-card border border-border p-5 rounded-xl border-red-500/20">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-xs font-medium text-red-500 uppercase tracking-wider">Atenção (Prejuízo)</p>
                            <h4 className="mt-1 font-semibold text-foreground truncate max-w-[200px]" title={highlights.alertChannel.name}>
                                {highlights.alertChannel.name}
                            </h4>
                            <div className="mt-3 flex items-baseline gap-2">
                                <span className="text-2xl font-bold text-red-500">{formatCurrency(highlights.alertChannel.profit)}</span>
                                <span className="text-xs text-muted-foreground font-normal">líquido</span>
                            </div>
                        </div>
                        <div className="p-2 bg-red-500/10 rounded-lg">
                            <AlertTriangle className="w-5 h-5 text-red-500" />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
