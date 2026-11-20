import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Drawer } from './src/components/Drawer';
import { LiveView } from './src/components/LiveView';
import { TopBar } from './src/components/TopBar';
import { kvGet, kvSet } from './src/lib/db';
import { startGlyphBridge } from './src/lib/glyph';
import { startLiveBridge } from './src/lib/live';
import { initNotifications } from './src/lib/notifications';
import { Screen, TITLES } from './src/nav';
import { BRIEFING_PROMPT } from './src/prompts';
import { BudgetScreen } from './src/screens/BudgetScreen';
import { ChatScreen } from './src/screens/ChatScreen';
import { FocusScreen } from './src/screens/FocusScreen';
import { GradesScreen } from './src/screens/GradesScreen';
import { HabitsScreen } from './src/screens/HabitsScreen';
import { LearnScreen } from './src/screens/LearnScreen';
import { LogScreen } from './src/screens/LogScreen';
import { MailScreen } from './src/screens/MailScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { TasksScreen } from './src/screens/TasksScreen';
import { TimetableScreen } from './src/screens/TimetableScreen';
import { TodayScreen } from './src/screens/TodayScreen';
import { useTheme } from './src/theme';

function Shell() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [screen, setScreen] = useState<Screen>('chat');
  const [menu, setMenu] = useState(false);
  const [live, setLive] = useState(false);
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);
  const handled = useRef<string | null>(null);

  const consume = useCallback(() => setPendingPrompt(null), []);
  const runPrompt = useCallback((p: string) => {
    setScreen('chat');
    setPendingPrompt(p);
  }, []);

  useEffect(() => {
    void initNotifications();
    startLiveBridge();
    startGlyphBridge();
  }, []);

  // Tipp auf die Briefing-Benachrichtigung startet das Briefing (einmal pro Benachrichtigung).
  const last = Notifications.useLastNotificationResponse();
  useEffect(() => {
    const id = last?.notification.request.identifier;
    const kind = last?.notification.request.content.data?.kind;
    if (!id || kind !== 'briefing' || handled.current === id) return;
    handled.current = id;
    void (async () => {
      const day = new Date().toDateString();
      if ((await kvGet('briefing_last_run')) === day) return;
      await kvSet('briefing_last_run', day);
      runPrompt(BRIEFING_PROMPT);
    })();
  }, [last, runPrompt]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (menu) {
        setMenu(false);
        return true;
      }
      if (live) {
        setLive(false);
        return true;
      }
      if (screen !== 'chat') {
        setScreen('chat');
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [menu, live, screen]);

  const show = (s: Screen) => (screen === s ? { flex: 1 } : { display: 'none' as const });

  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top }}>
      <StatusBar style={t.dark ? 'light' : 'dark'} />
      <TopBar title={TITLES[screen]} onMenu={() => setMenu(true)} onStatus={() => setLive(true)} />
      <View style={{ flex: 1 }}>
        <View style={show('chat')}>
          <ChatScreen active={screen === 'chat'} pendingPrompt={pendingPrompt} onPromptConsumed={consume} />
        </View>
        <View style={show('today')}>
          <TodayScreen active={screen === 'today'} onPrompt={runPrompt} />
        </View>
        <View style={show('tasks')}>
          <TasksScreen active={screen === 'tasks'} />
        </View>
        <View style={show('timetable')}>
          <TimetableScreen active={screen === 'timetable'} onPrompt={runPrompt} />
        </View>
        <View style={show('grades')}>
          <GradesScreen active={screen === 'grades'} />
        </View>
        <View style={show('learn')}>
          <LearnScreen active={screen === 'learn'} onPrompt={runPrompt} />
        </View>
        <View style={show('focus')}>
          <FocusScreen active={screen === 'focus'} />
        </View>
        <View style={show('habits')}>
          <HabitsScreen active={screen === 'habits'} />
        </View>
        <View style={show('budget')}>
          <BudgetScreen active={screen === 'budget'} />
        </View>
        <View style={show('mail')}>
          <MailScreen active={screen === 'mail'} onPrompt={runPrompt} />
        </View>
        <View style={show('log')}>
          <LogScreen active={screen === 'log'} />
        </View>
        <View style={show('settings')}>
          <SettingsScreen active={screen === 'settings'} />
        </View>
      </View>
      <Drawer
        visible={menu}
        current={screen}
        onSelect={(s) => {
          setScreen(s);
          setMenu(false);
        }}
        onClose={() => setMenu(false)}
      />
      <LiveView visible={live} onClose={() => setLive(false)} />
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <Shell />
    </SafeAreaProvider>
  );
}
