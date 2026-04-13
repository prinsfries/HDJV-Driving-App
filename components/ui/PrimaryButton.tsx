import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  PressableProps,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  ViewStyle,
} from 'react-native';

import { UI } from '@/constants/ui';

type PrimaryButtonProps = Omit<PressableProps, 'style'> & {
  title: string;
  isLoading?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

export function PrimaryButton({
  title,
  isLoading = false,
  disabled,
  style,
  textStyle,
  ...props
}: PrimaryButtonProps) {
  const isDisabled = Boolean(disabled || isLoading);

  return (
    <Pressable
      accessibilityRole="button"
      {...props}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        isDisabled ? styles.buttonDisabled : null,
        pressed && !isDisabled ? styles.buttonPressed : null,
        style,
      ]}
    >
      {isLoading ? (
        <ActivityIndicator color={UI.colors.white} />
      ) : (
        <Text style={[styles.buttonText, textStyle]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 50,
    borderRadius: UI.radius.md,
    backgroundColor: UI.colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    ...UI.shadow.medium,
  },
  buttonDisabled: {
    backgroundColor: UI.colors.textMuted,
    opacity: 0.7,
  },
  buttonPressed: {
    opacity: 0.92,
  },
  buttonText: {
    color: UI.colors.white,
    fontSize: 16,
    fontFamily: UI.fonts.bodyMedium,
    letterSpacing: 0.4,
  },
});
