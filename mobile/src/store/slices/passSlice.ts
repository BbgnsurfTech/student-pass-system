import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiClient } from '../../services/api';
import { Pass, PassApplication } from '../../types/pass';

interface PassState {
  passes: Pass[];
  currentPass: Pass | null;
  isLoading: boolean;
  error: string | null;
  lastSyncTime: number | null;
}

const initialState: PassState = {
  passes: [],
  currentPass: null,
  isLoading: false,
  error: null,
  lastSyncTime: null,
};

// Async thunks
export const fetchStudentPasses = createAsyncThunk(
  'passes/fetchStudent',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get('/passes/student');
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue({
        message: error.response?.data?.message || 'Failed to fetch passes',
      });
    }
  }
);

export const fetchPassDetails = createAsyncThunk(
  'passes/fetchDetails',
  async (passId: string, { rejectWithValue }) => {
    try {
      const response = await apiClient.get(`/passes/${passId}`);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue({
        message: error.response?.data?.message || 'Failed to fetch pass details',
      });
    }
  }
);

export const applyForPass = createAsyncThunk(
  'passes/apply',
  async (application: PassApplication, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      
      // Add text fields
      Object.entries(application).forEach(([key, value]) => {
        if (key !== 'documents' && value !== undefined) {
          formData.append(key, value.toString());
        }
      });

      // Add documents
      if (application.documents) {
        application.documents.forEach((doc, index) => {
          formData.append(`documents[${index}]`, {
            uri: doc.uri,
            type: doc.type,
            name: doc.name,
          } as any);
        });
      }

      const response = await apiClient.post('/passes/apply', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data.data;
    } catch (error: any) {
      return rejectWithValue({
        message: error.response?.data?.message || 'Failed to submit application',
      });
    }
  }
);

export const renewPass = createAsyncThunk(
  'passes/renew',
  async (passId: string, { rejectWithValue }) => {
    try {
      const response = await apiClient.post(`/passes/${passId}/renew`);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue({
        message: error.response?.data?.message || 'Failed to renew pass',
      });
    }
  }
);

export const cancelPass = createAsyncThunk(
  'passes/cancel',
  async ({ passId, reason }: { passId: string; reason: string }, { rejectWithValue }) => {
    try {
      const response = await apiClient.post(`/passes/${passId}/cancel`, { reason });
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue({
        message: error.response?.data?.message || 'Failed to cancel pass',
      });
    }
  }
);

export const downloadPass = createAsyncThunk(
  'passes/download',
  async (passId: string, { rejectWithValue }) => {
    try {
      const response = await apiClient.get(`/passes/${passId}/download`, {
        responseType: 'blob',
      });
      return response.data;
    } catch (error: any) {
      return rejectWithValue({
        message: error.response?.data?.message || 'Failed to download pass',
      });
    }
  }
);

export const reportPassIssue = createAsyncThunk(
  'passes/reportIssue',
  async ({ passId, issue, description }: { 
    passId: string; 
    issue: string; 
    description: string; 
  }, { rejectWithValue }) => {
    try {
      const response = await apiClient.post(`/passes/${passId}/report-issue`, {
        issue,
        description,
      });
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue({
        message: error.response?.data?.message || 'Failed to report issue',
      });
    }
  }
);

export const syncPasses = createAsyncThunk(
  'passes/sync',
  async (_, { rejectWithValue, getState }) => {
    try {
      const state = getState() as any;
      const lastSyncTime = state.passes.lastSyncTime;
      
      const response = await apiClient.get('/passes/sync', {
        params: lastSyncTime ? { since: lastSyncTime } : undefined,
      });

      return {
        passes: response.data.data,
        syncTime: Date.now(),
      };
    } catch (error: any) {
      return rejectWithValue({
        message: error.response?.data?.message || 'Failed to sync passes',
      });
    }
  }
);

// Slice
const passSlice = createSlice({
  name: 'passes',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCurrentPass: (state, action: PayloadAction<Pass | null>) => {
      state.currentPass = action.payload;
    },
    updatePassStatus: (state, action: PayloadAction<{ id: string; status: string }>) => {
      const pass = state.passes.find(p => p.id === action.payload.id);
      if (pass) {
        pass.status = action.payload.status;
      }
      if (state.currentPass?.id === action.payload.id) {
        state.currentPass.status = action.payload.status;
      }
    },
    addPass: (state, action: PayloadAction<Pass>) => {
      state.passes.push(action.payload);
    },
    updatePass: (state, action: PayloadAction<Pass>) => {
      const index = state.passes.findIndex(p => p.id === action.payload.id);
      if (index !== -1) {
        state.passes[index] = action.payload;
      }
      if (state.currentPass?.id === action.payload.id) {
        state.currentPass = action.payload;
      }
    },
    removePass: (state, action: PayloadAction<string>) => {
      state.passes = state.passes.filter(p => p.id !== action.payload);
      if (state.currentPass?.id === action.payload) {
        state.currentPass = null;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch student passes
      .addCase(fetchStudentPasses.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchStudentPasses.fulfilled, (state, action) => {
        state.isLoading = false;
        state.passes = action.payload;
        state.lastSyncTime = Date.now();
        state.error = null;
      })
      .addCase(fetchStudentPasses.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload?.message || 'Failed to fetch passes';
      })

      // Fetch pass details
      .addCase(fetchPassDetails.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchPassDetails.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentPass = action.payload;
        
        // Update pass in the list if it exists
        const index = state.passes.findIndex(p => p.id === action.payload.id);
        if (index !== -1) {
          state.passes[index] = action.payload;
        }
        
        state.error = null;
      })
      .addCase(fetchPassDetails.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload?.message || 'Failed to fetch pass details';
      })

      // Apply for pass
      .addCase(applyForPass.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(applyForPass.fulfilled, (state, action) => {
        state.isLoading = false;
        state.passes.push(action.payload);
        state.error = null;
      })
      .addCase(applyForPass.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload?.message || 'Failed to submit application';
      })

      // Renew pass
      .addCase(renewPass.fulfilled, (state, action) => {
        const index = state.passes.findIndex(p => p.id === action.payload.id);
        if (index !== -1) {
          state.passes[index] = action.payload;
        }
        if (state.currentPass?.id === action.payload.id) {
          state.currentPass = action.payload;
        }
      })

      // Cancel pass
      .addCase(cancelPass.fulfilled, (state, action) => {
        const index = state.passes.findIndex(p => p.id === action.payload.id);
        if (index !== -1) {
          state.passes[index] = action.payload;
        }
        if (state.currentPass?.id === action.payload.id) {
          state.currentPass = action.payload;
        }
      })

      // Sync passes
      .addCase(syncPasses.fulfilled, (state, action) => {
        state.passes = action.payload.passes;
        state.lastSyncTime = action.payload.syncTime;
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
  clearError,
  setCurrentPass,
  updatePassStatus,
  addPass,
  updatePass,
  removePass,
} = passSlice.actions;

export default passSlice.reducer;