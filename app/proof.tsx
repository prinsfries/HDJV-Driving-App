import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import {
  CameraView,
  type CameraCapturedPicture,
  useCameraPermissions,
} from 'expo-camera';
import * as FileSystem from 'expo-file-system';
import ViewShot from 'react-native-view-shot';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackButton } from '@/components/navigation/BackButton';
import { getCurrentLocationLabel } from '@/utils/location';
import { Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { CornerTriangles } from '@/components/layout/corner-triangles';
import { UI } from '@/constants/ui';
import { uploadTripProofPhoto } from '@/utils/tripApi';


export default function ProofCaptureScreen() {
  const {
    tripId: tripIdParam,
    photo: photoParamRaw,
    photoId: photoIdParamRaw,
  } = useLocalSearchParams();
  const tripId = Array.isArray(tripIdParam) ? tripIdParam[0] : tripIdParam;
  const photoParam = Array.isArray(photoParamRaw) ? photoParamRaw[0] : photoParamRaw;
  const photoId = Array.isArray(photoIdParamRaw)
    ? photoIdParamRaw[0]
    : photoIdParamRaw;
  const isViewOnly = Boolean(photoParam || photoId);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView | null>(null);
  const viewShotRef = useRef<ViewShot | null>(null);
  const [facing, setFacing] = useState<'front' | 'back'>('front');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [timestampLabel, setTimestampLabel] = useState('');
  const [locationLabel, setLocationLabel] = useState('');
  const [capturedAt, setCapturedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [initialPhotoLoaded, setInitialPhotoLoaded] = useState(false);

  const canUseCamera = permission?.granted && Platform.OS !== 'web';

  const formattedTimestamp = useMemo(() => {
    if (!timestampLabel) {
      return '';
    }
    return timestampLabel;
  }, [timestampLabel]);

  const getLocationStamp = useCallback(async () => {
    setIsLocating(true);
    try {
      const label = await getCurrentLocationLabel();
      setError(null);
      return label;
    } catch (err: any) {
      setError(err.message || 'Unable to get location.');
      return null;
    } finally {
      setIsLocating(false);
    }
  }, []);

  const formatTimestamp = (value: Date) =>
    value.toLocaleString('en-US', {
      timeZone: 'Asia/Manila',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const formatManilaCapturedAt = (value: Date) => {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).formatToParts(value);

    const lookup = Object.fromEntries(
      parts
        .filter((part) => part.type !== 'literal')
        .map((part) => [part.type, part.value])
    );

    return `${lookup.year}-${lookup.month}-${lookup.day}T${lookup.hour}:${lookup.minute}:${lookup.second}+08:00`;
  };

  const handleCapture = async () => {
    if (!cameraRef.current || isCapturing) {
      return;
    }
    setIsCapturing(true);
    setError(null);
    const locationStamp = await getLocationStamp();
    if (!locationStamp) {
      setIsCapturing(false);
      return;
    }
    try {
      const captured: CameraCapturedPicture | undefined =
        await cameraRef.current.takePictureAsync({ quality: 0.8 });
      if (!captured?.uri) {
        throw new Error('Capture failed');
      }
      const now = new Date();
      setPhotoUri(captured.uri);
      setTimestampLabel(formatTimestamp(now));
      setCapturedAt(formatManilaCapturedAt(now));
      setLocationLabel(locationStamp);
    } catch {
      setError('Unable to capture photo.');
    } finally {
      setIsCapturing(false);
    }
  };

  const loadViewPhoto = useCallback(async () => {
    if (!photoParam || photoId || initialPhotoLoaded) {
      return;
    }
    try {
      const decoded = decodeURIComponent(photoParam);
      setPhotoUri(decoded);
    } catch {
      setPhotoUri(photoParam);
    } finally {
      setInitialPhotoLoaded(true);
    }
  }, [photoParam, photoId, initialPhotoLoaded]);

  useEffect(() => {
    loadViewPhoto();
  }, [loadViewPhoto]);

  // No local metadata loading; relies on provided params or backend.

  const handleSave = async () => {
    if (!tripId || !viewShotRef.current || !photoUri) {
      return;
    }
    if (isSaving) {
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const stampedUri = await viewShotRef.current.capture?.();
      if (!stampedUri) {
        throw new Error('Unable to save');
      }
      const fileName = `proof-${tripId}-${Date.now()}.jpg`;
      const destination = (FileSystem as any).documentDirectory
        ? `${(FileSystem as any).documentDirectory}${fileName}`
        : stampedUri;
      if (destination !== stampedUri) {
        await FileSystem.copyAsync({ from: stampedUri, to: destination });
      }

      uploadTripProofPhoto({
        tripId,
        photoUri: destination,
        location: locationLabel,
        capturedAt: capturedAt ?? formatManilaCapturedAt(new Date()),
      }).then(() => {
        router.back();
      }).catch(() => {
        setError('No internet connection. Upload failed.');
      });
    } catch {
      setError('Unable to save proof photo.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <CornerTriangles />
      <View style={{ paddingTop: 12, paddingHorizontal: 20, paddingBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <BackButton />
          <View>
            <Text style={{ fontSize: 22, color: UI.colors.text, fontFamily: UI.fonts.heading }}>Proof Photo</Text>
            <Text style={{ fontSize: 13, color: UI.colors.textMuted, fontFamily: UI.fonts.body }}>Capture passenger and stamp details.</Text>
          </View>
        </View>
      </View>

      <View style={styles.content}>
        {!tripId && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Trip missing</Text>
            <Text style={styles.cardText}>Save the trip before capturing proof.</Text>
          </View>
        )}

        {!!tripId && !permission?.granted && !isViewOnly && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Camera access needed</Text>
            <Text style={styles.cardText}>
              Allow camera access to capture the proof photo.
            </Text>
            <Pressable style={styles.primaryButton} onPress={requestPermission}>
              <Text style={styles.primaryButtonText}>Enable Camera</Text>
            </Pressable>
          </View>
        )}

        {!!tripId && permission?.granted && Platform.OS === 'web' && !isViewOnly && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Camera not supported on web</Text>
            <Text style={styles.cardText}>Use a mobile device to capture proof.</Text>
          </View>
        )}

        {!!tripId && canUseCamera && !photoUri && !isViewOnly && (
          <View style={styles.cameraCard}>
            <CameraView
              ref={cameraRef}
              style={styles.camera}
              facing={facing}
              onMountError={() => setError('Unable to open camera.')}
            />
            <View style={styles.cameraControls}>
              <Pressable
                style={styles.switchButton}
                onPress={() => setFacing((prev) => (prev === 'front' ? 'back' : 'front'))}>
                <Ionicons name="camera-reverse" size={20} color={UI.colors.white} />
              </Pressable>
              <Pressable
                style={[styles.captureButton, isCapturing ? styles.captureDisabled : null]}
                disabled={isCapturing || isLocating}
                onPress={handleCapture}>
                <Ionicons name="camera" size={20} color={UI.colors.white} />
                <Text style={styles.captureText}>
                  {isLocating ? 'Getting location...' : 'Capture'}
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {!!photoUri && (
          <View style={styles.previewCard}>
            <ViewShot
              ref={viewShotRef}
              options={{ format: 'jpg', quality: 0.9 }}
              style={styles.previewShot}>
              <Image source={{ uri: photoUri }} style={styles.previewImage} />
              {(formattedTimestamp || locationLabel) && (
                <View style={styles.stamp}>
                  {!!formattedTimestamp && (
                    <Text style={styles.stampText}>{formattedTimestamp}</Text>
                  )}
                  {!!locationLabel && (
                    <Text style={styles.stampText}>{locationLabel}</Text>
                  )}
                </View>
              )}
            </ViewShot>
            {!isViewOnly && (
              <View style={styles.previewActions}>
                <Pressable
                  style={styles.secondaryButton}
                  onPress={() => {
                    setPhotoUri(null);
                    setCapturedAt(null);
                    setTimestampLabel('');
                    setLocationLabel('');
                    setError(null);
                  }}>
                  <Text style={styles.secondaryButtonText}>Retake</Text>
                </Pressable>
                <Pressable
                  style={[styles.primaryButton, isSaving ? styles.captureDisabled : null]}
                  disabled={isSaving}
                  onPress={handleSave}>
                  <Text style={styles.primaryButtonText}>
                    {isSaving ? 'Saving...' : 'Save Proof'}
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        )}

        {error && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={16} color={UI.colors.white} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: UI.colors.background,
    overflow: 'hidden',
  },
  content: {
    paddingHorizontal: 20,
    gap: 16,
  },
  card: {
    padding: 16,
    borderRadius: UI.radius.lg,
    backgroundColor: UI.colors.surface,
    borderWidth: 1,
    borderColor: UI.colors.border,
    gap: 10,
    ...UI.shadow.soft,
  },
  cardTitle: {
    fontSize: 16,
    color: UI.colors.text,
    fontFamily: UI.fonts.bodyMedium,
  },
  cardText: {
    fontSize: 13,
    color: UI.colors.textMuted,
    fontFamily: UI.fonts.body,
  },
  cameraCard: {
    borderRadius: UI.radius.lg,
    borderWidth: 1,
    borderColor: UI.colors.border,
    overflow: 'hidden',
    backgroundColor: UI.colors.surface,
    ...UI.shadow.soft,
  },
  camera: {
    width: '100%',
    height: 360,
  },
  cameraControls: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    height: 44,
    borderRadius: 22,
    backgroundColor: UI.colors.green,
    ...UI.shadow.soft,
  },
  captureDisabled: {
    opacity: 0.7,
  },
  captureText: {
    fontSize: 14,
    color: UI.colors.white,
    fontFamily: UI.fonts.bodyMedium,
  },
  previewCard: {
    padding: 12,
    borderRadius: UI.radius.lg,
    backgroundColor: UI.colors.surface,
    borderWidth: 1,
    borderColor: UI.colors.border,
    gap: 12,
    ...UI.shadow.soft,
  },
  previewShot: {
    borderRadius: UI.radius.md,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: 360,
    resizeMode: 'cover',
  },
  stamp: {
    position: 'absolute',
    left: 12,
    bottom: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    maxWidth: '90%',
    gap: 4,
  },
  stampText: {
    fontSize: 12,
    color: UI.colors.white,
    fontFamily: UI.fonts.bodyMedium,
  },
  previewActions: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    height: 44,
    borderRadius: UI.radius.md,
    backgroundColor: UI.colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 14,
    color: UI.colors.white,
    fontFamily: UI.fonts.bodyMedium,
  },
  secondaryButton: {
    flex: 1,
    height: 44,
    borderRadius: UI.radius.md,
    borderWidth: 1,
    borderColor: UI.colors.border,
    backgroundColor: UI.colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: 13,
    color: UI.colors.textMuted,
    fontFamily: UI.fonts.bodyMedium,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: UI.radius.pill,
    backgroundColor: UI.colors.danger,
  },
  errorText: {
    color: UI.colors.white,
    fontSize: 12,
    fontFamily: UI.fonts.bodyMedium,
  },
});
