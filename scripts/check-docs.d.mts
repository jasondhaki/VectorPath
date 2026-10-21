export declare function linkTargets(text: string): string[];
export declare function headingSlugs(text: string): Set<string>;
export declare function existsExact(path: string): boolean;
export declare function plannedPaths(treeText: string): Set<string>;
export declare function classifyLink(
  fromFile: string, target: string, planned: Set<string>, exists: (path: string) => boolean,
  anchorsOf?: (path: string) => Set<string> | null,
): "external" | "existing" | "planned" | "broken";
