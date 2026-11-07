package main

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
)

// migrateFromSauron reprend une seule fois les données de l'ancien nom de l'application (SAURON) :
// chaque ancien chemin est renommé vers le nouveau, sauf si le nouveau existe déjà. Rien n'est supprimé.
func migrateFromSauron(configDir, home string) error {
	data := filepath.Join(configDir, "trusquin")
	moves := [][2]string{
		{filepath.Join(configDir, "sauron"), data},
		{filepath.Join(data, "sauron.db"), filepath.Join(data, "trusquin.db")},
		{filepath.Join(data, "sauron.db-wal"), filepath.Join(data, "trusquin.db-wal")},
		{filepath.Join(data, "sauron.db-shm"), filepath.Join(data, "trusquin.db-shm")},
	}
	if runtime.GOOS == "darwin" {
		// Stockage du navigateur intégré (projet en cours, thème), rangé selon l'identifiant de l'app ou le nom du binaire (dev).
		webkit := filepath.Join(home, "Library", "WebKit")
		moves = append(moves,
			[2]string{filepath.Join(webkit, "dev.sauron.app"), filepath.Join(webkit, "dev.trusquin.app")},
			[2]string{filepath.Join(webkit, "sauron"), filepath.Join(webkit, "trusquin")},
		)
	}
	for _, m := range moves {
		if _, err := os.Lstat(m[1]); err == nil {
			continue
		} else if !errors.Is(err, os.ErrNotExist) {
			return fmt.Errorf("Migration impossible vers %s : %v", m[1], err)
		}
		if err := os.Rename(m[0], m[1]); err != nil && !errors.Is(err, os.ErrNotExist) {
			return fmt.Errorf("Migration impossible de %s : %v", m[0], err)
		}
	}
	return nil
}
