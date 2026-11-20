import * as Calendar from 'expo-calendar/legacy';
import { toLocalIso } from './time';

export type CalEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  location: string | null;
  notes: string | null;
  calendar: string;
};

export async function ensureCalendarPermission(): Promise<boolean> {
  const r = await Calendar.requestCalendarPermissionsAsync();
  return r.granted;
}

async function eventCalendars(): Promise<Calendar.Calendar[]> {
  return Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
}

async function writableCalendar(): Promise<Calendar.Calendar> {
  const cals = await eventCalendars();
  const writable = cals.filter((c) => c.allowsModifications);
  const best = writable.find((c) => c.isPrimary) ?? writable[0];
  if (!best) throw new Error('Kein beschreibbarer Kalender auf dem Gerät gefunden.');
  return best;
}

export async function listEvents(start: Date, end: Date): Promise<CalEvent[]> {
  if (!(await ensureCalendarPermission())) throw new Error('Kalender-Berechtigung fehlt.');
  const cals = await eventCalendars();
  if (cals.length === 0) return [];
  const names = new Map(cals.map((c) => [c.id, c.title]));
  const events = await Calendar.getEventsAsync(
    cals.map((c) => c.id),
    start,
    end,
  );
  return events
    .map((e) => ({
      id: e.id,
      title: e.title ?? '(ohne Titel)',
      start: toLocalIso(new Date(e.startDate)),
      end: toLocalIso(new Date(e.endDate)),
      allDay: Boolean(e.allDay),
      location: e.location ?? null,
      notes: e.notes ?? null,
      calendar: names.get(e.calendarId) ?? '',
    }))
    .sort((a, b) => a.start.localeCompare(b.start));
}

export async function getEvent(id: string): Promise<CalEvent> {
  const e = await Calendar.getEventAsync(id);
  return {
    id: e.id,
    title: e.title ?? '(ohne Titel)',
    start: toLocalIso(new Date(e.startDate)),
    end: toLocalIso(new Date(e.endDate)),
    allDay: Boolean(e.allDay),
    location: e.location ?? null,
    notes: e.notes ?? null,
    calendar: '',
  };
}

export type NewEvent = { title: string; start: Date; end: Date; location?: string; notes?: string };

export async function createEvent(ev: NewEvent): Promise<string> {
  if (!(await ensureCalendarPermission())) throw new Error('Kalender-Berechtigung fehlt.');
  const cal = await writableCalendar();
  return Calendar.createEventAsync(cal.id, {
    title: ev.title,
    startDate: ev.start,
    endDate: ev.end,
    location: ev.location,
    notes: ev.notes,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
}

export async function updateEvent(
  id: string,
  patch: { title?: string; start?: Date; end?: Date; location?: string; notes?: string },
): Promise<void> {
  const details: Record<string, unknown> = {};
  if (patch.title !== undefined) details.title = patch.title;
  if (patch.start) details.startDate = patch.start;
  if (patch.end) details.endDate = patch.end;
  if (patch.location !== undefined) details.location = patch.location;
  if (patch.notes !== undefined) details.notes = patch.notes;
  await Calendar.updateEventAsync(id, details);
}

export async function deleteEvent(id: string): Promise<void> {
  await Calendar.deleteEventAsync(id);
}
