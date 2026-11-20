import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { Body, Btn, Card, Chip, Empty, Field, Page, Row, Section, Sub } from '../components/ui';
import { addGrade, deleteGrade, Grade, listGrades } from '../lib/db';
import { gradeAverage, neededGrade, parseGrade } from '../lib/logic';
import { toLocalDate } from '../lib/time';
import { useTheme } from '../theme';

const KINDS = ['Klausur', 'Test', 'Mündlich', 'Sonstiges'];

export function GradesScreen({ active }: { active: boolean }) {
  const t = useTheme();
  const [grades, setGrades] = useState<Grade[]>([]);
  const [adding, setAdding] = useState(false);
  const [subject, setSubject] = useState('');
  const [value, setValue] = useState('');
  const [weight, setWeight] = useState('1');
  const [kind, setKind] = useState('Klausur');
  const [target, setTarget] = useState('');
  const [calcSubject, setCalcSubject] = useState<string | null>(null);

  const load = useCallback(async () => setGrades(await listGrades()), []);
  useEffect(() => {
    if (active) void load();
  }, [active, load]);

  const add = async () => {
    const v = parseGrade(value);
    const w = Number(weight.replace(',', '.'));
    if (!subject.trim() || v === null || !(w > 0)) {
      Alert.alert('Note', 'Fach und eine Note von 1 bis 6 werden gebraucht, die Gewichtung muss größer als 0 sein.');
      return;
    }
    await addGrade({ subject: subject.trim(), value: v, weight: w, kind, date: toLocalDate(new Date()) });
    setValue('');
    await load();
  };

  const subjects = Array.from(new Set(grades.map((g) => g.subject)));
  const overall = gradeAverage(subjects.map((s) => ({ value: gradeAverage(grades.filter((g) => g.subject === s)) ?? 0, weight: 1 })));
  const fmt = (n: number | null) => (n === null ? '–' : n.toFixed(2).replace('.', ','));
  const need = (() => {
    if (!calcSubject) return null;
    const tg = parseGrade(target);
    if (tg === null) return null;
    return neededGrade(grades.filter((g) => g.subject === calcSubject), tg, 1);
  })();

  return (
    <Page>
      {overall !== null ? (
        <Card style={{ alignItems: 'center', paddingVertical: 22 }}>
          <Sub>Gesamtschnitt</Sub>
          <Body style={{ fontSize: 44, fontWeight: '500', color: t.accent }}>{fmt(overall)}</Body>
        </Card>
      ) : null}
      {adding ? (
        <Card>
          <Field placeholder="Fach" value={subject} onChangeText={setSubject} />
          <Row style={{ marginTop: 8 }}>
            <Field style={{ flex: 1 }} placeholder="Note (1–6)" value={value} onChangeText={setValue} keyboardType="decimal-pad" />
            <Field style={{ flex: 1 }} placeholder="Gewicht" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" />
          </Row>
          <Row style={{ flexWrap: 'wrap', marginTop: 10 }}>
            {KINDS.map((k) => (
              <Chip key={k} label={k} selected={kind === k} onPress={() => setKind(k)} />
            ))}
          </Row>
          <Row style={{ marginTop: 12 }}>
            <Btn label="Speichern" onPress={() => void add()} style={{ flex: 1 }} />
            <Btn label="Fertig" kind="text" onPress={() => setAdding(false)} />
          </Row>
        </Card>
      ) : (
        <Btn label="+ Note" kind="tonal" onPress={() => setAdding(true)} />
      )}
      {grades.length === 0 ? <Empty text="Noch keine Noten. Trage sie hier oder per Chat ein." /> : null}
      {subjects.map((s) => {
        const list = grades.filter((g) => g.subject === s);
        return (
          <Section key={s} title={s}>
            <Card>
              <Row style={{ justifyContent: 'space-between', marginBottom: 6 }}>
                <Sub>Schnitt</Sub>
                <Body style={{ fontWeight: '600' }}>{fmt(gradeAverage(list))}</Body>
              </Row>
              {list.map((g) => (
                <Row key={g.id} style={{ paddingVertical: 4 }}>
                  <Body style={{ width: 44 }}>{g.value.toString().replace('.', ',')}</Body>
                  <Sub style={{ flex: 1 }}>
                    {g.kind}
                    {g.weight !== 1 ? ` · ×${g.weight}` : ''}
                    {g.date ? ` · ${g.date}` : ''}
                  </Sub>
                  <Btn
                    label="✕"
                    kind="text"
                    small
                    onPress={async () => {
                      await deleteGrade(g.id);
                      await load();
                    }}
                  />
                </Row>
              ))}
              <Btn
                label={calcSubject === s ? 'Rechner schließen' : 'Welche Note brauche ich?'}
                kind="text"
                small
                onPress={() => setCalcSubject(calcSubject === s ? null : s)}
                style={{ alignSelf: 'flex-start', marginTop: 6 }}
              />
              {calcSubject === s ? (
                <Row style={{ marginTop: 8 }}>
                  <Field style={{ width: 120 }} placeholder="Ziel, z. B. 2,0" value={target} onChangeText={setTarget} keyboardType="decimal-pad" />
                  <Body style={{ flex: 1 }}>
                    {need === null ? 'Ziel eingeben' : need > 6 ? 'Mit der nächsten Note nicht mehr erreichbar.' : need < 1 ? 'Schon sicher erreicht.' : `Nächste Note: mindestens ${fmt(need)}`}
                  </Body>
                </Row>
              ) : null}
            </Card>
          </Section>
        );
      })}
    </Page>
  );
}
