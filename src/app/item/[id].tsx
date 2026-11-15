import { router, Stack, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Calculator, Check, CircleAlert, Eraser, PenLine } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { ActionSheetIOS, Alert, Platform, Pressable, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { CheckRow, InlineField, StackedField } from '@/components/form-rows';
import { GroupFootnote, GroupHeader, IconTile, InsetDivider, InsetGroup } from '@/components/inset-group';
import { PressableScale } from '@/components/pressable-scale';
import { RubricEditor } from '@/components/rubric-editor';
import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import {
  blankForm,
  formToItem,
  hasErrors,
  itemToForm,
  sampleForm,
  switchKind,
  validateForm,
  withSampleRubric,
  type FormErrors,
  type ItemForm,
} from '@/lib/item-form';
import { COMMENT_LANGUAGES, commentLanguage } from '@/lib/comments';
import { useStore } from '@/lib/store';
import { colors } from '@/lib/theme';
import type { ItemKind } from '@/lib/types';
import { enter, reflow, SHADOW_SM, SMOOTH } from '@/lib/ui-tokens';
import { cn, createId } from '@/lib/utils';

const KIND = {
  essay: { label: 'Essay', hint: 'Written answer', icon: PenLine, tint: colors.primary },
  math: { label: 'Math Solution', hint: 'Show-your-solution', icon: Calculator, tint: colors.info },
} as const;

/** "1 · Set up the item" (spec §4.2). id = "new" for a new item, otherwise the saved item's id. */
export default function ItemSetup() {
  const { id, kind: kindParam } = useLocalSearchParams<{ id: string; kind?: ItemKind }>();
  const { items, draft, setDraft, saveItem, setActiveItem } = useStore();
  const isNew = id === 'new';
  const existing = isNew ? undefined : items.find((i) => i.id === id);
  const draftKey = isNew ? null : id;

  const [form, setForm] = useState<ItemForm>(() => {
    // A local draft for this same item survives a restart (spec §4.2).
    if (draft && draft.itemId === draftKey && (!isNew || !kindParam || draft.form.kind === kindParam))
      return draft.form;
    if (existing) return itemToForm(existing);
    return sampleForm(kindParam === 'math' ? 'math' : 'essay');
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDraft({ itemId: draftKey, form }), 500);
    return () => clearTimeout(t);
  }, [form, draftKey, setDraft]);

  const liveErrors = useMemo(() => (touched ? validateForm(form) : errors), [touched, form, errors]);

  const patch = (p: Partial<ItemForm>) => setForm((f) => ({ ...f, ...p }));
  const isMath = form.kind === 'math';
  const kind = KIND[form.kind];

  function save() {
    const e = validateForm(form);
    setErrors(e);
    setTouched(true);
    if (hasErrors(e)) return;
    const item = formToItem(form, existing?.id ?? createId('item_'));
    saveItem(item);
    setActiveItem(item.id);
    setDraft(null);
    // Flow: Save item → type learner name and section.
    router.dismissTo('/check');
  }

  if (!isNew && !existing) {
    return (
      <Screen topInset={false}>
        <Text variant="headline">This item no longer exists.</Text>
        <Button variant="outline" onPress={() => router.back()}>
          <Text>Go back</Text>
        </Button>
      </Screen>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: isNew ? 'New Item' : 'Edit Item',
          // System font, matching the other Apple-style screens.
          headerTitleStyle: { color: colors.foreground },
          headerRight: () => (
            <ClearButton
              disabled={JSON.stringify(form) === JSON.stringify(blankForm(form.kind))}
              onClear={() => setForm(blankForm(form.kind))}
            />
          ),
        }}
      />
      <Screen topInset={false} className="gap-0 px-5">
        {/* Type of item */}
        <Animated.View entering={enter(0)}>
          <GroupHeader>Type of item</GroupHeader>
          <View className="flex-row gap-3" role="radiogroup">
            {(['essay', 'math'] as const).map((k) => (
              <KindTile key={k} kind={k} selected={form.kind === k} onPress={() => setForm((f) => switchKind(f, k))} />
            ))}
          </View>
        </Animated.View>

        {/* Details */}
        <Animated.View entering={enter(1)} layout={reflow} className="mt-8">
          <GroupHeader>{isMath ? 'Problem' : 'Question'}</GroupHeader>
          <InsetGroup>
            <StackedField
              label="Item name"
              value={form.title}
              onChangeText={(title) => patch({ title })}
              placeholder={isMath ? 'e.g. Fractions – Word Problem' : 'e.g. Effective Communication – Essay'}
              invalid={!!liveErrors.title}
              returnKeyType="next"
            />
            <InsetDivider />
            <StackedField
              label={isMath ? 'Math problem' : 'Question'}
              value={form.q}
              onChangeText={(q) => patch({ q })}
              multiline
              minHeight={96}
              placeholder={isMath ? 'Type the problem exactly as given to learners' : 'Type the essay question'}
              invalid={!!liveErrors.q}
            />
            <InsetDivider />
            <StackedField
              label="Grade level / subject"
              optional
              value={form.grade}
              onChangeText={(grade) => patch({ grade })}
              placeholder="e.g. Grade 11"
            />
          </InsetGroup>
          <FieldErrors messages={[liveErrors.title, liveErrors.q]} />
        </Animated.View>

        {/* What a good answer looks like */}
        <Animated.View entering={enter(2)} layout={reflow} className="mt-8">
          <GroupHeader>{isMath ? 'Answer key' : 'Expected answer'}</GroupHeader>
          <InsetGroup>
            {isMath ? (
              <StackedField
                label="Answer key / expected solution"
                value={form.key}
                onChangeText={(key) => patch({ key })}
                multiline
                mono
                minHeight={110}
                placeholder={'3/5 × 1,250 kg = 750 kg\n750 kg × ₱42 = ₱31,500'}
              />
            ) : (
              <>
                <StackedField
                  label="Expected key points"
                  optional
                  value={form.key}
                  onChangeText={(key) => patch({ key })}
                  multiline
                  placeholder={'One point per line'}
                />
                <InsetDivider />
                <InlineField
                  label="Minimum words"
                  value={form.words}
                  onChangeText={(words) => patch({ words: words.replace(/[^0-9]/g, '') })}
                  keyboardType="number-pad"
                  placeholder="None"
                  suffix={form.words ? 'words' : undefined}
                  invalid={!!liveErrors.words}
                />
              </>
            )}
          </InsetGroup>
          {liveErrors.words ? (
            <GroupFootnote tone="destructive">{liveErrors.words}</GroupFootnote>
          ) : (
            <GroupFootnote>
              {isMath
                ? 'Recommended. Shown on the Check screen while you score.'
                : 'Shown on the Check screen while you score. Leave minimum words empty for no limit.'}
            </GroupFootnote>
          )}
        </Animated.View>

        {/* Rubric */}
        <Animated.View entering={enter(3)} layout={reflow} className="mt-8">
          <GroupHeader>Rubric</GroupHeader>
          <RubricEditor
            rows={form.rubric}
            onChange={(rubric) => patch({ rubric })}
            onUseSample={() => setForm((f) => withSampleRubric(f))}
            errors={liveErrors.rows}
            tint={kind.tint}
          />
          {liveErrors.rubric ? <GroupFootnote tone="destructive">{liveErrors.rubric}</GroupFootnote> : null}
        </Animated.View>

        {/* Ready-made comments */}
        <Animated.View entering={enter(4)} layout={reflow} className="mt-8">
          <GroupHeader>Ready-made comments</GroupHeader>
          <InsetGroup>
            {COMMENT_LANGUAGES.map((lang, i) => (
              <View key={lang}>
                {i > 0 ? <InsetDivider /> : null}
                <CheckRow label={lang} selected={commentLanguage(form.lang) === lang} onPress={() => patch({ lang })} />
              </View>
            ))}
          </InsetGroup>
          <GroupFootnote>The language of the comments you can tap when giving feedback.</GroupFootnote>
        </Animated.View>

        {/* Save */}
        <Animated.View entering={enter(5)} layout={reflow} className="mt-10">
          {touched && hasErrors(liveErrors) ? (
            <Animated.View
              entering={FadeIn.duration(200)}
              className="mb-3 flex-row items-center justify-center gap-2"
              role="alert"
            >
              <CircleAlert size={16} color={colors.destructive} />
              <Text variant="footnote" tone="destructive">
                Some fields need attention before saving.
              </Text>
            </Animated.View>
          ) : null}
          <PressableScale
            role="button"
            accessibilityLabel={existing ? 'Save changes' : 'Save item'}
            onPress={save}
            scaleTo={0.98}
            className="h-[54px] flex-row items-center justify-center bg-foreground"
            style={[SMOOTH, { borderRadius: 14 }]}
          >
            <Text className="text-[17px] font-semibold tracking-[-0.2px] text-white">
              {existing ? 'Save Changes' : 'Save Item'}
            </Text>
          </PressableScale>
          <Text variant="footnote" tone="muted" className="mt-3 px-4 text-center">
            {existing ? 'Saving updates this item.' : 'Saving adds this to My Items.'} Your setup is kept as a draft
            while you type.
          </Text>
        </Animated.View>
      </Screen>
    </>
  );
}

/**
 * Header capsule that empties the form (keeping the type). Asks first, since it wipes everything typed;
 * dimmed when there's nothing to clear.
 */
function ClearButton({ disabled, onClear }: { disabled: boolean; onClear: () => void }) {
  const title = 'Clear this form?';
  const message = 'The question, answer key and rubric are emptied. The item type stays the same.';
  const clear = () => {
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    onClear();
  };

  function confirm() {
    if (Platform.OS === 'web') {
      // Alert.alert has no buttons on web.
      if (
        window.confirm(`${title}

${message}`)
      )
        clear();
      return;
    }
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { title, message, options: ['Clear Form', 'Cancel'], destructiveButtonIndex: 0, cancelButtonIndex: 1 },
        (i) => i === 0 && clear()
      );
      return;
    }
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: clear },
    ]);
  }

  return (
    <Pressable
      role="button"
      accessibilityLabel="Clear form"
      accessibilityHint="Empties the form and keeps the type"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={confirm}
      hitSlop={8}
      className="h-8 flex-row items-center gap-1.5 bg-muted px-3 active:opacity-60"
      style={[SMOOTH, { borderRadius: 16, opacity: disabled ? 0.4 : 1 }]}
    >
      <Eraser size={15} strokeWidth={2.2} color={colors.foreground} />
      <Text className="text-[15px] font-semibold text-foreground">Clear</Text>
    </Pressable>
  );
}

/** Big selectable type tile, matching the New tiles on My Items. */
function KindTile({ kind, selected, onPress }: { kind: ItemKind; selected: boolean; onPress: () => void }) {
  const k = KIND[kind];
  return (
    <PressableScale
      role="radio"
      aria-checked={selected}
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${k.label}, ${k.hint}`}
      onPress={onPress}
      scaleTo={0.97}
      className={cn('flex-1 gap-3 bg-card p-4', selected ? 'border-2 border-info' : 'border border-border')}
      style={[SMOOTH, { borderRadius: 18, boxShadow: SHADOW_SM }]}
    >
      <View className="flex-row items-center justify-between">
        <IconTile icon={k.icon} tint={selected ? k.tint : colors.placeholder} size={36} />
        <View
          className={cn(
            'h-6 w-6 items-center justify-center rounded-full',
            selected ? 'bg-info' : 'border-[1.5px] border-input'
          )}
        >
          {selected ? <Check size={14} strokeWidth={3} color="#fff" /> : null}
        </View>
      </View>
      <View>
        <Text className="text-[17px] font-semibold tracking-[-0.2px]">{k.label}</Text>
        <Text variant="footnote" tone="muted" numberOfLines={1}>
          {k.hint}
        </Text>
      </View>
    </PressableScale>
  );
}

/** Red footnotes under a group, one per message. */
function FieldErrors({ messages }: { messages: (string | undefined)[] }) {
  const list = messages.filter(Boolean) as string[];
  if (!list.length) return null;
  return (
    <View className="mt-2 gap-1 px-4" role="alert">
      {list.map((m) => (
        <Text key={m} variant="footnote" tone="destructive">
          {m}
        </Text>
      ))}
    </View>
  );
}
