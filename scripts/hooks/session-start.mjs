// Prints a short session primer. SessionStart hook output is added to the model's context.
const lines = [
  "Stepkite session primer.",
  "Memory: read project-status-* in the project memory first. It lists what is done, what is unverified, and the next session. One feature per session.",
  "Docs: read docs/RULES.md before any new feature. Read other docs only when the task needs them. Use Grep and line ranges, not whole files.",
  "Before writing Next.js code, read the matching guide in node_modules/next/dist/docs/ (AGENTS.md).",
  "Skills by task: any UI work needs emil-design-eng; UI design choices may use ui-ux-pro-max (web rules only); user-facing text needs copy-editor and humanizer; screens with user data need break-ui; mobile layouts need mobile-native; animation needs review-animations.",
  "Agents by task: tax-engine, ui-builder, seo-content, copy-editor, test-runner, reviewer, plus the global typescript-reviewer, react-reviewer, security-reviewer, database-reviewer. The CLAUDE.md table says which must run.",
  "Shell: prefix commands with rtk (git, pnpm, tests). Rerun a failing command with rtk proxy to see full output.",
  "Chat replies: caveman style. Never for site text, guides or emails.",
];
process.stdout.write(lines.join("\n") + "\n");
