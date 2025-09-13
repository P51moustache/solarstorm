import { Ionicons } from '@expo/vector-icons';
import { Canvas, Image, LinearGradient, Rect, vec } from '@shopify/react-native-skia';
import { router } from 'expo-router';
import React from 'react';
import {
  Dimensions,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

import type { OvationPayload } from '@/lib/api/parsers/ovation';
import { getOvation } from '@/lib/api/swpc';
import { COLORS, SPACING } from '@/lib/util/colors';
import { formatTimeLocal } from '@/lib/util/time';
import { createAuroraHeatmap, createTestHeatmap } from '@/lib/viz/heatmap';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function ModalMapScreen() {
  const [ovationData, setOvationData] = React.useState<OvationPayload | null>(null);
  const [heatmapImage, setHeatmapImage] = React.useState<any>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [hemisphere, setHemisphere] = React.useState<'north' | 'south' | 'both'>('north');
  const [smoothing, setSmoothing] = React.useState<'low' | 'med' | 'high'>('med');
  const [showWorldBg, setShowWorldBg] = React.useState<boolean>(true);

  const mapWidth = screenWidth - SPACING.xl * 2;
  const mapHeight = screenHeight * 0.45; // Reduced from 0.6 to 0.45

  // Fetch OVATION data
  React.useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const data = await getOvation();
        setOvationData(data);
      } catch (error) {
        setOvationData(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Generate heatmap image
  React.useEffect(() => {
    const generateHeatmap = async () => {
      try {
        let image;
        
        if (!ovationData) {
          image = createTestHeatmap(mapWidth, mapHeight);
        } else {
          // Compute options based on controls
          const { latMin, latMax } = (() => {
            if (hemisphere === 'north') return { latMin: 45, latMax: 90 };
            if (hemisphere === 'south') return { latMin: -90, latMax: -45 };
            return { latMin: -90, latMax: 90 };
          })();

          const { cellRadius, blurRadius } = (() => {
            if (smoothing === 'low') return { cellRadius: 4, blurRadius: 4 };
            if (smoothing === 'high') return { cellRadius: 7, blurRadius: 12 };
            return { cellRadius: 5, blurRadius: 8 };
          })();

          // Use real OVATION data
          image = createAuroraHeatmap(ovationData.cells, {
            width: mapWidth,
            height: mapHeight,
            cellRadius,
            blurRadius,
            latMin,
            latMax,
          });
        }
        setHeatmapImage(image);
      } catch (error) {
        // Fallback to test heatmap
        const testImage = createTestHeatmap(mapWidth, mapHeight);
        setHeatmapImage(testImage);
      }
    };

    if (!isLoading) {
      generateHeatmap();
    }
  }, [ovationData, mapWidth, mapHeight, isLoading, hemisphere, smoothing]);

  const handleClose = () => {
    router.back();
  };

  const updateTime = ovationData ? formatTimeLocal(ovationData.updated) : 'Unknown';
  // Compute current bounds used for labeling and projection
  const bounds = React.useMemo(() => {
    const lat = hemisphere === 'north' ? { min: 45, max: 90 } : hemisphere === 'south' ? { min: -90, max: -45 } : { min: -90, max: 90 };
    return { latMin: lat.min, latMax: lat.max, lonMin: -180, lonMax: 180 } as const;
  }, [hemisphere]);

  const formatLat = (lat: number) => `${Math.abs(Math.round(lat))}°${lat >= 0 ? 'N' : 'S'}`;
  const formatLon = (lon: number) => `${Math.abs(Math.round(lon))}°${lon >= 0 ? 'E' : 'W'}`;

  //

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {/* */}

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerCenter}>
            <Text style={styles.title}>Aurora Probability Map</Text>
            <Text style={styles.subtitle}>
              OVATION aurora, updated {updateTime}
            </Text>
          </View>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        {/* Controls */}
        <View style={styles.controlsRow}>
          <View style={styles.segmentGroup}>
            {(['north','south','both'] as const).map(h => (
              <TouchableOpacity
                key={h}
                onPress={() => setHemisphere(h)}
                style={[
                  styles.segment,
                  hemisphere === h && styles.segmentActive,
                ]}
              >
                <Text style={[styles.segmentText, hemisphere === h && styles.segmentTextActive]}>
                  {h === 'north' ? 'North' : h === 'south' ? 'South' : 'Both'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.segmentGroup}>
            {(['low','med','high'] as const).map(s => (
              <TouchableOpacity
                key={s}
                onPress={() => setSmoothing(s)}
                style={[
                  styles.segment,
                  smoothing === s && styles.segmentActive,
                ]}
              >
                <Text style={[styles.segmentText, smoothing === s && styles.segmentTextActive]}>
                  {s === 'low' ? 'Low' : s === 'high' ? 'High' : 'Med'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={{ width: SPACING.md }} />
          <View style={styles.segmentGroup}>
            {([false, true] as const).map(v => (
              <TouchableOpacity
                key={String(v)}
                onPress={() => setShowWorldBg(v)}
                style={[
                  styles.segment,
                  showWorldBg === v && styles.segmentActive,
                ]}
              >
                <Text style={[styles.segmentText, showWorldBg === v && styles.segmentTextActive]}>
                  {v ? 'Map On' : 'Map Off'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Map Container */}
        <View style={styles.mapContainer}>
          <View style={[styles.mapCanvas, { width: mapWidth, height: mapHeight }]}>
            
            {heatmapImage ? (
              <Canvas style={{ width: mapWidth, height: mapHeight }}>
                <Image
                  image={heatmapImage}
                  x={0}
                  y={0}
                  width={mapWidth}
                  height={mapHeight}
                  fit="cover"
                />
              </Canvas>
            ) : (
              <View style={[styles.placeholder, { width: mapWidth, height: mapHeight }]}>
                <Text style={styles.placeholderText}>Loading aurora map...</Text>
              </View>
            )}
            
            {/* Axis labels only (no grid lines) */}
            {showWorldBg && (
              <View style={styles.gridOverlay}>
                {/* Latitude labels (left side) */}
                {[0.2, 0.4, 0.6, 0.8].map((ratio, i) => {
                  const latVal = bounds.latMax - ratio * (bounds.latMax - bounds.latMin);
                  return (
                    <Text
                      key={`lat-label-${i}`}
                      style={[
                        styles.axisLabel,
                        { left: 4, top: ratio * mapHeight - 8 },
                      ]}
                    >
                      {formatLat(latVal)}
                    </Text>
                  );
                })}

                {/* Longitude labels (bottom) */}
                {[0.1, 0.3, 0.5, 0.7, 0.9].map((ratio, i) => {
                  const lonVal = bounds.lonMin + ratio * (bounds.lonMax - bounds.lonMin);
                  return (
                    <Text
                      key={`lon-label-${i}`}
                      style={[
                        styles.axisLabel,
                        { bottom: 4, left: ratio * mapWidth - 16 },
                      ]}
                    >
                      {formatLon(lonVal)}
                    </Text>
                  );
                })}
              </View>
            )}
          </View>
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          <Text style={styles.legendTitle}>Aurora Probability</Text>
          <View style={styles.legendBar}>
            <Canvas style={styles.legendCanvas}>
              <Rect x={0} y={0} width={200} height={20}>
                <LinearGradient
                  start={vec(0, 0)}
                  end={vec(200, 0)}
                  colors={[
                    COLORS.aurora.low,
                    COLORS.aurora.medium,
                    COLORS.aurora.high,
                    COLORS.aurora.extreme,
                  ]}
                />
              </Rect>
            </Canvas>
          </View>
          <View style={styles.legendLabels}>
            <Text style={styles.legendLabel}>0%</Text>
            <Text style={styles.legendLabel}>25%</Text>
            <Text style={styles.legendLabel}>50%</Text>
            <Text style={styles.legendLabel}>75%</Text>
            <Text style={styles.legendLabel}>100%</Text>
          </View>
        </View>

        {/* Geographic Labels */}
        <View style={styles.geoLabels}>
          <Text style={styles.geoLabel}>
            {hemisphere === 'north' ? 'Northern Hemisphere' : hemisphere === 'south' ? 'Southern Hemisphere' : 'Global'} Aurora Forecast
          </Text>
          <Text style={styles.geoSubtext}>
            Based on NOAA/SWPC OVATION Prime model
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm, // Reduced horizontal padding
    paddingTop: SPACING.xxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
    position: 'relative',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.muted,
  },
  closeButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    padding: SPACING.sm,
  },
  mapContainer: {
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  segmentGroup: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: 999,
    padding: 2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  segment: {
    paddingHorizontal: SPACING.sm, // Reduced from SPACING.md
    paddingVertical: SPACING.xs,   // Reduced from SPACING.sm
    borderRadius: 999,
  },
  segmentActive: {
    backgroundColor: COLORS.emerald,
  },
  segmentText: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  segmentTextActive: {
    color: COLORS.bg,
  },
  mapCanvas: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    overflow: 'hidden',
  },
  worldBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.3,
  },
  placeholder: {
    backgroundColor: COLORS.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: COLORS.muted,
    fontSize: 16,
  },
  gridOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
  },
  legend: {
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  legendTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  legendBar: {
    marginBottom: SPACING.xs,
  },
  legendCanvas: {
    width: 200,
    height: 20,
  },
  legendLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 200,
  },
  legendLabel: {
    fontSize: 12,
    color: COLORS.muted,
  },
  geoLabels: {
    alignItems: 'center',
  },
  geoLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  geoSubtext: {
    fontSize: 12,
    color: COLORS.muted,
    textAlign: 'center',
  },
  axisLabel: {
    position: 'absolute',
    fontSize: 11,
    color: COLORS.text,
    backgroundColor: 'rgba(11, 16, 32, 0.8)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
