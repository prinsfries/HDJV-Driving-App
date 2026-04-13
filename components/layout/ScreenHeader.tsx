import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { UI } from '@/constants/ui';

export interface ScreenHeaderProps {
  kicker?: string;
  title: string;
  subtitle?: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function ScreenHeader({ kicker, title, subtitle, left, right, style }: ScreenHeaderProps) {
  return (
    <View style={[styles.row, style]}>
      {left ? <View style={styles.sideWrap}>{left}</View> : null}
      <View style={styles.center}>
        {kicker ? <Text style={styles.kicker}>{kicker}</Text> : null}
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {right ? <View style={[styles.sideWrap, styles.rightWrap]}>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sideWrap: {
    justifyContent: 'center',
  },
  rightWrap: {
    alignItems: 'flex-end',
  },
  center: {
    flex: 1,
  },
  kicker: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: UI.colors.textMuted,
    fontFamily: UI.fonts.bodyMedium,
  },
  title: {
    fontSize: 24,
    color: UI.colors.text,
    fontFamily: UI.fonts.heading,
  },
  subtitle: {
    fontSize: 14,
    color: UI.colors.textMuted,
    fontFamily: UI.fonts.body,
  },
});
