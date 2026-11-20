import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { stopRun } from '../lib/agent';
import { StepKind, useStatus } from '../lib/status';
import { useTheme } from '../theme';
import { ApprovalCard } from './ApprovalCard';
import { Btn } from './ui';

const MARK: Record<StepKind, string> = { info: '•', tool: '›', result: '✓', approval: '?', error: '!' };

function time(ts: number): string {
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/** Live-Ansicht als Bottom-Sheet: alle Schritte des laufenden oder letzten Auftrags, Bestätigungen und Stopp. */
export function LiveView({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const t = useTheme();
  const s = useStatus();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' }} onPress={onClose} />
      <View
        style={{
          backgroundColor: t.surface,
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          paddingHorizontal: 20,
          paddingTop: 10,
          paddingBottom: insets.bottom + 16,
          maxHeight: '82%',
        }}
      >
        <View style={{ alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: t.surface3, marginBottom: 14 }} />
        <Text style={{ color: t.text, fontSize: 20, fontWeight: '500' }}>Was der Agent gerade tut</Text>
        <Text style={{ color: t.mute, fontSize: 14, marginTop: 4, marginBottom: 10 }}>{s.label}</Text>
        {s.approval ? <ApprovalCard approval={s.approval} /> : null}
        <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={{ paddingBottom: 8 }}>
          {s.steps.length === 0 ? (
            <Text style={{ color: t.mute, fontSize: 15, marginVertical: 12 }}>Noch keine Schritte. Starte einen Auftrag im Chat.</Text>
          ) : null}
          {s.steps.map((st) => (
            <View key={st.id} style={{ flexDirection: 'row', gap: 12, paddingVertical: 8 }}>
              <Text style={{ width: 16, color: st.kind === 'error' ? t.err : st.kind === 'result' ? t.ok : t.accent, fontSize: 16, fontWeight: '700' }}>
                {MARK[st.kind]}
              </Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: st.kind === 'error' ? t.err : t.text, fontSize: 15 }}>{st.label}</Text>
                {st.detail ? (
                  <Text style={{ color: t.mute, fontSize: 12, marginTop: 2 }} numberOfLines={3}>
                    {st.detail}
                  </Text>
                ) : null}
              </View>
              <Text style={{ color: t.mute, fontSize: 11 }}>{time(st.ts)}</Text>
            </View>
          ))}
        </ScrollView>
        <View style={{ marginTop: 10 }}>
          {s.running ? <Btn label="Stopp" kind="danger" onPress={stopRun} /> : <Btn label="Schließen" kind="tonal" onPress={onClose} />}
        </View>
      </View>
    </Modal>
  );
}
