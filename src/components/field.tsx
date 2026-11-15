import { View } from 'react-native';

import { Input, type InputProps } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

export type FieldProps = InputProps & {
  label: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  containerClassName?: string;
};

/** Labelled text input with a hint or error underneath. Every field has a label (spec §10). */
export function Field({ label, hint, error, optional, containerClassName, ...inputProps }: FieldProps) {
  return (
    <View className={cn('gap-1.5', containerClassName)}>
      <Text variant="footnote" className="ml-0.5 font-semibold text-foreground">
        {label}
        {optional ? <Text variant="footnote" tone="muted"> (optional)</Text> : null}
      </Text>
      <Input invalid={!!error} accessibilityLabel={label} accessibilityHint={hint} {...inputProps} />
      {error ? (
        <Text variant="footnote" tone="destructive" className="ml-0.5" role="alert">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="footnote" tone="muted" className="ml-0.5">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}
