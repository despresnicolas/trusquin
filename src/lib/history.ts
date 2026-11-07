import { Clipboard, Dialogs } from '@wailsio/runtime';
import { HistoryService, RepoService } from './bindings/trusquin';
import { analyzeRepo, claudeFiles, IGNORED_DIRS, TEXT_FILES } from './core/analyze';
import { checkProject } from './core/quality';
import type { ClaudeFile, Project, RepoAnalysis, RepoSnapshot } from './core/types';
import type { Backup } from './bindings/trusquin/models';

/** Une analyse enregistrée, sans le détail des critères. */
export interface AnalysisRun {
  id: number;
  path: string;
  name: string;
  fileCount: number;
  score: number;
  grade: RepoAnalysis['grade'];
  createdAt: string;
}

export interface AnalysisRecord extends AnalysisRun {
  result: RepoAnalysis;
}

export interface RepoSummary {
  last: AnalysisRun;
  runs: number;
  previousScore: number | null;
}

/** Une version enregistrée d'un projet du générateur, sans son contenu. */
export interface ProjectVersion {
  id: number;
  name: string;
  ruleCount: number;
  score: number;
  createdAt: string;
}

export interface ProjectRecord extends ProjectVersion {
  project: Project;
}

export interface ProjectSummary {
  last: ProjectVersion;
  versions: number;
}

// Services Go de l'application Wails (bindings générés par `wails3 generate bindings` dans src/lib/bindings).
// Le Go renvoie toujours des tableaux (jamais null), contrairement à ce que disent les types générés.
const repoFiles = async (path: string) =>
  (await RepoService.Snapshot(path, [...IGNORED_DIRS], TEXT_FILES.source)) as RepoSnapshot & {
    root: string;
    name: string;
  };

export const api = {
  repos: async () => ((await HistoryService.ListRepos()) ?? []) as RepoSummary[],
  runs: async (path: string) => ((await HistoryService.ListRuns(path)) ?? []) as AnalysisRun[],
  /** Fichiers Claude Code actuels d'un dépôt, lus sur le disque (pas dans l'historique). */
  files: async (path: string): Promise<ClaudeFile[]> => claudeFiles(await repoFiles(path)),
  /** Boîte de choix de dossier du système ; '' si annulée. */
  pickDir: async (start?: string) =>
    Dialogs.OpenFile({
      Title: 'Ajouter un dépôt',
      ButtonText: 'Analyser',
      CanChooseDirectories: true,
      CanChooseFiles: false,
      Directory: start?.trim() || undefined,
    }),
  /** Boîte de confirmation du système ; vrai si l'utilisateur valide `action`. */
  ask: async (message: string, action = 'Supprimer') =>
    (await Dialogs.Question({
      Title: message,
      Buttons: [
        { Label: 'Annuler', IsCancel: true },
        { Label: action, IsDefault: true },
      ],
    })) === action,
  /** Boîte d'enregistrement du système puis écriture côté Go ; faux si annulée. */
  saveFile: async (name: string, data: Blob) => {
    const path = await Dialogs.SaveFile({ Filename: name });
    if (!path) return false;
    await RepoService.WriteFile(path, await base64(data));
    return true;
  },
  /** Écrit un fichier texte dans le dépôt analysé (chemin relatif à sa racine) ; renvoie la sauvegarde de l'ancienne version, ou ''. */
  writeRepoFile: (root: string, rel: string, content: string) => RepoService.WriteRepoFile(root, rel, content),
  /** Anciennes versions des fichiers écrasés dans ce dépôt, la plus récente d'abord. */
  backups: async (root: string): Promise<Backup[]> => (await RepoService.ListBackups(root)) ?? [],
  /** Remet une sauvegarde à sa place ; renvoie la sauvegarde de la version remplacée. */
  restore: (root: string, backup: string) => RepoService.RestoreBackup(root, backup),
  copy: (text: string) => Clipboard.SetText(text),
  get: async (id: number) => (await HistoryService.GetAnalysis(id)) as AnalysisRecord,
  /** Lit le dossier côté Go, l'analyse avec le cœur TS et enregistre le résultat. */
  analyze: async (path: string) => {
    const snap = await repoFiles(path);
    const result = analyzeRepo(snap);
    return (await HistoryService.SaveAnalysis(snap.root, snap.name, snap.paths.length, result)) as AnalysisRecord;
  },
  forget: async (path: string) => ({ deleted: await HistoryService.DeleteRepo(path) }),
  projects: async () => ((await HistoryService.ListProjects()) ?? []) as ProjectSummary[],
  project: async (id: number) => (await HistoryService.GetProject(id)) as ProjectRecord,
  /** Enregistre une version du projet (ignorée si identique à la dernière). Refusé s'il a des erreurs bloquantes. */
  saveProject: async (project: Project) => {
    const report = checkProject(project);
    const blocking = report.issues.filter((i) => i.severity === 'error');
    if (blocking.length)
      throw new Error(`${blocking.length} erreur(s) bloquante(s), projet non enregistré : ${blocking[0].message}`);
    return (await HistoryService.SaveProject(project, report.score)) as ProjectVersion;
  },
  forgetProject: async (name: string) => ({ deleted: await HistoryService.DeleteProject(name) }),
};

// FileReader plutôt que btoa : pas de limite de taille, et dispo dans tous les WebView (WebKit, WebView2, WebKitGTK).
const base64 = (data: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(data);
  });
