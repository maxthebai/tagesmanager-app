import { useCallback, useEffect, useState } from 'react';
import { Alert, Text } from 'react-native';
import { Body, Btn, Card, Chip, Empty, Field, Page, Row, Section, Sub } from '../components/ui';
import { addExpense, deleteExpense, Expense, listExpenses } from '../lib/db';
import { fmtEuro, parseAmount } from '../lib/logic';
import { useTheme } from '../theme';

const CATS = ['Essen', 'Freizeit', 'Schule', 'Kleidung', 'Sonstiges'];

export function BudgetScreen({ active }: { active: boolean }) {
  const t = useTheme();
  const [rows, setRows] = useState<Expense[]>([]);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [cat, setCat] = useState('Essen');
  const [income, setIncome] = useState(false);

  const load = useCallback(async () => setRows(await listExpenses(300)), []);
  useEffect(() => {
    if (active) void load();
  }, [active, load]);

  const add = async () => {
    const a = parseAmount(amount);
    if (a === null) {
      Alert.alert('Betrag', 'Bitte einen Betrag eingeben, z. B. 4,50.');
      return;
    }
    const v = income ? Math.abs(a) : -Math.abs(a);
    await addExpense({ amount: v, category: income ? 'Einnahme' : cat, note: note.trim() || null });
    setAmount('');
    setNote('');
    await load();
  };

  const balance = rows.reduce((s, r) => s + r.amount, 0);
  const now = new Date();
  const month = rows.filter((r) => {
    const d = new Date(r.ts);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && r.amount < 0;
  });
  const spent = month.reduce((s, r) => s - r.amount, 0);
  const byCat = new Map<string, number>();
  month.forEach((r) => byCat.set(r.category ?? 'Sonstiges', (byCat.get(r.category ?? 'Sonstiges') ?? 0) - r.amount));

  return (
    <Page>
      <Card style={{ alignItems: 'center', paddingVertical: 22 }}>
        <Sub>Kontostand laut Tagebuch</Sub>
        <Text style={{ color: balance < 0 ? t.err : t.accent, fontSize: 40, fontWeight: '500' }}>{fmtEuro(balance)}</Text>
        <Sub>Diesen Monat ausgegeben: {fmtEuro(spent)}</Sub>
      </Card>

      <Row>
        <Chip label="Ausgabe" selected={!income} onPress={() => setIncome(false)} />
        <Chip label="Einnahme" selected={income} onPress={() => setIncome(true)} />
      </Row>
      <Row style={{ marginTop: 10 }}>
        <Field style={{ width: 110 }} placeholder="Betrag" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
        <Field style={{ flex: 1 }} placeholder="Notiz" value={note} onChangeText={setNote} />
      </Row>
      {!income ? (
        <Row style={{ flexWrap: 'wrap', marginTop: 10 }}>
          {CATS.map((c) => (
            <Chip key={c} label={c} selected={cat === c} onPress={() => setCat(c)} />
          ))}
        </Row>
      ) : null}
      <Btn label="Eintragen" onPress={() => void add()} style={{ marginTop: 12 }} />

      {byCat.size > 0 ? (
        <Section title="Dieser Monat">
          <Card>
            {Array.from(byCat.entries())
              .sort((a, b) => b[1] - a[1])
              .map(([c, v]) => (
                <Row key={c} style={{ justifyContent: 'space-between', paddingVertical: 3 }}>
                  <Body>{c}</Body>
                  <Body>{fmtEuro(v)}</Body>
                </Row>
              ))}
          </Card>
        </Section>
      ) : null}

      <Section title="Verlauf">
        {rows.length === 0 ? <Empty text="Noch keine Einträge." /> : null}
        {rows.slice(0, 40).map((r) => (
          <Card
            key={r.id}
            onLongPress={() =>
              Alert.alert('Löschen?', fmtEuro(r.amount), [
                { text: 'Abbrechen', style: 'cancel' },
                {
                  text: 'Löschen',
                  style: 'destructive',
                  onPress: async () => {
                    await deleteExpense(r.id);
                    await load();
                  },
                },
              ])
            }
          >
            <Row style={{ justifyContent: 'space-between' }}>
              <Body style={{ flex: 1 }}>{r.note || r.category || 'Eintrag'}</Body>
              <Body style={{ color: r.amount < 0 ? t.text : t.ok, fontWeight: '600' }}>{fmtEuro(r.amount)}</Body>
            </Row>
            <Sub>
              {new Date(r.ts).toLocaleDateString('de-DE')}
              {r.category ? ` · ${r.category}` : ''}
            </Sub>
          </Card>
        ))}
      </Section>
    </Page>
  );
}
