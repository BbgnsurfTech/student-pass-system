import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import {
  Card,
  Chip,
  IconButton,
  Surface,
  Avatar,
} from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolateColor,
} from 'react-native-reanimated';

import { theme } from '../../styles/theme';
import { Pass } from '../../types/pass';

const { width } = Dimensions.get('window');

interface PassCardProps {
  pass: Pass;
  onPress: () => void;
  onDetails: () => void;
}

export function PassCard({ pass, onPress, onDetails }: PassCardProps) {
  const pressAnimation = useSharedValue(0);

  const getPassTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      library: 'book-open',
      laboratory: 'flask',
      dormitory: 'home',
      cafeteria: 'food',
      gym: 'dumbbell',
      parking: 'car',
      event: 'calendar',
      temporary: 'clock-outline',
      all_access: 'key',
    };
    return icons[type] || 'card';
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: theme.colors.tertiary,
      expired: theme.colors.error,
      suspended: theme.colors.warning,
      pending: theme.colors.secondary,
    };
    return colors[status] || theme.colors.outline;
  };

  const getGradientColors = (type: string) => {
    const gradients: Record<string, string[]> = {
      library: ['#3B82F6', '#1E40AF'],
      laboratory: ['#10B981', '#059669'],
      dormitory: ['#F59E0B', '#D97706'],
      cafeteria: ['#EF4444', '#DC2626'],
      gym: ['#8B5CF6', '#7C3AED'],
      parking: ['#6B7280', '#4B5563'],
      event: ['#EC4899', '#DB2777'],
      temporary: ['#14B8A6', '#0D9488'],
      all_access: ['#F97316', '#EA580C'],
    };
    return gradients[type] || ['#3B82F6', '#1E40AF'];
  };

  const handlePressIn = () => {
    pressAnimation.value = withSpring(0.95, { duration: 150 });
  };

  const handlePressOut = () => {
    pressAnimation.value = withSpring(1, { duration: 150 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressAnimation.value }],
  }));

  const isExpiringSoon = () => {
    const expirationDate = new Date(pass.expirationDate);
    const now = new Date();
    const daysUntilExpiration = Math.floor(
      (expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysUntilExpiration <= 7 && daysUntilExpiration > 0;
  };

  const formatExpirationDate = () => {
    const date = new Date(pass.expirationDate);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <Card style={styles.card}>
          <LinearGradient
            colors={getGradientColors(pass.type)}
            style={styles.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <Surface style={styles.iconContainer} elevation={2}>
                  <IconButton
                    icon={getPassTypeIcon(pass.type)}
                    size={24}
                    iconColor="white"
                    style={styles.typeIcon}
                  />
                </Surface>
                <View style={styles.headerText}>
                  <Text style={styles.passType}>
                    {pass.type.replace('_', ' ').toUpperCase()}
                  </Text>
                  <Text style={styles.passId}>
                    #{pass.id.slice(-8)}
                  </Text>
                </View>
              </View>
              
              <View style={styles.headerRight}>
                <Chip
                  mode="flat"
                  textStyle={styles.statusText}
                  style={[
                    styles.statusChip,
                    { backgroundColor: getStatusColor(pass.status) },
                  ]}
                >
                  {pass.status.toUpperCase()}
                </Chip>
              </View>
            </View>

            {/* Student Info */}
            <View style={styles.studentInfo}>
              <Avatar.Image
                size={40}
                source={{ 
                  uri: pass.student?.avatar || 'https://via.placeholder.com/40' 
                }}
                style={styles.studentAvatar}
              />
              <View style={styles.studentDetails}>
                <Text style={styles.studentName}>
                  {pass.student?.firstName} {pass.student?.lastName}
                </Text>
                <Text style={styles.studentId}>
                  Student ID: {pass.student?.studentId}
                </Text>
              </View>
            </View>

            {/* Pass Details */}
            <View style={styles.details}>
              <View style={styles.detailRow}>
                <IconButton
                  icon="calendar"
                  size={16}
                  iconColor="rgba(255, 255, 255, 0.8)"
                  style={styles.detailIcon}
                />
                <Text style={styles.detailText}>
                  Expires: {formatExpirationDate()}
                </Text>
              </View>
              
              {isExpiringSoon() && (
                <View style={styles.warningRow}>
                  <IconButton
                    icon="alert"
                    size={16}
                    iconColor={theme.colors.warning}
                    style={styles.detailIcon}
                  />
                  <Text style={styles.warningText}>
                    Expires Soon
                  </Text>
                </View>
              )}
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <TouchableOpacity
                style={styles.detailsButton}
                onPress={onDetails}
              >
                <Text style={styles.detailsButtonText}>View Details</Text>
                <IconButton
                  icon="chevron-right"
                  size={16}
                  iconColor="white"
                  style={styles.chevronIcon}
                />
              </TouchableOpacity>
              
              <View style={styles.qrIndicator}>
                <IconButton
                  icon="qrcode"
                  size={20}
                  iconColor="white"
                  style={styles.qrIcon}
                />
                <Text style={styles.qrText}>Tap to show QR</Text>
              </View>
            </View>
          </LinearGradient>
        </Card>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  gradient: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  iconContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    marginRight: 12,
  },
  typeIcon: {
    margin: 0,
  },
  headerText: {
    flex: 1,
  },
  passType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 2,
  },
  passId: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'white',
  },
  studentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 12,
  },
  studentAvatar: {
    marginRight: 12,
  },
  studentDetails: {
    flex: 1,
  },
  studentName: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
    marginBottom: 2,
  },
  studentId: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  details: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailIcon: {
    margin: 0,
    marginRight: 4,
  },
  detailText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  warningText: {
    fontSize: 12,
    color: theme.colors.warning,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  detailsButtonText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '600',
    marginRight: 4,
  },
  chevronIcon: {
    margin: 0,
  },
  qrIndicator: {
    alignItems: 'center',
  },
  qrIcon: {
    margin: 0,
  },
  qrText: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: -4,
  },
});