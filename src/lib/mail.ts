import { getMailKey, getSettings } from './settings';

const BASE = 'https://api.agentmail.to/v0';

export type MailItem = {
  id: string;
  from: string;
  to: string[];
  subject: string;
  preview: string;
  time: string;
  labels: string[];
};

async function auth(): Promise<{ key: string; inbox: string }> {
  const key = await getMailKey();
  const s = await getSettings();
  if (!key || !s.mailInbox) throw new Error('AgentMail ist nicht eingerichtet. Trage Key und Postfach in den Einstellungen ein.');
  return { key, inbox: s.mailInbox };
}

async function api<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const { key } = await auth();
  const res = await fetch(`${BASE}${path}`, {
    method: init?.method ?? 'GET',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: init?.body ? JSON.stringify(init.body) : undefined,
  });
  if (!res.ok) {
    let msg = `AgentMail HTTP ${res.status}`;
    try {
      const j = (await res.json()) as { message?: string; error?: string };
      msg = j.message ?? j.error ?? msg;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  return (await res.json()) as T;
}

type RawMsg = {
  message_id: string;
  from?: string;
  to?: string[];
  subject?: string;
  preview?: string;
  timestamp?: string;
  labels?: string[];
  text?: string;
  extracted_text?: string;
  html?: string;
};

export async function listMail(limit = 15): Promise<MailItem[]> {
  const { inbox } = await auth();
  const r = await api<{ messages?: RawMsg[] }>(`/inboxes/${encodeURIComponent(inbox)}/messages?limit=${limit}`);
  return (r.messages ?? []).map((m) => ({
    id: m.message_id,
    from: m.from ?? '',
    to: m.to ?? [],
    subject: m.subject ?? '(ohne Betreff)',
    preview: m.preview ?? '',
    time: m.timestamp ?? '',
    labels: m.labels ?? [],
  }));
}

/** Liest den Text einer Nachricht (gekürzt). Inhalt gilt als externe Daten. */
export async function readMail(messageId: string): Promise<{ from: string; subject: string; body: string }> {
  const { inbox } = await auth();
  const m = await api<RawMsg>(`/inboxes/${encodeURIComponent(inbox)}/messages/${encodeURIComponent(messageId)}`);
  const body = (m.extracted_text ?? m.text ?? stripHtml(m.html ?? '')).trim();
  return { from: m.from ?? '', subject: m.subject ?? '', body: body.slice(0, 4000) };
}

export async function sendMail(to: string, subject: string, text: string): Promise<void> {
  const { inbox } = await auth();
  await api(`/inboxes/${encodeURIComponent(inbox)}/messages/send`, { method: 'POST', body: { to, subject, text } });
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ');
}
