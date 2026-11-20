import { Text, View } from 'react-native';
import { ApprovalRequest, status } from '../lib/status';
import { useTheme } from '../theme';
import { Btn, Row } from './ui';

export function ApprovalCard({ approval }: { approval: ApprovalRequest }) {
  const t = useTheme();
  return (
    <View style={{ backgroundColor: t.surface, borderRadius: 24, padding: 16, marginVertical: 8 }}>
      <Text style={{ color: t.accent, fontSize: 13, fontWeight: '600', marginBottom: 6 }}>Bestätigung nötig</Text>
      <Text style={{ color: t.text, fontSize: 17, fontWeight: '500', marginBottom: 6 }}>{approval.title}</Text>
      <Text style={{ color: t.sub, fontSize: 15, lineHeight: 21, marginBottom: 14 }}>{approval.detail}</Text>
      <Row gap={10}>
        <Btn label="Abbrechen" kind="tonal" onPress={() => status.answerApproval(false)} style={{ flex: 1 }} />
        <Btn label="Ausführen" onPress={() => status.answerApproval(true)} style={{ flex: 1 }} />
      </Row>
    </View>
  );
}
