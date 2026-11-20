import { status } from './status';

export type ToolDef = {
  name: string;
  description: string;
  input_schema: { type: 'object'; properties: Record<string, unknown>; required?: string[] };
};

export type ToolResult = { content: string; isError: boolean };
export type Input = Record<string, unknown>;

export const ISO_HINT = 'ISO 8601 in lokaler Zeit ohne Zeitzone, z. B. 2026-11-21T15:30:00';

export const ok = (data: unknown): ToolResult => ({ content: JSON.stringify(data), isError: false });
export const fail = (msg: string): ToolResult => ({ content: msg, isError: true });
export const declined = (): ToolResult => ({
  content: 'Der Nutzer hat die Aktion abgelehnt. Nichts wurde geändert. Frage nach, was stattdessen gewünscht ist.',
  isError: false,
});

export const str = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
export const num = (v: unknown): number | undefined => {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v.replace(',', '.')) : NaN;
  return Number.isFinite(n) ? n : undefined;
};

/** Liefert true, wenn ausgeführt werden darf (automatisch oder nach Bestätigung des Nutzers). */
export async function needsApproval(autoOk: boolean, title: string, detail: string): Promise<boolean> {
  if (autoOk) return true;
  return status.askApproval(title, detail);
}
