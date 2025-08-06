import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiClient } from '../../services/api';

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  timestamp: string;
  isRead: boolean;
  type: 'general' | 'pass_update' | 'security_alert' | 'system' | 'reminder';
}

interface NotificationState {
  notifications: NotificationItem[];
  pushToken: string | null;
  permissions: {
    granted: boolean;
    canAskAgain: boolean;
  };
  isLoading: boolean;
  error: string | null;
  lastFetch: number | null;
}

const initialState: NotificationState = {
  notifications: [],
  pushToken: null,
  permissions: {
    granted: false,
    canAskAgain: true,
  },
  isLoading: false,
  error: null,
  lastFetch: null,
};

// Async thunks
export const fetchNotifications = createAsyncThunk(
  'notifications/fetch',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get('/notifications');
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue({
        message: error.response?.data?.message || 'Failed to fetch notifications',
      });
    }
  }
);

export const markNotificationAsRead = createAsyncThunk(
  'notifications/markAsRead',
  async (notificationId: string, { rejectWithValue }) => {
    try {
      await apiClient.patch(`/notifications/${notificationId}/read`);
      return notificationId;
    } catch (error: any) {
      return rejectWithValue({
        message: error.response?.data?.message || 'Failed to mark notification as read',
      });
    }
  }
);

export const markAllAsRead = createAsyncThunk(
  'notifications/markAllAsRead',
  async (_, { rejectWithValue }) => {
    try {
      await apiClient.patch('/notifications/mark-all-read');
      return true;
    } catch (error: any) {
      return rejectWithValue({
        message: error.response?.data?.message || 'Failed to mark all notifications as read',
      });
    }
  }
);

export const deleteNotification = createAsyncThunk(
  'notifications/delete',
  async (notificationId: string, { rejectWithValue }) => {
    try {
      await apiClient.delete(`/notifications/${notificationId}`);
      return notificationId;
    } catch (error: any) {
      return rejectWithValue({
        message: error.response?.data?.message || 'Failed to delete notification',
      });
    }
  }
);

export const updatePushToken = createAsyncThunk(
  'notifications/updatePushToken',
  async (token: string, { rejectWithValue }) => {
    try {
      await apiClient.patch('/notifications/push-token', { token });
      return token;
    } catch (error: any) {
      return rejectWithValue({
        message: error.response?.data?.message || 'Failed to update push token',
      });
    }
  }
);

export const sendTestNotification = createAsyncThunk(
  'notifications/sendTest',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/notifications/test');
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue({
        message: error.response?.data?.message || 'Failed to send test notification',
      });
    }
  }
);

// Slice
const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    addNotification: (state, action: PayloadAction<NotificationItem>) => {
      // Add to the beginning of the array (most recent first)
      state.notifications.unshift(action.payload);
      
      // Keep only the last 100 notifications to prevent memory issues
      if (state.notifications.length > 100) {
        state.notifications = state.notifications.slice(0, 100);
      }
    },
    markAsRead: (state, action: PayloadAction<string>) => {
      const notification = state.notifications.find(n => n.id === action.payload);
      if (notification) {
        notification.isRead = true;
      }
    },
    removeNotification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter(n => n.id !== action.payload);
    },
    setPushToken: (state, action: PayloadAction<string>) => {
      state.pushToken = action.payload;
    },
    requestPermissions: (state, action: PayloadAction<{
      granted: boolean;
      canAskAgain?: boolean;
    }>) => {
      state.permissions.granted = action.payload.granted;
      if (action.payload.canAskAgain !== undefined) {
        state.permissions.canAskAgain = action.payload.canAskAgain;
      }
    },
    clearError: (state) => {
      state.error = null;
    },
    clearNotifications: (state) => {
      state.notifications = [];
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch notifications
      .addCase(fetchNotifications.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.isLoading = false;
        state.notifications = action.payload;
        state.lastFetch = Date.now();
        state.error = null;
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload?.message || 'Failed to fetch notifications';
      })

      // Mark as read
      .addCase(markNotificationAsRead.fulfilled, (state, action) => {
        const notification = state.notifications.find(n => n.id === action.payload);
        if (notification) {
          notification.isRead = true;
        }
      })

      // Mark all as read
      .addCase(markAllAsRead.fulfilled, (state) => {
        state.notifications.forEach(notification => {
          notification.isRead = true;
        });
      })

      // Delete notification
      .addCase(deleteNotification.fulfilled, (state, action) => {
        state.notifications = state.notifications.filter(n => n.id !== action.payload);
      })

      // Update push token
      .addCase(updatePushToken.fulfilled, (state, action) => {
        state.pushToken = action.payload;
      })

      // Send test notification
      .addCase(sendTestNotification.fulfilled, (state, action) => {
        state.notifications.unshift(action.payload);
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
  addNotification,
  markAsRead,
  removeNotification,
  setPushToken,
  requestPermissions,
  clearError,
  clearNotifications,
} = notificationSlice.actions;

export default notificationSlice.reducer;