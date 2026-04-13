import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { UI } from '@/constants/ui';

export type ProofPhoto = {
  uri: string;
  timestamp: string;
  location: string;
  capturedAt: string;
};

interface ProofPhotosSectionProps {
  photos: ProofPhoto[];
  onCapture: () => void;
  isDisabled?: boolean;
  onSelectPhoto?: (photo: ProofPhoto) => void;
}

export function ProofPhotosSection({
  photos,
  onCapture,
  isDisabled,
  onSelectPhoto,
}: ProofPhotosSectionProps) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionLabel}>Proof Photos</Text>
        <Text style={styles.sectionMeta}>{photos.length} saved</Text>
      </View>

      {photos.length === 0 ? (
        <Text style={styles.emptyText}>No proof photos yet.</Text>
      ) : (
        photos.map((photo) => {
          const Wrapper = onSelectPhoto ? Pressable : View;
          return (
            <Wrapper
              key={photo.capturedAt}
              style={styles.photoRow}
              onPress={onSelectPhoto ? () => onSelectPhoto(photo) : undefined}
              accessibilityRole={onSelectPhoto ? 'button' : undefined}>
              <Image source={{ uri: photo.uri }} style={styles.photoThumb} />
              <View style={styles.photoMeta}>
                <Text style={styles.photoTime}>{photo.timestamp}</Text>
                <Text style={styles.photoLocation} numberOfLines={2}>
                  {photo.location}
                </Text>
              </View>
              {onSelectPhoto && (
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={UI.colors.textMuted}
                />
              )}
            </Wrapper>
          );
        })
      )}

      <Pressable
        style={[styles.captureButton, isDisabled ? styles.captureDisabled : null]}
        disabled={isDisabled}
        onPress={onCapture}>
        <Ionicons name="camera" size={18} color={UI.colors.white} />
        <Text style={styles.captureText}>Capture Proof</Text>
      </Pressable>
      {isDisabled && (
        <Text style={styles.helperText}>Save the trip before capturing proof.</Text>
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
  emptyText: {
    fontSize: 13,
    color: UI.colors.placeholder,
    fontFamily: UI.fonts.body,
  },
  photoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: UI.radius.md,
  },
  photoThumb: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: UI.colors.surfaceAlt,
    resizeMode: 'cover',
  },
  photoMeta: {
    flex: 1,
    gap: 4,
  },
  photoTime: {
    fontSize: 12,
    color: UI.colors.text,
    fontFamily: UI.fonts.bodyMedium,
  },
  photoLocation: {
    fontSize: 12,
    color: UI.colors.textMuted,
    fontFamily: UI.fonts.body,
  },
  captureButton: {
    marginTop: 6,
    height: 44,
    borderRadius: UI.radius.md,
    backgroundColor: UI.colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    ...UI.shadow.soft,
  },
  captureDisabled: {
    opacity: 0.6,
  },
  captureText: {
    color: UI.colors.white,
    fontSize: 14,
    fontFamily: UI.fonts.bodyMedium,
  },
  helperText: {
    fontSize: 12,
    color: UI.colors.textMuted,
    fontFamily: UI.fonts.body,
  },
});
