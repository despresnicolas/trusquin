<script lang="ts">
  import { GUIDE } from '../core/presets';

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

<div class="grid">
  <section class="card">
    <h3>Où mettre quoi ?</h3>
    <table>
      <tbody>
        {#each GUIDE as g}
          <tr><td>{g.question}</td><td><b>{g.answer}</b></td><td><code>{g.where}</code></td></tr>
        {/each}
      </tbody>
    </table>
  </section>

  <section class="card">
    <h3>Arborescence générée</h3>
    <pre>{tree}</pre>
  </section>

  <section class="card">
    <h3>Ce qui fait une bonne règle</h3>
    <ul>
      <li>
        <b>Vérifiable</b> : « tests dans <code>foo.test.ts</code> à côté de <code>foo.ts</code> », pas « écrire des tests
        ».
      </li>
      <li><b>Non déductible</b> : test de suppression — sans la ligne, Claude se tromperait-il ? Sinon, supprimer.</li>
      <li><b>Pointer, pas copier</b> : <code>src/errors.ts:12</code> plutôt qu'un extrait qui vieillit.</li>
      <li><b>Pas de travail de linter</b> : indentation, quotes, points-virgules → formatter + hook.</li>
      <li><b>WHAT / WHY / HOW</b> : stack et structure, raisons des choix, commandes exactes.</li>
      <li><b>Pas de secret</b>, pas de contradiction entre fichiers.</li>
      <li><b>Vivant</b> : ajouter une règle quand Claude répète une erreur, retirer celles devenues inutiles.</li>
    </ul>
  </section>

  <section class="card">
    <h3>Boucle de travail</h3>
    <ol>
      <li>
        <b>Analyse de dépôt</b> : score de départ, import des règles existantes, suivi du score dans l'historique.
      </li>
      <li><b>Règles</b> : pour chaque règle, dire quoi et à quoi elle s'applique.</li>
      <li><b>Aperçu &amp; export</b> : corriger erreurs et avertissements.</li>
      <li><b>Aperçu & export</b> : vérifier chaque fichier, exporter le zip, décompresser à la racine.</li>
      <li>Committer <code>sauron.json</code> ; régénérer avec <code>pnpm sauron generate</code>.</li>
    </ol>
  </section>
</div>

<style>
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 460px), 1fr));
    gap: 16px;
  }
  h3 {
    margin-top: 0;
  }
  table {
    width: 100%;
    border-collapse: collapse;
  }
  td {
    padding: 6px 8px;
    border-bottom: 1px solid var(--border);
    vertical-align: top;
  }
  pre {
    background: var(--surface-2);
    padding: 12px;
    border-radius: 6px;
    overflow-x: auto;
  }
  ul,
  ol {
    padding-left: 18px;
    display: grid;
    gap: 6px;
  }
</style>
