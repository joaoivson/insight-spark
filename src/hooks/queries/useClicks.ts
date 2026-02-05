import { useQuery } from '@tanstack/react-query';
import { fetchClickRows, ClickQuery } from '@/services/clicks.service';

export const useClicks = (query: ClickQuery = {}) => {
    return useQuery({
        queryKey: ['clicks', query],
        queryFn: () => fetchClickRows(query),
        staleTime: 5 * 60 * 1000, // 5 minutes
        refetchOnWindowFocus: false,
    });
};
