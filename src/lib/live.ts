import { requireOptionalNativeModule } from 'expo';
import { AppState } from 'react-native';
import { stopRun } from './agent';
import { glyphState, onGlyphOff, setGlyph } from './glyph';
import { ensureNotificationPermission } from './notifications';
import { Snapshot, status, subscribeStatus } from './status';

type Native = {
  update(mode: string, title: string, text: string, step: number, max: number, chip: string, silent: boolean): boolean;
  addListener(event: 'onAction', cb: (e: { action: string }) => void): { remove(): void };
};

const MAX_STEPS = 12;
let started = false;
let wasRunning = false;
let lastKey = '';
let holding = false;

/** Verbindet den Agenten-Status mit der Live-Benachrichtigung (nur Android, sonst nichts). */
export function startLiveBridge(): void {
  if (started) return;
  started = true;
  const native = requireOptionalNativeModule<Native>('AgentLive');
  if (!native) return;

  native.addListener('onAction', (e) => {
    if (e.action === 'stop') stopRun();
    else if (e.action === 'approve') status.answerApproval(true);
    else if (e.action === 'deny') status.answerApproval(false);
    else if (e.action === 'dismiss') void setGlyph('off');
  });

  onGlyphOff(() => {
    if (holding && !status.get().running) native.update('stop', '', '', 0, MAX_STEPS, '', true);
    holding = false;
  });

  const push = (s: Snapshot) => {
    if (s.running) {
      holding = false;
      if (!wasRunning) void ensureNotificationPermission();
      wasRunning = true;
      const steps = s.steps.filter((x) => x.kind === 'tool').length;
      const last = s.steps.length ? s.steps[s.steps.length - 1].label : '';
      const mode = s.approval ? 'approval' : 'run';
      const title = s.approval ? 'Wartet auf dich' : s.label;
      const text = s.approval ? s.approval.title : last;
      const chip = s.approval ? 'Frage' : steps > 0 ? `${steps}` : '…';
      const key = `${mode}|${title}|${text}|${steps}`;
      if (key === lastKey) return;
      lastKey = key;
      native.update(mode, title, text, steps, MAX_STEPS, chip, false);
    } else if (wasRunning) {
      wasRunning = false;
      lastKey = '';
      const gs = glyphState();
      if ((gs === 'talk' || gs === 'done') && s.state !== 'error') {
        holding = true;
        native.update('hold', gs === 'talk' ? 'Der Agent will mit dir sprechen' : 'Ergebnis liegt bereit', 'Glyph leuchtet, bis du auf Okay tippst.', 0, MAX_STEPS, '', false);
        return;
      }
      const inApp = AppState.currentState === 'active';
      const bad = s.state === 'error';
      native.update('finish', bad ? 'Agent: Fehler' : s.state === 'stopped' ? 'Agent gestoppt' : 'Agent ist fertig', 'Tippe, um das Ergebnis zu sehen.', 0, MAX_STEPS, '', inApp);
    }
  };
  subscribeStatus(() => push(status.get()));
}
