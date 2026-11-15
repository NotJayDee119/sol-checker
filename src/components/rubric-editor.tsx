import { Minus, Plus, Sparkles } from 'lucide-react-native';
import { Pressable, TextInput, View } from 'react-native';

import { InsetDivider, InsetGroup } from '@/components/inset-group';
import { Text } from '@/components/ui/text';
import { formTotal, type FormErrors, type RubricRowForm } from '@/lib/item-form';
import { colors } from '@/lib/theme';
import { SMOOTH } from '@/lib/ui-tokens';
import { cn } from '@/lib/utils';

/**
 * Rubric rows as an iOS grouped list: number badge, criterion name, points, and what earns full
 * points underneath. Min 1 row; total updates live (spec §4.2).
 */
export function RubricEditor({
  rows,
  onChange,
  onUseSample,
  errors,
  tint = colors.info,
}: {
  rows: RubricRowForm[];
  onChange: (rows: RubricRowForm[]) => void;
  onUseSample: () => void;
  errors?: FormErrors['rows'];
  /** Accent for the number badges (red for essays, blue for math). */
  tint?: string;
}) {
  const update = (i: number, patch: Partial<RubricRowForm>) =>
    onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const total = formTotal({ rubric: rows });

  return (
    <View className="gap-3">
      <InsetGroup>
        {rows.map((row, i) => {
          const err = errors?.[i];
          return (
            <View key={i}>
              {i > 0 ? <InsetDivider inset={56} /> : null}
              <View className="flex-row gap-3 py-3 pl-4 pr-2">
                <View
                  className="mt-0.5 h-7 w-7 items-center justify-center rounded-full"
                  style={{ backgroundColor: `${tint}1A` }}
                >
                  <Text className="text-[13px] font-bold" style={{ color: tint, fontVariant: ['tabular-nums'] }}>
                    {i + 1}
                  </Text>
                </View>

                <View className="flex-1 gap-1">
                  <View className="flex-row items-center gap-2">
                    <TextInput
                      value={row.name}
                      onChangeText={(name) => update(i, { name })}
                      placeholder="Criterion name"
                      placeholderTextColor={err?.name ? 'rgba(177, 42, 37, 0.6)' : colors.placeholder}
                      selectionColor={colors.info}
                      accessibilityLabel={`Criterion ${i + 1} name`}
                      className="web:outline-none"
                      style={{
                        flex: 1,
                        fontSize: 17,
                        fontWeight: '600',
                        color: colors.foreground,
                        paddingVertical: 2,
                        includeFontPadding: false,
                      }}
                    />
                    {/* Points pill */}
                    <View
                      className={cn(
                        'h-8 flex-row items-center gap-1 border px-2.5',
                        err?.pts ? 'border-destructive/50 bg-destructive/5' : 'border-border bg-background'
                      )}
                      style={[SMOOTH, { borderRadius: 10 }]}
                    >
                      <TextInput
                        value={row.pts}
                        onChangeText={(pts) => update(i, { pts: pts.replace(/[^0-9]/g, '') })}
                        placeholder="0"
                        placeholderTextColor={colors.placeholder}
                        keyboardType="number-pad"
                        maxLength={3}
                        selectionColor={colors.info}
                        accessibilityLabel={`Criterion ${i + 1} points`}
                        className="web:outline-none"
                        style={{
                          minWidth: 22,
                          textAlign: 'right',
                          fontSize: 15,
                          fontWeight: '600',
                          color: colors.foreground,
                          paddingVertical: 0,
                          fontVariant: ['tabular-nums'],
                          includeFontPadding: false,
                        }}
                      />
                      <Text className="text-[13px] text-muted-foreground">pts</Text>
                    </View>
                  </View>

                  <TextInput
                    value={row.desc}
                    onChangeText={(desc) => update(i, { desc })}
                    placeholder="What earns full points"
                    placeholderTextColor={colors.placeholder}
                    selectionColor={colors.info}
                    multiline
                    textAlignVertical="top"
                    accessibilityLabel={`Criterion ${i + 1}: what earns full points`}
                    className="web:outline-none"
                    style={{
                      fontSize: 15,
                      lineHeight: 20,
                      color: colors.mutedForeground,
                      paddingVertical: 2,
                      minHeight: 22,
                      includeFontPadding: false,
                    }}
                  />

                  {err?.name || err?.pts ? (
                    <Text variant="footnote" tone="destructive">
                      {[err.name, err.pts ? `Points: ${err.pts}` : ''].filter(Boolean).join(' ')}
                    </Text>
                  ) : null}
                </View>

                {/* iOS-style red minus to remove a row */}
                <Pressable
                  onPress={() => onChange(rows.filter((_, j) => j !== i))}
                  disabled={rows.length <= 1}
                  role="button"
                  accessibilityLabel={`Remove criterion ${i + 1}`}
                  hitSlop={8}
                  className="h-8 w-8 items-center justify-center"
                  style={{ opacity: rows.length <= 1 ? 0.25 : 1 }}
                >
                  <View className="h-[22px] w-[22px] items-center justify-center rounded-full bg-destructive">
                    <Minus size={14} strokeWidth={3} color="#fff" />
                  </View>
                </Pressable>
              </View>
            </View>
          );
        })}

        <InsetDivider />
        <Pressable
          role="button"
          onPress={() => onChange([...rows, { name: '', desc: '', pts: '' }])}
          className="min-h-[50px] flex-row items-center gap-3 px-4 active:bg-muted"
        >
          <View className="h-[22px] w-[22px] items-center justify-center rounded-full bg-success">
            <Plus size={14} strokeWidth={3} color="#fff" />
          </View>
          <Text className="text-[17px] text-info">Add Criterion</Text>
        </Pressable>

        <View className="h-px bg-border" />
        <View className="min-h-[52px] flex-row items-center bg-background/60 px-4">
          <Text className="flex-1 text-[17px] font-semibold">Total</Text>
          <Text className="text-[20px] font-bold tracking-[-0.3px]" style={{ fontVariant: ['tabular-nums'] }}>
            {total}
          </Text>
          <Text className="ml-1 text-[15px] text-muted-foreground">pts</Text>
        </View>
      </InsetGroup>

      <Pressable
        role="button"
        onPress={onUseSample}
        hitSlop={6}
        className="flex-row items-center gap-1.5 self-start px-4 active:opacity-50"
      >
        <Sparkles size={15} color={colors.info} strokeWidth={2.2} />
        <Text className="text-[15px] text-info">Use the sample rubric</Text>
      </Pressable>
    </View>
  );
}
