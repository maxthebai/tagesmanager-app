export type Screen =
  | 'chat'
  | 'today'
  | 'tasks'
  | 'timetable'
  | 'grades'
  | 'learn'
  | 'focus'
  | 'habits'
  | 'budget'
  | 'mail'
  | 'log'
  | 'settings';

export const NAV: { group: string; items: { key: Screen; label: string }[] }[] = [
  {
    group: '',
    items: [
      { key: 'chat', label: 'Agent' },
      { key: 'today', label: 'Heute' },
      { key: 'tasks', label: 'Aufgaben' },
    ],
  },
  {
    group: 'Schule',
    items: [
      { key: 'timetable', label: 'Stundenplan' },
      { key: 'grades', label: 'Noten' },
      { key: 'learn', label: 'Lernen' },
      { key: 'focus', label: 'Fokus' },
    ],
  },
  {
    group: 'Alltag',
    items: [
      { key: 'habits', label: 'Gewohnheiten' },
      { key: 'budget', label: 'Taschengeld' },
      { key: 'mail', label: 'Postfach' },
    ],
  },
  {
    group: 'System',
    items: [
      { key: 'log', label: 'Protokoll' },
      { key: 'settings', label: 'Einstellungen' },
    ],
  },
];

export const TITLES: Record<Screen, string> = {
  chat: 'Tagesmanager',
  today: 'Heute',
  tasks: 'Aufgaben',
  timetable: 'Stundenplan',
  grades: 'Noten',
  learn: 'Lernen',
  focus: 'Fokus',
  habits: 'Gewohnheiten',
  budget: 'Taschengeld',
  mail: 'Postfach',
  log: 'Protokoll',
  settings: 'Einstellungen',
};
