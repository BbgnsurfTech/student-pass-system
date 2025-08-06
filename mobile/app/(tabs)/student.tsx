import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  RefreshControl,
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
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector, useDispatch } from 'react-redux';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  interpolateColor,
} from 'react-native-reanimated';
import QRCode from 'react-native-qrcode-svg';
import * as Brightness from 'expo-brightness';
import { useRouter } from 'expo-router';

import { theme } from '../../src/styles/theme';
import { RootState } from '../../src/store/store';
import { fetchStudentPasses } from '../../src/store/slices/passSlice';
import { showMessage } from '../../src/utils/message';
import { PassCard } from '../../src/components/student/PassCard';
import { QuickActions } from '../../src/components/student/QuickActions';
import { NearbyFacilities } from '../../src/components/student/NearbyFacilities';

const { width } = Dimensions.get('window');

export default function StudentScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [qrVisible, setQrVisible] = useState(false);
  const [selectedPass, setSelectedPass] = useState(null);

  const dispatch = useDispatch();
  const router = useRouter();
  const { user } = useSelector((state: RootState) => state.auth);
  const { passes, isLoading } = useSelector((state: RootState) => state.passes);

  const shimmerAnimation = useSharedValue(0);
  const pulseAnimation = useSharedValue(0);

  useEffect(() => {
    loadPasses();
    startAnimations();
  }, []);

  const startAnimations = () => {
    shimmerAnimation.value = withRepeat(
      withSequence(
        withSpring(1, { duration: 1500 }),
        withSpring(0, { duration: 1500 })
      ),
      -1,
      true
    );

    pulseAnimation.value = withRepeat(
      withSequence(
        withSpring(1.05, { duration: 1000 }),
        withSpring(1, { duration: 1000 })
      ),
      -1,
      true
    );
  };

  const loadPasses = async () => {
    try {
      await dispatch(fetchStudentPasses() as any);
    } catch (error) {
      showMessage('Failed to load passes', 'error');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPasses();
    setRefreshing(false);
  };

  const showQRCode = async (pass: any) => {
    setSelectedPass(pass);
    setQrVisible(true);
    
    // Increase screen brightness for better QR code scanning
    try {
      await Brightness.setBrightnessAsync(1.0);
    } catch (error) {
      console.log('Could not set brightness:', error);
    }
  };

  const hideQRCode = async () => {
    setQrVisible(false);
    setSelectedPass(null);
    
    // Restore original brightness
    try {
      await Brightness.restoreSystemBrightnessAsync();
    } catch (error) {
      console.log('Could not restore brightness:', error);
    }
  };

  const shimmerStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      shimmerAnimation.value,
      [0, 1],
      ['rgba(255, 255, 255, 0.3)', 'rgba(255, 255, 255, 0.1)']
    ),
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseAnimation.value }],
  }));

  const activePasses = passes.filter(pass => pass.status === 'active');
  const pendingPasses = passes.filter(pass => pass.status === 'pending');

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
          <View style={styles.welcomeSection}>
            <Avatar.Image
              size={48}
              source={{ uri: user?.avatar || 'https://via.placeholder.com/48' }}
              style={styles.avatar}
            />
            <View style={styles.welcomeText}>
              <Text style={styles.welcomeTitle}>Welcome back,</Text>
              <Text style={styles.userName}>{user?.firstName} {user?.lastName}</Text>
            </View>
          </View>
          <IconButton
            icon="bell"
            size={24}
            onPress={() => router.push('/(tabs)/notifications')}
            style={styles.notificationButton}
          />
        </View>

        {/* Active Passes */}
        {activePasses.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Active Passes</Text>
            {activePasses.map((pass, index) => (
              <Animated.View key={pass.id} style={index === 0 ? pulseStyle : {}}>
                <PassCard
                  pass={pass}
                  onPress={() => showQRCode(pass)}
                  onDetails={() => router.push(`/pass-details?id=${pass.id}`)}
                />
              </Animated.View>
            ))}
          </View>
        )}

        {/* Pending Applications */}
        {pendingPasses.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pending Applications</Text>
            {pendingPasses.map(pass => (
              <Card key={pass.id} style={styles.pendingCard}>
                <Card.Content>
                  <View style={styles.pendingContent}>
                    <View style={styles.pendingInfo}>
                      <Text style={styles.pendingTitle}>{pass.type}</Text>
                      <Text style={styles.pendingSubtitle}>
                        Applied on {new Date(pass.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                    <Chip mode="outlined" style={styles.pendingChip}>
                      Pending
                    </Chip>
                  </View>
                </Card.Content>
              </Card>
            ))}
          </View>
        )}

        {/* Quick Actions */}
        <QuickActions onNewApplication={() => router.push('/(tabs)/applications')} />

        {/* Nearby Facilities */}
        <NearbyFacilities />

        {/* Empty State */}
        {passes.length === 0 && !isLoading && (
          <View style={styles.emptyState}>
            <Surface style={styles.emptyCard} elevation={2}>
              <Text style={styles.emptyIcon}>🎓</Text>
              <Text style={styles.emptyTitle}>No passes yet</Text>
              <Text style={styles.emptySubtitle}>
                Apply for your first campus pass to get started
              </Text>
              <Button
                mode="contained"
                onPress={() => router.push('/(tabs)/applications')}
                style={styles.emptyButton}
              >
                Apply Now
              </Button>
            </Surface>
          </View>
        )}
      </ScrollView>

      {/* QR Code Modal */}
      <Portal>
        <Modal
          visible={qrVisible}
          onDismiss={hideQRCode}
          contentContainerStyle={styles.qrModal}
        >
          <LinearGradient
            colors={[theme.colors.primary, theme.colors.primaryContainer]}
            style={styles.qrContainer}
          >
            <View style={styles.qrHeader}>
              <Text style={styles.qrTitle}>Digital Pass</Text>
              <IconButton
                icon="close"
                iconColor="white"
                onPress={hideQRCode}
              />
            </View>
            
            {selectedPass && (
              <>
                <Surface style={styles.qrCodeContainer} elevation={4}>
                  <QRCode
                    value={JSON.stringify({
                      passId: selectedPass.id,
                      studentId: user?.id,
                      type: selectedPass.type,
                      expiresAt: selectedPass.expiresAt,
                    })}
                    size={200}
                    backgroundColor="white"
                    color="black"
                  />
                </Surface>
                
                <View style={styles.qrInfo}>
                  <Text style={styles.qrPassType}>{selectedPass.type}</Text>
                  <Text style={styles.qrPassId}>Pass ID: {selectedPass.id.slice(-8)}</Text>
                  <Text style={styles.qrExpiry}>
                    Valid until: {new Date(selectedPass.expiresAt).toLocaleDateString()}
                  </Text>
                </View>
                
                <Text style={styles.qrInstructions}>
                  Show this QR code to security personnel for access
                </Text>
              </>
            )}
          </LinearGradient>
        </Modal>
      </Portal>
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
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 16,
  },
  welcomeSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    marginRight: 12,
  },
  welcomeText: {
    flex: 1,
  },
  welcomeTitle: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
  },
  notificationButton: {
    margin: 0,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
    marginBottom: 12,
  },
  pendingCard: {
    marginBottom: 8,
    borderRadius: 12,
  },
  pendingContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pendingInfo: {
    flex: 1,
  },
  pendingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.onSurface,
  },
  pendingSubtitle: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    marginTop: 2,
  },
  pendingChip: {
    backgroundColor: theme.colors.warningContainer,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 60,
  },
  emptyCard: {
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    width: '100%',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyButton: {
    paddingHorizontal: 24,
  },
  qrModal: {
    margin: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  qrContainer: {
    padding: 24,
    alignItems: 'center',
  },
  qrHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 24,
  },
  qrTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  qrCodeContainer: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  qrInfo: {
    alignItems: 'center',
    marginBottom: 24,
  },
  qrPassType: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  qrPassId: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
  },
  qrExpiry: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  qrInstructions: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 16,
  },
});