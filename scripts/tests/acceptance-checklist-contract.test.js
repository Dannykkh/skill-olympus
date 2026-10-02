const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..", "..");
const read = (relativePath) =>
  fs.readFileSync(path.join(repoRoot, relativePath), "utf8");

const GUIDE = "skills/zephermine/references/acceptance-checklist-guide.md";
const STATES = ["proved", "weak", "missing", "contradicted"];

// 완료 기준은 젭마인이 ID로 정의하고 구현·감리 하네스가 같은 장부로 이행한다.
// 한 스킬이라도 가이드를 가리키지 않으면 그 경로에서 약속이 다시 끊긴다.
const CONSUMERS = [
  "skills/zephermine/SKILL.md",
  "skills/agent-team/SKILL.md",
  "skills/agent-team/references/artifacts-review.md",
  "skills/agent-team-codex/SKILL.md",
  "skills/orchestrator/commands/workpm.md",
  "skills/orchestrator/commands/workpm-mcp.md",
  "skills/auto-continue-loop/SKILL.md",
  "skills/argos/SKILL.md",
  "skills/clio/SKILL.md",
];

test("acceptance checklist guide defines IDs, files and the four states", () => {
  const guide = read(GUIDE);
  assert.match(guide, /AC-<NN>-<k>/);
  assert.match(guide, /checklist\.md/);
  assert.match(guide, /checklist-status\.md/);
  for (const state of STATES) {
    assert.match(guide, new RegExp(`\`${state}\``), `guide is missing state ${state}`);
  }
});

test("every harness that plans, builds or audits points at the shared guide", () => {
  for (const file of CONSUMERS) {
    const text = read(file);
    assert.match(text, /acceptance-checklist-guide\.md/, `${file} does not reference the guide`);
    if (file !== "skills/zephermine/SKILL.md") {
      assert.match(text, /checklist-status\.md/, `${file} does not use the status ledger`);
    }
  }
});

test("worker briefs carry AC IDs and return evidence per AC", () => {
  // 작업자 반환이 AC 증거가 장부로 들어오는 유일한 입구다.
  const template = read("skills/agent-team/references/teammate-context-template.md");
  assert.match(template, /담당 AC: \{AC-NN-1/);
  assert.match(template, /ID \| 증거/);
});

test("chronos completion contract uses the same state vocabulary as the ledger", () => {
  const chronos = read("skills/auto-continue-loop/SKILL.md");
  for (const state of STATES) {
    assert.match(chronos, new RegExp(`\`${state}\``), `chronos is missing state ${state}`);
  }
});

test("zephermine section template gives each acceptance criterion an ID", () => {
  const template = read("skills/zephermine/references/section-splitting.md");
  assert.match(template, /- \[ \] AC-NN-1 /);
  assert.match(read("skills/zephermine/SKILL.md"), /### 22A\. Consolidate Acceptance Checklist/);
  assert.match(read("skills/zephermine/references/operation-qa-guide.md"), /관련 AC/);
});
