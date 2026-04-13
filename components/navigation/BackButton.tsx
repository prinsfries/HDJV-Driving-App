import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, ViewStyle } from 'react-native';
import { router } from 'expo-router';
import { UI } from '@/constants/ui';

interface BackButtonProps {
  style?: ViewStyle;
}

export function BackButton({ style }: BackButtonProps) {
  return (
    <Pressable style={[styles.backButton, style]} onPress={() => router.back()}>
      <Ionicons name="arrow-back" size={18} color={UI.colors.green} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: UI.colors.green,
    backgroundColor: UI.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...UI.shadow.soft,
  },
});