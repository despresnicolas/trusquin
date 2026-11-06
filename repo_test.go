package main

import (
	"os"
	"path/filepath"
	"slices"
	"strings"
	"testing"
)

// Même motif que TEXT_FILES (core/analyze.ts), réduit à ce que le test utilise.
const testPattern = `(^|\/)(CLAUDE(\.local)?\.md)$`

func fixture(t *testing.T) (root, repo string) {
	t.Helper()
	root, _ = filepath.EvalSymlinks(t.TempDir())
	repo = filepath.Join(root, "mon-repo")
	for _, d := range []string{"node_modules/x", "src", ".git"} {
		if err := os.MkdirAll(filepath.Join(repo, d), 0o755); err != nil {
			t.Fatal(err)
		}
	}
	os.Mkdir(filepath.Join(root, ".cache"), 0o755)
	for path, content := range map[string]string{
		"mon-repo/claude.md":               "# Projet",
		"mon-repo/src/index.ts":            "",
		"mon-repo/node_modules/x/index.js": "",
		"fichier.txt":                      "",
	} {
		if err := os.WriteFile(filepath.Join(root, path), []byte(content), 0o644); err != nil {
			t.Fatal(err)
		}
	}
	return root, repo
}

func TestSnapshot(t *testing.T) {
	_, repo := fixture(t)
	snap, err := RepoService{}.Snapshot(repo+"/", []string{"node_modules", ".git"}, testPattern)
	if err != nil {
		t.Fatal(err)
	}
	if want := []string{"claude.md", "src/index.ts"}; !slices.Equal(snap.Paths, want) {
		t.Errorf("paths = %v, want %v", snap.Paths, want)
	}
	if snap.Contents["claude.md"] != "# Projet" || len(snap.Contents) != 1 {
		t.Errorf("contents = %v", snap.Contents)
	}
	if snap.Root != repo || snap.Name != "mon-repo" {
		t.Errorf("root = %q, name = %q", snap.Root, snap.Name)
	}
}

func TestResolveRepoPath(t *testing.T) {
	root, repo := fixture(t)
	if got, err := resolveRepoPath("  " + repo + "/  "); err != nil || got != repo {
		t.Errorf("resolve = %q, %v", got, err)
	}
	for input, want := range map[string]string{
		"mon-repo":                         "Chemin absolu attendu",
		filepath.Join(root, "absent"):      "Dossier introuvable",
		filepath.Join(root, "fichier.txt"): "Ce n'est pas un dossier",
	} {
		if _, err := resolveRepoPath(input); err == nil || !strings.Contains(err.Error(), want) {
			t.Errorf("resolve(%q) = %v, want %q", input, err, want)
		}
	}
}

func TestDirs(t *testing.T) {
	root, repo := fixture(t)
	listing, err := RepoService{}.Dirs(root, []string{"node_modules"})
	if err != nil {
		t.Fatal(err)
	}
	if want := []DirEntry{{Name: "mon-repo", Path: repo, IsRepo: true}}; !slices.Equal(listing.Dirs, want) {
		t.Errorf("dirs = %v, want %v", listing.Dirs, want)
	}
	if listing.Parent == nil || *listing.Parent != filepath.Dir(root) {
		t.Errorf("parent = %v", listing.Parent)
	}
	sub, _ := RepoService{}.Dirs(repo, []string{"node_modules"})
	if len(sub.Dirs) != 1 || sub.Dirs[0].Name != "src" || !sub.IsRepo {
		t.Errorf("sub = %+v", sub)
	}
}
