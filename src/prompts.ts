export type Suggestion = { key: string; title: string; hint: string; prompt: string; photo?: boolean };

export const BRIEFING_PROMPT =
  'Mach mir ein Morgenbriefing für heute: Termine, Stundenplan, fällige und überfällige Aufgaben, Klausuren in den nächsten 14 Tagen und das Wetter. Kurz und übersichtlich.';

export const PLAN_B_PROMPT =
  'Ich schaffe heute nichts. Streiche meinen Tag auf das Nötigste zusammen und bau einen Plan B, ohne Druck.';

export const SUGGESTIONS: Suggestion[] = [
  { key: 'briefing', title: 'Morgenbriefing', hint: 'Termine, Aufgaben, Wetter', prompt: BRIEFING_PROMPT },
  {
    key: 'plan',
    title: 'Tag planen',
    hint: 'Mit Pausen und Puffern',
    prompt:
      'Plane meinen restlichen Tag: lies Kalender, Stundenplan und Aufgaben, baue Pausen und Essen ein und schlage vor, wann ich was erledige. Trage noch nichts ein.',
  },
  { key: 'planb', title: 'Plan B', hint: 'Heute geht nichts', prompt: PLAN_B_PROMPT },
  {
    key: 'learn',
    title: 'Lernplan',
    hint: 'Für die nächste Klausur',
    prompt:
      'Ich möchte einen Lernplan für eine Klausur. Frage mich nach Fach, Termin und Stoff und verteile die Lerneinheiten dann auf meine freien Zeiten.',
  },
  { key: 'photo', title: 'Foto eintragen', hint: 'Arbeitsblatt, Stundenplan, Tafel', prompt: '', photo: true },
  {
    key: 'cards',
    title: 'Karteikarten',
    hint: 'Aus deinem Stoff',
    prompt: 'Ich möchte Karteikarten zum Lernen. Frage mich, zu welchem Thema, und erstelle sie dann.',
  },
];
