import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export interface Pass {
  id: string;
  applicationId: string;
  studentId: string;
  passType: 'TEMPORARY' | 'PERMANENT' | 'VISITOR';
  qrCode: string;
  isActive: boolean;
  validFrom: string;
  validTo: string;
  permissions: string[];
  usageCount: number;
  lastUsed?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AccessLog {
  id: string;
  passId: string;
  studentId: string;
  accessPoint: string;
  accessType: 'ENTRY' | 'EXIT';
  timestamp: string;
  status: 'GRANTED' | 'DENIED';
  reason?: string;
}

interface PassState {
  passes: Pass[];
  activePasses: Pass[];
  accessLogs: AccessLog[];
  currentPass: Pass | null;
  isLoading: boolean;
  error: string | null;
  scanResult: {
    isValid: boolean;
    message: string;
    passData?: Pass;
  } | null;
}

const initialState: PassState = {
  passes: [],
  activePasses: [],
  accessLogs: [],
  currentPass: null,
  isLoading: false,
  error: null,
  scanResult: null,
};

const passSlice = createSlice({
  name: 'passes',
  initialState,
  reducers: {
    setPasses: (state, action: PayloadAction<Pass[]>) => {
      state.passes = action.payload;
      state.activePasses = action.payload.filter(pass => pass.isActive);
    },
    addPass: (state, action: PayloadAction<Pass>) => {
      state.passes.unshift(action.payload);
      if (action.payload.isActive) {
        state.activePasses.unshift(action.payload);
      }
    },
    updatePass: (state, action: PayloadAction<Pass>) => {
      const index = state.passes.findIndex(pass => pass.id === action.payload.id);
      if (index !== -1) {
        state.passes[index] = action.payload;
      }
      
      const activeIndex = state.activePasses.findIndex(pass => pass.id === action.payload.id);
      if (action.payload.isActive) {
        if (activeIndex !== -1) {
          state.activePasses[activeIndex] = action.payload;
        } else {
          state.activePasses.push(action.payload);
        }
      } else if (activeIndex !== -1) {
        state.activePasses.splice(activeIndex, 1);
      }
    },
    setCurrentPass: (state, action: PayloadAction<Pass | null>) => {
      state.currentPass = action.payload;
    },
    setAccessLogs: (state, action: PayloadAction<AccessLog[]>) => {
      state.accessLogs = action.payload;
    },
    addAccessLog: (state, action: PayloadAction<AccessLog>) => {
      state.accessLogs.unshift(action.payload);
    },
    setScanResult: (state, action: PayloadAction<PassState['scanResult']>) => {
      state.scanResult = action.payload;
    },
    clearScanResult: (state) => {
      state.scanResult = null;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const {
  setPasses,
  addPass,
  updatePass,
  setCurrentPass,
  setAccessLogs,
  addAccessLog,
  setScanResult,
  clearScanResult,
  setLoading,
  setError,
} = passSlice.actions;

export default passSlice.reducer;