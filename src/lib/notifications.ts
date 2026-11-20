import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { kvGet, kvSet } from './db';
import { normHM, validHM } from './logic';

const CHANNEL = 'default';

export async function initNotifications(): Promise<void> {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'Erinnerungen und Briefing',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
}

export async function ensureNotificationPermission(): Promise<boolean> {
  const cur = await Notifications.getPermissionsAsync();
  if (cur.granted) return true;
  const req = await Notifications.requestPermissionsAsync();
  return req.granted;
}

export async function scheduleReminder(title: string, at: Date): Promise<string> {
  return Notifications.scheduleNotificationAsync({
    content: { title: 'Erinnerung', body: title, data: { kind: 'reminder' } },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at, channelId: CHANNEL },
  });
}

export async function cancelNotification(id: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(id);
}

const BRIEFING_KEY = 'briefing_notif_id';

export async function cancelBriefing(): Promise<void> {
  const id = await kvGet(BRIEFING_KEY);
  if (id) {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch {
      /* war schon weg */
    }
  }
}

/** Plant das tägliche Morgenbriefing neu (ersetzt das alte). */
export async function scheduleBriefing(hhmm: string): Promise<boolean> {
  await cancelBriefing();
  if (!validHM(hhmm)) return false;
  if (!(await ensureNotificationPermission())) return false;
  const [h, m] = normHM(hhmm).split(':').map(Number);
  const id = await Notifications.scheduleNotificationAsync({
    content: { title: 'Dein Morgenbriefing', body: 'Tippe, um deinen Tag zu sehen.', data: { kind: 'briefing' } },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: h, minute: m, channelId: CHANNEL },
  });
  await kvSet(BRIEFING_KEY, id);
  return true;
}
