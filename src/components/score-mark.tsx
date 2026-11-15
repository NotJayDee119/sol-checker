import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui/text';
import { colors } from '@/lib/theme';

/** Total/max in red handwritten style inside a pen-drawn circle (spec §4.4). */
export function ScoreMark({ total, max, size = 104 }: { total: number; max: number; size?: number }) {
  return (
    <View
      style={{ width: size, height: size * 0.86 }}
      className="items-center justify-center"
      accessible
      accessibilityLabel={`Score ${total} out of ${max}`}
    >
      <Svg width={size} height={size * 0.86} viewBox="0 0 120 104" style={{ position: 'absolute' }}>
        <Path
          d="M62 8C30 6 8 24 8 52c0 28 24 44 54 44 30 0 50-18 50-44C112 26 92 10 58 12"
          stroke={colors.primary}
          strokeWidth="3.5"
          strokeLinecap="round"
          fill="none"
        />
      </Svg>
      <Text className="font-hand text-primary" style={{ fontSize: size * 0.34, lineHeight: size * 0.4 }}>
        {total}/{max}
      </Text>
    </View>
  );
}
