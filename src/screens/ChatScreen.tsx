import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ApprovalCard } from '../components/ApprovalCard';
import { Markdown } from '../components/Markdown';
import { runAgent, stopRun } from '../lib/agent';
import { recentMessages } from '../lib/db';
import { getSettings } from '../lib/settings';
import { status, useStatus } from '../lib/status';
import { SUGGESTIONS } from '../prompts';
import { useTheme } from '../theme';

type Item = { id: string; role: 'user' | 'assistant'; text: string };
type Attachment = { uri: string; base64: string };

export function ChatScreen({
  active,
  pendingPrompt,
  onPromptConsumed,
}: {
  active: boolean;
  pendingPrompt: string | null;
  onPromptConsumed: () => void;
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const s = useStatus();
  const [items, setItems] = useState<Item[]>([]);
  const [text, setText] = useState('');
  const [name, setName] = useState('');
  const [photo, setPhoto] = useState<Attachment | null>(null);
  const [kbd, setKbd] = useState(false);
  const listRef = useRef<FlatList<Item>>(null);

  const load = useCallback(async () => {
    const rows = await recentMessages(60);
    setItems(rows.map((r) => ({ id: String(r.id), role: r.role, text: r.text })));
    setName((await getSettings()).name);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (active) void getSettings().then((x) => setName(x.name));
  }, [active]);

  useEffect(() => {
    const a = Keyboard.addListener('keyboardDidShow', () => setKbd(true));
    const b = Keyboard.addListener('keyboardDidHide', () => setKbd(false));
    return () => {
      a.remove();
      b.remove();
    };
  }, []);

  const send = useCallback(
    async (msg: string, img?: Attachment | null) => {
      const clean = msg.trim();
      if ((!clean && !img) || status.get().running) return;
      setItems((prev) => [...prev, { id: `tmp-${Date.now()}`, role: 'user', text: `${img ? '📷 ' : ''}${clean}`.trim() }]);
      setText('');
      setPhoto(null);
      await runAgent(clean, img?.base64);
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
    if (active) setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 120);
  }, [items.length, s.steps.length, s.approval, active]);

  const pick = useCallback(async (kind: 'camera' | 'library') => {
    try {
      if (kind === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          Alert.alert('Kamera', 'Erlaube den Kamerazugriff in den Android-Einstellungen, um Fotos aufzunehmen.');
          return;
        }
      }
      const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.5, base64: true };
      const res = kind === 'camera' ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
      const a = res.canceled ? null : res.assets[0];
      if (a?.base64) setPhoto({ uri: a.uri, base64: a.base64 });
    } catch (e) {
      Alert.alert('Foto', e instanceof Error ? e.message : String(e));
    }
  }, []);

  const attachMenu = useCallback(() => {
    Alert.alert('Foto hinzufügen', 'Der Agent liest das Foto und trägt ein, was sich eintragen lässt.', [
      { text: 'Kamera', onPress: () => void pick('camera') },
      { text: 'Galerie', onPress: () => void pick('library') },
      { text: 'Abbrechen', style: 'cancel' },
    ]);
  }, [pick]);

  const empty = items.length === 0 && !s.running;
  const canSend = (text.trim().length > 0 || photo !== null) && !s.running;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: t.bg }} behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}>
      {empty ? (
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24 }}>
          <Text style={{ color: t.accent, fontSize: 38, fontWeight: '500', lineHeight: 46 }}>Hallo{name ? `, ${name}` : ''}</Text>
          <Text style={{ color: t.mute, fontSize: 38, fontWeight: '500', lineHeight: 46 }}>Wie kann ich dir heute helfen?</Text>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          style={{ flex: 1 }}
          data={items}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 }}
          renderItem={({ item }) =>
            item.role === 'user' ? (
              <View
                style={{
                  alignSelf: 'flex-end',
                  maxWidth: '85%',
                  backgroundColor: t.surface2,
                  borderRadius: 22,
                  borderBottomRightRadius: 8,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  marginVertical: 8,
                }}
              >
                <Text style={{ color: t.text, fontSize: 16, lineHeight: 23 }}>{item.text}</Text>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', gap: 12, marginVertical: 10, paddingRight: 8 }}>
                <Text style={{ color: t.accent, fontSize: 18, marginTop: 1 }}>✦</Text>
                <View style={{ flex: 1 }}>
                  <Markdown text={item.text} />
                </View>
              </View>
            )
          }
          ListFooterComponent={
            <View>
              {s.running ? (
                <View style={{ flexDirection: 'row', gap: 12, marginVertical: 10 }}>
                  <ActivityIndicator size="small" color={t.accent} style={{ marginTop: 2 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: t.accent, fontSize: 15, fontWeight: '500' }}>{s.label}</Text>
                    {s.steps.slice(-3).map((st) => (
                      <Text key={st.id} style={{ color: t.mute, fontSize: 13, marginTop: 3 }} numberOfLines={1}>
                        {st.label}
                      </Text>
                    ))}
                  </View>
                </View>
              ) : null}
              {s.approval ? <ApprovalCard approval={s.approval} /> : null}
            </View>
          }
        />
      )}

      {empty ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0, marginBottom: 12 }}
          contentContainerStyle={{ gap: 10, paddingHorizontal: 16 }}
        >
          {SUGGESTIONS.map((q) => (
            <Pressable
              key={q.key}
              onPress={() => (q.photo ? attachMenu() : void send(q.prompt))}
              style={{ width: 168, height: 112, backgroundColor: t.surface, borderRadius: 20, padding: 14, justifyContent: 'space-between' }}
            >
              <Text style={{ color: t.text, fontSize: 16, fontWeight: '500' }}>{q.title}</Text>
              <Text style={{ color: t.mute, fontSize: 13, lineHeight: 18 }}>{q.hint}</Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      <View style={{ paddingHorizontal: 12, paddingBottom: kbd ? 8 : insets.bottom + 8, paddingTop: 4 }}>
        <View style={{ backgroundColor: t.surface, borderRadius: 28, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 8 }}>
          {photo ? (
            <View style={{ marginBottom: 8, alignSelf: 'flex-start' }}>
              <Image source={{ uri: photo.uri }} style={{ width: 72, height: 72, borderRadius: 14 }} />
              <Pressable
                onPress={() => setPhoto(null)}
                hitSlop={8}
                style={{ position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: 11, backgroundColor: t.surface3, alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{ color: t.text, fontSize: 12 }}>✕</Text>
              </Pressable>
            </View>
          ) : null}
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Frag den Tagesmanager"
            placeholderTextColor={t.mute}
            multiline
            editable={!s.running}
            style={{ color: t.text, fontSize: 17, maxHeight: 140, paddingVertical: 4, paddingHorizontal: 4 }}
          />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
            <Pressable
              onPress={attachMenu}
              disabled={s.running}
              accessibilityLabel="Foto hinzufügen"
              style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: t.surface2, opacity: s.running ? 0.5 : 1 }}
            >
              <Text style={{ color: t.text, fontSize: 24, lineHeight: 26 }}>+</Text>
            </Pressable>
            {s.running ? (
              <Pressable
                onPress={stopRun}
                accessibilityLabel="Stopp"
                style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: t.surface3 }}
              >
                <View style={{ width: 14, height: 14, borderRadius: 3, backgroundColor: t.text }} />
              </Pressable>
            ) : (
              <Pressable
                onPress={() => void send(text, photo)}
                disabled={!canSend}
                accessibilityLabel="Senden"
                style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: canSend ? t.accent : t.surface2 }}
              >
                <Text style={{ color: canSend ? t.onAccent : t.mute, fontSize: 20, fontWeight: '700' }}>↑</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
