# How it works

**English** · [Français](how-it-works.fr.md)

## Where each rule goes

| Scope / type       | Generated file                              | Loaded                          |
| ------------------ | ------------------------------------------- | ------------------------------- |
| Project            | `CLAUDE.md` (or `AGENTS.md` + `@AGENTS.md`) | always                          |
| Topic              | `.claude/rules/<category>.md`               | always                          |
| Paths              | `.claude/rules/<name>.md` + `paths:`        | when Claude touches those files |
| Folder             | `<folder>/CLAUDE.md`                        | when Claude works inside it     |
| Personal, project  | `CLAUDE.local.md` (gitignored)              | personal                        |
| Personal, global   | `~/.claude/CLAUDE.md` (`_home/` in the zip) | personal                        |
| Skill              | `.claude/skills/<name>/SKILL.md`            | on demand                       |
| Slash command      | `.claude/commands/<name>.md`                | on demand                       |
| Subagent           | `.claude/agents/<name>.md`                  | on demand                       |
| Hook / permissions | `.claude/settings.json`                     | run by the harness              |

A project rule marked **Critical** goes at the top of `CLAUDE.md` and is repeated in a "Rappels" (reminders) section at the end of the file (primacy and recency bias). Generated files are in French.

## Quality check

Scale: error −15, warning −5, suggestion −1.

- **Errors**: no active rule (score 0), likely secret, scope without a target, invalid skill/agent name, skill without a description, hook without a command, file collision.
- **Warnings**: root file > 100 lines (error > 200), vague wording, duplicates, contradictions (`X` both required and forbidden), several package managers, commands without backticks, budget of ~150 always-loaded instructions exceeded, more than 3 critical rules.
- **Suggestions**: style a linter should handle, long rule better as a skill, large copied code block, prohibition without an alternative ("Never…" → say what to do instead), no hook, no `deny`.

## Repository analysis

Score out of 100 (A ≥ 85, B ≥ 70, C ≥ 55, D ≥ 40, E). Criteria that don't apply are left out of the score.

- **Readiness for Claude Code**: root memory, conciseness, exact commands, architecture, secrets, vague rules, valid `@` imports, example files cited (few-shot), modular rules, in a monorepo (pnpm workspace or npm/yarn `workspaces`) per-package memory and targeted commands, permissions, hooks, skills/commands, agents, gitignored personal files.
- **Repository best practices**: README, tests, linter, formatter, typing, CI, lockfile, `.gitignore` / `.env.example`.

## Where my data is

Analyses and projects are stored in a local SQLite database, in the user's configuration folder:

- macOS: `~/Library/Application Support/trusquin/trusquin.db`
- Linux: `~/.config/trusquin/trusquin.db`
- Windows: `%AppData%\trusquin\trusquin.db`

Set the `TRUSQUIN_DB` environment variable to use another path.

## Sources

- [laconsole.dev — fichier CLAUDE.md](https://laconsole.dev/blog/fichier-claude-md) (in French)
- [dev.to — The perfect CLAUDE.md](https://dev.to/jangwook_kim_e31e7291ad98/the-perfect-claudemd-how-to-set-up-your-project-for-agentic-coding-d14)
- Medium — "The Complete Guide to CLAUDE.md"
