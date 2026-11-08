/**
 * Anglais des contrôles qualité (core/quality.ts), indexé par `code` ; `{nom}` reprend `issue.params.nom`.
 * Core garde ses messages en français (export, rapport) ; l'interface passe par issueText().
 */
export const issuesEn: Record<string, { message: string; fix: string }> = {
  'root-too-long': {
    message: '{n} lines: beyond {max}, Claude follows instructions less well.',
    fix: 'Move specific sections to .claude/rules/ with `paths`, or into skills.',
  },
  'root-long': {
    message: '{n} lines: aim for under {max} lines at the root.',
    fix: 'Keep the root as an index; go into detail elsewhere.',
  },
  'file-long': { message: '{n} lines in a single rules file.', fix: 'Split by topic or by path.' },
  vague: {
    message: 'Vague wording: “{terms}”.',
    fix: 'Replace with a checkable rule (command, threshold, example file). Test: “without this line, would Claude get it wrong?”',
  },
  secret: {
    message: 'Probable secret ({kind}).',
    fix: 'Remove the value, put it in .env (gitignored) and only reference the variable name.',
  },
  'negative-phrasing': {
    message: '{n} instruction(s) phrased as a ban with no alternative (line {lines}).',
    fix: 'Say what to do: “Use strict TypeScript” rather than “No any”. Keep a ban only when followed by the alternative (“…: use X”).',
  },
  'code-copy': {
    message: '{n}-line code block (line {line}).',
    fix: 'Point to the source file (`path:line`) rather than copying: a copy goes stale.',
  },
  'no-trigger': {
    message: 'Description of “{label}” has no triggering situation.',
    fix: 'End with “Use when…” and the user’s requests, including those that don’t name the skill.',
  },
  'long-skill': {
    message: 'SKILL.md of “{label}”: {n} lines (recommended max {max}).',
    fix: 'Keep the steps in SKILL.md and move details into reference files, read only when a step asks for them.',
  },
  'no-workflow': {
    message: '“{label}”: no numbered steps.',
    fix: 'Write the procedure as ordered steps (1., 2., 3.): Claude follows them in order instead of guessing.',
  },
  'no-verification': {
    message: '“{label}”: no verification step.',
    fix: 'End with a concrete check (test command, measurable criterion) so Claude verifies its result.',
  },
  empty: { message: '“{label}” is empty.', fix: 'Write the content or disable the item.' },
  'no-paths': { message: '“{label}”: “paths” scope with no glob.', fix: 'Add a glob, e.g. `src/api/**/*.ts`.' },
  'bad-glob': {
    message: 'Glob “{glob}”: must be relative to the root, with no spaces.',
    fix: 'Write `src/**/*.ts`, not `/src/...`.',
  },
  'no-dir': { message: '“{label}”: “folder” scope with no folder.', fix: 'Set the folder, e.g. `apps/api`.' },
  'dir-glob': { message: '“{dir}” is a glob, not a folder.', fix: 'Use the “paths” scope for a glob.' },
  'heavy-rule': {
    message: '“{label}”: {n} lines loaded in every session.',
    fix: 'If it is an occasional procedure, make it a skill (loaded on demand).',
  },
  'linter-job': {
    message: '“{label}” describes formatting.',
    fix: 'Hand this to the formatter/linter + a PostToolUse hook. Don’t ask the LLM to do a linter’s job.',
  },
  'command-not-exact': {
    message: '“{label}”: no exact command in backticks.',
    fix: 'Write the full command, e.g. `pnpm test -- path/to/file`.',
  },
  'bad-name': {
    message: 'Invalid name “{name}”.',
    fix: 'kebab-case: lowercase letters, digits and hyphens, 64 characters max.',
  },
  'no-description': {
    message: '“{label}” has no description.',
    fix: 'Describe what AND when to use it: this is what Claude reads to decide.',
  },
  'short-description': {
    message: 'Description of “{label}” is too short to trigger at the right time.',
    fix: 'Add “Use when…” with the triggering situations.',
  },
  'long-description': {
    message: 'Description of “{label}” > 1024 characters.',
    fix: 'Summarize; put the details in the body.',
  },
  'hook-no-command': {
    message: 'Hook “{label}” has no command.',
    fix: "E.g. `jq -r '.tool_input.file_path' | xargs pnpm exec prettier --write`.",
  },
  'hook-event': { message: 'Hook “{label}”: unknown event.', fix: 'Choose from {events}.' },
  'hook-matcher': {
    message: 'Hook “{label}” runs after every tool.',
    fix: 'Restrict it with a matcher, e.g. `Edit|Write`.',
  },
  duplicate: { message: 'Line duplicated with “{title}”: “{line}”.', fix: 'Keep a single source of truth.' },
  contradiction: {
    message: '`{span}` is both required (“{allowed}”) and forbidden (“{denied}”).',
    fix: 'Clarify when each one applies, or delete one of the two rules.',
  },
  'package-manager': {
    message: 'Several package managers: {managers}.',
    fix: 'Keep only one; otherwise Claude will pick at random.',
  },
  'no-rules': {
    message: 'No active rules: nothing to send to Claude.',
    fix: 'Add a rule, start from a pattern or import a CLAUDE.md.',
  },
  'no-commands': {
    message: 'No build/test/lint command in the root memory.',
    fix: 'Add a “Commands” rule: install, dev, test, single test, lint, typecheck, build.',
  },
  'no-context': {
    message: 'Project description or stack missing.',
    fix: 'One sentence on the “what” and the stack help Claude with ambiguous cases.',
  },
  'no-hooks': {
    message: 'No hooks: format and lint rely on the model’s goodwill.',
    fix: 'Add a PostToolUse `Edit|Write` hook that runs the formatter.',
  },
  'no-deny': { message: 'No denied permissions.', fix: 'E.g. deny `Read(./.env)` and `Read(./secrets/**)`.' },
  'too-many-critical': {
    message: '{n} critical rules: beyond {max}, nothing stands out anymore.',
    fix: 'Keep critical only the most often forgotten instructions (tests before handing back, commit format).',
  },
  'local-gitignore': {
    message: 'CLAUDE.local.md must stay out of the repository.',
    fix: 'Check that `.gitignore` contains `CLAUDE.local.md`.',
  },
  collision: { message: '{n} items generate {path}.', fix: 'Rename one of the items.' },
  'instruction-budget': {
    message: '{n} instructions loaded in every session (budget ≈ {max}).',
    fix: 'Move rules to the “paths” scope or into skills.',
  },
  'broken-import': { message: 'Import @{path} not found.', fix: 'Fix the path or remove the import.' },
  'agents-not-imported': {
    message: 'No neighboring CLAUDE.md imports this file: Claude Code does not read it.',
    fix: 'Add the line `@AGENTS.md` at the top of {dir}CLAUDE.md (create it if needed).',
  },
  'settings-json': { message: 'Invalid JSON.', fix: 'Fix the syntax.' },
};

/** Types de secret (params.kind de « secret »). */
export const secretKindsEn: Record<string, string> = {
  'clé API type sk-': 'sk- style API key',
  'clé AWS': 'AWS key',
  'token GitHub': 'GitHub token',
  'token GitLab': 'GitLab token',
  'token Slack': 'Slack token',
  'clé privée': 'private key',
  'secret en clair': 'plaintext secret',
};
