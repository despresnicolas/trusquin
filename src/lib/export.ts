import JSZip from 'jszip';
import { slug, USER_PREFIX } from './core/placement';
import type { GeneratedFile, Project, QualityReport } from './core/types';

function report(files: GeneratedFile[], quality: QualityReport): string {
  const lines = [
    '# Rapport SAURON',
    '',
    `Score qualité : **${quality.score}/100** · ${quality.alwaysLoadedInstructions} instructions toujours chargées`,
    '',
    '## Fichiers',
    '',
    ...files.map((f) => `- \`${f.path}\` — ${f.explanation}`),
    '',
    '## Points à traiter',
    '',
    ...(quality.issues.length ? quality.issues.map((i) => `- [${i.severity}] ${i.message} → ${i.fix}`) : ['Aucun.']),
    '',
  ];
  return lines.join('\n');
}

/** Zip à décompresser à la racine du repo. Les fichiers ~/ vont dans `_home/`. */
export async function exportZip(files: GeneratedFile[], quality: QualityReport): Promise<Blob> {
  const zip = new JSZip();
  for (const file of files) {
    const path = file.path.startsWith(USER_PREFIX) ? `_home/${file.path.slice(USER_PREFIX.length)}` : file.path;
    zip.file(path, file.content);
  }
  zip.file('_sauron-report.md', report(files, quality));
  return zip.generateAsync({ type: 'blob' });
}

/** Nom du zip d'export, tiré du nom du projet. */
export const zipName = (project: Project) => `${slug(project.name.trim() || 'claude')}-sauron.zip`;
