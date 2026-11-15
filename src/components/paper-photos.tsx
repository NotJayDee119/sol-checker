import { Image } from 'expo-image';
import { X } from 'lucide-react-native';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { paperPhotoUri } from '@/lib/paper-photos';

/** Saved photos of a paper: thumbnails, and a full-screen viewer to swipe through the pages. */
export function PaperPhotos({ paperId, photos }: { paperId: string; photos: string[] }) {
  const [open, setOpen] = useState<number | null>(null);
  if (!photos.length) return null;
  const uris = photos.map((name) => paperPhotoUri(paperId, name));

  return (
    <Card className="gap-3 p-4">
      <View className="flex-row items-baseline justify-between">
        <Text variant="headline" role="heading">
          Photos of the paper
        </Text>
        <Text variant="footnote" tone="muted">
          {photos.length} {photos.length === 1 ? 'page' : 'pages'}
        </Text>
      </View>
      <View className="flex-row flex-wrap gap-2.5">
        {uris.map((uri, i) => (
          <Pressable
            key={uri}
            role="button"
            accessibilityLabel={`Open page ${i + 1}`}
            onPress={() => setOpen(i)}
            className="overflow-hidden rounded-md border border-border bg-muted active:opacity-80"
          >
            <Image source={{ uri }} style={{ width: 92, height: 120 }} contentFit="cover" />
            <View className="absolute bottom-1 left-1 rounded bg-foreground/80 px-1.5 py-0.5">
              <Text className="font-mono text-[11px] text-white">p.{i + 1}</Text>
            </View>
          </Pressable>
        ))}
      </View>
      <PhotoViewer uris={uris} start={open} onClose={() => setOpen(null)} />
    </Card>
  );
}

function PhotoViewer({ uris, start, onClose }: { uris: string[]; start: number | null; onClose: () => void }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [page, setPage] = useState(0);

  return (
    <Modal
      visible={start !== null}
      animationType="fade"
      onRequestClose={onClose}
      onShow={() => setPage(start ?? 0)}
      statusBarTranslucent
    >
      <View className="flex-1 bg-black">
        {start !== null ? (
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            contentOffset={{ x: start * width, y: 0 }}
            onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
          >
            {uris.map((uri, i) => (
              <ScrollView
                key={uri}
                style={{ width, height }}
                contentContainerStyle={{ width, height }}
                maximumZoomScale={4}
                minimumZoomScale={1}
                centerContent
                showsHorizontalScrollIndicator={false}
                showsVerticalScrollIndicator={false}
              >
                <Image
                  source={{ uri }}
                  style={{ width, height }}
                  contentFit="contain"
                  accessibilityLabel={`Page ${i + 1} of ${uris.length}`}
                />
              </ScrollView>
            ))}
          </ScrollView>
        ) : null}

        <View
          className="absolute left-0 right-0 flex-row items-center justify-between px-4"
          style={{ top: insets.top + 8 }}
          pointerEvents="box-none"
        >
          <View className="rounded-full bg-white/15 px-3 py-1.5">
            <Text className="font-mono text-[14px] text-white">
              Page {page + 1} of {uris.length}
            </Text>
          </View>
          <Pressable
            role="button"
            accessibilityLabel="Close photos"
            onPress={onClose}
            hitSlop={8}
            className="h-10 w-10 items-center justify-center rounded-full bg-white/15 active:bg-white/25"
          >
            <Icon as={X} size={22} className="text-white" />
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
