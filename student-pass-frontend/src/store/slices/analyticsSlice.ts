import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { 
  analyticsService, 
  KeyMetrics, 
  ApplicationAnalytics, 
  AccessAnalytics, 
  UserEngagement, 
  SystemStatus,
  RealTimeData 
} from '../../services/analyticsService';

export interface AnalyticsFilters {
  schoolId?: string;
  departmentId?: string;
  accessPointId?: string;
  dateRange?: string;
  startDate?: string;
  endDate?: string;
}

export interface AnalyticsState {
  // Data
  keyMetrics: KeyMetrics | null;
  applicationAnalytics: ApplicationAnalytics | null;
  accessAnalytics: AccessAnalytics | null;
  userEngagement: UserEngagement | null;
  systemStatus: SystemStatus | null;
  realTimeData: RealTimeData | null;
  
  // Filters
  filters: AnalyticsFilters;
  
  // UI State
  loading: {
    keyMetrics: boolean;
    applicationAnalytics: boolean;
    accessAnalytics: boolean;
    userEngagement: boolean;
    systemStatus: boolean;
    export: boolean;
  };
  
  error: {
    keyMetrics: string | null;
    applicationAnalytics: string | null;
    accessAnalytics: string | null;
    userEngagement: string | null;
    systemStatus: string | null;
    export: string | null;
  };
  
  // Real-time connection
  realTimeConnected: boolean;
  lastUpdated: string | null;
  
  // Dashboard settings
  dashboardSettings: {
    refreshInterval: number; // in seconds
    autoRefresh: boolean;
    selectedWidgets: string[];
    layout: any[];
  };
  
  // Alerts and notifications
  alerts: Array<{
    id: string;
    type: 'info' | 'warning' | 'error';
    title: string;
    message: string;
    timestamp: string;
    priority: 'low' | 'medium' | 'high';
    dismissed: boolean;
  }>;
  
  // Export status
  exportStatus: {
    inProgress: boolean;
    progress: number;
    url: string | null;
    error: string | null;
  };
}

const initialState: AnalyticsState = {
  keyMetrics: null,
  applicationAnalytics: null,
  accessAnalytics: null,
  userEngagement: null,
  systemStatus: null,
  realTimeData: null,
  
  filters: {
    dateRange: '30d'
  },
  
  loading: {
    keyMetrics: false,
    applicationAnalytics: false,
    accessAnalytics: false,
    userEngagement: false,
    systemStatus: false,
    export: false
  },
  
  error: {
    keyMetrics: null,
    applicationAnalytics: null,
    accessAnalytics: null,
    userEngagement: null,
    systemStatus: null,
    export: null
  },
  
  realTimeConnected: false,
  lastUpdated: null,
  
  dashboardSettings: {
    refreshInterval: 30,
    autoRefresh: true,
    selectedWidgets: [
      'key-metrics',
      'application-trends',
      'access-patterns',
      'real-time-status'
    ],
    layout: []
  },
  
  alerts: [],
  
  exportStatus: {
    inProgress: false,
    progress: 0,
    url: null,
    error: null
  }
};

// Async thunks
export const fetchKeyMetrics = createAsyncThunk(
  'analytics/fetchKeyMetrics',
  async (filters: AnalyticsFilters, { rejectWithValue }) => {
    try {
      return await analyticsService.getKeyMetrics(filters);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const fetchApplicationAnalytics = createAsyncThunk(
  'analytics/fetchApplicationAnalytics',
  async (filters: AnalyticsFilters, { rejectWithValue }) => {
    try {
      return await analyticsService.getApplicationAnalytics(filters);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const fetchAccessAnalytics = createAsyncThunk(
  'analytics/fetchAccessAnalytics',
  async (filters: AnalyticsFilters, { rejectWithValue }) => {
    try {
      return await analyticsService.getAccessAnalytics(filters);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const fetchUserEngagement = createAsyncThunk(
  'analytics/fetchUserEngagement',
  async (filters: AnalyticsFilters, { rejectWithValue }) => {
    try {
      return await analyticsService.getUserEngagement(filters);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const fetchSystemStatus = createAsyncThunk(
  'analytics/fetchSystemStatus',
  async (_, { rejectWithValue }) => {
    try {
      return await analyticsService.getSystemStatus();
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const exportReport = createAsyncThunk(
  'analytics/exportReport',
  async (
    filters: AnalyticsFilters & { 
      type?: 'comprehensive' | 'applications' | 'access' | 'users'; 
      format?: 'json' | 'csv' 
    }, 
    { rejectWithValue }
  ) => {
    try {
      return await analyticsService.exportReport(filters);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

// Fetch all analytics data
export const fetchAllAnalytics = createAsyncThunk(
  'analytics/fetchAll',
  async (filters: AnalyticsFilters, { dispatch }) => {
    const promises = [
      dispatch(fetchKeyMetrics(filters)),
      dispatch(fetchApplicationAnalytics(filters)),
      dispatch(fetchAccessAnalytics(filters)),
      dispatch(fetchUserEngagement(filters)),
      dispatch(fetchSystemStatus())
    ];
    
    await Promise.allSettled(promises);
  }
);

const analyticsSlice = createSlice({
  name: 'analytics',
  initialState,
  reducers: {
    // Filters
    setFilters: (state, action: PayloadAction<Partial<AnalyticsFilters>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    
    resetFilters: (state) => {
      state.filters = { dateRange: '30d' };
    },
    
    // Real-time updates
    setRealTimeConnected: (state, action: PayloadAction<boolean>) => {
      state.realTimeConnected = action.payload;
    },
    
    updateRealTimeData: (state, action: PayloadAction<RealTimeData>) => {
      state.realTimeData = action.payload;
      state.lastUpdated = new Date().toISOString();
      
      // Merge alerts from real-time data
      const newAlerts = action.payload.alerts.filter(alert => 
        !state.alerts.some(existing => existing.id === alert.id)
      );
      
      state.alerts = [
        ...state.alerts,
        ...newAlerts.map(alert => ({ ...alert, dismissed: false }))
      ];
    },
    
    // Alerts management
    dismissAlert: (state, action: PayloadAction<string>) => {
      const alert = state.alerts.find(a => a.id === action.payload);
      if (alert) {
        alert.dismissed = true;
      }
    },
    
    clearDismissedAlerts: (state) => {
      state.alerts = state.alerts.filter(alert => !alert.dismissed);
    },
    
    addAlert: (state, action: PayloadAction<Omit<AnalyticsState['alerts'][0], 'dismissed'>>) => {
      state.alerts.push({ ...action.payload, dismissed: false });
    },
    
    // Dashboard settings
    updateDashboardSettings: (state, action: PayloadAction<Partial<AnalyticsState['dashboardSettings']>>) => {
      state.dashboardSettings = { ...state.dashboardSettings, ...action.payload };
    },
    
    toggleWidget: (state, action: PayloadAction<string>) => {
      const widgetId = action.payload;
      const selectedWidgets = state.dashboardSettings.selectedWidgets;
      
      if (selectedWidgets.includes(widgetId)) {
        state.dashboardSettings.selectedWidgets = selectedWidgets.filter(id => id !== widgetId);
      } else {
        state.dashboardSettings.selectedWidgets.push(widgetId);
      }
    },
    
    updateLayout: (state, action: PayloadAction<any[]>) => {
      state.dashboardSettings.layout = action.payload;
    },
    
    // Export status
    setExportProgress: (state, action: PayloadAction<number>) => {
      state.exportStatus.progress = action.payload;
    },
    
    clearExportStatus: (state) => {
      state.exportStatus = {
        inProgress: false,
        progress: 0,
        url: null,
        error: null
      };
    },
    
    // Clear all data
    clearAnalyticsData: (state) => {
      state.keyMetrics = null;
      state.applicationAnalytics = null;
      state.accessAnalytics = null;
      state.userEngagement = null;
      state.systemStatus = null;
      state.realTimeData = null;
      state.lastUpdated = null;
    },
    
    // Error handling
    clearErrors: (state) => {
      state.error = {
        keyMetrics: null,
        applicationAnalytics: null,
        accessAnalytics: null,
        userEngagement: null,
        systemStatus: null,
        export: null
      };
    }
  },
  
  extraReducers: (builder) => {
    // Key Metrics
    builder
      .addCase(fetchKeyMetrics.pending, (state) => {
        state.loading.keyMetrics = true;
        state.error.keyMetrics = null;
      })
      .addCase(fetchKeyMetrics.fulfilled, (state, action) => {
        state.loading.keyMetrics = false;
        state.keyMetrics = action.payload;
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(fetchKeyMetrics.rejected, (state, action) => {
        state.loading.keyMetrics = false;
        state.error.keyMetrics = action.payload as string;
      });
    
    // Application Analytics
    builder
      .addCase(fetchApplicationAnalytics.pending, (state) => {
        state.loading.applicationAnalytics = true;
        state.error.applicationAnalytics = null;
      })
      .addCase(fetchApplicationAnalytics.fulfilled, (state, action) => {
        state.loading.applicationAnalytics = false;
        state.applicationAnalytics = action.payload;
      })
      .addCase(fetchApplicationAnalytics.rejected, (state, action) => {
        state.loading.applicationAnalytics = false;
        state.error.applicationAnalytics = action.payload as string;
      });
    
    // Access Analytics
    builder
      .addCase(fetchAccessAnalytics.pending, (state) => {
        state.loading.accessAnalytics = true;
        state.error.accessAnalytics = null;
      })
      .addCase(fetchAccessAnalytics.fulfilled, (state, action) => {
        state.loading.accessAnalytics = false;
        state.accessAnalytics = action.payload;
      })
      .addCase(fetchAccessAnalytics.rejected, (state, action) => {
        state.loading.accessAnalytics = false;
        state.error.accessAnalytics = action.payload as string;
      });
    
    // User Engagement
    builder
      .addCase(fetchUserEngagement.pending, (state) => {
        state.loading.userEngagement = true;
        state.error.userEngagement = null;
      })
      .addCase(fetchUserEngagement.fulfilled, (state, action) => {
        state.loading.userEngagement = false;
        state.userEngagement = action.payload;
      })
      .addCase(fetchUserEngagement.rejected, (state, action) => {
        state.loading.userEngagement = false;
        state.error.userEngagement = action.payload as string;
      });
    
    // System Status
    builder
      .addCase(fetchSystemStatus.pending, (state) => {
        state.loading.systemStatus = true;
        state.error.systemStatus = null;
      })
      .addCase(fetchSystemStatus.fulfilled, (state, action) => {
        state.loading.systemStatus = false;
        state.systemStatus = action.payload;
      })
      .addCase(fetchSystemStatus.rejected, (state, action) => {
        state.loading.systemStatus = false;
        state.error.systemStatus = action.payload as string;
      });
    
    // Export Report
    builder
      .addCase(exportReport.pending, (state) => {
        state.loading.export = true;
        state.error.export = null;
        state.exportStatus.inProgress = true;
        state.exportStatus.progress = 0;
      })
      .addCase(exportReport.fulfilled, (state, action) => {
        state.loading.export = false;
        state.exportStatus.inProgress = false;
        state.exportStatus.progress = 100;
        
        // If the response is a blob, create URL
        if (action.payload instanceof Blob) {
          state.exportStatus.url = URL.createObjectURL(action.payload);
        }
      })
      .addCase(exportReport.rejected, (state, action) => {
        state.loading.export = false;
        state.error.export = action.payload as string;
        state.exportStatus.inProgress = false;
        state.exportStatus.error = action.payload as string;
      });
  }
});

export const {
  setFilters,
  resetFilters,
  setRealTimeConnected,
  updateRealTimeData,
  dismissAlert,
  clearDismissedAlerts,
  addAlert,
  updateDashboardSettings,
  toggleWidget,
  updateLayout,
  setExportProgress,
  clearExportStatus,
  clearAnalyticsData,
  clearErrors
} = analyticsSlice.actions;

export default analyticsSlice.reducer;

// Selectors
export const selectAnalytics = (state: { analytics: AnalyticsState }) => state.analytics;
export const selectKeyMetrics = (state: { analytics: AnalyticsState }) => state.analytics.keyMetrics;
export const selectApplicationAnalytics = (state: { analytics: AnalyticsState }) => state.analytics.applicationAnalytics;
export const selectAccessAnalytics = (state: { analytics: AnalyticsState }) => state.analytics.accessAnalytics;
export const selectUserEngagement = (state: { analytics: AnalyticsState }) => state.analytics.userEngagement;
export const selectSystemStatus = (state: { analytics: AnalyticsState }) => state.analytics.systemStatus;
export const selectRealTimeData = (state: { analytics: AnalyticsState }) => state.analytics.realTimeData;
export const selectFilters = (state: { analytics: AnalyticsState }) => state.analytics.filters;
export const selectLoading = (state: { analytics: AnalyticsState }) => state.analytics.loading;
export const selectErrors = (state: { analytics: AnalyticsState }) => state.analytics.error;
export const selectAlerts = (state: { analytics: AnalyticsState }) => state.analytics.alerts;
export const selectActiveAlerts = (state: { analytics: AnalyticsState }) => 
  state.analytics.alerts.filter(alert => !alert.dismissed);
export const selectDashboardSettings = (state: { analytics: AnalyticsState }) => state.analytics.dashboardSettings;
export const selectExportStatus = (state: { analytics: AnalyticsState }) => state.analytics.exportStatus;
export const selectIsRealTimeConnected = (state: { analytics: AnalyticsState }) => state.analytics.realTimeConnected;