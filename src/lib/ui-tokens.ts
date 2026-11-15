import { FadeInDown, LinearTransition } from 'react-native-reanimated';

/**
 * Shared surface + motion tokens for the Apple-style screens (auth, home).
 */

/** iOS-style continuous ("squircle") corners; ignored on Android and web. */
export const SMOOTH = { borderCurve: 'continuous' } as const;

/** Resting card: barely-there lift. */
export const SHADOW_SM = '0 1px 2px rgba(27, 38, 56, 0.04), 0 6px 20px rgba(27, 38, 56, 0.05)';
/** Featured card / app icon: a touch more depth. */
export const SHADOW_MD = '0 1px 2px rgba(27, 38, 56, 0.06), 0 10px 30px rgba(27, 38, 56, 0.10)';

/** Staggered, gentle rise-in for each block of a page. */
export const enter = (step: number) =>
  FadeInDown.delay(80 + step * 70)
    .duration(520)
    .springify()
    .damping(20)
    .stiffness(140);

/** Smooth reflow when something above appears or disappears. */
export const reflow = LinearTransition.duration(220);
