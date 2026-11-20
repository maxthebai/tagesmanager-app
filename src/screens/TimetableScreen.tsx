import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { Body, Btn, Card, Chip, Empty, Field, Page, Row, Section, Sub } from '../components/ui';
import { addLesson, deleteLesson, Lesson, listLessons } from '../lib/db';
import { normHM, validHM, WEEKDAY_SHORT } from '../lib/logic';

export function TimetableScreen({ active, onPrompt }: { active: boolean; onPrompt: (p: string) => void }) {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [adding, setAdding] = useState(false);
  const [wd, setWd] = useState(1);
  const [subject, setSubject] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [room, setRoom] = useState('');

  const load = useCallback(async () => setLessons(await listLessons()), []);
  useEffect(() => {
    if (active) void load();
  }, [active, load]);

  const add = async () => {
    if (!subject.trim() || !validHM(start) || !validHM(end)) {
      Alert.alert('Stunde', 'Fach sowie Beginn und Ende (HH:MM) werden gebraucht.');
      return;
    }
    await addLesson({ weekday: wd, start: normHM(start), end: normHM(end), subject: subject.trim(), room: room.trim() || null });
    setSubject('');
    setRoom('');
    await load();
  };

  return (
    <Page>
      <Btn
        label="Aus Foto eintragen"
        kind="tonal"
        onPress={() => onPrompt('Ich schicke dir gleich ein Foto meines Stundenplans. Lies es und trage alle Stunden mit add_lessons ein. Bitte mich um das Foto.')}
        style={{ marginBottom: 10 }}
      />
      {adding ? (
        <Card>
          <Row style={{ flexWrap: 'wrap' }}>
            {WEEKDAY_SHORT.slice(0, 5).map((d, i) => (
              <Chip key={d} label={d} selected={wd === i + 1} onPress={() => setWd(i + 1)} />
            ))}
          </Row>
          <Field style={{ marginTop: 10 }} placeholder="Fach" value={subject} onChangeText={setSubject} />
          <Row style={{ marginTop: 8 }}>
            <Field style={{ flex: 1 }} placeholder="Beginn 08:00" value={start} onChangeText={setStart} />
            <Field style={{ flex: 1 }} placeholder="Ende 08:45" value={end} onChangeText={setEnd} />
          </Row>
          <Field style={{ marginTop: 8 }} placeholder="Raum (optional)" value={room} onChangeText={setRoom} />
          <Row style={{ marginTop: 12 }}>
            <Btn label="Hinzufügen" onPress={() => void add()} style={{ flex: 1 }} />
            <Btn label="Fertig" kind="text" onPress={() => setAdding(false)} />
          </Row>
        </Card>
      ) : (
        <Btn label="+ Stunde" kind="tonal" onPress={() => setAdding(true)} />
      )}
      {lessons.length === 0 ? <Empty text="Noch kein Stundenplan. Lass den Agenten ihn aus einem Foto eintragen." /> : null}
      {WEEKDAY_SHORT.slice(0, 7).map((name, i) => {
        const day = lessons.filter((l) => l.weekday === i + 1).sort((a, b) => a.start.localeCompare(b.start));
        if (day.length === 0) return null;
        return (
          <Section key={name} title={['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'][i]}>
            <Card>
              {day.map((l) => (
                <Row
                  key={l.id}
                  style={{ paddingVertical: 4 }}
                >
                  <Sub style={{ width: 96 }}>
                    {l.start}–{l.end}
                  </Sub>
                  <Body style={{ flex: 1 }}>
                    {l.subject}
                    {l.room ? ` · ${l.room}` : ''}
                  </Body>
                  <Btn
                    label="✕"
                    kind="text"
                    small
                    onPress={async () => {
                      await deleteLesson(l.id);
                      await load();
                    }}
                  />
                </Row>
              ))}
            </Card>
          </Section>
        );
      })}
    </Page>
  );
}
