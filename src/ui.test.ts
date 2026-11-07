import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import Analysis from './lib/components/Analysis.svelte';
import Generator from './lib/components/Generator.svelte';
import Home from './lib/components/Home.svelte';
import Practices from './lib/components/Practices.svelte';
import Glossary, { CHECKS } from './lib/components/Glossary.svelte';
import { readFileSync } from 'node:fs';
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
    expect(render(Analysis).body).toContain('Dépôts');
    expect(render(Generator).body).toContain('Que veux-tu faire');
    expect(render(Guide).body).toContain('Doit-il arriver à 100 %');
    expect(render(Home).body).toContain('Que veux-tu faire');
    expect(render(Practices).body).toContain('Ce qui fait une bonne règle');
    expect(render(Practices).body).toContain('Où va chaque fichier');
    expect(render(Glossary).body).toContain('Critères de la note');
    const empty = { score: 100, grade: 'A' as const, criteria: [], memoryIssues: [], memoryFiles: [] };
    expect(
      render(Proposals, { props: { root: '/tmp', result: empty, sent: [], onadd: () => {}, onsaved: () => {} } }).body,
    ).toContain('Pas de proposition');
  });
});

describe('glossaire', () => {
  it('liste chaque code de contrôle du cœur', () => {
    const src = ['quality', 'analyze'].map((m) => readFileSync(`src/lib/core/${m}.ts`, 'utf8')).join('\n');
    const codes = new Set([...src.matchAll(/code: '([a-z-]+)'/g)].map((m) => m[1]));
    expect([...codes].sort()).toEqual(CHECKS.map((c) => c.code).sort());
  });
});
