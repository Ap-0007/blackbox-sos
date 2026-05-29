import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Linking, ActivityIndicator, ScrollView, RefreshControl,
} from 'react-native';
import * as Location from 'expo-location';
import {
  getAllNearby, categoryLabel, categoryIcon,
  type NearbyPlace, type ServiceCategory,
} from '../services/NearbyServices';
import { getCountryCode } from '../services/NearbyServices';
import { getEmergencyNumbers } from '../constants/emergencyNumbers';

const CATEGORIES: ServiceCategory[] = [
  'hospital', 'police', 'ambulance_station',
  'towing', 'puncture_shop', 'car_showroom',
  'fire_station', 'pharmacy',
];

const CAT_COLORS: Record<ServiceCategory, string> = {
  hospital:          '#FF2D2D',
  police:            '#1a4aff',
  ambulance_station: '#FF2D2D',
  towing:            '#FF8C00',
  puncture_shop:     '#FF8C00',
  car_showroom:      '#888',
  fire_station:      '#FF4500',
  pharmacy:          '#00CC88',
};

export default function NearbyServicesScreen() {
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [fromCache, setFromCache]     = useState(false);
  const [results, setResults]         = useState<Record<ServiceCategory, NearbyPlace[]>>({} as any);
  const [activeFilter, setActiveFilter] = useState<ServiceCategory | 'all'>('all');
  const [emergencyNums, setEmergencyNums] = useState({ ambulance: '112', police: '112', fire: '112', unified: '112', name: '' });
  const [userLoc, setUserLoc]         = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError]             = useState<string | null>(null);

  const load = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setError('Location permission denied'); return; }

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude: lat, longitude: lng } = loc.coords;
      setUserLoc({ lat, lng });

      const [{ results: r, fromCache: fc }, countryCode] = await Promise.all([
        getAllNearby(lat, lng),
        getCountryCode(lat, lng),
      ]);
      setResults(r);
      setFromCache(fc);
      setEmergencyNums(getEmergencyNumbers(countryCode) as any);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, []);

  // Flatten + filter for list view
  const allPlaces: NearbyPlace[] = CATEGORIES
    .flatMap((c) => (results[c] ?? []).slice(0, 3))
    .filter((p) => activeFilter === 'all' || p.category === activeFilter)
    .sort((a, b) => a.distanceKm - b.distanceKm);

  function call(number: string) {
    Linking.openURL(`tel:${number.replace(/\s/g, '')}`);
  }

  function navigate(p: NearbyPlace) {
    Linking.openURL(`https://maps.google.com/?q=${p.lat},${p.lng}`);
  }

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color="#00FF88" />
        <Text style={s.loadingText}>Finding nearby services…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={s.center}>
        <Text style={s.errorText}>{error}</Text>
        <TouchableOpacity style={s.retryBtn} onPress={() => load()}>
          <Text style={s.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={s.container}>
      {/* Emergency numbers bar */}
      <View style={s.emergencyBar}>
        <Text style={s.emergencyTitle}>
          {emergencyNums.name ? `Emergency · ${emergencyNums.name}` : 'Emergency Numbers'}
        </Text>
        <View style={s.emergencyBtns}>
          <EmergencyBtn label="Ambulance" number={emergencyNums.ambulance} color="#FF2D2D" onPress={call} />
          <EmergencyBtn label="Police"    number={emergencyNums.police}    color="#1a4aff" onPress={call} />
          <EmergencyBtn label="Fire"      number={emergencyNums.fire}      color="#FF4500" onPress={call} />
        </View>
      </View>

      {fromCache && (
        <View style={s.cacheBar}>
          <Text style={s.cacheText}>📴 Offline — showing cached data</Text>
          <TouchableOpacity onPress={() => load(true)}>
            <Text style={s.cacheRefresh}>Refresh</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Category filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterScroll} contentContainerStyle={s.filterRow}>
        <FilterChip label="All" active={activeFilter === 'all'} color="#fff" onPress={() => setActiveFilter('all')} />
        {CATEGORIES.map((c) => (
          <FilterChip
            key={c}
            label={`${categoryIcon(c)} ${categoryLabel(c)}`}
            active={activeFilter === c}
            color={CAT_COLORS[c]}
            count={(results[c] ?? []).length}
            onPress={() => setActiveFilter(c)}
          />
        ))}
      </ScrollView>

      {/* Results list */}
      <FlatList
        data={allPlaces}
        keyExtractor={(p) => p.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#00FF88" />}
        contentContainerStyle={{ paddingBottom: 32 }}
        ListEmptyComponent={
          <View style={s.emptyBox}>
            <Text style={s.emptyText}>No services found nearby.</Text>
            <Text style={s.emptySubtext}>Try increasing search radius or check connection.</Text>
          </View>
        }
        renderItem={({ item: p }) => (
          <View style={s.card}>
            <View style={s.cardLeft}>
              <View style={[s.iconBox, { backgroundColor: CAT_COLORS[p.category] + '22' }]}>
                <Text style={s.iconText}>{categoryIcon(p.category)}</Text>
              </View>
              <View style={s.cardInfo}>
                <Text style={s.cardName} numberOfLines={1}>{p.name}</Text>
                <Text style={s.cardMeta}>
                  {categoryLabel(p.category)} · {p.distanceKm < 1
                    ? `${Math.round(p.distanceKm * 1000)}m`
                    : `${p.distanceKm.toFixed(1)}km`}
                </Text>
                {p.address && <Text style={s.cardAddr} numberOfLines={1}>{p.address}</Text>}
              </View>
            </View>
            <View style={s.cardActions}>
              {p.phone && (
                <TouchableOpacity style={[s.actionBtn, { backgroundColor: CAT_COLORS[p.category] + '22' }]} onPress={() => call(p.phone!)}>
                  <Text style={[s.actionBtnText, { color: CAT_COLORS[p.category] }]}>Call</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={s.actionBtn} onPress={() => navigate(p)}>
                <Text style={s.actionBtnText}>Map</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
}

function EmergencyBtn({ label, number, color, onPress }: { label: string; number: string; color: string; onPress: (n: string) => void }) {
  return (
    <TouchableOpacity style={[s.emergencyBtn, { borderColor: color + '66' }]} onPress={() => onPress(number)}>
      <Text style={[s.emergencyBtnNum, { color }]}>{number}</Text>
      <Text style={s.emergencyBtnLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function FilterChip({ label, active, color, count, onPress }: { label: string; active: boolean; color: string; count?: number; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[s.chip, active && { backgroundColor: color + '22', borderColor: color + '88' }]}
      onPress={onPress}
    >
      <Text style={[s.chipText, active && { color }]}>{label}</Text>
      {count !== undefined && count > 0 && (
        <Text style={[s.chipCount, active && { color }]}>{count}</Text>
      )}
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#0a0a0a' },
  center:         { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0a0a0a', gap: 12 },
  loadingText:    { color: '#555', fontSize: 14 },
  errorText:      { color: '#FF2D2D', fontSize: 14 },
  retryBtn:       { backgroundColor: '#1a1a1a', borderRadius: 8, padding: 10, paddingHorizontal: 20 },
  retryText:      { color: '#fff', fontWeight: '700' },

  emergencyBar:   { backgroundColor: '#120505', borderBottomWidth: 1, borderBottomColor: '#2a0a0a', padding: 14 },
  emergencyTitle: { color: '#888', fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 },
  emergencyBtns:  { flexDirection: 'row', gap: 8 },
  emergencyBtn:   { flex: 1, backgroundColor: '#1a1a1a', borderRadius: 10, padding: 10, alignItems: 'center', borderWidth: 1 },
  emergencyBtnNum:{ fontSize: 18, fontWeight: '900' },
  emergencyBtnLabel: { color: '#666', fontSize: 10, marginTop: 2 },

  cacheBar:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1a1500', paddingHorizontal: 16, paddingVertical: 8 },
  cacheText:      { color: '#FFD700', fontSize: 12 },
  cacheRefresh:   { color: '#FFD700', fontSize: 12, fontWeight: '700', textDecorationLine: 'underline' },

  filterScroll:   { flexGrow: 0 },
  filterRow:      { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  chip:           { backgroundColor: '#1a1a1a', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: '#2a2a2a', flexDirection: 'row', alignItems: 'center', gap: 5 },
  chipText:       { color: '#888', fontSize: 12, fontWeight: '600' },
  chipCount:      { color: '#666', fontSize: 11, fontWeight: '700' },

  card:           { flexDirection: 'row', alignItems: 'center', backgroundColor: '#141414', marginHorizontal: 12, marginBottom: 8, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#1e1e1e' },
  cardLeft:       { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, overflow: 'hidden' },
  iconBox:        { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  iconText:       { fontSize: 20 },
  cardInfo:       { flex: 1 },
  cardName:       { color: '#fff', fontSize: 14, fontWeight: '600', marginBottom: 2 },
  cardMeta:       { color: '#666', fontSize: 12 },
  cardAddr:       { color: '#444', fontSize: 11, marginTop: 2 },
  cardActions:    { flexDirection: 'row', gap: 6, flexShrink: 0 },
  actionBtn:      { backgroundColor: '#1e1e1e', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  actionBtnText:  { color: '#aaa', fontSize: 12, fontWeight: '700' },

  emptyBox:       { alignItems: 'center', paddingTop: 48, gap: 6 },
  emptyText:      { color: '#555', fontSize: 15 },
  emptySubtext:   { color: '#333', fontSize: 13 },
});
