import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface UIState {
  selectedStationId: string | null;
  currentTimelineFrame: number;
  modals: {
    addStation: boolean;
    editStation: boolean;
    removeStation: boolean;
    addIntervention: boolean;
  };
  sidebarCollapsed: {
    left: boolean;
    right: boolean;
  };
}

const initialState: UIState = {
  selectedStationId: null,
  currentTimelineFrame: 0,
  modals: {
    addStation: false,
    editStation: false,
    removeStation: false,
    addIntervention: false,
  },
  sidebarCollapsed: {
    left: false,
    right: false,
  },
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    setSelectedStation: (state, action: PayloadAction<string | null>) => {
      state.selectedStationId = action.payload;
    },
    setCurrentTimelineFrame: (state, action: PayloadAction<number>) => {
      state.currentTimelineFrame = action.payload;
    },
    openModal: (state, action: PayloadAction<keyof UIState["modals"]>) => {
      state.modals[action.payload] = true;
    },
    closeModal: (state, action: PayloadAction<keyof UIState["modals"]>) => {
      state.modals[action.payload] = false;
    },
    closeAllModals: (state) => {
      state.modals = {
        addStation: false,
        editStation: false,
        removeStation: false,
        addIntervention: false,
      };
    },
    toggleSidebar: (state, action: PayloadAction<"left" | "right">) => {
      state.sidebarCollapsed[action.payload] =
        !state.sidebarCollapsed[action.payload];
    },
    resetUI: (state) => {
      state.selectedStationId = null;
      state.currentTimelineFrame = 0;
      state.modals = initialState.modals;
    },
  },
});

export const {
  setSelectedStation,
  setCurrentTimelineFrame,
  openModal,
  closeModal,
  closeAllModals,
  toggleSidebar,
  resetUI,
} = uiSlice.actions;
export default uiSlice.reducer;
