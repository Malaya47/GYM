import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import api from "@/lib/api";

export interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  goal?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  loginModalOpen: boolean;
  registrationModalOpen: boolean;
}

const initialState: AuthState = {
  user: null,
  token:
    typeof window !== "undefined" ? localStorage.getItem("gym_token") : null,
  loading: false,
  error: null,
  loginModalOpen: false,
  registrationModalOpen: false,
};

// ─── Thunks ─────────────────────────────────────────────

export const registerUser = createAsyncThunk(
  "auth/register",
  async (
    data: {
      firstName: string;
      lastName: string;
      email: string;
      password: string;
      phone?: string;
      dateOfBirth?: string;
      gender?: string;
      weight?: number;
      height?: number;
      goal?: string;
      experience?: string;
    },
    { rejectWithValue },
  ) => {
    try {
      const res = await api.post("/auth/register", data);
      return res.data as { token: string; user: User };
    } catch (err: any) {
      return rejectWithValue(
        err.response?.data?.error || "Registration failed",
      );
    }
  },
);

export const loginUser = createAsyncThunk(
  "auth/login",
  async (data: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const res = await api.post("/auth/login", data);
      return res.data as { token: string; user: User };
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.error || "Login failed");
    }
  },
);

export const fetchMe = createAsyncThunk(
  "auth/me",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get("/auth/me");
      return res.data.user as User;
    } catch (err: any) {
      return rejectWithValue(
        err.response?.data?.error || "Failed to fetch profile",
      );
    }
  },
);

// ─── Slice ──────────────────────────────────────────────

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logout(state) {
      state.user = null;
      state.token = null;
      if (typeof window !== "undefined") {
        localStorage.removeItem("gym_token");
        localStorage.removeItem("gym_admin_token");
      }
    },
    clearError(state) {
      state.error = null;
    },
    openLoginModal(state) {
      state.loginModalOpen = true;
    },
    closeLoginModal(state) {
      state.loginModalOpen = false;
      state.error = null;
    },
    openRegistrationModal(state) {
      state.registrationModalOpen = true;
    },
    closeRegistrationModal(state) {
      state.registrationModalOpen = false;
    },
    setToken(state, action: PayloadAction<string>) {
      state.token = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Register
    builder
      .addCase(registerUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        if (typeof window !== "undefined") {
          localStorage.setItem("gym_token", action.payload.token);
        }
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Login
    builder
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        if (typeof window !== "undefined") {
          localStorage.setItem("gym_token", action.payload.token);
        }
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Me
    builder
      .addCase(fetchMe.fulfilled, (state, action) => {
        state.user = action.payload;
      })
      .addCase(fetchMe.rejected, (state) => {
        state.user = null;
        state.token = null;
      });
  },
});

export const {
  logout,
  clearError,
  setToken,
  openLoginModal,
  closeLoginModal,
  openRegistrationModal,
  closeRegistrationModal,
} = authSlice.actions;
export default authSlice.reducer;
