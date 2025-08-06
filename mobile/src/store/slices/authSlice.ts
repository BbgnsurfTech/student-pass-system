import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';

import { apiClient } from '../../services/api';
import { User, LoginCredentials, RegisterData } from '../../types/auth';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  biometricEnabled: boolean;
  tokens: {
    accessToken: string | null;
    refreshToken: string | null;
    expiresAt: number | null;
  };
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  biometricEnabled: false,
  tokens: {
    accessToken: null,
    refreshToken: null,
    expiresAt: null,
  },
};

// Async thunks
export const loginUser = createAsyncThunk(
  'auth/login',
  async (credentials: LoginCredentials, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/auth/login', credentials);
      const { user, tokens } = response.data.data;

      // Store tokens securely
      await SecureStore.setItemAsync('accessToken', tokens.accessToken);
      await SecureStore.setItemAsync('refreshToken', tokens.refreshToken);
      
      // Store credentials for biometric login if remember me is enabled
      if (credentials.rememberMe) {
        await SecureStore.setItemAsync('biometricCredentials', JSON.stringify({
          email: credentials.email,
          userId: user.id,
        }));
      }

      return { user, tokens };
    } catch (error: any) {
      return rejectWithValue({
        message: error.response?.data?.message || 'Login failed',
      });
    }
  }
);

export const registerUser = createAsyncThunk(
  'auth/register',
  async (data: RegisterData, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/auth/register', data);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue({
        message: error.response?.data?.message || 'Registration failed',
      });
    }
  }
);

export const loginWithBiometric = createAsyncThunk(
  'auth/biometric',
  async (_, { rejectWithValue }) => {
    try {
      // Check if biometric credentials exist
      const storedCredentials = await SecureStore.getItemAsync('biometricCredentials');
      if (!storedCredentials) {
        throw new Error('No biometric credentials found');
      }

      const credentials = JSON.parse(storedCredentials);
      
      // Use stored user data to authenticate
      const response = await apiClient.post('/auth/biometric-login', {
        userId: credentials.userId,
      });

      const { user, tokens } = response.data.data;

      // Update stored tokens
      await SecureStore.setItemAsync('accessToken', tokens.accessToken);
      await SecureStore.setItemAsync('refreshToken', tokens.refreshToken);

      return { user, tokens };
    } catch (error: any) {
      return rejectWithValue({
        message: error.response?.data?.message || 'Biometric login failed',
      });
    }
  }
);

export const refreshToken = createAsyncThunk(
  'auth/refresh',
  async (_, { rejectWithValue }) => {
    try {
      const refreshToken = await SecureStore.getItemAsync('refreshToken');
      if (!refreshToken) {
        throw new Error('No refresh token found');
      }

      const response = await apiClient.post('/auth/refresh', {
        refreshToken,
      });

      const { tokens } = response.data.data;

      // Update stored tokens
      await SecureStore.setItemAsync('accessToken', tokens.accessToken);
      await SecureStore.setItemAsync('refreshToken', tokens.refreshToken);

      return tokens;
    } catch (error: any) {
      return rejectWithValue({
        message: error.response?.data?.message || 'Token refresh failed',
      });
    }
  }
);

export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      const accessToken = await SecureStore.getItemAsync('accessToken');
      if (accessToken) {
        await apiClient.post('/auth/logout');
      }
    } catch (error) {
      // Continue with logout even if API call fails
    } finally {
      // Clear all stored tokens and credentials
      await SecureStore.deleteItemAsync('accessToken');
      await SecureStore.deleteItemAsync('refreshToken');
      await SecureStore.deleteItemAsync('biometricCredentials');
    }
  }
);

export const enableBiometric = createAsyncThunk(
  'auth/enable-biometric',
  async (credentials: { email: string; password: string }, { rejectWithValue }) => {
    try {
      // Check if biometric authentication is available
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
      
      if (!hasHardware || supportedTypes.length === 0) {
        throw new Error('Biometric authentication not available');
      }

      // Verify current credentials
      const response = await apiClient.post('/auth/verify-credentials', credentials);
      const { user } = response.data.data;

      // Store biometric credentials
      await SecureStore.setItemAsync('biometricCredentials', JSON.stringify({
        email: credentials.email,
        userId: user.id,
      }));

      return true;
    } catch (error: any) {
      return rejectWithValue({
        message: error.response?.data?.message || 'Failed to enable biometric authentication',
      });
    }
  }
);

export const initializeAuth = createAsyncThunk(
  'auth/initialize',
  async (_, { rejectWithValue }) => {
    try {
      const accessToken = await SecureStore.getItemAsync('accessToken');
      const biometricCredentials = await SecureStore.getItemAsync('biometricCredentials');
      
      if (!accessToken) {
        return { 
          user: null, 
          tokens: { accessToken: null, refreshToken: null, expiresAt: null },
          biometricEnabled: !!biometricCredentials,
        };
      }

      // Verify token with backend
      const response = await apiClient.get('/auth/profile', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const user = response.data.data;
      const refreshToken = await SecureStore.getItemAsync('refreshToken');

      return {
        user,
        tokens: {
          accessToken,
          refreshToken,
          expiresAt: null, // TODO: Extract from JWT
        },
        biometricEnabled: !!biometricCredentials,
      };
    } catch (error: any) {
      // Token might be expired, try refresh
      return rejectWithValue({
        message: 'Session expired',
      });
    }
  }
);

// Slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    updateProfile: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
    disableBiometric: (state) => {
      state.biometricEnabled = false;
      // Clear biometric credentials in async action
      SecureStore.deleteItemAsync('biometricCredentials');
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.tokens = action.payload.tokens;
        state.error = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload?.message || 'Login failed';
      })

      // Register
      .addCase(registerUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state) => {
        state.isLoading = false;
        state.error = null;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload?.message || 'Registration failed';
      })

      // Biometric login
      .addCase(loginWithBiometric.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginWithBiometric.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.tokens = action.payload.tokens;
        state.error = null;
      })
      .addCase(loginWithBiometric.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload?.message || 'Biometric login failed';
      })

      // Refresh token
      .addCase(refreshToken.fulfilled, (state, action) => {
        state.tokens = action.payload;
      })
      .addCase(refreshToken.rejected, (state) => {
        state.isAuthenticated = false;
        state.user = null;
        state.tokens = initialState.tokens;
      })

      // Logout
      .addCase(logout.fulfilled, (state) => {
        state.isAuthenticated = false;
        state.user = null;
        state.tokens = initialState.tokens;
        state.error = null;
      })

      // Enable biometric
      .addCase(enableBiometric.fulfilled, (state) => {
        state.biometricEnabled = true;
        state.error = null;
      })
      .addCase(enableBiometric.rejected, (state, action) => {
        state.error = action.payload?.message || 'Failed to enable biometric';
      })

      // Initialize
      .addCase(initializeAuth.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(initializeAuth.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = !!action.payload.user;
        state.user = action.payload.user;
        state.tokens = action.payload.tokens;
        state.biometricEnabled = action.payload.biometricEnabled;
      })
      .addCase(initializeAuth.rejected, (state) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.tokens = initialState.tokens;
      });
  },
});

export const { clearError, updateProfile, disableBiometric } = authSlice.actions;
export default authSlice.reducer;