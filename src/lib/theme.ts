/**
 * JS mirror of the tokens in global.css, for APIs that need raw colors
 * (navigation headers, tab bars, spinners, placeholder text).
 */
export const colors = {
  background: '#F3F5F8',
  card: '#FFFFFF',
  foreground: '#1B2638',
  primary: '#C8312B',
  primaryTint: '#FBE9E7',
  info: '#2B5FA8',
  infoTint: '#E6EEF9',
  muted: '#E9EDF3',
  mutedForeground: '#5D6B80',
  border: '#D9E1EC',
  success: '#1F7A4D',
  warning: '#A66A00',
  destructive: '#B12A25',
  placeholder: '#8C98AB',
} as const;
