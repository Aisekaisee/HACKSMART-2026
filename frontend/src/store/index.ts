import { configureStore } from "@reduxjs/toolkit";
import {
  useDispatch,
  useSelector,
  type TypedUseSelectorHook,
} from "react-redux";
import authReducer from "@/features/authSlice";
import projectsReducer from "@/features/projectsSlice";
import stationsReducer from "@/features/stationsSlice";
import scenariosReducer from "@/features/scenariosSlice";
import uiReducer from "@/features/uiSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    projects: projectsReducer,
    stations: stationsReducer,
    scenarios: scenariosReducer,
    ui: uiReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Typed hooks
export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
