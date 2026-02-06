import { useQuery } from '@tanstack/react-query';
import { fetchDatasetRows, DatasetQuery } from '@/services/datasets.service';

export const useDatasetRows = (query: DatasetQuery = {}) => {
    return useQuery({
        queryKey: ['dataset-rows', query],
        queryFn: () => fetchDatasetRows(query),
        staleTime: 5 * 60 * 1000, // 5 minutes
        refetchOnWindowFocus: false,
    });
};
