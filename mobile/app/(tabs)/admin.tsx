import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Dimensions,
} from 'react-native';
import {
  Card,
  Button,
  Avatar,
  Chip,
  Surface,
  IconButton,
  Portal,
  Modal,
  FAB,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector, useDispatch } from 'react-redux';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolateColor,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';

import { theme } from '../../src/styles/theme';
import { RootState } from '../../src/store/store';
import { fetchDashboardData } from '../../src/store/slices/adminSlice';
import { DashboardStats } from '../../src/components/admin/DashboardStats';
import { PendingApplications } from '../../src/components/admin/PendingApplications';
import { QuickActions } from '../../src/components/admin/QuickActions';
import { RecentActivity } from '../../src/components/admin/RecentActivity';
import { SystemStatus } from '../../src/components/admin/SystemStatus';

const { width } = Dimensions.get('window');

export default function AdminScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('today');
  const [fabOpen, setFabOpen] = useState(false);

  const dispatch = useDispatch();
  const router = useRouter();
  const { user } = useSelector((state: RootState) => state.auth);
  const { 
    dashboardData, 
    isLoading,
    pendingApplications 
  } = useSelector((state: RootState) => state.admin);

  const fadeAnimation = useSharedValue(0);

  useEffect(() => {
    loadDashboardData();
    fadeAnimation.value = withSpring(1, { duration: 1000 });
  }, [selectedPeriod]);

  const loadDashboardData = async () => {
    try {
      await dispatch(fetchDashboardData({ period: selectedPeriod }) as any);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const fadeStyle = useAnimatedStyle(() => ({
    opacity: fadeAnimation.value,
  }));

  const handleApprove = async (applicationId: string) => {
    // Implement approval logic
    console.log('Approving application:', applicationId);
  };

  const handleReject = async (applicationId: string) => {
    // Implement rejection logic
    console.log('Rejecting application:', applicationId);
  };

  const fabActions = [
    {
      icon: 'plus',
      label: 'New Application',
      onPress: () => router.push('/new-application'),
    },
    {
      icon: 'account-plus',
      label: 'Add Student',
      onPress: () => router.push('/add-student'),
    },
    {
      icon: 'bell-plus',
      label: 'Send Notification',
      onPress: () => router.push('/send-notification'),
    },
    {
      icon: 'file-export',
      label: 'Export Report',
      onPress: () => router.push('/export-report'),
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Avatar.Image
              size={48}
              source={{ uri: user?.avatar || 'https://via.placeholder.com/48' }}
            />
            <View style={styles.headerText}>
              <Text style={styles.welcomeText}>Good morning,</Text>
              <Text style={styles.userName}>{user?.firstName} {user?.lastName}</Text>
              <Chip mode="outlined" compact style={styles.roleChip}>
                {user?.role === 'school_admin' ? 'School Admin' : 'System Admin'}
              </Chip>
            </View>
          </View>
          <IconButton
            icon="bell"
            size={24}
            onPress={() => router.push('/(tabs)/notifications')}
            style={styles.notificationButton}
          />
        </View>

        {/* Period Selector */}
        <View style={styles.periodSelector}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.periodContainer}
          >
            {['today', 'week', 'month', 'year'].map((period) => (
              <Chip
                key={period}
                mode={selectedPeriod === period ? 'flat' : 'outlined'}
                selected={selectedPeriod === period}
                onPress={() => setSelectedPeriod(period)}
                style={styles.periodChip}
              >
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </Chip>
            ))}
          </ScrollView>
        </View>

        <Animated.View style={fadeStyle}>
          {/* Dashboard Stats */}
          <DashboardStats 
            data={dashboardData} 
            period={selectedPeriod}
            isLoading={isLoading}
          />

          {/* System Status */}
          <SystemStatus />

          {/* Pending Applications */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Pending Applications</Text>
              <Button
                mode="text"
                compact
                onPress={() => router.push('/(tabs)/applications')}
              >
                View All
              </Button>
            </View>
            
            <PendingApplications
              applications={pendingApplications?.slice(0, 3) || []}
              onApprove={handleApprove}
              onReject={handleReject}
              onViewDetails={(id) => router.push(`/application-details?id=${id}`)}
            />
          </View>

          {/* Quick Actions */}
          <QuickActions 
            onAction={(action) => {
              switch (action) {
                case 'bulk-approve':
                  router.push('/bulk-approve');
                  break;
                case 'send-notification':
                  router.push('/send-notification');
                  break;
                case 'generate-report':
                  router.push('/generate-report');
                  break;
                case 'system-settings':
                  router.push('/system-settings');
                  break;
              }
            }}
          />

          {/* Recent Activity */}
          <RecentActivity />
        </Animated.View>
      </ScrollView>

      {/* Floating Action Button */}
      <FAB.Group
        open={fabOpen}
        visible
        icon={fabOpen ? 'close' : 'plus'}
        actions={fabActions}
        onStateChange={({ open }) => setFabOpen(open)}
        style={styles.fab}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100, // Space for FAB
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    paddingBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  headerText: {
    marginLeft: 12,
    flex: 1,
  },
  welcomeText: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
    marginTop: 2,
  },
  roleChip: {
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  notificationButton: {
    margin: 0,
  },
  periodSelector: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  periodContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  periodChip: {
    marginRight: 8,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
});