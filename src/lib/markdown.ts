// Sehr kleiner Markdown-Parser für Antworten des Agenten: Überschriften, Listen, fett, Code.

export type Inline = { text: string; bold?: boolean; code?: boolean };
export type Block =
  | { type: 'p'; inline: Inline[] }
  | { type: 'h'; level: number; inline: Inline[] }
  | { type: 'li'; marker: string; inline: Inline[] }
  | { type: 'space' };

export function parseInline(s: string): Inline[] {
  const out: Inline[] = [];
  const re = /(\*\*[^*\n]+\*\*|`[^`\n]+`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) {
    if (m.index > last) out.push({ text: s.slice(last, m.index) });
    const tok = m[0];
    if (tok.startsWith('**')) out.push({ text: tok.slice(2, -2), bold: true });
    else out.push({ text: tok.slice(1, -1), code: true });
    last = m.index + tok.length;
  }
  if (last < s.length) out.push({ text: s.slice(last) });
  return out.length ? out : [{ text: '' }];
}

export function parseBlocks(md: string): Block[] {
  const blocks: Block[] = [];
  for (const raw of md.replace(/\r/g, '').split('\n')) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      if (blocks.length && blocks[blocks.length - 1].type !== 'space') blocks.push({ type: 'space' });
      continue;
    }
    const h = /^(#{1,3})\s+(.*)$/.exec(line);
    if (h) {
      blocks.push({ type: 'h', level: h[1].length, inline: parseInline(h[2]) });
      continue;
    }
    const ul = /^\s*[-*•]\s+(.*)$/.exec(line);
    if (ul) {
      blocks.push({ type: 'li', marker: '•', inline: parseInline(ul[1]) });
      continue;
    }
    const ol = /^\s*(\d+)[.)]\s+(.*)$/.exec(line);
    if (ol) {
      blocks.push({ type: 'li', marker: `${ol[1]}.`, inline: parseInline(ol[2]) });
      continue;
    }
    blocks.push({ type: 'p', inline: parseInline(line.trim()) });
  }
  while (blocks.length && blocks[blocks.length - 1].type === 'space') blocks.pop();
  return blocks;
}
