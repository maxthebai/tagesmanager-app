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
  `);
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
export async function addMessage(role: 'user' | 'assistant', text: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('INSERT INTO messages (ts, role, text) VALUES (?, ?, ?)', [Date.now(), role, text]);
}
export async function recentMessages(limit: number): Promise<MsgRow[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<MsgRow>('SELECT * FROM messages ORDER BY id DESC LIMIT ?', [limit]);
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

export async function wipeAll(): Promise<void> {
  const db = await getDb();
  await db.execAsync(
    'DELETE FROM messages; DELETE FROM tasks; DELETE FROM events_log; DELETE FROM memory; DELETE FROM usage; DELETE FROM kv;',
  );
}
