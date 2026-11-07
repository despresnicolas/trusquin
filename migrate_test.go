package main

import (
	"os"
	"path/filepath"
	"testing"
)

func TestMigrateFromSauron(t *testing.T) {
	config, home := t.TempDir(), t.TempDir()
	old := filepath.Join(config, "sauron")
	if err := os.MkdirAll(filepath.Join(old, "backups"), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(old, "sauron.db"), []byte("db"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := migrateFromSauron(config, home); err != nil {
		t.Fatal(err)
	}
	if b, err := os.ReadFile(filepath.Join(config, "trusquin", "trusquin.db")); err != nil || string(b) != "db" {
		t.Fatalf("base non migrée : %q, %v", b, err)
	}
	if _, err := os.Stat(filepath.Join(config, "trusquin", "backups")); err != nil {
		t.Fatalf("sauvegardes non migrées : %v", err)
	}
	if _, err := os.Stat(old); !os.IsNotExist(err) {
		t.Fatalf("l'ancien dossier devrait avoir été renommé : %v", err)
	}

	// Déjà migré : une nouvelle copie de l'ancien dossier n'écrase rien.
	if err := os.MkdirAll(old, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := migrateFromSauron(config, home); err != nil {
		t.Fatal(err)
	}
	if _, err := os.Stat(old); err != nil {
		t.Fatalf("l'ancien dossier ne doit pas être touché quand le nouveau existe : %v", err)
	}
}
