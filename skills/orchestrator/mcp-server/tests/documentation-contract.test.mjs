import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const read = path => readFileSync(join(process.cwd(), path), 'utf8');
const guide = read('../docs/orchestrator-guide.md');
const readme = read('README.md');
const agents = read('AGENTS.md');
const pmworker = read('../commands/pmworker.md');
const workpm = read('../commands/workpm-mcp.md');
const routedDocs = [guide, readme, agents, pmworker, workpm].join('\n');

test('native delegation docs use semantic roles instead of fixed tool primitive names', () => {
  assert.doesNotMatch(guide, /spawn_agent|spawn_subagent/);
  assert.match(guide, /Codex.+`explorer`\/`worker` 역할/);
  assert.match(guide, /Grok.+`explore`\/`general-purpose` 역할/);
});

test('provider routing docs describe agnostic tasks, worker identity, and fail-closed selection', () => {
  for (const document of [guide, readme, agents, workpm]) {
    assert.match(document, /provider-agnostic/i);
  }
  assert.match(readme, /ORCHESTRATOR_AI_PROVIDER/);
  assert.match(agents, /compare-and-set/i);
  assert.match(workpm, /지원 provider가 하나도 없으면.+실패/);
  assert.doesNotMatch(routedDocs, /vendor별 고정 강점으로 배정(?!하지)/i);
});

test('tool input examples use snake_case task_id', () => {
  assert.match(pmworker, /orchestrator_claim_task\s*\{\s*"task_id"/);
  assert.match(pmworker, /orchestrator_complete_task\s*\{\s*"task_id"/);
  assert.match(pmworker, /orchestrator_fail_task\s*\{\s*"task_id"/);
});

test('operator docs do not recommend approval bypass flags or fixed provider strengths', () => {
  assert.doesNotMatch(routedDocs, /dangerously-skip-permissions|approval-mode\s+yolo|\-a\s+never/);
  assert.doesNotMatch(routedDocs, /AI Provider 별 강점|강점 및 최적 용도|AI 강점 조회/);
});

test('shared implementation notes remain PM-owned', () => {
  assert.match(workpm, /공유 `implementation-notes\.md`를 직접 수정하지 않음/);
  assert.match(workpm, /PM만 반환 결과를 취합해 `Deviations`에 기록/);
  assert.doesNotMatch(workpm, /태스크 prompt에 `implementation-notes\.md` 기록 규칙 포함/);
});
