import { useSyncExternalStore } from 'react';

export type AgentState =
  | 'idle'
  | 'thinking'
  | 'reading_calendar'
  | 'writing_calendar'
  | 'tasks'
  | 'waiting_approval'
  | 'stopped'
  | 'error';

export type StepKind = 'info' | 'tool' | 'result' | 'approval' | 'error';
export type Step = { id: number; ts: number; kind: StepKind; label: string; detail?: string };
export type ApprovalRequest = { id: number; title: string; detail: string };

export type Snapshot = {
  state: AgentState;
  label: string;
  running: boolean;
  steps: Step[];
  approval: ApprovalRequest | null;
};

let snap: Snapshot = { state: 'idle', label: 'Bereit', running: false, steps: [], approval: null };
const listeners = new Set<() => void>();
let stepCounter = 1;
let approvalCounter = 1;
let pendingResolve: ((ok: boolean) => void) | null = null;

function emit(patch: Partial<Snapshot>): void {
  snap = { ...snap, ...patch };
  listeners.forEach((l) => l());
}

export const status = {
  get: (): Snapshot => snap,
  startRun(): void {
    emit({ running: true, steps: [], state: 'thinking', label: 'Denkt nach …', approval: null });
  },
  set(state: AgentState, label: string): void {
    emit({ state, label });
  },
  step(kind: StepKind, label: string, detail?: string): void {
    emit({ steps: [...snap.steps, { id: stepCounter++, ts: Date.now(), kind, label, detail }] });
  },
  endRun(state: AgentState, label: string): void {
    emit({ running: false, state, label, approval: null });
  },
  /** Fragt den Nutzer und wartet auf Ja/Nein. */
  askApproval(title: string, detail: string): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      pendingResolve = resolve;
      emit({
        state: 'waiting_approval',
        label: `Wartet auf deine Bestätigung: ${title}`,
        approval: { id: approvalCounter++, title, detail },
      });
    });
  },
  answerApproval(ok: boolean): void {
    const r = pendingResolve;
    pendingResolve = null;
    emit({ approval: null, state: 'thinking', label: ok ? 'Führt aus …' : 'Abgelehnt, überlegt weiter …' });
    if (r) r(ok);
  },
};

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export const subscribeStatus = subscribe;

export function useStatus(): Snapshot {
  return useSyncExternalStore(subscribe, status.get, status.get);
}
