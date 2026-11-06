---
paths:
  - "*.go"
  - "go.mod"
---

## Services Go (Wails)

- Le Go ne fait que l'accès disque et SQLite : toute logique d'analyse ou de qualité va dans `src/lib/core/`
- Après un changement de signature d'une méthode de service : `wails3 generate bindings -clean=true -ts -i -d src/lib/bindings`, puis adapter `src/lib/history.ts`
- Messages d'erreur renvoyés au front en français : ils sont affichés tels quels
- Toute méthode de service a un test dans `*_test.go`, sur un dossier ou une base `t.TempDir()`
- `gofmt -w` après chaque édition ; SQLite via `modernc.org/sqlite` (pas de cgo pour la base)
