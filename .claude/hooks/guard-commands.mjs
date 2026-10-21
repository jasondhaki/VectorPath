// PreToolUse hook for Bash/PowerShell. Regex heuristics, not a shell parser (claude-agents_astra.md §10):
// aliases, scripts and command substitution can bypass it. Destructive/external operations ask the human
// for every role; installs and git writes are lead-only; migrations are backend-only.
import { roleFromHook } from "../../scripts/agents/ownership-lib.mjs";

const ASK_ALWAYS = [
  /prisma\s+migrate\s+reset/, /--force-reset/, /git\s+push\b.*(--force|\s-f\b)/, /git\s+reset\s+--hard/,
  /git\s+clean\s+-\w*f/, /\bvercel\b.*(--prod|\bdeploy\b)/, /purge:stale(?!.*--dry-run)/, /eval:capture/,
  /seed:market(?!.*--dry-run)/, /\brm\s+-rf\s+[/~]/, /Remove-Item\b.*-Recurse/,
];
const LEAD_ONLY = [
  /\bnpm\s+(i|install|ci|uninstall|add|update)\b/, /\bnpx\s+shadcn/,
  /\bgit\s+(commit|push|merge|rebase|checkout|switch|stash|tag)\b/,
];
const BACKEND_ONLY = [/prisma\s+migrate\s+(dev|deploy)/, /prisma\s+db\s+(push|execute)/, /db:migrate/, /db:deploy/];

export function decide(role, cmd) {
  if (role.startsWith("unknown:") && /[>|]|\b(npm|npx|git|prisma|node|tsx)\b/.test(cmd)) return ["ask", `unknown agent identity ${role}`];
  if (ASK_ALWAYS.some((re) => re.test(cmd))) return ["ask", "destructive or external operation needs explicit human approval"];
  if (role !== "lead" && LEAD_ONLY.some((re) => re.test(cmd))) return ["deny", `only the lead installs dependencies or writes git state (role: ${role})`];
  if (role !== "backend" && BACKEND_ONLY.some((re) => re.test(cmd))) return ["deny", `only backend runs migrations (role: ${role})`];
  if (role === "reviewer" && /(>|Set-Content|Out-File|\bsed\s+-i|\btee\b)/.test(cmd)) return ["deny", "reviewer is read-only"];
  return null;
}

if (process.argv[1]?.endsWith("guard-commands.mjs")) {
  let raw = "";
  for await (const chunk of process.stdin) raw += chunk;
  try {
    const input = JSON.parse(raw);
    const verdict = decide(roleFromHook(input), String(input.tool_input?.command ?? ""));
    if (verdict) {
      const [permissionDecision, permissionDecisionReason] = verdict;
      process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision, permissionDecisionReason } }));
    }
  } catch (error) {
    // Exit 2 blocks the call; any other non-zero exit would let it run.
    process.stderr.write(`command guard failed closed (${error instanceof Error ? error.message : "unknown"}).\n`);
    process.exit(2);
  }
}
