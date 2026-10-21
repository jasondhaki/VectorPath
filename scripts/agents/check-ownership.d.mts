import type { OwnershipConfig } from "./ownership-lib.mjs";

export interface Change { status: string; path: string; from?: string }
export declare function parsePorcelainZ(out: string): Change[];
export declare function parseNameStatusZ(out: string): Change[];
export declare function audit(
  changes: Change[], config: OwnershipConfig, root: string,
  options?: { role?: string; declared?: Set<string | null> },
): { lines: string[]; problems: string[] };
