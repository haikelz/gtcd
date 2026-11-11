// Run: node --experimental-strip-types src/lib/csv.check.ts
import assert from "node:assert/strict";
import { csvFileName, toCsv } from "./csv.ts";

// RFC 4180: CRLF after each record; quotes around commas, quotes and breaks.
assert.equal(
  toCsv([
    ["Name", "Visits"],
    ["Chrome", 980],
  ]),
  "Name,Visits\r\nChrome,980\r\n"
);
assert.equal(toCsv([['say "hi", bye']]), '"say ""hi"", bye"\r\n');
assert.equal(
  toCsv([["two\nlines", "cr\rhere"]]),
  '"two\nlines","cr\rhere"\r\n'
);
assert.equal(toCsv([]), "");

// Visitor-controlled text that a spreadsheet would run as a formula.
for (const start of ["=", "+", "-", "@", "\t", "\r"]) {
  const escaped = toCsv([[`${start}1+1`]]);
  assert.ok(
    escaped.startsWith(`'${start}`) || escaped.startsWith(`"'${start}`),
    JSON.stringify(start)
  );
}
assert.equal(
  toCsv([['=HYPERLINK("https://example.invalid","x")']]),
  '"\'=HYPERLINK(""https://example.invalid"",""x"")"\r\n'
);
assert.equal(toCsv([["/a=b", "@", "-"]]), "/a=b,'@,'-\r\n");

// gtcd's own numbers, such as a negative change, stay numeric.
assert.equal(toCsv([[-12, 0, 12.5]]), "-12,0,12.5\r\n");

// File names stay ASCII and keep dates readable.
assert.equal(
  csvFileName(["demo.example", "browsers", "2026-11-04_2026-11-11"]),
  "demo.example-browsers-2026-11-04_2026-11-11.csv"
);
assert.equal(
  csvFileName(["Situs Indonésia", "campaigns", "Lebaran / 2026"]),
  "Situs-Indonesia-campaigns-Lebaran-2026.csv"
);
assert.equal(csvFileName(["../..", "日本", ""]), "report.csv");
assert.ok(csvFileName(["a".repeat(500)]).length <= 64);

console.log("csv: all checks passed");
