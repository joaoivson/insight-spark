import { useMemo } from "react";
import { DatasetRow } from "../../DataTable";
import { AdSpend } from "@/shared/types/adspend";
import { isBeforeDateKey, isAfterDateKey, parseDateOnly } from "@/shared/lib/date";
import { filterKpiRows, getComissaoCents } from "@/shared/lib/kpi";
import { DateRange, ChannelMetric, DayMetric } from "../types";

export const useChannelMetrics = (
    rows: DatasetRow[],
    adSpends: AdSpend[],
    dateRange?: DateRange
) => {
    // Filter rows by dateRange and KPI status (Pendente, Concluído) — mesma fonte que kpi.ts
    const filteredRows = useMemo(() => {
        let dateFiltered = rows;
        if (dateRange?.from || dateRange?.to) {
            dateFiltered = rows.filter((r) => {
                if (dateRange.from && isBeforeDateKey(r.date, dateRange.from)) return false;
                if (dateRange.to && isAfterDateKey(r.date, dateRange.to)) return false;
                return true;
            });
        }
        return filterKpiRows(dateFiltered);
    }, [rows, dateRange]);

    // Filter adSpends by dateRange
    const filteredAdSpends = useMemo(() => {
        if (!dateRange?.from && !dateRange?.to) return adSpends;
        return adSpends.filter((spend) => {
            const spendDate = spend.date;
            if (dateRange.from && isBeforeDateKey(spendDate, dateRange.from)) return false;
            if (dateRange.to && isAfterDateKey(spendDate, dateRange.to)) return false;
            return true;
        });
    }, [adSpends, dateRange]);

    const channelMetrics = useMemo(() => {
        const channelMap = new Map<string, { commission: number; spend: number; orders: number }>();

        // 1. Processar Comissões por canal (Sub ID)
        filteredRows.forEach((row) => {
            const channel = row.sub_id1 || "Orgânico/Outros";
            const current = channelMap.get(channel) || { commission: 0, spend: 0, orders: 0 };

            const commission = getComissaoCents(row) / 100;

            channelMap.set(channel, {
                ...current,
                commission: current.commission + commission,
                orders: current.orders + 1
            });
        });

        // 2. Processar Gastos (Ads)
        let totalGeneralSpend = 0;

        filteredAdSpends.forEach((spend) => {
            if (!spend.sub_id || spend.sub_id === "Geral/Institucional") {
                totalGeneralSpend += (spend.amount || 0);
            } else {
                const channel = spend.sub_id;
                const current = channelMap.get(channel) || { commission: 0, spend: 0, orders: 0 };
                channelMap.set(channel, {
                    ...current,
                    spend: current.spend + (spend.amount || 0)
                });
            }
        });

        // Calcular total de comissão para rateio
        const totalCommission = Array.from(channelMap.values()).reduce((sum, val) => sum + val.commission, 0);

        // 3. Calcular KPIs Finais com Rateio proporcional à comissão
        const data: ChannelMetric[] = Array.from(channelMap.entries()).map(([name, vals]) => {
            const share = totalCommission > 0 ? vals.commission / totalCommission : 0;
            const allocatedGeneralSpend = totalGeneralSpend * share;
            const totalSpend = vals.spend + allocatedGeneralSpend;

            const receita = vals.commission;
            const profit = vals.commission - totalSpend;
            const roas = totalSpend > 0 ? vals.commission / totalSpend : vals.commission > 0 ? 999 : 0;
            const roi = totalSpend > 0 ? (profit / totalSpend) * 100 : 0;
            const cpa = vals.orders > 0 ? totalSpend / vals.orders : 0;

            return {
                name,
                commission: vals.commission,
                spend: totalSpend,
                profit,
                revenue: receita,
                roas,
                roi,
                cpa,
                orders: vals.orders,
            };
        });

        return data.sort((a, b) => b.revenue - a.revenue);
    }, [filteredRows, filteredAdSpends]);

    const dailyMetrics = useMemo(() => {
        const dayMap = new Map<string, { commission: number; spend: number; orders: number }>();

        filteredRows.forEach((row) => {
            const day = row.date || "Sem data";
            const commission = getComissaoCents(row) / 100;
            const cur = dayMap.get(day) || { commission: 0, spend: 0, orders: 0 };
            dayMap.set(day, {
                commission: cur.commission + commission,
                spend: cur.spend,
                orders: cur.orders + 1,
            });
        });

        filteredAdSpends.forEach((spend) => {
            const d = parseDateOnly(spend.date);
            const day = d ? d.toISOString().slice(0, 10) : "Sem data";
            const cur = dayMap.get(day) || { commission: 0, spend: 0, orders: 0 };
            dayMap.set(day, {
                ...cur,
                spend: cur.spend + (spend.amount || 0),
            });
        });

        return Array.from(dayMap.entries())
            .map(([day, vals]) => {
                const profit = vals.commission - vals.spend;
                const roas = vals.spend > 0 ? vals.commission / vals.spend : vals.commission > 0 ? 999 : 0;
                return { day, ...vals, profit, roas };
            })
            .sort((a, b) => a.day.localeCompare(b.day));
    }, [filteredRows, filteredAdSpends]);

    const highlights = useMemo(() => {
        if (!channelMetrics.length) return null;

        const starChannel = channelMetrics.reduce((prev, current) => (current.roas > prev.roas && current.spend > 0) ? current : prev, channelMetrics[0]);
        const alertChannel = channelMetrics.find(m => m.profit < 0 && m.spend > 0);
        const volumeChannel = channelMetrics.reduce((prev, current) => (current.revenue > prev.revenue) ? current : prev, channelMetrics[0]);

        return { starChannel, alertChannel, volumeChannel };
    }, [channelMetrics]);

    return {
        channelMetrics,
        dailyMetrics,
        highlights,
        filteredRows,
        filteredAdSpends
    };
};
