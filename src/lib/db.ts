import * as SQLite from 'expo-sqlite';

export type Task = {
  id: number;
  title: string;
  subject: string | null;
  kind: string;
  due: string | null;
  notes: string | null;
  done: number;
  created: number;
};
export type LogRow = {
  id: number;
  ts: number;
  run_id: number | null;
  kind: string;
  label: string;
  detail: string | null;
  undo: string | null;
  undone: number;
};
export type MsgRow = { id: number; ts: number; role: 'user' | 'assistant'; text: string };
export type MemRow = { id: number; ts: number; note: string };

let dbp: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbp) dbp = init();
  return dbp;
}

async function init(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync('tagesmanager.db');
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER NOT NULL, role TEXT NOT NULL, text TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, subject TEXT, kind TEXT NOT NULL DEFAULT 'other',
      due TEXT, notes TEXT, done INTEGER NOT NULL DEFAULT 0, created INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS events_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER NOT NULL, run_id INTEGER, kind TEXT NOT NULL,
      label TEXT NOT NULL, detail TEXT, undo TEXT, undone INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS memory (
      id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER NOT NULL, note TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS usage (
      day TEXT PRIMARY KEY NOT NULL, input INTEGER NOT NULL DEFAULT 0, output INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS timetable (
      id INTEGER PRIMARY KEY AUTOINCREMENT, weekday INTEGER NOT NULL, start TEXT NOT NULL, end TEXT NOT NULL,
      subject TEXT NOT NULL, room TEXT);
    CREATE TABLE IF NOT EXISTS grades (
      id INTEGER PRIMARY KEY AUTOINCREMENT, subject TEXT NOT NULL, value REAL NOT NULL, weight REAL NOT NULL DEFAULT 1,
      kind TEXT NOT NULL DEFAULT 'Klausur', date TEXT, note TEXT);
    CREATE TABLE IF NOT EXISTS cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT, deck TEXT NOT NULL, front TEXT NOT NULL, back TEXT NOT NULL,
      box INTEGER NOT NULL DEFAULT 0, due INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS habits (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, created INTEGER NOT NULL, archived INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS habit_log (
      habit_id INTEGER NOT NULL, day TEXT NOT NULL, PRIMARY KEY (habit_id, day));
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER NOT NULL, amount REAL NOT NULL, category TEXT, note TEXT);
    CREATE TABLE IF NOT EXISTS reminders (
      id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, ts INTEGER NOT NULL, notif_id TEXT);
  `);
  try {
    await db.execAsync('ALTER TABLE messages ADD COLUMN image TEXT');
  } catch {
    /* Spalte existiert schon */
  }
  return db;
}

// ---- key/value ----
export async function kvGet(key: string): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM kv WHERE key = ?', [key]);
  return row ? row.value : null;
}
export async function kvSet(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)', [key, value]);
}

// ---- messages ----
export async function addMessage(role: 'user' | 'assistant', text: string, image?: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('INSERT INTO messages (ts, role, text, image) VALUES (?, ?, ?, ?)', [Date.now(), role, text, image ?? null]);
  if (image) {
    // nur die letzten 3 Fotos behalten, damit die Datenbank klein bleibt
    await db.runAsync(
      'UPDATE messages SET image = NULL WHERE image IS NOT NULL AND id NOT IN (SELECT id FROM messages WHERE image IS NOT NULL ORDER BY id DESC LIMIT 3)',
    );
  }
}
export async function recentMessages(limit: number): Promise<MsgRow[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<MsgRow>('SELECT id, ts, role, text FROM messages ORDER BY id DESC LIMIT ?', [limit]);
  return rows.reverse();
}
export async function clearMessages(): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM messages');
}
/** Für den Agenten: Verlauf inklusive Foto (Base64) bei Nachrichten, die eines haben. */
export async function recentMessagesWithImages(limit: number): Promise<(MsgRow & { image: string | null })[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<MsgRow & { image: string | null }>('SELECT id, ts, role, text, image FROM messages ORDER BY id DESC LIMIT ?', [limit]);
  return rows.reverse();
}

// ---- tasks ----
export async function addTask(t: {
  title: string;
  subject?: string | null;
  kind?: string;
  due?: string | null;
  notes?: string | null;
}): Promise<number> {
  const db = await getDb();
  const r = await db.runAsync(
    'INSERT INTO tasks (title, subject, kind, due, notes, done, created) VALUES (?, ?, ?, ?, ?, 0, ?)',
    [t.title, t.subject ?? null, t.kind ?? 'other', t.due ?? null, t.notes ?? null, Date.now()],
  );
  return r.lastInsertRowId;
}
export async function listTasks(includeDone: boolean): Promise<Task[]> {
  const db = await getDb();
  const sql = includeDone
    ? 'SELECT * FROM tasks ORDER BY done ASC, due IS NULL, due ASC, id DESC'
    : 'SELECT * FROM tasks WHERE done = 0 ORDER BY due IS NULL, due ASC, id DESC';
  return db.getAllAsync<Task>(sql);
}
export async function getTask(id: number): Promise<Task | null> {
  const db = await getDb();
  return db.getFirstAsync<Task>('SELECT * FROM tasks WHERE id = ?', [id]);
}
export async function setTaskDone(id: number, done: boolean): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE tasks SET done = ? WHERE id = ?', [done ? 1 : 0, id]);
}
export async function deleteTask(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM tasks WHERE id = ?', [id]);
}

// ---- activity log ----
export async function addLog(
  runId: number | null,
  kind: string,
  label: string,
  detail?: string | null,
  undo?: object | null,
): Promise<number> {
  const db = await getDb();
  const r = await db.runAsync(
    'INSERT INTO events_log (ts, run_id, kind, label, detail, undo, undone) VALUES (?, ?, ?, ?, ?, ?, 0)',
    [Date.now(), runId, kind, label, detail ?? null, undo ? JSON.stringify(undo) : null],
  );
  return r.lastInsertRowId;
}
export async function listLog(limit: number): Promise<LogRow[]> {
  const db = await getDb();
  return db.getAllAsync<LogRow>('SELECT * FROM events_log ORDER BY id DESC LIMIT ?', [limit]);
}
export async function markUndone(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE events_log SET undone = 1 WHERE id = ?', [id]);
}

// ---- memory notes ----
export async function addMemory(note: string): Promise<number> {
  const db = await getDb();
  const r = await db.runAsync('INSERT INTO memory (ts, note) VALUES (?, ?)', [Date.now(), note]);
  return r.lastInsertRowId;
}
export async function listMemory(): Promise<MemRow[]> {
  const db = await getDb();
  return db.getAllAsync<MemRow>('SELECT * FROM memory ORDER BY id ASC LIMIT 40');
}
export async function deleteMemory(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM memory WHERE id = ?', [id]);
}

// ---- usage ----
function dayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export async function addUsage(input: number, output: number): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO usage (day, input, output) VALUES (?, ?, ?)
     ON CONFLICT(day) DO UPDATE SET input = input + excluded.input, output = output + excluded.output`,
    [dayKey(), input, output],
  );
}
export async function usageToday(): Promise<{ input: number; output: number }> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ input: number; output: number }>(
    'SELECT input, output FROM usage WHERE day = ?',
    [dayKey()],
  );
  return row ?? { input: 0, output: 0 };
}

// ---- Stundenplan ----
export type Lesson = { id: number; weekday: number; start: string; end: string; subject: string; room: string | null };
export async function addLesson(l: { weekday: number; start: string; end: string; subject: string; room?: string | null }): Promise<number> {
  const db = await getDb();
  const r = await db.runAsync('INSERT INTO timetable (weekday, start, end, subject, room) VALUES (?, ?, ?, ?, ?)', [
    l.weekday,
    l.start,
    l.end,
    l.subject,
    l.room ?? null,
  ]);
  return r.lastInsertRowId;
}
export async function listLessons(): Promise<Lesson[]> {
  const db = await getDb();
  return db.getAllAsync<Lesson>('SELECT * FROM timetable ORDER BY weekday ASC, start ASC');
}
export async function deleteLesson(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM timetable WHERE id = ?', [id]);
}

// ---- Noten ----
export type Grade = { id: number; subject: string; value: number; weight: number; kind: string; date: string | null; note: string | null };
export async function addGrade(g: { subject: string; value: number; weight?: number; kind?: string; date?: string | null; note?: string | null }): Promise<number> {
  const db = await getDb();
  const r = await db.runAsync('INSERT INTO grades (subject, value, weight, kind, date, note) VALUES (?, ?, ?, ?, ?, ?)', [
    g.subject,
    g.value,
    g.weight ?? 1,
    g.kind ?? 'Klausur',
    g.date ?? null,
    g.note ?? null,
  ]);
  return r.lastInsertRowId;
}
export async function listGrades(): Promise<Grade[]> {
  const db = await getDb();
  return db.getAllAsync<Grade>('SELECT * FROM grades ORDER BY subject ASC, id ASC');
}
export async function deleteGrade(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM grades WHERE id = ?', [id]);
}

// ---- Karteikarten ----
export type Card = { id: number; deck: string; front: string; back: string; box: number; due: number };
export async function addCards(deck: string, cards: { front: string; back: string }[]): Promise<number> {
  const db = await getDb();
  let n = 0;
  for (const c of cards) {
    await db.runAsync('INSERT INTO cards (deck, front, back, box, due) VALUES (?, ?, ?, 0, 0)', [deck, c.front, c.back]);
    n++;
  }
  return n;
}
export async function listDecks(): Promise<{ deck: string; total: number; due: number }[]> {
  const db = await getDb();
  return db.getAllAsync<{ deck: string; total: number; due: number }>(
    'SELECT deck, COUNT(*) AS total, SUM(CASE WHEN due <= ? THEN 1 ELSE 0 END) AS due FROM cards GROUP BY deck ORDER BY deck ASC',
    [Date.now()],
  );
}
export async function dueCards(deck: string | null, limit: number): Promise<Card[]> {
  const db = await getDb();
  if (deck) {
    return db.getAllAsync<Card>('SELECT * FROM cards WHERE deck = ? AND due <= ? ORDER BY due ASC, id ASC LIMIT ?', [deck, Date.now(), limit]);
  }
  return db.getAllAsync<Card>('SELECT * FROM cards WHERE due <= ? ORDER BY due ASC, id ASC LIMIT ?', [Date.now(), limit]);
}
export async function updateCardSchedule(id: number, box: number, due: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE cards SET box = ?, due = ? WHERE id = ?', [box, due, id]);
}
export async function deleteDeck(deck: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM cards WHERE deck = ?', [deck]);
}

// ---- Gewohnheiten ----
export type Habit = { id: number; name: string; created: number; archived: number };
export async function addHabit(name: string): Promise<number> {
  const db = await getDb();
  const r = await db.runAsync('INSERT INTO habits (name, created, archived) VALUES (?, ?, 0)', [name, Date.now()]);
  return r.lastInsertRowId;
}
export async function listHabits(): Promise<Habit[]> {
  const db = await getDb();
  return db.getAllAsync<Habit>('SELECT * FROM habits WHERE archived = 0 ORDER BY id ASC');
}
export async function archiveHabit(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE habits SET archived = 1 WHERE id = ?', [id]);
}
export async function setHabitDay(habitId: number, day: string, on: boolean): Promise<void> {
  const db = await getDb();
  if (on) await db.runAsync('INSERT OR IGNORE INTO habit_log (habit_id, day) VALUES (?, ?)', [habitId, day]);
  else await db.runAsync('DELETE FROM habit_log WHERE habit_id = ? AND day = ?', [habitId, day]);
}
export async function habitDays(habitId: number): Promise<string[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ day: string }>('SELECT day FROM habit_log WHERE habit_id = ? ORDER BY day DESC LIMIT 400', [habitId]);
  return rows.map((r) => r.day);
}

// ---- Taschengeld ----
export type Expense = { id: number; ts: number; amount: number; category: string | null; note: string | null };
export async function addExpense(e: { amount: number; category?: string | null; note?: string | null; ts?: number }): Promise<number> {
  const db = await getDb();
  const r = await db.runAsync('INSERT INTO expenses (ts, amount, category, note) VALUES (?, ?, ?, ?)', [
    e.ts ?? Date.now(),
    e.amount,
    e.category ?? null,
    e.note ?? null,
  ]);
  return r.lastInsertRowId;
}
export async function listExpenses(limit: number): Promise<Expense[]> {
  const db = await getDb();
  return db.getAllAsync<Expense>('SELECT * FROM expenses ORDER BY ts DESC, id DESC LIMIT ?', [limit]);
}
export async function deleteExpense(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM expenses WHERE id = ?', [id]);
}

// ---- Erinnerungen ----
export type Reminder = { id: number; title: string; ts: number; notif_id: string | null };
export async function addReminder(title: string, ts: number, notifId: string | null): Promise<number> {
  const db = await getDb();
  const r = await db.runAsync('INSERT INTO reminders (title, ts, notif_id) VALUES (?, ?, ?)', [title, ts, notifId]);
  return r.lastInsertRowId;
}
export async function listReminders(): Promise<Reminder[]> {
  const db = await getDb();
  return db.getAllAsync<Reminder>('SELECT * FROM reminders WHERE ts > ? ORDER BY ts ASC', [Date.now()]);
}
export async function getReminder(id: number): Promise<Reminder | null> {
  const db = await getDb();
  return db.getFirstAsync<Reminder>('SELECT * FROM reminders WHERE id = ?', [id]);
}
export async function deleteReminder(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM reminders WHERE id = ?', [id]);
}

export async function wipeAll(): Promise<void> {
  const db = await getDb();
  await db.execAsync(
    `DELETE FROM messages; DELETE FROM tasks; DELETE FROM events_log; DELETE FROM memory; DELETE FROM usage; DELETE FROM kv;
     DELETE FROM timetable; DELETE FROM grades; DELETE FROM cards; DELETE FROM habits; DELETE FROM habit_log;
     DELETE FROM expenses; DELETE FROM reminders;`,
  );
}
