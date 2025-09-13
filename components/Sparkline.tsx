import { Canvas, LinearGradient, Paint, Path, vec } from '@shopify/react-native-skia';
import React from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { SPACING } from '../lib/util/colors';
import { createSparklinePath, downsampleSparklineData, getSparklineColor, type SparklineData } from '../lib/viz/sparkline';

interface SparklineProps {
  data: SparklineData[];
  width?: number;
  height?: number;
  strokeWidth?: number;
  maxPoints?: number;
}

const { width: screenWidth } = Dimensions.get('window');

export function Sparkline({ 
  data, 
  width = screenWidth - SPACING.xl * 2, 
  height = 60,
  strokeWidth = 2,
  maxPoints = 60
}: SparklineProps) {
  const processedData = React.useMemo(() => {
    if (data.length === 0) return [];
    return downsampleSparklineData(data, maxPoints);
  }, [data, maxPoints]);

  const paths = React.useMemo(() => {
    if (processedData.length < 2) return null;
    
    return createSparklinePath(processedData, {
      width,
      height,
      showFill: true,
      padding: { top: 4, right: 4, bottom: 4, left: 4 },
    });
  }, [processedData, width, height]);

  const strokeColor = React.useMemo(() => {
    return getSparklineColor(processedData);
  }, [processedData]);

  if (!paths || processedData.length < 2) {
    return <View style={[styles.container, { width, height }]} />;
  }

  return (
    <View style={[styles.container, { width, height }]}>
      <Canvas style={{ width, height }}>
        {/* Fill area */}
        {paths.fillPath && (
          <Path path={paths.fillPath}>
            <LinearGradient
              start={vec(0, 0)}
              end={vec(0, height)}
              colors={[strokeColor + '40', strokeColor + '00']}
            />
          </Path>
        )}
        
        {/* Stroke line */}
        <Path path={paths.strokePath}>
          <Paint 
            color={strokeColor} 
            style="stroke" 
            strokeWidth={strokeWidth}
            strokeCap="round"
            strokeJoin="round"
            antiAlias={true}
          />
        </Path>
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
  },
});
