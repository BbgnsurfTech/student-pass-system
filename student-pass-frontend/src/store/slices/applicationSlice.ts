import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export interface Application {
  id: string;
  studentId: string;
  passType: 'TEMPORARY' | 'PERMANENT' | 'VISITOR';
  purpose: string;
  validFrom: string;
  validTo: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  documents: string[];
  reviewedBy?: string;
  reviewedAt?: string;
  reviewComments?: string;
  createdAt: string;
  updatedAt: string;
}

interface ApplicationState {
  applications: Application[];
  currentApplication: Application | null;
  isLoading: boolean;
  error: string | null;
  filters: {
    status?: string;
    passType?: string;
    dateRange?: {
      start: string;
      end: string;
    };
  };
}

const initialState: ApplicationState = {
  applications: [],
  currentApplication: null,
  isLoading: false,
  error: null,
  filters: {},
};

const applicationSlice = createSlice({
  name: 'applications',
  initialState,
  reducers: {
    setApplications: (state, action: PayloadAction<Application[]>) => {
      state.applications = action.payload;
    },
    addApplication: (state, action: PayloadAction<Application>) => {
      state.applications.unshift(action.payload);
    },
    updateApplication: (state, action: PayloadAction<Application>) => {
      const index = state.applications.findIndex(app => app.id === action.payload.id);
      if (index !== -1) {
        state.applications[index] = action.payload;
      }
    },
    setCurrentApplication: (state, action: PayloadAction<Application | null>) => {
      state.currentApplication = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setFilters: (state, action: PayloadAction<Partial<ApplicationState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = {};
    },
  },
});

export const {
  setApplications,
  addApplication,
  updateApplication,
  setCurrentApplication,
  setLoading,
  setError,
  setFilters,
  clearFilters,
} = applicationSlice.actions;

export default applicationSlice.reducer;