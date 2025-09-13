import { Canvas, Image } from '@shopify/react-native-skia';
import React from 'react';
import { Dimensions, StyleSheet, TouchableOpacity, View } from 'react-native';
import type { OvationPayload } from '../lib/api/parsers/ovation';
import { getOvation } from '../lib/api/swpc';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../lib/util/colors';
import { createAuroraHeatmap, createTestHeatmap } from '../lib/viz/heatmap';

interface AuroraHeatmapProps {
  width?: number;
  height?: number;
  onPress?: () => void;
  testMode?: boolean;
}

const { width: screenWidth } = Dimensions.get('window');

export function AuroraHeatmap({ 
  width = screenWidth - SPACING.xl * 2, 
  height = 200,
  onPress,
  testMode = false
}: AuroraHeatmapProps) {
  const [ovationData, setOvationData] = React.useState<OvationPayload | null>(null);
  const [heatmapImage, setHeatmapImage] = React.useState<any>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  // Fetch OVATION data
  React.useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        console.log('[AuroraHeatmap] Fetching OVATION data...');
        const data = await getOvation();
        console.log('[AuroraHeatmap] Received OVATION data:', data ? `${data.cells.length} cells` : 'null');
        setOvationData(data);
      } catch (error) {
        console.error('[AuroraHeatmap] Failed to fetch OVATION data:', error);
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
        console.log('[AuroraHeatmap] Generating heatmap...', { 
          testMode, 
          hasOvationData: !!ovationData, 
          width, 
          height 
        });
        
        let image;
        
        if (testMode || !ovationData) {
          // Use test heatmap
          console.log('[AuroraHeatmap] Using test heatmap');
          image = createTestHeatmap(width, height);
        } else {
          // Use real OVATION data
          console.log('[AuroraHeatmap] Using real OVATION data with', ovationData.cells.length, 'cells');
          image = createAuroraHeatmap(ovationData.cells, {
            width,
            height,
            cellRadius: 5,
            blurRadius: 8,
            latMin: 45,
            latMax: 90,
          });
        }
        
        console.log('[AuroraHeatmap] Generated heatmap image:', !!image);
        setHeatmapImage(image);
      } catch (error) {
        console.error('[AuroraHeatmap] Failed to generate heatmap:', error);
        // Fallback to test heatmap
        const testImage = createTestHeatmap(width, height);
        setHeatmapImage(testImage);
      }
    };

    if (!isLoading) {
      generateHeatmap();
    }
  }, [ovationData, width, height, testMode, isLoading]);

  const Component = onPress ? TouchableOpacity : View;

  return (
    <Component
      style={[styles.container, { width, height }]}
      onPress={onPress}
      activeOpacity={onPress ? 0.8 : 1}
      accessible
      accessibilityRole={onPress ? 'button' : 'image'}
      accessibilityLabel={onPress ? 'Aurora probability map. Tap to open full screen.' : 'Aurora probability map'}
    >
      <View style={styles.canvasContainer}>
        {heatmapImage ? (
          <Canvas 
            style={{ width, height }}
            pointerEvents="none"
          >
            <Image
              image={heatmapImage}
              x={0}
              y={0}
              width={width}
              height={height}
              fit="cover"
            />
          </Canvas>
        ) : (
          <View style={[styles.placeholder, { width, height }]} />
        )}
      </View>
      
      {/* Overlay grid lines for geographic reference */}
      <View style={styles.overlay}>
        {/* Latitude lines */}
        {[0.25, 0.5, 0.75].map((ratio, index) => (
          <View
            key={`lat-${index}`}
            style={[
              styles.gridLine,
              {
                top: ratio * height,
                width: '100%',
                height: 1,
              }
            ]}
          />
        ))}
        
        {/* Longitude lines */}
        {[0.25, 0.5, 0.75].map((ratio, index) => (
          <View
            key={`lon-${index}`}
            style={[
              styles.gridLine,
              {
                left: ratio * width,
                height: '100%',
                width: 1,
              }
            ]}
          />
        ))}
      </View>
    </Component>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    ...SHADOWS.card,
  },
  canvasContainer: {
    flex: 1,
  },
  placeholder: {
    backgroundColor: COLORS.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
  },
  gridLine: {
    position: 'absolute',
    backgroundColor: COLORS.border,
    opacity: 0.3,
  },
});
