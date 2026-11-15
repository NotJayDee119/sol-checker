import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';

/** Current time, re-rendering on each new second (aligned to the clock, so it doesn't drift). */
function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const d = new Date();
      setNow(d);
      timer = setTimeout(tick, 1000 - d.getMilliseconds());
    };
    timer = setTimeout(tick, 1000 - new Date().getMilliseconds());
    return () => clearTimeout(timer);
  }, []);
  return now;
}

/** 15:04:09 → { time: "3:04:09", period: "PM" }. Built by hand so it's 12-hour on every phone locale. */
function format12h(d: Date) {
  const h = d.getHours();
  const pad = (n: number) => String(n).padStart(2, '0');
  return { time: `${h % 12 || 12}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`, period: h < 12 ? 'AM' : 'PM' };
}

/** Today's date with a live 12-hour clock, for the home header. */
export function LiveClock() {
  const now = useNow();
  const date = now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  const { time, period } = format12h(now);

  return (
    <View className="flex-row flex-wrap items-center gap-x-2 gap-y-1">
      <Text className="text-[13px] font-semibold uppercase tracking-[0.4px] text-muted-foreground">{date}</Text>
      <View
        className="flex-row items-baseline gap-1 rounded-full bg-accent px-2.5 py-0.5"
        accessible
        accessibilityRole="timer"
        accessibilityLabel={`Time ${time.slice(0, -3)} ${period}`}
      >
        <Text className="font-mono-bold text-[13px] text-info" style={{ fontVariant: ['tabular-nums'] }}>
          {time}
        </Text>
        <Text className="text-[11px] font-semibold text-info">{period}</Text>
      </View>
    </View>
  );
}
