import React, { useEffect, useRef } from 'react';
import { Platform, AppState, AppStateStatus } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { useDispatch, useSelector } from 'react-redux';
import { useRouter } from 'expo-router';

import { RootState } from '../store/store';
import { 
  setPushToken, 
  addNotification, 
  markAsRead,
  requestPermissions,
} from '../store/slices/notificationSlice';
import { showMessage } from '../utils/message';

interface NotificationProviderProps {
  children: React.ReactNode;
}

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export function NotificationProvider({ children }: NotificationProviderProps) {
  const dispatch = useDispatch();
  const router = useRouter();
  const { user } = useSelector((state: RootState) => state.auth);
  const { pushToken } = useSelector((state: RootState) => state.notifications);
  
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    if (user && !pushToken) {
      registerForPushNotificationsAsync();
    }

    // Listen for incoming notifications
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
      
      // Add notification to store
      dispatch(addNotification({
        id: notification.request.identifier,
        title: notification.request.content.title || '',
        body: notification.request.content.body || '',
        data: notification.request.content.data || {},
        timestamp: new Date().toISOString(),
        isRead: false,
        type: notification.request.content.data?.type || 'general',
      }));

      // Show in-app notification if app is in foreground
      if (AppState.currentState === 'active') {
        showMessage(
          notification.request.content.title || 'New notification',
          'info'
        );
      }
    });

    // Listen for notification interactions
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response:', response);
      
      const data = response.notification.request.content.data;
      const notificationId = response.notification.request.identifier;
      
      // Mark as read
      dispatch(markAsRead(notificationId));
      
      // Handle navigation based on notification type
      handleNotificationNavigation(data);
    });

    // Handle app state changes
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // App has come to the foreground
        clearBadgeCount();
      }
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
      subscription?.remove();
    };
  }, [user, pushToken, dispatch]);

  const registerForPushNotificationsAsync = async () => {
    try {
      if (!Device.isDevice) {
        console.warn('Must use physical device for Push Notifications');
        return;
      }

      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.warn('Failed to get push token for push notification!');
        return;
      }

      // Get the token
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
      });
      
      console.log('Push token:', tokenData.data);
      
      // Store token in Redux
      dispatch(setPushToken(tokenData.data));
      
      // Update permissions status
      dispatch(requestPermissions({ granted: true }));

      // Configure notification channel for Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });

        // Create additional channels for different notification types
        await Notifications.setNotificationChannelAsync('alerts', {
          name: 'Security Alerts',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF0000',
          sound: 'default',
        });

        await Notifications.setNotificationChannelAsync('updates', {
          name: 'Pass Updates',
          importance: Notifications.AndroidImportance.DEFAULT,
          vibrationPattern: [0, 150],
          lightColor: '#0000FF',
        });
      }

    } catch (error) {
      console.error('Error registering for push notifications:', error);
      dispatch(requestPermissions({ granted: false }));
    }
  };

  const handleNotificationNavigation = (data: any) => {
    if (!data?.type) return;

    switch (data.type) {
      case 'pass_approved':
        router.push('/(tabs)/student');
        break;
      case 'pass_expired':
        router.push(`/pass-details?id=${data.passId}`);
        break;
      case 'security_alert':
        if (user?.role === 'security') {
          router.push('/(tabs)/alerts');
        }
        break;
      case 'application_pending':
        if (user?.role === 'admin') {
          router.push('/(tabs)/applications');
        }
        break;
      default:
        router.push('/(tabs)/notifications');
        break;
    }
  };

  const clearBadgeCount = async () => {
    try {
      await Notifications.setBadgeCountAsync(0);
    } catch (error) {
      console.error('Error clearing badge count:', error);
    }
  };

  return <>{children}</>;
}