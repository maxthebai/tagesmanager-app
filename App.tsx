import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AgentStatusBar } from './src/components/AgentStatusBar';
import { LiveView } from './src/components/LiveView';
import { ChatScreen } from './src/screens/ChatScreen';
import { LogScreen } from './src/screens/LogScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { TasksScreen } from './src/screens/TasksScreen';
import { TodayScreen } from './src/screens/TodayScreen';
import { colors } from './src/theme';

type Tab = 'chat' | 'today' | 'tasks' | 'log' | 'settings';
const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'chat', label: 'Agent', icon: '💬' },
  { key: 'today', label: 'Heute', icon: '📅' },
  { key: 'tasks', label: 'Aufgaben', icon: '✅' },
  { key: 'log', label: 'Protokoll', icon: '🕘' },
  { key: 'settings', label: 'Einstellungen', icon: '⚙️' },
];

function Shell() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('chat');
  const [live, setLive] = useState(false);
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);

  const consume = useCallback(() => setPendingPrompt(null), []);
  const runPrompt = useCallback((p: string) => {
    setTab('chat');
    setPendingPrompt(p);
  }, []);

  const show = (t: Tab) => (tab === t ? styles.visible : styles.hidden);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar style="light" />
      <AgentStatusBar onPress={() => setLive(true)} />
      <View style={styles.body}>
        <View style={show('chat')}>
          <ChatScreen active={tab === 'chat'} pendingPrompt={pendingPrompt} onPromptConsumed={consume} />
        </View>
        <View style={show('today')}>
          <TodayScreen active={tab === 'today'} onPrompt={runPrompt} />
        </View>
        <View style={show('tasks')}>
          <TasksScreen active={tab === 'tasks'} />
        </View>
        <View style={show('log')}>
          <LogScreen active={tab === 'log'} />
        </View>
        <View style={show('settings')}>
          <SettingsScreen active={tab === 'settings'} />
        </View>
      </View>
      <View style={[styles.tabs, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        {TABS.map((t) => (
          <Pressable key={t.key} style={styles.tab} onPress={() => setTab(t.key)}>
            <Text style={styles.icon}>{t.icon}</Text>
            <Text style={[styles.tabLabel, tab === t.key && { color: colors.accent }]} numberOfLines={1}>
              {t.label}
            </Text>
          </Pressable>
        ))}
      </View>
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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  body: { flex: 1 },
  visible: { flex: 1 },
  hidden: { display: 'none' },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
  },
  tab: { flex: 1, alignItems: 'center' },
  icon: { fontSize: 18 },
  tabLabel: { color: colors.sub, fontSize: 11, marginTop: 2 },
});
