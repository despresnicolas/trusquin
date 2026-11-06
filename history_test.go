package main

import (
	"encoding/json"
	"fmt"
	"path/filepath"
	"slices"
	"testing"
)

func testHistory(t *testing.T) *HistoryService {
	t.Helper()
	h, err := openHistory(filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { h.db.Close() })
	return h
}

func result(score int) json.RawMessage {
	return json.RawMessage(fmt.Sprintf(`{"score":%d,"grade":"C","criteria":[],"memoryIssues":[],"memoryFiles":["CLAUDE.md"]}`, score))
}

func must[T any](t *testing.T) func(T, error) T {
	return func(v T, err error) T {
		t.Helper()
		if err != nil {
			t.Fatal(err)
		}
		return v
	}
}

func TestAnalyses(t *testing.T) {
	h := testHistory(t)
	save := must[AnalysisRecord](t)
	save(h.SaveAnalysis("/a", "a", 3, result(40)))
	last := save(h.SaveAnalysis("/a", "a", 4, result(70)))
	save(h.SaveAnalysis("/b", "b", 1, result(90)))

	repos := must[[]RepoSummary](t)(h.ListRepos())
	if len(repos) != 2 || repos[0].Last.Path != "/b" || repos[1].Last.Path != "/a" {
		t.Fatalf("repos = %+v", repos)
	}
	if r := repos[1]; r.Runs != 2 || r.PreviousScore == nil || *r.PreviousScore != 40 || r.Last.ID != last.ID || r.Last.Score != 70 {
		t.Errorf("repo a = %+v", r)
	}
	if repos[0].PreviousScore != nil {
		t.Errorf("repo b previous = %v", *repos[0].PreviousScore)
	}

	runs := must[[]AnalysisRun](t)(h.ListRuns("/a"))
	if len(runs) != 2 || runs[0].Score != 70 || runs[1].Score != 40 {
		t.Errorf("runs = %+v", runs)
	}
	if got := must[AnalysisRecord](t)(h.GetAnalysis(last.ID)); string(got.Result) != string(result(70)) {
		t.Errorf("result = %s", got.Result)
	}
	if _, err := h.GetAnalysis(-1); err == nil {
		t.Error("analyse -1 trouvée")
	}
	if _, err := h.SaveAnalysis("/c", "c", 1, json.RawMessage(`{}`)); err == nil {
		t.Error("résultat sans score accepté")
	}

	if n := must[int64](t)(h.DeleteRepo("/a")); n != 2 {
		t.Errorf("deleted = %d", n)
	}
	if repos := must[[]RepoSummary](t)(h.ListRepos()); len(repos) != 1 || repos[0].Last.Path != "/b" {
		t.Errorf("après suppression = %+v", repos)
	}
}

func TestProjects(t *testing.T) {
	h := testHistory(t)
	save := must[ProjectVersion](t)
	project := func(name, description string) json.RawMessage {
		return json.RawMessage(fmt.Sprintf(`{"name":%q,"description":%q,"rules":[{"id":"r1"},{"id":"r2"}]}`, name, description))
	}
	first := save(h.SaveProject(project("a", ""), 80))
	// Même contenu, autre ordre de clés : pas de nouvelle version.
	if again := save(h.SaveProject(json.RawMessage(`{"rules":[{"id":"r1"},{"id":"r2"}],"description":"","name":"a"}`), 80)); again.ID != first.ID {
		t.Errorf("doublon enregistré : %d != %d", again.ID, first.ID)
	}
	second := save(h.SaveProject(project("a", "v2"), 85))
	save(h.SaveProject(project("b", ""), 90))

	projects := must[[]ProjectSummary](t)(h.ListProjects())
	names := []string{}
	for _, p := range projects {
		names = append(names, p.Last.Name)
	}
	if !slices.Equal(names, []string{"b", "a"}) {
		t.Fatalf("projects = %v", names)
	}
	if p := projects[1]; p.Versions != 2 || p.Last.ID != second.ID || p.Last.Score != 85 || p.Last.RuleCount != 2 {
		t.Errorf("projet a = %+v", p)
	}
	var got struct{ Description string }
	json.Unmarshal(must[ProjectRecord](t)(h.GetProject(second.ID)).Project, &got)
	if got.Description != "v2" {
		t.Errorf("description = %q", got.Description)
	}
	if _, err := h.SaveProject(json.RawMessage(`{"name":""}`), 0); err == nil {
		t.Error("projet sans nom accepté")
	}

	if n := must[int64](t)(h.DeleteProject("a")); n != 2 {
		t.Errorf("deleted = %d", n)
	}
	if projects := must[[]ProjectSummary](t)(h.ListProjects()); len(projects) != 1 || projects[0].Last.Name != "b" {
		t.Errorf("après suppression = %+v", projects)
	}
}
