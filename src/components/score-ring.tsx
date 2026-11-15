import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { Text } from '@/components/ui/text';
import { ratingTone, type Tone } from '@/lib/rating';
import { colors } from '@/lib/theme';

export const TONE_COLOR: Record<Tone, string> = {
  success: colors.success,
  info: colors.info,
  warning: colors.warning,
  destructive: colors.primary,
};

/** Small static progress ring with the percent inside, colored by rating (for list rows). */
export function ScoreRing({ pct, size = 46, stroke = 4.5 }: { pct: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const color = TONE_COLOR[ratingTone(pct)];
  return (
    <View style={{ width: size, height: size }} className="items-center justify-center">
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.muted} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${(c * Math.min(Math.max(pct, 0), 100)) / 100} ${c}`}
          fill="none"
        />
      </Svg>
      <Text className="text-[12px] font-bold" style={{ color, fontVariant: ['tabular-nums'] }}>
        {pct}
        <Text className="text-[9px] font-bold" style={{ color }}>
          %
        </Text>
      </Text>
    </View>
  );
}
