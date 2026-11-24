import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, Field, Pill, ScreenTitle, Tappable } from '@/components/ui';
import { track } from '@/lib/analytics';
import { AnalyticsEvent } from '@/lib/analyticsConfig';
import { auroraProbability, kpNeededForVisibility } from '@/lib/aurora';
import { DeviceLocation, getDeviceLocation, searchPlaces } from '@/lib/location';
import {
  addSavedLocation,
  getSavedLocations,
  removeSavedLocation,
  SavedLocation,
} from '@/lib/savedLocations';
import { CurrentConditions, getCurrentConditions } from '@/lib/spaceWeather';
import { colors, iconSize, layout, radii, shadows, space, textStyles, fontSize, fonts } from '@/theme';

function probabilityColor(p: number): string {
  if (p >= 70) return colors.severity.strong;
  if (p >= 50) return colors.severity.moderate;
  if (p >= 30) return colors.severity.minor;
  if (p >= 15) return colors.severity.active;
  return colors.textMuted;
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
    track(AnalyticsEvent.placeSaved, { source: 'device' });
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
    track(AnalyticsEvent.placeSaved, { source: 'search' });
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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textMuted} />
        }>
        <ScreenTitle title="Locations" subtitle="Aurora outlook for your spots" />

        {/* Add by current location */}
        <Card>
          <Button
            size="compact"
            label="📍 Add my current location"
            onPress={addCurrent}
            loading={adding}
          />
        </Card>

        {/* Search with floating suggestion dropdown */}
        <View style={styles.searchSection}>
          <Field
            icon="search"
            placeholder="Add a city or region…"
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={() => suggestions[0] && selectSuggestion(suggestions[0])}
            busy={searching}
            onClear={() => setQuery('')}
          />

          {query.trim().length >= 2 ? (
            <View style={styles.dropdownFloat}>
              {suggestions.length === 0 ? (
                <Text style={styles.dropEmpty}>{searching ? 'Searching…' : 'No matches found'}</Text>
              ) : (
                suggestions.map((s, i) => (
                  <Tappable
                    key={`${s.lat},${s.lng}`}
                    onPress={() => selectSuggestion(s)}
                    feedback="soft"
                    style={[styles.suggestion, i > 0 && styles.suggestionBorder]}>
                    <Ionicons name="location-outline" size={iconSize.sm} color={colors.textMuted} />
                    <Text style={styles.suggestionText} numberOfLines={1}>{s.label}</Text>
                  </Tappable>
                ))
              )}
            </View>
          ) : null}
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.accent} />
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
                  <Tappable onPress={() => remove(loc.id)} hitSlop={space[2.5]} feedback="none">
                    <Ionicons name="close-circle" size={iconSize.xl} color={colors.textFaint} />
                  </Tappable>
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
  content: { padding: layout.screenPadding, gap: layout.stackGap, paddingBottom: layout.tabBarClearance },
  center: { paddingVertical: layout.emptyStatePadding, alignItems: 'center' },
  searchSection: { position: 'relative', zIndex: 10 },
  dropdownFloat: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: space[1.5],
    zIndex: 20,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    paddingHorizontal: space[3.5],
    paddingVertical: space[1],
    ...shadows.floating,
  },
  dropEmpty: { ...textStyles.footnote, color: colors.textFaint, paddingVertical: space[3] },
  suggestion: { flexDirection: 'row', alignItems: 'center', gap: space[2.5], paddingVertical: space[3] },
  suggestionBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  suggestionText: { ...textStyles.bodyStrong, color: colors.text, flexShrink: 1 },
  locHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  locLeft: { gap: space[1], flexShrink: 1 },
  locName: { ...textStyles.cardTitle, color: colors.text },
  dim: { ...textStyles.footnote, color: colors.textMuted },
  chanceRow: { flexDirection: 'row', alignItems: 'baseline', gap: space[2], marginTop: space[3.5] },
  chance: { fontSize: fontSize.statLarge, fontFamily: fonts.bold },
  chanceLabel: { ...textStyles.subtitle, color: colors.textMuted, flex: 1 },
  note: { ...textStyles.caption, color: colors.textFaint, textAlign: 'center', marginTop: space[2] },
});
