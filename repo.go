package main

import (
	"encoding/base64"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"slices"
	"strings"
)

// Fichiers plus gros : chemin seul, contenu non lu.
const maxContentSize = 256 * 1024

// Snapshot : chemins relatifs du dépôt et contenu des fichiers utiles à l'analyse (calculée côté front).
type Snapshot struct {
	Root     string            `json:"root"`
	Name     string            `json:"name"`
	Paths    []string          `json:"paths"`
	Contents map[string]string `json:"contents"`
}

// RepoService lit le disque. Les listes d'ignorés et le motif des fichiers à lire viennent du cœur TS
// (IGNORED_DIRS, TEXT_FILES) pour rester la seule source de vérité.
type RepoService struct{}

// Snapshot lit un dossier local : chemins hors dossiers ignorés, contenu des fichiers qui correspondent à pattern
// (source d'une RegExp JS, insensible à la casse).
func (RepoService) Snapshot(path string, ignored []string, pattern string) (Snapshot, error) {
	root, err := resolveRepoPath(path)
	if err != nil {
		return Snapshot{}, err
	}
	re, err := regexp.Compile("(?i)" + pattern)
	if err != nil {
		return Snapshot{}, fmt.Errorf("motif de fichiers invalide : %w", err)
	}
	snap := Snapshot{Root: root, Name: filepath.Base(root), Paths: []string{}, Contents: map[string]string{}}
	err = filepath.WalkDir(root, func(abs string, d os.DirEntry, err error) error {
		if err != nil {
			// Dossier illisible (droits) : on l'ignore plutôt que d'échouer toute l'analyse.
			if d != nil && d.IsDir() && abs != root {
				return filepath.SkipDir
			}
			return err
		}
		if abs == root {
			return nil
		}
		if slices.Contains(ignored, d.Name()) {
			if d.IsDir() {
				return filepath.SkipDir
			}
			return nil
		}
		if !d.Type().IsRegular() {
			return nil
		}
		rel := filepath.ToSlash(strings.TrimPrefix(abs, root+string(filepath.Separator)))
		snap.Paths = append(snap.Paths, rel)
		if re.MatchString(rel) {
			if info, err := d.Info(); err == nil && info.Size() <= maxContentSize {
				if b, err := os.ReadFile(abs); err == nil {
					snap.Contents[rel] = string(b)
				}
			}
		}
		return nil
	})
	slices.Sort(snap.Paths)
	return snap, err
}

// WriteFile enregistre un fichier à l'emplacement choisi dans la boîte d'enregistrement native.
// data est en base64 : les octets passent ainsi tels quels dans le JSON des bindings.
func (RepoService) WriteFile(path, data string) error {
	if !filepath.IsAbs(path) {
		return fmt.Errorf("Chemin absolu attendu : « %s »", path)
	}
	content, err := base64.StdEncoding.DecodeString(data)
	if err != nil {
		return errors.New("Contenu du fichier illisible")
	}
	if err := os.WriteFile(path, content, 0o644); err != nil {
		return fmt.Errorf("Impossible d'enregistrer %s : %v", path, err)
	}
	return nil
}

// WriteRepoFile écrit un fichier texte dans un dépôt ; rel doit rester dans le dépôt (pas de .. ni de chemin absolu).
func (RepoService) WriteRepoFile(root, rel, content string) error {
	dir, err := resolveRepoPath(root)
	if err != nil {
		return err
	}
	if !filepath.IsLocal(rel) {
		return fmt.Errorf("Chemin hors du dépôt : « %s »", rel)
	}
	path := filepath.Join(dir, rel)
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return fmt.Errorf("Impossible de créer le dossier de %s : %v", rel, err)
	}
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		return fmt.Errorf("Impossible d'enregistrer %s : %v", rel, err)
	}
	return nil
}

// resolveRepoPath valide un chemin saisi par l'utilisateur et renvoie sa forme canonique.
// Les messages d'erreur sont affichés tels quels dans l'interface.
func resolveRepoPath(input string) (string, error) {
	raw := strings.TrimSpace(input)
	if raw == "~" || strings.HasPrefix(raw, "~/") || strings.HasPrefix(raw, "~"+string(filepath.Separator)) {
		home, err := os.UserHomeDir()
		if err != nil {
			return "", err
		}
		raw = home + raw[1:]
	}
	if !filepath.IsAbs(raw) {
		return "", fmt.Errorf("Chemin absolu attendu : « %s »", input)
	}
	path, err := filepath.EvalSymlinks(raw)
	if err != nil {
		return "", fmt.Errorf("Dossier introuvable : %s", filepath.Clean(raw))
	}
	info, err := os.Stat(path)
	if err != nil {
		return "", err
	}
	if !info.IsDir() {
		return "", errors.New("Ce n'est pas un dossier : " + path)
	}
	return path, nil
}
