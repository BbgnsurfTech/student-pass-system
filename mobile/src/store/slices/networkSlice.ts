import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface NetworkState {
  isConnected: boolean;
  type: string | null;
  isInternetReachable: boolean;
  lastConnected: number | null;
}

const initialState: NetworkState = {
  isConnected: true,
  type: null,
  isInternetReachable: true,
  lastConnected: null,
};

const networkSlice = createSlice({
  name: 'network',
  initialState,
  reducers: {
    setNetworkStatus: (state, action: PayloadAction<{
      isConnected: boolean;
      type: string;
      isInternetReachable: boolean;
    }>) => {
      const wasConnected = state.isConnected;
      
      state.isConnected = action.payload.isConnected;
      state.type = action.payload.type;
      state.isInternetReachable = action.payload.isInternetReachable;
      
      // Update last connected time when coming back online
      if (!wasConnected && action.payload.isConnected) {
        state.lastConnected = Date.now();
      }
    },
  },
});

export const { setNetworkStatus } = networkSlice.actions;
export default networkSlice.reducer;