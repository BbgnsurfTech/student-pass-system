import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Image,
} from 'react-native';
import { Button } from 'react-native-paper';
import { Link } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
} from 'react-native-reanimated';
import { useEffect } from 'react';

import { theme } from '../../src/styles/theme';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen() {
  const floatingAnimation = useSharedValue(0);
  const fadeAnimation = useSharedValue(0);

  useEffect(() => {
    floatingAnimation.value = withRepeat(
      withSequence(
        withSpring(10, { duration: 2000 }),
        withSpring(0, { duration: 2000 })
      ),
      -1,
      true
    );

    fadeAnimation.value = withSpring(1, { duration: 1000 });
  }, []);

  const floatingStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatingAnimation.value }],
  }));

  const fadeStyle = useAnimatedStyle(() => ({
    opacity: fadeAnimation.value,
  }));

  return (
    <LinearGradient
      colors={[theme.colors.primary, theme.colors.primaryContainer]}
      style={styles.container}
    >
      <Animated.View style={[styles.content, fadeStyle]}>
        <Animated.View style={[styles.logoContainer, floatingStyle]}>
          <Image
            source={require('../../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>

        <View style={styles.textContainer}>
          <Text style={styles.title}>Student Pass System</Text>
          <Text style={styles.subtitle}>
            Your digital campus pass for seamless access to university facilities
          </Text>
        </View>

        <View style={styles.featuresContainer}>
          <View style={styles.feature}>
            <Text style={styles.featureIcon}>📱</Text>
            <Text style={styles.featureText}>Digital Pass Wallet</Text>
          </View>
          <View style={styles.feature}>
            <Text style={styles.featureIcon}>🔐</Text>
            <Text style={styles.featureText}>Secure Biometric Access</Text>
          </View>
          <View style={styles.feature}>
            <Text style={styles.featureIcon}>📍</Text>
            <Text style={styles.featureText}>Location-Based Services</Text>
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <Link href="/(auth)/login" asChild>
            <Button
              mode="contained"
              style={styles.primaryButton}
              contentStyle={styles.buttonContent}
              labelStyle={styles.primaryButtonText}
            >
              Sign In
            </Button>
          </Link>

          <Link href="/(auth)/register" asChild>
            <Button
              mode="outlined"
              style={styles.secondaryButton}
              contentStyle={styles.buttonContent}
              labelStyle={styles.secondaryButtonText}
            >
              Create Account
            </Button>
          </Link>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Secure • Fast • Reliable
          </Text>
        </View>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: height * 0.1,
    paddingBottom: 40,
  },
  logoContainer: {
    alignItems: 'center',
  },
  logo: {
    width: 120,
    height: 120,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 16,
  },
  featuresContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 48,
  },
  feature: {
    alignItems: 'center',
    flex: 1,
  },
  featureIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  featureText: {
    color: 'white',
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
  buttonContainer: {
    width: '100%',
    gap: 16,
  },
  primaryButton: {
    backgroundColor: 'white',
    borderRadius: 12,
  },
  secondaryButton: {
    borderColor: 'white',
    borderWidth: 2,
    borderRadius: 12,
  },
  buttonContent: {
    paddingVertical: 12,
  },
  primaryButtonText: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontWeight: '500',
  },
});