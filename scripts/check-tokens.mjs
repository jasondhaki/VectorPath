// Token lint (ui-context_astra.md §2): app/components may not use raw colors or default palettes.
// Only app/globals.css may define hex values.
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";

const ROOTS = ["app", "components"];
const ALLOW = new Set(["app/globals.css"]);
// CSS named colours (CSS Color 4), used to catch them inside arbitrary brackets.
const NAMED = "aliceblue|antiquewhite|aqua|aquamarine|azure|beige|bisque|black|blanchedalmond|blue|blueviolet|brown|burlywood|cadetblue|chartreuse|chocolate|coral|cornflowerblue|cornsilk|crimson|cyan|darkblue|darkcyan|darkgoldenrod|darkgray|darkgreen|darkgrey|darkkhaki|darkmagenta|darkolivegreen|darkorange|darkorchid|darkred|darksalmon|darkseagreen|darkslateblue|darkslategray|darkslategrey|darkturquoise|darkviolet|deeppink|deepskyblue|dimgray|dimgrey|dodgerblue|firebrick|floralwhite|forestgreen|fuchsia|gainsboro|ghostwhite|gold|goldenrod|gray|green|greenyellow|grey|honeydew|hotpink|indianred|indigo|ivory|khaki|lavender|lavenderblush|lawngreen|lemonchiffon|lightblue|lightcoral|lightcyan|lightgoldenrodyellow|lightgray|lightgreen|lightgrey|lightpink|lightsalmon|lightseagreen|lightskyblue|lightslategray|lightslategrey|lightsteelblue|lightyellow|lime|limegreen|linen|magenta|maroon|mediumaquamarine|mediumblue|mediumorchid|mediumpurple|mediumseagreen|mediumslateblue|mediumspringgreen|mediumturquoise|mediumvioletred|midnightblue|mintcream|mistyrose|moccasin|navajowhite|navy|oldlace|olive|olivedrab|orange|orangered|orchid|palegoldenrod|palegreen|paleturquoise|palevioletred|papayawhip|peachpuff|peru|pink|plum|powderblue|purple|rebeccapurple|red|rosybrown|royalblue|saddlebrown|salmon|sandybrown|seagreen|seashell|sienna|silver|skyblue|slateblue|slategray|slategrey|snow|springgreen|steelblue|tan|teal|thistle|tomato|turquoise|violet|wheat|white|whitesmoke|yellow|yellowgreen";
// Utility prefixes that take a colour.
const COLOR_UTIL = "bg|text|border(?:-[trblxyse])?|ring|ring-offset|fill|stroke|from|to|via|outline|divide|shadow|accent|caret|decoration|placeholder";
// Style/SVG colour properties; the value must be a token var() or a colour keyword, never a literal colour.
const STYLE_PROP = "color|background|backgroundColor|border(?:Top|Right|Bottom|Left|Block|Inline)?Color|borderColor|outlineColor|fill|stroke|caretColor|accentColor|textDecorationColor|columnRuleColor|stopColor|floodColor|lightingColor";
const RULES = [
  [/#[0-9a-fA-F]{3,8}\b/, "raw hex colour"],
  // Preceded by anything but a letter/hyphen, so `shadow-[0_0_0_1px_rgb(...)]` is caught and `getLab(` is not.
  [/(?<![A-Za-z-])(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color-mix|color)\(/, "raw colour function"],
  [new RegExp(`\\b(?:${COLOR_UTIL})-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\\d{2,3}\\b`), "default palette class"],
  [new RegExp(`\\b(?:${COLOR_UTIL})-(?:white|black)\\b`), "white/black class"],
  [new RegExp(`\\[(?:#|rgb|hsl|(?:color:)?(?:${NAMED})\\])`, "i"), "arbitrary colour value"],
  [new RegExp(`\\b(?:${STYLE_PROP})\\s*[:=]\\s*\\{?\\s*["'\`](?!\\s*(?:var\\(|currentcolor\\b|transparent\\b|inherit\\b|initial\\b|unset\\b|none\\b))`, "i"), "literal colour in style prop"],
];

const walk = (dir) => readdirSync(dir).flatMap((name) => {
  const p = join(dir, name);
  return statSync(p).isDirectory() ? (name === "ui" && dir === "components" ? [] : walk(p)) : [p];
});

export function findViolations(file, text) {
  return text.split(/\r?\n/).flatMap((line, i) =>
    RULES.filter(([re]) => re.test(line)).map(([, why]) => `${file}:${i + 1} ${why}`));
}

if (process.argv[1]?.endsWith("check-tokens.mjs")) {
  const files = ROOTS.filter(existsSync).flatMap(walk)
    .map((p) => relative(".", p).replaceAll("\\", "/"))
    .filter((p) => /\.(tsx?|css)$/.test(p) && !ALLOW.has(p));
  const problems = files.flatMap((f) => findViolations(f, readFileSync(f, "utf8")));
  if (problems.length) {
    console.error(`Token violations:\n${problems.join("\n")}`);
    process.exit(1);
  }
  console.log(`check-tokens: ${files.length} files clean`);
}
