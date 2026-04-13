import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { UI } from '@/constants/ui';
import type { Vehicle } from '@/utils/tripApi';
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';

interface PlateNumberModalProps {
  isOpen: boolean;
  onClose: () => void;
  plateNumber: string;
  setPlateNumber: (value: string) => void;
  setPlateNumberOther: (value: string) => void;
  plateNumberOptions: string[];
  fetchVehiclesPage?: (page: number, limit: number, search: string, vehicleType: string) => Promise<{ items: Vehicle[]; total: number | null }>;
  onSelectVehicle?: (vehicle: Vehicle | null) => void;
  selectedVehicleType?: string;
}

const PlateOption = React.memo(function PlateOption({
  item,
  selected,
  onPress,
}: {
  item: string;
  selected: boolean;
  onPress: (item: string) => void;
}) {
  return (
    <Pressable
      style={[
        styles.modalOption,
        selected ? styles.modalOptionSelected : null,
      ]}
      onPress={() => onPress(item)}>
      <View style={styles.modalOptionContent}>
        <Text
          style={[
            styles.modalOptionText,
            selected ? styles.modalOptionTextSelected : null,
          ]}>
          {item}
        </Text>
        {selected && (
          <Ionicons
            name="checkmark"
            size={18}
            color={UI.colors.greenDark}
          />
        )}
      </View>
    </Pressable>
  );
});

export function PlateNumberModal({
  isOpen,
  onClose,
  plateNumber,
  setPlateNumber,
  setPlateNumberOther,
  plateNumberOptions,
  fetchVehiclesPage,
  onSelectVehicle,
  selectedVehicleType = '',
}: PlateNumberModalProps) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const [plateSearch, setPlateSearch] = React.useState('');
  const [vehicles, setVehicles] = React.useState<Vehicle[]>([]);
  const [page, setPage] = React.useState(1);
  const [totalCount, setTotalCount] = React.useState<number | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [lastBatchSize, setLastBatchSize] = React.useState(0);
  const [lastAddedCount, setLastAddedCount] = React.useState(0);
  const [endReached, setEndReached] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const requestIdRef = React.useRef(0);
  const endReachedDuringMomentum = React.useRef(false);

  const fetchMode = Boolean(fetchVehiclesPage);

  const filteredPlateNumbers = React.useMemo(() => {
    const query = plateSearch.trim().toLowerCase();
    if (!query) {
      return plateNumberOptions;
    }
    return plateNumberOptions.filter((option) =>
      option.toLowerCase().includes(query)
    );
  }, [plateNumberOptions, plateSearch]);

  const plateSearchActive = plateSearch.trim().length > 0;
  const hasOtherPlateOption = plateNumberOptions.includes('Other') || fetchMode;
  const plateListData = fetchMode
    ? vehicles
        .map((v) => v.plate_number)
        .filter(Boolean)
        .filter((option, index, arr) => arr.indexOf(option) === index)
    : (plateSearchActive ? filteredPlateNumbers : plateNumberOptions)
        .filter((option) => option !== 'Other');
  const plateResultCount = fetchMode
    ? plateListData.length
    : filteredPlateNumbers.length;
  const plateResultLabel = plateSearchActive
    ? `${totalCount ?? plateResultCount} result${(totalCount ?? plateResultCount) === 1 ? '' : 's'}`
    : `Showing ${plateListData.length} of ${totalCount ?? plateListData.length}`;
  const showSearchHint = !plateSearchActive && (totalCount ?? plateListData.length) > 50;
  const plateVehicleMap = React.useMemo(() => {
    const map = new Map<string, Vehicle>();
    vehicles.forEach((v) => {
      if (v.plate_number && !map.has(v.plate_number)) {
        map.set(v.plate_number, v);
      }
    });
    return map;
  }, [vehicles]);
  const availableHeight = windowHeight - insets.top;
  const modalSheetInset = Math.max(insets.left, insets.right, 8);
  const modalSheetWidth = Math.max(0, windowWidth - modalSheetInset * 2);
  const modalSheetHeight = Math.min(availableHeight * 0.82, 640);
  const modalSheetOffset = 0;

  const loadPage = React.useCallback(
    async (nextPage: number, search: string, append: boolean) => {
      if (!fetchVehiclesPage) return;
      const requestId = ++requestIdRef.current;
      append ? setLoadingMore(true) : setLoading(true);
      try {
        setLoadError(null);
        const { items, total } = await fetchVehiclesPage(nextPage, 50, search, selectedVehicleType);
        if (requestId !== requestIdRef.current) return;
        setTotalCount(total);
        setLastBatchSize(items.length);
        if (append) {
          let addedCount = 0;
          setVehicles((prev) => {
            const seen = new Set(prev.map((v) => v.plate_number));
            const next = items.filter((v) => !seen.has(v.plate_number));
            addedCount = next.length;
            return [...prev, ...next];
          });
          setLastAddedCount(addedCount);
          if (items.length === 0 || addedCount === 0) {
            setEndReached(true);
          }
        } else {
          setVehicles(items);
          setLastAddedCount(items.length);
          setEndReached(false);
        }
        setPage(nextPage);
      } catch (err: any) {
        if (requestId !== requestIdRef.current) return;
        const message = err?.message || 'Failed to fetch vehicles';
        setLoadError(message);
        setLastBatchSize(0);
        setLastAddedCount(0);
        if (append) {
          setEndReached(true);
        }
      } finally {
        append ? setLoadingMore(false) : setLoading(false);
      }
    },
    [fetchVehiclesPage, selectedVehicleType]
  );

  React.useEffect(() => {
    if (!fetchMode || !isOpen) return;
    const query = plateSearch.trim();
    const handle = setTimeout(() => {
      loadPage(1, query, false);
    }, 250);
    return () => clearTimeout(handle);
  }, [fetchMode, isOpen, plateSearch, loadPage, selectedVehicleType]);

  const handleClose = () => {
    setPlateSearch('');
    setVehicles([]);
    setPage(1);
    setTotalCount(null);
    setLastBatchSize(0);
    setLastAddedCount(0);
    setEndReached(false);
    setLoadError(null);
    onClose();
  };

  const canLoadMore = fetchMode && !loadingMore && !loading && !endReached && (
    totalCount !== null ? vehicles.length < totalCount : lastBatchSize === 50
  ) && (page === 1 || lastAddedCount > 0);

  const handleSelectPlate = React.useCallback((item: string) => {
    setPlateNumber(item);
    if (item !== 'Other') {
      setPlateNumberOther('');
    }
    onSelectVehicle?.(plateVehicleMap.get(item) ?? null);
    handleClose();
  }, [handleClose, onSelectVehicle, plateVehicleMap, setPlateNumber, setPlateNumberOther]);

  const renderItem = React.useCallback(({ item }: { item: string }) => (
    <PlateOption
      item={item}
      selected={plateNumber === item}
      onPress={handleSelectPlate}
    />
  ), [handleSelectPlate, plateNumber]);

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="slide"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={handleClose}>
      <View style={styles.modalBackdrop}>
        <Pressable style={styles.modalScrim} onPress={handleClose} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={[
            styles.modalSheet,
            {
              height: modalSheetHeight,
              width: modalSheetWidth,
              paddingBottom: insets.bottom + 16,
              marginBottom: modalSheetOffset,
            },
          ]}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Plate Number</Text>
            <Pressable style={styles.modalClose} onPress={handleClose}>
              <Ionicons name="close" size={18} color={UI.colors.textMuted} />
            </Pressable>
          </View>
          <View style={styles.modalMetaRow}>
            <Text style={styles.modalMetaText}>{plateResultLabel}</Text>
            {plateSearchActive && (
              <Pressable
                style={styles.clearFilter}
                onPress={() => setPlateSearch('')}>
                <Text style={styles.clearFilterText}>Clear</Text>
              </Pressable>
            )}
          </View>
          <View style={styles.searchInputWrap}>
            <Ionicons name="search" size={16} color={UI.colors.textMuted} />
            <TextInput
              placeholder="Search plate number"
              placeholderTextColor={UI.colors.placeholder}
              style={styles.searchInput}
              value={plateSearch}
              onChangeText={setPlateSearch}
              selectionColor={UI.colors.green}
              autoFocus
            />
            {plateSearch.length > 0 && (
              <Pressable
                style={styles.searchClear}
                onPress={() => setPlateSearch('')}>
                <Ionicons
                  name="close-circle"
                  size={18}
                  color={UI.colors.textMuted}
                />
              </Pressable>
            )}
          </View>
          {showSearchHint && (
            <Text style={styles.searchHint}>
              Type to search all {totalCount ? totalCount : '...'} plate numbers
            </Text>
          )}
          {hasOtherPlateOption && (
            <Pressable
              style={[
                styles.modalOption,
                plateNumber === 'Other' ? styles.modalOptionSelected : null,
                styles.otherQuickOption,
              ]}
              onPress={() => {
                setPlateNumber('Other');
                onSelectVehicle?.(null);
                handleClose();
              }}>
              <View style={styles.modalOptionContent}>
                <Text
                  style={[
                    styles.modalOptionText,
                    plateNumber === 'Other' ? styles.modalOptionTextSelected : null,
                  ]}>
                  Other
                </Text>
                {plateNumber === 'Other' && (
                  <Ionicons name="checkmark" size={18} color={UI.colors.greenDark} />
                )}
              </View>
            </Pressable>
          )}
          <View style={styles.modalListWrap}>
            <FlatList
              data={plateListData}
              keyExtractor={(item) => item}
              contentContainerStyle={styles.modalList}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              initialNumToRender={20}
              maxToRenderPerBatch={20}
              updateCellsBatchingPeriod={50}
              windowSize={7}
              removeClippedSubviews
              onEndReached={() => {
                if (endReachedDuringMomentum.current) return;
                if (canLoadMore) {
                  endReachedDuringMomentum.current = true;
                  loadPage(page + 1, plateSearch.trim(), true);
                }
              }}
              onEndReachedThreshold={0.6}
              onMomentumScrollBegin={() => {
                endReachedDuringMomentum.current = false;
              }}
              ListFooterComponent={
                loadingMore ? (
                  <View style={styles.loadingFooter}>
                    <Text style={styles.loadingFooterText}>Loading more...</Text>
                  </View>
                ) : null
              }
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Ionicons
                    name={loadError ? 'alert-circle-outline' : 'search-outline'}
                    size={20}
                    color={UI.colors.textMuted}
                  />
                  <Text style={styles.emptyStateText}>
                    {loadError ? loadError : 'No plate numbers found'}
                  </Text>
                </View>
              }
              renderItem={renderItem}
            />
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modalScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8, 15, 28, 0.55)',
  },
  modalSheet: {
    backgroundColor: UI.colors.surface,
    borderTopLeftRadius: UI.radius.xl,
    borderTopRightRadius: UI.radius.xl,
    borderTopWidth: 1,
    borderColor: UI.colors.borderStrong,
    paddingTop: 12,
    paddingHorizontal: 18,
    maxWidth: '100%',
    ...UI.shadow.medium,
  },
  modalHandle: {
    width: 42,
    height: 4,
    borderRadius: UI.radius.pill,
    backgroundColor: UI.colors.borderStrong,
    alignSelf: 'center',
    marginBottom: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  modalMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  modalMetaText: {
    fontSize: 12,
    color: UI.colors.textMuted,
    fontFamily: UI.fonts.body,
  },
  clearFilter: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: UI.radius.pill,
    backgroundColor: UI.colors.surfaceAlt,
  },
  clearFilterText: {
    fontSize: 12,
    color: UI.colors.textMuted,
    fontFamily: UI.fonts.bodyMedium,
  },
  modalTitle: {
    fontSize: 16,
    color: UI.colors.text,
    fontFamily: UI.fonts.bodyMedium,
    letterSpacing: 0.2,
  },
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: UI.colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInputWrap: {
    height: 48,
    borderWidth: 1,
    borderColor: UI.colors.border,
    borderRadius: UI.radius.md,
    paddingHorizontal: 12,
    paddingRight: 10,
    backgroundColor: UI.colors.inputBackground,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: UI.colors.text,
    fontFamily: UI.fonts.body,
    fontSize: 14,
    paddingVertical: 0,
  },
  searchClear: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchHint: {
    marginTop: 8,
    fontSize: 12,
    color: UI.colors.textMuted,
    fontFamily: UI.fonts.body,
  },
  modalListWrap: {
    flex: 1,
  },
  modalList: {
    paddingTop: 14,
    paddingBottom: 8,
    gap: 10,
  },
  modalOption: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: UI.radius.lg,
    borderWidth: 1,
    borderColor: UI.colors.border,
    backgroundColor: UI.colors.surface,
  },
  modalOptionSelected: {
    borderColor: UI.colors.greenDark,
    backgroundColor: UI.colors.greenSoft,
  },
  otherQuickOption: {
    marginTop: 10,
    marginBottom: 6,
  },
  modalOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalOptionText: {
    fontSize: 14,
    color: UI.colors.text,
    fontFamily: UI.fonts.bodyMedium,
  },
  modalOptionTextSelected: {
    color: UI.colors.greenDark,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 6,
  },
  emptyStateText: {
    fontSize: 13,
    color: UI.colors.textMuted,
    fontFamily: UI.fonts.body,
  },
  loadingFooter: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  loadingFooterText: {
    fontSize: 12,
    color: UI.colors.textMuted,
    fontFamily: UI.fonts.body,
  },
});
