import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card, Pill, ScreenTitle } from '@/components/ui-kit';
import { Fonts, kpScale, Palette } from '@/constants/solar';
import { auroraProbability, kpNeededForVisibility } from '@/lib/aurora';
import { DeviceLocation, getDeviceLocation, searchPlaces } from '@/lib/location';
import {
  addSavedLocation,
  getSavedLocations,
  removeSavedLocation,
  SavedLocation,
} from '@/lib/savedLocations';
import { CurrentConditions, getCurrentConditions } from '@/lib/spaceWeather';

function probabilityColor(p: number): string {
  if (p >= 70) return '#FF6B5B';
  if (p >= 50) return '#FF9F43';
  if (p >= 30) return '#F1C40F';
  if (p >= 15) return '#7FD17F';
  return Palette.textDim;
}

export default function LocationsScreen() {
  const [locations, setLocations] = useState<SavedLocation[]>([]);
  const [conditions, setConditions] = useState<CurrentConditions | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<DeviceLocation[]>([]);
  const [searching, setSearching] = useState(false);

  const loadConditions = useCallback(async () => {
    const c = await getCurrentConditions().catch(() => null);
    setConditions(c);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    Promise.all([getSavedLocations(), getCurrentConditions().catch(() => null)]).then(
      ([locs, c]) => {
        setLocations(locs);
        setConditions(c);
        setLoading(false);
      }
    );
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadConditions();
  }, [loadConditions]);

  async function addCurrent() {
    setAdding(true);
    const loc = await getDeviceLocation();
    setAdding(false);
    if (!loc) {
      Alert.alert('Location unavailable', 'Enable location access in Settings to add your spot.');
      return;
    }
    setLocations(await addSavedLocation({ label: loc.label, lat: loc.lat, lng: loc.lng }));
  }

  // Debounced live search as the user types.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      const res = await searchPlaces(q);
      setSuggestions(res);
      setSearching(false);
    }, 280);
    return () => clearTimeout(t);
  }, [query]);

  async function selectSuggestion(s: DeviceLocation) {
    Keyboard.dismiss();
    setQuery('');
    setSuggestions([]);
    setLocations(await addSavedLocation({ label: s.label, lat: s.lat, lng: s.lng }));
  }

  async function remove(id: string) {
    setLocations(await removeSavedLocation(id));
  }

  const kp = conditions?.kp ?? null;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Palette.textDim} />
        }>
        <ScreenTitle title="Locations" subtitle="Aurora outlook for your spots" />

        {/* Add by current location */}
        <Card>
          <Pressable
            style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
            onPress={addCurrent}
            disabled={adding}>
            {adding ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>📍 Add my current location</Text>
            )}
          </Pressable>
        </Card>

        {/* Search with floating suggestion dropdown */}
        <View style={styles.searchSection}>
          <View style={styles.searchWrap}>
            <Ionicons name="search" size={18} color={Palette.textFaint} />
            <TextInput
              style={styles.input}
              placeholder="Add a city or region…"
              placeholderTextColor={Palette.textFaint}
              value={query}
              onChangeText={setQuery}
              autoCorrect={false}
              returnKeyType="search"
              onSubmitEditing={() => suggestions[0] && selectSuggestion(suggestions[0])}
            />
            {searching ? (
              <ActivityIndicator color={Palette.textFaint} />
            ) : query.length > 0 ? (
              <Pressable onPress={() => setQuery('')} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color={Palette.textFaint} />
              </Pressable>
            ) : null}
          </View>

          {query.trim().length >= 2 ? (
            <View style={styles.dropdownFloat}>
              {suggestions.length === 0 ? (
                <Text style={styles.dropEmpty}>{searching ? 'Searching…' : 'No matches found'}</Text>
              ) : (
                suggestions.map((s, i) => (
                  <Pressable
                    key={`${s.lat},${s.lng}`}
                    onPress={() => selectSuggestion(s)}
                    style={({ pressed }) => [
                      styles.suggestion,
                      i > 0 && styles.suggestionBorder,
                      pressed && styles.suggestionPressed,
                    ]}>
                    <Ionicons name="location-outline" size={16} color={Palette.textDim} />
                    <Text style={styles.suggestionText} numberOfLines={1}>{s.label}</Text>
                  </Pressable>
                ))
              )}
            </View>
          ) : null}
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={Palette.accent} />
          </View>
        ) : locations.length === 0 ? (
          <Card>
            <Text style={styles.dim}>
              No saved locations yet. Add your spot to see its live aurora chance and the storm
              strength needed to see the lights there.
            </Text>
          </Card>
        ) : (
          locations.map((loc) => {
            const needed = kpNeededForVisibility(loc.lat, loc.lng);
            const pred =
              kp !== null
                ? auroraProbability(
                    loc.lat,
                    loc.lng,
                    kp,
                    conditions?.solarWind.bz ?? null,
                    conditions?.solarWind.speed ?? null
                  )
                : null;
            return (
              <Card key={loc.id}>
                <View style={styles.locHead}>
                  <View style={styles.locLeft}>
                    <Text style={styles.locName}>{loc.label}</Text>
                    <Text style={styles.dim}>
                      {needed === null ? 'Aurora rarely reaches here' : `Visible at Kp ${needed}+`}
                    </Text>
                  </View>
                  <Pressable onPress={() => remove(loc.id)} hitSlop={10}>
                    <Ionicons name="close-circle" size={22} color={Palette.textFaint} />
                  </Pressable>
                </View>
                {pred ? (
                  <View style={styles.chanceRow}>
                    <Text style={[styles.chance, { color: probabilityColor(pred.probability) }]}>
                      {pred.probability}%
                    </Text>
                    <Text style={styles.chanceLabel}>chance tonight</Text>
                    {needed !== null && kp !== null && kp >= needed ? (
                      <Pill text="Oval overhead" color={probabilityColor(pred.probability)} />
                    ) : null}
                  </View>
                ) : null}
              </Card>
            );
          })
        )}

        <Text style={styles.note}>
          Saved on this device. Cloud sync across your devices comes with account sync.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: 16, gap: 12, paddingBottom: 120 },
  center: { paddingVertical: 50, alignItems: 'center' },
  primaryBtn: {
    backgroundColor: Palette.accent,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontSize: 15, fontFamily: Fonts.bold },
  pressed: { opacity: 0.7 },
  searchSection: { position: 'relative', zIndex: 10 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Palette.surfaceAlt,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Palette.border,
  },
  input: { flex: 1, color: Palette.text, fontSize: 15, fontFamily: Fonts.regular, padding: 0 },
  dropdownFloat: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 6,
    zIndex: 20,
    backgroundColor: '#161A24',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 14,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  dropEmpty: { color: Palette.textFaint, fontSize: 13, fontFamily: Fonts.regular, paddingVertical: 12 },
  suggestion: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  suggestionBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Palette.border },
  suggestionPressed: { opacity: 0.6 },
  suggestionText: { color: Palette.text, fontSize: 15, fontFamily: Fonts.medium, flexShrink: 1 },
  locHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  locLeft: { gap: 3, flexShrink: 1 },
  locName: { color: Palette.text, fontSize: 17, fontFamily: Fonts.bold },
  dim: { color: Palette.textDim, fontSize: 13, fontFamily: Fonts.regular },
  chanceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 14 },
  chance: { fontSize: 32, fontFamily: Fonts.bold },
  chanceLabel: { color: Palette.textDim, fontSize: 14, fontFamily: Fonts.regular, flex: 1 },
  note: { color: Palette.textFaint, fontSize: 12, fontFamily: Fonts.regular, textAlign: 'center', marginTop: 8 },
});
