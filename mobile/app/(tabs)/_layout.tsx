import { Tabs } from 'expo-router';
import { useSelector } from 'react-redux';
import { Platform } from 'react-native';
import { IconButton } from 'react-native-paper';

import { RootState } from '../../src/store/store';
import { theme } from '../../src/styles/theme';

export default function TabLayout() {
  const { user } = useSelector((state: RootState) => state.auth);

  const getTabsForRole = () => {
    switch (user?.role) {
      case 'student':
        return [
          {
            name: 'student',
            title: 'My Pass',
            icon: 'card-account-details',
          },
          {
            name: 'applications',
            title: 'Applications',
            icon: 'file-document-multiple',
          },
          {
            name: 'notifications',
            title: 'Notifications',
            icon: 'bell',
          },
          {
            name: 'profile',
            title: 'Profile',
            icon: 'account-circle',
          },
        ];

      case 'admin':
      case 'school_admin':
        return [
          {
            name: 'admin',
            title: 'Dashboard',
            icon: 'view-dashboard',
          },
          {
            name: 'applications',
            title: 'Applications',
            icon: 'file-document-multiple',
          },
          {
            name: 'analytics',
            title: 'Analytics',
            icon: 'chart-line',
          },
          {
            name: 'profile',
            title: 'Profile',
            icon: 'account-circle',
          },
        ];

      case 'security':
        return [
          {
            name: 'security',
            title: 'Scanner',
            icon: 'qrcode-scan',
          },
          {
            name: 'logs',
            title: 'Access Logs',
            icon: 'history',
          },
          {
            name: 'alerts',
            title: 'Alerts',
            icon: 'alert',
          },
          {
            name: 'profile',
            title: 'Profile',
            icon: 'account-circle',
          },
        ];

      default:
        return [
          {
            name: 'student',
            title: 'My Pass',
            icon: 'card-account-details',
          },
        ];
    }
  };

  const tabs = getTabsForRole();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.outline,
          borderTopWidth: 0.5,
          paddingTop: Platform.OS === 'ios' ? 0 : 8,
          paddingBottom: Platform.OS === 'ios' ? 20 : 8,
          height: Platform.OS === 'ios' ? 90 : 70,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
          marginTop: 4,
        },
        headerShown: false,
      }}
    >
      {tabs.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ color, size, focused }) => (
              <IconButton
                icon={tab.icon}
                size={focused ? size + 2 : size}
                iconColor={color}
                style={{ margin: 0 }}
              />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}