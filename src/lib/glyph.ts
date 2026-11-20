import { requireOptionalNativeModule } from 'expo';
import { AppState } from 'react-native';
import { getSettings } from './settings';
import { status, subscribeStatus } from './status';

type Native = {
  isAvailable(): boolean;
  setState(state: string, zone: string): boolean;
};
export type GlyphState = 'off' | 'blink' | 'talk' | 'done' | 'test';

const native = requireOptionalNativeModule<Native>('AgentGlyph');
let current: GlyphState = 'off';
let setWhileBackground = false;

export function glyphAvailable(): boolean {
  try {
    return Boolean(native?.isAvailable());
  } catch {
    return false;
  }
}

/** Setzt den Glyph-Zustand: blink = Freigabe nötig, talk = alle an (Agent will sprechen), done = Ergebnis liegt bereit. */
export async function setGlyph(state: GlyphState): Promise<void> {
  if (!native) return;
  const s = await getSettings();
  if (!s.glyphEnabled && state !== 'test' && state !== 'off') return;
  current = state;
  setWhileBackground = AppState.currentState !== 'active';
  try {
    native.setState(state, s.glyphDoneZone);
  } catch {
    /* ohne Glyph weiter */
  }
}

/** Verbindet Agenten-Status und Glyph. */
export function startGlyphBridge(): void {
  if (!native) return;
  let lastApproval = false;
  let wasRunning = false;
  subscribeStatus(() => {
    const s = status.get();
    const approval = s.approval !== null;
    if (approval && !lastApproval) void setGlyph('blink');
    if (!approval && lastApproval) void setGlyph(s.running ? 'off' : current);
    lastApproval = approval;
    if (s.running && !wasRunning) void setGlyph('off');
    wasRunning = s.running;
  });
  // Was im Hintergrund signalisiert wurde, bleibt bis zur nächsten Aktion; im Vordergrund erlischt es beim Wechsel.
  AppState.addEventListener('change', (st) => {
    if (st === 'active' && setWhileBackground && (current === 'talk' || current === 'done')) {
      setWhileBackground = false;
      void setGlyph('off');
    }
  });
}
