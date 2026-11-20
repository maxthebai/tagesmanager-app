// Open-Meteo: kostenlos, ohne Key. Gesendet wird nur der Ortsname.
const CODES: Record<number, string> = {
  0: 'klar',
  1: 'überwiegend klar',
  2: 'teils bewölkt',
  3: 'bedeckt',
  45: 'Nebel',
  48: 'Reifnebel',
  51: 'leichter Nieselregen',
  53: 'Nieselregen',
  55: 'starker Nieselregen',
  61: 'leichter Regen',
  63: 'Regen',
  65: 'starker Regen',
  71: 'leichter Schneefall',
  73: 'Schneefall',
  75: 'starker Schneefall',
  77: 'Schneegriesel',
  80: 'leichte Schauer',
  81: 'Schauer',
  82: 'heftige Schauer',
  85: 'Schneeschauer',
  86: 'starke Schneeschauer',
  95: 'Gewitter',
  96: 'Gewitter mit Hagel',
  99: 'schweres Gewitter mit Hagel',
};

export type WeatherDay = { date: string; min: number; max: number; rainPct: number; text: string };

export async function getWeather(city: string): Promise<{ place: string; days: WeatherDay[] }> {
  const g = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=de&format=json`,
  );
  if (!g.ok) throw new Error('Ortssuche fehlgeschlagen.');
  const gj = (await g.json()) as { results?: { name: string; latitude: number; longitude: number }[] };
  const p = gj.results?.[0];
  if (!p) throw new Error(`Ort „${city}“ nicht gefunden.`);
  const w = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${p.latitude}&longitude=${p.longitude}` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=4`,
  );
  if (!w.ok) throw new Error('Wetterabruf fehlgeschlagen.');
  const wj = (await w.json()) as {
    daily: {
      time: string[];
      weather_code: number[];
      temperature_2m_max: number[];
      temperature_2m_min: number[];
      precipitation_probability_max: number[];
    };
  };
  const d = wj.daily;
  return {
    place: p.name,
    days: d.time.map((date, i) => ({
      date,
      min: Math.round(d.temperature_2m_min[i]),
      max: Math.round(d.temperature_2m_max[i]),
      rainPct: d.precipitation_probability_max[i] ?? 0,
      text: CODES[d.weather_code[i]] ?? 'wechselhaft',
    })),
  };
}
