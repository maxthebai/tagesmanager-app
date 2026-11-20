import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { Btn, Card, Chip, Empty, Field, Page, Row, Section, Sub } from '../components/ui';
import { addTask, deleteTask, listTasks, setTaskDone, Task } from '../lib/db';
import { useTheme } from '../theme';

const KINDS: { key: string; label: string }[] = [
  { key: 'homework', label: 'Hausaufgabe' },
  { key: 'exam', label: 'Klausur' },
  { key: 'project', label: 'Projekt' },
  { key: 'other', label: 'Sonstiges' },
];

export function TasksScreen({ active }: { active: boolean }) {
  const t = useTheme();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [due, setDue] = useState('');
  const [kind, setKind] = useState('homework');
  const [showDone, setShowDone] = useState(false);

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
    setAdding(false);
    await load();
  };

  const open = tasks.filter((x) => x.done !== 1);
  const done = tasks.filter((x) => x.done === 1);

  const item = (x: Task) => (
    <Card
      key={x.id}
      onPress={async () => {
        await setTaskDone(x.id, x.done !== 1);
        await load();
      }}
      onLongPress={() =>
        Alert.alert('Löschen?', x.title, [
          { text: 'Abbrechen', style: 'cancel' },
          {
            text: 'Löschen',
            style: 'destructive',
            onPress: async () => {
              await deleteTask(x.id);
              await load();
            },
          },
        ])
      }
      style={x.done === 1 ? { opacity: 0.5 } : undefined}
    >
      <Row gap={14}>
        <View
          style={{
            width: 22,
            height: 22,
            borderRadius: 11,
            borderWidth: 2,
            borderColor: x.done === 1 ? t.accent : t.mute,
            backgroundColor: x.done === 1 ? t.accent : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {x.done === 1 ? <Text style={{ color: t.onAccent, fontSize: 13, fontWeight: '700' }}>✓</Text> : null}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: t.text, fontSize: 16, textDecorationLine: x.done === 1 ? 'line-through' : 'none' }}>{x.title}</Text>
          <Sub>
            {KINDS.find((k) => k.key === x.kind)?.label ?? 'Sonstiges'}
            {x.subject ? ` · ${x.subject}` : ''}
            {x.due ? ` · fällig ${x.due}` : ''}
          </Sub>
        </View>
      </Row>
    </Card>
  );

  return (
    <Page>
      {adding ? (
        <Card>
          <Field placeholder="Neue Aufgabe" value={title} onChangeText={setTitle} autoFocus />
          <Row style={{ marginTop: 8 }}>
            <Field style={{ flex: 1 }} placeholder="Fach" value={subject} onChangeText={setSubject} />
            <Field style={{ flex: 1 }} placeholder="Fällig JJJJ-MM-TT" value={due} onChangeText={setDue} />
          </Row>
          <Row style={{ flexWrap: 'wrap', marginTop: 10 }}>
            {KINDS.map((k) => (
              <Chip key={k.key} label={k.label} selected={kind === k.key} onPress={() => setKind(k.key)} />
            ))}
          </Row>
          <Row style={{ marginTop: 12 }}>
            <Btn label="Hinzufügen" onPress={() => void add()} style={{ flex: 1 }} />
            <Btn label="Abbrechen" kind="text" onPress={() => setAdding(false)} />
          </Row>
        </Card>
      ) : (
        <Btn label="+ Neue Aufgabe" kind="tonal" onPress={() => setAdding(true)} style={{ marginBottom: 14 }} />
      )}
      {open.length === 0 ? <Empty text="Nichts zu tun. Du kannst Aufgaben auch dem Agenten diktieren." /> : open.map(item)}
      {done.length > 0 ? (
        <Section title={`Erledigt (${done.length})`}>
          <Pressable onPress={() => setShowDone((v) => !v)}>
            <Text style={{ color: t.accent, marginBottom: 10 }}>{showDone ? 'Ausblenden' : 'Anzeigen'}</Text>
          </Pressable>
          {showDone ? done.map(item) : null}
        </Section>
      ) : null}
    </Page>
  );
}
