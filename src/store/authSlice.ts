import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface User {
  id: number;
  phone: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  is_rider?: boolean;
}

interface AuthState {
  access: string | null;
  refresh: string | null;
  user: User | null;
  bootstrapped: boolean; // true once tokens have been loaded from secure storage
}

const initialState: AuthState = { access: null, refresh: null, user: null, bootstrapped: false };

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setTokens(state, action: PayloadAction<{ access: string; refresh?: string }>) {
      state.access = action.payload.access;
      if (action.payload.refresh) state.refresh = action.payload.refresh;
    },
    setUser(state, action: PayloadAction<User | null>) {
      state.user = action.payload;
    },
    bootstrapped(state, action: PayloadAction<{ access: string | null; refresh: string | null }>) {
      state.access = action.payload.access;
      state.refresh = action.payload.refresh;
      state.bootstrapped = true;
    },
    logout(state) {
      state.access = null;
      state.refresh = null;
      state.user = null;
    },
  },
});

export const { setTokens, setUser, bootstrapped, logout } = authSlice.actions;
export default authSlice.reducer;
