import React from 'react';
import { StyleProp, StyleSheet, View, ViewProps, ViewStyle } from 'react-native';

import { UI } from '@/constants/ui';

type CardProps = ViewProps & {
  style?: StyleProp<ViewStyle>;
};

export function Card({ style, ...props }: CardProps) {
  return <View {...props} style={[styles.card, style]} />;
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: UI.radius.lg,
    backgroundColor: UI.colors.surface,
    borderWidth: 1,
    borderColor: UI.colors.border,
    gap: 12,
    ...UI.shadow.soft,
  },
});
