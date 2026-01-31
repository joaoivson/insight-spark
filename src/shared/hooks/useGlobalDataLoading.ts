import { useDatasetStore } from "@/stores/datasetStore";
import { useAdSpendsStore } from "@/stores/adSpendsStore";
import { useClicksStore } from "@/stores/clicksStore";

/**
 * Hook to monitor the global loading and hydration state of all data stores.
 * Useful for showing global loading overlays or progress indicators.
 */
export const useGlobalDataLoading = () => {
  const { loading: rowsLoading, hydrated: rowsHydrated } = useDatasetStore();
  const { loading: spendsLoading, hydrated: spendsHydrated } = useAdSpendsStore();
  const { loading: clicksLoading, hydrated: clicksHydrated } = useClicksStore();

  // Loading if any of the stores is currently fetching
  const isLoading = rowsLoading || spendsLoading || clicksLoading;

  // Hydrated if all stores have been initialized (from cache or first API call)
  const isHydrated = rowsHydrated && spendsHydrated && clicksHydrated;

  // We should show the initial loading overlay only if we are currently loading
  // AND the stores are not yet hydrated (meaning this is the very first load)
  const showInitialOverlay = isLoading && !isHydrated;

  return {
    isLoading,
    isHydrated,
    showInitialOverlay,
  };
};
