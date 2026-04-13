import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { UI } from '@/constants/ui';

interface OdometerSectionProps {
  startValue: string;
  endValue: string;
  onChangeStart: (value: string) => void;
  onChangeEnd: (value: string) => void;
  onEndBlur?: () => void;
  isSaved: boolean;
  isCompleted: boolean;
}

export function OdometerSection({
  startValue,
  endValue,
  onChangeStart,
  onChangeEnd,
  onEndBlur,
  isSaved,
  isCompleted,
}: OdometerSectionProps) {
  const endEditable = isCompleted;

  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionLabel}>Odometer Start</Text>
      <TextInput
        placeholder="Length (Km)"
        placeholderTextColor={UI.colors.placeholder}
        style={styles.input}
        value={startValue}
        onChangeText={(text) => onChangeStart(text.replace(/[^0-9]/g, ''))}
        editable={!isSaved}
        selectionColor={UI.colors.green}
        keyboardType="numeric"
        inputMode="numeric"
      />
      <Text style={styles.sectionLabel}>Odometer End</Text>
      <TextInput
        placeholder="Length (Km)"
        placeholderTextColor={UI.colors.placeholder}
        style={[styles.input, !endEditable ? styles.inputDisabled : null]}
        value={endValue}
        onChangeText={(text) => onChangeEnd(text.replace(/[^0-9]/g, ''))}
        onBlur={onEndBlur}
        editable={endEditable}
        selectionColor={UI.colors.green}
        keyboardType="numeric"
        inputMode="numeric"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  sectionCard: {
    gap: 10,
    padding: 16,
    borderRadius: UI.radius.lg,
    backgroundColor: UI.colors.surface,
    borderWidth: 1,
    borderColor: UI.colors.border,
    ...UI.shadow.soft,
  },
  sectionLabel: {
    fontSize: 12,
    color: UI.colors.textMuted,
    fontFamily: UI.fonts.bodyMedium,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
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
  inputDisabled: {
    opacity: 0.6,
  },
});
