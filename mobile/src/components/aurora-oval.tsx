import { useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Line,
  LinearGradient,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';

import { Fonts, Palette } from '@/constants/solar';
import { auroraViewingLatitude } from '@/lib/aurora';

const LAT_MIN = 20; // equatorward edge of the scale
const LAT_MAX = 90; // magnetic pole
const INSET = 16; // keeps the marker + labels off the edges
const H = 80;
const TRACK_Y = 48;

/**
 * A latitude scale of how far the auroral oval is from you. The green band is
 * the current aurora zone (poleward of the oval edge for the present Kp); the
 * dot is your magnetic latitude. Plain-language readout below.
 */
export function AuroraOval({
  userMagLat,
  boundaryLat,
  inside,
}: {
  userMagLat: number;
  boundaryLat: number;
  inside: boolean;
}) {
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const absLat = Math.abs(userMagLat);
  const inner = Math.max(0, width - INSET * 2);
  const clamp = (lat: number) => Math.min(LAT_MAX, Math.max(LAT_MIN, lat));
  const x = (lat: number) => INSET + ((clamp(lat) - LAT_MIN) / (LAT_MAX - LAT_MIN)) * inner;

  const edgeX = x(boundaryLat);
  const rawUserX = x(absLat);
  const userX = Math.min(width - INSET, Math.max(INSET, rawUserX));
  const labelX = Math.min(width - 22, Math.max(22, rawUserX));
  const markColor = inside ? '#FF6B5B' : Palette.accent;

  // What storm strength would be needed for the oval to reach this latitude.
  let neededKp: number | null = null;
  for (let k = 0; k <= 9; k++) {
    if (auroraViewingLatitude(k) <= absLat) {
      neededKp = k;
      break;
    }
  }
  const gap = Math.round(boundaryLat - absLat);

  const headline = inside
    ? 'The aurora oval is overhead right now.'
    : gap > 0
      ? `The aurora glow is about ${gap}° north of you.`
      : 'You’re right at the edge of the aurora zone.';
  const sub =
    neededKp === null
      ? 'Only a rare, extreme storm pushes it this far south.'
      : inside
        ? 'Find a dark spot and look toward the northern horizon.'
        : `It reaches you around Kp ${neededKp}.`;

  return (
    <View style={styles.wrap}>
      <View onLayout={onLayout} style={{ height: H }}>
        {width > 0 ? (
          <Svg width={width} height={H}>
            <Defs>
              <LinearGradient id="aZone" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor="#19D98A" stopOpacity={0.25} />
                <Stop offset="1" stopColor="#19D98A" stopOpacity={0.9} />
              </LinearGradient>
            </Defs>

            {/* base track */}
            <Rect x={INSET} y={TRACK_Y - 4} width={inner} height={8} rx={4} fill="rgba(255,255,255,0.08)" />
            {/* aurora zone, boundary → pole */}
            <Rect x={edgeX} y={TRACK_Y - 4} width={Math.max(0, width - INSET - edgeX)} height={8} rx={4} fill="url(#aZone)" />

            {/* "AURORA" tag centered in the zone */}
            <SvgText
              x={(edgeX + (width - INSET)) / 2}
              y={20}
              fill="#7CEFC0"
              fontSize={10}
              fontWeight="700"
              textAnchor="middle">
              AURORA ZONE
            </SvgText>

            {/* oval edge marker */}
            <Line x1={edgeX} y1={TRACK_Y - 11} x2={edgeX} y2={TRACK_Y + 11} stroke={Palette.textDim} strokeWidth={1.5} strokeDasharray="2 3" />

            {/* you */}
            <SvgText x={labelX} y={TRACK_Y - 14} fill={Palette.text} fontSize={11} fontWeight="700" textAnchor="middle">
              YOU
            </SvgText>
            <Circle cx={userX} cy={TRACK_Y} r={7} fill={markColor} stroke={Palette.bg} strokeWidth={2.5} />

            {/* axis ticks */}
            <SvgText x={INSET} y={H - 4} fill={Palette.textFaint} fontSize={10} textAnchor="start">
              20°
            </SvgText>
            <SvgText x={width - INSET} y={H - 4} fill={Palette.textFaint} fontSize={10} textAnchor="end">
              90° pole
            </SvgText>
          </Svg>
        ) : null}
      </View>
      <Text style={styles.headline}>{headline}</Text>
      <Text style={styles.sub}>{sub}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 10, gap: 3 },
  headline: { color: Palette.text, fontSize: 15, fontFamily: Fonts.medium },
  sub: { color: Palette.textDim, fontSize: 13, fontFamily: Fonts.regular },
});
