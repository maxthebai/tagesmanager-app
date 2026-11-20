import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { CalEvent, listEvents } from '../lib/calendar';
import { listTasks, Task } from '../lib/db';
import { addDays, fmtDay, fmtTime, startOfDay, toLocalDate } from '../lib/time';
import { colors, common } from '../theme';
import { QUICK_PROMPTS } from './ChatScreen';

export function TodayScreen({ active, onPrompt }: { active: boolean; onPrompt: (p: string) => void }) {
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
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
    setRefreshing(false);
  }, []);

  useEffect(() => {
    if (active) void load();
  }, [active, load]);

  const today = toLocalDate(new Date());
  const tomorrow = toLocalDate(addDays(new Date(), 1));
  const dayEvents = (day: string) => events.filter((e) => e.start.startsWith(day));
  const overdue = tasks.filter((t) => t.due && t.due < today);
  const soon = tasks.filter((t) => t.due && t.due >= today && t.due <= tomorrow);
  const exams = tasks.filter((t) => t.kind === 'exam' && t.due && t.due >= today).slice(0, 3);

  const brief = QUICK_PROMPTS[0];
  const planB = QUICK_PROMPTS[2];

  return (
    <ScrollView
      style={common.screen}
      contentContainerStyle={common.pad}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load()} tintColor={colors.accent} />}
    >
      <Text style={common.h1}>Heute, {fmtDay(new Date())}</Text>
      <View style={[common.row, { gap: 10, marginBottom: 6 }]}>
        <Pressable style={[common.btn, { flex: 1 }]} onPress={() => onPrompt(brief.prompt)}>
          <Text style={common.btnText}>Briefing</Text>
        </Pressable>
        <Pressable style={[common.btnGhost, { flex: 1 }]} onPress={() => onPrompt(planB.prompt)}>
          <Text style={common.btnGhostText}>Plan B</Text>
        </Pressable>
      </View>

      {error ? (
        <View style={common.card}>
          <Text style={{ color: colors.err }}>{error}</Text>
          <Text style={common.sub}>Erlaube den Kalenderzugriff in den Android-Einstellungen und ziehe zum Aktualisieren.</Text>
        </View>
      ) : null}

      {[
        { label: 'Heute', day: today },
        { label: 'Morgen', day: tomorrow },
      ].map(({ label, day }) => (
        <View key={day}>
          <Text style={common.h2}>{label}: Termine</Text>
          {dayEvents(day).length === 0 ? (
            <Text style={common.sub}>Keine Termine.</Text>
          ) : (
            dayEvents(day).map((e) => (
              <View key={e.id + e.start} style={common.card}>
                <Text style={common.text}>{e.title}</Text>
                <Text style={common.sub}>
                  {e.allDay ? 'Ganztägig' : `${fmtTime(new Date(e.start))} – ${fmtTime(new Date(e.end))}`}
                  {e.location ? `  ·  ${e.location}` : ''}
                </Text>
              </View>
            ))
          )}
        </View>
      ))}

      <Text style={common.h2}>Aufgaben</Text>
      {overdue.length + soon.length === 0 ? <Text style={common.sub}>Nichts Dringendes fällig.</Text> : null}
      {overdue.map((t) => (
        <View key={t.id} style={[common.card, { borderColor: colors.err }]}>
          <Text style={common.text}>{t.title}</Text>
          <Text style={{ color: colors.err, fontSize: 13 }}>Überfällig seit {t.due}</Text>
        </View>
      ))}
      {soon.map((t) => (
        <View key={t.id} style={common.card}>
          <Text style={common.text}>{t.title}</Text>
          <Text style={common.sub}>
            {t.subject ? `${t.subject} · ` : ''}fällig {t.due === today ? 'heute' : 'morgen'}
          </Text>
        </View>
      ))}

      {exams.length > 0 ? (
        <View>
          <Text style={common.h2}>Nächste Klausuren</Text>
          {exams.map((t) => (
            <View key={t.id} style={common.card}>
              <Text style={common.text}>{t.title}</Text>
              <Text style={common.sub}>
                {t.subject ? `${t.subject} · ` : ''}am {t.due}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}
