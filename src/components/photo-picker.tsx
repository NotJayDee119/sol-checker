import * as ImagePicker from 'expo-image-picker';
import { Camera, Images, X } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Image, Platform, Pressable, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { discardPhotos, processImage, type PageImage } from '@/lib/images';
import { colors } from '@/lib/theme';

const MAX_BYTES = 20 * 1024 * 1024;
const ACCEPTED = /^image\/(jpe?g|png|webp|gif|heic|heif)$/i;

/**
 * Photo zone for one paper: take pictures or pick from the library, every page in order.
 * Thumbnails show page numbers and a remove button (spec §4.3).
 */
export function PhotoPicker({
  photos,
  onChange,
  max,
  disabled,
  onError,
}: {
  photos: PageImage[];
  onChange: (photos: PageImage[]) => void;
  max: number;
  disabled?: boolean;
  onError: (message: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const remaining = max - photos.length;
  const full = remaining <= 0;

  async function add(assets: ImagePicker.ImagePickerAsset[]) {
    const usable = assets.filter(
      (a) => (!a.mimeType || ACCEPTED.test(a.mimeType)) && (!a.fileSize || a.fileSize <= MAX_BYTES)
    );
    if (usable.length < assets.length) onError("One of the photos couldn't be used. Try a JPG or PNG under 20 MB.");
    if (!usable.length) return;
    setBusy(true);
    try {
      const processed: PageImage[] = [];
      for (const a of usable.slice(0, remaining)) {
        processed.push(await processImage({ uri: a.uri, width: a.width, height: a.height }));
      }
      onChange([...photos, ...processed]);
      if (usable.length > remaining) onError(`Only ${max} photos fit on one paper. Extra photos were left out.`);
    } catch {
      onError("One of the photos couldn't be used. Try a JPG or PNG under 20 MB.");
    } finally {
      setBusy(false);
    }
  }

  async function takePhoto() {
    if (Platform.OS !== 'web') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        onError('SOL needs camera access to photograph answer sheets. You can turn it on in Settings, or choose photos instead.');
        return;
      }
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 });
    if (!result.canceled) await add(result.assets);
  }

  async function choosePhotos() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      orderedSelection: true,
    });
    if (!result.canceled) await add(result.assets);
  }

  function remove(index: number) {
    discardPhotos([photos[index].uri]);
    onChange(photos.filter((_, i) => i !== index));
  }

  return (
    <View className="gap-3">
      <View className="rounded-lg border-2 border-dashed border-input bg-background p-3">
        {photos.length === 0 ? (
          <View className="items-center gap-1 py-4">
            <Icon as={Camera} size={28} className="text-muted-foreground" />
            <Text variant="subhead" className="text-center font-semibold">
              Add clear photos of the answer
            </Text>
            <Text variant="footnote" tone="muted" className="text-center">
              Every page, in order · up to {max} photos
            </Text>
          </View>
        ) : (
          <View className="flex-row flex-wrap gap-2.5">
            {photos.map((p, i) => (
              <View key={p.uri} className="overflow-hidden rounded-md border border-border bg-card">
                <Image
                  source={{ uri: p.uri }}
                  style={{ width: 92, height: 120 }}
                  resizeMode="cover"
                  accessibilityLabel={`Page ${i + 1}`}
                />
                <View className="absolute bottom-1 left-1 rounded bg-foreground/80 px-1.5 py-0.5">
                  <Text className="font-mono text-[11px] text-white">p.{i + 1}</Text>
                </View>
                {!disabled ? (
                  <Pressable
                    onPress={() => remove(i)}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove page ${i + 1}`}
                    hitSlop={8}
                    className="absolute right-1 top-1 h-7 w-7 items-center justify-center rounded-full bg-foreground/80"
                  >
                    <Icon as={X} size={16} className="text-white" />
                  </Pressable>
                ) : null}
              </View>
            ))}
            {busy ? (
              <View className="h-[120px] w-[92px] items-center justify-center rounded-md border border-border bg-card">
                <ActivityIndicator color={colors.info} />
              </View>
            ) : null}
          </View>
        )}
        {busy && photos.length === 0 ? <ActivityIndicator color={colors.info} className="pb-2" /> : null}
      </View>

      <View className="flex-row gap-2">
        <Button variant="outline" className="flex-1" onPress={takePhoto} disabled={disabled || busy || full}>
          <Icon as={Camera} size={18} />
          <Text>Take photo</Text>
        </Button>
        <Button variant="outline" className="flex-1" onPress={choosePhotos} disabled={disabled || busy || full}>
          <Icon as={Images} size={18} />
          <Text>Choose</Text>
        </Button>
      </View>
      {full ? (
        <Text variant="footnote" tone="muted">
          {max} photos is the most for one paper. Remove one to add another.
        </Text>
      ) : null}
    </View>
  );
}
