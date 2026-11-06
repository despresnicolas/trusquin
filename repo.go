package main

import (
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

type DirEntry struct {
	Name   string `json:"name"`
	Path   string `json:"path"`
	IsRepo bool   `json:"isRepo"`
}

// DirListing : sous-dossiers d'un dossier, pour le sélecteur de dépôt.
type DirListing struct {
	Path   string     `json:"path"`
	Parent *string    `json:"parent"`
	IsRepo bool       `json:"isRepo"`
	Dirs   []DirEntry `json:"dirs"`
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

// Dirs liste les sous-dossiers visibles d'un dossier (dossier personnel par défaut), en repérant les dépôts git.
func (RepoService) Dirs(path string, ignored []string) (DirListing, error) {
	if strings.TrimSpace(path) == "" {
		home, err := os.UserHomeDir()
		if err != nil {
			return DirListing{}, err
		}
		path = home
	}
	dir, err := resolveRepoPath(path)
	if err != nil {
		return DirListing{}, err
	}
	entries, err := os.ReadDir(dir)
	if err != nil {
		return DirListing{}, err
	}
	listing := DirListing{Path: dir, IsRepo: isRepo(dir), Dirs: []DirEntry{}}
	for _, e := range entries {
		if !e.IsDir() || strings.HasPrefix(e.Name(), ".") || slices.Contains(ignored, e.Name()) {
			continue
		}
		p := filepath.Join(dir, e.Name())
		listing.Dirs = append(listing.Dirs, DirEntry{Name: e.Name(), Path: p, IsRepo: isRepo(p)})
	}
	slices.SortFunc(listing.Dirs, func(a, b DirEntry) int { return strings.Compare(a.Name, b.Name) })
	if parent := filepath.Dir(dir); parent != dir {
		listing.Parent = &parent
	}
	return listing, nil
}

func isRepo(dir string) bool {
	_, err := os.Stat(filepath.Join(dir, ".git"))
	return err == nil
}

// resolveRepoPath valide un chemin saisi par l'utilisateur et renvoie sa forme canonique.
// Les messages d'erreur sont affichés tels quels dans l'interface.
func resolveRepoPath(input string) (string, error) {
	raw := strings.TrimSpace(input)
	if raw == "~" || strings.HasPrefix(raw, "~/") {
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
