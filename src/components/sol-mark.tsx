import { Image, View } from 'react-native';

import { Text } from '@/components/ui/text';

const LOGO = require('../../assets/logo-mark.png');

/** SOL logo: the teacher illustration (same artwork as the app icon). */
export function SolMark({ size = 48 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size }} accessibilityLabel="SOL logo" accessible>
      <Image source={LOGO} style={{ width: size, height: size }} resizeMode="contain" />
    </View>
  );
}

/** Wordmark with the acronym line (spec §4.1). */
export function SolWordmark() {
  return (
    <View className="flex-row items-center gap-3">
      <SolMark size={48} />
      <View className="flex-1">
        <Text className="font-heading text-[30px] leading-[34px] tracking-tight">SOL</Text>
        <Text variant="caption" tone="muted">
          Scan · Observe · Learn | Suriin · Obserbahan · Linangin
        </Text>
      </View>
    </View>
  );
}
