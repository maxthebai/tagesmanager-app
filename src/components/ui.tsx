import { ReactNode } from 'react';
import {
  Pressable,
  RefreshControlProps,
  ScrollView,
  StyleProp,
  Text,
  TextInput,
  TextInputProps,
  TextProps,
  View,
  ViewStyle,
} from 'react-native';
import { useTheme } from '../theme';

export function Body({ style, ...rest }: TextProps) {
  const t = useTheme();
  return <Text {...rest} style={[{ color: t.text, fontSize: 16, lineHeight: 23 }, style]} />;
}

export function Sub({ style, ...rest }: TextProps) {
  const t = useTheme();
  return <Text {...rest} style={[{ color: t.mute, fontSize: 13, lineHeight: 18 }, style]} />;
}

export function Title({ style, ...rest }: TextProps) {
  const t = useTheme();
  return <Text {...rest} style={[{ color: t.text, fontSize: 30, fontWeight: '500', marginBottom: 16 }, style]} />;
}

export function Section({ title, children }: { title: string; children?: ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ marginTop: 22 }}>
      <Text style={{ color: t.sub, fontSize: 14, fontWeight: '600', marginBottom: 10, letterSpacing: 0.2 }}>{title}</Text>
      {children}
    </View>
  );
}

export function Card({
  children,
  onPress,
  onLongPress,
  style,
  accent,
}: {
  children: ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  style?: StyleProp<ViewStyle>;
  accent?: string;
}) {
  const t = useTheme();
  const base: ViewStyle = {
    backgroundColor: t.surface,
    borderRadius: 20,
    padding: 16,
    marginBottom: 10,
    ...(accent ? { borderLeftWidth: 4, borderLeftColor: accent } : null),
  };
  if (onPress || onLongPress) {
    return (
      <Pressable onPress={onPress} onLongPress={onLongPress} style={[base, style]} android_ripple={{ color: t.surface3 }}>
        {children}
      </Pressable>
    );
  }
  return <View style={[base, style]}>{children}</View>;
}

export function Btn({
  label,
  onPress,
  kind = 'primary',
  small,
  disabled,
  style,
}: {
  label: string;
  onPress: () => void;
  kind?: 'primary' | 'tonal' | 'text' | 'danger';
  small?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  const bg =
    kind === 'primary' ? t.accent : kind === 'tonal' ? t.surface2 : kind === 'danger' ? t.surface2 : 'transparent';
  const fg = kind === 'primary' ? t.onAccent : kind === 'danger' ? t.err : kind === 'text' ? t.accent : t.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        {
          backgroundColor: bg,
          borderRadius: 100,
          paddingVertical: small ? 8 : 13,
          paddingHorizontal: small ? 16 : 22,
          alignItems: 'center',
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      <Text style={{ color: fg, fontSize: small ? 13 : 15, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}

export function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: selected ? t.accentSoft : t.surface,
        borderRadius: 100,
        paddingVertical: 8,
        paddingHorizontal: 16,
      }}
    >
      <Text style={{ color: selected ? (t.dark ? '#d3e3fd' : '#041e49') : t.sub, fontSize: 14, fontWeight: '500' }}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Field({ style, ...rest }: TextInputProps) {
  const t = useTheme();
  return (
    <TextInput
      placeholderTextColor={t.mute}
      {...rest}
      style={[
        {
          backgroundColor: t.surface,
          color: t.text,
          borderRadius: 16,
          paddingHorizontal: 16,
          paddingVertical: 12,
          fontSize: 16,
        },
        style,
      ]}
    />
  );
}

export function Row({ children, gap = 8, style }: { children: ReactNode; gap?: number; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>{children}</View>;
}

export function Empty({ text }: { text: string }) {
  const t = useTheme();
  return <Text style={{ color: t.mute, fontSize: 15, lineHeight: 22, marginVertical: 12 }}>{text}</Text>;
}

export function Page({
  children,
  refreshControl,
}: {
  children: ReactNode;
  refreshControl?: React.ReactElement<RefreshControlProps>;
}) {
  const t = useTheme();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: t.bg }}
      contentContainerStyle={{ padding: 20, paddingBottom: 48 }}
      keyboardShouldPersistTaps="handled"
      refreshControl={refreshControl}
    >
      {children}
    </ScrollView>
  );
}
