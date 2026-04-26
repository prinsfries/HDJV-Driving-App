import { OdometerSection } from '@/components/add/OdometerSection';
import { PassengersSection } from '@/components/add/PassengersSection';
import { PlateNumberSection } from '@/components/add/PlateNumberSection';
import { ProofPhotosSection, type ProofPhoto } from '@/components/add/ProofPhotosSection';
import { TripSummaryCard } from '@/components/add/TripSummaryCard';
import { VehicleTypeSection } from '@/components/add/VehicleTypeSection';
import { CornerTriangles } from '@/components/layout/corner-triangles';
import { ConfirmationModal } from '@/components/modals/ConfirmationModal';
import { PlateNumberModal } from '@/components/modals/PlateNumberModal';
import { UI } from '@/constants/ui';
import { getUser } from '@/utils/auth';
import { formatDate, formatDateRange, formatTime } from '@/utils/date';
import { getCurrentLocationLabel } from '@/utils/location';
import { getRequest, updateRequestStatus } from '@/utils/requestApi';
import { fetchVehiclesPage, getTrip, getTripProofPhotos, resolveFileUrl, syncTrip, type TripSyncPayload } from '@/utils/tripApi';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TripDetailsScreen() {
  const insets = useSafeAreaInsets();
  const { saved, tripId: tripIdParamRaw, requestId: requestIdParamRaw } = useLocalSearchParams();
  const savedParam = Array.isArray(saved) ? saved[0] : saved;
  const tripIdParam = Array.isArray(tripIdParamRaw)
    ? tripIdParamRaw[0]
    : tripIdParamRaw;
  const requestIdParam = Array.isArray(requestIdParamRaw)
    ? requestIdParamRaw[0]
    : requestIdParamRaw;
  const isSavedFromParam =
    Boolean(tripIdParam) ||
    Boolean(requestIdParam) ||
    savedParam === '1' ||
    savedParam === 'true' ||
    savedParam === 'saved';
  const saveButtonInset = Math.max(insets.bottom, 16);
  const [tripId, setTripId] = useState<string | null>(tripIdParam ?? null);
  const [requestId, setRequestId] = useState<number | null>(
    requestIdParam ? Number(requestIdParam) : null
  );

  const [requestStatus, setRequestStatus] = useState<string | null>(null);
  const [requestedAt, setRequestedAt] = useState<Date | null>(null);
  const [requestDeparture, setRequestDeparture] = useState<string | null>(null);
  const [requestDestination, setRequestDestination] = useState<string | null>(null);
  const [requesterName, setRequesterName] = useState<string | null>(null);
  const [requestPassengers, setRequestPassengers] = useState<string[]>([]);
  const [requestVehicleType, setRequestVehicleType] = useState<string | null>(null);
  const [requestPlateNumber, setRequestPlateNumber] = useState<string | null>(null);
  const [statusTimeline, setStatusTimeline] = useState<Array<{ status: string; createdAt?: Date | null }>>([]);
  const [stepperWidth, setStepperWidth] = useState(0);
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
    async (overrides: Partial<TripSyncPayload> = {}, overrideTripId?: string): Promise<TripSyncPayload | null> => {
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
        : requestStatus
          ? requestStatus
          : 'Not Started'
    : 'Not Started';

  useEffect(() => {
    if (savedParam === undefined && !tripIdParam && !requestIdParam) {
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
      setRequestDeparture(null);
      setRequestDestination(null);
      setRequestPassengers([]);
      setRequestVehicleType(null);
      setRequestPlateNumber(null);
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
    setRequestDeparture(null);
    setRequestDestination(null);
    setRequestPassengers([]);
    setRequestVehicleType(null);
    setRequestPlateNumber(null);
    setVehicleType('');
    setPlateNumber('');
    setProofPhotos([]);
  }, [isSavedFromParam, savedParam, tripIdParam, requestIdParam, vehicleTypeOptions]);

  useEffect(() => {
    if (tripIdParam !== undefined) {
      setTripId(tripIdParam ? String(tripIdParam) : null);
    }
    if (requestIdParam !== undefined) {
      setRequestId(requestIdParam ? Number(requestIdParam) : null);
    }
  }, [tripIdParam, requestIdParam]);

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
        // If this trip is linked to a request, keep the request details visible
        const linkedRequestId = (t as any).request_id ?? null;
        if (linkedRequestId && !requestId) {
          setRequestId(Number(linkedRequestId));
        }
      } catch {}
    };
    loadTrip();
    return () => { active = false; };
  }, [tripId, requestId, vehicleTypeOptions]);

  useEffect(() => {
    let active = true;
    const loadRequest = async () => {
      if (!requestId) return;
      try {
        const req = await getRequest(requestId);
        if (!active) return;
        setIsSaved(true);
        const statusMap = {
          pending: 'Request Pending',
          accepted: 'Request Accepted',
          rejected: 'Request Rejected',
          assigned: 'Request Assigned',
          in_progress: 'In Progress',
          completed: 'Completed',
        };
        setRequestStatus(statusMap[req.status] || req.status);
        setRequestedAt(req.requested_at ? new Date(req.requested_at) : null);
        setRequestDeparture(req.departure_place ?? null);
        setRequestDestination(req.destination ?? null);
        setRequesterName(req.requester_name ?? null);
        const passengerList = Array.isArray(req.passenger_names)
          ? req.passenger_names.map((p) => String(p)).filter((s) => s.trim().length > 0)
          : [];
        if (passengerList.length === 0 && req.requester_name) {
          passengerList.push(req.requester_name);
        }
        setRequestPassengers(passengerList);
        if (passengerList.length > 0) {
          const currentPassengers = passengers.filter((p) => p.trim().length > 0);
          if (currentPassengers.length === 0) {
            setPassengers(passengerList);
          }
        }
        const assignedVehicleType = req.assigned_vehicle?.vehicle_type ?? null;
        const assignedPlate = req.assigned_vehicle?.plate_number ?? null;
        setRequestVehicleType(assignedVehicleType);
        setRequestPlateNumber(assignedPlate);
        if (assignedVehicleType) {
          if (vehicleTypeOptions.includes(assignedVehicleType)) {
            setVehicleType(assignedVehicleType);
            setVehicleTypeOther('');
          } else {
            setVehicleType('Other');
            setVehicleTypeOther(assignedVehicleType);
          }
        }
        if (assignedPlate) {
          setPlateNumber(assignedPlate);
          setPlateNumberOther('');
        }
        if (req.trip?.trip_id && !tripId) {
          setTripId(req.trip.trip_id);
        }
        if (req.status === 'in_progress') {
          setIsStarted(true);
        }
        if (req.status === 'completed') {
          setIsCompleted(true);
        }
        const histories = Array.isArray(req.status_histories) ? req.status_histories : [];
        const mapped = histories.map((item) => ({
          status: String(item.status ?? ''),
          createdAt: item.created_at ? new Date(item.created_at) : null,
        }));
        if (mapped.length > 0) {
          setStatusTimeline(mapped);
        } else {
          setStatusTimeline([
            {
              status: String(req.status ?? 'pending'),
              createdAt: req.requested_at ? new Date(req.requested_at) : null,
            },
          ]);
        }
      } catch {}
    };
    loadRequest();
    return () => { active = false; };
  }, [requestId, tripId, passengers, vehicleTypeOptions]);

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
    if (requestId) {
      try {
        const updated = await updateRequestStatus(requestId, 'in_progress');
        if (updated?.trip?.trip_id) {
          setTripId(updated.trip.trip_id);
        }
        setRequestStatus('In Progress');
      } catch {
        setAlertMessage('No internet connection. Changes not saved.');
        setTimeout(() => setAlertMessage(null), 3000);
      }
      return;
    }
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

  const requestDateLabel = requestedAt
    ? formatDate(requestedAt, { dateFormat: prefs.date_format })
    : 'Pending';
  const requestTimeLabel = requestedAt
    ? formatTime(requestedAt, { timeFormat: prefs.time_format })
    : 'Pending';
  const requestPassengerLabel = requestPassengers.length > 0
    ? requestPassengers.join(', ')
    : 'Pending';
  const requesterLabel = requesterName || 'Pending';
  const requestVehicleTypeLabel = requestVehicleType || 'Pending';
  const requestPlateNumberLabel = requestPlateNumber || 'Pending';
  const formatTimelineStatus = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'Pending',
      accepted: 'Approved',
      rejected: 'Declined',
      assigned: 'Assigned',
      in_progress: 'In Progress',
      completed: 'Completed',
    };
    return labels[status] || status;
  };

  const getLatestStatus = () => {
    if (statusTimeline.length > 0) {
      return statusTimeline[statusTimeline.length - 1]?.status ?? 'pending';
    }
    return String(requestStatus ?? 'pending');
  };

  const buildSteps = () => {
    const latest = getLatestStatus();
    const isRejected = latest === 'rejected';
    const normalized = latest === 'in_progress' ? 'assigned' : latest;
    const order = ['pending', isRejected ? 'rejected' : 'accepted', 'assigned', 'completed'];
    const currentIndex = order.indexOf(normalized);
    return order.map((key, index) => ({
      key,
      label: formatTimelineStatus(key),
      done: currentIndex >= index && currentIndex !== -1,
    }));
  };
  const steps = buildSteps();
  const currentIndex = useMemo(() => {
    const latest = getLatestStatus();
    const isRejected = latest === 'rejected';
    const normalized = latest === 'in_progress' ? 'assigned' : latest;
    const order = ['pending', isRejected ? 'rejected' : 'accepted', 'assigned', 'completed'];
    return order.indexOf(normalized);
  }, [statusTimeline, requestStatus]);
  const rowPadding = 6;
  const dotSize = 12;
  const lineHeight = 2;
  const lineTop = (dotSize - lineHeight) / 2;
  const stepCount = Math.max(steps.length, 1);
  const stepItemWidth = stepperWidth > 0 ? Math.max((stepperWidth - rowPadding * 2) / stepCount, 0) : 0;
  const lineInset = rowPadding + stepItemWidth / 2;
  const lineWidth = Math.max(stepperWidth - lineInset * 2, 0);
  const progressRatio = steps.length > 1 ? currentIndex / (steps.length - 1) : 0;
  const clampedProgress = Math.max(0, Math.min(1, progressRatio));
  const statusTimestamps = useMemo(() => {
    const map: Record<string, Date | null> = {};
    statusTimeline.forEach((item) => {
      const key = String(item.status ?? '');
      if (!map[key]) {
        map[key] = item.createdAt ?? null;
      }
    });
    return map;
  }, [statusTimeline]);
  const latestStatus = getLatestStatus();

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <CornerTriangles />
      <View style={[styles.headerWrap, { paddingTop: 12 }]}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={18} color={UI.colors.green} />
          </Pressable>
          <View>
            <Text style={styles.headerTitle}>Trip Details</Text>
            <Text style={styles.headerSubtitle}>Manage and track trip progress</Text>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView
        enabled
        behavior="padding"
        keyboardVerticalOffset={0}
        style={styles.keyboard}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled">
        {requestId && (
          <>
            <View style={styles.timelineCard}>
              <Text style={styles.timelineTitle}>Status Timeline</Text>
              <View style={styles.stepper} onLayout={(e) => setStepperWidth(e.nativeEvent.layout.width)}>
                <View style={[styles.stepperLine, { left: lineInset, width: lineWidth, top: lineTop }]} />
                {steps.length > 1 && currentIndex > 0 && (
                  <View
                    style={[
                      styles.stepperLineProgress,
                      latestStatus === 'rejected'
                        ? styles.stepperLineProgressDeclined
                        : styles.stepperLineProgressApproved,
                      { left: lineInset, width: lineWidth * clampedProgress, top: lineTop },
                    ]}
                  />
                )}
                <View style={styles.stepperRow}>
                  {steps.map((step) => {
                    const isDeclined = step.key === 'rejected';
                    const isApproved = step.key === 'accepted';
                    const isDone = step.done;
                    const isCurrentDeclined = latestStatus === 'rejected' && isDeclined;
                    const isCurrentApproved = latestStatus !== 'rejected' && isApproved && isDone;
                    const dotStyle = isCurrentDeclined
                      ? styles.stepCircleDeclined
                      : isCurrentApproved || isDone
                        ? styles.stepCircleDone
                        : styles.stepCirclePending;
                    const labelStyle = isCurrentDeclined
                      ? styles.stepLabelDeclined
                      : isCurrentApproved || isDone
                        ? styles.stepLabelDone
                        : styles.stepLabelPending;
                  const hasTime = Boolean(statusTimestamps[step.key]);
                  const dateText = hasTime
                    ? formatDate(statusTimestamps[step.key]!, { dateFormat: prefs.date_format })
                    : '--';
                  const timeText = hasTime
                    ? formatTime(statusTimestamps[step.key]!, { timeFormat: prefs.time_format })
                    : '--';
                  return (
                    <View key={step.key} style={styles.stepItem}>
                      <View style={[styles.stepCircle, dotStyle]} />
                      <Text style={[styles.stepLabel, labelStyle]}>{step.label}</Text>
                      <Text style={styles.stepDate}>{dateText}</Text>
                      <Text style={styles.stepTime}>{timeText}</Text>
                    </View>
                  );
                })}
                </View>
              </View>
            </View>

            <View style={styles.requestCard}>
              <Text style={styles.requestTitle}>Request Details</Text>
              <View style={styles.requestRow}>
                <Text style={styles.requestLabel}>Requester</Text>
                <Text style={styles.requestValue}>{requesterLabel}</Text>
              </View>
              <View style={styles.requestRow}>
                <Text style={styles.requestLabel}>Date</Text>
                <Text style={styles.requestValue}>{requestDateLabel}</Text>
              </View>
              <View style={styles.requestRow}>
                <Text style={styles.requestLabel}>Time</Text>
                <Text style={styles.requestValue}>{requestTimeLabel}</Text>
              </View>
              <View style={styles.requestRow}>
                <Text style={styles.requestLabel}>Departure</Text>
                <Text style={styles.requestValue}>{requestDeparture || 'Pending'}</Text>
              </View>
              <View style={styles.requestRow}>
                <Text style={styles.requestLabel}>Destination</Text>
                <Text style={styles.requestValue}>{requestDestination || 'Pending'}</Text>
              </View>
              <View style={styles.requestRow}>
                <Text style={styles.requestLabel}>Passengers</Text>
                <Text style={styles.requestValue}>{requestPassengerLabel}</Text>
              </View>
              <View style={styles.requestRow}>
                <Text style={styles.requestLabel}>Vehicle Type</Text>
                <Text style={styles.requestValue}>{requestVehicleTypeLabel}</Text>
              </View>
              <View style={styles.requestRow}>
                <Text style={styles.requestLabel}>Plate Number</Text>
                <Text style={styles.requestValue}>{requestPlateNumberLabel}</Text>
              </View>
            </View>
          </>
        )}
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
      </KeyboardAvoidingView>

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
          if (requestId) {
            try {
              await updateRequestStatus(requestId, 'completed');
              setRequestStatus('Completed');
            } catch {
              setAlertMessage('No internet connection. Changes not saved.');
              setTimeout(() => setAlertMessage(null), 3000);
            }
            return;
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
                let resolvedTripId = tripId ?? null;
                if (!resolvedTripId && requestId) {
                  try {
                    const req = await getRequest(requestId);
                    if (req?.trip?.trip_id) {
                      resolvedTripId = req.trip.trip_id;
                      setTripId(req.trip.trip_id);
                    }
                  } catch {
                    // ignore fetch error and fall through to warning
                  }
                }
                if (!resolvedTripId) {
                  if (requestId) {
                    setAlertMessage('Unable to find linked trip. Please reconnect to the request.');
                    setTimeout(() => setAlertMessage(null), 3000);
                    setIsSaved(false);
                    return;
                  }
                  resolvedTripId = `${Date.now()}`;
                  setTripId(resolvedTripId);
                }
                const payload = await buildTripPayload({}, resolvedTripId);
                if (payload) {
                  syncTrip(payload).then((saved) => {
                    if (!tripId && saved?.trip_id) {
                      setTripId(saved.trip_id);
                    }
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
  keyboard: {
    flex: 1,
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
  requestCard: {
    padding: 16,
    borderRadius: UI.radius.lg,
    backgroundColor: UI.colors.surface,
    borderWidth: 1,
    borderColor: UI.colors.border,
    gap: 10,
    ...UI.shadow.soft,
  },
  timelineCard: {
    padding: 16,
    borderRadius: UI.radius.lg,
    backgroundColor: UI.colors.surface,
    borderWidth: 1,
    borderColor: UI.colors.border,
    gap: 10,
    ...UI.shadow.soft,
  },
  requestTitle: {
    fontSize: 13,
    color: UI.colors.textMuted,
    fontFamily: UI.fonts.bodyMedium,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  requestRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  requestLabel: {
    fontSize: 12,
    color: UI.colors.textMuted,
    fontFamily: UI.fonts.body,
  },
  requestValue: {
    fontSize: 12,
    color: UI.colors.text,
    fontFamily: UI.fonts.bodyMedium,
    flex: 1,
    textAlign: 'right',
  },
  timelineWrap: {
    marginTop: 8,
    gap: 8,
  },
  timelineTitle: {
    fontSize: 12,
    color: UI.colors.textMuted,
    fontFamily: UI.fonts.bodyMedium,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  timelineEmpty: {
    fontSize: 12,
    color: UI.colors.textMuted,
    fontFamily: UI.fonts.body,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 6,
    backgroundColor: UI.colors.green,
  },
  timelineInfo: {
    flex: 1,
    gap: 2,
  },
  timelineStatus: {
    fontSize: 13,
    color: UI.colors.text,
    fontFamily: UI.fonts.bodyMedium,
  },
  timelineTime: {
    fontSize: 11,
    color: UI.colors.textMuted,
    fontFamily: UI.fonts.body,
  },
  stepper: {
    marginTop: 10,
    gap: 10,
    position: 'relative',
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    justifyContent: 'space-between',
  },
  stepItem: {
    alignItems: 'center',
    flex: 1,
  },
  stepperLine: {
    position: 'absolute',
    height: 2,
    backgroundColor: UI.colors.border,
  },
  stepperLineProgress: {
    position: 'absolute',
    height: 2,
  },
  stepperLineProgressApproved: {
    backgroundColor: UI.colors.green,
  },
  stepperLineProgressDeclined: {
    backgroundColor: UI.colors.danger,
  },
  stepIconWrap: {
    alignItems: 'center',
    width: '100%',
  },
  stepCircle: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
  stepCircleDone: {
    backgroundColor: UI.colors.green,
    borderColor: UI.colors.green,
  },
  stepCircleDeclined: {
    backgroundColor: UI.colors.danger,
    borderColor: UI.colors.danger,
  },
  stepCirclePending: {
    backgroundColor: UI.colors.surface,
    borderColor: UI.colors.border,
  },
  stepLabel: {
    fontSize: 11,
    marginTop: 8,
    textAlign: 'center',
    fontFamily: UI.fonts.bodyMedium,
  },
  stepLabelDone: {
    color: UI.colors.text,
  },
  stepLabelDeclined: {
    color: UI.colors.danger,
  },
  stepLabelPending: {
    color: UI.colors.textMuted,
  },
  stepTime: {
    marginTop: 2,
    fontSize: 10,
    textAlign: 'center',
    color: UI.colors.textMuted,
    fontFamily: UI.fonts.body,
    lineHeight: 14,
  },
  stepDate: {
    marginTop: 2,
    fontSize: 10,
    textAlign: 'center',
    color: UI.colors.textMuted,
    fontFamily: UI.fonts.body,
    lineHeight: 14,
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
