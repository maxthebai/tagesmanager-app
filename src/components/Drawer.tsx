import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NAV, Screen } from '../nav';
import { useTheme } from '../theme';

export function Drawer({
  visible,
  current,
  onSelect,
  onClose,
}: {
  visible: boolean;
  current: Screen;
  onSelect: (s: Screen) => void;
  onClose: () => void;
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const w = Math.min(width * 0.82, 340);
  const x = useRef(new Animated.Value(-w)).current;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.timing(x, { toValue: 0, duration: 220, useNativeDriver: true }).start();
    } else {
      Animated.timing(x, { toValue: -w, duration: 180, useNativeDriver: true }).start(() => setMounted(false));
    }
  }, [visible, w, x]);

  if (!mounted) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View
        style={[StyleSheet.absoluteFill, { backgroundColor: '#000', opacity: x.interpolate({ inputRange: [-w, 0], outputRange: [0, 0.5] }) }]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Menü schließen" />
      </Animated.View>
      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 0,
          width: w,
          backgroundColor: t.surface,
          borderTopRightRadius: 28,
          borderBottomRightRadius: 28,
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom + 12,
          transform: [{ translateX: x }],
        }}
      >
        <Text style={{ color: t.text, fontSize: 22, fontWeight: '500', paddingHorizontal: 24, marginBottom: 12 }}>Tagesmanager</Text>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 16 }}>
          {NAV.map((g) => (
            <View key={g.group || 'main'} style={{ marginBottom: 6 }}>
              {g.group ? (
                <Text style={{ color: t.mute, fontSize: 12, fontWeight: '600', paddingHorizontal: 12, paddingTop: 14, paddingBottom: 6 }}>
                  {g.group}
                </Text>
              ) : null}
              {g.items.map((it) => {
                const sel = it.key === current;
                return (
                  <Pressable
                    key={it.key}
                    onPress={() => onSelect(it.key)}
                    style={{
                      height: 48,
                      borderRadius: 100,
                      paddingHorizontal: 14,
                      justifyContent: 'center',
                      backgroundColor: sel ? t.accentSoft : 'transparent',
                    }}
                  >
                    <Text style={{ color: sel ? (t.dark ? '#d3e3fd' : '#041e49') : t.text, fontSize: 16, fontWeight: sel ? '600' : '400' }}>
                      {it.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </ScrollView>
      </Animated.View>
    </View>
  );
}
