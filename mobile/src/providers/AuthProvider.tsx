import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import NetInfo from '@react-native-community/netinfo';

import { RootState } from '../store/store';
import { initializeAuth } from '../store/slices/authSlice';
import { setNetworkStatus } from '../store/slices/networkSlice';

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const dispatch = useDispatch();
  const { isLoading } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    // Initialize auth state on app start
    dispatch(initializeAuth() as any);

    // Set up network monitoring
    const unsubscribeNetInfo = NetInfo.addEventListener(state => {
      dispatch(setNetworkStatus({
        isConnected: state.isConnected || false,
        type: state.type,
        isInternetReachable: state.isInternetReachable || false,
      }));
    });

    return () => {
      unsubscribeNetInfo();
    };
  }, [dispatch]);

  return <>{children}</>;
}