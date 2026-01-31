import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { User, AuthState } from "@/types";

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  loading: true,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{ user: User; token: string }>,
    ) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      state.loading = false;
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.loading = false;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    initializeAuth: (state) => {
      // Check sessionStorage for existing session
      const token = sessionStorage.getItem("token");
      const userStr = sessionStorage.getItem("user");

      if (token && userStr) {
        try {
          state.user = JSON.parse(userStr);
          state.token = token;
          state.isAuthenticated = true;
        } catch {
          // Invalid stored data
          sessionStorage.removeItem("token");
          sessionStorage.removeItem("user");
        }
      }
      state.loading = false;
    },
  },
});

export const { setCredentials, logout, setLoading, initializeAuth } =
  authSlice.actions;
export default authSlice.reducer;
