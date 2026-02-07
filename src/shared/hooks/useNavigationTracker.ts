import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

const NAV_COUNT_KEY = "marketdash_feedback_nav_count";
const NAV_HISTORY_KEY = "marketdash_feedback_nav_history";
const MAX_HISTORY = 20;

const getMinNavigations = () => {
  const val = import.meta.env.VITE_FEEDBACK_MIN_NAVIGATIONS;
  const parsed = parseInt(String(val), 10);
  return Number.isNaN(parsed) ? 3 : Math.max(1, parsed);
};

const getStoredCount = (): number => {
  try {
    const stored = sessionStorage.getItem(NAV_COUNT_KEY);
    return stored ? Math.max(0, parseInt(stored, 10)) : 0;
  } catch {
    return 0;
  }
};

const incrementCount = (): number => {
  const next = getStoredCount() + 1;
  try {
    sessionStorage.setItem(NAV_COUNT_KEY, String(next));
  } catch {
    // ignore
  }
  return next;
};

const addToHistory = (pathname: string) => {
  try {
    const stored = sessionStorage.getItem(NAV_HISTORY_KEY);
    const history: string[] = stored ? JSON.parse(stored) : [];
    const last = history[history.length - 1];
    if (last !== pathname) {
      history.push(pathname);
      const trimmed = history.slice(-MAX_HISTORY);
      sessionStorage.setItem(NAV_HISTORY_KEY, JSON.stringify(trimmed));
    }
  } catch {
    // ignore
  }
};

export const getNavigationHistory = (): string[] => {
  try {
    const stored = sessionStorage.getItem(NAV_HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

export const useNavigationTracker = () => {
  const { pathname } = useLocation();
  const [navigationCount, setNavigationCount] = useState(getStoredCount);
  const minNavigations = getMinNavigations();

  useEffect(() => {
    addToHistory(pathname);
    const count = incrementCount();
    setNavigationCount(count);
  }, [pathname]);

  return {
    navigationCount,
    canShowFeedback: navigationCount >= minNavigations,
    minNavigations,
  };
};
