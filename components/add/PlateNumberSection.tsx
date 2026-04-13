import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { UI } from '@/constants/ui';

interface PlateNumberSectionProps {
  value: string;
  otherValue: string;
  isSaved: boolean;
  onOpenModal: () => void;
  onChangeOther: (value: string) => void;
}

export function PlateNumberSection({
  value,
  otherValue,
  isSaved,
  onOpenModal,
  onChangeOther,
}: PlateNumberSectionProps) {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionLabel}>Plate Number</Text>
      <Pressable
        style={[styles.dropdownButton, isSaved ? styles.optionDisabled : null]}
        disabled={isSaved}
        onPress={onOpenModal}>
        <Text style={styles.dropdownText}>{value || 'Select plate number'}</Text>
        <Ionicons name="chevron-down" size={16} color={UI.colors.textMuted} />
      </Pressable>
      {value === 'Other' && (
        <TextInput
          placeholder="Specify plate number"
          placeholderTextColor={UI.colors.placeholder}
          style={styles.input}
          value={otherValue}
          onChangeText={onChangeOther}
          editable={!isSaved}
          selectionColor={UI.colors.green}
        />
      )}
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
  dropdownButton: {
    height: 48,
    borderWidth: 1,
    borderColor: UI.colors.border,
    borderRadius: UI.radius.md,
    paddingHorizontal: 14,
    backgroundColor: UI.colors.inputBackground,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dropdownText: {
    color: UI.colors.text,
    fontFamily: UI.fonts.body,
    fontSize: 14,
  },
  optionDisabled: {
    opacity: 0.7,
  },
});
