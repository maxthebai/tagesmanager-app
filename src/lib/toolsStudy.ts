import * as db from './db';
import { fmtEuro, gradeAverage, neededGrade, normHM, streak, validHM, WEEKDAY_SHORT } from './logic';
import { getSettings } from './settings';
import { status } from './status';
import { toLocalDate } from './time';
import { fail, Input, needsApproval, declined, num, ok, str, ToolDef, ToolResult } from './toolkit';

export const STUDY_TOOLS: ToolDef[] = [
  {
    name: 'get_timetable',
    description: 'Liest den Stundenplan des Nutzers (optional nur ein Wochentag, 1=Montag bis 7=Sonntag).',
    input_schema: { type: 'object', properties: { weekday: { type: 'number' } } },
  },
  {
    name: 'add_lessons',
    description:
      'Trägt Unterrichtsstunden in den Stundenplan ein, z. B. aus einem Foto. weekday: 1=Montag bis 5=Freitag, Zeiten als HH:MM.',
    input_schema: {
      type: 'object',
      properties: {
        lessons: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              weekday: { type: 'number' },
              start: { type: 'string' },
              end: { type: 'string' },
              subject: { type: 'string' },
              room: { type: 'string' },
            },
            required: ['weekday', 'start', 'end', 'subject'],
          },
        },
      },
      required: ['lessons'],
    },
  },
  {
    name: 'get_grades',
    description: 'Liest alle Noten mit gewichtetem Durchschnitt pro Fach und insgesamt.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'add_grade',
    description:
      'Trägt eine Note (1 bis 6, Dezimalwerte erlaubt) ein. kind z. B. Klausur, Test, mündlich. weight ist die Gewichtung (Standard 1).',
    input_schema: {
      type: 'object',
      properties: {
        subject: { type: 'string' },
        value: { type: 'number' },
        weight: { type: 'number' },
        kind: { type: 'string' },
        date: { type: 'string', description: 'YYYY-MM-DD' },
        note: { type: 'string' },
      },
      required: ['subject', 'value'],
    },
  },
  {
    name: 'needed_grade',
    description:
      'Berechnet, welche Note die nächste Arbeit in einem Fach haben muss, damit der Durchschnitt ein Zielwert erreicht. Reine Rechnung, keine Wertung.',
    input_schema: {
      type: 'object',
      properties: {
        subject: { type: 'string' },
        target: { type: 'number', description: 'Zieldurchschnitt, z. B. 2.0' },
        weight: { type: 'number', description: 'Gewicht der nächsten Arbeit, Standard 1' },
      },
      required: ['subject', 'target'],
    },
  },
  {
    name: 'create_flashcards',
    description:
      'Legt Karteikarten in einem Stapel an (max. 25 pro Aufruf). Karten kurz und prüfbar formulieren: eine Frage, eine knappe Antwort.',
    input_schema: {
      type: 'object',
      properties: {
        deck: { type: 'string', description: 'Name des Stapels, z. B. "Bio: Zellatmung"' },
        cards: {
          type: 'array',
          items: {
            type: 'object',
            properties: { front: { type: 'string' }, back: { type: 'string' } },
            required: ['front', 'back'],
          },
        },
      },
      required: ['deck', 'cards'],
    },
  },
  {
    name: 'list_decks',
    description: 'Listet Karteikarten-Stapel mit Anzahl und fälligen Karten.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'list_habits',
    description: 'Listet Gewohnheiten mit heutigem Status und aktueller Serie.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'add_habit',
    description: 'Legt eine neue tägliche Gewohnheit an (z. B. "Wasser trinken", "20 Min lesen").',
    input_schema: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] },
  },
  {
    name: 'check_habit',
    description: 'Hakt eine Gewohnheit für heute ab (done=false nimmt den Haken zurück).',
    input_schema: {
      type: 'object',
      properties: { habit_id: { type: 'number' }, done: { type: 'boolean' } },
      required: ['habit_id'],
    },
  },
  {
    name: 'add_expense',
    description:
      'Trägt eine Ausgabe (negativer Betrag) oder Einnahme (positiver Betrag) in euro ins Taschengeld-Tagebuch ein.',
    input_schema: {
      type: 'object',
      properties: {
        amount: { type: 'number', description: 'Negativ für Ausgaben, positiv für Einnahmen' },
        category: { type: 'string' },
        note: { type: 'string' },
      },
      required: ['amount'],
    },
  },
  {
    name: 'get_budget',
    description: 'Liest Kontostand des Taschengeld-Tagebuchs, Ausgaben dieses Monats nach Kategorie und die letzten Einträge.',
    input_schema: { type: 'object', properties: {} },
  },
];

export async function execStudy(name: string, input: Input, runId: number): Promise<ToolResult | null> {
  switch (name) {
    case 'get_timetable': {
      status.set('tasks', 'Liest deinen Stundenplan');
      const wd = num(input.weekday);
      const all = await db.listLessons();
      const rows = wd ? all.filter((l) => l.weekday === wd) : all;
      await db.addLog(runId, 'tool', 'Stundenplan gelesen', `${rows.length} Stunden`);
      status.step('result', `Stundenplan: ${rows.length} Stunden`);
      return ok({
        lessons: rows.map((l) => ({ id: l.id, day: WEEKDAY_SHORT[l.weekday - 1], start: l.start, end: l.end, subject: l.subject, room: l.room })),
      });
    }

    case 'add_lessons': {
      const raw = Array.isArray(input.lessons) ? (input.lessons as Input[]) : [];
      const lessons: { weekday: number; start: string; end: string; subject: string; room: string | null }[] = [];
      for (const l of raw.slice(0, 60)) {
        const weekday = num(l.weekday);
        const start = str(l.start);
        const end = str(l.end);
        const subject = str(l.subject);
        if (!weekday || weekday < 1 || weekday > 7 || !start || !end || !subject || !validHM(start) || !validHM(end)) {
          return fail('Jede Stunde braucht weekday (1-7), start, end (HH:MM) und subject.');
        }
        lessons.push({ weekday, start: normHM(start), end: normHM(end), subject, room: str(l.room) ?? null });
      }
      if (lessons.length === 0) return fail('Keine Stunden übergeben.');
      const settings = await getSettings();
      const detail = lessons.map((l) => `${WEEKDAY_SHORT[l.weekday - 1]} ${l.start}-${l.end} ${l.subject}`).join('\n');
      if (!(await needsApproval(settings.autoTasks, `${lessons.length} Stunden eintragen`, detail))) return declined();
      status.set('tasks', `Trägt ${lessons.length} Stunden ein`);
      for (const l of lessons) await db.addLesson(l);
      await db.addLog(runId, 'action', `${lessons.length} Stunden im Stundenplan eingetragen`, detail);
      status.step('result', `${lessons.length} Stunden eingetragen`);
      return ok({ added: lessons.length });
    }

    case 'get_grades': {
      status.set('tasks', 'Liest deine Noten');
      const grades = await db.listGrades();
      const bySubject = new Map<string, db.Grade[]>();
      for (const g of grades) bySubject.set(g.subject, [...(bySubject.get(g.subject) ?? []), g]);
      const subjects = [...bySubject.entries()].map(([subject, list]) => ({
        subject,
        average: round2(gradeAverage(list)),
        grades: list.map((g) => ({ id: g.id, value: g.value, weight: g.weight, kind: g.kind, date: g.date })),
      }));
      await db.addLog(runId, 'tool', 'Noten gelesen', `${grades.length} Noten`);
      status.step('result', `Noten: ${grades.length} gefunden`);
      return ok({ overall: round2(gradeAverage(subjects.flatMap((s) => (s.average === null ? [] : [{ value: s.average, weight: 1 }])))), subjects });
    }

    case 'add_grade': {
      const subject = str(input.subject);
      const value = num(input.value);
      if (!subject || value === undefined || value < 1 || value > 6) return fail('subject und value (1 bis 6) sind nötig.');
      const weight = num(input.weight) ?? 1;
      const settings = await getSettings();
      const detail = `${subject}: ${value}${str(input.kind) ? ` (${str(input.kind)})` : ''}, Gewicht ${weight}`;
      if (!(await needsApproval(settings.autoTasks, 'Note eintragen', detail))) return declined();
      status.set('tasks', `Trägt Note ein: ${subject}`);
      const id = await db.addGrade({ subject, value, weight, kind: str(input.kind), date: str(input.date), note: str(input.note) });
      await db.addLog(runId, 'action', `Note eingetragen: ${subject} ${value}`, detail, { type: 'grade_created', id });
      status.step('result', `Note eingetragen: ${subject} ${value}`);
      return ok({ created: true, grade_id: id });
    }

    case 'needed_grade': {
      const subject = str(input.subject);
      const target = num(input.target);
      if (!subject || target === undefined) return fail('subject und target sind nötig.');
      const weight = num(input.weight) ?? 1;
      const grades = (await db.listGrades()).filter((g) => g.subject.toLowerCase() === subject.toLowerCase());
      if (grades.length === 0) return fail(`Keine Noten für ${subject} gefunden.`);
      const need = neededGrade(grades, target, weight);
      const current = gradeAverage(grades);
      status.step('result', `Rechnung für ${subject}`);
      return ok({
        subject,
        current_average: round2(current),
        target,
        next_weight: weight,
        needed: round2(need),
        reachable: need !== null && need >= 1 && need <= 6,
      });
    }

    case 'create_flashcards': {
      const deck = str(input.deck);
      const raw = Array.isArray(input.cards) ? (input.cards as Input[]) : [];
      const cards = raw
        .map((c) => ({ front: str(c.front), back: str(c.back) }))
        .filter((c): c is { front: string; back: string } => Boolean(c.front && c.back))
        .slice(0, 25);
      if (!deck || cards.length === 0) return fail('deck und mindestens eine Karte mit front und back sind nötig.');
      const settings = await getSettings();
      if (!(await needsApproval(settings.autoTasks, `${cards.length} Karteikarten anlegen`, `Stapel: ${deck}`))) return declined();
      status.set('tasks', `Legt ${cards.length} Karteikarten an`);
      const n = await db.addCards(deck, cards);
      await db.addLog(runId, 'action', `${n} Karteikarten angelegt`, `Stapel: ${deck}`);
      status.step('result', `${n} Karteikarten im Stapel „${deck}“`);
      return ok({ created: n, deck });
    }

    case 'list_decks': {
      const decks = await db.listDecks();
      status.step('result', `Karteikarten: ${decks.length} Stapel`);
      return ok({ decks });
    }

    case 'list_habits': {
      status.set('tasks', 'Liest deine Gewohnheiten');
      const today = toLocalDate(new Date());
      const habits = await db.listHabits();
      const out = [];
      for (const h of habits) {
        const days = await db.habitDays(h.id);
        out.push({ id: h.id, name: h.name, done_today: days.includes(today), streak: streak(days, today) });
      }
      status.step('result', `Gewohnheiten: ${out.length}`);
      return ok({ habits: out });
    }

    case 'add_habit': {
      const n = str(input.name);
      if (!n) return fail('name fehlt.');
      const settings = await getSettings();
      if (!(await needsApproval(settings.autoTasks, 'Gewohnheit anlegen', n))) return declined();
      const id = await db.addHabit(n.slice(0, 80));
      await db.addLog(runId, 'action', `Gewohnheit angelegt: ${n}`, null, { type: 'habit_created', id });
      status.step('result', `Gewohnheit angelegt: ${n}`);
      return ok({ created: true, habit_id: id });
    }

    case 'check_habit': {
      const id = num(input.habit_id);
      if (id === undefined) return fail('habit_id fehlt.');
      const habits = await db.listHabits();
      const h = habits.find((x) => x.id === id);
      if (!h) return fail('Gewohnheit nicht gefunden.');
      const done = input.done !== false;
      const settings = await getSettings();
      if (!(await needsApproval(settings.autoTasks, done ? 'Gewohnheit abhaken' : 'Haken zurücknehmen', h.name))) return declined();
      await db.setHabitDay(id, toLocalDate(new Date()), done);
      await db.addLog(runId, 'action', `${done ? 'Abgehakt' : 'Haken entfernt'}: ${h.name}`, null);
      status.step('result', `${done ? 'Abgehakt' : 'Zurückgenommen'}: ${h.name}`);
      return ok({ ok: true });
    }

    case 'add_expense': {
      const amount = num(input.amount);
      if (amount === undefined || amount === 0) return fail('amount (ungleich 0) fehlt.');
      const settings = await getSettings();
      const detail = `${fmtEuro(amount)}${str(input.category) ? ` · ${str(input.category)}` : ''}${str(input.note) ? ` · ${str(input.note)}` : ''}`;
      if (!(await needsApproval(settings.autoTasks, amount < 0 ? 'Ausgabe eintragen' : 'Einnahme eintragen', detail))) return declined();
      const id = await db.addExpense({ amount, category: str(input.category), note: str(input.note) });
      await db.addLog(runId, 'action', `Eintrag im Taschengeld-Tagebuch: ${fmtEuro(amount)}`, detail, { type: 'expense_created', id });
      status.step('result', `Eingetragen: ${fmtEuro(amount)}`);
      return ok({ created: true });
    }

    case 'get_budget': {
      status.set('tasks', 'Liest dein Taschengeld-Tagebuch');
      const rows = await db.listExpenses(500);
      const balance = rows.reduce((s, r) => s + r.amount, 0);
      const now = new Date();
      const month = rows.filter((r) => {
        const d = new Date(r.ts);
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && r.amount < 0;
      });
      const byCat: Record<string, number> = {};
      for (const r of month) byCat[r.category ?? 'Sonstiges'] = (byCat[r.category ?? 'Sonstiges'] ?? 0) + -r.amount;
      status.step('result', `Kontostand ${fmtEuro(balance)}`);
      return ok({
        balance_eur: Math.round(balance * 100) / 100,
        spent_this_month_by_category: byCat,
        recent: rows.slice(0, 12).map((r) => ({ date: toLocalDate(new Date(r.ts)), amount: r.amount, category: r.category, note: r.note })),
      });
    }

    default:
      return null;
  }
}

function round2(v: number | null): number | null {
  return v === null ? null : Math.round(v * 100) / 100;
}

