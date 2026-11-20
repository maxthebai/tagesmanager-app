import { Text, View } from 'react-native';
import { Block, Inline, parseBlocks } from '../lib/markdown';
import { useTheme } from '../theme';

export function Markdown({ text }: { text: string }) {
  const t = useTheme();
  const blocks = parseBlocks(text);

  const inline = (parts: Inline[], extra?: object) =>
    parts.map((p, i) => (
      <Text
        key={i}
        style={[
          p.bold ? { fontWeight: '700' } : null,
          p.code ? { fontFamily: 'monospace', backgroundColor: t.surface2, fontSize: 14 } : null,
          extra,
        ]}
      >
        {p.text}
      </Text>
    ));

  const render = (b: Block, i: number) => {
    switch (b.type) {
      case 'space':
        return <View key={i} style={{ height: 8 }} />;
      case 'h':
        return (
          <Text key={i} style={{ color: t.text, fontSize: b.level === 1 ? 22 : 18, fontWeight: '600', marginTop: 4, marginBottom: 2 }}>
            {inline(b.inline)}
          </Text>
        );
      case 'li':
        return (
          <View key={i} style={{ flexDirection: 'row', paddingLeft: 4, marginVertical: 1 }}>
            <Text style={{ color: t.sub, width: 22, fontSize: 16, lineHeight: 24 }}>{b.marker}</Text>
            <Text style={{ color: t.text, fontSize: 16, lineHeight: 24, flex: 1 }}>{inline(b.inline)}</Text>
          </View>
        );
      default:
        return (
          <Text key={i} style={{ color: t.text, fontSize: 16, lineHeight: 24 }}>
            {inline(b.inline)}
          </Text>
        );
    }
  };

  return <View>{blocks.map(render)}</View>;
}
