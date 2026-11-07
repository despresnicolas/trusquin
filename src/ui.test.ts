import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import Analysis from './lib/components/Analysis.svelte';
import Generator from './lib/components/Generator.svelte';
import Home from './lib/components/Home.svelte';
import Guide from './lib/components/Guide.svelte';
import Preview from './lib/components/Preview.svelte';
import ProjectBar from './lib/components/ProjectBar.svelte';
import ProjectForm from './lib/components/ProjectForm.svelte';
import Proposals from './lib/components/Proposals.svelte';
import Quality from './lib/components/Quality.svelte';
import RulesEditor from './lib/components/RulesEditor.svelte';
import { store } from './lib/state.svelte';

describe('ui smoke', () => {
  it('renders every page component without throwing', () => {
    expect(render(ProjectBar).body).toContain('Nouveau projet');
    expect(render(ProjectForm).body).toContain('Nom du projet');
    expect(render(RulesEditor).body).toContain('+ Règle vide');
    expect(render(Preview, { props: { files: store.files, quality: store.quality } }).body).toContain('CLAUDE.md');
    expect(render(Quality, { props: { quality: store.quality } }).body).toContain('/100');
    expect(render(Analysis).body).toContain('Analyser un projet');
    expect(render(Generator).body).toContain('Que veux-tu faire');
    expect(render(Guide).body).toContain('Doit-il arriver à 100 %');
    expect(render(Home).body).toContain('Ce qui fait une bonne règle');
    const empty = { score: 100, grade: 'A' as const, criteria: [], memoryIssues: [], memoryFiles: [] };
    expect(
      render(Proposals, { props: { root: '/tmp', result: empty, sent: [], onadd: () => {}, onsaved: () => {} } }).body,
    ).toContain('Pas de proposition');
  });
});
