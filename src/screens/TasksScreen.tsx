import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { addTask, deleteTask, listTasks, setTaskDone, Task } from '../lib/db';
import { colors, common } from '../theme';

const KINDS: { key: string; label: string }[] = [
  { key: 'homework', label: 'Hausaufgabe' },
  { key: 'exam', label: 'Klausur' },
  { key: 'project', label: 'Projekt' },
  { key: 'other', label: 'Sonstiges' },
];

export function TasksScreen({ active }: { active: boolean }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [due, setDue] = useState('');
  const [kind, setKind] = useState('homework');

  const load = useCallback(async () => setTasks(await listTasks(true)), []);
  useEffect(() => {
    if (active) void load();
  }, [active, load]);

  const add = async () => {
    if (!title.trim()) return;
    if (due.trim() && !/^\d{4}-\d{2}-\d{2}$/.test(due.trim())) {
      Alert.alert('Datum', 'Bitte als JJJJ-MM-TT eingeben, z. B. 2026-12-03.');
      return;
    }
    await addTask({ title: title.trim(), subject: subject.trim() || null, kind, due: due.trim() || null });
    setTitle('');
    setSubject('');
    setDue('');
    await load();
  };

  return (
    <FlatList
      style={common.screen}
      contentContainerStyle={common.pad}
      data={tasks}
      keyExtractor={(t) => String(t.id)}
      ListHeaderComponent={
        <View>
          <Text style={common.h1}>Aufgaben</Text>
          <View style={common.card}>
            <TextInput style={common.input} placeholder="Neue Aufgabe" placeholderTextColor={colors.sub} value={title} onChangeText={setTitle} />
            <View style={[common.row, { gap: 8, marginTop: 8 }]}>
              <TextInput style={[common.input, { flex: 1 }]} placeholder="Fach" placeholderTextColor={colors.sub} value={subject} onChangeText={setSubject} />
              <TextInput style={[common.input, { flex: 1 }]} placeholder="Fällig JJJJ-MM-TT" placeholderTextColor={colors.sub} value={due} onChangeText={setDue} />
            </View>
            <View style={[common.row, { flexWrap: 'wrap', gap: 8, marginTop: 8 }]}>
              {KINDS.map((k) => (
                <Pressable
                  key={k.key}
                  onPress={() => setKind(k.key)}
                  style={[common.btnGhost, { paddingVertical: 6, paddingHorizontal: 12 }, kind === k.key && { borderColor: colors.accent }]}
                >
                  <Text style={[common.btnGhostText, { fontSize: 13 }, kind === k.key && { color: colors.accent }]}>{k.label}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable style={[common.btn, { marginTop: 10 }]} onPress={() => void add()}>
              <Text style={common.btnText}>Hinzufügen</Text>
            </Pressable>
          </View>
        </View>
      }
      ListEmptyComponent={<Text style={common.sub}>Noch keine Aufgaben. Du kannst sie auch dem Agenten diktieren.</Text>}
      renderItem={({ item }) => (
        <Pressable
          style={[common.card, item.done === 1 && { opacity: 0.5 }]}
          onPress={async () => {
            await setTaskDone(item.id, item.done !== 1);
            await load();
          }}
          onLongPress={() =>
            Alert.alert('Löschen?', item.title, [
              { text: 'Abbrechen', style: 'cancel' },
              {
                text: 'Löschen',
                style: 'destructive',
                onPress: async () => {
                  await deleteTask(item.id);
                  await load();
                },
              },
            ])
          }
        >
          <Text style={[common.text, item.done === 1 && { textDecorationLine: 'line-through' }]}>
            {item.done === 1 ? '☑ ' : '☐ '}
            {item.title}
          </Text>
          <Text style={common.sub}>
            {KINDS.find((k) => k.key === item.kind)?.label ?? 'Sonstiges'}
            {item.subject ? ` · ${item.subject}` : ''}
            {item.due ? ` · fällig ${item.due}` : ''}
          </Text>
        </Pressable>
      )}
    />
  );
}
