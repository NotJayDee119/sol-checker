import * as Slot from '@rn-primitives/slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { createContext, useContext } from 'react';
import { Text as RNText, type TextProps } from 'react-native';

import { cn } from '@/lib/utils';

const textVariants = cva('text-base text-foreground', {
  variants: {
    variant: {
      default: '',
      largeTitle: 'font-heading text-[34px] leading-[41px] tracking-tight',
      title: 'font-heading text-[28px] leading-[34px] tracking-tight',
      title2: 'font-heading text-[22px] leading-7',
      headline: 'text-[17px] font-semibold leading-[22px]',
      body: 'text-[17px] leading-[22px]',
      callout: 'text-base leading-[21px]',
      subhead: 'text-[15px] leading-5',
      footnote: 'text-[13px] leading-[18px]',
      caption: 'text-xs leading-4',
      overline: 'text-xs font-semibold uppercase tracking-wider',
      mono: 'font-mono text-[15px] leading-5',
    },
    tone: {
      default: '',
      muted: 'text-muted-foreground',
      primary: 'text-primary',
      info: 'text-info',
      success: 'text-success',
      destructive: 'text-destructive',
      warning: 'text-warning',
    },
  },
  defaultVariants: { variant: 'default', tone: 'default' },
});

/** Lets parents (e.g. Button) style any nested Text without prop drilling. */
export const TextClassContext = createContext<string | undefined>(undefined);

export type TextVariantProps = VariantProps<typeof textVariants>;

export function Text({
  className,
  asChild = false,
  variant,
  tone,
  ...props
}: TextProps & TextVariantProps & { className?: string; asChild?: boolean }) {
  const textClass = useContext(TextClassContext);
  const Component = asChild ? Slot.Text : RNText;
  return <Component className={cn(textVariants({ variant, tone }), textClass, className)} {...props} />;
}
