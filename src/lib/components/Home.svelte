<script lang="ts">
  /** Principes d'une bonne règle : contre-exemple, version réussie et contrôle qui le vérifie. */
  const PRINCIPLES = [
    {
      title: 'Vérifiable',
      why: 'Claude doit pouvoir savoir s’il l’a respectée.',
      bad: '« Écrire des tests »',
      good: '« Test à côté du code : foo.ts → foo.test.ts, lancé par pnpm test »',
      check: 'formulations vagues',
    },
    {
      title: 'Formulée en positif',
      why: 'Dire quoi faire : une interdiction seule laisse Claude deviner l’alternative.',
      bad: '« Pas de any »',
      good: '« TypeScript strict ; valeur inconnue typée unknown »',
      check: 'interdiction sans alternative',
    },
    {
      title: 'Non déductible',
      why: 'Test de suppression : sans cette ligne, Claude se tromperait-il ? Sinon, la retirer.',
      bad: '« Le projet utilise Git »',
      good: '« Branches : feat/<ticket>-<slug> »',
      check: '',
    },
    {
      title: 'Montrer un exemple',
      why: 'Un fichier exemplaire du dépôt vaut mieux qu’une description de style (few-shot).',
      bad: '« Composants propres et cohérents »',
      good: '« Nouveau composant : suivre src/components/Button.svelte »',
      check: 'fichiers exemplaires cités',
    },
    {
      title: 'Pointer plutôt que copier',
      why: 'Un extrait recopié vieillit ; le chemin reste juste.',
      bad: 'Un bloc de 20 lignes de code dans CLAUDE.md',
      good: '« Erreurs HTTP : httpError() de src/errors.ts:12 »',
      check: 'bloc de code copié',
    },
    {
      title: 'Confiée au hook si elle doit arriver à 100 %',
      why: 'Le texte dépend de la bonne volonté du modèle ; un hook s’exécute à chaque fois.',
      bad: '« Toujours formater avec Prettier »',
      good: 'Hook PostToolUse Edit|Write qui lance Prettier',
      check: 'travail de linter, aucun hook',
    },
    {
      title: 'Au bon endroit',
      why: 'Chargée seulement quand elle sert : la racine reste un index court.',
      bad: '40 lignes sur l’API dans le CLAUDE.md racine',
      good: '.claude/rules/api.md avec paths: apps/api/**',
      check: 'racine longue, règle lourde, budget d’instructions',
    },
    {
      title: 'Critique : ancrée en haut et en bas',
      why: 'Les 3 consignes les plus oubliées ouvrent le CLAUDE.md et sont rappelées à la fin.',
      bad: '« Lancer les tests » perdu au milieu de 80 lignes',
      good: 'Règle cochée « Critique » : en tête et dans « Rappels »',
      check: 'plus de 3 règles critiques',
    },
    {
      title: 'Sûre et cohérente',
      why: 'Les secrets restent dans .env ; une consigne n’a qu’une seule version.',
      bad: '« Clé API : sk-… » ; « pnpm » ici, « npm » ailleurs',
      good: '« Clé API dans .env : OPENAI_API_KEY » ; un seul gestionnaire',
      check: 'secret, contradiction, doublon',
    },
    {
      title: 'Vivante',
      why: 'Ajouter une règle quand Claude répète une erreur, retirer celles devenues inutiles.',
      bad: 'Un CLAUDE.md écrit une fois puis oublié',
      good: 'Ré-analyser le dépôt et suivre le score dans l’historique',
      check: '',
    },
  ];

  const tree = `repo/
├── CLAUDE.md                 # toujours chargé · index court (< 100 lignes)
├── CLAUDE.local.md           # perso, gitignoré
├── AGENTS.md                 # optionnel · multi-outils, importé par @AGENTS.md
├── apps/api/CLAUDE.md        # chargé quand Claude travaille dans apps/api
└── .claude/
    ├── settings.json         # permissions + hooks (déterministe)
    ├── settings.local.json   # perso, gitignoré
    ├── rules/
    │   ├── testing.md        # sans paths → toujours chargé
    │   └── api.md            # paths: ["apps/api/**"] → chargé à la demande
    ├── skills/release/SKILL.md   # description en contexte, corps à la demande
    ├── commands/review.md        # /review lancé à la main
    └── agents/test-runner.md     # sous-agent, contexte isolé
~/.claude/CLAUDE.md           # perso, tous projets`;
</script>

<h2>Bien configurer Claude Code</h2>
<p class="muted">
  Les principes d'une bonne règle, la boucle de travail avec Sauron et l'arborescence que le générateur produit. Pour
  démarrer : <a href="/analyze">analyser un dépôt</a> ou <a href="/generator?view=project">créer un projet</a>.
</p>

<div class="grid">
  <section class="card good-rules">
    <h3>Ce qui fait une bonne règle</h3>
    <p class="muted">Chaque principe avec un contre-exemple, sa version réussie et le contrôle qui le vérifie.</p>
    <div class="principles">
      {#each PRINCIPLES as p}
        <article>
          <h4>{p.title}</h4>
          <p class="muted">{p.why}</p>
          <p class="bad"><span aria-hidden="true">✗</span> {p.bad}</p>
          <p class="good"><span aria-hidden="true">✓</span> {p.good}</p>
          {#if p.check}<span class="pill">Contrôle : {p.check}</span>{/if}
        </article>
      {/each}
    </div>
  </section>

  <section class="card">
    <h3>Boucle de travail</h3>
    <ol>
      <li>
        <a href="/analyze"><b>Analyse de dépôt</b></a> : score de départ, puis onglet <b>Propositions</b> trié par
        points gagnés ; « Concevoir… » prépare un fichier, visible dans <b>Fichiers Claude</b> comme nouveau. « Créer un nouveau
        projet » y ouvre le Générateur avec les règles du dépôt et ces ajouts.
      </li>
      <li>
        <a href="/generator?view=project"><b>Générateur › Projet</b></a> : nom, description, stack, permissions (ou « Nouveau
        projet » / « Importer »).
      </li>
      <li>
        <a href="/generator"><b>Générateur › Règles</b></a> : pour chaque règle, dire quoi et à quoi elle s'applique.
      </li>
      <li>
        <a href="/generator?view=export"><b>Générateur › Aperçu &amp; export</b></a> : corriger erreurs et avertissements,
        vérifier chaque fichier ; puis « Exporter le zip » (barre du haut) et décompresser à la racine du dépôt. « Enregistrer
        » garde une version dans l'Historique.
      </li>
      <li>Committer les fichiers générés (<code>CLAUDE.md</code>, <code>.claude/</code>).</li>
      <li><b>Analyse de dépôt › Ré-analyser</b> : vérifier que le score monte (onglet Historique).</li>
    </ol>
  </section>

  <section class="card">
    <h3>Arborescence générée</h3>
    <pre>{tree}</pre>
  </section>
</div>

<style>
  h2 {
    margin: 0 0 4px;
    font-size: 18px;
  }
  .grid {
    margin-top: 16px;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 460px), 1fr));
    gap: 16px;
  }
  h3 {
    margin-top: 0;
  }
  .good-rules {
    grid-column: 1 / -1;
  }
  .principles {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 300px), 1fr));
    gap: 12px;
  }
  .principles article {
    padding: 10px 12px;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--surface-2);
  }
  .principles h4 {
    margin: 0 0 4px;
  }
  .principles p {
    margin: 0 0 6px;
    font-size: 13px;
  }
  .bad {
    color: var(--err);
  }
  .good {
    color: var(--ok);
  }
  pre {
    background: var(--surface-2);
    padding: 12px;
    border-radius: 6px;
    overflow-x: auto;
  }
  ol {
    padding-left: 18px;
    display: grid;
    gap: 6px;
  }
</style>
