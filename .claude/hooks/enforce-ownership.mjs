// PreToolUse hook for Write/Edit/MultiEdit/NotebookEdit: one writer per path.
// Exit 2 blocks the call and returns stderr to the model. Fails closed on bad input.
import { canWrite, loadOwnership, roleFromHook } from "../../scripts/agents/ownership-lib.mjs";

let raw = "";
for await (const chunk of process.stdin) raw += chunk;
try {
  const input = JSON.parse(raw);
  const target = input.tool_input?.file_path ?? input.tool_input?.notebook_path;
  if (typeof target !== "string") throw new Error("write target missing from hook input");
  const root = process.env.CLAUDE_PROJECT_DIR ?? input.cwd ?? process.cwd();
  const verdict = canWrite(loadOwnership(root), root, roleFromHook(input), target);
  if (!verdict.ok) {
    process.stderr.write(`ownership: ${verdict.reason}. Send a REQUEST to the lead instead.\n`);
    process.exit(2);
  }
} catch (error) {
  process.stderr.write(`ownership: hook failed closed (${error instanceof Error ? error.message : "unknown"}).\n`);
  process.exit(2);
}
