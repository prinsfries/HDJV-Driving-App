import React, { forwardRef } from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';

import { UI } from '@/constants/ui';

type InputProps = TextInputProps & {
  label?: string;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  right?: React.ReactNode;
};

export const Input = forwardRef<TextInput, InputProps>(
  ({ label, containerStyle, inputStyle, right, ...props }, ref) => {
    return (
      <View style={[styles.container, containerStyle]}>
        {label ? <Text style={styles.label}>{label}</Text> : null}
        <View style={styles.inputWrap}>
          <TextInput
            ref={ref}
            placeholderTextColor={UI.colors.placeholder}
            selectionColor={UI.colors.green}
            {...props}
            style={[styles.input, right ? styles.inputWithRight : null, inputStyle]}
          />
          {right ? <View style={styles.rightWrap}>{right}</View> : null}
        </View>
      </View>
    );
  }
);

Input.displayName = 'Input';

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  label: {
    fontSize: 12,
    color: UI.colors.textMuted,
    fontFamily: UI.fonts.bodyMedium,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  inputWrap: {
    position: 'relative',
    justifyContent: 'center',
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: UI.colors.border,
    borderRadius: UI.radius.md,
    paddingHorizontal: 14,
    backgroundColor: UI.colors.inputBackground,
    color: UI.colors.text,
    fontFamily: UI.fonts.body,
  },
  inputWithRight: {
    paddingRight: 42,
  },
  rightWrap: {
    position: 'absolute',
    right: 10,
    height: 36,
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
