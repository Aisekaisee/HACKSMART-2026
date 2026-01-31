import { useCallback, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/store";
import {
  setCredentials,
  logout as logoutAction,
  initializeAuth,
} from "@/features/authSlice";
import api from "@/lib/api";
import type { User } from "@/types";

export function useAuth() {
  const dispatch = useAppDispatch();
  const { user, token, isAuthenticated, loading } = useAppSelector(
    (state) => state.auth,
  );

  // Initialize auth state from sessionStorage on mount
  useEffect(() => {
    dispatch(initializeAuth());

    // Set token in API client if exists
    const storedToken = sessionStorage.getItem("token");
    if (storedToken) {
      api.setToken(storedToken);
    }
  }, [dispatch]);

  const login = useCallback(
    async (email: string, password: string) => {
      const response = await api.auth.login(email, password);

      const user: User = {
        id: response.user_id,
        email,
        role: response.role as User["role"],
      };

      // Save to sessionStorage
      sessionStorage.setItem("token", response.access_token);
      sessionStorage.setItem("user", JSON.stringify(user));

      // Update API client
      api.setToken(response.access_token);

      // Update Redux state
      dispatch(setCredentials({ user, token: response.access_token }));

      return user;
    },
    [dispatch],
  );

  const signup = useCallback(
    async (email: string, password: string) => {
      const response = await api.auth.signup(email, password);

      const user: User = {
        id: response.user_id,
        email,
        role: response.role as User["role"],
      };

      // Save to sessionStorage
      sessionStorage.setItem("token", response.access_token);
      sessionStorage.setItem("user", JSON.stringify(user));

      // Update API client
      api.setToken(response.access_token);

      // Update Redux state
      dispatch(setCredentials({ user, token: response.access_token }));

      return user;
    },
    [dispatch],
  );

  const logout = useCallback(async () => {
    try {
      await api.auth.logout();
    } catch {
      // Ignore logout API errors
    }

    // Clear sessionStorage
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");

    // Update API client
    api.setToken(null);

    // Update Redux state
    dispatch(logoutAction());
  }, [dispatch]);

  return {
    user,
    token,
    isAuthenticated,
    loading,
    login,
    signup,
    logout,
  };
}
