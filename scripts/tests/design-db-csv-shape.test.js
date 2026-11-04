const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..", "..");

// 디자인 DB CSV는 모델이 grep·Read로 열 위치를 세어 읽는다. 따옴표가 깨지거나 두 행이 한 줄로
// 붙으면 "Heading Font"·"Google Fonts URL" 같은 칸을 엉뚱한 값으로 읽는다
// (2026-11-04 실측: design-styles 77행 31칸, font-pairings 34행에 두 행이 붙어 21칸).
const CSV_FILES = [
  "skills/frontend-design/references/design-styles.csv",
  "skills/frontend-design/references/font-pairings.csv",
  "skills/frontend-design/references/color-palettes.csv",
  "skills/ui-ux-auditor/references/ux-guidelines.csv",
];

// RFC 4180 최소 파서: 따옴표 안의 쉼표·줄바꿈·이중 따옴표("")를 처리한다.
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (ch === '"') {
        quoted = false;
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  assert.equal(quoted, false, "따옴표가 닫히지 않은 채 파일이 끝났다");
  return rows.filter((r) => !(r.length === 1 && r[0] === ""));
}

test("the CSV parser keeps quoted commas and newlines inside one field", () => {
  const rows = parseCsv('No,Name\n1,"a, b\nc"\n2,"say ""hi"""\n');
  assert.deepEqual(rows, [["No", "Name"], ["1", "a, b\nc"], ["2", 'say "hi"']]);
});

for (const relative of CSV_FILES) {
  test(`${path.basename(relative)} rows have exactly the header's field count and unique No`, () => {
    const text = fs.readFileSync(path.join(repoRoot, relative), "utf8").replace(/^﻿/, "");
    const [header, ...rows] = parseCsv(text);
    const misaligned = rows
      .map((cells, index) => ({ line: index + 2, no: cells[0], count: cells.length }))
      .filter((row) => row.count !== header.length);
    assert.deepEqual(misaligned, [], `헤더 ${header.length}칸과 다른 행이 있다`);

    const seen = new Map();
    for (const cells of rows) {
      seen.set(cells[0], (seen.get(cells[0]) || 0) + 1);
    }
    const duplicated = [...seen].filter(([, count]) => count > 1).map(([no]) => no);
    assert.deepEqual(duplicated, [], "No 값이 겹친다");
  });
}
