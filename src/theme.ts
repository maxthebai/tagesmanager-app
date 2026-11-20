import { useColorScheme } from 'react-native';

export type Theme = {
  dark: boolean;
  bg: string;
  surface: string;
  surface2: string;
  surface3: string;
  text: string;
  sub: string;
  mute: string;
  accent: string;
  onAccent: string;
  accentSoft: string;
  ok: string;
  warn: string;
  err: string;
  line: string;
};

// Farben angelehnt an die Gemini-App (Material 3, hell und dunkel)
const dark: Theme = {
  dark: true,
  bg: '#131314',
  surface: '#1e1f20',
  surface2: '#282a2c',
  surface3: '#333537',
  text: '#e3e3e3',
  sub: '#c4c7c5',
  mute: '#8e918f',
  accent: '#a8c7fa',
  onAccent: '#062e6f',
  accentSoft: '#0842a0',
  ok: '#81c995',
  warn: '#fdd663',
  err: '#f2b8b5',
  line: '#37393b',
};

const light: Theme = {
  dark: false,
  bg: '#ffffff',
  surface: '#f0f4f9',
  surface2: '#e9eef6',
  surface3: '#dde3ea',
  text: '#1f1f1f',
  sub: '#444746',
  mute: '#747775',
  accent: '#0b57d0',
  onAccent: '#ffffff',
  accentSoft: '#d3e3fd',
  ok: '#1e8e3e',
  warn: '#b06000',
  err: '#b3261e',
  line: '#e1e3e1',
};

export function useTheme(): Theme {
  const scheme = useColorScheme();
  return scheme === 'light' ? light : dark;
}
