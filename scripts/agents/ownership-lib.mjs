// Shared ownership resolver for the PreToolUse hook and the diff audit (claude-agents_astra.md §10).
// Guardrail only: shell writes and unknown tooling can bypass it.
import { readFileSync, realpathSync, existsSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";

const globToRegex = (glob) =>
  new RegExp(
    `^${glob
      .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
      .replace(/\*\*/g, "\u0000")
      .replace(/\*/g, "[^/]*")
      .replace(/\u0000/g, ".*")}$`,
  );
const specificity = (glob) => glob.replace(/\*/g, "").length;
// The nine playbook roles (claude-agents_astra.md §3); also listed in .claude/ownership.json.
const ROLES = ["lead", "backend", "data", "domain", "frontend", "reviewer", "qa", "debugger", "scribe"];

const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;
const isStrings = (v) => Array.isArray(v) && v.length > 0 && v.every((s) => typeof s === "string" && s.length > 0);

/** Throws on any malformed entry so callers (hook, audit) fail closed instead of honoring a bad rule or grant. */
export function validateOwnership(config) {
  const fail = (msg) => {
    throw new Error(`invalid .claude/ownership.json: ${msg}`);
  };
  if (!isStrings(config?.roles) || !config.roles.every((r) => ROLES.includes(r))) fail("roles");
  const known = (r) => config.roles.includes(r);
  if (!Array.isArray(config.rules)) fail("rules");
  for (const r of config.rules) if (!known(r?.owner) || !isStrings(r.paths)) fail(`rule ${JSON.stringify(r?.owner)}`);
  for (const e of config.exclusions ?? []) if (typeof e?.path !== "string" || !known(e.notOwner)) fail("exclusion");
  for (const g of config.grants ?? []) {
    if (!known(g?.role) || typeof g.bug !== "string" || !isStrings(g.paths)) fail(`grant ${JSON.stringify(g?.bug)}`);
    // Strict ISO instant: Date.parse alone accepts "9999", which would make a grant permanent.
    if (!ISO_INSTANT.test(String(g.expires)) || Number.isNaN(Date.parse(g.expires))) fail(`grant ${g.bug} expiry ${JSON.stringify(g.expires)}`);
  }
  return config;
}

export function loadOwnership(root) {
  return validateOwnership(JSON.parse(readFileSync(resolve(root, ".claude/ownership.json"), "utf8")));
}

/** Canonical repo-relative POSIX path, or null when it escapes the root. Case-folded on Windows. */
export function canonicalize(root, filePath, platform = process.platform) {
  const abs = resolve(root, filePath);
  // Resolve junctions/symlinks through the nearest existing ancestor.
  let probe = abs;
  while (!existsSync(probe) && dirname(probe) !== probe) probe = dirname(probe);
  const real = existsSync(probe) ? resolve(realpathSync.native(probe), relative(probe, abs)) : abs;
  const realRoot = existsSync(root) ? realpathSync.native(root) : root;
  const rel = relative(realRoot, real);
  if (rel === "" || rel.startsWith("..") || isAbsolute(rel)) return null;
  const segments = rel.split(sep);
  // NTFS alternate data streams (a:b, ::$DATA) and trailing dot/space aliases resolve to other files.
  if (platform === "win32" && segments.some((s) => s.includes(":") || /[. ]$/.test(s))) return null;
  const posix = segments.join("/");
  return platform === "win32" ? posix.toLowerCase() : posix;
}

/** Returns { owner, grant? } or { error } for a canonical path at time `now` (ISO string). */
export function resolveOwner(config, path, now = new Date().toISOString(), platform = process.platform) {
  const fold = (s) => (platform === "win32" ? s.toLowerCase() : s);
  const hit = (glob) => globToRegex(fold(glob)).test(path);
  // Date comparison, not string comparison; an unparseable expiry or clock is treated as expired.
  const nowMs = Date.parse(now);
  const grants = (config.grants ?? []).filter((g) => Date.parse(g.expires) > nowMs && g.paths.some(hit));
  if (grants.length > 1) return { error: `overlapping active grants for ${path}` };
  if (grants.length === 1) return { owner: grants[0].role, grant: grants[0].bug };
  const excluded = new Set((config.exclusions ?? []).filter((e) => hit(e.path)).map((e) => e.notOwner));
  let best = [];
  let bestScore = -1;
  for (const rule of config.rules) {
    if (excluded.has(rule.owner)) continue;
    for (const glob of rule.paths) {
      if (!hit(glob)) continue;
      const score = specificity(glob);
      if (score > bestScore) {
        best = [rule.owner];
        bestScore = score;
      } else if (score === bestScore && !best.includes(rule.owner)) best.push(rule.owner);
    }
  }
  if (best.length === 0) return { error: `no owner for ${path}` };
  if (best.length > 1) return { error: `conflicting owners ${best.join(", ")} for ${path}` };
  return { owner: best[0] };
}

/** A grant replaces the owner for its paths, so the original owner is paused while it is active. */
export function canWrite(config, root, role, filePath, now) {
  const path = canonicalize(root, filePath);
  if (path === null) return { ok: false, reason: `path outside project root: ${filePath}` };
  if (!config.roles.includes(role)) return { ok: false, reason: `unknown role identity: ${role}` };
  const result = resolveOwner(config, path, now);
  if (result.error) return { ok: false, reason: result.error };
  if (result.owner !== role) return { ok: false, reason: `${path} is owned by ${result.owner}, not ${role}` };
  return { ok: true, path };
}

/** Only an absent agent_type is the main session (lead); only an exact vp-<role> maps to a role; all else is unknown. */
export function roleFromHook(input) {
  if (!("agent_type" in input) || input.agent_type === undefined) return "lead";
  const match = typeof input.agent_type === "string" ? /^vp-([a-z]+)$/.exec(input.agent_type) : null;
  return match?.[1] && ROLES.includes(match[1]) ? match[1] : `unknown:${String(input.agent_type)}`;
}
