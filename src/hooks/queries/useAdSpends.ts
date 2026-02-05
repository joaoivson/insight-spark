import { useQuery } from '@tanstack/react-query';
import { listAdSpends } from '@/services/adspends.service';

export const useAdSpends = (opts: { startDate?: string; endDate?: string } = {}) => {
    return useQuery({
        queryKey: ['ad-spends', opts],
        queryFn: () => listAdSpends(opts),
        staleTime: 5 * 60 * 1000, // 5 minutes
        refetchOnWindowFocus: false,
    });
};
