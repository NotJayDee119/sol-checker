import type { LucideIcon, LucideProps } from 'lucide-react-native';
import { cssInterop } from 'nativewind';
import { useContext } from 'react';

import { cn } from '@/lib/utils';

import { TextClassContext } from './text';

type IconProps = LucideProps & { as: LucideIcon; className?: string };

function IconImpl({ as: IconComponent, ...props }: IconProps) {
  return <IconComponent {...props} />;
}

cssInterop(IconImpl, {
  className: {
    target: 'style',
    nativeStyleToProp: { height: 'size', width: 'size' },
  },
});

/** Lucide icon that accepts Tailwind classes (`text-*` sets color, `size-*` sets size). */
export function Icon({ as, className, size = 20, strokeWidth = 2, ...props }: IconProps) {
  const textClass = useContext(TextClassContext);
  return (
    <IconImpl
      as={as}
      className={cn('text-foreground', textClass, className)}
      size={size}
      strokeWidth={strokeWidth}
      {...props}
    />
  );
}
