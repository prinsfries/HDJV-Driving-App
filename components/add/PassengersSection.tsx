import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { UI } from '@/constants/ui';

interface PassengersSectionProps {
  passengers: string[];
  isSaved: boolean;
  canRemove: boolean;
  onChangePassenger: (index: number, value: string) => void;
  onRemovePassenger: (index: number) => void;
  onAddPassenger: () => void;
}

export function PassengersSection({
  passengers,
  isSaved,
  canRemove,
  onChangePassenger,
  onRemovePassenger,
  onAddPassenger,
}: PassengersSectionProps) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionLabel}>Passengers</Text>
        <Text style={styles.sectionMeta}>{passengers.length} entries</Text>
      </View>
      {passengers.map((value, index) => (
        <View key={`passenger-${index}`} style={styles.passengerRow}>
          <TextInput
            placeholder="Passenger"
            placeholderTextColor={UI.colors.placeholder}
            style={[styles.input, styles.passengerInput]}
            value={value}
            onChangeText={(text) => onChangePassenger(index, text)}
            editable={!isSaved}
            selectionColor={UI.colors.green}
          />
          {!isSaved && (
            <Pressable
              style={[styles.removeButton, !canRemove ? styles.removeDisabled : null]}
              disabled={!canRemove}
              onPress={() => onRemovePassenger(index)}>
              <Ionicons name="remove" size={18} color={UI.colors.white} />
            </Pressable>
          )}
        </View>
      ))}
      {!isSaved && (
        <Pressable style={styles.addButton} onPress={onAddPassenger}>
          <Ionicons name="add" size={18} color={UI.colors.white} />
          <Text style={styles.addButtonText}>Add</Text>
        </Pressable>
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionLabel: {
    fontSize: 12,
    color: UI.colors.textMuted,
    fontFamily: UI.fonts.bodyMedium,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  sectionMeta: {
    fontSize: 12,
    color: UI.colors.textMuted,
    fontFamily: UI.fonts.body,
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
  passengerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  passengerInput: {
    flex: 1,
  },
  removeButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: UI.colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeDisabled: {
    opacity: 0.5,
  },
  addButton: {
    marginTop: 6,
    height: 42,
    borderRadius: UI.radius.md,
    backgroundColor: UI.colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    ...UI.shadow.soft,
  },
  addButtonText: {
    color: UI.colors.white,
    fontSize: 14,
    fontFamily: UI.fonts.bodyMedium,
  },
});
