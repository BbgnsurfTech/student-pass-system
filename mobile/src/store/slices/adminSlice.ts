import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiClient } from '../../services/api';

export interface DashboardData {
  totalApplications: number;
  pendingApplications: number;
  approvedApplications: number;
  rejectedApplications: number;
  activeUsers: number;
  systemHealth: {
    status: 'healthy' | 'warning' | 'critical';
    uptime: number;
    responseTime: number;
  };
  recentActivity: ActivityItem[];
  statisticsByPeriod: {
    applications: number[];
    approvals: number[];
    rejections: number[];
  };
}

export interface ActivityItem {
  id: string;
  type: 'application' | 'approval' | 'rejection' | 'system';
  description: string;
  timestamp: string;
  userId?: string;
  userName?: string;
}

export interface PendingApplication {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  type: string;
  reason: string;
  submittedAt: string;
  documents: string[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
  estimatedProcessingTime: number;
}

interface AdminState {
  dashboardData: DashboardData | null;
  pendingApplications: PendingApplication[];
  selectedApplication: PendingApplication | null;
  isLoading: boolean;
  error: string | null;
  filters: {
    period: 'today' | 'week' | 'month' | 'year';
    type: string | null;
    status: string | null;
  };
}

const initialState: AdminState = {
  dashboardData: null,
  pendingApplications: [],
  selectedApplication: null,
  isLoading: false,
  error: null,
  filters: {
    period: 'today',
    type: null,
    status: null,
  },
};

// Async thunks
export const fetchDashboardData = createAsyncThunk(
  'admin/fetchDashboard',
  async (params: { period: string }, { rejectWithValue }) => {
    try {
      const response = await apiClient.get('/admin/dashboard', { params });
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue({
        message: error.response?.data?.message || 'Failed to fetch dashboard data',
      });
    }
  }
);

export const fetchPendingApplications = createAsyncThunk(
  'admin/fetchPendingApplications',
  async (filters: any, { rejectWithValue }) => {
    try {
      const response = await apiClient.get('/admin/applications/pending', { 
        params: filters 
      });
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue({
        message: error.response?.data?.message || 'Failed to fetch applications',
      });
    }
  }
);

export const approveApplication = createAsyncThunk(
  'admin/approveApplication',
  async ({ id, comment, duration }: { 
    id: string; 
    comment?: string; 
    duration?: number;
  }, { rejectWithValue }) => {
    try {
      const response = await apiClient.post(`/admin/applications/${id}/approve`, {
        comment,
        duration,
      });
      return { id, ...response.data.data };
    } catch (error: any) {
      return rejectWithValue({
        message: error.response?.data?.message || 'Failed to approve application',
      });
    }
  }
);

export const rejectApplication = createAsyncThunk(
  'admin/rejectApplication',
  async ({ id, reason }: { id: string; reason: string }, { rejectWithValue }) => {
    try {
      const response = await apiClient.post(`/admin/applications/${id}/reject`, {
        reason,
      });
      return { id, ...response.data.data };
    } catch (error: any) {
      return rejectWithValue({
        message: error.response?.data?.message || 'Failed to reject application',
      });
    }
  }
);

export const bulkApproveApplications = createAsyncThunk(
  'admin/bulkApprove',
  async ({ ids, comment }: { ids: string[]; comment?: string }, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/admin/applications/bulk-approve', {
        applicationIds: ids,
        comment,
      });
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue({
        message: error.response?.data?.message || 'Failed to bulk approve applications',
      });
    }
  }
);

export const sendNotificationToStudents = createAsyncThunk(
  'admin/sendNotification',
  async ({ 
    studentIds, 
    title, 
    message, 
    type 
  }: { 
    studentIds: string[]; 
    title: string; 
    message: string; 
    type: string;
  }, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/admin/notifications/send', {
        studentIds,
        title,
        message,
        type,
      });
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue({
        message: error.response?.data?.message || 'Failed to send notifications',
      });
    }
  }
);

export const generateReport = createAsyncThunk(
  'admin/generateReport',
  async ({ 
    type, 
    period, 
    filters 
  }: { 
    type: string; 
    period: string; 
    filters: any;
  }, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/admin/reports/generate', {
        type,
        period,
        filters,
      });
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue({
        message: error.response?.data?.message || 'Failed to generate report',
      });
    }
  }
);

// Slice
const adminSlice = createSlice({
  name: 'admin',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<Partial<typeof initialState.filters>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    setSelectedApplication: (state, action: PayloadAction<PendingApplication | null>) => {
      state.selectedApplication = action.payload;
    },
    updateApplicationStatus: (state, action: PayloadAction<{ 
      id: string; 
      status: string; 
    }>) => {
      const application = state.pendingApplications.find(app => app.id === action.payload.id);
      if (application) {
        // Remove from pending if approved/rejected
        if (['approved', 'rejected'].includes(action.payload.status)) {
          state.pendingApplications = state.pendingApplications.filter(
            app => app.id !== action.payload.id
          );
        }
      }
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch dashboard data
      .addCase(fetchDashboardData.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchDashboardData.fulfilled, (state, action) => {
        state.isLoading = false;
        state.dashboardData = action.payload;
        state.error = null;
      })
      .addCase(fetchDashboardData.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload?.message || 'Failed to fetch dashboard data';
      })

      // Fetch pending applications
      .addCase(fetchPendingApplications.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchPendingApplications.fulfilled, (state, action) => {
        state.isLoading = false;
        state.pendingApplications = action.payload;
        state.error = null;
      })
      .addCase(fetchPendingApplications.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload?.message || 'Failed to fetch applications';
      })

      // Approve application
      .addCase(approveApplication.fulfilled, (state, action) => {
        state.pendingApplications = state.pendingApplications.filter(
          app => app.id !== action.payload.id
        );
        if (state.selectedApplication?.id === action.payload.id) {
          state.selectedApplication = null;
        }
      })

      // Reject application
      .addCase(rejectApplication.fulfilled, (state, action) => {
        state.pendingApplications = state.pendingApplications.filter(
          app => app.id !== action.payload.id
        );
        if (state.selectedApplication?.id === action.payload.id) {
          state.selectedApplication = null;
        }
      })

      // Bulk approve
      .addCase(bulkApproveApplications.fulfilled, (state, action) => {
        const approvedIds = action.payload.map((app: any) => app.id);
        state.pendingApplications = state.pendingApplications.filter(
          app => !approvedIds.includes(app.id)
        );
      })

      // Handle errors for all async actions
      .addMatcher(
        (action) => action.type.endsWith('/rejected'),
        (state, action) => {
          state.isLoading = false;
          state.error = action.payload?.message || 'An error occurred';
        }
      );
  },
});

export const {
  setFilters,
  setSelectedApplication,
  updateApplicationStatus,
  clearError,
} = adminSlice.actions;

export default adminSlice.reducer;