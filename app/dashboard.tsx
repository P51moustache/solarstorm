import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, router } from 'expo-router';
import React from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    RefreshControl,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

import { AlertBanner } from '@/components/AlertBanner';
import { AuroraHeatmap } from '@/components/AuroraHeatmap';
import { KpMiniTrend } from '@/components/KpMiniTrend';
import { KpTile } from '@/components/KpTile';
import { KpTrendLine } from '@/components/KpTrendLine';
import { KpiCard } from '@/components/KpiCard';
import { Section } from '@/components/Section';
import { getKpHistory } from '@/lib/api/swpc';
import { useAuthStore } from '@/lib/state/useAuthStore';
import { useAuroraChance, useLatestUpdateTime, useSolarStormStore } from '@/lib/state/useStore';
import { COLORS, RADIUS, SPACING, getAuroraChanceColor } from '@/lib/util/colors';

const { width: screenWidth } = Dimensions.get('window');

export default function HomeScreen() {
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();

  const {
    kp,
    kpUpdatedAt,
    bz,
    speed,
    density,
    alerts,
    isLoading,
    error,
    refreshAll,
  } = useSolarStormStore();

  // Auth guard - show loading while checking auth
  if (authLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00D084" />
      </View>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  const auroraChance = useAuroraChance();
  const latestUpdateTime = useLatestUpdateTime();
  // Compute content width (accounts for page padding) and half widths for mini cards
  const contentWidth = screenWidth - SPACING.xl * 2;
  const miniCardGap = SPACING.md;
  const miniCardWidth = (contentWidth - miniCardGap) / 2;
  
  const [kpHistoryData, setKpHistoryData] = React.useState<Array<{ kp: number; at: string }>>([]);
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  // Fetch Kp history data
  React.useEffect(() => {
    const fetchKpHistoryData = async () => {
      try {
        const history = await getKpHistory();
        // Get last 24 hours of data (approximately 288 5-minute intervals)
        const recentHistory = history.slice(-288);
        setKpHistoryData(recentHistory);
      } catch (error) {
        console.error('Failed to fetch Kp history data:', error);
      }
    };

    fetchKpHistoryData();
  }, [kpUpdatedAt]);

  // Initial data load
  React.useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshAll();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSettings = () => {
    router.push('/modal-settings');
  };

  const handleAuroraMapPress = () => {
    router.push('/modal-map');
  };

  const handleAlertPress = (alert: any) => {
    Alert.alert(
      'Geomagnetic Alert',
      alert.message,
      [{ text: 'OK' }]
    );
  };

  const bzColor = bz !== null ? (bz < 0 ? COLORS.bz.negative : COLORS.bz.positive) : COLORS.text;
  const bzIcon = bz !== null ? (bz < 0 ? 'arrow-down' : 'arrow-up') : undefined;
  const bzSubtitle = bzIcon ? (bz! < 0 ? 'Southward' : 'Northward') : undefined;

  return (
    <LinearGradient
      colors={[COLORS.bg, '#0D1428']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={COLORS.emerald}
              colors={[COLORS.emerald]}
            />
          }
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>SolarStorm</Text>
            <TouchableOpacity
              onPress={handleSettings}
              style={styles.settingsButton}
              accessible
              accessibilityRole="button"
              accessibilityLabel="Open settings"
            >
              <Ionicons name="settings-outline" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          {/* Alert Banner - Prominent display at top */}
          <AlertBanner alerts={alerts} onPress={handleAlertPress} />

          {/* Error banner */}
          {error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Kp Tile */}
          <Section>
            <KpTile
              kp={kp}
              updatedAt={kpUpdatedAt}
              bz={bz}
              speed={speed}
            />
          </Section>

          {/* KPI Cards */}
          <Section>
            <View style={styles.kpiContainer}>
              <KpiCard
                label="Solar Wind Speed"
                value={speed !== null ? Math.round(speed) : null}
                unit="km/s"
                color={speed !== null && speed > 500 ? COLORS.aurora.high : COLORS.text}
              />
              <View style={styles.kpiSpacer} />
              <KpiCard
                label="Bz Magnetic Field"
                value={bz !== null ? bz.toFixed(1) : null}
                unit="nT"
                color={bzColor}
                subtitle={bzSubtitle}
              />
              <View style={styles.kpiSpacer} />
              <KpiCard
                label="Plasma Density"
                value={density !== null ? density.toFixed(1) : null}
                unit="p/cm³"
              />
            </View>
          </Section>

          {/* Kp Trend Visualization */}
          {kpHistoryData.length > 0 && (
            <Section title="Kp Index Activity">
              {/* Detailed Line Chart with Fixed Layout */}
              <KpTrendLine
                data={kpHistoryData}
                width={contentWidth}
                height={160}
                showPoints={false}
              />
            </Section>
          )}

          {/* Mini Trends Summary */}
          {kpHistoryData.length > 0 && (
            <Section>
              <View style={styles.miniTrendsRow}>
                <KpMiniTrend
                  data={kpHistoryData}
                  width={miniCardWidth}
                  height={80}
                />
                <View style={{ width: miniCardGap }} />
                <View style={[styles.trendSummary, { width: miniCardWidth, height: 80 }]}>
                  <Text style={styles.trendSummaryTitle}>24h Summary</Text>
                  <Text style={styles.trendSummaryText}>
                    Max: {Math.max(...kpHistoryData.slice(-288).map(d => d.kp)).toFixed(1)}
                  </Text>
                  <Text style={styles.trendSummaryText}>
                    Avg: {(kpHistoryData.slice(-288).reduce((sum, d) => sum + d.kp, 0) / Math.min(kpHistoryData.length, 288)).toFixed(1)}
                  </Text>
                </View>
              </View>
            </Section>
          )}

          {/* Aurora Chance */}
          <Section title="Aurora Forecast">
            <View style={[styles.auroraChanceContainer, { backgroundColor: getAuroraChanceColor(auroraChance) + '20' }]}>
              <Text style={[styles.auroraChanceText, { color: getAuroraChanceColor(auroraChance) }]}>
                {auroraChance}
              </Text>
              <Text style={styles.auroraChanceSubtext}>
                Based on real-time nowcast indicators
              </Text>
            </View>
          </Section>

          {/* Aurora Heatmap */}
          <Section title="Aurora Probability Map">
            <AuroraHeatmap
              width={screenWidth - SPACING.xl * 2}
              height={200}
              onPress={handleAuroraMapPress}
            />
          </Section>

          {/* Bottom spacing */}
          <View style={{ height: SPACING.xl }} />
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: SPACING.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xl,
    marginTop: SPACING.lg,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.text,
  },
  settingsButton: {
    padding: SPACING.sm,
  },
  errorBanner: {
    backgroundColor: COLORS.bz.negative + '20',
    padding: SPACING.md,
    borderRadius: 8,
    marginBottom: SPACING.lg,
  },
  errorText: {
    color: COLORS.bz.negative,
    fontSize: 14,
    textAlign: 'center',
  },
  kpiContainer: {
    flexDirection: 'row',
  },
  kpiSpacer: {
    width: SPACING.md,
  },
  auroraChanceContainer: {
    padding: SPACING.lg,
    borderRadius: 12,
    alignItems: 'center',
  },
  auroraChanceText: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  auroraChanceSubtext: {
    fontSize: 12,
    color: COLORS.muted,
    textAlign: 'center',
  },
  miniTrendsRow: {
    flexDirection: 'row',
    marginTop: SPACING.md,
  },
  trendSummary: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    justifyContent: 'center',
    alignItems: 'center', // Center content horizontally
  },
  trendSummaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  trendSummaryText: {
    fontSize: 13,
    color: COLORS.muted,
    marginBottom: 4,
    textAlign: 'center',
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0B1020',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
