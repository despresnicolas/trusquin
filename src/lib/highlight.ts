// Coloration ligne à ligne de l'aperçu : frontmatter YAML + Markdown, sans dépendance.
// Pur (pas de DOM) : l'UI pose une classe CSS par ligne et par segment.

export interface Part {
  text: string;
  cls?: string;
}

export interface Line {
  cls?: string;
  parts: Part[];
}

const INLINE = /(`[^`]+`|\*\*[^*]+\*\*|(?<=^|\s)@[\w./~-]+)/;

function inline(text: string): Part[] {
  return text
    .split(INLINE)
    .filter(Boolean)
    .map((t) => {
      if (t.startsWith('`')) return { text: t, cls: 'code' };
      if (t.startsWith('**')) return { text: t, cls: 'strong' };
      if (t.startsWith('@')) return { text: t, cls: 'import' };
      return { text: t };
    });
}

function yamlValue(text: string): Part[] {
  if (!text) return [];
  return [{ text, cls: /^(["']).*\1$/.test(text) ? 'string' : 'value' }];
}

function yaml(line: string): Line {
  let m = line.match(/^(\s*)(#.*)$/);
  if (m) return { cls: 'fm', parts: [{ text: m[1] }, { text: m[2], cls: 'comment' }] };
  m = line.match(/^(\s*)(- )(.*)$/);
  if (m) return { cls: 'fm', parts: [{ text: m[1] }, { text: m[2], cls: 'mark' }, ...yamlValue(m[3])] };
  m = line.match(/^(\s*)([\w.-]+)(:)(\s*)(.*)$/);
  if (m)
    return {
      cls: 'fm',
      parts: [
        { text: m[1] },
        { text: m[2], cls: 'key' },
        { text: m[3], cls: 'mark' },
        { text: m[4] },
        ...yamlValue(m[5]),
      ],
    };
  return { cls: 'fm', parts: [{ text: line }] };
}

function markdown(line: string): Line {
  let m = line.match(/^(#{1,6} )(.*)$/);
  if (m) return { cls: 'heading', parts: [{ text: m[1], cls: 'mark' }, ...inline(m[2])] };
  m = line.match(/^(\s*)([-*+]|\d+\.)( .*)$/);
  if (m) return { parts: [{ text: m[1] }, { text: m[2], cls: 'mark' }, ...inline(m[3])] };
  m = line.match(/^(>\s?)(.*)$/);
  if (m) return { cls: 'quote', parts: [{ text: m[1], cls: 'mark' }, ...inline(m[2])] };
  if (/^\s*<!--.*-->\s*$/.test(line)) return { parts: [{ text: line, cls: 'comment' }] };
  return { parts: inline(line) };
}

export function highlight(path: string, content: string): Line[] {
  const lines = content.replace(/\n$/, '').split('\n');
  if (!path.endsWith('.md')) return lines.map((text) => ({ parts: [{ text }] }));

  const out: Line[] = [];
  let inFrontmatter = lines[0] === '---';
  let fence: string | null = null;
  lines.forEach((line, i) => {
    if (inFrontmatter) {
      if (line === '---') {
        out.push({ cls: 'fm', parts: [{ text: line, cls: 'mark' }] });
        if (i > 0) inFrontmatter = false;
      } else {
        out.push(yaml(line));
      }
      return;
    }
    const delim = line.match(/^\s*(`{3,}|~{3,})/)?.[1];
    if (fence) {
      out.push({ cls: 'block', parts: [{ text: line, cls: line.trim().startsWith(fence) ? 'mark' : undefined }] });
      if (delim && delim.startsWith(fence)) fence = null;
      return;
    }
    if (delim) {
      fence = delim;
      out.push({ cls: 'block', parts: [{ text: line, cls: 'mark' }] });
      return;
    }
    out.push(markdown(line));
  });
  return out;
}
