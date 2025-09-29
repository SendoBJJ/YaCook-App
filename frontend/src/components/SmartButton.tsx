import React, { useState } from 'react';
import { TouchableOpacity, Text, View, ActivityIndicator, Platform } from 'react-native';
import { Colors } from '../constants/Colors';

interface SmartButtonProps {
  onPress: () => Promise<void> | void;
  children: React.ReactNode;
  style?: any;
  textStyle?: any;
  disabled?: boolean;
  loading?: boolean;
  role?: string;
  accessibilityLabel?: string;
}

export const SmartButton: React.FC<SmartButtonProps> = ({
  onPress,
  children,
  style,
  textStyle,
  disabled = false,
  loading = false,
  role = "button",
  accessibilityLabel,
  ...props
}) => {
  const [isPressed, setIsPressed] = useState(false);
  const [inFlight, setInFlight] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const handlePress = async () => {
    if (disabled || loading || inFlight) return;

    try {
      setInFlight(true);
      await onPress();
    } catch (error) {
      console.error('Button press error:', error);
    } finally {
      setInFlight(false);
    }
  };

  const handleKeyPress = (event: any) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handlePress();
    }
  };

  const handleFocus = () => {
    if (Platform.OS === 'web') {
      setIsFocused(true);
    }
  };

  const handleBlur = () => {
    if (Platform.OS === 'web') {
      setIsFocused(false);
    }
  };

  const isDisabled = disabled || loading || inFlight;

  return (
    <TouchableOpacity
      style={[
        style,
        isDisabled && { opacity: 0.6 },
        { minHeight: 44, minWidth: 44 }, // Accessibility hit area
        // Web focus ring
        Platform.OS === 'web' && isFocused && {
          outline: `2px solid ${Colors.light.primary}`,
          outlineOffset: '2px',
        },
      ]}
      onPress={handlePress}
      onClick={handlePress} // Web compatibility
      onPressIn={() => setIsPressed(true)}
      onPressOut={() => setIsPressed(false)}
      disabled={isDisabled}
      accessible={true}
      accessibilityRole={role}
      accessibilityLabel={accessibilityLabel}
      // Web accessibility
      tabIndex={isDisabled ? -1 : 0}
      onKeyPress={handleKeyPress}
      onFocus={handleFocus}
      onBlur={handleBlur}
      {...props}
    >
      <View style={{ 
        opacity: isPressed ? 0.8 : 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {(loading || inFlight) ? (
          <ActivityIndicator size="small" color={Colors.light.background} />
        ) : (
          typeof children === 'string' ? (
            <Text style={textStyle}>{children}</Text>
          ) : children
        )}
      </View>
    </TouchableOpacity>
  );
};