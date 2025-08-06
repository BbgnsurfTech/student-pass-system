import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { ActivityIndicator, Text, Surface } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withSpring,
  interpolate,
} from 'react-native-reanimated';
import { useEffect } from 'react';

import { theme } from '../../styles/theme';

const { width, height } = Dimensions.get('window');

interface LoadingScreenProps {
  message?: string;
  showLogo?: boolean;
}

export function LoadingScreen({ 
  message = 'Loading...', 
  showLogo = true 
}: LoadingScreenProps) {
  const pulseAnimation = useSharedValue(0);
  const fadeAnimation = useSharedValue(0);

  useEffect(() => {
    pulseAnimation.value = withRepeat(
      withSequence(
        withSpring(1, { duration: 1000 }),
        withSpring(0, { duration: 1000 })
      ),
      -1,
      true
    );

    fadeAnimation.value = withSpring(1, { duration: 800 });
  }, []);

  const pulseStyle = useAnimatedStyle(() => {
    const scale = interpolate(pulseAnimation.value, [0, 1], [0.8, 1.2]);
    const opacity = interpolate(pulseAnimation.value, [0, 1], [0.3, 1]);
    
    return {
      transform: [{ scale }],
      opacity,
    };
  });

  const fadeStyle = useAnimatedStyle(() => ({
    opacity: fadeAnimation.value,
  }));

  return (
    <LinearGradient
      colors={[theme.colors.primary, theme.colors.primaryContainer]}
      style={styles.container}
    >
      <Animated.View style={[styles.content, fadeStyle]}>
        {showLogo && (
          <Animated.View style={[styles.logoContainer, pulseStyle]}>
            <Surface style={styles.logoSurface} elevation={4}>
              <Text style={styles.logoText}>🎓</Text>
            </Surface>
          </Animated.View>
        )}

        <View style={styles.loadingContainer}>
          <ActivityIndicator 
            animating 
            size="large" 
            color="white"
            style={styles.spinner}
          />
          
          <Text style={styles.loadingText}>{message}</Text>
          
          <View style={styles.dotsContainer}>
            <Animated.View style={[styles.dot, pulseStyle]} />
            <Animated.View style={[styles.dot, pulseStyle]} />
            <Animated.View style={[styles.dot, pulseStyle]} />
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.appName}>Student Pass System</Text>
          <Text style={styles.version}>Version 1.0.0</Text>
        </View>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  logoContainer: {
    marginBottom: 48,
  },
  logoSurface: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  logoText: {
    fontSize: 36,
  },
  loadingContainer: {
    alignItems: 'center',
    marginBottom: 80,
  },
  spinner: {
    marginBottom: 24,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    marginBottom: 20,
    textAlign: 'center',
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
  },
  footer: {
    position: 'absolute',
    bottom: 60,
    alignItems: 'center',
  },
  appName: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 4,
  },
  version: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
});