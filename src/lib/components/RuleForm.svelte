<script lang="ts">
  import { CATEGORY_LABELS } from '../core/placement';
  import { KIND_LABELS, SCOPE_LABELS } from '../core/presets';
  import type { GeneratedFile, HookEvent, Issue, Rule } from '../core/types';

  let { rule, files, issues, onremove }: { rule: Rule; files: GeneratedFile[]; issues: Issue[]; onremove: () => void } =
    $props();

  const EVENTS: HookEvent[] = [
    'PostToolUse',
    'PreToolUse',
    'UserPromptSubmit',
    'Stop',
    'SubagentStop',
    'SessionStart',
    'Notification',
    'PreCompact',
  ];
  const destinations = $derived(files.filter((f) => f.sources.includes(rule.id)));
  const named = $derived(rule.kind === 'command' || rule.kind === 'skill' || rule.kind === 'agent');

  function setTargets(value: string) {
    rule.targets = value
      .split(/[\n,]/)
      .map((t) => t.trim())
      .filter(Boolean);
  }
</script>

<div class="form card">
  <div class="row">
    <label class="grow">Titre<input bind:value={rule.title} placeholder="Ex. Endpoints API" /></label>
    <label
      >Type
      <select bind:value={rule.kind}>
        {#each Object.entries(KIND_LABELS) as [value, label]}<option {value}>{label}</option>{/each}
      </select>
    </label>
    <label class="toggle"><input type="checkbox" bind:checked={rule.enabled} /> Actif</label>
  </div>

  {#if rule.kind === 'rule'}
    <div class="row">
      <label class="grow"
        >S'applique à
        <select bind:value={rule.scope}>
          {#each Object.entries(SCOPE_LABELS) as [value, label]}<option {value}>{label}</option>{/each}
        </select>
      </label>
      <label
        >Catégorie
        <select bind:value={rule.category}>
          {#each Object.entries(CATEGORY_LABELS) as [value, label]}<option {value}>{label}</option>{/each}
        </select>
      </label>
    </div>
    {#if rule.scope === 'path'}
      <label
        >Globs (un par ligne)
        <textarea
          rows="2"
          value={rule.targets.join('\n')}
          oninput={(e) => setTargets(e.currentTarget.value)}
          placeholder="src/api/**/*.ts"></textarea>
      </label>
    {:else if rule.scope === 'directory'}
      <label
        >Dossier
        <input
          value={rule.targets[0] ?? ''}
          oninput={(e) => (rule.targets = [e.currentTarget.value.trim()])}
          placeholder="apps/api"
        />
      </label>
    {/if}
  {/if}

  {#if named}
    <div class="row">
      <label>Nom (kebab-case)<input bind:value={rule.name} placeholder="release" /></label>
      {#if rule.kind === 'agent'}
        <label
          >Modèle
          <select bind:value={rule.model}>
            <option value={undefined}>par défaut</option><option>inherit</option><option>sonnet</option><option
              >opus</option
            ><option>haiku</option>
          </select>
        </label>
      {/if}
      {#if rule.kind === 'command'}
        <label>Argument hint<input bind:value={rule.argumentHint} placeholder="[fichier]" /></label>
      {/if}
    </div>
    <label
      >Description — quoi ET quand (c'est ce que Claude lit pour décider)
      <textarea rows="2" bind:value={rule.description}></textarea>
    </label>
    {#if rule.kind !== 'skill'}
      <label>Outils autorisés<input bind:value={rule.tools} placeholder="Read, Grep, Bash(git diff:*)" /></label>
    {/if}
  {/if}

  {#if rule.kind === 'hook'}
    <div class="row">
      <label
        >Événement
        <select bind:value={rule.event}
          >{#each EVENTS as e}<option>{e}</option>{/each}</select
        >
      </label>
      <label class="grow">Matcher (outils)<input bind:value={rule.matcher} placeholder="Edit|Write" /></label>
    </div>
    <label
      >Commande (reçoit le JSON de l'événement sur stdin ; exit 2 = bloquer)
      <textarea rows="3" bind:value={rule.command}></textarea>
    </label>
  {:else}
    <label
      >{rule.kind === 'rule' ? 'Instructions (une par ligne, concrètes et vérifiables)' : 'Contenu (markdown)'}
      <textarea rows="9" bind:value={rule.body}></textarea>
    </label>
  {/if}

  <div class="dest">
    <span class="muted">Destination :</span>
    {#each destinations as f}
      <code title={f.explanation}>{f.path}</code>
    {:else}
      <span class="muted">{rule.enabled ? '—' : 'désactivé, non exporté'}</span>
    {/each}
  </div>

  {#if issues.length}
    <ul class="issues">
      {#each issues as i}
        <li class="sev-{i.severity}">{i.message} <span class="muted">→ {i.fix}</span></li>
      {/each}
    </ul>
  {/if}

  <div><button class="ghost sev-error" onclick={onremove}>Supprimer</button></div>
</div>

<style>
  .form {
    display: grid;
    gap: 12px;
  }
  .row {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    align-items: end;
  }
  .row > label {
    min-width: 140px;
  }
  .grow {
    flex: 1;
  }
  .toggle {
    display: flex;
    align-items: center;
    gap: 6px;
    padding-bottom: 6px;
  }
  .toggle input {
    width: auto;
  }
  .dest {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    align-items: center;
  }
  .dest code {
    background: var(--accent-soft);
    color: var(--accent);
    padding: 2px 8px;
    border-radius: 4px;
  }
  .issues {
    margin: 0;
    padding-left: 18px;
    font-size: 13px;
  }
</style>
