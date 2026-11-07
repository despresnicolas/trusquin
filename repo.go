package main

import (
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"slices"
	"strings"
	"time"
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
type RepoService struct {
	// BackupDir reçoit une copie de chaque fichier avant que WriteRepoFile ne l'écrase.
	BackupDir string
}

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
// Un fichier existant est d'abord copié dans <repoBackupDir>/<horodatage>/<rel> : renvoie ce chemin, ou "" sans sauvegarde.
func (s RepoService) WriteRepoFile(root, rel, content string) (string, error) {
	dir, err := resolveRepoPath(root)
	if err != nil {
		return "", err
	}
	if !filepath.IsLocal(rel) {
		return "", fmt.Errorf("Chemin hors du dépôt : « %s »", rel)
	}
	path := filepath.Join(dir, rel)
	backup := ""
	if old, err := os.ReadFile(path); err == nil {
		backup = filepath.Join(s.repoBackupDir(dir), time.Now().Format(backupStamp), rel)
		if err := os.MkdirAll(filepath.Dir(backup), 0o755); err != nil {
			return "", fmt.Errorf("Sauvegarde impossible, %s n'est pas modifié : %v", rel, err)
		}
		if err := os.WriteFile(backup, old, 0o644); err != nil {
			return "", fmt.Errorf("Sauvegarde impossible, %s n'est pas modifié : %v", rel, err)
		}
	} else if !errors.Is(err, os.ErrNotExist) {
		return "", fmt.Errorf("Impossible de lire %s : %v", rel, err)
	}
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return "", fmt.Errorf("Impossible de créer le dossier de %s : %v", rel, err)
	}
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		return "", fmt.Errorf("Impossible d'enregistrer %s : %v", rel, err)
	}
	return backup, nil
}

// Horodatage du dossier d'une sauvegarde : trié comme une date.
const backupStamp = "20060102-150405.000"

// Backup : une ancienne version d'un fichier du dépôt, avant qu'il soit écrasé.
type Backup struct {
	Path    string `json:"path"`
	Rel     string `json:"rel"`
	SavedAt string `json:"savedAt"`
}

// repoBackupDir : un dossier par dépôt ; l'empreinte du chemin sépare deux dépôts du même nom.
func (s RepoService) repoBackupDir(dir string) string {
	sum := sha256.Sum256([]byte(dir))
	return filepath.Join(s.BackupDir, filepath.Base(dir)+"-"+hex.EncodeToString(sum[:4]))
}

// ListBackups liste les sauvegardes d'un dépôt, la plus récente d'abord.
func (s RepoService) ListBackups(root string) ([]Backup, error) {
	dir, err := resolveRepoPath(root)
	if err != nil {
		return nil, err
	}
	base := s.repoBackupDir(dir)
	list := []Backup{}
	err = filepath.WalkDir(base, func(abs string, d os.DirEntry, err error) error {
		if err != nil || !d.Type().IsRegular() {
			return err
		}
		rel, _ := filepath.Rel(base, abs)
		stamp, file, ok := strings.Cut(filepath.ToSlash(rel), "/")
		at, perr := time.ParseInLocation(backupStamp, stamp, time.Local)
		if ok && perr == nil {
			list = append(list, Backup{Path: abs, Rel: file, SavedAt: at.Format(time.RFC3339)})
		}
		return nil
	})
	if errors.Is(err, os.ErrNotExist) {
		return list, nil
	}
	if err != nil {
		return nil, fmt.Errorf("Impossible de lire les sauvegardes : %v", err)
	}
	slices.SortFunc(list, func(a, b Backup) int { return strings.Compare(b.Path, a.Path) })
	return list, nil
}

// RestoreBackup remet une sauvegarde à sa place dans le dépôt ; la version remplacée est elle-même sauvegardée.
func (s RepoService) RestoreBackup(root, backup string) (string, error) {
	dir, err := resolveRepoPath(root)
	if err != nil {
		return "", err
	}
	rel, err := filepath.Rel(s.repoBackupDir(dir), backup)
	_, file, ok := strings.Cut(filepath.ToSlash(rel), "/")
	if err != nil || !filepath.IsLocal(rel) || !ok {
		return "", fmt.Errorf("Ce n'est pas une sauvegarde de ce dépôt : %s", backup)
	}
	content, err := os.ReadFile(backup)
	if err != nil {
		return "", fmt.Errorf("Sauvegarde illisible : %v", err)
	}
	return s.WriteRepoFile(dir, file, string(content))
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
