import * as cal from './calendar';
import * as db from './db';
import { cancelNotification } from './notifications';
import { getSettings } from './settings';
import { status } from './status';
import { fmtDateTime, fmtDay, parseDate } from './time';
import { declined, fail, Input, ISO_HINT, needsApproval, ok, str, ToolDef, ToolResult } from './toolkit';
import { execStudy, STUDY_TOOLS } from './toolsStudy';
import { execWorld, WORLD_TOOLS } from './toolsWorld';

export type { ToolDef, ToolResult };

const CORE_TOOLS: ToolDef[] = [
  {
    name: 'get_events',
    description:
      'Liest Kalendertermine des Nutzers zwischen zwei Zeitpunkten (aus allen Kalendern auf dem Gerät, auch Google). Maximal 60 Termine.',
    input_schema: {
      type: 'object',
      properties: {
        start: { type: 'string', description: `Beginn des Zeitraums, ${ISO_HINT}` },
        end: { type: 'string', description: `Ende des Zeitraums, ${ISO_HINT}` },
      },
      required: ['start', 'end'],
    },
  },
  {
    name: 'create_event',
    description: 'Legt einen neuen Kalendertermin an. Der Nutzer muss vorher bestätigen.',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        start: { type: 'string', description: ISO_HINT },
        end: { type: 'string', description: ISO_HINT },
        location: { type: 'string' },
        notes: { type: 'string' },
      },
      required: ['title', 'start', 'end'],
    },
  },
  {
    name: 'update_event',
    description:
      'Ändert einen bestehenden Termin (Titel, Zeit, Ort, Notizen) anhand seiner id aus get_events. Der Nutzer muss vorher bestätigen.',
    input_schema: {
      type: 'object',
      properties: {
        event_id: { type: 'string' },
        title: { type: 'string' },
        start: { type: 'string', description: ISO_HINT },
        end: { type: 'string', description: ISO_HINT },
        location: { type: 'string' },
        notes: { type: 'string' },
      },
      required: ['event_id'],
    },
  },
  {
    name: 'delete_event',
    description: 'Löscht einen Termin anhand seiner id aus get_events. Der Nutzer muss vorher bestätigen.',
    input_schema: {
      type: 'object',
      properties: { event_id: { type: 'string' } },
      required: ['event_id'],
    },
  },
  {
    name: 'list_tasks',
    description: 'Listet die Aufgaben des Nutzers (Hausaufgaben, Klausuren, Projekte, Sonstiges).',
    input_schema: {
      type: 'object',
      properties: { include_done: { type: 'boolean', description: 'Auch erledigte Aufgaben zeigen' } },
    },
  },
  {
    name: 'add_task',
    description:
      'Legt eine Aufgabe an. kind: homework (Hausaufgabe), exam (Klausur/Test), project (GFS/Projekt), other.',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        subject: { type: 'string', description: 'Fach, z. B. Mathe' },
        kind: { type: 'string', enum: ['homework', 'exam', 'project', 'other'] },
        due: { type: 'string', description: 'Fälligkeitsdatum als YYYY-MM-DD' },
        notes: { type: 'string' },
      },
      required: ['title'],
    },
  },
  {
    name: 'complete_task',
    description: 'Hakt eine Aufgabe als erledigt ab (id aus list_tasks).',
    input_schema: {
      type: 'object',
      properties: { task_id: { type: 'number' } },
      required: ['task_id'],
    },
  },
  {
    name: 'remember',
    description:
      'Merkt sich dauerhaft eine kurze Notiz über den Nutzer (Vorlieben, Lernzeiten, Routinen, feste Termine). Nur nützliche, dauerhafte Dinge, nichts Sensibles.',
    input_schema: {
      type: 'object',
      properties: { note: { type: 'string' } },
      required: ['note'],
    },
  },
];

export const TOOLS: ToolDef[] = [...CORE_TOOLS, ...STUDY_TOOLS, ...WORLD_TOOLS];

export async function executeTool(name: string, input: Input, runId: number): Promise<ToolResult> {
  try {
    switch (name) {
      case 'get_events': {
        const s = parseDate(input.start);
        const e = parseDate(input.end);
        if (!s || !e) return fail('start und end müssen gültige ISO-Zeitpunkte sein.');
        status.set('reading_calendar', `Liest Kalender (${fmtDay(s)} – ${fmtDay(e)})`);
        const events = await cal.listEvents(s, e);
        const out = events.slice(0, 60);
        await db.addLog(runId, 'tool', `Kalender gelesen (${fmtDay(s)} – ${fmtDay(e)})`, `${out.length} Termine`);
        status.step('result', `Kalender: ${out.length} Termine gefunden`);
        return ok({ count: events.length, events: out });
      }

      case 'create_event': {
        const title = str(input.title);
        const s = parseDate(input.start);
        const e = parseDate(input.end);
        if (!title || !s || !e) return fail('title, start und end sind nötig.');
        if (e <= s) return fail('Das Ende muss nach dem Beginn liegen.');
        const loc = str(input.location);
        const detail = `${title}\n${fmtDateTime(s)} – ${fmtDateTime(e)}${loc ? `\nOrt: ${loc}` : ''}`;
        if (!(await needsApproval(false, 'Termin anlegen', detail))) return declined();
        status.set('writing_calendar', `Legt Termin an: ${title}`);
        const id = await cal.createEvent({ title, start: s, end: e, location: loc, notes: str(input.notes) });
        await db.addLog(runId, 'action', `Termin angelegt: ${title}`, detail, { type: 'event_created', id });
        status.step('result', `Termin angelegt: ${title}`);
        return ok({ created: true, event_id: id });
      }

      case 'update_event': {
        const id = str(input.event_id);
        if (!id) return fail('event_id fehlt.');
        const old = await cal.getEvent(id);
        const s = input.start !== undefined ? parseDate(input.start) : null;
        const e = input.end !== undefined ? parseDate(input.end) : null;
        if (input.start !== undefined && !s) return fail('start ist kein gültiger Zeitpunkt.');
        if (input.end !== undefined && !e) return fail('end ist kein gültiger Zeitpunkt.');
        const newTitle = str(input.title) ?? old.title;
        const ns = s ?? new Date(old.start);
        const ne = e ?? new Date(old.end);
        if (ne <= ns) return fail('Das Ende muss nach dem Beginn liegen.');
        const detail = `Vorher: ${old.title}, ${fmtDateTime(new Date(old.start))} – ${fmtDateTime(new Date(old.end))}\nNachher: ${newTitle}, ${fmtDateTime(ns)} – ${fmtDateTime(ne)}`;
        if (!(await needsApproval(false, 'Termin ändern', detail))) return declined();
        status.set('writing_calendar', `Ändert Termin: ${old.title}`);
        await cal.updateEvent(id, {
          title: str(input.title),
          start: s ?? undefined,
          end: e ?? undefined,
          location: str(input.location),
          notes: str(input.notes),
        });
        await db.addLog(runId, 'action', `Termin geändert: ${newTitle}`, detail, {
          type: 'event_updated',
          id,
          old: { title: old.title, start: old.start, end: old.end, location: old.location, notes: old.notes },
        });
        status.step('result', `Termin geändert: ${newTitle}`);
        return ok({ updated: true });
      }

      case 'delete_event': {
        const id = str(input.event_id);
        if (!id) return fail('event_id fehlt.');
        const old = await cal.getEvent(id);
        const detail = `${old.title}\n${fmtDateTime(new Date(old.start))} – ${fmtDateTime(new Date(old.end))}`;
        if (!(await needsApproval(false, 'Termin löschen', detail))) return declined();
        status.set('writing_calendar', `Löscht Termin: ${old.title}`);
        await cal.deleteEvent(id);
        await db.addLog(runId, 'action', `Termin gelöscht: ${old.title}`, detail, {
          type: 'event_deleted',
          old: { title: old.title, start: old.start, end: old.end, location: old.location, notes: old.notes },
        });
        status.step('result', `Termin gelöscht: ${old.title}`);
        return ok({ deleted: true });
      }

      case 'list_tasks': {
        status.set('tasks', 'Liest deine Aufgaben');
        const tasks = await db.listTasks(input.include_done === true);
        await db.addLog(runId, 'tool', 'Aufgaben gelesen', `${tasks.length} Aufgaben`);
        status.step('result', `Aufgaben: ${tasks.length} gefunden`);
        return ok({
          tasks: tasks.map((t) => ({
            id: t.id,
            title: t.title,
            subject: t.subject,
            kind: t.kind,
            due: t.due,
            notes: t.notes,
            done: t.done === 1,
          })),
        });
      }

      case 'add_task': {
        const title = str(input.title);
        if (!title) return fail('title fehlt.');
        const due = str(input.due);
        if (due && !/^\d{4}-\d{2}-\d{2}$/.test(due)) return fail('due muss YYYY-MM-DD sein.');
        const kind = ['homework', 'exam', 'project', 'other'].includes(String(input.kind))
          ? String(input.kind)
          : 'other';
        const settings = await getSettings();
        const detail = `${title}${str(input.subject) ? ` (${str(input.subject)})` : ''}${due ? `, fällig ${due}` : ''}`;
        if (!(await needsApproval(settings.autoTasks, 'Aufgabe anlegen', detail))) return declined();
        status.set('tasks', `Legt Aufgabe an: ${title}`);
        const id = await db.addTask({ title, subject: str(input.subject), kind, due, notes: str(input.notes) });
        await db.addLog(runId, 'action', `Aufgabe angelegt: ${title}`, detail, { type: 'task_created', id });
        status.step('result', `Aufgabe angelegt: ${title}`);
        return ok({ created: true, task_id: id });
      }

      case 'complete_task': {
        const id = Number(input.task_id);
        const task = Number.isFinite(id) ? await db.getTask(id) : null;
        if (!task) return fail('Aufgabe nicht gefunden.');
        const settings = await getSettings();
        if (!(await needsApproval(settings.autoTasks, 'Aufgabe abhaken', task.title))) return declined();
        status.set('tasks', `Hakt ab: ${task.title}`);
        await db.setTaskDone(id, true);
        await db.addLog(runId, 'action', `Aufgabe erledigt: ${task.title}`, null, {
          type: 'task_done',
          id,
          wasDone: task.done === 1,
        });
        status.step('result', `Erledigt: ${task.title}`);
        return ok({ completed: true });
      }

      case 'remember': {
        const note = str(input.note);
        if (!note) return fail('note fehlt.');
        const settings = await getSettings();
        if (!(await needsApproval(settings.autoTasks, 'Notiz merken', note))) return declined();
        const id = await db.addMemory(note.slice(0, 300));
        await db.addLog(runId, 'action', 'Notiz gemerkt', note, null);
        status.step('result', 'Notiz gemerkt');
        return ok({ saved: true, memory_id: id });
      }

      default: {
        const study = await execStudy(name, input, runId);
        if (study) return study;
        const world = await execWorld(name, input, runId);
        if (world) return world;
        return fail(`Unbekanntes Werkzeug: ${name}`);
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    status.step('error', `Fehler bei ${name}`, msg);
    await db.addLog(runId, 'error', `Fehler bei ${name}`, msg);
    return fail(msg);
  }
}

// ---------- Rückgängig ----------
type EventSnapshot = {
  title: string;
  start: string;
  end: string;
  location: string | null;
  notes: string | null;
};
export type UndoInfo =
  | { type: 'event_created'; id: string }
  | { type: 'event_updated'; id: string; old: EventSnapshot }
  | { type: 'event_deleted'; old: EventSnapshot }
  | { type: 'task_created'; id: number }
  | { type: 'task_done'; id: number; wasDone: boolean }
  | { type: 'grade_created'; id: number }
  | { type: 'habit_created'; id: number }
  | { type: 'expense_created'; id: number }
  | { type: 'reminder_created'; id: number };

export async function undoAction(info: UndoInfo): Promise<void> {
  switch (info.type) {
    case 'event_created':
      await cal.deleteEvent(info.id);
      return;
    case 'event_updated':
      await cal.updateEvent(info.id, {
        title: info.old.title,
        start: new Date(info.old.start),
        end: new Date(info.old.end),
        location: info.old.location ?? '',
        notes: info.old.notes ?? '',
      });
      return;
    case 'event_deleted':
      await cal.createEvent({
        title: info.old.title,
        start: new Date(info.old.start),
        end: new Date(info.old.end),
        location: info.old.location ?? undefined,
        notes: info.old.notes ?? undefined,
      });
      return;
    case 'task_created':
      await db.deleteTask(info.id);
      return;
    case 'task_done':
      await db.setTaskDone(info.id, info.wasDone);
      return;
    case 'grade_created':
      await db.deleteGrade(info.id);
      return;
    case 'habit_created':
      await db.archiveHabit(info.id);
      return;
    case 'expense_created':
      await db.deleteExpense(info.id);
      return;
    case 'reminder_created': {
      const r = await db.getReminder(info.id);
      if (r?.notif_id) await cancelNotification(r.notif_id);
      await db.deleteReminder(info.id);
      return;
    }
  }
}

