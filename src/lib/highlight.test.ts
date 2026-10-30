import { describe, expect, it } from 'vitest';
import { highlight } from './highlight';

const classes = (path: string, content: string) =>
  highlight(path, content).map((l) => [l.cls, l.parts.filter((p) => p.cls).map((p) => `${p.cls}:${p.text}`)]);

describe('highlight', () => {
  it('colors YAML frontmatter keys, list items and strings', () => {
    expect(classes('a.md', '---\npaths:\n  - "src/**"\nname: x\n---\n')).toEqual([
      ['fm', ['mark:---']],
      ['fm', ['key:paths', 'mark::']],
      ['fm', ['mark:- ', 'string:"src/**"']],
      ['fm', ['key:name', 'mark::', 'value:x']],
      ['fm', ['mark:---']],
    ]);
  });

  it('colors headings, bullets, inline code, bold and imports', () => {
    expect(classes('CLAUDE.md', '# Titre\n- Run `pnpm test` **now**\n@AGENTS.md')).toEqual([
      ['heading', ['mark:# ']],
      [undefined, ['mark:-', 'code:`pnpm test`', 'strong:**now**']],
      [undefined, ['import:@AGENTS.md']],
    ]);
  });

  it('keeps fenced code blocks raw', () => {
    expect(classes('a.md', '```sh\n# pas un titre\n```\n# Titre')).toEqual([
      ['block', ['mark:```sh']],
      ['block', []],
      ['block', ['mark:```']],
      ['heading', ['mark:# ']],
    ]);
  });

  it('leaves non-Markdown files plain and preserves text', () => {
    const json = '{\n  "a": 1\n}\n';
    expect(classes('settings.json', json)).toEqual([
      [undefined, []],
      [undefined, []],
      [undefined, []],
    ]);
    const md = '---\nname: x\n---\n# T `c`\n';
    expect(
      highlight('a.md', md)
        .map((l) => l.parts.map((p) => p.text).join(''))
        .join('\n') + '\n',
    ).toBe(md);
  });
});
