import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '../constants/Colors';
import { BorderRadius, Spacing } from '../constants/Layout';

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
  animated?: boolean;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  width = '100%',
  height = 20,
  borderRadius = BorderRadius.sm,
  style,
  animated = true,
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animated) return;

    const startAnimation = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(animatedValue, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: false,
          }),
          Animated.timing(animatedValue, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: false,
          }),
        ])
      ).start();
    };

    startAnimation();
  }, [animatedValue, animated]);

  const backgroundColor = animated
    ? animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: [Colors.light.border, '#e0e0e0'],
      })
    : Colors.light.border;

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          backgroundColor,
        },
        style,
      ]}
    />
  );
};

// Pre-built skeleton components for common use cases
export const SkeletonText: React.FC<{ lines?: number; lastLineWidth?: string }> = ({
  lines = 1,
  lastLineWidth = '60%',
}) => (
  <View>
    {Array.from({ length: lines }).map((_, index) => (
      <SkeletonLoader
        key={index}
        width={index === lines - 1 ? lastLineWidth : '100%'}
        height={16}
        style={{ marginBottom: index < lines - 1 ? Spacing.xs : 0 }}
      />
    ))}
  </View>
);

export const SkeletonCard: React.FC = () => (
  <View style={styles.cardContainer}>
    <View style={styles.cardHeader}>
      <SkeletonLoader width={40} height={40} borderRadius={20} />
      <View style={styles.cardHeaderText}>
        <SkeletonLoader width="60%" height={16} />
        <SkeletonLoader width="40%" height={12} style={{ marginTop: Spacing.xs }} />
      </View>
    </View>
    <SkeletonText lines={3} />
    <SkeletonLoader width="100%" height={200} style={{ marginTop: Spacing.md }} />
  </View>
);

export const SkeletonConversationItem: React.FC = () => (
  <View style={styles.conversationContainer}>
    <SkeletonLoader width={50} height={50} borderRadius={25} />
    <View style={styles.conversationContent}>
      <View style={styles.conversationHeader}>
        <SkeletonLoader width="40%" height={16} />
        <SkeletonLoader width="20%" height={12} />
      </View>
      <SkeletonLoader width="80%" height={14} style={{ marginTop: Spacing.xs }} />
    </View>
  </View>
);

export const SkeletonMealCard: React.FC = () => (
  <View style={styles.mealCardContainer}>
    <SkeletonLoader width="100%" height={16} />
    <SkeletonLoader width="60%" height={12} style={{ marginTop: Spacing.xs }} />
    <View style={styles.mealMacros}>
      <SkeletonLoader width={60} height={12} />
      <SkeletonLoader width={60} height={12} />
      <SkeletonLoader width={60} height={12} />
    </View>
  </View>
);

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: Colors.light.border,
    overflow: 'hidden',
  },
  cardContainer: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.light.background,
    marginBottom: Spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  cardHeaderText: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  conversationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  conversationContent: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mealCardContainer: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.light.background,
    marginBottom: Spacing.sm,
  },
  mealMacros: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
  },
});