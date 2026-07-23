import { create } from "zustand";

type AdminPanelState = {
  year: number;
  month: number;
  setPeriod: (year: number, month: number) => void;
};

const now = new Date();

export const useAdminPanelStore = create<AdminPanelState>((set) => ({
  year: now.getFullYear(),
  month: now.getMonth() + 1,
  setPeriod: (year, month) => set({ year, month }),
}));
