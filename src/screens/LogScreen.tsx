import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { Btn, Card, Empty, Page, Sub, Body } from '../components/ui';
import { listLog, LogRow, markUndone } from '../lib/db';
import { undoAction, UndoInfo } from '../lib/tools';
import { useTheme } from '../theme';

function fmt(ts: number): string {
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}. ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function LogScreen({ active }: { active: boolean }) {
  const t = useTheme();
  const [rows, setRows] = useState<LogRow[]>([]);
  const load = useCallback(async () => setRows(await listLog(150)), []);
  useEffect(() => {
    if (active) void load();
  }, [active, load]);

  const color: Record<string, string> = { action: t.ok, error: t.err, run: t.accent, tool: t.mute };

  const undo = (row: LogRow) => {
    if (!row.undo) return;
    Alert.alert('Rückgängig machen?', row.label, [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Rückgängig',
        onPress: async () => {
          try {
            await undoAction(JSON.parse(row.undo as string) as UndoInfo);
            await markUndone(row.id);
            await load();
          } catch (e) {
            Alert.alert('Fehler', e instanceof Error ? e.message : String(e));
          }
        },
      },
    ]);
  };

  return (
    <Page>
      <Sub style={{ marginBottom: 14 }}>Alles, was der Agent getan hat. Änderungen kannst du hier rückgängig machen.</Sub>
      {rows.length === 0 ? <Empty text="Noch keine Aktivität." /> : null}
      {rows.map((r) => (
        <Card key={r.id} accent={color[r.kind] ?? t.line}>
          <Sub>{fmt(r.ts)}</Sub>
          <Body>{r.label}</Body>
          {r.detail ? (
            <Sub style={{ marginTop: 2 }} numberOfLines={4}>
              {r.detail}
            </Sub>
          ) : null}
          {r.undo ? (
            r.undone === 1 ? (
              <Sub style={{ marginTop: 6 }}>Rückgängig gemacht</Sub>
            ) : (
              <Btn label="Rückgängig" kind="tonal" small onPress={() => undo(r)} style={{ marginTop: 8, alignSelf: 'flex-start' }} />
            )
          ) : null}
        </Card>
      ))}
    </Page>
  );
}
