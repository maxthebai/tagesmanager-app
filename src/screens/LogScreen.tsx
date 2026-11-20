import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, Text, View } from 'react-native';
import { listLog, LogRow, markUndone } from '../lib/db';
import { undoAction, UndoInfo } from '../lib/tools';
import { colors, common } from '../theme';

function fmt(ts: number): string {
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}. ${p(d.getHours())}:${p(d.getMinutes())}`;
}

const KIND_COLOR: Record<string, string> = {
  action: colors.ok,
  error: colors.err,
  run: colors.accent,
  tool: colors.sub,
};

export function LogScreen({ active }: { active: boolean }) {
  const [rows, setRows] = useState<LogRow[]>([]);
  const load = useCallback(async () => setRows(await listLog(150)), []);
  useEffect(() => {
    if (active) void load();
  }, [active, load]);

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
    <FlatList
      style={common.screen}
      contentContainerStyle={common.pad}
      data={rows}
      keyExtractor={(r) => String(r.id)}
      ListHeaderComponent={
        <View>
          <Text style={common.h1}>Protokoll</Text>
          <Text style={[common.sub, { marginBottom: 12 }]}>Alles, was der Agent getan hat. Änderungen kannst du hier rückgängig machen.</Text>
        </View>
      }
      ListEmptyComponent={<Text style={common.sub}>Noch keine Aktivität.</Text>}
      renderItem={({ item }) => (
        <View style={[common.card, { borderLeftWidth: 4, borderLeftColor: KIND_COLOR[item.kind] ?? colors.border }]}>
          <Text style={common.sub}>{fmt(item.ts)}</Text>
          <Text style={common.text}>{item.label}</Text>
          {item.detail ? <Text style={[common.sub, { marginTop: 2 }]} numberOfLines={4}>{item.detail}</Text> : null}
          {item.undo ? (
            item.undone === 1 ? (
              <Text style={[common.sub, { marginTop: 6 }]}>Rückgängig gemacht</Text>
            ) : (
              <Pressable style={[common.btnGhost, { marginTop: 8, alignSelf: 'flex-start', paddingVertical: 6 }]} onPress={() => undo(item)}>
                <Text style={[common.btnGhostText, { fontSize: 13 }]}>Rückgängig</Text>
              </Pressable>
            )
          ) : null}
        </View>
      )}
    />
  );
}
