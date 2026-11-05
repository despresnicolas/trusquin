<script lang="ts">
  import { CATEGORY_LABELS } from '../core/placement';
  import { KIND_HINTS, KIND_LABELS, SCOPE_HINTS, SCOPE_LABELS } from '../core/presets';
  import type { GeneratedFile, HookEvent, Issue, Rule } from '../core/types';
  import Hint from './Hint.svelte';

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
    <label class="grow"
      >Titre <Hint
        text="Sert de titre de section (## Titre) dans le fichier généré. Court et parlant : Claude s'en sert pour situer la règle."
      /><input bind:value={rule.title} placeholder="Ex. Endpoints API" /></label
    >
    <label
      >Type <Hint text={KIND_HINTS[rule.kind]} />
      <select bind:value={rule.kind}>
        {#each Object.entries(KIND_LABELS) as [value, label]}<option {value}>{label}</option>{/each}
      </select>
    </label>
    <label class="toggle"
      ><input type="checkbox" bind:checked={rule.enabled} /> Actif
      <Hint
        text="Décoché : la règle reste dans le projet mais n'est pas exportée. Utile pour tester sans supprimer."
      /></label
    >
  </div>

  {#if rule.kind === 'rule'}
    <div class="row">
      <label class="grow"
        >S'applique à <Hint text={SCOPE_HINTS[rule.scope]} />
        <select bind:value={rule.scope}>
          {#each Object.entries(SCOPE_LABELS) as [value, label]}<option {value}>{label}</option>{/each}
        </select>
      </label>
      <label
        >Catégorie <Hint
          text="Regroupe les règles en sections, et nomme le fichier .claude/rules/<catégorie>.md pour la portée « Thème »."
        />
        <select bind:value={rule.category}>
          {#each Object.entries(CATEGORY_LABELS) as [value, label]}<option {value}>{label}</option>{/each}
        </select>
      </label>
      {#if rule.scope === 'project'}
        <label class="toggle"
          ><input type="checkbox" bind:checked={rule.critical} /> Critique
          <Hint
            text="Pour les consignes les plus souvent oubliées (tests avant de rendre la main, format des commits) : placée en tête du CLAUDE.md et rappelée à la fin, là où Claude y prête le plus attention. 3 au maximum."
          /></label
        >
      {/if}
    </div>
    {#if rule.scope === 'path'}
      <label
        >Globs (un par ligne) <Hint
          text="Motifs de chemins relatifs à la racine : src/api/**/*.ts, **/*.test.ts. La règle n'est chargée que si Claude lit ou modifie un fichier qui correspond."
        />
        <textarea
          rows="2"
          value={rule.targets.join('\n')}
          oninput={(e) => setTargets(e.currentTarget.value)}
          placeholder="src/api/**/*.ts"></textarea>
      </label>
    {:else if rule.scope === 'directory'}
      <label
        >Dossier <Hint text="Chemin du sous-dossier (ex. apps/api) : la règle va dans apps/api/CLAUDE.md." />
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
      <label
        >Nom (kebab-case) <Hint
          text="Identifiant du fichier et de l'appel (/release, agent test-runner). Minuscules et tirets."
        /><input bind:value={rule.name} placeholder="release" /></label
      >
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
      >Description — quoi ET quand (c'est ce que Claude lit pour décider) <Hint
        text={rule.kind === 'skill'
          ? "Seule la description est lue tant que la skill ne sert pas. Dire ce qu'elle produit ET quand (« Use when… »), avec les mots qu'emploierait l'utilisateur même sans citer la skill. 1024 caractères max."
          : "Ex. « Prépare une release : changelog, version, tag. Use when the user asks to release. » Sans le « quand », Claude ne saura pas l'utiliser au bon moment."}
      />
      <textarea rows="2" bind:value={rule.description}></textarea>
    </label>
    {#if rule.kind !== 'skill'}
      <label
        >Outils autorisés <Hint
          text="Limite ce que l'élément peut faire. Vide = outils par défaut. Restreindre (Read, Grep) rend un agent de revue plus sûr."
        /><input bind:value={rule.tools} placeholder="Read, Grep, Bash(git diff:*)" /></label
      >
    {/if}
  {/if}

  {#if rule.kind === 'hook'}
    <div class="row">
      <label
        >Événement <Hint
          text="PostToolUse : après une action (formatter). PreToolUse : avant, peut bloquer (exit 2). Stop : quand Claude rend la main (lancer les tests)."
        />
        <select bind:value={rule.event}
          >{#each EVENTS as e}<option>{e}</option>{/each}</select
        >
      </label>
      <label class="grow"
        >Matcher (outils) <Hint
          text="Outils concernés, séparés par | : Edit|Write pour les modifications de fichiers. Vide = tous."
        /><input bind:value={rule.matcher} placeholder="Edit|Write" /></label
      >
    </div>
    <label
      >Commande (reçoit le JSON de l'événement sur stdin ; exit 2 = bloquer)
      <textarea rows="3" bind:value={rule.command}></textarea>
    </label>
  {:else}
    <label
      >{rule.kind === 'rule' ? 'Instructions (une par ligne, concrètes et vérifiables)' : 'Contenu (markdown)'}
      <Hint
        text={rule.kind === 'rule'
          ? 'Une instruction par ligne, vérifiable : « pnpm test avant de rendre la main » plutôt que « bien tester ». Éviter de recopier du code ou ce que le linter fait déjà.'
          : rule.kind === 'skill'
            ? 'Principe en une ligne, erreurs fréquentes avec leur raison, étapes numérotées, vérification en dernier. Moins de 500 lignes : le détail va dans des fichiers de référence que Claude ouvre quand une étape le demande.'
            : "Les étapes à suivre, en markdown. Rester concis : ce contenu est chargé quand l'élément sert."}
      />
      <textarea rows="9" bind:value={rule.body}></textarea>
    </label>
  {/if}

  <div class="dest">
    <span class="muted"
      >Destination <Hint
        text="Fichier où la règle sera écrite, déduit du type et de la portée. Survoler le chemin pour savoir quand il est chargé."
      />:</span
    >
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
