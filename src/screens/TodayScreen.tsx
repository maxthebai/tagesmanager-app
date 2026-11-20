import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, Text } from 'react-native';
import { Btn, Card, Empty, Page, Row, Section, Sub, Body, Title } from '../components/ui';
import { CalEvent, listEvents } from '../lib/calendar';
import { Lesson, listLessons, listTasks, Task } from '../lib/db';
import { getSettings } from '../lib/settings';
import { isoWeekday } from '../lib/logic';
import { addDays, fmtDay, fmtTime, startOfDay, toLocalDate } from '../lib/time';
import { getWeather, WeatherDay } from '../lib/weather';
import { PLAN_B_PROMPT, BRIEFING_PROMPT } from '../prompts';
import { useTheme } from '../theme';

export function TodayScreen({ active, onPrompt }: { active: boolean; onPrompt: (p: string) => void }) {
  const t = useTheme();
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [weather, setWeather] = useState<{ place: string; days: WeatherDay[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const from = startOfDay(new Date());
      setEvents(await listEvents(from, addDays(from, 2)));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
    setTasks(await listTasks(false));
    setLessons(await listLessons());
    try {
      setWeather(await getWeather((await getSettings()).city));
    } catch {
      setWeather(null);
    }
    setRefreshing(false);
  }, []);

  useEffect(() => {
    if (active) void load();
  }, [active, load]);

  const today = toLocalDate(new Date());
  const tomorrow = toLocalDate(addDays(new Date(), 1));
  const wd = isoWeekday(new Date());
  const todayLessons = lessons.filter((l) => l.weekday === wd).sort((a, b) => a.start.localeCompare(b.start));
  const dayEvents = (day: string) => events.filter((e) => e.start.startsWith(day));
  const overdue = tasks.filter((x) => x.due && x.due < today);
  const soon = tasks.filter((x) => x.due && x.due >= today && x.due <= tomorrow);
  const exams = tasks.filter((x) => x.kind === 'exam' && x.due && x.due >= today).slice(0, 3);
  const w0 = weather?.days[0];

  return (
    <Page refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load()} tintColor={t.accent} />}>
      <Title style={{ marginBottom: 4 }}>{fmtDay(new Date())}</Title>
      {w0 ? (
        <Sub style={{ marginBottom: 14 }}>
          {weather?.place}: {w0.text}, {Math.round(w0.min)}–{Math.round(w0.max)} °C, Regen {w0.rainPct} %
        </Sub>
      ) : null}
      <Row>
        <Btn label="Briefing" onPress={() => onPrompt(BRIEFING_PROMPT)} style={{ flex: 1 }} />
        <Btn label="Plan B" kind="tonal" onPress={() => onPrompt(PLAN_B_PROMPT)} style={{ flex: 1 }} />
      </Row>

      {error ? (
        <Card style={{ marginTop: 14 }}>
          <Text style={{ color: t.err }}>{error}</Text>
          <Sub>Erlaube den Kalenderzugriff in den Android-Einstellungen und ziehe zum Aktualisieren.</Sub>
        </Card>
      ) : null}

      {todayLessons.length > 0 ? (
        <Section title="Unterricht heute">
          <Card>
            {todayLessons.map((l) => (
              <Row key={l.id} style={{ paddingVertical: 3 }}>
                <Sub style={{ width: 96 }}>
                  {l.start}–{l.end}
                </Sub>
                <Body style={{ flex: 1 }}>
                  {l.subject}
                  {l.room ? ` · ${l.room}` : ''}
                </Body>
              </Row>
            ))}
          </Card>
        </Section>
      ) : null}

      {[
        { label: 'Heute', day: today },
        { label: 'Morgen', day: tomorrow },
      ].map(({ label, day }) => (
        <Section key={day} title={`${label}: Termine`}>
          {dayEvents(day).length === 0 ? (
            <Empty text="Keine Termine." />
          ) : (
            dayEvents(day).map((e) => (
              <Card key={e.id + e.start}>
                <Body>{e.title}</Body>
                <Sub>
                  {e.allDay ? 'Ganztägig' : `${fmtTime(new Date(e.start))} – ${fmtTime(new Date(e.end))}`}
                  {e.location ? `  ·  ${e.location}` : ''}
                </Sub>
              </Card>
            ))
          )}
        </Section>
      ))}

      <Section title="Aufgaben">
        {overdue.length + soon.length === 0 ? <Empty text="Nichts Dringendes fällig." /> : null}
        {overdue.map((x) => (
          <Card key={x.id} accent={t.err}>
            <Body>{x.title}</Body>
            <Sub style={{ color: t.err }}>Überfällig seit {x.due}</Sub>
          </Card>
        ))}
        {soon.map((x) => (
          <Card key={x.id}>
            <Body>{x.title}</Body>
            <Sub>
              {x.subject ? `${x.subject} · ` : ''}fällig {x.due === today ? 'heute' : 'morgen'}
            </Sub>
          </Card>
        ))}
      </Section>

      {exams.length > 0 ? (
        <Section title="Nächste Klausuren">
          {exams.map((x) => (
            <Card key={x.id}>
              <Body>{x.title}</Body>
              <Sub>
                {x.subject ? `${x.subject} · ` : ''}am {x.due}
              </Sub>
            </Card>
          ))}
        </Section>
      ) : null}
    </Page>
  );
}
