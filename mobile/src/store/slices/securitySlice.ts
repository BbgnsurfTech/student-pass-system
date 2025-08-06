import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiClient } from '../../services/api';

export interface AccessLogEntry {
  id: string;
  passId: string;
  studentId: string;
  studentName: string;
  studentPhoto?: string;
  location: string;
  action: 'granted' | 'denied';
  timestamp: string;
  securityOfficer: string;
  reason?: string;
  deviceId: string;
}

export interface VerificationResult {
  allowed: boolean;
  reason?: string;
  student: {
    id: string;
    name: string;
    photo?: string;
    studentId: string;
    department: string;
  } | null;
  pass: {
    id: string;
    type: string;
    expiresAt: string;
    permissions: string[];
  } | null;
  warnings?: string[];
}

export interface SecurityAlert {
  id: string;
  type: 'suspicious_activity' | 'unauthorized_access' | 'system_error' | 'emergency';
  title: string;
  description: string;
  location: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  resolved: boolean;
  assignedTo?: string;
}

interface SecurityState {
  accessLogs: AccessLogEntry[];
  alerts: SecurityAlert[];
  verificationResult: VerificationResult | null;
  isVerifying: boolean;
  isLoading: boolean;
  error: string | null;
  stats: {
    todayScans: number;
    todayGranted: number;
    todayDenied: number;
    activeAlerts: number;
  };
  currentLocation: string;
  deviceId: string;
}

const initialState: SecurityState = {
  accessLogs: [],
  alerts: [],
  verificationResult: null,
  isVerifying: false,
  isLoading: false,
  error: null,
  stats: {
    todayScans: 0,
    todayGranted: 0,
    todayDenied: 0,
    activeAlerts: 0,
  },
  currentLocation: '',
  deviceId: '',
};

// Async thunks
export const verifyPass = createAsyncThunk(
  'security/verifyPass',
  async (params: {
    passId: string;
    studentId: string;
    type: string;
    expiresAt: string;
    location: string;
  }, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/security/verify-pass', params);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue({
        message: error.response?.data?.message || 'Failed to verify pass',
      });
    }
  }
);

export const logAccess = createAsyncThunk(
  'security/logAccess',
  async (params: {
    passId: string;
    studentId: string;
    action: 'granted' | 'denied';
    location: string;
    timestamp: string;
    reason?: string;
  }, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/security/log-access', params);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue({
        message: error.response?.data?.message || 'Failed to log access',
      });
    }
  }
);

export const fetchAccessLogs = createAsyncThunk(
  'security/fetchAccessLogs',
  async (filters: {
    location?: string;
    date?: string;
    limit?: number;
  }, { rejectWithValue }) => {
    try {
      const response = await apiClient.get('/security/access-logs', { params: filters });
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue({
        message: error.response?.data?.message || 'Failed to fetch access logs',
      });
    }
  }
);

export const fetchSecurityAlerts = createAsyncThunk(
  'security/fetchAlerts',
  async (filters: {
    resolved?: boolean;
    severity?: string;
    location?: string;
  }, { rejectWithValue }) => {
    try {
      const response = await apiClient.get('/security/alerts', { params: filters });
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue({
        message: error.response?.data?.message || 'Failed to fetch alerts',
      });
    }
  }
);

export const createSecurityAlert = createAsyncThunk(
  'security/createAlert',
  async (alert: {
    type: string;
    title: string;
    description: string;
    location: string;
    severity: string;
  }, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/security/alerts', alert);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue({
        message: error.response?.data?.message || 'Failed to create alert',
      });
    }
  }
);

export const resolveSecurityAlert = createAsyncThunk(
  'security/resolveAlert',
  async (alertId: string, { rejectWithValue }) => {
    try {
      const response = await apiClient.patch(`/security/alerts/${alertId}/resolve`);
      return { id: alertId, ...response.data.data };
    } catch (error: any) {
      return rejectWithValue({
        message: error.response?.data?.message || 'Failed to resolve alert',
      });
    }
  }
);

export const fetchSecurityStats = createAsyncThunk(
  'security/fetchStats',
  async (params: {
    location: string;
    period: 'today' | 'week' | 'month';
  }, { rejectWithValue }) => {
    try {
      const response = await apiClient.get('/security/stats', { params });
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue({
        message: error.response?.data?.message || 'Failed to fetch stats',
      });
    }
  }
);

export const reportIncident = createAsyncThunk(
  'security/reportIncident',
  async (incident: {
    type: string;
    description: string;
    location: string;
    studentId?: string;
    photos?: string[];
  }, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/security/incidents', incident);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue({
        message: error.response?.data?.message || 'Failed to report incident',
      });
    }
  }
);

export const manualOverride = createAsyncThunk(
  'security/manualOverride',
  async (params: {
    studentId: string;
    reason: string;
    location: string;
    duration: number; // minutes
  }, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/security/manual-override', params);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue({
        message: error.response?.data?.message || 'Failed to process manual override',
      });
    }
  }
);

// Slice
const securitySlice = createSlice({
  name: 'security',
  initialState,
  reducers: {
    setCurrentLocation: (state, action: PayloadAction<string>) => {
      state.currentLocation = action.payload;
    },
    setDeviceId: (state, action: PayloadAction<string>) => {
      state.deviceId = action.payload;
    },
    clearVerificationResult: (state) => {
      state.verificationResult = null;
    },
    addAccessLog: (state, action: PayloadAction<AccessLogEntry>) => {
      state.accessLogs.unshift(action.payload);
      
      // Update stats
      state.stats.todayScans += 1;
      if (action.payload.action === 'granted') {
        state.stats.todayGranted += 1;
      } else {
        state.stats.todayDenied += 1;
      }
      
      // Keep only last 50 logs in memory
      if (state.accessLogs.length > 50) {
        state.accessLogs = state.accessLogs.slice(0, 50);
      }
    },
    addAlert: (state, action: PayloadAction<SecurityAlert>) => {
      state.alerts.unshift(action.payload);
      
      if (!action.payload.resolved) {
        state.stats.activeAlerts += 1;
      }
    },
    updateAlertStatus: (state, action: PayloadAction<{ id: string; resolved: boolean }>) => {
      const alert = state.alerts.find(a => a.id === action.payload.id);
      if (alert) {
        alert.resolved = action.payload.resolved;
        
        if (action.payload.resolved) {
          state.stats.activeAlerts = Math.max(0, state.stats.activeAlerts - 1);
        } else {
          state.stats.activeAlerts += 1;
        }
      }
    },
    clearError: (state) => {
      state.error = null;
    },
    resetStats: (state) => {
      state.stats = {
        todayScans: 0,
        todayGranted: 0,
        todayDenied: 0,
        activeAlerts: state.stats.activeAlerts, // Keep active alerts count
      };
    },
  },
  extraReducers: (builder) => {
    builder
      // Verify pass
      .addCase(verifyPass.pending, (state) => {
        state.isVerifying = true;
        state.error = null;
      })
      .addCase(verifyPass.fulfilled, (state, action) => {
        state.isVerifying = false;
        state.verificationResult = action.payload;
        state.error = null;
      })
      .addCase(verifyPass.rejected, (state, action) => {
        state.isVerifying = false;
        state.error = action.payload?.message || 'Failed to verify pass';
      })

      // Log access
      .addCase(logAccess.fulfilled, (state, action) => {
        state.accessLogs.unshift(action.payload);
        
        // Update stats
        state.stats.todayScans += 1;
        if (action.payload.action === 'granted') {
          state.stats.todayGranted += 1;
        } else {
          state.stats.todayDenied += 1;
        }
      })

      // Fetch access logs
      .addCase(fetchAccessLogs.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchAccessLogs.fulfilled, (state, action) => {
        state.isLoading = false;
        state.accessLogs = action.payload;
        state.error = null;
      })
      .addCase(fetchAccessLogs.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload?.message || 'Failed to fetch access logs';
      })

      // Fetch alerts
      .addCase(fetchSecurityAlerts.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchSecurityAlerts.fulfilled, (state, action) => {
        state.isLoading = false;
        state.alerts = action.payload;
        state.stats.activeAlerts = action.payload.filter((alert: SecurityAlert) => !alert.resolved).length;
        state.error = null;
      })
      .addCase(fetchSecurityAlerts.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload?.message || 'Failed to fetch alerts';
      })

      // Create alert
      .addCase(createSecurityAlert.fulfilled, (state, action) => {
        state.alerts.unshift(action.payload);
        state.stats.activeAlerts += 1;
      })

      // Resolve alert
      .addCase(resolveSecurityAlert.fulfilled, (state, action) => {
        const alert = state.alerts.find(a => a.id === action.payload.id);
        if (alert) {
          alert.resolved = true;
          state.stats.activeAlerts = Math.max(0, state.stats.activeAlerts - 1);
        }
      })

      // Fetch stats
      .addCase(fetchSecurityStats.fulfilled, (state, action) => {
        state.stats = { ...state.stats, ...action.payload };
      })

      // Handle errors for all async actions
      .addMatcher(
        (action) => action.type.endsWith('/rejected'),
        (state, action) => {
          state.isLoading = false;
          state.isVerifying = false;
          state.error = action.payload?.message || 'An error occurred';
        }
      );
  },
});

export const {
  setCurrentLocation,
  setDeviceId,
  clearVerificationResult,
  addAccessLog,
  addAlert,
  updateAlertStatus,
  clearError,
  resetStats,
} = securitySlice.actions;

export default securitySlice.reducer;