import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { deleteMemory, listMemory, MemRow, usageToday, wipeAll } from '../lib/db';
import { clearApiKey, getApiKey, getSettings, ModelKey, saveSettings, setApiKey, Settings } from '../lib/settings';
import { colors, common } from '../theme';

export function SettingsScreen({ active }: { active: boolean }) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [hasKey, setHasKey] = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [memory, setMemory] = useState<MemRow[]>([]);
  const [usage, setUsage] = useState({ input: 0, output: 0 });

  const load = useCallback(async () => {
    setSettings(await getSettings());
    setHasKey(Boolean(await getApiKey()));
    setMemory(await listMemory());
    setUsage(await usageToday());
  }, []);
  useEffect(() => {
    if (active) void load();
  }, [active, load]);

  if (!settings) return <View style={common.screen} />;

  const update = async (patch: Partial<Settings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    await saveSettings(next);
  };

  const saveKey = async () => {
    if (!keyInput.trim().startsWith('sk-ant-')) {
      Alert.alert('API-Key', 'Der Key sollte mit „sk-ant-“ beginnen.');
      return;
    }
    await setApiKey(keyInput);
    setKeyInput('');
    setHasKey(true);
  };

  return (
    <ScrollView style={common.screen} contentContainerStyle={common.pad} keyboardShouldPersistTaps="handled">
      <Text style={common.h1}>Einstellungen</Text>

      <Text style={common.h2}>Claude-API-Key</Text>
      <View style={common.card}>
        <Text style={common.sub}>
          {hasKey ? 'Ein Key ist verschlüsselt auf diesem Gerät gespeichert.' : 'Noch kein Key gespeichert.'} Er wird nur für
          Anfragen an die Claude-API genutzt und nie angezeigt.
        </Text>
        <TextInput
          style={[common.input, { marginTop: 10 }]}
          placeholder="sk-ant-…"
          placeholderTextColor={colors.sub}
          value={keyInput}
          onChangeText={setKeyInput}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
        />
        <View style={[common.row, { gap: 8, marginTop: 10 }]}>
          <Pressable style={[common.btn, { flex: 1 }]} onPress={() => void saveKey()}>
            <Text style={common.btnText}>Speichern</Text>
          </Pressable>
          {hasKey ? (
            <Pressable
              style={[common.btnGhost, { flex: 1 }]}
              onPress={async () => {
                await clearApiKey();
                setHasKey(false);
              }}
            >
              <Text style={common.btnGhostText}>Entfernen</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <Text style={common.h2}>Modell</Text>
      <View style={[common.row, { gap: 8 }]}>
        {(['haiku', 'sonnet'] as ModelKey[]).map((m) => (
          <Pressable
            key={m}
            style={[common.btnGhost, { flex: 1 }, settings.model === m && { borderColor: colors.accent }]}
            onPress={() => void update({ model: m })}
          >
            <Text style={[common.btnGhostText, settings.model === m && { color: colors.accent }]}>
              {m === 'haiku' ? 'Haiku 5.5 (günstig)' : 'Sonnet 5.5 (stärker)'}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={common.h2}>Selbstständigkeit</Text>
      <View style={[common.card, common.row, { justifyContent: 'space-between' }]}>
        <View style={{ flex: 1, paddingRight: 12 }}>
          <Text style={common.text}>Aufgaben ohne Rückfrage</Text>
          <Text style={common.sub}>Aufgaben anlegen, abhaken und Notizen merken. Termine fragen immer nach.</Text>
        </View>
        <Switch value={settings.autoTasks} onValueChange={(v) => void update({ autoTasks: v })} />
      </View>

      <Text style={common.h2}>Kosten-Notbremse</Text>
      <View style={common.card}>
        <Text style={common.sub}>
          Heute verbraucht: {usage.input + usage.output} Tokens (Eingabe {usage.input}, Ausgabe {usage.output}). Tageslimit:
        </Text>
        <View style={[common.row, { gap: 8, marginTop: 8 }]}>
          {[300_000, 1_000_000, 3_000_000].map((cap) => (
            <Pressable
              key={cap}
              style={[common.btnGhost, { flex: 1, paddingHorizontal: 4 }, settings.dailyTokenCap === cap && { borderColor: colors.accent }]}
              onPress={() => void update({ dailyTokenCap: cap })}
            >
              <Text style={[common.btnGhostText, { fontSize: 13 }, settings.dailyTokenCap === cap && { color: colors.accent }]}>
                {cap / 1000} k
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <Text style={common.h2}>Was sich der Agent gemerkt hat</Text>
      {memory.length === 0 ? <Text style={common.sub}>Noch nichts.</Text> : null}
      {memory.map((m) => (
        <View key={m.id} style={[common.card, common.row, { justifyContent: 'space-between' }]}>
          <Text style={[common.text, { flex: 1, paddingRight: 8 }]}>{m.note}</Text>
          <Pressable
            onPress={async () => {
              await deleteMemory(m.id);
              await load();
            }}
          >
            <Text style={{ color: colors.err }}>Löschen</Text>
          </Pressable>
        </View>
      ))}

      <Text style={common.h2}>Daten</Text>
      <Pressable
        style={[common.btnGhost, { borderColor: colors.err }]}
        onPress={() =>
          Alert.alert('Alle Daten löschen?', 'Chat, Aufgaben, Protokoll, Notizen und Einstellungen werden von diesem Gerät gelöscht. Kalendertermine bleiben.', [
            { text: 'Abbrechen', style: 'cancel' },
            {
              text: 'Löschen',
              style: 'destructive',
              onPress: async () => {
                await wipeAll();
                await clearApiKey();
                await load();
              },
            },
          ])
        }
      >
        <Text style={[common.btnGhostText, { color: colors.err }]}>Alle App-Daten löschen</Text>
      </Pressable>
      <Text style={[common.sub, { marginTop: 12, marginBottom: 24 }]}>
        Alle Daten liegen nur auf diesem Handy. Nur deine Nachrichten und die für eine Anfrage nötigen Kalender- und
        Aufgabendaten gehen an die Claude-API von Anthropic.
      </Text>
    </ScrollView>
  );
}
