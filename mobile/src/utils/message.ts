import { Alert, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

export type MessageType = 'success' | 'error' | 'warning' | 'info';

interface ShowMessageOptions {
  title?: string;
  duration?: number;
  haptic?: boolean;
}

export function showMessage(
  message: string, 
  type: MessageType = 'info', 
  options: ShowMessageOptions = {}
) {
  const {
    title,
    duration = 3000,
    haptic = true,
  } = options;

  // Provide haptic feedback
  if (haptic && Platform.OS === 'ios') {
    switch (type) {
      case 'success':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case 'error':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        break;
      case 'warning':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        break;
      default:
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
    }
  }

  // Show native alert
  const getTitle = () => {
    if (title) return title;
    
    switch (type) {
      case 'success':
        return 'Success';
      case 'error':
        return 'Error';
      case 'warning':
        return 'Warning';
      default:
        return 'Information';
    }
  };

  Alert.alert(getTitle(), message);
}

export function showConfirmDialog(
  title: string,
  message: string,
  onConfirm: () => void,
  onCancel?: () => void,
  confirmText = 'Confirm',
  cancelText = 'Cancel'
) {
  Alert.alert(
    title,
    message,
    [
      {
        text: cancelText,
        style: 'cancel',
        onPress: onCancel,
      },
      {
        text: confirmText,
        style: 'default',
        onPress: onConfirm,
      },
    ]
  );
}

export function showDestructiveDialog(
  title: string,
  message: string,
  onConfirm: () => void,
  onCancel?: () => void,
  confirmText = 'Delete',
  cancelText = 'Cancel'
) {
  Alert.alert(
    title,
    message,
    [
      {
        text: cancelText,
        style: 'cancel',
        onPress: onCancel,
      },
      {
        text: confirmText,
        style: 'destructive',
        onPress: onConfirm,
      },
    ]
  );
}