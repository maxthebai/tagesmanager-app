import { Pressable, StyleSheet, Text, View } from 'react-native';
import { status, ApprovalRequest } from '../lib/status';
import { colors } from '../theme';

export function ApprovalCard({ approval }: { approval: ApprovalRequest }) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Bestätigung nötig: {approval.title}</Text>
      <Text style={styles.detail}>{approval.detail}</Text>
      <View style={styles.row}>
        <Pressable style={[styles.btn, styles.no]} onPress={() => status.answerApproval(false)}>
          <Text style={styles.noText}>Nein</Text>
        </Pressable>
        <Pressable style={[styles.btn, styles.yes]} onPress={() => status.answerApproval(true)}>
          <Text style={styles.yesText}>Ja, ausführen</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#2a2415',
    borderColor: colors.warn,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginVertical: 8,
  },
  title: { color: colors.warn, fontWeight: '700', fontSize: 15, marginBottom: 6 },
  detail: { color: colors.text, fontSize: 14, marginBottom: 12 },
  row: { flexDirection: 'row', gap: 10 },
  btn: { flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  yes: { backgroundColor: colors.warn },
  yesText: { color: '#1b1405', fontWeight: '700' },
  no: { backgroundColor: colors.card2, borderWidth: 1, borderColor: colors.border },
  noText: { color: colors.text, fontWeight: '600' },
});
