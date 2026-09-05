"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
  DEFAULT_COMMON_RUNTIME_SKILLS,
  DEFAULT_RUNTIME_SKILL_ALLOWLIST,
  RUNTIME_SKILL_EXCLUSIONS,
  selectRuntimeSkills,
} = require("../skill-install-policy");

const repoRoot = path.resolve(__dirname, "..", "..");

const EXPECTED_COMMON_RUNTIME_SKILLS = Object.freeze([
  "api-tester",
  "argos",
  "auto-continue-loop",
  "biz-strategy",
  "ceo",
  "clio",
  "design-plan",
  "explain",
  "hestia",
  "ko-en-translator",
  "minos",
  "release-notes",
  "seo-audit",
  "themis",
  "video-maker",
  "workpm",
  "zephermine",
  "zeus",
]);

const EXPECTED_RUNTIME_ADAPTERS = Object.freeze([
  "agent-team",
  "agent-team-codex",
  "antigravity-mnemo",
  "codex-mnemo",
  "grok-mnemo",
  "mnemo",
]);

// These were runtime dependencies in the previous policy. They remain
// available as portable source modules, but no longer consume startup skill
// descriptions or rely on a slash-command registry entry.
const DROPPED_INTERNAL_MODULES = Object.freeze([
  "code-reviewer",
  "docker-deploy",
  "domain-dictionary",
  "flow-verifier",
  "frontend-design",
  "humanizer",
  "memory-compact",
  "memory-distill",
  "mermaid-diagrams",
  "orchestrator",
  "pdf",
  "ui-ux-auditor",
  "web-design-guidelines",
]);

// These were already source-only before the second-wave reduction, but active
// harnesses still consume them on explicit optional branches. They need the
// same exact-path/direct-read contract as modules removed from the allowlist.
const CONDITIONAL_SOURCE_ONLY_MODULES = Object.freeze([
  "autoresearch",
  "design-system-starter",
  "skill-evolve",
  "stitch",
]);

const ROUTED_SOURCE_ONLY_MODULES = Object.freeze([
  ...DROPPED_INTERNAL_MODULES,
  ...CONDITIONAL_SOURCE_ONLY_MODULES,
]);

const HARNESS_CONTRACTS = Object.freeze({
  "skills/argos/SKILL.md": [
    "code-reviewer",
    "flow-verifier",
    "frontend-design",
    "ui-ux-auditor",
  ],
  "skills/clio/SKILL.md": [
    "flow-verifier",
    "humanizer",
    "mermaid-diagrams",
    "pdf",
  ],
  "skills/design-plan/SKILL.md": [
    "autoresearch",
    "design-system-starter",
    "frontend-design",
    "mermaid-diagrams",
    "skill-evolve",
    "stitch",
    "ui-ux-auditor",
    "web-design-guidelines",
  ],
  "skills/frontend-design/SKILL.md": [
    "design-system-starter",
    "ui-ux-auditor",
    "web-design-guidelines",
  ],
  "skills/zephermine/SKILL.md": [
    "domain-dictionary",
    "flow-verifier",
    "mermaid-diagrams",
  ],
  "skills/zeus/SKILL.md": ["docker-deploy", "orchestrator"],
  "skills/workpm/SKILL.md": ["orchestrator"],
  "skills/auto-continue-loop/SKILL.md": [
    "code-reviewer",
    "flow-verifier",
    "ui-ux-auditor",
  ],
  "skills/agent-team/SKILL.md": ["code-reviewer", "orchestrator"],
  "skills/agent-team-codex/SKILL.md": ["code-reviewer", "orchestrator"],
});

const HARD_REFERENCE_ROOTS = Object.freeze({
  "skills/argos/references/verify-protocol.md": [
    "MODULE_SKILL[flow-verifier]",
    "MODULE_ROOT[frontend-design]",
    "MODULE_SKILL[ui-ux-auditor]",
    "MODULE_ROOT[code-reviewer]",
  ],
  "skills/design-plan/references/design-md-guide.md": [
    "MODULE_SKILL[design-system-starter]",
    "MODULE_ROOT[frontend-design]",
    "MODULE_SKILL[ui-ux-auditor]",
  ],
  "skills/design-plan/references/experience-contract-guide.md": [
    "MODULE_SKILL[frontend-design]",
    "MODULE_SKILL[stitch]",
  ],
  "skills/design-plan/references/reference-capture-guide.md": [
    "MODULE_ROOT[frontend-design]",
  ],
  "skills/frontend-design/references/motion-first-prompt-playbook.md": [
    "MODULE_SKILL[design-system-starter]",
  ],
  "skills/zephermine/references/flow-diagrams-guide.md": [
    "flow_verifier_root",
    "mermaid_diagrams_root",
  ],
  "skills/zeus/references/docker-setup.md": ["docker_deploy_root"],
  "skills/zeus/references/phase-transitions.md": ["docker_deploy_root"],
  "skills/zeus/references/final-report-format.md": [],
  "skills/agent-team/references/artifacts-review.md": ["orchestrator_root"],
  "skills/agent-team/references/expert-matching.md": ["code_reviewer_root"],
  "skills/agent-team/references/teammate-context-template.md": [
    "orchestrator_root",
  ],
});

const MEMORY_TEMPLATES = Object.freeze([
  "skills/mnemo/templates/claude-md-rules.md",
  "skills/codex-mnemo/templates/agents-md-rules.md",
  "skills/antigravity-mnemo/templates/gemini-md-rules.md",
  "skills/grok-mnemo/templates/grok-rules.md",
]);

const MEMORY_HOOKS = Object.freeze([
  "hooks/save-response.ps1",
  "hooks/save-response.sh",
  "skills/codex-mnemo/hooks/save-turn.ps1",
  "skills/codex-mnemo/hooks/save-turn.sh",
  "skills/antigravity-mnemo/hooks/save-turn.js",
  "skills/grok-mnemo/hooks/save-turn.ps1",
  "skills/grok-mnemo/hooks/save-turn.sh",
]);

function readRepoFile(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function allRepoSkillNames() {
  return fs
    .readdirSync(path.join(repoRoot, "skills"), { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isDirectory() &&
        entry.name !== "deploymonitor" &&
        fs.existsSync(path.join(repoRoot, "skills", entry.name, "SKILL.md")),
    )
    .map((entry) => entry.name)
    .sort();
}

function allRepoSkillEntries() {
  return fs
    .readdirSync(path.join(repoRoot, "skills"), { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isDirectory() &&
        fs.existsSync(path.join(repoRoot, "skills", entry.name, "SKILL.md")),
    )
    .map((entry) => ({
      name: entry.name,
      relativePath: `skills/${entry.name}/SKILL.md`,
      source: readRepoFile(`skills/${entry.name}/SKILL.md`).replace(/\r\n/g, "\n"),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function frontmatterField(lines, fieldName) {
  const index = lines.findIndex((line) => line.startsWith(`${fieldName}:`));
  if (index < 0) return null;
  const inlineValue = lines[index].slice(fieldName.length + 1).trim();
  if (inlineValue !== ">" && inlineValue !== "|") {
    return { index, inlineValue, value: inlineValue.replace(/^(["'])|(["'])$/g, "") };
  }

  const body = [];
  for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
    if (/^[a-z][a-z0-9-]*:/i.test(lines[cursor])) break;
    if (/^\s+\S/.test(lines[cursor])) body.push(lines[cursor].trim());
  }
  return { index, inlineValue, value: body.join(" ") };
}

function extractResolutionContract(source, relativePath) {
  const marker = /^(?:## )?(?:Source-only internal module resolution \(mandatory\)|내부 소스 모듈 해석 계약 \(필수\))\s*$/m;
  const match = marker.exec(source);
  assert.ok(match, `${relativePath} is missing the source-only resolution contract`);
  const start = match.index;
  const rest = source.slice(start + match[0].length);
  const nextHeading = rest.search(/^## /m);
  return source.slice(start, nextHeading < 0 ? source.length : start + match[0].length + nextHeading);
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stripNonOperationalContracts(source) {
  return source
    .replace(
      /^(?:## )?(?:Source-only internal module resolution \(mandatory\)|## 내부 소스 모듈 해석 계약 \(필수\))[\s\S]*?(?=^## |\s*$)/gm,
      "",
    )
    .replace(/^## (?:Related Files|관련 파일)[\s\S]*?(?=^## |\s*$)/gm, "");
}

test("entry-point default deny keeps 18 common entry points, six adapters, and 76 public source-only modules", () => {
  assert.deepEqual(DEFAULT_COMMON_RUNTIME_SKILLS, EXPECTED_COMMON_RUNTIME_SKILLS);
  assert.deepEqual(
    DEFAULT_RUNTIME_SKILL_ALLOWLIST.filter(
      (name) => !DEFAULT_COMMON_RUNTIME_SKILLS.includes(name),
    ),
    EXPECTED_RUNTIME_ADAPTERS,
  );
  assert.equal(DEFAULT_RUNTIME_SKILL_ALLOWLIST.length, 24);

  const allSkills = allRepoSkillNames();
  assert.equal(allSkills.length, 100, "public repository skill inventory changed; revisit policy counts");

  for (const runtime of ["claude", "codex", "antigravity", "grok", "openclaw", "hermes"]) {
    const selection = selectRuntimeSkills(
      allSkills,
      RUNTIME_SKILL_EXCLUSIONS[runtime],
    );
    const skillsOnly = runtime === "openclaw" || runtime === "hermes";
    const expectedActiveCount = skillsOnly ? 18 : runtime === "claude" ? 21 : 20;
    const expectedAvailableCount = skillsOnly ? 94 : runtime === "claude" ? 97 : 96;

    assert.equal(selection.skillNames.length, expectedActiveCount, `${runtime} active count`);
    assert.equal(selection.defaultDisabledNames.length, 76, `${runtime} source-only count`);
    assert.equal(
      selection.skillNames.length + selection.defaultDisabledNames.length,
      expectedAvailableCount,
      `${runtime} available active-plus-source-only count`,
    );
    for (const moduleName of ROUTED_SOURCE_ONLY_MODULES) {
      assert.equal(
        selection.skillNames.includes(moduleName),
        false,
        `${runtime} unexpectedly registers source-only module ${moduleName}`,
      );
      assert.equal(
        selection.defaultDisabledNames.includes(moduleName),
        true,
        `${runtime} does not publish module ${moduleName} as source-only`,
      );
    }
  }
});

test("all canonical skills use portable Agent Skills frontmatter", () => {
  const allowedTopLevelFields = new Set([
    "name",
    "description",
    "license",
    "metadata",
  ]);
  const entries = allRepoSkillEntries();
  assert.equal(entries.length, 101, "local skill inventory changed; revisit portable metadata coverage");

  for (const { name, relativePath, source } of entries) {
    assert.match(source, /^---\n/, `${relativePath} has no opening frontmatter fence`);
    const closingIndex = source.indexOf("\n---", 4);
    assert.notEqual(closingIndex, -1, `${relativePath} has no closing frontmatter fence`);
    const lines = source.slice(4, closingIndex).split("\n");
    const topLevelFields = lines
      .map((line) => line.match(/^([a-z][a-z0-9-]*):/i)?.[1])
      .filter(Boolean);

    for (const field of topLevelFields) {
      assert.equal(
        allowedTopLevelFields.has(field),
        true,
        `${relativePath} uses runtime-specific or unsupported frontmatter field ${field}`,
      );
    }

    const nameField = frontmatterField(lines, "name");
    const descriptionField = frontmatterField(lines, "description");
    assert.ok(nameField, `${relativePath} is missing name`);
    assert.ok(descriptionField, `${relativePath} is missing description`);
    assert.equal(nameField.value, name, `${relativePath} name does not match its directory`);
    assert.match(name, /^[a-z0-9]+(?:-[a-z0-9]+)*$/, `${relativePath} name is not kebab-case`);
    assert.ok(descriptionField.value.length > 0, `${relativePath} has an empty description`);
    assert.ok(
      descriptionField.value.length <= 1024,
      `${relativePath} description exceeds the Agent Skills 1024-character limit`,
    );
    if (![">", "|"].includes(descriptionField.inlineValue)) {
      const quoted = /^(?:"[\s\S]*"|'[\s\S]*')$/.test(descriptionField.inlineValue);
      if (!quoted) {
        assert.doesNotMatch(
          descriptionField.inlineValue,
          /:\s/,
          `${relativePath} has an ambiguous plain-scalar description; quote it or use a block`,
        );
      }
    }

    const metadataIndex = lines.findIndex((line) => line === "metadata:");
    if (metadataIndex >= 0) {
      for (let cursor = metadataIndex + 1; cursor < lines.length; cursor += 1) {
        const line = lines[cursor];
        if (/^[a-z][a-z0-9-]*:/i.test(line)) break;
        if (line.trim() === "") continue;
        const metadataEntry = line.match(/^  [a-z][a-z0-9_-]*:\s+(.+)$/i);
        assert.ok(metadataEntry, `${relativePath} metadata values must be flat strings: ${line}`);
        assert.doesNotMatch(
          metadataEntry[1],
          /^(?:\[|\{|>|\|)/,
          `${relativePath} metadata value must be a string: ${line}`,
        );
      }
    }
  }
});

test("cross-CLI authoring rules and Antigravity compatibility boundaries stay explicit", () => {
  const agents = readRepoFile("AGENTS.md");
  assert.match(agents, /single canonical source/);
  assert.match(agents, /~\/\.gemini\/antigravity-cli\/skills\//);
  assert.match(agents, /install\.bat[\s\S]*bash install\.sh/);
  assert.match(agents, /verified four-runtime intersection/);
  assert.doesNotMatch(agents, /\/mnt\/skills\/user/);

  const antigravityDocs = readRepoFile("docs/resources/antigravity-cli.md");
  assert.match(antigravityDocs, /기본 활성 \| 20/);
  assert.match(antigravityDocs, /source-only \| 76/);
  assert.match(antigravityDocs, /런타임 제외 \| 4/);
  assert.match(antigravityDocs, /실제 `agy` 세션 검증/);

  assert.doesNotMatch(readRepoFile("skills/zephermine/SKILL.md"), /\bTodoWrite\b/);
  assert.doesNotMatch(
    readRepoFile("skills/draw-io/SKILL.md"),
    /~\/\.claude\/skills\/draw-io/,
  );
  assert.doesNotMatch(
    readRepoFile("skills/daily-meeting-update/SKILL.md"),
    /~\/\.claude\/skills\/daily-meeting-update/,
  );
  assert.doesNotMatch(
    readRepoFile("skills/jira/references/mcp.md"),
    /~\/\.claude\/skills\/jira/,
  );
  assert.match(
    readRepoFile("skills/orchestrator/SKILL.md"),
    /~\/\.gemini\/antigravity-cli\/\.olympus\/runtime-modules\/orchestrator/,
  );
  assert.doesNotMatch(readRepoFile("QUICK-REFERENCE.md"), /codebase_investigator|\bgeneralist\b/);
  assert.doesNotMatch(
    readRepoFile(".claude-plugin/plugin.json"),
    /Codex CLI, Gemini CLI, and Grok Build/,
  );
  assert.doesNotMatch(
    readRepoFile(".claude-plugin/marketplace.json"),
    /Codex CLI, Gemini CLI, and Grok Build/,
  );
});

test("Antigravity native workflows own their basic jobs while Olympus skills document a unique delta", () => {
  const nativeCommands = [
    "/goal",
    "/plan",
    "/grill-me",
    "/teamwork-preview",
    "/learn",
    "/schedule",
    "/browser",
    "/btw",
  ];
  const nativeManagement = ["/skills", "/agents", "/tasks", "/hooks", "/mcp"];
  const surfaces = [
    readRepoFile("GEMINI.md"),
    readRepoFile("skills/antigravity-mnemo/templates/gemini-md-rules.md"),
    readRepoFile("docs/resources/antigravity-cli.md"),
  ];

  for (const source of surfaces) {
    for (const command of [...nativeCommands, ...nativeManagement]) {
      assert.ok(source.includes(command), `${command} is missing from an Antigravity routing surface`);
    }
    assert.match(source, /프로그램적으로 호출.*가정하지 않/s);
  }

  const authoringRules = readRepoFile("AGENTS.md");
  for (const command of nativeCommands.slice(0, -1)) {
    assert.ok(authoringRules.includes(command), `${command} is missing from the cross-CLI authoring gate`);
  }
  assert.match(authoringRules, /native workflow[\s\S]*engine/i);
  assert.match(authoringRules, /no unique delta remains source-only|고유 차이.*source-only/i);

  const chronos = readRepoFile("skills/auto-continue-loop/SKILL.md");
  assert.match(chronos, /Claude\/Codex\/Antigravity/);
  assert.match(chronos, /네이티브 `\/goal`/);
  assert.match(chronos, /`\/schedule`[\s\S]*(?:완료 게이트|heartbeat)[\s\S]*(?:아니|대체하지)/);
  assert.doesNotMatch(chronos, /goal이 없는 환경\(Antigravity|Claude\/Codex에 `\/goal`|`\/goal`이 있는 Claude\/Codex에서/);
  assert.match(readRepoFile("skills/zeus/SKILL.md"), /Claude\/Codex\/Antigravity에는 네이티브 `\/goal`/);

  const agentTeam = readRepoFile("skills/agent-team/SKILL.md");
  assert.match(agentTeam, /`\/teamwork-preview`[\s\S]*Wave[\s\S]*파일 소유권/);
  assert.match(agentTeam, /프로그램적으로 호출.*가정하지 않습니다/s);
  const workpm = readRepoFile("skills/workpm/SKILL.md");
  assert.match(workpm, /`\/teamwork-preview`[\s\S]*리서치→제안→도면→구현→검증/);
  assert.match(workpm, /중첩 PM을 만들지 않습니다/);

  const zephermine = readRepoFile("skills/zephermine/SKILL.md");
  assert.match(zephermine, /`\/plan`[\s\S]*`\/grill-me`/);
  assert.match(zephermine, /spec\.md[\s\S]*API\/DB[\s\S]*operation\/QA/);

  for (const relativePath of [
    "skills/memory-distill/SKILL.md",
    "skills/skill-evolve/SKILL.md",
  ]) {
    const source = readRepoFile(relativePath);
    assert.match(source, /Antigravity `\/learn` 경계/);
    assert.match(source, /여러 세션/);
    assert.match(source, /프로그램적으로 호출/);
  }

  const aphrodite = readRepoFile("skills/design-plan/SKILL.md");
  assert.match(aphrodite, /Antigravity `\/browser` 실행 경계/);
  assert.match(aphrodite, /Experience Contract/);
  const minos = readRepoFile("skills/minos/SKILL.md");
  assert.match(minos, /`\/browser`[\s\S]*Playwright[\s\S]*exploratory-only/);
  assert.match(minos, /Playwright 산출물[\s\S]*대체하지 않습니다/);
});

test("hard consumers resolve source-only modules from an exact catalog path and module root", () => {
  const droppedAlternation = ROUTED_SOURCE_ONLY_MODULES.map(escapeRegex).join("|");
  const legacyRelativePath = new RegExp(
    `(?:^|[\\s(\"'\x60])(?:skills[\\\\/]|\\.\\.[\\\\/])(?:${droppedAlternation})(?=[\\\\/\x60])`,
    "m",
  );
  const positiveSlashCall = new RegExp(
    `(?:^|[\\s(\"'\x60])/(?:${droppedAlternation})(?=[\\s\x60\"')]|$)`,
    "g",
  );
  const negativeSemantics = /(?:않|아니|아닙|금지|미등록|(?:가정|호출|취급)하지|never|not\b|do not)/i;
  const assertNoPositiveSlashAssumptions = (source, relativePath) => {
    for (const match of source.matchAll(positiveSlashCall)) {
      const context = source.slice(
        Math.max(0, match.index - 120),
        Math.min(source.length, match.index + match[0].length + 180),
      );
      assert.match(
        context,
        negativeSemantics,
        `${relativePath} assumes a dropped module has a slash-command registration: ${match[0].trim()}`,
      );
    }
  };

  for (const [relativePath, modules] of Object.entries(HARNESS_CONTRACTS)) {
    const source = readRepoFile(relativePath);
    const contract = extractResolutionContract(source, relativePath);
    assert.match(contract, /source-only/i, `${relativePath} does not declare source-only modules`);
    assert.match(contract, /SKILLS-CATALOG\.md/, `${relativePath} does not select a runtime catalog`);
    assert.match(contract, /읽을 경로/, `${relativePath} does not consume the exact catalog path`);
    assert.match(contract, /SKILL\.md/, `${relativePath} does not validate the module entry point`);
    assert.match(
      contract,
      /(?:활성 루트|active root|runtime\s+skills?\s+root)/i,
      `${relativePath} does not check the current runtime active root before the catalog`,
    );
    assert.match(
      contract,
      /skills\/(?:<name>|\{name\})\/SKILL\.md/,
      `${relativePath} does not name the exact active-root module entry point`,
    );
    assert.match(contract, /(?:MODULE_ROOT|module_root)/, `${relativePath} does not derive a module root`);
    assert.match(contract, /(?:NOT RUN|UNVERIFIED|FAIL|BLOCKED)/, `${relativePath} lacks missing-module failure semantics`);
    assert.match(
      contract,
      /(?:registry|레지스트리|runtime\s+Skill\s*목록|런타임\s+Skill\s*목록)/i,
      `${relativePath} does not forbid registry assumptions`,
    );

    for (const moduleName of modules) {
      assert.match(
        contract,
        new RegExp(`(?:^|[^a-z0-9-])${escapeRegex(moduleName)}(?:$|[^a-z0-9-])`, "i"),
        `${relativePath} does not resolve ${moduleName} in its contract`,
      );
    }

    const operationalSource = stripNonOperationalContracts(source);
    assert.doesNotMatch(
      operationalSource,
      legacyRelativePath,
      `${relativePath} bypasses its resolver with a repository-relative internal-module path`,
    );
    assertNoPositiveSlashAssumptions(source, relativePath);
  }

  for (const [relativePath, requiredRoots] of Object.entries(HARD_REFERENCE_ROOTS)) {
    const source = readRepoFile(relativePath);
    for (const requiredRoot of requiredRoots) {
      assert.match(
        source,
        new RegExp(escapeRegex(requiredRoot)),
        `${relativePath} does not use resolved root ${requiredRoot}`,
      );
    }
    assert.doesNotMatch(
      source,
      legacyRelativePath,
      `${relativePath} contains a hard repository-relative internal-module path`,
    );
    assertNoPositiveSlashAssumptions(source, relativePath);
  }
});

test("skill-evolve hands approved comparison work to autoresearch by exact source path", () => {
  const relativePath = "skills/skill-evolve/SKILL.md";
  const source = readRepoFile(relativePath);

  assert.match(source, /MODULE_SKILL\[autoresearch\]/);
  assert.match(source, /SKILLS-CATALOG\.md/);
  assert.match(source, /읽을 경로/);
  assert.match(source, /SKILL\.md.*직접 읽/s);
  assert.match(source, /NOT RUN/);
  assert.match(source, /먼저 대화에 제시/);
  assert.match(source, /승인 뒤에만 파일로 저장/);
  assert.doesNotMatch(
    source,
    /^\s*\/autoresearch\b/m,
    `${relativePath} delegates through an assumed slash registration`,
  );
});

test("Aphrodite verifies Product Design before a one-time install recommendation", () => {
  const source = readRepoFile("skills/design-plan/SKILL.md");
  const heading = "### 0-0. Codex Product Design 추천 게이트";
  const start = source.indexOf(heading);
  assert.notEqual(start, -1, "design-plan is missing the Product Design gate");

  const rest = source.slice(start + heading.length);
  const nextHeading = rest.search(/^### /m);
  const gate = rest.slice(0, nextHeading < 0 ? rest.length : nextHeading);

  for (const status of [
    "READY",
    "ABSENT",
    "RESTART_REQUIRED",
    "UNKNOWN",
    "UNSUPPORTED",
  ]) {
    assert.match(gate, new RegExp(`\\b${status}\\b`), `gate is missing ${status}`);
  }
  assert.match(gate, /codex plugin marketplace list --json/);
  assert.match(gate, /codex plugin list --json/);
  assert.match(gate, /codex plugin list --available --json/);
  assert.match(gate, /marketplace가 0개이거나[\s\S]*`UNKNOWN`/);
  assert.match(gate, /exact `PLUGIN@MARKETPLACE`/);
  assert.match(gate, /정확히 한 번만/);
  assert.match(gate, /exact selector를 보여주기 전의[\s\S]*설치 권한이 아닙니다/);
  assert.match(gate, /동의 전에는 plugin 설치[\s\S]*복사·동기화를 실행하지 않습니다/);
  assert.match(gate, /거절하거나 로컬\s*계속 진행을 선택하면[\s\S]*다시 묻지 않고 로컬 어댑터/);
  assert.match(gate, /실제\s*설치 성공과 새 세션의[\s\S]*확인하기 전에는 `READY`/);
  assert.match(gate, /`--product-design`[\s\S]*설치 동의로 간주하지 않습니다/);
});

test("Aphrodite compares Product Design against the same local contract", () => {
  const source = readRepoFile("skills/design-plan/SKILL.md");
  const critique = readRepoFile(
    "skills/design-plan/references/render-critique-loop.md",
  );
  const motion = readRepoFile(
    "skills/design-plan/references/web-motion-contract.md",
  );

  assert.match(source, /### 5-5\. Product Design 유무 대조/);
  assert.match(source, /동일한 brief[\s\S]*viewport·theme/);
  assert.match(source, /adapter가 `READY`가 아니면[\s\S]*`NOT RUN`/);
  assert.match(critique, /## 7\. Adapter Comparison Contract/);
  assert.match(critique, /같은 계약[\s\S]*두 실행 엔진/);
  assert.match(critique, /숫자 미학 점수 하나로 승자를 정하지 않습니다/);
  assert.match(motion, /Remotion과 HyperFrames/);
  assert.match(motion, /영상 파일 제작은 다루지 않습니다/);
  for (const plugin of ["ScrollTrigger", "Flip", "SplitText", "DrawSVG", "MorphSVG", "MotionPath"]) {
    assert.match(motion, new RegExp(`\\b${plugin}\\b`));
  }
});

test("video-maker routes one project to Remotion or HyperFrames without global skill install", () => {
  const source = readRepoFile("skills/video-maker/SKILL.md");
  const remotion = readRepoFile(
    "skills/video-maker/references/remotion-engine.md",
  );
  const hyperframes = readRepoFile(
    "skills/video-maker/references/hyperframes-engine.md",
  );
  const qa = readRepoFile("skills/video-maker/references/video-qa.md");
  const voice = readRepoFile(
    "skills/video-maker/references/voice-captions.md",
  );

  assert.match(source, /Remotion은 React\/TSX/);
  assert.match(source, /HyperFrames는 HTML\/CSS\/GSAP/);
  assert.match(source, /두 엔진을 같은 프로젝트에[\s\S]*함께 설치하지 않습니다/);
  assert.match(source, /선택하지 않은\s*엔진 reference는 읽거나 적용하지 않습니다/);
  assert.match(source, /`npx skills add heygen-com\/hyperframes`/);
  assert.match(source, /실행하지 않습니다/);
  assert.match(source, /복사·동기화하지 않습니다/);
  assert.match(remotion, /useCurrentFrame\(\)/);
  assert.match(hyperframes, /window\.__timelines/);
  assert.match(hyperframes, /Aphrodite 또는 일반 웹페이지의 모션 런타임으로 추가하지 않습니다/);
  assert.match(qa, /ffprobe/);
  assert.match(qa, /License\/permission/);

  // 영상 요청 진입점은 video-maker이며, 전역 HyperFrames 번들 라우터는 진입점이 아니다.
  assert.match(source, /영상 요청의 유일한 진입점/);
  assert.match(source, /`hyperframes` 라우터[\s\S]*진입점으로 쓰지 않습니다/);
  assert.match(source, /`\/hyperframes`, `\/media-use` 같은 slash 호출로 넘기지 않습니다/);
  assert.match(source, /이미 설치된 서드파티 스킬 번들은 제거·갱신·재설치하지 않습니다/);

  // 어느 엔진이든 Script → Voice → Composition → Captions → Render 5단계를 같은 계약으로 다룬다.
  for (const stage of ["Script", "Voice", "Composition", "Captions", "Render"]) {
    assert.match(source, new RegExp(`^\\| ${stage} \\|`, "m"), `SKILL.md lacks pipeline stage ${stage}`);
  }
  assert.match(source, /스크립트와 스토리보드는 프레임워크가 만들어 주지 않으며/);

  // 번들 모듈은 설치되어 있을 때만 정확한 파일 경로로 읽고, 워크플로우 스킬은 읽지 않는다.
  assert.match(hyperframes, /## 전역 번들 모듈 \(설치되어 있을 때만\)/);
  for (const module of ["hyperframes-core", "hyperframes-cli", "media-use"]) {
    assert.match(hyperframes, new RegExp(`^\\| \`${module}\` \\|`, "m"), `hyperframes-engine.md lacks module ${module}`);
  }
  assert.match(hyperframes, /번들이 없으면 이\s*문서만으로 진행하고[\s\S]*`NOT RUN`/);
  assert.match(hyperframes, /`npx hyperframes@latest upgrade` 안내는 따르지\s*않고/);

  // TTS 공급자는 교체 가능한 계약이며, 자막 정렬은 timestamps 유무로 분기한다.
  for (const provider of ["HeyGen", "ElevenLabs", "Typecast", "Edge TTS", "Kokoro"]) {
    assert.match(voice, new RegExp(`^\\| ${provider} \\|`, "m"), `voice-captions.md lacks provider ${provider}`);
  }
  assert.match(voice, /API 키는 환경 변수로만 읽고/);
  assert.match(voice, /요금이 발생하는 호출은[\s\S]*확인을\s*받습니다/);
  assert.match(voice, /## 5\. 자막 정렬 분기/);
  assert.match(voice, /`\.en` 모델은 비영어 음성을 영어로 번역하므로/);
  assert.match(voice, /@remotion\/captions/);
  assert.match(voice, /tts-to-captions\.md/);
  assert.match(remotion, /createTikTokStyleCaptions/);
});

test("mnemo templates and hooks route memory maintenance without active slash assumptions", () => {
  for (const relativePath of MEMORY_TEMPLATES) {
    const source = readRepoFile(relativePath);
    assert.match(source, /SKILLS-CATALOG\.md/, `${relativePath} lacks catalog routing`);
    assert.match(source, /source-only 하위 모듈/, `${relativePath} lacks source-only module semantics`);
    assert.match(source, /정확한 `SKILL\.md`/, `${relativePath} does not require the exact entry point`);
    assert.match(source, /NOT RUN/, `${relativePath} does not fail closed for missing modules`);
    assert.doesNotMatch(
      source,
      /\/memory-(?:compact|distill)\b/,
      `${relativePath} assumes a memory module slash registration`,
    );
  }

  for (const relativePath of MEMORY_HOOKS) {
    const source = readRepoFile(relativePath);
    assert.match(
      source,
      /카탈로그의 source-only [^\r\n]*memory-distill[^\r\n]*직접 읽어/,
      `${relativePath} does not recommend direct catalog source resolution`,
    );
    assert.doesNotMatch(
      source,
      /\/memory-(?:compact|distill)\b/,
      `${relativePath} assumes a memory module slash registration`,
    );
  }
});
