import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { UI } from '@/constants/ui';

type ConfirmationTone = 'default' | 'danger';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  tone?: ConfirmationTone;
  onClose: () => void;
  onConfirm: () => void;
}

export function ConfirmationModal({
  isOpen,
  title,
  message,
  confirmLabel,
  tone = 'default',
  onClose,
  onConfirm,
}: ConfirmationModalProps) {
  const isDanger = tone === 'danger';

  return (
    <Modal visible={isOpen} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.scrim} onPress={onClose} />
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.actions}>
            <Pressable style={styles.button} onPress={onClose}>
              <Text style={styles.buttonText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.button, isDanger ? styles.danger : styles.primary]}
              onPress={onConfirm}>
              <Text style={[styles.buttonText, styles.primaryText]}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8, 15, 28, 0.5)',
  },
  card: {
    width: '82%',
    backgroundColor: UI.colors.surface,
    borderRadius: UI.radius.lg,
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: UI.colors.border,
    ...UI.shadow.medium,
  },
  title: {
    fontSize: 16,
    color: UI.colors.text,
    fontFamily: UI.fonts.bodyMedium,
    marginBottom: 6,
  },
  message: {
    fontSize: 13,
    color: UI.colors.textMuted,
    fontFamily: UI.fonts.body,
    marginBottom: 16,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  button: {
    minWidth: 90,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: UI.radius.md,
    borderWidth: 1,
    borderColor: UI.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: UI.colors.surface,
  },
  primary: {
    backgroundColor: UI.colors.green,
    borderColor: UI.colors.greenDark,
  },
  danger: {
    backgroundColor: UI.colors.danger,
    borderColor: UI.colors.danger,
  },
  buttonText: {
    fontSize: 13,
    color: UI.colors.text,
    fontFamily: UI.fonts.bodyMedium,
  },
  primaryText: {
    color: UI.colors.white,
  },
});
