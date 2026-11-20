import { useCallback, useEffect, useState } from 'react';
import { Alert, Text } from 'react-native';
import { Body, Btn, Card, Empty, Page, Row, Section, Sub } from '../components/ui';
import { Card as Flash, deleteDeck, dueCards, listDecks, updateCardSchedule } from '../lib/db';
import { nextSchedule } from '../lib/logic';
import { useTheme } from '../theme';

export function LearnScreen({ active, onPrompt }: { active: boolean; onPrompt: (p: string) => void }) {
  const t = useTheme();
  const [decks, setDecks] = useState<{ deck: string; total: number; due: number }[]>([]);
  const [queue, setQueue] = useState<Flash[]>([]);
  const [deck, setDeck] = useState<string | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [done, setDone] = useState(0);

  const load = useCallback(async () => setDecks(await listDecks()), []);
  useEffect(() => {
    if (active) void load();
  }, [active, load]);

  const start = async (d: string) => {
    const cards = await dueCards(d, 30);
    if (cards.length === 0) {
      Alert.alert('Alles gelernt', 'Gerade ist keine Karte fällig.');
      return;
    }
    setDeck(d);
    setQueue(cards);
    setFlipped(false);
    setDone(0);
  };

  const answer = async (correct: boolean) => {
    const c = queue[0];
    if (!c) return;
    const n = nextSchedule(c.box, correct, Date.now());
    await updateCardSchedule(c.id, n.box, n.due);
    setQueue((q) => q.slice(1));
    setDone((x) => x + 1);
    setFlipped(false);
    if (queue.length <= 1) {
      setDeck(null);
      await load();
    }
  };

  if (deck && queue.length > 0) {
    const c = queue[0];
    return (
      <Page>
        <Row style={{ justifyContent: 'space-between' }}>
          <Sub>
            {deck} · noch {queue.length}
          </Sub>
          <Btn
            label="Beenden"
            kind="text"
            small
            onPress={async () => {
              setDeck(null);
              await load();
            }}
          />
        </Row>
        <Card onPress={() => setFlipped(true)} style={{ minHeight: 260, justifyContent: 'center', marginTop: 12 }}>
          <Text style={{ color: t.mute, fontSize: 12, marginBottom: 10 }}>{flipped ? 'Antwort' : 'Frage'}</Text>
          <Text style={{ color: t.text, fontSize: 24, lineHeight: 33 }}>{flipped ? c.back : c.front}</Text>
          {!flipped ? <Sub style={{ marginTop: 18 }}>Tippen zum Umdrehen</Sub> : null}
        </Card>
        {flipped ? (
          <Row style={{ marginTop: 6 }}>
            <Btn label="Nochmal" kind="tonal" onPress={() => void answer(false)} style={{ flex: 1 }} />
            <Btn label="Gewusst" onPress={() => void answer(true)} style={{ flex: 1 }} />
          </Row>
        ) : null}
        <Sub style={{ marginTop: 14, textAlign: 'center' }}>{done} geschafft</Sub>
      </Page>
    );
  }

  return (
    <Page>
      <Btn
        label="Karteikarten mit dem Agenten erstellen"
        kind="tonal"
        onPress={() => onPrompt('Ich möchte Karteikarten zum Lernen. Frage mich, zu welchem Thema, und erstelle sie dann.')}
      />
      <Btn
        label="Lernplan für eine Klausur"
        kind="tonal"
        onPress={() => onPrompt('Ich möchte einen Lernplan für eine Klausur. Frage mich nach Fach, Termin und Stoff und verteile die Lerneinheiten dann auf meine freien Zeiten.')}
        style={{ marginTop: 8 }}
      />
      {decks.length === 0 ? <Empty text="Noch keine Stapel. Schick dem Agenten ein Foto deines Hefts oder nenne ein Thema." /> : null}
      <Section title={decks.length ? 'Stapel' : ''}>
        {decks.map((d) => (
          <Card
            key={d.deck}
            onPress={() => void start(d.deck)}
            onLongPress={() =>
              Alert.alert('Stapel löschen?', d.deck, [
                { text: 'Abbrechen', style: 'cancel' },
                {
                  text: 'Löschen',
                  style: 'destructive',
                  onPress: async () => {
                    await deleteDeck(d.deck);
                    await load();
                  },
                },
              ])
            }
          >
            <Body>{d.deck}</Body>
            <Sub>
              {d.total} Karten · {d.due > 0 ? `${d.due} fällig` : 'nichts fällig'}
            </Sub>
          </Card>
        ))}
      </Section>
    </Page>
  );
}
