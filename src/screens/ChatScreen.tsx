import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ApprovalCard } from '../components/ApprovalCard';
import { runAgent, stopRun } from '../lib/agent';
import { recentMessages } from '../lib/db';
import { status, useStatus } from '../lib/status';
import { colors } from '../theme';

type Item = { id: string; role: 'user' | 'assistant'; text: string };

export const QUICK_PROMPTS: { label: string; prompt: string }[] = [
  {
    label: 'Morgenbriefing',
    prompt:
      'Mach mir ein Morgenbriefing für heute: Termine, fällige und überfällige Aufgaben, Klausuren in den nächsten 14 Tagen und woran ich denken sollte. Kurz.',
  },
  {
    label: 'Tagesplan',
    prompt:
      'Plane meinen restlichen Tag: lies Kalender und Aufgaben, baue Pausen und Essen ein und schlage vor, wann ich was erledige. Lege noch nichts im Kalender an.',
  },
  { label: 'Plan B', prompt: 'Ich schaffe heute nichts. Streiche meinen Tag auf das Nötigste zusammen.' },
  {
    label: 'Lernplan',
    prompt:
      'Ich möchte einen Lernplan für eine Klausur. Frage mich nach Fach, Termin und Stoff und verteile die Lerneinheiten dann auf meine freien Zeiten.',
  },
  { label: 'Hausaufgabe', prompt: 'Ich möchte eine Hausaufgabe eintragen. Frage mich nach Fach und Abgabe.' },
];

export function ChatScreen({
  active,
  pendingPrompt,
  onPromptConsumed,
}: {
  active: boolean;
  pendingPrompt: string | null;
  onPromptConsumed: () => void;
}) {
  const s = useStatus();
  const [items, setItems] = useState<Item[]>([]);
  const [text, setText] = useState('');
  const listRef = useRef<FlatList<Item>>(null);

  const load = useCallback(async () => {
    const rows = await recentMessages(60);
    setItems(rows.map((r) => ({ id: String(r.id), role: r.role, text: r.text })));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const send = useCallback(
    async (msg: string) => {
      const clean = msg.trim();
      if (!clean || status.get().running) return;
      setItems((prev) => [...prev, { id: `tmp-${Date.now()}`, role: 'user', text: clean }]);
      setText('');
      await runAgent(clean);
      await load();
    },
    [load],
  );

  useEffect(() => {
    if (pendingPrompt) {
      const p = pendingPrompt;
      onPromptConsumed();
      void send(p);
    }
  }, [pendingPrompt, onPromptConsumed, send]);

  useEffect(() => {
    if (active) setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }, [items.length, s.steps.length, active]);

  return (
    <KeyboardAvoidingView
      style={styles.wrap}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <FlatList
        ref={listRef}
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>
            Hallo! Ich bin dein Tagesmanager. Frag mich nach deinem Tag, trag Hausaufgaben ein oder lass uns einen
            Lernplan machen. Tippe unten auf einen Vorschlag.
          </Text>
        }
        renderItem={({ item }) => (
          <View style={[styles.bubble, item.role === 'user' ? styles.user : styles.bot]}>
            <Text style={styles.msg}>{item.text}</Text>
          </View>
        )}
        ListFooterComponent={
          <View>
            {s.running ? (
              <View style={[styles.bubble, styles.bot]}>
                <Text style={styles.working}>{s.label}</Text>
                {s.steps.slice(-3).map((st) => (
                  <Text key={st.id} style={styles.stepLine} numberOfLines={1}>
                    {st.label}
                  </Text>
                ))}
              </View>
            ) : null}
            {s.approval ? <ApprovalCard approval={s.approval} /> : null}
          </View>
        }
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips} contentContainerStyle={{ gap: 8, paddingHorizontal: 12 }}>
        {QUICK_PROMPTS.map((q) => (
          <Pressable key={q.label} style={styles.chip} onPress={() => void send(q.prompt)} disabled={s.running}>
            <Text style={styles.chipText}>{q.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Nachricht an deinen Agenten …"
          placeholderTextColor={colors.sub}
          multiline
          editable={!s.running}
        />
        {s.running ? (
          <Pressable style={[styles.send, { backgroundColor: colors.err }]} onPress={stopRun}>
            <Text style={styles.sendText}>Stopp</Text>
          </Pressable>
        ) : (
          <Pressable style={styles.send} onPress={() => void send(text)}>
            <Text style={styles.sendText}>Senden</Text>
          </Pressable>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  list: { padding: 12, paddingBottom: 4 },
  empty: { color: colors.sub, fontSize: 15, lineHeight: 22, margin: 16 },
  bubble: { maxWidth: '88%', borderRadius: 16, padding: 12, marginBottom: 8 },
  user: { alignSelf: 'flex-end', backgroundColor: '#23406b' },
  bot: { alignSelf: 'flex-start', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  msg: { color: colors.text, fontSize: 15, lineHeight: 21 },
  working: { color: colors.accent, fontWeight: '600', fontSize: 14, marginBottom: 4 },
  stepLine: { color: colors.sub, fontSize: 12 },
  chips: { flexGrow: 0, paddingVertical: 6 },
  chip: {
    backgroundColor: colors.card2,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipText: { color: colors.text, fontSize: 13, fontWeight: '600' },
  inputRow: { flexDirection: 'row', gap: 8, padding: 12, paddingTop: 6, alignItems: 'flex-end' },
  input: {
    flex: 1,
    maxHeight: 120,
    backgroundColor: colors.card2,
    color: colors.text,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    borderWidth: 1,
    borderColor: colors.border,
  },
  send: { backgroundColor: colors.accent, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 12 },
  sendText: { color: '#0b1220', fontWeight: '700' },
});
