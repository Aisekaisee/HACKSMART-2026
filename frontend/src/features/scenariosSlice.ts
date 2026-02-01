import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Scenario, SimulationResult, InterventionItem } from "@/types";

interface ScenariosState {
  scenarios: Scenario[];
  currentScenario: Scenario | null;
  simulationResult: SimulationResult | null;
  pendingInterventions: InterventionItem[];
  activeInterventions: InterventionItem[]; // Interventions used in last simulation
  loading: boolean;
  running: boolean;
  error: string | null;
  // Timeline playback state
  playbackIndex: number;
  isPlaying: boolean;
  playbackSpeed: number; // 1 = normal, 2 = 2x, 0.5 = half speed
}

const initialState: ScenariosState = {
  scenarios: [],
  currentScenario: null,
  simulationResult: null,
  pendingInterventions: [],
  activeInterventions: [],
  loading: false,
  running: false,
  error: null,
  // Timeline playback initial state
  playbackIndex: 0,
  isPlaying: false,
  playbackSpeed: 1,
};

const scenariosSlice = createSlice({
  name: "scenarios",
  initialState,
  reducers: {
    setScenarios: (state, action: PayloadAction<Scenario[]>) => {
      state.scenarios = action.payload;
      state.loading = false;
      state.error = null;
    },
    addScenario: (state, action: PayloadAction<Scenario>) => {
      state.scenarios.push(action.payload);
    },
    setCurrentScenario: (state, action: PayloadAction<Scenario | null>) => {
      state.currentScenario = action.payload;
    },
    setSimulationResult: (
      state,
      action: PayloadAction<SimulationResult | null>,
    ) => {
      state.simulationResult = action.payload;
      state.running = false;
    },
    addPendingIntervention: (
      state,
      action: PayloadAction<InterventionItem>,
    ) => {
      state.pendingInterventions.push(action.payload);
    },
    removePendingIntervention: (state, action: PayloadAction<number>) => {
      state.pendingInterventions.splice(action.payload, 1);
    },
    clearPendingInterventions: (state) => {
      // Only move pending to active if there are pending interventions
      // This preserves active interventions when re-running without new ones
      if (state.pendingInterventions.length > 0) {
        state.activeInterventions = [...state.pendingInterventions];
        state.pendingInterventions = [];
      }
    },
    clearActiveInterventions: (state) => {
      state.activeInterventions = [];
    },
    setScenariosLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setSimulationRunning: (state, action: PayloadAction<boolean>) => {
      state.running = action.payload;
    },
    setScenariosError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.loading = false;
      state.running = false;
    },
    clearScenarios: (state) => {
      state.scenarios = [];
      state.currentScenario = null;
      state.simulationResult = null;
      state.pendingInterventions = [];
      state.activeInterventions = [];
      state.loading = false;
      state.running = false;
      state.error = null;
      state.playbackIndex = 0;
      state.isPlaying = false;
      state.playbackSpeed = 1;
    },
    // Timeline playback actions
    setPlaybackIndex: (state, action: PayloadAction<number>) => {
      state.playbackIndex = action.payload;
    },
    setIsPlaying: (state, action: PayloadAction<boolean>) => {
      state.isPlaying = action.payload;
    },
    setPlaybackSpeed: (state, action: PayloadAction<number>) => {
      state.playbackSpeed = action.payload;
    },
    resetPlayback: (state) => {
      state.playbackIndex = 0;
      state.isPlaying = false;
    },
  },
});

export const {
  setScenarios,
  addScenario,
  setCurrentScenario,
  setSimulationResult,
  addPendingIntervention,
  removePendingIntervention,
  clearPendingInterventions,
  clearActiveInterventions,
  setScenariosLoading,
  setSimulationRunning,
  setScenariosError,
  clearScenarios,
  // Timeline playback exports
  setPlaybackIndex,
  setIsPlaying,
  setPlaybackSpeed,
  resetPlayback,
} = scenariosSlice.actions;
export default scenariosSlice.reducer;
