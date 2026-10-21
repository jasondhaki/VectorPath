import { describe, expect, it } from "vitest";
import { RedactionResultSchema } from "@/types/evidence";
import { checkTextLimit, TEXT_LIMITS } from "@/lib/domain/redaction/limits";
import { REDACTION_NOTICE, redactContacts } from "@/lib/domain/redaction/redact";

// Synthetic, fictional text only. Phone numbers use reserved/fictional ranges.

const count = (text: string, cat: string) => redactContacts(text).removed.find((r) => r.category === cat)?.count ?? 0;

describe("phone minimization", () => {
  it.each([
    "+8801712345678",
    "+880 1712-345678",
    "+880 1712 345 678",
    "880-1712-345678",
    "008801712345678",
    "01712345678",
    "01712-345678",
    "017 1234 5678",
    "+880 2 9123456",
    "02-9123456",
    "+44 20 7946 0958",
    "020 7946 0958",
    "+1 (415) 555-0123",
    "(415) 555-0123",
    "415.555.0123",
    "+91 98765 43210",
  ])("removes %s", (phone) => {
    const out = redactContacts(`Call ${phone} today`);
    expect(out.text).toBe("Call [phone removed] today");
    expect(out.removed).toEqual([{ category: "phone", count: 1 }]);
  });

  it.each([
    "2018-2021",
    "2015 - 2019 2020",
    "Python 3.11 and ISO 9001:2015",
    "GPA 3.75 out of 4.00",
    "Managed 1200 assets across 45 sites",
    "Joined 01.02.2020",
    "Dhaka-1209",
  ])("keeps non-phone numbers: %s", (text) => {
    expect(redactContacts(text)).toEqual({ text, removed: [] });
  });

  it("does not join digits across lines", () => {
    expect(redactContacts("2019\n2020\n2021").text).toBe("2019\n2020\n2021");
  });
});

describe("email, url, handle and address minimization", () => {
  it("removes email variants", () => {
    expect(count("a.b+cv@example.co.uk", "email")).toBe(1);
    expect(redactContacts("mail: jane [at] example [dot] com.").text).toBe("mail: [email removed].");
    expect(redactContacts("x(at)example.org").text).toBe("[email removed]");
  });
  it("removes URLs and bare profile links but keeps dotted skill terms", () => {
    const out = redactContacts("See https://example.org/cv?x=1, www.example.com and linkedin.com/in/fictional-person. Skills: Node.js, ASP.NET, Vue.js");
    expect(out.text).toBe("See [url removed], [url removed] and [url removed]. Skills: Node.js, ASP.NET, Vue.js");
    expect(out.removed).toEqual([{ category: "url", count: 3 }]);
  });
  it("removes handles without touching emails twice or C#/F# skills", () => {
    const out = redactContacts("Twitter @fictional_dev, email dev@example.com, skills C#, F#, Team @ Acme");
    expect(out.text).toBe("Twitter [handle removed], email [email removed], skills C#, F#, Team @ Acme");
    expect(out.removed).toEqual([
      { category: "email", count: 1 },
      { category: "handle", count: 1 },
    ]);
  });
  it("removes address lines (labelled, BD house/road, street form) and keeps skill lines", () => {
    const text = [
      "Maintenance Technician",
      "Present Address: somewhere fictional",
      "House 12, Road 5, Dhanmondi, Dhaka 1209",
      "  221B Baker Street, London",
      "Public sector project on road safety",
      "Block diagrams and 3 PLC programs",
    ].join("\n");
    const out = redactContacts(text);
    expect(out.text.split("\n")).toEqual([
      "Maintenance Technician",
      "[address removed]",
      "[address removed]",
      "  [address removed]",
      "Public sector project on road safety",
      "Block diagrams and 3 PLC programs",
    ]);
    expect(out.removed).toEqual([{ category: "address", count: 3 }]);
  });
  it("produces a contract-valid result reporting counts only", () => {
    const out = RedactionResultSchema.parse(redactContacts("a@example.com +8801712345678 https://x.example"));
    expect(out.removed.map((r) => r.category)).toEqual(["email", "phone", "url"]);
    expect(JSON.stringify(out.removed)).not.toContain("example");
  });
  it("is idempotent on already minimized text", () => {
    const once = redactContacts("a@example.com, 01712345678").text;
    expect(redactContacts(once)).toEqual({ text: once, removed: [] });
  });
});

describe("honest wording", () => {
  it("never describes redaction as anonymization", () => {
    expect(REDACTION_NOTICE).toMatch(/not anonymization/);
    expect(REDACTION_NOTICE).not.toMatch(/\banonymi[sz]ed\b|fully anonymous|completely anonymous/i);
  });
});

describe("text limits", () => {
  it("accepts up to the limit and rejects beyond it without truncating", () => {
    expect(checkTextLimit("a".repeat(TEXT_LIMITS.advisorQuestion), "advisorQuestion")).toEqual({ ok: true, length: 2000 });
    expect(checkTextLimit("a".repeat(12_001), "jobDescription")).toEqual({ ok: false, reason: "too-long", length: 12_001, limit: 12_000 });
    expect(checkTextLimit("   ", "cvExtractionInput")).toMatchObject({ ok: false, reason: "empty" });
  });
  it("counts code points, not UTF-16 units", () => {
    expect(checkTextLimit("😀".repeat(2000), "advisorQuestion").ok).toBe(true);
  });
  it("records the architecture limits", () => {
    expect(TEXT_LIMITS).toEqual({ extractedCv: 50_000, cvExtractionInput: 12_000, jobDescription: 12_000, advisorQuestion: 2_000 });
  });
});

describe("U18 review fixes", () => {
  // #1 date ranges are not phones
  it.each(["2019 – 2021 (2 years)", "03.2019 – 06.2021", "2019-03 – 2021-06", "Jan 2019 - Mar 2021 (2.5 yrs)", "2019 - 2021 (2"])(
    "keeps date range %j",
    (text) => {
      expect(redactContacts(text)).toEqual({ text, removed: [] });
    },
  );

  // #2 adjacent numbers are each redacted, never leaked wholesale
  it.each([
    ["Mobile: 01712345678 01812345678", "Mobile: [phone removed] [phone removed]", 2],
    ["Tel: 02 9123456 01712345678", "Tel: [phone removed] [phone removed]", 2],
    ["01712345678     2019 – 2021", "[phone removed]     2019 – 2021", 1],
    ["01712345678 2019 – 2021", "[phone removed] 2019 – 2021", 1],
    ["Since 2019 01712345678", "Since 2019 [phone removed]", 1],
    ["+8801712345678 +8801812345678", "[phone removed] [phone removed]", 2],
  ])("%j", (input, expected, n) => {
    expect(redactContacts(input)).toEqual({ text: expected, removed: [{ category: "phone", count: n }] });
  });

  // #3 Bengali and fullwidth digits
  it.each(["০১৭১২৩৪৫৬৭৮", "+৮৮০ ১৭১২ ৩৪৫৬৭৮", "０１７１２３４５６７８", "＋８８０１７１２３４５６７８"])("removes non-ASCII digit phone %s", (phone) => {
    expect(redactContacts(`ফোন ${phone}`).text).toBe("ফোন [phone removed]");
  });

  // #4 personal-site hosts
  it("removes bare personal domains but keeps skill terms", () => {
    const out = redactContacts("Portfolio fictional.github.io/portfolio, demo app.vercel.app, janedoe.dev and site.netlify.app; janedoe.com/work. Uses Socket.IO, Node.js, ASP.NET, next.js");
    expect(out.text).toBe("Portfolio [url removed], demo [url removed], [url removed] and [url removed]; [url removed]. Uses Socket.IO, Node.js, ASP.NET, next.js");
  });

  // #5 non-address lines survive
  it.each(["Organised 2 Blood Donation Drive", "Achieved 5 Day Close each month", "Maintained HVAC on Floor 12 and Block 3", "Organised 2 Blood Donation Drive, Dhaka"])(
    "keeps %j",
    (text) => {
      expect(redactContacts(text)).toEqual({ text, removed: [] });
    },
  );

  // #6 missed addresses
  it("removes a label block, BD rural labels and holding/ward lines", () => {
    const text = ["Address:", "House 12", "Road 5, Dhaka", "", "Vill: Fictionpur, P.O: Sample, Upazila: Demo, Dist: Testgonj", "Holding No. 23, Ward 5", "EXPERIENCE"].join("\n");
    expect(redactContacts(text)).toEqual({
      text: ["[address removed]", "[address removed]", "[address removed]", "", "[address removed]", "[address removed]", "EXPERIENCE"].join("\n"),
      removed: [{ category: "address", count: 3 }],
    });
  });
  it("stops a label block at a heading", () => {
    expect(redactContacts("Address:\nSKILLS\nPLC wiring").text).toBe("[address removed]\nSKILLS\nPLC wiring");
  });

  // #7 npm scopes are not handles
  it("keeps npm package scopes", () => {
    expect(redactContacts("Built with @angular/core, @nestjs/common; ping @fictional_dev.").text).toBe(
      "Built with @angular/core, @nestjs/common; ping [handle removed].",
    );
  });
});

describe("bounded work", () => {
  it("scans a 50,000-character number table quickly", () => {
    const text = "1 2 ".repeat(12_500);
    const t = performance.now();
    redactContacts(text);
    expect(performance.now() - t).toBeLessThan(2000);
  });
});

describe("U18 round 2 review fixes", () => {
  it.each([
    ["Call 01712  345678 now", "Call [phone removed] now"],
    ["Call 017 1234  5678 now", "Call [phone removed] now"],
    ["01712345678  2019 - 2021", "[phone removed]  2019 - 2021"],
    ["Mobile: 01712345678  01812345678", "Mobile: [phone removed]  [phone removed]"],
  ])("R2-1 %j", (input, expected) => {
    expect(redactContacts(input).text).toBe(expected);
  });
  it("R2-2 never trims a trailing year-like group from an international number", () => {
    expect(redactContacts("Tel +44 20 7946 2001").text).toBe("Tel [phone removed]");
  });
  it("R2-3 removes capitalized bare personal domains, keeps tech names", () => {
    expect(redactContacts("See JaneDoe.dev and Janedoe.ME/work; Node.js, Socket.IO, ASP.NET").text).toBe(
      "See [url removed] and [url removed]; Node.js, Socket.IO, ASP.NET",
    );
  });
  it.each(["District-level health programme lead", "Union-level coordinator", "Thana-based field officer", "Union-wide survey"])("R2-4 keeps %j", (text) => {
    expect(redactContacts(text)).toEqual({ text, removed: [] });
  });
  it("R2-4 still removes labelled rural lines", () => {
    expect(redactContacts("Thana: Demo, Dist: Testgonj").text).toBe("[address removed]");
  });
});

describe("QA defect fixes (BUG-W01-001 addresses, BUG-W01-002 labelled short phones)", () => {
  it.each([
    "Flat 3B, 22 Baker Street, London",
    "1600 Pennsylvania Avenue NW, Washington, DC 20500",
    "Apt 4, 55 MG Road, Bengaluru 560001",
    "Flat 3B, Rose Court",
    "London NW1 6XE",
    "Springfield IL 62701-1234",
    "Bengaluru, 560038",
    "Indiranagar, Bengaluru 560038",
    "22 Baker Street, London NW1 6XE",
    "12 Elm St, Springfield, IL 62701",
  ])("BUG-W01-001 removes %j", (line) => {
    expect(redactContacts(line)).toEqual({ text: "[address removed]", removed: [{ category: "address", count: 1 }] });
  });

  it("BUG-W01-001 removes a multi-line GB header block and keeps the name and country", () => {
    const text = ["Jane Example", "22 Baker Street", "London NW1 6XE", "United Kingdom"].join("\n");
    expect(redactContacts(text).text).toBe(["Jane Example", "[address removed]", "[address removed]", "United Kingdom"].join("\n"));
  });
  it("BUG-W01-001 removes an IN header block with a weak PIN line", () => {
    const text = ["Ravi Example", "55 MG Road", "Bengaluru 560001"].join("\n");
    expect(redactContacts(text).text).toBe(["Ravi Example", "[address removed]", "[address removed]"].join("\n"));
  });

  it.each([
    "Maintained HVAC on Floor 12 and Block 3",
    "Organised 2 Blood Donation Drive",
    "Organised 2 Blood Donation Drive, Dhaka",
    "Achieved 5 Day Close each month",
    "District-level health programme lead",
    "Drive sales growth by 20%",
    "Team lead for 12 engineers since 2019",
    "3 Main Street projects delivered",
    "Sold 150000",
    "Revenue grew to 250000",
    "Dhaka-1209",
  ])("BUG-W01-001 keeps %j", (text) => {
    expect(redactContacts(text)).toEqual({ text, removed: [] });
  });
  it("BUG-W01-001 a bare street-like line alone is kept", () => {
    expect(redactContacts(["Projects", "5 Day Close", "Reduced cycle time"].join("\n")).removed).toEqual([]);
  });

  it.each([
    ["Tel: 555-0123", "Tel: [phone removed]"],
    ["Phone: 9123-456", "Phone: [phone removed]"],
    ["Phone: 9123456", "Phone: [phone removed]"],
    ["Mob. 555 0199", "Mob. [phone removed]"],
    ["WhatsApp #: 5550123", "WhatsApp #: [phone removed]"],
    ["ফোন: ৫৫৫০১২৩", "ফোন: [phone removed]"],
  ])("BUG-W01-002 %j", (input, expected) => {
    expect(redactContacts(input).text).toBe(expected);
  });
  it.each(["Ref 555-0123", "Phone: 2019-2021", "Cell biology 2019 - 2021", "Batch 12345"])("BUG-W01-002 keeps unlabelled/short/date %j", (text) => {
    expect(redactContacts(text)).toEqual({ text, removed: [] });
  });
});

describe("address block stops at contact lines", () => {
  it("counts the phone after an Address: block as a phone", () => {
    const out = redactContacts(["Address:", "House 12", "Phone: 01712345678"].join("\n"));
    expect(out.text).toBe(["[address removed]", "[address removed]", "Phone: [phone removed]"].join("\n"));
    expect(out.removed).toEqual([
      { category: "phone", count: 1 },
      { category: "address", count: 1 },
    ]);
  });
});

describe("U18 round 3 over-redaction fixes", () => {
  it.each([
    ["Units Sold 150000", "Revenue Target 250000"],
    ["3 Regional Sales Drive", "5 Day Close"],
  ])("R3-1 two weak lines of the same kind do not confirm each other: %j / %j", (a, b) => {
    const text = [a, b].join("\n");
    expect(redactContacts(text)).toEqual({ text, removed: [] });
  });
  it("R3-1 a weak street line plus a weak PIN line (other kinds) still confirm", () => {
    const text = ["Ravi Example", "55 MG Road", "Indiranagar, Bengaluru 560038"].join("\n");
    expect(redactContacts(text).text).toBe(["Ravi Example", "[address removed]", "[address removed]"].join("\n"));
  });
  it.each([
    "Provisioned AWS EC2 4GB instances for the team",
    "Laptop: Apple M1 8GB",
    "Tested on Sony PS4 1TB",
    "Deployed London NW1 6XE office network upgrade",
  ])("R3-2 keeps %j", (text) => {
    expect(redactContacts(text)).toEqual({ text, removed: [] });
  });
  it.each(["London NW1 6XE", "22 Baker Street, London NW1 6XE, UK", "Manchester M1 1AE"])("R3-2 still removes %j", (text) => {
    expect(redactContacts(text).text).toBe("[address removed]");
  });
  it("R3-3 keeps a PIN-like experience line with another number", () => {
    const text = "Covered 20 schools, Students 120000";
    expect(redactContacts(text)).toEqual({ text, removed: [] });
  });
  it.each(["Indiranagar, Bengaluru 560038", "Koramangala 5th Block, Bengaluru 560095", "HSR Layout, Bengaluru, Karnataka 560102", "12, Indiranagar, Bengaluru 560038"])(
    "R3-3 removes a single-line Indian address %j",
    (text) => {
      expect(redactContacts(text)).toEqual({ text: "[address removed]", removed: [{ category: "address", count: 1 }] });
    },
  );
  it("R3-3 removes City, PIN at line end", () => {
    expect(redactContacts("Bengaluru, 560001").text).toBe("[address removed]");
  });
});

describe("BUG-W01-001 reopen: address-unit tokens and lone unit lines", () => {
  it.each(["B-12, Sector 62, Noida, Uttar Pradesh 201301", "Plot 7, Banjara Hills, Hyderabad 500034", "7/3, Phase 2, Road No. 5, Banjara Hills, Hyderabad 500034", "12A, Ward 4, Lane 3, Kochi 682001"])(
    "removes %j",
    (text) => {
      expect(redactContacts(text)).toEqual({ text: "[address removed]", removed: [{ category: "address", count: 1 }] });
    },
  );
  it("removes a lone Flat line inside a header whose neighbours are removed", () => {
    const text = ["Jane Example", "Flat 3B", "22 Baker Street", "London NW1 6XE"].join("\n");
    expect(redactContacts(text).text).toBe(["Jane Example", "[address removed]", "[address removed]", "[address removed]"].join("\n"));
  });
  it("keeps a lone unit-like line with no address neighbour", () => {
    const text = ["Projects", "House 5", "Built a garden shed"].join("\n");
    expect(redactContacts(text)).toEqual({ text, removed: [] });
  });
  it.each([
    "Team of 8, Bengaluru 2019",
    "Covered 20 schools, Students 120000",
    "Managed 3 Main Street retail branches in London",
    "Led 4 teams, Sector 5 rollout, Revenue 250000",
  ])("keeps %j", (text) => {
    expect(redactContacts(text)).toEqual({ text, removed: [] });
  });
});

// QA probes probe-reverify.keep.ts and probe-r2.ts (BUG-W01-001 round 2), made permanent with the same pass criteria:
// removed → changed and no 3+ digit run left outside tokens; header → no digit left; keep → unchanged.
const residualDigits = (o: string) => o.replace(/\[[a-z ]+removed\]/g, "");
describe("QA probes (BUG-W01-001 round 2, gazetteer anchor)", () => {
  const mustRemove = [
    "Flat 3B, 22 Baker Street, London", "1600 Pennsylvania Avenue NW, Washington, DC 20500", "Apt 4, 55 MG Road, Bengaluru 560001",
    "Flat 3B, Rose Court", "London NW1 6XE", "Tel: 555-0123",
    "Suite 200, 350 Fifth Avenue, New York, NY 10118", "77 Massachusetts Ave, Cambridge, MA 02139", "10 Downing Street, London SW1A 2AA",
    "Flat 2, 14 Princes Street, Edinburgh EH2 2BY", "B-12, Sector 62, Noida, Uttar Pradesh 201301", "Plot 7, Banjara Hills, Hyderabad 500034",
    "Phone - 9123456", "Mobile no. 5550199", "Ph: 555 0123", "Cell #5550123", "Fax: 020 7946 0958",
    "Leeds LS1 4AP", "Brooklyn, NY 11201",
    "C-45, Sector 18, Noida 201301", "H.No. 4-1-12, Abids, Hyderabad 500001", "Plot No. 21, Phase 2, Gurugram, Haryana 122002",
    "Door No 12/3, Anna Nagar, Chennai 600040", "Sector 15, Rohini, Delhi 110085", "Block C, Flat 302, Salt Lake, Kolkata 700091",
    "Plot No. 21, Phase 2, Gurugram, Haryana 122002, India",
  ];
  it.each(mustRemove)("removes %j", (s) => {
    const o = redactContacts(s).text;
    expect(o).not.toBe(s);
    expect(residualDigits(o)).not.toMatch(/\d{3}/);
  });

  const headers = [
    "Jane Example\n22 Baker Street\nLondon NW1 6XE\nUnited Kingdom",
    "Jane Example\n350 Fifth Avenue\nNew York, NY 10118",
    "Jane Example\n55 MG Road\nBengaluru 560001",
    "Jane Example\nFlat 3B\n22 Baker Street\nLondon NW1 6XE",
    "Jane Example\nApt 12\n350 Fifth Avenue\nNew York, NY 10118",
    "Jane Example\nB-12, Sector 62\nNoida 201301",
    "Jane Example\nH.No. 4-1-12\nAbids, Hyderabad 500001",
    "Jane Example\nDoor No 12/3, Anna Nagar\nChennai 600040",
  ];
  it.each(headers)("removes every digit of header %j", (s) => {
    expect(redactContacts(s).text).not.toMatch(/\d/);
  });

  const mustKeep = [
    "Drive sales growth by 20%", "Team lead for 12 engineers since 2019", "Organised 2 Blood Donation Drive", "Achieved 5 Day Close each month",
    "District-level coordinator for a health project", "Managed 3 Main Street retail branches in London", "Ran 12 Oxford Street flagship store openings",
    "Sold 150000 units across 25 regions", "Python 3.11, Node 22.4.0", "ISO 27001:2022 lead auditor", "Jan 2019 – Dec 2021 (3 yrs)",
    "Configured 16GB RAM servers", "Upgraded fleet to 1TB SSD", "Shipped release 4.2 on Avenue platform", "Courses: CS50, ML 101",
    "Mobile app developer, 2019 – 2021", "Cell culture lab, 2018 - 2020", "Phone support for 120 customers daily", "Telephone sales, 5 years",
    "Led Kensington Court renovation project", "Worked at Park Lane Hotel, London", "Built 3 Regional Sales Drive campaigns",
    "Team of 8, Bengaluru 2019", "Office Manager, London", "Fixed 450 tickets, NPS 72",
    "Led Sector 62 expansion team of 14", "Plot 7 analysis in R for 2019 survey", "Flat 3B ops review, 2021",
    "Covered sector 15 accounts, 2020 – 2022", "Phase 2 rollout across 12 sites", "Built 4 dashboards for Block C retail",
    "Apt 12 tenants survey (n=40)", "Grew Sector revenue 30% in 2021", "Plot No. 21 permit approvals as site engineer",
    "Covered 20 schools, Students 120000", "Hyderabad team grew to 120 engineers",
  ];
  it.each(mustKeep)("keeps %j", (s) => {
    expect(redactContacts(s).text).toBe(s);
  });
  it("keeps experience lines next to an unrelated unit-like line", () => {
    const text = "Projects\nPlot 7 analysis in R for 2019 survey\nB-12 module\nBuilt 4 dashboards for Block C retail";
    expect(redactContacts(text).text).toBe(text);
  });
});
