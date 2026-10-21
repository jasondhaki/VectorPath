// Diff audit: every actually changed path (staged, unstaged, untracked, renames, deletions, or a branch
// diff with --base <rev>) must resolve to exactly one owner; with --role <r>, to that role; with
// --declared <file>, must appear in that handoff path list (one path per line).
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { canonicalize, loadOwnership, resolveOwner } from "./ownership-lib.mjs";

/** git status --porcelain=v1 -z: "XY path\0" with renames followed by "orig\0". */
export function parsePorcelainZ(out) {
  const parts = out.split("\0").filter(Boolean);
  const changes = [];
  for (let i = 0; i < parts.length; i++) {
    const status = parts[i].slice(0, 2);
    const path = parts[i].slice(3);
    if (/[RC]/.test(status)) changes.push({ status, path, from: parts[++i] });
    else changes.push({ status, path });
  }
  return changes;
}

/** git diff --name-status -z: "S\0path\0" or "Rnn\0from\0to\0". */
export function parseNameStatusZ(out) {
  const parts = out.split("\0").filter(Boolean);
  const changes = [];
  for (let i = 0; i < parts.length; i++) {
    const status = parts[i];
    if (/^[RC]/.test(status)) {
      changes.push({ status, from: parts[i + 1], path: parts[i + 2] });
      i += 2;
    } else changes.push({ status, path: parts[++i] });
  }
  return changes;
}

export function audit(changes, config, root, { role, declared } = {}) {
  const problems = [];
  const lines = [];
  for (const c of changes) {
    for (const p of [c.path, c.from].filter(Boolean)) {
      const path = canonicalize(root, p);
      const result = path === null ? { error: `outside root: ${p}` } : resolveOwner(config, path);
      lines.push(`${c.status.trim() || "?"} ${p} -> ${result.owner ?? "UNOWNED"}`);
      if (result.error) problems.push(result.error);
      else if (role && result.owner !== role) problems.push(`${p} owned by ${result.owner}, not ${role}`);
      if (declared && !declared.has(path)) problems.push(`undeclared change: ${p}`);
    }
  }
  return { lines, problems };
}

if (process.argv[1]?.endsWith("check-ownership.mjs")) {
  const args = process.argv.slice(2);
  const opt = (name) => {
    const i = args.indexOf(name);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const root = process.cwd();
  const git = (...a) => execFileSync("git", a, { encoding: "utf8" });
  const base = opt("--base");
  const changes = base
    ? parseNameStatusZ(git("diff", "--name-status", "-z", "-M", `${base}...HEAD`))
    : parsePorcelainZ(git("status", "--porcelain=v1", "-z", "--untracked-files=all"));
  const declaredFile = opt("--declared");
  const declared = declaredFile
    ? new Set(readFileSync(declaredFile, "utf8").split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((p) => canonicalize(root, p)))
    : undefined;
  const { lines, problems } = audit(changes, loadOwnership(root), root, { role: opt("--role"), declared });
  console.log(lines.join("\n"));
  if (problems.length) {
    console.error(`\nOwnership audit FAILED:\n${problems.join("\n")}`);
    process.exit(1);
  }
  console.log(`\nOwnership audit passed: ${changes.length} changed entries.`);
}
