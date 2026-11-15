import { cva, type VariantProps } from 'class-variance-authority';
import * as Haptics from 'expo-haptics';
import { ActivityIndicator, Platform, Pressable, type PressableProps } from 'react-native';

import { colors } from '@/lib/theme';
import { cn } from '@/lib/utils';

import { TextClassContext } from './text';

const buttonVariants = cva('flex-row items-center justify-center gap-2 rounded-xl', {
  variants: {
    variant: {
      default: 'bg-primary active:opacity-85',
      secondary: 'bg-secondary active:opacity-80',
      outline: 'border border-border bg-card active:bg-muted',
      ghost: 'active:bg-muted',
      destructive: 'bg-destructive active:opacity-85',
      tinted: 'bg-primary/10 active:bg-primary/20',
    },
    size: {
      default: 'h-12 px-5',
      sm: 'h-9 rounded-lg px-3.5',
      lg: 'h-14 px-6',
      icon: 'h-11 w-11 rounded-full',
    },
  },
  defaultVariants: { variant: 'default', size: 'default' },
});

const buttonTextVariants = cva('font-semibold', {
  variants: {
    variant: {
      default: 'text-primary-foreground',
      secondary: 'text-secondary-foreground',
      outline: 'text-foreground',
      ghost: 'text-info',
      destructive: 'text-destructive-foreground',
      tinted: 'text-primary',
    },
    size: {
      default: 'text-[17px]',
      sm: 'text-[15px]',
      lg: 'text-[17px]',
      icon: '',
    },
  },
  defaultVariants: { variant: 'default', size: 'default' },
});

export type ButtonProps = PressableProps &
  VariantProps<typeof buttonVariants> & {
    className?: string;
    loading?: boolean;
    haptic?: boolean;
  };

export function Button({
  className,
  variant,
  size,
  loading,
  disabled,
  haptic = true,
  onPress,
  children,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const spinnerColor = variant === 'outline' || variant === 'ghost' || variant === 'tinted' ? colors.primary : '#fff';
  return (
    <TextClassContext.Provider value={buttonTextVariants({ variant, size })}>
      <Pressable
        role="button"
        accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
        disabled={isDisabled}
        className={cn(buttonVariants({ variant, size }), isDisabled && 'opacity-50', className)}
        onPress={(e) => {
          if (haptic && Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
          onPress?.(e);
        }}
        {...props}
      >
        {(state) => (
          <>
            {loading ? <ActivityIndicator size="small" color={spinnerColor} /> : null}
            {typeof children === 'function' ? children(state) : children}
          </>
        )}
      </Pressable>
    </TextClassContext.Provider>
  );
}
