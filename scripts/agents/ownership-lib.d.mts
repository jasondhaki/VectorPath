export interface OwnershipConfig {
  roles: string[];
  rules: { owner: string; paths: string[] }[];
  exclusions?: { path: string; notOwner: string }[];
  grants?: { role: string; bug: string; paths: string[]; expires: string }[];
}
export type Resolution = { owner: string; grant?: string; error?: undefined } | { error: string; owner?: undefined };
export declare function validateOwnership(config: unknown): OwnershipConfig;
export declare function loadOwnership(root: string): OwnershipConfig;
export declare function canonicalize(root: string, filePath: string, platform?: string): string | null;
export declare function resolveOwner(config: OwnershipConfig, path: string, now?: string, platform?: string): Resolution;
export declare function canWrite(
  config: OwnershipConfig, root: string, role: string, filePath: string, now?: string,
): { ok: true; path: string } | { ok: false; reason: string };
export declare function roleFromHook(input: { agent_type?: unknown }): string;
