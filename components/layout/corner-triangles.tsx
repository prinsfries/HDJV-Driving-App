import React from 'react';
import { StyleSheet, View } from 'react-native';
import { UI } from '@/constants/ui';

export function CornerTriangles() {
  return (
    <>
      <View style={styles.triangleGreen} />
      <View style={styles.triangleBlue} />
    </>
  );
}

const styles = StyleSheet.create({
  triangleGreen: {
    position: 'absolute',
    top: -30,
    right: -105,
    width: 0,
    height: 0,
    borderTopWidth: 250,
    borderLeftWidth: 80,
    borderRightWidth: 300,
    borderTopColor: UI.colors.green,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    transform: [{ rotate: '85deg' }],
    pointerEvents: 'none',
  },
  triangleBlue: {
    position: 'absolute',
    top: 60,
    right: -160,
    width: 0,
    height: 0,
    borderTopWidth: 150,
    borderLeftWidth: 80,
    borderRightWidth: 190,
    borderTopColor: UI.colors.blue,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    transform: [{ rotate: '225deg' }],
    pointerEvents: 'none',
  },
});
