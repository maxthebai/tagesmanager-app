import { useEffect, useRef } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';
import { AgentState, useStatus } from '../lib/status';
import { Theme, useTheme } from '../theme';

function dotColor(state: AgentState, t: Theme): string {
  switch (state) {
    case 'idle':
      return t.ok;
    case 'waiting_approval':
      return t.warn;
    case 'error':
      return t.err;
    case 'stopped':
      return t.mute;
    default:
      return t.accent;
  }
}

/** Obere Leiste: Menü, Titel und die immer sichtbare Status-Pille des Agenten. */
export function TopBar({ title, onMenu, onStatus }: { title: string; onMenu: () => void; onStatus: () => void }) {
  const t = useTheme();
  const s = useStatus();
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!s.running) {
      pulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.25, duration: 650, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 650, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [s.running, pulse]);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 6, backgroundColor: t.bg }}>
      <Pressable onPress={onMenu} hitSlop={8} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }} accessibilityLabel="Menü">
        <View style={{ gap: 5 }}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={{ width: 20, height: 2, borderRadius: 1, backgroundColor: t.text }} />
          ))}
        </View>
      </Pressable>
      <Text style={{ color: t.text, fontSize: 20, fontWeight: '500', marginLeft: 4, flexShrink: 0 }}>{title}</Text>
      <View style={{ flex: 1 }} />
      <Pressable
        onPress={onStatus}
        accessibilityLabel="Agent-Status öffnen"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          backgroundColor: t.surface,
          borderRadius: 100,
          paddingVertical: 8,
          paddingHorizontal: 14,
          maxWidth: '58%',
        }}
      >
        <Animated.View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: dotColor(s.state, t), opacity: pulse }} />
        <Text style={{ color: t.sub, fontSize: 13, flexShrink: 1 }} numberOfLines={1}>
          {s.label}
        </Text>
      </Pressable>
    </View>
  );
}
