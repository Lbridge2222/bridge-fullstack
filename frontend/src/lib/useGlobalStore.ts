import { create } from 'zustand'

interface GlobalState {
  academicCycle: string
  setCycle: (cycle: string) => void
  showShortTermForecast: boolean
  toggleForecastMode: () => void
}

export const useGlobalStore = create<GlobalState>((set) => ({
  academicCycle: '2025',
  setCycle: (cycle) => set({ academicCycle: cycle }),
  showShortTermForecast: true,
  toggleForecastMode: () =>
    set((state) => ({ showShortTermForecast: !state.showShortTermForecast })),
}))