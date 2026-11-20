import * as Notifications from 'expo-notifications';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useEffect, useRef, useState } from 'react';
import { Text } from 'react-native';
import { Btn, Chip, Page, Row, Sub } from '../components/ui';
import { ensureNotificationPermission } from '../lib/notifications';
import { useTheme } from '../theme';

const TAG = 'focus';
const PRESETS = [15, 25, 45, 60];

export function FocusScreen({ active }: { active: boolean }) {
  const t = useTheme();
  const [minutes, setMinutes] = useState(25);
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [left, setLeft] = useState(0);
  const [finished, setFinished] = useState(false);
  const notifId = useRef<string | null>(null);

  useEffect(() => {
    if (!endsAt) return;
    const tick = () => {
      const l = Math.max(0, Math.round((endsAt - Date.now()) / 1000));
      setLeft(l);
      if (l === 0) {
        setEndsAt(null);
        setFinished(true);
        void deactivateKeepAwake(TAG);
      }
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [endsAt]);

  useEffect(() => () => void deactivateKeepAwake(TAG), []);

  const start = async () => {
    const end = Date.now() + minutes * 60 * 1000;
    setFinished(false);
    setEndsAt(end);
    void activateKeepAwakeAsync(TAG);
    try {
      if (await ensureNotificationPermission()) {
        notifId.current = await Notifications.scheduleNotificationAsync({
          content: { title: 'Fokus geschafft', body: `${minutes} Minuten sind um. Zeit für eine Pause.` },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(end), channelId: 'default' },
        });
      }
    } catch {
      /* ohne Benachrichtigung weiter */
    }
  };

  const stop = async () => {
    setEndsAt(null);
    void deactivateKeepAwake(TAG);
    if (notifId.current) {
      try {
        await Notifications.cancelScheduledNotificationAsync(notifId.current);
      } catch {
        /* egal */
      }
      notifId.current = null;
    }
  };

  const running = endsAt !== null;
  const shown = running ? left : minutes * 60;
  const mm = String(Math.floor(shown / 60)).padStart(2, '0');
  const ss = String(shown % 60).padStart(2, '0');

  return (
    <Page>
      <Text style={{ color: running ? t.accent : t.text, fontSize: 84, fontWeight: '300', textAlign: 'center', marginTop: 40, fontVariant: ['tabular-nums'] }}>
        {mm}:{ss}
      </Text>
      <Sub style={{ textAlign: 'center', marginBottom: 28 }}>
        {finished ? 'Geschafft. Mach kurz Pause.' : running ? 'Bleib dran. Das Display bleibt an.' : 'Wähle eine Dauer'}
      </Sub>
      {!running ? (
        <Row style={{ justifyContent: 'center', marginBottom: 24, flexWrap: 'wrap' }}>
          {PRESETS.map((m) => (
            <Chip key={m} label={`${m} min`} selected={minutes === m} onPress={() => setMinutes(m)} />
          ))}
        </Row>
      ) : null}
      {running ? <Btn label="Abbrechen" kind="tonal" onPress={() => void stop()} /> : <Btn label="Start" onPress={() => void start()} />}
      <Sub style={{ textAlign: 'center', marginTop: 18 }}>Lass die App offen oder im Hintergrund, am Ende kommt eine Benachrichtigung.</Sub>
    </Page>
  );
}
