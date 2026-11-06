package main

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"time"

	_ "modernc.org/sqlite"
)

// AnalysisRun : une analyse enregistrée, sans le détail des critères.
type AnalysisRun struct {
	ID        int64  `json:"id"`
	Path      string `json:"path"`
	Name      string `json:"name"`
	FileCount int    `json:"fileCount"`
	Score     int    `json:"score"`
	Grade     string `json:"grade"`
	CreatedAt string `json:"createdAt"`
}

type AnalysisRecord struct {
	AnalysisRun
	Result json.RawMessage `json:"result"`
}

type RepoSummary struct {
	Last          AnalysisRun `json:"last"`
	Runs          int         `json:"runs"`
	PreviousScore *int        `json:"previousScore"`
}

// ProjectVersion : une version enregistrée d'un projet du générateur, sans son contenu.
type ProjectVersion struct {
	ID        int64  `json:"id"`
	Name      string `json:"name"`
	RuleCount int    `json:"ruleCount"`
	Score     int    `json:"score"`
	CreatedAt string `json:"createdAt"`
}

type ProjectRecord struct {
	ProjectVersion
	Project json.RawMessage `json:"project"`
}

type ProjectSummary struct {
	Last     ProjectVersion `json:"last"`
	Versions int            `json:"versions"`
}

// HistoryService : historique des analyses et des projets, dans une base SQLite locale.
type HistoryService struct {
	db *sql.DB
}

const schema = `
CREATE TABLE IF NOT EXISTS analyses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  path TEXT NOT NULL,
  name TEXT NOT NULL,
  file_count INTEGER NOT NULL,
  score INTEGER NOT NULL,
  grade TEXT NOT NULL,
  result TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS analyses_path_created_idx ON analyses (path, created_at DESC);
CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  rule_count INTEGER NOT NULL,
  score INTEGER NOT NULL,
  project TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS projects_name_created_idx ON projects (name, created_at DESC);`

// defaultDBPath : SAURON_DB, sinon <dossier de config utilisateur>/sauron/sauron.db.
func defaultDBPath() (string, error) {
	if p := os.Getenv("SAURON_DB"); p != "" {
		return p, nil
	}
	dir, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(dir, "sauron", "sauron.db"), nil
}

func openHistory(path string) (*HistoryService, error) {
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return nil, err
	}
	db, err := sql.Open("sqlite", path+"?_pragma=busy_timeout(5000)&_pragma=journal_mode(WAL)")
	if err != nil {
		return nil, err
	}
	if _, err := db.Exec(schema); err != nil {
		db.Close()
		return nil, fmt.Errorf("base SQLite illisible (%s) : %w", path, err)
	}
	return &HistoryService{db: db}, nil
}

func now() string { return time.Now().UTC().Format(time.RFC3339Nano) }

type scanner interface{ Scan(...any) error }

func scanRun(s scanner, extra ...any) (AnalysisRun, error) {
	var r AnalysisRun
	err := s.Scan(append([]any{&r.ID, &r.Path, &r.Name, &r.FileCount, &r.Score, &r.Grade, &r.CreatedAt}, extra...)...)
	return r, err
}

func scanVersion(s scanner, extra ...any) (ProjectVersion, error) {
	var v ProjectVersion
	err := s.Scan(append([]any{&v.ID, &v.Name, &v.RuleCount, &v.Score, &v.CreatedAt}, extra...)...)
	return v, err
}

// SaveAnalysis enregistre le résultat d'analyzeRepo (calculé côté front) ; note et grade en sont extraits.
func (h *HistoryService) SaveAnalysis(path, name string, fileCount int, result json.RawMessage) (AnalysisRecord, error) {
	var head struct {
		Score *int   `json:"score"`
		Grade string `json:"grade"`
	}
	if err := json.Unmarshal(result, &head); err != nil || head.Score == nil || head.Grade == "" {
		return AnalysisRecord{}, errors.New("Résultat d'analyse illisible")
	}
	row := h.db.QueryRow(`INSERT INTO analyses (path, name, file_count, score, grade, result, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id, path, name, file_count, score, grade, created_at`,
		path, name, fileCount, *head.Score, head.Grade, string(result), now())
	run, err := scanRun(row)
	return AnalysisRecord{AnalysisRun: run, Result: result}, err
}

// ListRepos : un résumé par dossier analysé, le plus récent en premier.
func (h *HistoryService) ListRepos() ([]RepoSummary, error) {
	rows, err := h.db.Query(`SELECT id, path, name, file_count, score, grade, created_at, runs, previous_score FROM (
		SELECT *, count(*) OVER (PARTITION BY path) AS runs,
			lead(score) OVER (PARTITION BY path ORDER BY created_at DESC, id DESC) AS previous_score,
			row_number() OVER (PARTITION BY path ORDER BY created_at DESC, id DESC) AS rn
		FROM analyses) WHERE rn = 1 ORDER BY created_at DESC, id DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	list := []RepoSummary{}
	for rows.Next() {
		var s RepoSummary
		var prev sql.NullInt64
		if s.Last, err = scanRun(rows, &s.Runs, &prev); err != nil {
			return nil, err
		}
		if prev.Valid {
			p := int(prev.Int64)
			s.PreviousScore = &p
		}
		list = append(list, s)
	}
	return list, rows.Err()
}

// ListRuns : historique d'un dossier, sans le détail des critères.
func (h *HistoryService) ListRuns(path string) ([]AnalysisRun, error) {
	rows, err := h.db.Query(`SELECT id, path, name, file_count, score, grade, created_at FROM analyses
		WHERE path = ? ORDER BY created_at DESC, id DESC`, path)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	list := []AnalysisRun{}
	for rows.Next() {
		r, err := scanRun(rows)
		if err != nil {
			return nil, err
		}
		list = append(list, r)
	}
	return list, rows.Err()
}

func (h *HistoryService) GetAnalysis(id int64) (AnalysisRecord, error) {
	var result string
	run, err := scanRun(h.db.QueryRow(`SELECT id, path, name, file_count, score, grade, created_at, result
		FROM analyses WHERE id = ?`, id), &result)
	if errors.Is(err, sql.ErrNoRows) {
		return AnalysisRecord{}, errors.New("Analyse introuvable")
	}
	return AnalysisRecord{AnalysisRun: run, Result: json.RawMessage(result)}, err
}

// DeleteRepo supprime tout l'historique d'un dossier ; renvoie le nombre d'analyses supprimées.
func (h *HistoryService) DeleteRepo(path string) (int64, error) {
	res, err := h.db.Exec(`DELETE FROM analyses WHERE path = ?`, path)
	if err != nil {
		return 0, err
	}
	return res.RowsAffected()
}

// SaveProject enregistre une version d'un projet, sauf si elle est identique à la dernière du même nom.
// Le score et le contrôle des erreurs bloquantes sont faits côté front (checkProject).
func (h *HistoryService) SaveProject(project json.RawMessage, score int) (ProjectVersion, error) {
	var head struct {
		Name  string            `json:"name"`
		Rules []json.RawMessage `json:"rules"`
	}
	if err := json.Unmarshal(project, &head); err != nil || head.Name == "" || head.Rules == nil {
		return ProjectVersion{}, errors.New("Projet illisible (name et rules attendus)")
	}
	canonical, err := canonicalJSON(project)
	if err != nil {
		return ProjectVersion{}, err
	}
	same, err := scanVersion(h.db.QueryRow(`SELECT id, name, rule_count, score, created_at FROM projects
		WHERE id = (SELECT id FROM projects WHERE name = ? ORDER BY created_at DESC, id DESC LIMIT 1)
		AND project = ?`, head.Name, canonical))
	if err == nil {
		return same, nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return ProjectVersion{}, err
	}
	return scanVersion(h.db.QueryRow(`INSERT INTO projects (name, rule_count, score, project, created_at)
		VALUES (?, ?, ?, ?, ?) RETURNING id, name, rule_count, score, created_at`,
		head.Name, len(head.Rules), score, canonical, now()))
}

// ListProjects : dernière version de chaque projet (par nom), la plus récente en premier.
func (h *HistoryService) ListProjects() ([]ProjectSummary, error) {
	rows, err := h.db.Query(`SELECT id, name, rule_count, score, created_at, versions FROM (
		SELECT *, count(*) OVER (PARTITION BY name) AS versions,
			row_number() OVER (PARTITION BY name ORDER BY created_at DESC, id DESC) AS rn
		FROM projects) WHERE rn = 1 ORDER BY created_at DESC, id DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	list := []ProjectSummary{}
	for rows.Next() {
		var s ProjectSummary
		if s.Last, err = scanVersion(rows, &s.Versions); err != nil {
			return nil, err
		}
		list = append(list, s)
	}
	return list, rows.Err()
}

func (h *HistoryService) GetProject(id int64) (ProjectRecord, error) {
	var project string
	v, err := scanVersion(h.db.QueryRow(`SELECT id, name, rule_count, score, created_at, project
		FROM projects WHERE id = ?`, id), &project)
	if errors.Is(err, sql.ErrNoRows) {
		return ProjectRecord{}, errors.New("Projet introuvable")
	}
	return ProjectRecord{ProjectVersion: v, Project: json.RawMessage(project)}, err
}

// DeleteProject supprime toutes les versions d'un projet ; renvoie le nombre de versions supprimées.
func (h *HistoryService) DeleteProject(name string) (int64, error) {
	res, err := h.db.Exec(`DELETE FROM projects WHERE name = ?`, name)
	if err != nil {
		return 0, err
	}
	return res.RowsAffected()
}

// canonicalJSON : clés triées et sans espaces, pour comparer deux versions comme le faisait jsonb.
func canonicalJSON(raw json.RawMessage) (string, error) {
	var v any
	dec := json.NewDecoder(bytes.NewReader(raw))
	dec.UseNumber()
	if err := dec.Decode(&v); err != nil {
		return "", err
	}
	b, err := json.Marshal(v)
	return string(b), err
}
