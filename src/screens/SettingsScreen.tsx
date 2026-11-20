import { useCallback, useEffect, useState } from 'react';
import { Alert, Switch } from 'react-native';
import { Body, Btn, Card, Chip, Empty, Field, Page, Row, Section, Sub } from '../components/ui';
import { deleteMemory, listMemory, MemRow, usageToday, wipeAll } from '../lib/db';
import { glyphAvailable, setGlyph } from '../lib/glyph';
import { validHM } from '../lib/logic';
import { cancelBriefing, scheduleBriefing } from '../lib/notifications';
import {
  clearApiKey,
  clearMailKey,
  getApiKey,
  getMailKey,
  getSettings,
  ModelKey,
  saveSettings,
  setApiKey,
  setMailKey,
  Settings,
} from '../lib/settings';
import { useTheme } from '../theme';

export function SettingsScreen({ active }: { active: boolean }) {
  const t = useTheme();
  const [s, setS] = useState<Settings | null>(null);
  const [hasKey, setHasKey] = useState(false);
  const [hasMail, setHasMail] = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [mailInput, setMailInput] = useState('');
  const [memory, setMemory] = useState<MemRow[]>([]);
  const [usage, setUsage] = useState({ input: 0, output: 0 });

  const load = useCallback(async () => {
    setS(await getSettings());
    setHasKey(Boolean(await getApiKey()));
    setHasMail(Boolean(await getMailKey()));
    setMemory(await listMemory());
    setUsage(await usageToday());
  }, []);
  useEffect(() => {
    if (active) void load();
  }, [active, load]);

  if (!s) return <Page>{null}</Page>;

  const update = async (patch: Partial<Settings>) => {
    const next = { ...s, ...patch };
    setS(next);
    await saveSettings(next);
  };

  const applyBriefing = async (enabled: boolean, time: string) => {
    if (!enabled) {
      await cancelBriefing();
      return;
    }
    const ok = await scheduleBriefing(time);
    if (!ok) Alert.alert('Briefing', 'Erlaube Benachrichtigungen und gib die Uhrzeit als HH:MM ein, z. B. 07:00.');
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
    <Page>
      <Section title="Du">
        <Row>
          <Field style={{ flex: 1 }} placeholder="Name" value={s.name} onChangeText={(v) => void update({ name: v })} />
          <Field style={{ flex: 1 }} placeholder="Stadt (Wetter)" value={s.city} onChangeText={(v) => void update({ city: v })} />
        </Row>
      </Section>

      <Section title="Claude-API-Key">
        <Sub style={{ marginBottom: 8 }}>
          {hasKey ? 'Ein Key ist verschlüsselt auf diesem Gerät gespeichert.' : 'Noch kein Key gespeichert.'} Er wird nur für Anfragen an die
          Claude-API genutzt.
        </Sub>
        <Field placeholder="sk-ant-…" value={keyInput} onChangeText={setKeyInput} autoCapitalize="none" autoCorrect={false} secureTextEntry />
        <Row style={{ marginTop: 10 }}>
          <Btn label="Speichern" onPress={() => void saveKey()} style={{ flex: 1 }} />
          {hasKey ? (
            <Btn
              label="Entfernen"
              kind="tonal"
              onPress={async () => {
                await clearApiKey();
                setHasKey(false);
              }}
            />
          ) : null}
        </Row>
      </Section>

      <Section title="Modell">
        <Row>
          {(['haiku', 'sonnet'] as ModelKey[]).map((m) => (
            <Chip key={m} label={m === 'haiku' ? 'Haiku 5.5 · günstig' : 'Sonnet 5.5 · stärker'} selected={s.model === m} onPress={() => void update({ model: m })} />
          ))}
        </Row>
      </Section>

      <Section title="Morgenbriefing">
        <Card>
          <Row style={{ justifyContent: 'space-between' }}>
            <Body style={{ flex: 1 }}>Täglich benachrichtigen</Body>
            <Switch
              value={s.briefingEnabled}
              onValueChange={(v) => {
                void update({ briefingEnabled: v });
                void applyBriefing(v, s.briefingTime);
              }}
            />
          </Row>
          <Row style={{ marginTop: 10 }}>
            <Field
              style={{ width: 110 }}
              value={s.briefingTime}
              onChangeText={(v) => void update({ briefingTime: v })}
              onEndEditing={() => {
                if (s.briefingEnabled) void applyBriefing(true, s.briefingTime);
                else if (!validHM(s.briefingTime)) Alert.alert('Uhrzeit', 'Bitte als HH:MM eingeben.');
              }}
              placeholder="07:00"
              keyboardType="numbers-and-punctuation"
            />
            <Sub style={{ flex: 1 }}>Tippe auf die Benachrichtigung, dann erstellt der Agent dein Briefing.</Sub>
          </Row>
        </Card>
      </Section>

      <Section title="Postfach (AgentMail)">
        <Sub style={{ marginBottom: 8 }}>
          {hasMail ? 'AgentMail-Key gespeichert.' : 'Optional: Key und Adresse deines Agenten-Postfachs.'} Mails sind für den Agenten nur Daten, Senden fragt
          immer nach.
        </Sub>
        <Field placeholder="Postfach, z. B. agent@agentmail.to" value={s.mailInbox} onChangeText={(v) => void update({ mailInbox: v.trim() })} autoCapitalize="none" autoCorrect={false} />
        <Field style={{ marginTop: 8 }} placeholder="AgentMail-API-Key" value={mailInput} onChangeText={setMailInput} autoCapitalize="none" autoCorrect={false} secureTextEntry />
        <Row style={{ marginTop: 10 }}>
          <Btn
            label="Key speichern"
            onPress={async () => {
              if (!mailInput.trim()) return;
              await setMailKey(mailInput);
              setMailInput('');
              setHasMail(true);
            }}
            style={{ flex: 1 }}
          />
          {hasMail ? (
            <Btn
              label="Entfernen"
              kind="tonal"
              onPress={async () => {
                await clearMailKey();
                setHasMail(false);
              }}
            />
          ) : null}
        </Row>
      </Section>

      <Section title="Nothing Glyph">
        <Card>
          <Row style={{ justifyContent: 'space-between' }}>
            <Body style={{ flex: 1, paddingRight: 12 }}>Glyph-Signale</Body>
            <Switch value={s.glyphEnabled} onValueChange={(v) => void update({ glyphEnabled: v })} />
          </Row>
          <Sub style={{ marginTop: 4 }}>
            Blinkt bei Freigabe-Fragen, alle LEDs an, wenn der Agent mit dir sprechen will, eine Zone dauerhaft, wenn etwas fertig ist.
            {glyphAvailable() ? '' : ' Glyph-SDK in dieser Version nicht eingebaut.'}
          </Sub>
          <Sub style={{ marginTop: 10 }}>Zone für „fertig“ (Test leuchtet kurz):</Sub>
          <Row style={{ marginTop: 6 }}>
            {(['A', 'B', 'C'] as const).map((z) => (
              <Chip
                key={z}
                label={z}
                selected={s.glyphDoneZone === z}
                onPress={async () => {
                  await update({ glyphDoneZone: z });
                  await setGlyph('test');
                  setTimeout(() => void setGlyph('off'), 2500);
                }}
              />
            ))}
          </Row>
        </Card>
      </Section>

      <Section title="Selbstständigkeit">
        <Card>
          <Row style={{ justifyContent: 'space-between' }}>
            <Body style={{ flex: 1, paddingRight: 12 }}>Aufgaben ohne Rückfrage</Body>
            <Switch value={s.autoTasks} onValueChange={(v) => void update({ autoTasks: v })} />
          </Row>
          <Sub style={{ marginTop: 4 }}>Aufgaben anlegen, abhaken und Notizen merken. Termine, Mails und Löschen fragen immer nach.</Sub>
        </Card>
      </Section>

      <Section title="Kosten-Notbremse">
        <Sub style={{ marginBottom: 8 }}>
          Heute: {usage.input + usage.output} Tokens (Eingabe {usage.input}, Ausgabe {usage.output}). Tageslimit:
        </Sub>
        <Row>
          {[300_000, 1_000_000, 3_000_000].map((cap) => (
            <Chip key={cap} label={`${cap / 1000} k`} selected={s.dailyTokenCap === cap} onPress={() => void update({ dailyTokenCap: cap })} />
          ))}
        </Row>
      </Section>

      <Section title="Was sich der Agent gemerkt hat">
        {memory.length === 0 ? <Empty text="Noch nichts." /> : null}
        {memory.map((m) => (
          <Card key={m.id}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Body style={{ flex: 1 }}>{m.note}</Body>
              <Btn
                label="Löschen"
                kind="text"
                small
                onPress={async () => {
                  await deleteMemory(m.id);
                  await load();
                }}
              />
            </Row>
          </Card>
        ))}
      </Section>

      <Section title="Daten">
        <Btn
          label="Alle App-Daten löschen"
          kind="danger"
          onPress={() =>
            Alert.alert('Alle Daten löschen?', 'Chat, Aufgaben, Noten, Karten, Protokoll, Notizen, Keys und Einstellungen werden von diesem Gerät gelöscht. Kalendertermine bleiben.', [
              { text: 'Abbrechen', style: 'cancel' },
              {
                text: 'Löschen',
                style: 'destructive',
                onPress: async () => {
                  await wipeAll();
                  await clearApiKey();
                  await clearMailKey();
                  await cancelBriefing();
                  await load();
                },
              },
            ])
          }
        />
        <Sub style={{ marginTop: 12 }}>
          Alle Daten liegen nur auf diesem Handy. Nur deine Nachrichten und die für eine Anfrage nötigen Daten gehen an die Claude-API von Anthropic.
        </Sub>
      </Section>
    </Page>
  );
}
