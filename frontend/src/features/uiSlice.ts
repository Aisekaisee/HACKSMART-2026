import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface PickedLocation {
  lat: number;
  lng: number;
}

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
  // Location picking state
  isPickingLocation: boolean;
  pickingForModal: "addStation" | "editStation" | "eventLocation" | null;
  pickedLocation: PickedLocation | null;
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
  isPickingLocation: false,
  pickingForModal: null,
  pickedLocation: null,
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
    // Location picking actions
    startLocationPicking: (
      state,
      action: PayloadAction<"addStation" | "editStation" | "eventLocation">,
    ) => {
      state.isPickingLocation = true;
      state.pickingForModal = action.payload;
      state.pickedLocation = null;
      // Close the appropriate modal while picking
      if (action.payload === "addStation") {
        state.modals.addStation = false;
      } else if (action.payload === "editStation") {
        state.modals.editStation = false;
      } else if (action.payload === "eventLocation") {
        state.modals.addIntervention = false;
      }
    },
    setPickedLocation: (state, action: PayloadAction<PickedLocation>) => {
      state.pickedLocation = action.payload;
      state.isPickingLocation = false;
      // Reopen the appropriate modal
      if (state.pickingForModal === "addStation") {
        state.modals.addStation = true;
      } else if (state.pickingForModal === "editStation") {
        state.modals.editStation = true;
      } else if (state.pickingForModal === "eventLocation") {
        state.modals.addIntervention = true;
      }
    },
    cancelLocationPicking: (state) => {
      state.isPickingLocation = false;
      // Reopen the appropriate modal without setting location
      if (state.pickingForModal === "addStation") {
        state.modals.addStation = true;
      } else if (state.pickingForModal === "editStation") {
        state.modals.editStation = true;
      } else if (state.pickingForModal === "eventLocation") {
        state.modals.addIntervention = true;
      }
      state.pickingForModal = null;
    },
    clearPickedLocation: (state) => {
      state.pickedLocation = null;
      state.pickingForModal = null;
    },
    resetUI: (state) => {
      state.selectedStationId = null;
      state.currentTimelineFrame = 0;
      state.modals = initialState.modals;
      state.isPickingLocation = false;
      state.pickingForModal = null;
      state.pickedLocation = null;
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
  startLocationPicking,
  setPickedLocation,
  cancelLocationPicking,
  clearPickedLocation,
  resetUI,
} = uiSlice.actions;
export default uiSlice.reducer;
