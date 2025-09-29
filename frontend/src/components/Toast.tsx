import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { Spacing, BorderRadius, FontSize, FontWeight, Shadow } from '../constants/Layout';

export interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  visible: boolean;
  onHide: () => void;
}

export default class Toast extends React.Component<ToastProps> {
  private animatedValue: Animated.Value;

  constructor(props: ToastProps) {
    super(props);
    this.animatedValue = new Animated.Value(0);
  }

  componentDidUpdate(prevProps: ToastProps) {
    if (this.props.visible && !prevProps.visible) {
      this.show();
    } else if (!this.props.visible && prevProps.visible) {
      this.hide();
    }
  }

  show = () => {
    Animated.sequence([
      Animated.timing(this.animatedValue, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(3000),
      Animated.timing(this.animatedValue, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      this.props.onHide();
    });
  };

  hide = () => {
    Animated.timing(this.animatedValue, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      this.props.onHide();
    });
  };

  getToastStyle = () => {
    const { type } = this.props;
    switch (type) {
      case 'success':
        return { backgroundColor: Colors.light.success, iconName: 'checkmark-circle' };
      case 'error':
        return { backgroundColor: Colors.light.error, iconName: 'alert-circle' };
      case 'warning':
        return { backgroundColor: Colors.light.warning, iconName: 'warning' };
      case 'info':
      default:
        return { backgroundColor: Colors.light.primary, iconName: 'information-circle' };
    }
  };

  render() {
    if (!this.props.visible) return null;

    const { backgroundColor, iconName } = this.getToastStyle();
    
    const translateY = this.animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [-100, 0],
    });

    const opacity = this.animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    });

    return (
      <Animated.View
        style={[
          styles.container,
          { backgroundColor, transform: [{ translateY }], opacity }
        ]}
      >
        <Ionicons name={iconName as any} size={20} color={Colors.light.background} />
        <Text style={styles.message}>{this.props.message}</Text>
      </Animated.View>
    );
  }
}

// Hook for easier usage
import { useState } from 'react';

export const useToast = () => {
  const [toastState, setToastState] = useState({
    visible: false,
    message: '',
    type: 'info' as ToastProps['type'],
  });

  const showToast = (message: string, type: ToastProps['type'] = 'info') => {
    setToastState({ visible: true, message, type });
  };

  const hideToast = () => {
    setToastState(prev => ({ ...prev, visible: false }));
  };

  const ToastComponent = () => (
    <Toast
      visible={toastState.visible}
      message={toastState.message}
      type={toastState.type}
      onHide={hideToast}
    />
  );

  return {
    showToast,
    hideToast,
    ToastComponent,
  };
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: Spacing.lg,
    right: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    zIndex: 1000,
    ...Shadow.large,
  },
  message: {
    flex: 1,
    color: Colors.light.background,
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    marginLeft: Spacing.sm,
  },
});