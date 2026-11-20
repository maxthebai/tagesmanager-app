import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { stopRun } from '../lib/agent';
import { StepKind, useStatus } from '../lib/status';
import { colors } from '../theme';
import { ApprovalCard } from './ApprovalCard';

const ICON: Record<StepKind, string> = { info: '•', tool: '🔧', result: '✔', approval: '❓', error: '⚠' };

function time(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}

/** Live-Ansicht: alle Schritte des laufenden oder letzten Auftrags, Bestätigungen und Stopp. */
export function LiveView({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const s = useStatus();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.wrap, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8 }]}>
        <View style={styles.head}>
          <Text style={styles.title}>Was der Agent gerade tut</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={styles.close}>Schließen</Text>
          </Pressable>
        </View>
        <Text style={styles.state}>{s.label}</Text>
        {s.approval ? <ApprovalCard approval={s.approval} /> : null}
        <ScrollView style={styles.list} contentContainerStyle={{ paddingBottom: 12 }}>
          {s.steps.length === 0 ? <Text style={styles.empty}>Noch keine Schritte. Starte einen Auftrag im Chat.</Text> : null}
          {s.steps.map((st) => (
            <View key={st.id} style={styles.step}>
              <Text style={styles.icon}>{ICON[st.kind]}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.stepLabel, st.kind === 'error' && { color: colors.err }]}>{st.label}</Text>
                {st.detail ? <Text style={styles.stepDetail}>{st.detail}</Text> : null}
              </View>
              <Text style={styles.ts}>{time(st.ts)}</Text>
            </View>
          ))}
        </ScrollView>
        {s.running ? (
          <Pressable style={styles.stop} onPress={stopRun}>
            <Text style={styles.stopText}>Stopp</Text>
          </Pressable>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 16 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { color: colors.text, fontSize: 20, fontWeight: '700' },
  close: { color: colors.accent, fontSize: 15, fontWeight: '600' },
  state: { color: colors.sub, fontSize: 14, marginBottom: 8 },
  list: { flex: 1 },
  empty: { color: colors.sub, marginTop: 20 },
  step: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  icon: { width: 22, color: colors.text, fontSize: 15 },
  stepLabel: { color: colors.text, fontSize: 14, fontWeight: '600' },
  stepDetail: { color: colors.sub, fontSize: 12, marginTop: 2 },
  ts: { color: colors.sub, fontSize: 11 },
  stop: { backgroundColor: colors.err, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  stopText: { color: '#1b0a0a', fontWeight: '800', fontSize: 16 },
});
