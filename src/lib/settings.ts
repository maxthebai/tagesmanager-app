import * as SecureStore from 'expo-secure-store';
import { kvGet, kvSet } from './db';

export const MODELS = {
  haiku: 'claude-haiku-5-5',
  sonnet: 'claude-sonnet-5-5',
} as const;
export type ModelKey = keyof typeof MODELS;

export type Settings = {
  model: ModelKey;
  /** Aufgaben des Agenten (anlegen, abhaken, merken) ohne Rückfrage ausführen. */
  autoTasks: boolean;
  /** Tageslimit für Token (Eingabe + Ausgabe) als Kosten-Notbremse. */
  dailyTokenCap: number;
  name: string;
  city: string;
  briefingEnabled: boolean;
  /** HH:MM */
  briefingTime: string;
  /** AgentMail-Postfach, z. B. mein-agent@agentmail.to */
  mailInbox: string;
  /** Nothing Glyph (Phone 3a / 3a Pro) für Agent-Signale */
  glyphEnabled: boolean;
  /** Zone für "fertig": A, B oder C */
  glyphDoneZone: 'A' | 'B' | 'C';
};

const DEFAULTS: Settings = {
  model: 'haiku',
  autoTasks: true,
  dailyTokenCap: 1_000_000,
  name: 'Max',
  city: 'Langenau',
  briefingEnabled: false,
  briefingTime: '07:00',
  mailInbox: '',
  glyphEnabled: true,
  glyphDoneZone: 'C',
};

export async function getSettings(): Promise<Settings> {
  const raw = await kvGet('settings');
  if (!raw) return DEFAULTS;
  try {
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Settings>) };
  } catch {
    return DEFAULTS;
  }
}
export async function saveSettings(s: Settings): Promise<void> {
  await kvSet('settings', JSON.stringify(s));
}

const KEY_NAME = 'anthropic_api_key';
export async function getApiKey(): Promise<string | null> {
  return SecureStore.getItemAsync(KEY_NAME);
}
export async function setApiKey(key: string): Promise<void> {
  await SecureStore.setItemAsync(KEY_NAME, key.trim());
}
export async function clearApiKey(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY_NAME);
}

const MAIL_KEY = 'agentmail_api_key';
export async function getMailKey(): Promise<string | null> {
  return SecureStore.getItemAsync(MAIL_KEY);
}
export async function setMailKey(key: string): Promise<void> {
  await SecureStore.setItemAsync(MAIL_KEY, key.trim());
}
export async function clearMailKey(): Promise<void> {
  await SecureStore.deleteItemAsync(MAIL_KEY);
}
