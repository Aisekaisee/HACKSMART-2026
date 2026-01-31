import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Station } from "@/types";

interface StationsState {
  stations: Station[];
  loading: boolean;
  error: string | null;
}

const initialState: StationsState = {
  stations: [],
  loading: false,
  error: null,
};

const stationsSlice = createSlice({
  name: "stations",
  initialState,
  reducers: {
    setStations: (state, action: PayloadAction<Station[]>) => {
      state.stations = action.payload;
      state.loading = false;
      state.error = null;
    },
    addStation: (state, action: PayloadAction<Station>) => {
      state.stations.push(action.payload);
    },
    updateStation: (state, action: PayloadAction<Station>) => {
      const index = state.stations.findIndex((s) => s.id === action.payload.id);
      if (index !== -1) {
        state.stations[index] = action.payload;
      }
    },
    removeStation: (state, action: PayloadAction<string>) => {
      state.stations = state.stations.filter((s) => s.id !== action.payload);
    },
    setStationsLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setStationsError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.loading = false;
    },
    clearStations: (state) => {
      state.stations = [];
      state.loading = false;
      state.error = null;
    },
  },
});

export const {
  setStations,
  addStation,
  updateStation,
  removeStation,
  setStationsLoading,
  setStationsError,
  clearStations,
} = stationsSlice.actions;
export default stationsSlice.reducer;
