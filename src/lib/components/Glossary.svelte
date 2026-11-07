<script lang="ts" module>
  import { LIMITS } from '#lib/core/quality.ts';

  /** Contrôles qualité (export du générateur) et problèmes des fichiers mémoire (analyse). */
  export const CHECKS: { code: string; level: 'Erreur' | 'Avertissement' | 'Info'; text: string }[] = [
    { code: 'root-too-long', level: 'Erreur', text: `CLAUDE.md racine de plus de ${LIMITS.rootError} lignes.` },
    { code: 'root-long', level: 'Avertissement', text: `CLAUDE.md racine de plus de ${LIMITS.rootWarn} lignes.` },
    { code: 'file-long', level: 'Avertissement', text: `Fichier de règles de plus de ${LIMITS.otherWarn} lignes.` },
    {
      code: 'vague',
      level: 'Avertissement',
      text: 'Formulation vague (« de qualité », « propre »…) au lieu d’une règle vérifiable.',
    },
    { code: 'secret', level: 'Erreur', text: 'Secret probable (clé, jeton, mot de passe) dans un fichier.' },
    { code: 'negative-phrasing', level: 'Info', text: 'Interdiction sans alternative : dire quoi faire à la place.' },
    { code: 'code-copy', level: 'Info', text: 'Long bloc de code copié : pointer vers le fichier plutôt.' },
    {
      code: 'no-trigger',
      level: 'Avertissement',
      text: 'Description de skill ou d’agent sans situation déclenchante.',
    },
    { code: 'long-skill', level: 'Avertissement', text: `SKILL.md de plus de ${LIMITS.skillLines} lignes.` },
    { code: 'no-workflow', level: 'Info', text: 'Skill sans étapes numérotées.' },
    { code: 'no-verification', level: 'Info', text: 'Skill sans étape de vérification.' },
    { code: 'empty', level: 'Erreur', text: 'Élément vide.' },
    { code: 'no-paths', level: 'Erreur', text: 'Portée « chemins » sans glob.' },
    { code: 'bad-glob', level: 'Avertissement', text: 'Glob mal formé : relatif à la racine, sans espace.' },
    { code: 'no-dir', level: 'Erreur', text: 'Portée « dossier » sans dossier.' },
    { code: 'dir-glob', level: 'Erreur', text: 'Un glob donné à la place d’un dossier.' },
    { code: 'heavy-rule', level: 'Info', text: 'Longue règle chargée à chaque session : la limiter à des chemins.' },
    { code: 'linter-job', level: 'Info', text: 'Règle de formatage : c’est le travail d’un linter ou d’un hook.' },
    {
      code: 'command-not-exact',
      level: 'Avertissement',
      text: 'Règle de commandes sans commande exacte entre backticks.',
    },
    { code: 'bad-name', level: 'Erreur', text: 'Nom de commande, skill ou agent invalide.' },
    { code: 'no-description', level: 'Erreur', text: 'Commande, skill ou agent sans description.' },
    {
      code: 'short-description',
      level: 'Avertissement',
      text: 'Description trop courte pour déclencher au bon moment.',
    },
    { code: 'long-description', level: 'Erreur', text: 'Description de plus de 1024 caractères.' },
    { code: 'hook-no-command', level: 'Erreur', text: 'Hook sans commande.' },
    { code: 'hook-event', level: 'Erreur', text: 'Hook sur un événement inconnu.' },
    { code: 'hook-matcher', level: 'Info', text: 'Hook lancé après chaque outil, sans filtre.' },
    { code: 'duplicate', level: 'Avertissement', text: 'Même ligne dans deux règles.' },
    { code: 'contradiction', level: 'Avertissement', text: 'Une commande à la fois demandée et interdite.' },
    { code: 'package-manager', level: 'Avertissement', text: 'Plusieurs gestionnaires de paquets cités.' },
    { code: 'no-rules', level: 'Erreur', text: 'Aucune règle active : rien à envoyer à Claude.' },
    {
      code: 'no-commands',
      level: 'Avertissement',
      text: 'Aucune commande build, test ou lint dans la mémoire racine.',
    },
    { code: 'no-context', level: 'Info', text: 'Description ou stack du projet manquante.' },
    { code: 'no-hooks', level: 'Info', text: 'Aucun hook : format et lint reposent sur le modèle.' },
    { code: 'no-deny', level: 'Info', text: 'Aucune permission refusée.' },
    {
      code: 'too-many-critical',
      level: 'Avertissement',
      text: `Plus de ${LIMITS.criticalRules} règles critiques : plus rien ne ressort.`,
    },
    { code: 'local-gitignore', level: 'Info', text: 'CLAUDE.local.md doit rester hors du dépôt (.gitignore).' },
    { code: 'collision', level: 'Erreur', text: 'Plusieurs éléments génèrent le même fichier.' },
    {
      code: 'instruction-budget',
      level: 'Avertissement',
      text: `Plus de ${LIMITS.alwaysInstructions} instructions chargées à chaque session.`,
    },
    { code: 'broken-import', level: 'Erreur', text: 'Import `@fichier` vers un fichier absent.' },
    {
      code: 'agents-not-imported',
      level: 'Avertissement',
      text: 'AGENTS.md présent mais pas importé depuis CLAUDE.md.',
    },
    { code: 'settings-json', level: 'Erreur', text: 'settings.json illisible (JSON invalide).' },
  ];
</script>

<script lang="ts">
  import { analyzeRepo } from '#lib/core/analyze.ts';

  // Un dépôt vide passe par tous les critères : la liste reste celle que la notation utilise vraiment.
  const CRITERIA = analyzeRepo({ paths: [], contents: {} }).criteria;
  const GROUPS = [
    { id: 'claude', label: 'Préparation pour Claude Code' },
    { id: 'practices', label: 'Bonnes pratiques du repo' },
  ] as const;
</script>

<div class="glossary">
  <header>
    <h1>Référentiel</h1>
    <p class="lead">Toutes les règles que Trusquin applique pour noter un dépôt et contrôler les fichiers.</p>
  </header>

  <section>
    <h2>Contrôles des fichiers</h2>
    <p class="muted">
      Vérifiés sur l’export du générateur et sur les fichiers mémoire d’un dépôt. Une erreur bloque l’export.
    </p>
    {#each ['Info', 'Avertissement', 'Erreur'] as level (level)}
      {@const list = CHECKS.filter((c) => c.level === level)}
      <h3 class={level}>{level === 'Info' ? 'Infos' : `${level}s`} <span class="muted">{list.length}</span></h3>
      <table>
        <tbody>
          {#each list as c (c.code)}
            <tr>
              <td class="code"><code>{c.code}</code></td>
              <td>{c.text}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/each}
  </section>

  <section>
    <h2>Critères de la note d’un dépôt</h2>
    <p class="muted">Chaque critère rapporte ses points s’il est rempli, la moitié s’il l’est en partie.</p>
    {#each GROUPS as g (g.id)}
      {@const list = CRITERIA.filter((c) => c.group === g.id)}
      <h3>{g.label} <span class="muted">{list.reduce((s, c) => s + c.max, 0)} pts</span></h3>
      <table>
        <tbody>
          {#each list as c (c.id)}
            <tr>
              <td>{c.label}</td>
              <td class="pts">{c.max} pts</td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/each}
  </section>
</div>

<style>
  .glossary {
    display: grid;
    gap: 40px;
    line-height: 1.55;
  }
  h1 {
    margin: 0 0 8px;
    font-size: 28px;
  }
  .lead {
    margin: 0;
    font-size: 16px;
    color: var(--muted);
  }
  h2 {
    margin: 0 0 12px;
    font-size: 20px;
  }
  h3 {
    margin: 20px 0 8px;
    font-size: 15px;
  }
  section > p {
    margin: 0 0 8px;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
  }
  td {
    padding: 6px 12px;
    border-bottom: 1px solid var(--border);
    vertical-align: top;
  }
  .pts {
    width: 80px;
    text-align: right;
    font-family: var(--mono);
  }
  .code {
    width: 220px;
    white-space: nowrap;
  }
  .Erreur {
    color: var(--err);
  }
  .Avertissement {
    color: var(--warn);
  }
  .Info {
    color: var(--info);
  }
</style>
