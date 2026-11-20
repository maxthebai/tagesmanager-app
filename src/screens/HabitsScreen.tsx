import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { Body, Btn, Card, Empty, Field, Page, Row, Sub } from '../components/ui';
import { addHabit, archiveHabit, Habit, habitDays, listHabits, setHabitDay } from '../lib/db';
import { streak } from '../lib/logic';
import { addDays, toLocalDate } from '../lib/time';
import { useTheme } from '../theme';

type Item = { habit: Habit; days: string[] };

export function HabitsScreen({ active }: { active: boolean }) {
  const t = useTheme();
  const [items, setItems] = useState<Item[]>([]);
  const [name, setName] = useState('');
  const today = toLocalDate(new Date());
  const week = Array.from({ length: 7 }, (_, i) => toLocalDate(addDays(new Date(), i - 6)));

  const load = useCallback(async () => {
    const hs = await listHabits();
    setItems(await Promise.all(hs.map(async (h) => ({ habit: h, days: await habitDays(h.id) }))));
  }, []);
  useEffect(() => {
    if (active) void load();
  }, [active, load]);

  const toggle = async (id: number, day: string, on: boolean) => {
    await setHabitDay(id, day, on);
    await load();
  };

  return (
    <Page>
      <Row>
        <Field style={{ flex: 1 }} placeholder="Neue Gewohnheit, z. B. 2 l trinken" value={name} onChangeText={setName} />
        <Btn
          label="+"
          onPress={async () => {
            if (!name.trim()) return;
            await addHabit(name.trim());
            setName('');
            await load();
          }}
        />
      </Row>
      <View style={{ height: 14 }} />
      {items.length === 0 ? <Empty text="Noch keine Gewohnheiten. Kleine Routinen, die du jeden Tag abhaken willst." /> : null}
      {items.map(({ habit, days }) => {
        const n = streak(days, today);
        const doneToday = days.includes(today);
        return (
          <Card
            key={habit.id}
            onLongPress={() =>
              Alert.alert('Ausblenden?', habit.name, [
                { text: 'Abbrechen', style: 'cancel' },
                {
                  text: 'Ausblenden',
                  style: 'destructive',
                  onPress: async () => {
                    await archiveHabit(habit.id);
                    await load();
                  },
                },
              ])
            }
          >
            <Row style={{ justifyContent: 'space-between' }}>
              <Body style={{ flex: 1 }}>{habit.name}</Body>
              <Sub>{n > 0 ? `${n} ${n === 1 ? 'Tag' : 'Tage'} in Folge` : ''}</Sub>
            </Row>
            <Row gap={6} style={{ marginTop: 12, justifyContent: 'space-between' }}>
              {week.map((d) => {
                const on = days.includes(d);
                return (
                  <Pressable
                    key={d}
                    onPress={() => void toggle(habit.id, d, !on)}
                    style={{
                      flex: 1,
                      height: 40,
                      borderRadius: 12,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: on ? t.accent : t.surface2,
                      borderWidth: d === today ? 1.5 : 0,
                      borderColor: t.accent,
                    }}
                  >
                    <Text style={{ color: on ? t.onAccent : t.mute, fontSize: 12, fontWeight: '600' }}>
                      {['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'][new Date(d + 'T12:00:00').getDay()]}
                    </Text>
                  </Pressable>
                );
              })}
            </Row>
            {!doneToday ? <Btn label="Heute erledigt" kind="tonal" small onPress={() => void toggle(habit.id, today, true)} style={{ marginTop: 10, alignSelf: 'flex-start' }} /> : null}
          </Card>
        );
      })}
    </Page>
  );
}
