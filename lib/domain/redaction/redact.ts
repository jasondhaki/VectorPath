import type { RedactionCategory, RedactionResult } from "@/types/evidence";
import { IN_CITIES, IN_STATES_AND_UTS } from "./gazetteer";

// Contact-detail minimization (architecture §6.2). This is MINIMIZATION, not anonymization: names, employers
// and narrative details remain, and the output is still personal data. Counts only — removed content is never kept.

export const REDACTION_NOTICE =
  "Contact details such as emails, phone numbers, links, handles and address lines are removed before analysis. " +
  "This is minimization, not anonymization: names, employers and other details may remain, and the stored text is still personal data.";

const TOKEN: Record<RedactionCategory, string> = {
  email: "[email removed]",
  phone: "[phone removed]",
  url: "[url removed]",
  handle: "[handle removed]",
  address: "[address removed]",
};

const ORDER: readonly RedactionCategory[] = ["email", "phone", "url", "handle", "address"];

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g;
/** Obfuscated variants: "name [at] host [dot] com", "name(at)host.com". */
const EMAIL_OBFUSCATED = /[A-Za-z0-9._%+-]+\s*[[(]at[\])]\s*[A-Za-z0-9-]+(?:(?:\s*[[(]dot[\])]\s*|\.)[A-Za-z0-9-]+)+/gi;
const URL_END = "[^\\s<>\"'()\\[\\]{}]*[^\\s<>\"'()\\[\\]{}.,;:!?]";
const URL = new RegExp(`\\b(?:https?://|www\\.)${URL_END}`, "gi");
/** Bare profile links without a scheme; generic dotted terms such as Node.js or ASP.NET are left alone. */
const PROFILE_URL = new RegExp(
  `\\b(?:linkedin\\.com|github\\.com|gitlab\\.com|bitbucket\\.org|twitter\\.com|x\\.com|facebook\\.com|fb\\.com|instagram\\.com|behance\\.net|dribbble\\.com|medium\\.com|t\\.me|wa\\.me)/${URL_END}`,
  "gi",
);
/** Personal-site hosts: subdomains of hosting/profile platforms, with or without a path. */
const PERSONAL_HOST = new RegExp(
  `\\b[A-Za-z0-9-]+(?:\\.[A-Za-z0-9-]+)*\\.(?:github\\.io|gitlab\\.io|vercel\\.app|netlify\\.app|pages\\.dev|web\\.app|firebaseapp\\.com|herokuapp\\.com|wordpress\\.com|blogspot\\.com|wixsite\\.com|carrd\\.co|notion\\.site)\\b(?:/${URL_END})?`,
  "gi",
);
/**
 * Bare personal domains: "JaneDoe.dev", "name.me" anywhere (case-insensitive — no tech names use these TLDs), or a
 * lowercase "name.com/path" with a path (case-sensitive so ASP.NET/Core-style skill terms survive). .io/.js are not
 * listed, so Node.js and Socket.IO are untouched.
 */
const BARE_PERSONAL_TLD = new RegExp(`(?<![\\w.@/-])[a-z0-9-]+(?:\\.[a-z0-9-]+)*\\.(?:dev|me|page|site)\\b(?:/${URL_END})?`, "gi");
const BARE_DOMAIN_PATH = new RegExp(`(?<![\\w.@/-])[a-z0-9-]+\\.(?:com|org|net|co|com\\.bd|co\\.uk|co\\.in|in|bd|uk)/${URL_END}`, "g");
/** @handles; npm scopes such as @angular/core are package names, not handles. */
const HANDLE = /(?<![\w@.])@[A-Za-z0-9_](?:[A-Za-z0-9_.]{0,38}[A-Za-z0-9_])?(?![\w/])/g;

// ---- Phones ----

/** Zero code points of Unicode decimal-digit blocks we map for detection (ASCII, Arabic-Indic, Devanagari, Bengali, …, fullwidth). */
const DIGIT_ZEROS = [0x30, 0x660, 0x6f0, 0x966, 0x9e6, 0xa66, 0xae6, 0xb66, 0xbe6, 0xc66, 0xce6, 0xd66, 0xe50, 0xff10];
const asciiDigits = (s: string): string =>
  Array.from(s, (ch) => {
    const c = ch.codePointAt(0) ?? 0;
    const zero = DIGIT_ZEROS.find((z) => c >= z && c <= z + 9);
    return zero === undefined ? "0" : String(c - zero);
  }).join("");

interface DigitGroup {
  start: number;
  end: number;
  digits: string; // ASCII form, detection only
  /** Start of a "+" and/or "(" prefix that belongs to the number when it starts here. */
  prefixStart: number;
  /** A "+" prefix always starts a new number. */
  plus: boolean;
  international: boolean;
}

const DIGIT_RUN = /\p{Nd}+/gu;
/** Between digit groups of one number: 1–3 chars of space/tab/()./dashes (so "01712  345678" stays one number). */
const GROUP_SEP = /^[ \t().\-‐-―]{1,3}$/;
const WORDISH = /[\p{L}\p{Nd}_]/u;

const isYear = (g: DigitGroup) => g.digits.length === 4 && Number(g.digits) >= 1900 && Number(g.digits) <= 2099;

function digitGroups(line: string): DigitGroup[] {
  const out: DigitGroup[] = [];
  for (const m of line.matchAll(DIGIT_RUN)) {
    const start = m.index;
    const end = start + m[0].length;
    if (WORDISH.test(line.charAt(end))) continue; // e.g. "320neo"
    let prefixStart = start;
    if (line.charAt(prefixStart - 1) === "(") prefixStart--;
    const plus = /[+＋][ \t]?$/.exec(line.slice(Math.max(0, prefixStart - 2), prefixStart));
    if (plus) prefixStart -= plus[0].length;
    const before = line.slice(0, prefixStart);
    if (before.length > 0 && (WORDISH.test(before.slice(-1)) || /[+＋]$/.test(before))) {
      if (prefixStart === start) continue; // glued to a word, e.g. "A320"
      prefixStart = start;
    }
    const digits = asciiDigits(m[0]);
    const hasPlus = plus !== null && prefixStart < start && /[+＋]/.test(line.slice(prefixStart, start));
    out.push({ start, end, digits, prefixStart, plus: hasPlus, international: hasPlus || digits.startsWith("00") });
  }
  return out;
}

/** Chains of groups joined only by short phone separators on one line. */
function chains(line: string, groups: DigitGroup[]): DigitGroup[][] {
  const out: DigitGroup[][] = [];
  for (const g of groups) {
    const last = out[out.length - 1];
    const prev = last?.[last.length - 1];
    const sep = prev ? line.slice(prev.end, g.start) : "";
    if (last && prev && GROUP_SEP.test(sep) && !g.plus) last.push(g);
    else out.push([g]);
  }
  return out;
}

/**
 * groups[i..j] form a phone: with a +/00 prefix 8–15 digits (E.164 max 15), otherwise 9–15 (BD mobile 11, BD landline 9,
 * US/UK national 10–11). Without a prefix, runs made only of years and 1–2 digit parts (months, short durations)
 * are dates such as "03.2019 – 06.2021" or "2019 – 2021 (2", not phones.
 */
function isPhoneRun(labelled: boolean, gs: DigitGroup[], i: number, j: number): boolean {
  const first = gs[i];
  if (!first) return false;
  const part = gs.slice(i, j + 1);
  const n = part.reduce((s, g) => s + g.digits.length, 0);
  if (n > 15 || n < (first.international ? 8 : labelled ? 7 : 9)) return false;
  if (!first.international && part.some(isYear) && part.every((g) => isYear(g) || g.digits.length <= 2)) return false;
  return true;
}

/** An explicit phone label directly before a number lowers the minimum to 7 digits (short local numbers). */
const PHONE_LABEL = /(?:\b(?:tel|telephone|phone|ph|mob|mobile|cell|cellphone|whatsapp|fax)\.?|ফোন|মোবাইল)\s*(?:no\.?|number|#)?\s*[:.\-]?\s*$/iu;
/** Find phone spans in one line. Over-long merged runs are re-scanned so adjacent phones are each redacted. */
function phoneSpans(line: string): Array<[number, number]> {
  const spans: Array<[number, number]> = [];
  for (const gs of chains(line, digitGroups(line))) {
    const labelled = gs[0] !== undefined && PHONE_LABEL.test(line.slice(0, gs[0].prefixStart));
    let i = 0;
    while (i < gs.length) {
      // At most 15 digits, so at most 15 groups: keeps the scan linear on long number tables.
      let j = Math.min(gs.length - 1, i + 14);
      while (j >= i && !isPhoneRun(labelled, gs, i, j)) j--;
      if (j < i) {
        i++;
        continue;
      }
      // Drop a leading/trailing year joined by whitespace when the rest is still a phone ("2019 01712345678").
      const sepWs = (a: DigitGroup, b: DigitGroup) => /^[ \t]+$/.test(line.slice(a.end, b.start));
      let gi = gs[i];
      let gn = gs[i + 1];
      while (i < j && gi && gn && isYear(gi) && !gi.international && sepWs(gi, gn) && isPhoneRun(labelled, gs, i + 1, j)) {
        i++;
        gi = gs[i];
        gn = gs[i + 1];
      }
      let gj = gs[j];
      let gp = gs[j - 1];
      // Never trim an international (+/00) number: a trailing "2001" there is part of the number.
      while (j > i && gj && gp && !gs[i]?.international && isYear(gj) && /[ \t]/.test(line.slice(gp.end, gj.start)) && isPhoneRun(labelled, gs, i, j - 1)) {
        j--;
        gj = gs[j];
        gp = gs[j - 1];
      }
      const a = gs[i];
      const b = gs[j];
      if (a && b) spans.push([a.prefixStart, b.end]);
      i = j + 1;
    }
  }
  return spans;
}

function redactPhones(text: string, counts: Record<RedactionCategory, number>): string {
  return text
    .split("\n")
    .map((line) => {
      let out = line;
      for (const [s, e] of phoneSpans(line).reverse()) {
        out = out.slice(0, s) + TOKEN.phone + out.slice(e);
        counts.phone++;
      }
      return out;
    })
    .join("\n");
}

// ---- Addresses ----

const ADDRESS_LABEL = /^\s*(?:(?:present|permanent|home|mailing|current|postal)\s+)?address\s*[:\-]/i;
const ADDRESS_PART =
  /\b(?:house|road|rd|flat|apt|apartment|street|plot|holding|ward|lane|avenue)\b\.?\s*(?:no\.?\s*)?[#:]?\s*\d+[A-Za-z]?\b/gi;
/**
 * A street segment at the start of a line: optional "Flat 3B," unit, then "22 Baker Street", "1600 Pennsylvania
 * Avenue NW" or "55 MG Road" (capitalized or all-caps words). Activity phrases such as "Organised 2 Blood Donation
 * Drive" do not start with the number, so they never match.
 */
const STREET_START =
  /^\s*(?:(?:flat|apt|apartment|suite)\s*#?\s*\d+[A-Za-z]?,\s*)?\d+[A-Za-z]?,?\s+(?:[A-Z][A-Za-z]*\.?\s+){1,4}(?:Street|St|Road|Rd|Avenue|Ave|Lane|Ln|Drive|Dr|Boulevard|Blvd|Way|Close|Court|Ct|Place|Pl|Crescent|Terrace|Square|Marg)\b\.?(?:\s+(?:NW|NE|SW|SE|N|S|E|W)\b)?/;
/** "Flat 3B, Rose Court" — a dwelling unit with a number, then a comma tail. */
const UNIT_START = /^\s*(?:flat|apt|apartment|suite)\s*#?\s*\d+[A-Za-z]?\s*,\s*\S/i;
/**
 * UK postcode after a place name, at line end or before a comma ("London NW1 6XE", "…, London NW1 6XE, UK").
 * Case-sensitive; a size unit is never a postcode ("EC2 4GB", "M1 8GB", "PS4 1TB").
 */
const UK_POSTCODE = /\b[A-Z][a-z]+,?\s+[A-Z]{1,2}\d[A-Z\d]?\s\d(?!(?:KB|MB|GB|TB)\b)[A-Z]{2}\s*(?:,|$)/;
const US_STATES =
  "AL|AK|AZ|AR|CA|CO|CT|DE|DC|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY";
/** "Washington, DC 20500", "Springfield IL 62701-1234": city word, state code, ZIP(+4). */
const US_ZIP = new RegExp(`\\b[A-Z][a-z]+,?\\s+(?:${US_STATES})\\s+\\d{5}(?:-\\d{4})?\\b`);
/** Indian 6-digit PIN after a city at line end ("Bengaluru 560001", "Mumbai - 400001", "Bengaluru, 560001"). */
const IN_PIN = /\b[A-Z][a-z]+(?:\s*,\s*|\s*-\s*|\s+)[1-9]\d{5}\s*\.?\s*$/;
/** Strong form: the comma sits directly between the city and the PIN ("Bengaluru, 560001"). */
const IN_PIN_STRONG = /\b[A-Z][a-z]+\s*,\s*[1-9]\d{5}\s*\.?\s*$/;
/** BD rural/administrative labels: "Vill:", "P.O:", "Upazila:", "Thana:", "Dist:" — not "District-level"/"Union-wide". */
const BD_LABEL = /\b(?:vill(?:age)?|p\.\s?o\.?|post\s+office|upazila|upozila|thana|dist(?:rict)?|union)\s*(?::|-(?!(?:level|wide|based)\b))/gi;
const HEADING = /^\s*(?:[A-Z][A-Z &/]{2,}|[^:]{1,40}:)\s*$/;

/** A line that is only a street segment ("22 Baker Street"): an address when next to another address/postcode line. */
function isBareStreetLine(line: string): boolean {
  const m = STREET_START.exec(line);
  return m !== null && line.slice(m[0].length).trim().length === 0;
}

/**
 * "Indiranagar, Bengaluru 560038", "Koramangala 5th Block, Bengaluru 560095": a comma among the place-name tokens
 * before the PIN and no other number on the line except a leading house/plot number or ordinals (5th Block).
 * "Covered 20 schools, Students 120000" has another number, so it stays weak. Errs toward redaction.
 */
const UNIT_NUMBER =
  /(?:\bh\.?\s?no\.?|\bdoor\s*no\.?|\bplot\s*no\.?|\b(?:sector|plot|block|phase|house|flat|apt|apartment|suite|road\s*no\.?|lane|ward|holding(?:\s*no\.?)?))\s*[#:.]?\s*(?:[A-Za-z]?-?\d+[A-Za-z]?(?:[/-]\d+[A-Za-z]?)*|[A-Z]\b)/gi;
/** A bare house ID: 12, 12A, B-12, 7/3, 4-1-12. */
const HOUSE_ID = /(?:^|(?<=[\s,]))[A-Za-z]?-?\d+[A-Za-z]?(?:[/-]\d+[A-Za-z]?)*(?=[\s,]|$)/g;

/**
 * A unit-only line ("Flat 3B", "B-12, Sector 62", "Block C, Flat 302", "H.No. 4-1-12"): weak, confirmed only by an
 * adjacent line already removed as an address. Any other word keeps it out ("Led Sector 62 expansion team of 14").
 */
const UNIT_LED = new RegExp(`^\\s*(?:${UNIT_NUMBER.source})\\s*,`, "i");

function isUnitOnlyLine(line: string): boolean {
  if (!/\d/.test(line)) return false;
  // "Door No 12/3, Anna Nagar": a unit token then a comma also counts (still needs a removed neighbour).
  if (UNIT_LED.test(line)) return true;
  return line.replace(UNIT_NUMBER, "").replace(HOUSE_ID, "").replace(/[\s,]/g, "").length === 0;
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const GAZETTEER_NAMES = [...new Set([...IN_STATES_AND_UTS, ...IN_CITIES])]
  .sort((a, b) => b.length - a.length)
  .map((n) => escapeRe(n).replace(/ /g, "\\s+"))
  .join("|");
/** "<gazetteer place>[,] <PIN 1xxxxx–8xxxxx>[, India]" at line end: strong regardless of other numbers on the line. */
const IN_GAZETTEER_PIN = new RegExp(`(?<!\\p{L})(?:${GAZETTEER_NAMES})\\s*[,-]?\\s*[1-8]\\d{5}(?:\\s*,\\s*India)?\\s*\\.?\\s*$`, "iu");

function isCommaPlaceLine(line: string): boolean {
  const beforePin = line.replace(/[1-9]\d{5}\s*\.?\s*$/, "");
  if (!beforePin.includes(",")) return false;
  const rest = beforePin
    .replace(/^\s*[A-Za-z]?-?\d+[A-Za-z]?(?:\/\d+[A-Za-z]?)?(?=[\s,])/, "") // leading house ID: 12, 12A, B-12, 7/3
    .replace(UNIT_NUMBER, "") // Sector 62, Plot 7, Road No. 5 …
    .replace(/\b\d+(?:st|nd|rd|th)\b/gi, "");
  return !/\d/.test(rest);
}

/** Postcode/city lines; an IN PIN without a comma counts only next to another address line (weak). */
function postcodeStrength(line: string): "strong" | "weak" | null {
  if (UK_POSTCODE.test(line) || US_ZIP.test(line) || IN_GAZETTEER_PIN.test(line)) return "strong";
  if (IN_PIN.test(line)) return IN_PIN_STRONG.test(line) || isCommaPlaceLine(line) ? "strong" : "weak";
  return null;
}

function isAddressLine(line: string): boolean {
  if (ADDRESS_LABEL.test(line) || UNIT_START.test(line) || postcodeStrength(line) === "strong") return true;
  const street = STREET_START.exec(line);
  if (street && /^\s*,/.test(line.slice(street[0].length))) return true;
  const parts = line.match(ADDRESS_PART) ?? [];
  if (parts.length >= 2 && /^\s*(?:house|road|rd|flat|apt|apartment|plot|holding)\b/i.test(line)) return true;
  const bd = line.match(BD_LABEL) ?? [];
  return bd.length >= 2 || (bd.length === 1 && /^\s*(?:vill|p\.\s?o|post\s+office|upazila|upozila|thana|dist|union)/i.test(line));
}

/** A bare "Address:" label with nothing (or little) after it continues on following lines. */
const isBareLabel = (line: string) => ADDRESS_LABEL.test(line) && line.replace(ADDRESS_LABEL, "").trim().length === 0;
const MAX_CONTINUATION_LINES = 3;

function redactAddresses(text: string, counts: Record<RedactionCategory, number>): string {
  const lines = text.split("\n");
  // Header blocks: a weak line (bare street or weak PIN) is confirmed only by an adjacent strong address line or an
  // adjacent weak line of the OTHER kind — two street-like or two PIN-like lines never confirm each other.
  const strong = lines.map(isAddressLine);
  const soft = lines.map((l): "street" | "pin" | null =>
    isBareStreetLine(l) ? "street" : postcodeStrength(l) === "weak" ? "pin" : null,
  );
  const confirmed = lines.map((_, k) => {
    const kind = soft[k];
    if (strong[k] === true) return true;
    if (kind === null || kind === undefined) return false;
    return [k - 1, k + 1].some((n) => {
      const other = soft[n];
      return strong[n] === true || (other !== null && other !== undefined && other !== kind);
    });
  });
  // Lone unit lines ride on an adjacent line already removed as an address.
  const flagged = lines.map((l, k) => confirmed[k] === true || (isUnitOnlyLine(l) && [k - 1, k + 1].some((n) => confirmed[n] === true)));
  let continuation = 0;
  return lines
    .map((line, k) => {
      const blank = line.trim().length === 0;
      const contactLine = /^\s*(?:tel|telephone|phone|mob|mobile|cell|whatsapp|fax|e-?mail)\b/i.test(line);
      const cont = continuation > 0 && !blank && !contactLine && !HEADING.test(line) && !line.includes("[");
      continuation = cont ? continuation - 1 : 0;
      if (!cont && !flagged[k]) return line;
      if (isBareLabel(line)) continuation = MAX_CONTINUATION_LINES;
      if (!cont) counts.address++;
      const indent = /^\s*/.exec(line)?.[0] ?? "";
      return indent + TOKEN.address + (line.endsWith("\r") ? "\r" : "");
    })
    .join("\n");
}

export function redactContacts(input: string): RedactionResult {
  const counts: Record<RedactionCategory, number> = { email: 0, phone: 0, url: 0, handle: 0, address: 0 };
  const sub = (text: string, re: RegExp, cat: RedactionCategory) =>
    text.replace(re, () => {
      counts[cat]++;
      return TOKEN[cat];
    });

  let text = sub(input, EMAIL, "email");
  text = sub(text, EMAIL_OBFUSCATED, "email");
  text = sub(text, URL, "url");
  text = sub(text, PROFILE_URL, "url");
  text = sub(text, PERSONAL_HOST, "url");
  text = sub(text, BARE_PERSONAL_TLD, "url");
  text = sub(text, BARE_DOMAIN_PATH, "url");
  text = sub(text, HANDLE, "handle");
  // Addresses first, so a US ZIP+4 ("62701-1234") is part of its address line rather than a phone.
  text = redactAddresses(text, counts);
  text = redactPhones(text, counts);

  return { text, removed: ORDER.filter((c) => counts[c] > 0).map((category) => ({ category, count: counts[category] })) };
}
