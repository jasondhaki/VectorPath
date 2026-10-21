import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Boundary matrix (code-standards_astra.md §3). Each file group gets exactly one block per rule
// so later blocks never silently replace earlier ones. Static imports, re-exports and literal
// dynamic import() share the same patterns; non-literal import() is rejected in boundary code.

const SEG = "(\\./)*"; // tolerate ./ segments
const EXT = "(\\.[cm]?[jt]sx?)?$";
const libDir = (dir) => `^(@/${SEG}lib/|${SEG}(\\.\\./)+${SEG}(lib/)?)${SEG}${dir}(/|${EXT})`;
const ban = (regex, message) => ({ regex, message });

const DB_DRIVER = ban("^@prisma/|^prisma$|^pg$|^pg-|^postgres$", "Database drivers are only allowed in lib/db/.");
const MODEL_SDK = ban("^ai$|^@ai-sdk/|^@google/(genai|generative-ai)$", "Model SDKs are only allowed in lib/llm/ and lib/embeddings/.");
const ENV = ban(`(^@/${SEG}lib/|(\\.\\./)+)${SEG}config/env${EXT}`, "Environment access is not allowed here.");
const UI = ban(`^@/${SEG}(app|components)(/|$)|^${SEG}(\\.\\./)+(app|components)/`, "UI code is not importable here.");
const dirs = (names, why) => names.map((d) => ban(libDir(d), `${why} (lib/${d})`));
const ALL_IO_LIBS = ["db", "services", "integrations", "cache", "session", "llm", "embeddings", "retrieval", "parsing"];

const FETCH = { name: "fetch", message: "External HTTP belongs in lib/integrations/." };
const MEMBER_FETCH = { selector: "MemberExpression[object.name=/^(globalThis|self|window|global)$/][property.name='fetch']", message: FETCH.message };
const boundaries = [
  {
    files: ["lib/domain/**"],
    patterns: [
      ...dirs(ALL_IO_LIBS, "Domain is pure"),
      DB_DRIVER, MODEL_SDK, ENV, UI,
      ban("^(node:)?(fs|fs/promises|net|http|https|http2|child_process|os|crypto|dns|tls|dgram|worker_threads|process|perf_hooks|readline|vm|cluster)$|^undici$", "Domain has no I/O."),
      ban("^next(/|$)|^react(-dom)?(/|$)|^server-only$", "Domain is framework-free."),
    ],
    globals: [FETCH, "process", "crypto", "performance", "globalThis", "window", "XMLHttpRequest", "WebSocket", "setTimeout", "setInterval"].map((g) =>
      typeof g === "string" ? { name: g, message: "Domain is pure: inject it." } : g),
    syntax: [
      { selector: "NewExpression[callee.name='Date'][arguments.length=0]", message: "Inject the clock." },
      { selector: "CallExpression[callee.name='Date']", message: "Inject the clock." },
      { selector: "MemberExpression[object.name='Date'][property.name='now']", message: "Inject the clock." },
      { selector: "MemberExpression[object.name='Math'][property.name='random']", message: "Inject randomness." },
      { selector: "ImportExpression", message: "No dynamic imports in domain." },
    ],
  },
  { files: ["types/**"], patterns: [...dirs([...ALL_IO_LIBS, "domain"], "Contracts have no I/O or rules"), DB_DRIVER, MODEL_SDK, ENV, UI, ban("^next(/|$)|^react(-dom)?(/|$)", "Contracts are framework-free.")] },
  { files: ["components/**"], patterns: [...dirs(ALL_IO_LIBS, "Components receive DTOs"), DB_DRIVER, MODEL_SDK, ENV] },
  { files: ["app/**"], patterns: [...dirs(["db", "integrations", "llm", "embeddings", "retrieval", "parsing", "cache"], "Routes call services"), DB_DRIVER, MODEL_SDK] },
  { files: ["lib/services/**"], patterns: [DB_DRIVER, MODEL_SDK, ban(`${libDir("db")}`.replace("db(/|", "db/client("), "Use lib/db query modules, not the client.")], globals: [FETCH] },
  { files: ["lib/integrations/**", "lib/cache/**", "lib/session/**"], patterns: [...dirs(["services"], "No service dependency cycles"), DB_DRIVER, MODEL_SDK] },
  { files: ["lib/llm/**"], patterns: [...dirs(["services"], "Model layer never calls services"), DB_DRIVER] },
  { files: ["lib/embeddings/**"], patterns: [...dirs(["services", "llm"], "Embeddings boundary"), DB_DRIVER] },
  { files: ["lib/retrieval/**"], patterns: [...dirs(["services", "integrations", "llm"], "Retrieval only reads evidence"), DB_DRIVER, MODEL_SDK], globals: [FETCH] },
  { files: ["lib/parsing/**"], patterns: [...dirs(["db", "services", "integrations", "llm", "embeddings"], "Parsing has no persistence"), DB_DRIVER, MODEL_SDK], globals: [FETCH] },
  { files: ["lib/db/**"], patterns: [...dirs(["services", "integrations", "llm", "embeddings"], "DB layer has no provider calls"), MODEL_SDK], globals: [FETCH] },
  { files: ["scripts/**"], patterns: [DB_DRIVER, MODEL_SDK] },
];

// esquery regex literals cannot contain a bare "/".
const esq = (regex) => regex.replace(/\//g, "\\/");
const dynamicImportRules = (patterns) => [
  { selector: "ImportExpression[source.type!='Literal']", message: "Dynamic import() must use a literal path in boundary code." },
  ...patterns.map(({ regex, message }) => ({ selector: `ImportExpression[source.value=/${esq(regex)}/]`, message })),
];

const config = [
  ...nextVitals,
  ...nextTs,
  { ignores: [".next/**", ".next-e2e/**", "node_modules/**", "coverage/**", "playwright-report/**", "test-results/**", ".claude/worktrees/**", "next-env.d.ts", "lib/db/generated/**"] },
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
      "@typescript-eslint/ban-ts-comment": ["error", { "ts-expect-error": true, "ts-ignore": true, "ts-nocheck": true }],
      "@typescript-eslint/consistent-type-imports": "error",
    },
  },
  { linterOptions: { noInlineConfig: true, reportUnusedDisableDirectives: "error" } },
  ...boundaries.map(({ files, patterns, globals, syntax = [] }) => ({
    files,
    rules: {
      "no-restricted-imports": ["error", { patterns }],
      "no-restricted-syntax": ["error", ...syntax, ...(globals?.includes(FETCH) ? [MEMBER_FETCH] : []), ...dynamicImportRules(patterns)],
      ...(globals ? { "no-restricted-globals": ["error", ...globals] } : {}),
    },
  })),
];

export default config;
