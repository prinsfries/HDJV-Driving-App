import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { UI } from '@/constants/ui';

interface VehicleTypeSectionProps {
  options: string[];
  value: string;
  otherValue: string;
  onChange: (value: string) => void;
  onChangeOther: (value: string) => void;
  isSaved: boolean;
}

export function VehicleTypeSection({
  options,
  value,
  otherValue,
  onChange,
  onChangeOther,
  isSaved,
}: VehicleTypeSectionProps) {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionLabel}>Vehicle Type</Text>
      <View style={styles.optionGrid}>
        {options.map((option) => {
          const isSelected = value === option;
          return (
            <Pressable
              key={`vehicle-type-${option}`}
              style={[
                styles.optionButton,
                isSelected ? styles.optionSelected : null,
                isSaved ? styles.optionDisabled : null,
              ]}
              disabled={isSaved}
              onPress={() => {
                onChange(option);
                if (option !== 'Other') {
                  onChangeOther('');
                }
              }}>
              <Text
                style={[
                  styles.optionText,
                  isSelected ? styles.optionTextSelected : null,
                ]}>
                {option}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {value === 'Other' && (
        <TextInput
          placeholder="Specify vehicle type"
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
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionButton: {
    borderWidth: 1,
    borderColor: UI.colors.border,
    backgroundColor: UI.colors.inputBackground,
    borderRadius: UI.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  optionSelected: {
    backgroundColor: UI.colors.green,
    borderColor: UI.colors.greenDark,
  },
  optionDisabled: {
    opacity: 0.7,
  },
  optionText: {
    fontSize: 12,
    color: UI.colors.text,
    fontFamily: UI.fonts.bodyMedium,
  },
  optionTextSelected: {
    color: UI.colors.white,
  },
});
