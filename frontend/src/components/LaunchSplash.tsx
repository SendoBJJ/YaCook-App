import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, useColorScheme, AccessibilityInfo, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { SvgXml } from 'react-native-svg';
import { Colors } from '../constants/Colors';

// SVG Logo inline
const logoSvg = `<svg width="200" height="200" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
  <g id="logo">
    <path d="M60 100 L60 130 C60 135 65 140 70 140 L130 140 C135 140 140 135 140 130 L140 100 Z" fill="#2FA45A"/>
    <path d="M70 100 C70 85 75 75 85 72 C85 62 92 55 100 55 C108 55 115 62 115 72 C125 75 130 85 130 100 Z" fill="#2FA45A"/>
    <rect x="60" y="95" width="80" height="10" fill="#1E7A3D" rx="2"/>
    <path d="M75 110 L75 125" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" opacity="0.3"/>
    <path d="M85 110 L85 128" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" opacity="0.3"/>
    <path d="M100 110 L100 130" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" opacity="0.3"/>
    <path d="M115 110 L115 128" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" opacity="0.3"/>
    <path d="M125 110 L125 125" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" opacity="0.3"/>
    <g transform="translate(35, 120)">
      <rect x="0" y="0" width="3" height="35" fill="#2FA45A" rx="1.5"/>
      <rect x="-5" y="0" width="2" height="15" fill="#2FA45A" rx="1"/>
      <rect x="6" y="0" width="2" height="15" fill="#2FA45A" rx="1"/>
    </g>
    <g transform="translate(162, 120)">
      <rect x="0" y="0" width="3" height="35" fill="#2FA45A" rx="1.5"/>
      <ellipse cx="1.5" cy="-5" rx="6" ry="8" fill="#2FA45A"/>
    </g>
    <text x="100" y="175" font-family="Arial, sans-serif" font-size="28" font-weight="bold" fill="#2FA45A" text-anchor="middle" letter-spacing="1">
      YaCook
    </text>
  </g>
</svg>`;

interface LaunchSplashProps {
  onFinish: () => void;
}

export const LaunchSplash: React.FC<LaunchSplashProps> = ({ onFinish }) => {
  const colorScheme = useColorScheme();
  const [isReduceMotionEnabled, setIsReduceMotionEnabled] = useState(false);
  
  // Animation values
  const textOpacity = useSharedValue(0);
  const textScale = useSharedValue(0.92);
  const textTranslateY = useSharedValue(12);
  
  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.95);
  const logoTranslateY = useSharedValue(16);
  
  const overlayOpacity = useSharedValue(1);
  
  // Check for Reduce Motion
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      setIsReduceMotionEnabled(enabled || false);
    });
  }, []);
  
  // Run animation
  useEffect(() => {
    if (isReduceMotionEnabled) {
      // Static display for ~600ms, then finish
      textOpacity.value = 1;
      textScale.value = 1;
      textTranslateY.value = 0;
      logoOpacity.value = 1;
      logoScale.value = 1;
      logoTranslateY.value = 0;
      
      setTimeout(() => {
        overlayOpacity.value = withTiming(0, { duration: 300 }, () => {
          runOnJS(onFinish)();
        });
      }, 600);
    } else {
      // Full animation sequence
      // Phase 1: Fade in text and logo (200ms - 1200ms = 1000ms animation)
      setTimeout(() => {
        // Text animation
        textOpacity.value = withTiming(1, {
          duration: 500,
          easing: Easing.inOut(Easing.quad),
        });
        textScale.value = withTiming(1, {
          duration: 600,
          easing: Easing.out(Easing.cubic),
        });
        textTranslateY.value = withTiming(0, {
          duration: 600,
          easing: Easing.out(Easing.cubic),
        });
        
        // Logo animation (slightly delayed)
        setTimeout(() => {
          logoOpacity.value = withTiming(1, {
            duration: 500,
            easing: Easing.inOut(Easing.quad),
          });
          logoScale.value = withTiming(1, {
            duration: 600,
            easing: Easing.out(Easing.cubic),
          });
          logoTranslateY.value = withTiming(0, {
            duration: 600,
            easing: Easing.out(Easing.cubic),
          });
        }, 100);
      }, 200);
      
      // Phase 2: Fade out (1200ms - 1600ms = 400ms fade out)
      setTimeout(() => {
        overlayOpacity.value = withTiming(
          0,
          { duration: 400, easing: Easing.inOut(Easing.quad) },
          () => {
            runOnJS(onFinish)();
          }
        );
      }, 1200);
    }
  }, [isReduceMotionEnabled]);
  
  // Animated styles
  const textAnimatedStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [
      { scale: textScale.value },
      { translateY: textTranslateY.value },
    ],
  }));
  
  const logoAnimatedStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [
      { scale: logoScale.value },
      { translateY: logoTranslateY.value },
    ],
  }));
  
  const overlayAnimatedStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));
  
  const isDark = colorScheme === 'dark';
  const backgroundColor = isDark ? '#0B0B0B' : '#FFFFFF';
  
  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        styles.overlay,
        { backgroundColor },
        overlayAnimatedStyle,
      ]}
      pointerEvents="none"
    >
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.content}>
          {/* Logo */}
          <Animated.View style={[styles.logoContainer, logoAnimatedStyle]}>
            <SvgXml xml={logoSvg} width={180} height={180} />
          </Animated.View>
          
          {/* Slogan Text */}
          <Animated.View style={[styles.textContainer, textAnimatedStyle]}>
            <Text style={[styles.sloganText, { color: Colors.light.primary }]}>
              y'a quoi ? y'a cook !!
            </Text>
          </Animated.View>
        </View>
      </SafeAreaView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    zIndex: 9999,
  },
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: 24,
  },
  textContainer: {
    paddingHorizontal: 32,
  },
  sloganText: {
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
});

// Helper function to run the splash animation
export const runLaunchSplash = (): Promise<void> => {
  return new Promise((resolve) => {
    // The component itself will call resolve via onFinish
    // This is used by the parent component
    setTimeout(resolve, 1800); // Fallback timeout
  });
};

export default LaunchSplash;
