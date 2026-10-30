import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import Analysis from './lib/components/Analysis.svelte';
import Guide from './lib/components/Guide.svelte';
import Preview from './lib/components/Preview.svelte';
import Quality from './lib/components/Quality.svelte';
import RulesEditor from './lib/components/RulesEditor.svelte';
import { store } from './lib/state.svelte';

describe('ui smoke', () => {
  it('renders every page component without throwing', () => {
    expect(render(RulesEditor).body).toContain('Nom du projet');
    expect(render(Preview, { props: { files: store.files, quality: store.quality } }).body).toContain('CLAUDE.md');
    expect(render(Quality, { props: { quality: store.quality } }).body).toContain('/100');
    expect(render(Analysis).body).toContain('Analyser un projet');
    expect(render(Guide).body).toContain('Où mettre quoi');
  });
});
