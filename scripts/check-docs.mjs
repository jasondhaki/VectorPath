// Docs check: relative links in specs resolve (case-exact, including #anchors) to existing files or to
// paths planned in project-file-tree.md; existing routes are listed in the tree; every planned or existing
// tracked file resolves to exactly one owner in .claude/ownership.json; required docs exist.
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname, normalize, relative, basename } from "node:path";
import { loadOwnership, resolveOwner } from "./agents/ownership-lib.mjs";

const ROOT_DOCS = [
  "CLAUDE.md", "claude-agents_astra.md", "project-file-tree.md", "project-overview_astra.md",
  "architecture_astra.md", "code-standards_astra.md", "ui-context_astra.md",
  "ai-workflow-rules_astra.md", "progress-tracker_astra.md",
];
// Paths that are deliberately unowned: human secrets, generated output, local data.
const UNOWNED = /^(\.env(?!\.example$)(\..*)?|[^/]+\.tsbuildinfo|thumbs\.db|\.ds_store|desktop\.ini|node_modules|\.next|coverage|playwright-report|test-results|data\/(raw|cache)|\.claude\/(worktrees|settings\.local\.json))(\/|$)/;

const slash = (p) => p.replaceAll("\\", "/");
const walk = (dir) => (existsSync(dir) ? readdirSync(dir).flatMap((n) => {
  const p = join(dir, n);
  return statSync(p).isDirectory() ? walk(p) : [p];
}) : []);

/** Markdown link targets, including <angle bracket> targets and links with "titles". */
export function linkTargets(text) {
  const out = [];
  for (const m of text.matchAll(/\]\(\s*(?:<([^>]+)>|([^)\s]+))(?:\s+"[^"]*")?\s*\)/g)) out.push(m[1] ?? m[2]);
  return out;
}

/** GitHub-style heading slugs for anchor validation. */
export function headingSlugs(text) {
  const seen = new Map();
  const slugs = new Set();
  const unfenced = text.replace(/^(```|~~~)[^\n]*\n[\s\S]*?^\1[^\n]*$/gm, "");
  for (const [, heading] of unfenced.matchAll(/^#{1,6}\s+(.+?)\s*#*\s*$/gm)) {
    const base = heading.toLowerCase().replace(/[`*~]/g, "").replace(/[^\p{L}\p{N}\s_-]/gu, "").trim().replace(/\s/g, "-");
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    slugs.add(n === 0 ? base : `${base}-${n}`);
  }
  return slugs;
}

/** Case-exact existence check (Windows/macOS file systems are case-insensitive). */
export function existsExact(path) {
  if (!existsSync(path)) return false;
  let current = path;
  while (current !== "." && current !== dirname(current)) {
    const parent = dirname(current);
    if (!readdirSync(parent === "" ? "." : parent).includes(basename(current))) return false;
    current = parent;
  }
  return true;
}

export function plannedPaths(treeText) {
  return new Set(linkTargets(treeText).map((t) => slash(normalize(t)).replace(/\/$/, "")));
}

export function classifyLink(fromFile, target, planned, exists, anchorsOf = () => null) {
  if (/^[a-z]+:/i.test(target)) return "external";
  const [pathPart, anchor] = target.split("#");
  const path = pathPart === "" ? fromFile : slash(normalize(join(dirname(fromFile), pathPart))).replace(/\/$/, "");
  if (exists(path)) {
    if (!anchor) return "existing";
    const slugs = anchorsOf(path);
    return slugs === null || slugs.has(anchor) ? "existing" : "broken";
  }
  return planned.has(path) ? "planned" : "broken";
}

if (process.argv[1]?.endsWith("check-docs.mjs")) {
  const errors = [];
  for (const d of ROOT_DOCS) if (!existsExact(d)) errors.push(`missing root document ${d}`);
  const planned = plannedPaths(readFileSync("project-file-tree.md", "utf8"));
  const rootMd = readdirSync(".").filter((n) => n.endsWith(".md"));
  const docs = [...new Set([...rootMd, ...[...walk("docs"), ...walk(".claude/agents")].map((p) => slash(relative(".", p))).filter((p) => p.endsWith(".md"))])];
  const anchorsOf = (p) => (p.endsWith(".md") ? headingSlugs(readFileSync(p, "utf8")) : null);
  const counts = { existing: 0, planned: 0, external: 0, broken: 0 };
  for (const doc of docs) {
    for (const target of linkTargets(readFileSync(doc, "utf8"))) {
      const kind = classifyLink(doc, target, planned, existsExact, anchorsOf);
      counts[kind]++;
      if (kind === "broken") errors.push(`${doc}: broken link ${target}`);
    }
  }
  const routes = walk("app").map((p) => slash(relative(".", p))).filter((p) => /\/(page|route|layout)\.tsx?$/.test(p));
  for (const r of routes) if (!planned.has(r)) errors.push(`route ${r} is not listed in project-file-tree.md`);

  // Single-owner check over planned files (paths with an extension) and existing project files.
  const ownership = loadOwnership(".");
  // The tree writes directories with a trailing slash; everything else is a planned file.
  const files = linkTargets(readFileSync("project-file-tree.md", "utf8"))
    .filter((t) => !t.endsWith("/") && !/^[a-z]+:/i.test(t))
    .map((t) => slash(normalize(t)));
  const tracked = ["app", "components", "lib", "types", "scripts", "tests", "docs", "data", "prisma", "eval", "public", ".claude"]
    .flatMap(walk).map((p) => slash(relative(".", p)));
  let ownedCount = 0;
  for (const p of new Set([...files, ...tracked, ...readdirSync(".").filter((n) => statSync(n).isFile())])) {
    if (UNOWNED.test(p.toLowerCase())) continue;
    const result = resolveOwner(ownership, process.platform === "win32" ? p.toLowerCase() : p);
    if (result.error) errors.push(`ownership: ${result.error}`);
    else ownedCount++;
  }

  if (errors.length) {
    console.error(errors.join("\n"));
    process.exit(1);
  }
  console.log(`check-docs: ${docs.length} docs; links existing=${counts.existing} planned=${counts.planned} external=${counts.external}; ${routes.length} routes listed; ${ownedCount} paths single-owned`);
}
