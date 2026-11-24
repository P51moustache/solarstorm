import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HorizonScene } from '@/components/tonight/HorizonScene';
import { HourStrip } from '@/components/tonight/HourStrip';
import { PlaceSwitcher } from '@/components/tonight/PlaceSwitcher';
import { WhatsUp } from '@/components/tonight/WhatsUp';
import { Button, Glass, ScoreRing } from '@/components/ui';
import { useTonight } from '@/lib/useTonight';
import { useTonightPlaces } from '@/lib/tonightPlace';
import { colors, componentSize, iconSize, layout, motion, space, textStyles } from '@/theme';

/** Tonight: is the sky good where I am, and when? The app's main screen. */
export default function TonightScreen() {
  const insets = useSafeAreaInsets();
  const places = useTonightPlaces();
  const { tonight, clock, dateLabel, loading, refresh } = useTonight(places.place);
  const [refreshing, setRefreshing] = useState(false);
  const [locDenied, setLocDenied] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refresh(), places.reload()]);
    setRefreshing(false);
  }, [refresh, places]);

  const onChoose = (id: string) => {
    motion.haptics.select();
    places.choose(id);
  };
  const onLocate = async () => setLocDenied(!(await places.locateMe()));
  const openPlaces = () => router.push('/locations');

  const noPlace = !places.loading && !places.place;

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textMuted} />}>
      <View style={[styles.sky, { paddingTop: insets.top }]}>
        <HorizonScene aurora={tonight?.auroraGlow ?? false} />

        <View style={styles.brand}>
          <Ionicons name="sparkles" size={iconSize.md} color={colors.aurora.violet} />
          <Text style={styles.brandText}>SolarStorm</Text>
        </View>

        <View style={styles.hero}>
          <View style={styles.heroText}>
            <Text style={styles.title} accessibilityRole="header">
              Tonight
            </Text>
            <PlaceSwitcher place={places.place} choices={places.choices} onChoose={onChoose} onAddPlace={openPlaces} />
            <Text style={styles.date}>{dateLabel}</Text>
          </View>
          <ScoreRing score={tonight ? tonight.plan.score : null} label="Sky Score" />
        </View>

        {tonight ? (
          <View style={styles.headline}>
            <Text style={styles.headlineTitle}>{tonight.headline.title}</Text>
            {tonight.headline.detail ? <Text style={styles.headlineDetail}>{tonight.headline.detail}</Text> : null}
          </View>
        ) : null}
      </View>

      <View style={styles.cards}>
        {noPlace ? (
          <Glass>
            <Text style={styles.setupTitle}>Where are you watching from?</Text>
            <Text style={styles.setupText}>
              Tonight plans the sky for one place: your location or a place you saved.
            </Text>
            <Button label="Use my location" onPress={onLocate} loading={places.locating} style={styles.setupButton} />
            <Button label="Add a place" variant="secondary" onPress={openPlaces} style={styles.setupButton} />
            {locDenied ? (
              <Text style={styles.setupText}>Location is off. Turn it on in Settings, or add a place.</Text>
            ) : null}
          </Glass>
        ) : !tonight ? (
          <ActivityIndicator color={colors.textMuted} style={styles.loading} />
        ) : (
          <>
            <Glass>
              <HourStrip hours={tonight.hours} bounds={tonight.plan.bounds} moon={tonight.moon} clock={clock} />
              {loading ? <ActivityIndicator color={colors.textMuted} style={styles.stripLoading} /> : null}
            </Glass>
            <WhatsUp events={tonight.events} onOpen={{ aurora: () => router.push('/aurora') }} />
          </>
        )}
        <Text style={styles.source}>Open-Meteo · astronomy-engine · NOAA SWPC</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: layout.tabBarClearance },
  /** The hero over the horizon art; its bottom padding is where the ridges show. */
  sky: { paddingBottom: componentSize.horizonLand },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[1.5],
    paddingVertical: space[2],
  },
  brandText: { ...textStyles.cardTitle, color: colors.text },
  hero: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space[3],
    paddingHorizontal: layout.screenPadding,
    marginTop: space[2],
  },
  heroText: { flex: 1, gap: space[1] },
  title: { ...textStyles.screenTitle, color: colors.text },
  date: { ...textStyles.footnote, color: colors.textMuted },
  headline: {
    marginTop: space[6],
    marginHorizontal: layout.screenPadding,
    paddingLeft: space[3],
    borderLeftWidth: componentSize.accentBar,
    borderLeftColor: colors.night.window,
    gap: space[1.5],
  },
  headlineTitle: { ...textStyles.heroHeadline, color: colors.text },
  headlineDetail: { ...textStyles.bodyLarge, color: colors.textMuted },
  cards: { paddingHorizontal: layout.screenPadding, gap: layout.stackGap },
  setupTitle: { ...textStyles.cardTitle, color: colors.text },
  setupText: {
    ...textStyles.footnote,
    color: colors.textMuted,
    marginTop: space[1.5],
  },
  setupButton: { marginTop: space[3] },
  loading: { marginTop: space[6] },
  stripLoading: { position: 'absolute', top: space[4.5], alignSelf: 'center' },
  source: {
    ...textStyles.caption,
    color: colors.textFaint,
    textAlign: 'center',
    marginTop: space[2],
  },
});
