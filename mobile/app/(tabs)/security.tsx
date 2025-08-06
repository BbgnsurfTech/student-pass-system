import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Vibration,
  Alert,
} from 'react-native';
import {
  Button,
  Card,
  Chip,
  Surface,
  IconButton,
  Portal,
  Modal,
  Avatar,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, Camera } from 'expo-camera';
import { useSelector, useDispatch } from 'react-redux';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { theme } from '../../src/styles/theme';
import { RootState } from '../../src/store/store';
import { verifyPass, logAccess } from '../../src/store/slices/securitySlice';
import { showMessage } from '../../src/utils/message';
import { ScanResult } from '../../src/components/security/ScanResult';
import { AccessStats } from '../../src/components/security/AccessStats';
import { EmergencyActions } from '../../src/components/security/EmergencyActions';

const { width, height } = Dimensions.get('window');

export default function SecurityScreen() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [scanStats, setScanStats] = useState({
    today: 0,
    thisHour: 0,
    denied: 0,
  });

  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  const { isVerifying } = useSelector((state: RootState) => state.security);

  const scanAnimation = useSharedValue(0);
  const pulseAnimation = useSharedValue(0);
  const cameraRef = useRef<any>(null);

  useEffect(() => {
    getCameraPermissions();
    startScanAnimation();
    loadScanStats();
  }, []);

  const getCameraPermissions = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(status === 'granted');
  };

  const startScanAnimation = () => {
    scanAnimation.value = withRepeat(
      withSequence(
        withSpring(1, { duration: 1500 }),
        withSpring(0, { duration: 1500 })
      ),
      -1,
      true
    );

    pulseAnimation.value = withRepeat(
      withSequence(
        withSpring(1.1, { duration: 800 }),
        withSpring(1, { duration: 800 })
      ),
      -1,
      true
    );
  };

  const loadScanStats = () => {
    // Load scan statistics from the store or API
    setScanStats({
      today: 142,
      thisHour: 23,
      denied: 3,
    });
  };

  const handleBarCodeScanned = async ({ type, data }: any) => {
    if (scanned) return;

    setScanned(true);
    
    // Haptic feedback
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Vibration.vibrate(100);

    try {
      const qrData = JSON.parse(data);
      
      // Verify the pass
      const result = await dispatch(verifyPass({
        passId: qrData.passId,
        studentId: qrData.studentId,
        type: qrData.type,
        expiresAt: qrData.expiresAt,
        location: user?.location || 'Main Entrance',
      }) as any);

      setScanResult(result.payload);
      setModalVisible(true);

      // Log the access attempt
      await dispatch(logAccess({
        passId: qrData.passId,
        studentId: qrData.studentId,
        action: result.payload.allowed ? 'granted' : 'denied',
        location: user?.location || 'Main Entrance',
        timestamp: new Date().toISOString(),
      }) as any);

      // Update stats
      setScanStats(prev => ({
        ...prev,
        today: prev.today + 1,
        thisHour: prev.thisHour + 1,
        denied: result.payload.allowed ? prev.denied : prev.denied + 1,
      }));

    } catch (error) {
      showMessage('Invalid QR code format', 'error');
      setScanResult({
        allowed: false,
        reason: 'Invalid QR code format',
        student: null,
        pass: null,
      });
      setModalVisible(true);
    }

    // Reset scan after delay
    setTimeout(() => {
      setScanned(false);
    }, 3000);
  };

  const resetScan = () => {
    setScanned(false);
    setModalVisible(false);
    setScanResult(null);
  };

  const toggleFlash = () => {
    setIsFlashOn(!isFlashOn);
  };

  const scanAnimatedStyle = useSharedValue(0);

  const scanLineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scanAnimation.value * 200 }],
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseAnimation.value }],
  }));

  if (hasPermission === null) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>Requesting camera permission...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (hasPermission === false) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionTitle}>Camera Access Required</Text>
          <Text style={styles.permissionText}>
            Please grant camera access to scan QR codes
          </Text>
          <Button mode="contained" onPress={getCameraPermissions}>
            Grant Permission
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Avatar.Image
            size={40}
            source={{ uri: user?.avatar || 'https://via.placeholder.com/40' }}
          />
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Security Scanner</Text>
            <Text style={styles.headerSubtitle}>{user?.location || 'Main Entrance'}</Text>
          </View>
        </View>
        <Animated.View style={pulseStyle}>
          <IconButton
            icon="shield-check"
            size={24}
            iconColor={theme.colors.primary}
            style={styles.shieldIcon}
          />
        </Animated.View>
      </View>

      {/* Stats */}
      <AccessStats stats={scanStats} />

      {/* Camera Scanner */}
      <View style={styles.cameraContainer}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing="back"
          flash={isFlashOn ? 'on' : 'off'}
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ['qr', 'pdf417'],
          }}
        >
          <View style={styles.scannerOverlay}>
            <View style={styles.scannerFrame}>
              <Animated.View style={[styles.scanLine, scanLineStyle]} />
            </View>
            
            {scanned && (
              <View style={styles.scannedOverlay}>
                <Text style={styles.scannedText}>Processing...</Text>
              </View>
            )}
          </View>
        </CameraView>

        {/* Camera Controls */}
        <View style={styles.cameraControls}>
          <IconButton
            icon={isFlashOn ? 'flash' : 'flash-off'}
            size={24}
            iconColor="white"
            onPress={toggleFlash}
            style={styles.flashButton}
          />
          <IconButton
            icon="refresh"
            size={24}
            iconColor="white"
            onPress={resetScan}
            style={styles.refreshButton}
          />
        </View>
      </View>

      {/* Instructions */}
      <Surface style={styles.instructionsContainer} elevation={2}>
        <Text style={styles.instructionsTitle}>Scan Instructions</Text>
        <Text style={styles.instructionsText}>
          • Position QR code within the frame{'\n'}
          • Ensure good lighting for best results{'\n'}
          • Hold device steady until scan completes
        </Text>
      </Surface>

      {/* Emergency Actions */}
      <EmergencyActions />

      {/* Scan Result Modal */}
      <Portal>
        <Modal
          visible={modalVisible}
          onDismiss={resetScan}
          contentContainerStyle={styles.modal}
        >
          {scanResult && (
            <ScanResult
              result={scanResult}
              onClose={resetScan}
              onAllowManual={() => {
                // Handle manual override
                Alert.alert(
                  'Manual Override',
                  'Are you sure you want to manually allow access?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Allow', style: 'destructive', onPress: resetScan },
                  ]
                );
              }}
            />
          )}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
  },
  headerSubtitle: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
  },
  shieldIcon: {
    backgroundColor: theme.colors.primaryContainer,
  },
  cameraContainer: {
    flex: 1,
    margin: 20,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  scannerOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  scannerFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    borderRadius: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  scanLine: {
    width: '100%',
    height: 2,
    backgroundColor: theme.colors.primary,
    position: 'absolute',
    top: 0,
  },
  scannedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannedText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  cameraControls: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    flexDirection: 'column',
    gap: 8,
  },
  flashButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  refreshButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  instructionsContainer: {
    margin: 20,
    marginTop: 10,
    padding: 16,
    borderRadius: 12,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
    marginBottom: 8,
  },
  instructionsText: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    lineHeight: 20,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
    marginBottom: 16,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  modal: {
    margin: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
});