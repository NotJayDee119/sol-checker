import type { ComponentRef, Ref } from 'react';
import { TextInput, type TextInputProps } from 'react-native';

import { colors } from '@/lib/theme';
import { cn } from '@/lib/utils';

export type InputRef = ComponentRef<typeof TextInput>;

export type InputProps = TextInputProps & { className?: string; invalid?: boolean; ref?: Ref<InputRef> };

export function Input({ className, invalid, multiline, editable = true, ...props }: InputProps) {
  return (
    <TextInput
      editable={editable}
      multiline={multiline}
      textAlignVertical={multiline ? 'top' : 'center'}
      placeholderTextColor={colors.placeholder}
      className={cn(
        'rounded-lg border border-input bg-card px-3.5 text-base text-foreground focus:border-info',
        multiline ? 'min-h-24 py-3' : 'h-12',
        invalid && 'border-destructive',
        !editable && 'opacity-50',
        className
      )}
      {...props}
    />
  );
}
