# Application de bureau Wails 3, historique en SQLite

SAURON passe d'un serveur SvelteKit (adapter-node, routes `/api`, PostgreSQL, CLI Node, Docker) à une application de bureau Wails 3. Le Go ne fait que deux choses : lire les dossiers locaux (`RepoService`) et tenir l'historique dans une base SQLite du dossier de configuration de l'utilisateur (`HistoryService`). Toute la logique (analyse, placement, qualité) reste dans `src/lib/core/` et tourne dans la fenêtre. Les listes d'ignorés et le motif des fichiers à lire sont transmis par le front, pour que le cœur TS reste la seule source de vérité.

## Options écartées

- **Garder Node en sidecar** : moins de réécriture, mais il faut embarquer Node et l'application est plus lourde.
- **Garder PostgreSQL** : imposait une base à faire tourner pour un outil local et mono-utilisateur.
- **Garder la version web et la CLI à côté du bureau** : il aurait fallu deux transports (bindings et `/api`) derrière une interface commune. Une CLI pourra revenir en Go dans le même binaire.

## Conséquences

- Plus de déploiement serveur ni de Docker. `SAURON_ROOTS` disparaît : l'application lit ce que l'utilisateur peut lire.
- Le contrôle des erreurs bloquantes avant l'enregistrement d'un projet se fait côté front : le front et le Go forment une seule application de confiance.
