import { create } from 'zustand';
import api from '@/services/api';

interface ShiftData {
  id: number;
  shift_code: string;
  opening_cash: string;
  status: string;
  opened_at: string;
}

interface ShiftState {
  activeShift: ShiftData | null;
  isLoading: boolean;
  error: string | null;

  fetchActiveShift: () => Promise<void>;
  openShift: (openingCash: number) => Promise<ShiftData>;
  closeShift: (physicalCash: number) => Promise<void>;
  clearShift: () => void;
}

export const useShiftStore = create<ShiftState>((set) => ({
  activeShift: null,
  isLoading: false,
  error: null,

  fetchActiveShift: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get('/shifts/active');
      set({ activeShift: response.data.data, isLoading: false });
    } catch (err) {
      console.error('Failed to fetch active shift:', err);
      set({ error: 'Gagal mengambil data shift aktif.', isLoading: false });
    }
  },

  openShift: async (openingCash: number) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/shifts/open', { opening_cash: openingCash });
      const shiftData = response.data.data;
      set({ activeShift: shiftData, isLoading: false });
      return shiftData;
    } catch (err) {
      const message = (err as { response?: { data?: { message?: string } } }).response?.data?.message || 'Gagal membuka shift.';
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  closeShift: async (physicalCash: number) => {
    set({ isLoading: true, error: null });
    try {
      await api.post('/shifts/close', { physical_cash_input: physicalCash });
      set({ activeShift: null, isLoading: false });
    } catch (err) {
      const message = (err as { response?: { data?: { message?: string } } }).response?.data?.message || 'Gagal menutup shift.';
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  clearShift: () => {
    set({ activeShift: null, error: null });
  },
}));
