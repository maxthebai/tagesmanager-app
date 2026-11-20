import { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Pressable, StyleSheet, Text } from 'react-native';
import { AgentState, useStatus } from '../lib/status';
import { colors } from '../theme';

const DOT: Record<AgentState, string> = {
  idle: colors.ok,
  thinking: colors.accent,
  reading_calendar: colors.accent,
  writing_calendar: colors.accent,
  tasks: colors.accent,
  waiting_approval: colors.warn,
  stopped: colors.sub,
  error: colors.err,
};

/** Immer sichtbare Statuszeile: zeigt, was der Agent gerade tut. Tippen öffnet die Live-Ansicht. */
export function AgentStatusBar({ onPress }: { onPress: () => void }) {
  const s = useStatus();
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!s.running) {
      pulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.3, duration: 600, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [s.running, pulse]);

  return (
    <Pressable onPress={onPress} style={styles.bar} accessibilityRole="button" accessibilityLabel="Agent-Status öffnen">
      <Animated.View style={[styles.dot, { backgroundColor: DOT[s.state], opacity: pulse }]} />
      <Text style={styles.label} numberOfLines={1}>
        {s.label}
      </Text>
      {s.running ? <ActivityIndicator size="small" color={colors.accent} /> : <Text style={styles.more}>Details</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  label: { flex: 1, color: colors.text, fontSize: 14, fontWeight: '600' },
  more: { color: colors.sub, fontSize: 12 },
});
