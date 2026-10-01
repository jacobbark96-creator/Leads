import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface DivisionState {
  activeDivisionId: string | 'all';
  setActiveDivisionId: (id: string | 'all') => void;
}

export const useDivisionStore = create<DivisionState>()(
  persist(
    (set) => ({
      activeDivisionId: 'all',
      setActiveDivisionId: (id) => set({ activeDivisionId: id }),
    }),
    {
      name: 'division-storage',
    }
  )
);
