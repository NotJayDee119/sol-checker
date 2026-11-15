import { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';

import { Field } from '@/components/field';
import { Screen } from '@/components/screen';
import { SolWordmark } from '@/components/sol-mark';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { useStore } from '@/lib/store';

/** Flow step "Type your name and subject" (spec §3.1 step 2). */
export default function Welcome() {
  const { setTeacher } = useStore();
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [error, setError] = useState('');

  function start() {
    if (!name.trim()) {
      setError('Type your name so your papers show who checked them.');
      return;
    }
    // Saving the profile flips the root guard and shows the app.
    setTeacher({ teacherName: name.trim(), subject: subject.trim() });
  }

  return (
    <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingVertical: 48 }}>
        <SolWordmark />
        <Text variant="callout" tone="muted">
          Score essay answers and math solutions with your rubric. Snap the paper, tap the scores, and SOL keeps the
          record.
        </Text>
        <Card className="gap-4 p-4">
          <Field
            label="Your name"
            placeholder="e.g. Ma'am Reyes"
            value={name}
            onChangeText={(t) => {
              setName(t);
              setError('');
            }}
            error={error}
            autoCapitalize="words"
            autoComplete="name"
            returnKeyType="next"
          />
          <Field
            label="Subject you teach"
            placeholder="e.g. Filipino 8"
            value={subject}
            onChangeText={setSubject}
            optional
            returnKeyType="done"
            onSubmitEditing={start}
          />
          <Button onPress={start}>
            <Text>Start</Text>
          </Button>
        </Card>
        <View className="px-1">
          <Text variant="footnote" tone="muted">
            Your papers stay private on this phone. Record only learner names and sections — no LRNs or other personal
            data.
          </Text>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
