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
};

const DEFAULTS: Settings = { model: 'haiku', autoTasks: true, dailyTokenCap: 1_000_000 };

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
