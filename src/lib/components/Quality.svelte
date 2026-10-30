<script lang="ts">
  import type { QualityReport, Severity } from '../core/types';
  import { LIMITS } from '../core/quality';
  import { store } from '../state.svelte';
  import ScoreBadge from './ScoreBadge.svelte';

  let { quality }: { quality: QualityReport } = $props();

  const labels: Record<Severity, string> = {
    error: 'Erreurs (bloquent l’export)',
    warning: 'Avertissements',
    info: 'Suggestions',
  };
  const titleOf = (id?: string) => store.project.rules.find((r) => r.id === id)?.title;
</script>

<div class="head card">
  <ScoreBadge score={quality.score} size="lg" />
  <div>
    <p>Contrôle de ce qui sera envoyé à Claude. Barème : erreur −15, avertissement −5, suggestion −1.</p>
    <p class="muted">
      Repères : racine &lt; {LIMITS.rootWarn} lignes (max {LIMITS.rootError}) · ≈ {LIMITS.alwaysInstructions} instructions
      toujours chargées · règles vérifiables, pas de secret, pas de style qu'un linter gère. Actuellement
      <b>{quality.alwaysLoadedInstructions}</b> instructions toujours chargées.
    </p>
  </div>
</div>

{#each ['error', 'warning', 'info'] as const as sev}
  {@const list = quality.issues.filter((i) => i.severity === sev)}
  {#if list.length}
    <h3 class="sev-{sev}">{labels[sev]} · {list.length}</h3>
    <ul>
      {#each list as i}
        <li class="card">
          <div><b class="sev-{sev}">{i.message}</b></div>
          <div class="muted">→ {i.fix}</div>
          <div class="meta">
            <code>{i.code}</code>
            {#if i.file}<code>{i.file}</code>{/if}
            {#if i.ruleId}<a href="/rules?rule={i.ruleId}">règle « {titleOf(i.ruleId)} »</a>{/if}
          </div>
        </li>
      {/each}
    </ul>
  {/if}
{/each}
{#if !quality.issues.length}<p class="card">Rien à signaler.</p>{/if}

<style>
  .head {
    display: flex;
    gap: 20px;
    align-items: center;
    flex-wrap: wrap;
  }
  .head > div {
    flex: 1;
    min-width: 240px;
  }
  .head p {
    margin: 4px 0;
  }
  h3 {
    margin: 24px 0 8px;
    font-size: 15px;
  }
  ul {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: 8px;
  }
  li {
    display: grid;
    gap: 4px;
    padding: 12px 14px;
  }
  .meta {
    display: flex;
    gap: 8px;
    align-items: center;
    flex-wrap: wrap;
    font-size: 12px;
  }
  .meta a {
    color: var(--accent);
  }
</style>
