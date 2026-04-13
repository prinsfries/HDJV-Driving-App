import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { getCurrentLocationLabel } from '@/utils/location';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { OdometerSection } from '@/components/add/OdometerSection';
import { PassengersSection } from '@/components/add/PassengersSection';
import { PlateNumberSection } from '@/components/add/PlateNumberSection';
import { ProofPhotosSection, type ProofPhoto } from '@/components/add/ProofPhotosSection';
import { TripSummaryCard } from '@/components/add/TripSummaryCard';
import { VehicleTypeSection } from '@/components/add/VehicleTypeSection';
import { CornerTriangles } from '@/components/layout/corner-triangles';
import { PlateNumberModal } from '@/components/modals/PlateNumberModal';
import { ConfirmationModal } from '@/components/modals/ConfirmationModal';
import { UI } from '@/constants/ui';
import { syncTrip, type TripSyncPayload, getTripProofPhotos, fetchVehiclesPage, getTrip, resolveFileUrl } from '@/utils/tripApi';
import { getUser } from '@/utils/auth';
import { formatDate, formatTime, formatDateRange } from '@/utils/date';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export default function AddScheduleScreen() {
  const insets = useSafeAreaInsets();
  const { saved, tripId: tripIdParamRaw } = useLocalSearchParams();
  const savedParam = Array.isArray(saved) ? saved[0] : saved;
  const tripIdParam = Array.isArray(tripIdParamRaw)
    ? tripIdParamRaw[0]
    : tripIdParamRaw;
  const isSavedFromParam =
    Boolean(tripIdParam) ||
    savedParam === '1' ||
    savedParam === 'true' ||
    savedParam === 'saved';
  const saveButtonInset = Math.max(insets.bottom, 16);
  const [tripId, setTripId] = useState<string | null>(tripIdParam ?? null);
  const [isSaved, setIsSaved] = useState(isSavedFromParam);
  const [isStarted, setIsStarted] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const [completedAt, setCompletedAt] = useState<Date | null>(null);
  const [startLocation, setStartLocation] = useState<string | null>(null);
  const [stopLocation, setStopLocation] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [odometerStart, setOdometerStart] = useState('');
  const [odometerEnd, setOdometerEnd] = useState('');
  const [passengers, setPassengers] = useState(['']);
  const vehicleTypeOptions = useMemo(() => ['SUV', 'Sedan', 'Van', 'Motorcycle', 'Truck', 'Other'], []);
  const [vehicleType, setVehicleType] = useState('');
  const [vehicleTypeOther, setVehicleTypeOther] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [plateNumberOther, setPlateNumberOther] = useState('');
  const [proofPhotos, setProofPhotos] = useState<ProofPhoto[]>([]);
  const [isPlateModalOpen, setIsPlateModalOpen] = useState(false);
  const [isStartConfirmOpen, setIsStartConfirmOpen] = useState(false);
  const [isStopConfirmOpen, setIsStopConfirmOpen] = useState(false);
  const canRemove = useMemo(() => passengers.length > 1, [passengers.length]);
  const requiresVehicleTypeOther = vehicleType === 'Other';
  const requiresPlateOther = plateNumber === 'Other';
  const selectedVehicleType = requiresVehicleTypeOther
    ? vehicleTypeOther.trim()
    : vehicleType.trim();
  const buildTripPayload = useCallback(
    async (overrides: Partial<TripSyncPayload> = {}, overrideTripId?: string) => {
      const resolvedTripId = overrideTripId ?? tripId;
      if (!resolvedTripId) {
        return null;
      }
      const user = await getUser();
      const driverName = (user?.full_name || user?.name || user?.username || null) as string | null;

      const resolvedVehicleType = requiresVehicleTypeOther
        ? vehicleTypeOther
        : vehicleType;
      const resolvedPlateNumber = requiresPlateOther
        ? plateNumberOther
        : plateNumber;
      const cleanedPassengers = (overrides.passengers ?? passengers)
        .map((name) => name.trim())
        .filter((name) => name.length > 0);
      const status =
        overrides.status ??
        (isCompleted ? 'completed' : isStarted ? 'started' : 'not_started');
      return {
        trip_id: resolvedTripId,
        driver_name: overrides.driver_name ?? driverName,
        vehicle_type:
          overrides.vehicle_type ?? (resolvedVehicleType || null),
        plate_number:
          overrides.plate_number ?? (resolvedPlateNumber || null),
        start_location: overrides.start_location ?? startLocation ?? null,
        end_location: overrides.end_location ?? stopLocation ?? null,
        status,
        started_at:
          overrides.started_at ??
          (startedAt ? startedAt.toISOString() : null),
        completed_at:
          overrides.completed_at ??
          (completedAt ? completedAt.toISOString() : null),
        odometer_start: overrides.odometer_start ?? (odometerStart || null),
        odometer_end: overrides.odometer_end ?? (odometerEnd || null),
        passengers: cleanedPassengers,
      } satisfies TripSyncPayload;
    },
    [
      tripId,
      requiresVehicleTypeOther,
      vehicleTypeOther,
      vehicleType,
      requiresPlateOther,
      plateNumberOther,
      plateNumber,
      passengers,
      isCompleted,
      isStarted,
      startLocation,
      stopLocation,
      startedAt,
      completedAt,
      odometerStart,
      odometerEnd,
    ]
  );
  const handleOdometerEndBlur = useCallback(async () => {
    if (!tripId || !isCompleted) {
      return;
    }
    const payload = await buildTripPayload(
      { odometer_end: odometerEnd || null, status: 'completed' },
      tripId
    );
    if (payload) {
      syncTrip(payload).catch(() => {});
    }
  }, [tripId, isCompleted, odometerEnd, buildTripPayload]);
  

  const [prefs, setPrefs] = useState<{ date_format: 'long' | 'short'; time_format: '12h' | '24h' }>({ date_format: 'long', time_format: '12h' });

  useEffect(() => {
    let active = true;
    getUser().then((u) => {
      if (!active) return;
      const p = u?.preferences || {};
      setPrefs({ date_format: p.date_format ?? 'long', time_format: p.time_format ?? '12h' });
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  const dateLabel =
    startedAt && completedAt
      ? formatDateRange(startedAt, completedAt, { dateFormat: prefs.date_format })
      : startedAt
        ? formatDate(startedAt, { dateFormat: prefs.date_format })
        : 'Not started yet';
  const timeLabel = startedAt
    ? completedAt
      ? `${formatTime(startedAt, { timeFormat: prefs.time_format })} - ${formatTime(completedAt, { timeFormat: prefs.time_format })}`
      : formatTime(startedAt, { timeFormat: prefs.time_format })
    : 'Not started yet';
  const locationLabel = startLocation
    ? stopLocation
      ? `${startLocation} - ${stopLocation}`
      : startLocation
    : 'Location not started yet';
  const hasStarted = Boolean(startedAt);
  const hasLocation = Boolean(startLocation);
  const passengersFilled = passengers.every((name) => name.trim().length > 0);
  const hasVehicleType = requiresVehicleTypeOther
    ? vehicleTypeOther.trim().length > 0
    : vehicleType.trim().length > 0;
  const hasPlateNumber = requiresPlateOther
    ? plateNumberOther.trim().length > 0
    : plateNumber.trim().length > 0;
  const canSave =
    /^\d+$/.test(odometerStart.trim()) &&
    passengersFilled &&
    hasVehicleType &&
    hasPlateNumber;
  const statusLabel = isSaved
    ? isCompleted
      ? 'Completed'
      : isStarted
        ? 'Started'
        : 'Not Started'
    : 'Not Started';

  useEffect(() => {
    if (savedParam === undefined && !tripIdParam) {
      setIsSaved(false);
      setIsStarted(false);
      setIsCompleted(false);
      setStartedAt(null);
      setCompletedAt(null);
      setStartLocation(null);
      setStopLocation(null);
      setLocationError(null);
      setIsLocating(false);
      setOdometerEnd('');
      setOdometerStart('');
      setPassengers(['']);
      setVehicleType('');
      setPlateNumber('');
      setProofPhotos([]);
      return;
    }
    setIsSaved(isSavedFromParam);
    setIsStarted(false);
    setIsCompleted(false);
    setStartedAt(null);
    setCompletedAt(null);
    setStartLocation(null);
    setStopLocation(null);
    setLocationError(null);
    setIsLocating(false);
    setOdometerEnd('');
    setOdometerStart('');
    setPassengers(['']);
    setVehicleType('');
    setPlateNumber('');
    setProofPhotos([]);
  }, [isSavedFromParam, savedParam, tripIdParam, vehicleTypeOptions]);

  useEffect(() => {
    setTripId(tripIdParam ?? null);
  }, [tripIdParam]);

  useEffect(() => {
    let active = true;
    const loadTrip = async () => {
      if (!tripId) return;
      try {
        const t = await getTrip(tripId);
        const started = t.started_at ? new Date(t.started_at) : null;
        const completed = t.completed_at ? new Date(t.completed_at) : null;
        if (!active) return;
        setIsSaved(true);
        setIsStarted(Boolean(started));
        setIsCompleted(Boolean(completed));
        setStartedAt(started);
        setCompletedAt(completed);
        setStartLocation(t.start_location ?? null);
        setStopLocation(t.end_location ?? null);
        setOdometerStart(String(t.odometer_start ?? ''));
        setOdometerEnd(String(t.odometer_end ?? ''));
        const names = Array.isArray(t.passengers) ? t.passengers.map((p) => String(p)).filter((s) => s.length > 0) : [];
        setPassengers(names.length > 0 ? names : ['']);
        const vt = t.vehicle_type ?? '';
        if (vt) {
          if (vehicleTypeOptions.includes(vt)) {
            setVehicleType(vt);
            setVehicleTypeOther('');
          } else {
            setVehicleType('Other');
            setVehicleTypeOther(vt);
          }
        }
        const pn = t.plate_number ?? '';
        if (pn) {
          setPlateNumber(pn);
          setPlateNumberOther('');
        }
      } catch {}
    };
    loadTrip();
    return () => { active = false; };
  }, [tripId, vehicleTypeOptions]);

  const reloadProofPhotos = useCallback(async () => {
    if (!tripId) {
      setProofPhotos([]);
      return;
    }
    try {
      const photos = await getTripProofPhotos(tripId);
      const mapped = (Array.isArray(photos) ? photos : [])
        .filter((p: any) => Boolean(p?.file_url))
        .map((p: any) => {
          const dt = p?.captured_at ? new Date(p.captured_at) : null;
          return {
            uri: resolveFileUrl(p.file_url) ?? '',
            timestamp: dt ? `${formatDate(dt, { dateFormat: prefs.date_format })} ${formatTime(dt, { timeFormat: prefs.time_format })}` : '',
            location: String(p?.location ?? ''),
            capturedAt: String(p?.captured_at ?? Date.now()),
          } as ProofPhoto;
        });
      setProofPhotos(mapped);
    } catch {
      setProofPhotos([]);
    }
  }, [tripId, prefs]);

  useFocusEffect(
    useCallback(() => {
      reloadProofPhotos();
    }, [reloadProofPhotos])
  );


  const getLocationLabel = async (): Promise<string | null> => {
    setIsLocating(true);
    try {
      const label = await getCurrentLocationLabel();
      setLocationError(null);
      return label;
    } catch {
      setLocationError('Unable to get location.');
      return null;
    } finally {
      setIsLocating(false);
    }
  };

  const handleStartTrip = async () => {
    setIsStartConfirmOpen(false);
    if (!hasVehicleType || !hasPlateNumber) {
      setAlertMessage('Select vehicle type and plate number before starting.');
      setTimeout(() => setAlertMessage(null), 2500);
      return;
    }
    if (!/^\d+$/.test(odometerStart.trim())) {
      setAlertMessage('Enter odometer start before starting.');
      setTimeout(() => setAlertMessage(null), 2500);
      return;
    }
    const label = await getLocationLabel();
    if (!label) {
      setAlertMessage('Enable location to start the trip.');
      setTimeout(() => setAlertMessage(null), 2000);
      return;
    }
    const now = new Date();
    setIsStarted(true);
    setIsCompleted(false);
    setStartedAt(now);
    setCompletedAt(null);
    setStartLocation(label);
    if (tripId) {
      const payload = await buildTripPayload(
        {
          status: 'started',
          started_at: now.toISOString(),
          completed_at: null,
          start_location: label,
          end_location: null,
        },
        tripId
      );
      if (payload) {
        syncTrip(payload).catch(() => {
          setAlertMessage('No internet connection. Changes not saved.');
          setTimeout(() => setAlertMessage(null), 3000);
        });
      }
    }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <CornerTriangles />
      <View style={[styles.headerWrap, { paddingTop: 12 }]}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={18} color={UI.colors.green} />
          </Pressable>
          <View>
            <Text style={styles.headerTitle}>Trip Log</Text>
            <Text style={styles.headerSubtitle}>Record schedule details</Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <TripSummaryCard
          dateLabel={dateLabel}
          timeLabel={timeLabel}
          locationLabel={locationLabel}
          locationPending={isLocating}
          locationError={locationError}
          onRetryLocation={() => {
            getLocationLabel()
              .then((label) => {
                if (label) {
                  if (isCompleted) {
                    setStopLocation(label);
                  } else if (isStarted) {
                    setStartLocation(label);
                  }
                }
              });
          }}
          statusLabel={statusLabel}
          hasStarted={hasStarted}
          hasLocation={hasLocation}
          isStarted={isStarted}
          isCompleted={isCompleted}
        />

        <OdometerSection
          startValue={odometerStart}
          endValue={odometerEnd}
          onChangeStart={setOdometerStart}
          onChangeEnd={setOdometerEnd}
          onEndBlur={handleOdometerEndBlur}
          isSaved={isSaved}
          isCompleted={isCompleted}
        />

        <VehicleTypeSection
          options={vehicleTypeOptions}
          value={vehicleType}
          otherValue={vehicleTypeOther}
          onChange={setVehicleType}
          onChangeOther={setVehicleTypeOther}
          isSaved={isSaved}
        />

        <PlateNumberSection
          value={plateNumber}
          otherValue={plateNumberOther}
          isSaved={isSaved}
          onOpenModal={() => setIsPlateModalOpen(true)}
          onChangeOther={setPlateNumberOther}
        />

        <PassengersSection
          passengers={passengers}
          isSaved={isSaved}
          canRemove={canRemove}
          onChangePassenger={(index, text) => {
            setPassengers((prev) => {
              const next = [...prev];
              next[index] = text;
              return next;
            });
          }}
          onRemovePassenger={(index) => {
            setPassengers((prev) => prev.filter((_, i) => i !== index));
          }}
          onAddPassenger={() => setPassengers((prev) => [...prev, ''])}
        />

        <ProofPhotosSection
          photos={proofPhotos}
          isDisabled={!isSaved}
          onCapture={() => {
            if (!tripId) {
              setAlertMessage('Save the trip before capturing proof.');
              setTimeout(() => setAlertMessage(null), 2000);
              return;
            }
            router.push({ pathname: '/proof', params: { tripId } });
          }}
          onSelectPhoto={(photo) => {
            if (!tripId) {
              return;
            }
            router.push({
              pathname: '/proof',
              params: { tripId, photo: encodeURIComponent(photo.uri) },
            });
          }}
        />

        {isSaved && (
          <View style={styles.powerWrap}>
            {isCompleted ? (
              <Pressable style={[styles.powerButton, styles.powerButtonCompleted]} disabled>
                <Ionicons name="checkmark" size={30} color={UI.colors.white} />
              </Pressable>
            ) : isStarted ? (
              <Pressable
                style={[styles.powerButton, styles.powerButtonStop]}
                onPress={() => setIsStopConfirmOpen(true)}>
                <Ionicons name="stop" size={28} color={UI.colors.white} />
              </Pressable>
            ) : (
              <Pressable
                style={styles.powerButton}
                onPress={() => setIsStartConfirmOpen(true)}>
                <Ionicons name="power" size={32} color={UI.colors.white} />
              </Pressable>
            )}
          </View>
        )}
      </ScrollView>

      <PlateNumberModal
        isOpen={isPlateModalOpen}
        onClose={() => setIsPlateModalOpen(false)}
        plateNumber={plateNumber}
        setPlateNumber={(val) => {
          setPlateNumber(val);
        }}
        setPlateNumberOther={setPlateNumberOther}
        plateNumberOptions={[]}
        fetchVehiclesPage={fetchVehiclesPage}
        selectedVehicleType={selectedVehicleType}
        onSelectVehicle={(vehicle) => {
          if (!vehicle?.vehicle_type) return;
          if (vehicleTypeOptions.includes(vehicle.vehicle_type)) {
            setVehicleType(vehicle.vehicle_type);
            setVehicleTypeOther('');
          } else {
            setVehicleType('Other');
            setVehicleTypeOther(vehicle.vehicle_type);
          }
        }}
      />

      <ConfirmationModal
        isOpen={isStartConfirmOpen}
        title="Start trip?"
        message="This will mark the schedule as started."
        confirmLabel="Start"
        onClose={() => setIsStartConfirmOpen(false)}
        onConfirm={handleStartTrip}
      />

      <ConfirmationModal
        isOpen={isStopConfirmOpen}
        title="Stop trip?"
        message="This will mark the schedule as stopped."
        confirmLabel="Stop"
        tone="danger"
        onClose={() => setIsStopConfirmOpen(false)}
        onConfirm={async () => {
          setIsStopConfirmOpen(false);
          if (!hasVehicleType || !hasPlateNumber) {
            setAlertMessage('Select vehicle type and plate number before stopping.');
            setTimeout(() => setAlertMessage(null), 2500);
            return;
          }
          const label = await getLocationLabel();
          const now = new Date();
          setIsStarted(false);
          setIsCompleted(true);
          setCompletedAt(now);
          if (label) {
            setStopLocation(label);
          }
          if (tripId) {
            const payload = await buildTripPayload(
              {
                status: 'completed',
                completed_at: now.toISOString(),
                end_location: label ?? stopLocation ?? null,
              },
              tripId
            );
            if (payload) {
              syncTrip(payload).catch(() => {
                setAlertMessage('No internet connection. Changes not saved.');
                setTimeout(() => setAlertMessage(null), 3000);
              });
            }
          }
        }}
      />

      {(!!saveMessage || !!alertMessage) && (
        <View style={styles.toastWrap}>
          {!!alertMessage && (
            <View style={[styles.toast, styles.toastAlert]}>
              <Text style={styles.toastText}>{alertMessage}</Text>
            </View>
          )}
          {!!saveMessage && (
            <View style={styles.toast}>
              <Text style={styles.toastText}>{saveMessage}</Text>
            </View>
          )}
        </View>
      )}

      {!isCompleted && (
        <View style={[styles.saveButtonWrap, { paddingBottom: saveButtonInset }]}>
          <Pressable
            style={[
              styles.saveButton,
              isSaved ? styles.editButton : null,
              !isSaved && !canSave ? styles.saveButtonDisabled : null,
            ]}
            disabled={!isSaved && !canSave}
            onPress={async () => {
              const prevIsSaved = isSaved;
              const nextIsSaved = !prevIsSaved;
              setIsSaved(nextIsSaved);

              if (nextIsSaved) {
                const newTripId = tripId ?? `${Date.now()}`;
                if (!tripId) {
                  setTripId(newTripId);
                }
                const payload = await buildTripPayload({}, newTripId);
                if (payload) {
                  syncTrip(payload).then(() => {
                    setSaveMessage('Saved');
                    setTimeout(() => setSaveMessage(null), 2000);
                  }).catch(() => {
                    setAlertMessage('No internet connection. Save failed.');
                    setTimeout(() => setAlertMessage(null), 3000);
                    setIsSaved(false);
                  });
                }
              }
            }}>
            <Text style={styles.saveButtonText}>{isSaved ? 'Edit' : 'Save'}</Text>
          </Pressable>
        </View>
      )}
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
    paddingBottom: 24,
    gap: 16,
  },
  scroll: {
    flex: 1,
  },
  headerWrap: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 22,
    color: UI.colors.text,
    fontFamily: UI.fonts.heading,
  },
  headerSubtitle: {
    fontSize: 13,
    color: UI.colors.textMuted,
    fontFamily: UI.fonts.body,
  },
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
  powerWrap: {
    marginTop: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  powerButton: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: UI.colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: UI.colors.greenDark,
    ...UI.shadow.medium,
  },
  powerButtonStop: {
    backgroundColor: UI.colors.danger,
    borderColor: UI.colors.danger,
  },
  powerButtonCompleted: {
    backgroundColor: UI.colors.border,
    borderColor: UI.colors.border,
  },
  saveButtonWrap: {
    paddingHorizontal: 28,
    paddingTop: 8,
  },
  saveButton: {
    height: 46,
    borderRadius: UI.radius.lg,
    backgroundColor: UI.colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: UI.colors.greenDark,
    ...UI.shadow.medium,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  editButton: {
    backgroundColor: UI.colors.blue,
    borderColor: UI.colors.blueDark,
  },
  saveButtonText: {
    color: UI.colors.white,
    fontSize: 16,
    fontFamily: UI.fonts.bodyMedium,
    letterSpacing: 0.2,
  },
  toastWrap: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 96,
    alignItems: 'center',
    gap: 8,
  },
  toast: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: UI.colors.text,
    borderRadius: UI.radius.pill,
    ...UI.shadow.soft,
  },
  toastAlert: {
    backgroundColor: UI.colors.danger,
  },
  toastText: {
    color: UI.colors.white,
    fontSize: 13,
    fontFamily: UI.fonts.bodyMedium,
  },
});
