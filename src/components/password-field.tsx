import { Eye, EyeOff } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Field, type FieldProps } from '@/components/field';
import { colors } from '@/lib/theme';

/** Password input with a show/hide button, so teachers can check what they typed. */
export function PasswordField(props: Omit<FieldProps, 'secureTextEntry'>) {
  const [visible, setVisible] = useState(false);
  const Icon = visible ? EyeOff : Eye;
  return (
    <View>
      <Field
        {...props}
        secureTextEntry={!visible}
        autoCapitalize="none"
        autoCorrect={false}
        className="pr-12"
      />
      <Pressable
        role="button"
        accessibilityLabel={visible ? 'Hide password' : 'Show password'}
        onPress={() => setVisible((v) => !v)}
        hitSlop={8}
        // Sits over the input: label row (~24px) + half the 48px input, minus half the icon.
        className="absolute right-1 top-[26px] h-11 w-11 items-center justify-center rounded-full active:bg-muted"
      >
        <Icon size={20} color={colors.mutedForeground} />
      </Pressable>
    </View>
  );
}
