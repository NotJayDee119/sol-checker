import { Image, View } from 'react-native';

import { Text } from '@/components/ui/text';

/** "Ma'am Reyes" → "MR". */
export function initialsOf(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return ((words[0]?.[0] ?? '') + (words.length > 1 ? words[words.length - 1][0] : '')).toUpperCase() || '?';
}

/** Round profile picture, falling back to initials on a blue tint. */
export function Avatar({ name, photo, size = 44 }: { name: string; photo?: string | null; size?: number }) {
  return (
    <View
      className="items-center justify-center overflow-hidden rounded-full bg-accent"
      style={{ width: size, height: size }}
    >
      {photo ? (
        <Image
          source={{ uri: photo }}
          style={{ width: size, height: size }}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
        />
      ) : (
        <Text className="font-semibold text-accent-foreground" style={{ fontSize: size * 0.36 }}>
          {initialsOf(name)}
        </Text>
      )}
    </View>
  );
}
