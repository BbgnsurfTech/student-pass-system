import { useEffect } from 'react';
import { Redirect } from 'expo-router';
import { useSelector } from 'react-redux';
import * as SplashScreen from 'expo-splash-screen';

import { RootState } from '../src/store/store';
import { LoadingScreen } from '../src/components/common/LoadingScreen';

export default function Index() {
  const { isAuthenticated, isLoading, user } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync();
    }
  }, [isLoading]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/welcome" />;
  }

  // Redirect based on user role
  switch (user?.role) {
    case 'student':
      return <Redirect href="/(tabs)/student" />;
    case 'admin':
    case 'school_admin':
      return <Redirect href="/(tabs)/admin" />;
    case 'security':
      return <Redirect href="/(tabs)/security" />;
    default:
      return <Redirect href="/(tabs)/student" />;
  }
}