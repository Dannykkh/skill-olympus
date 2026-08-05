// impeccable-detect.mjs — PostToolUse 훅: UI 파일 편집 시 impeccable 결정론 검출기(59규칙) 실행
// 등록: ~/.claude/settings.json PostToolUse (matcher: Edit|Write|MultiEdit)
// 계약: 어떤 경우에도 exit 0 (턴을 깨지 않음). 발견이 있을 때만 stdout으로 요약 출력.
// 근거: docs/research/2026-08-05-deep-research-impeccable.md — 금지 규칙은 프롬프트가 아니라 린터로.
import { spawnSync } from 'node:child_process';
import { existsSync, statSync, readFileSync } from 'node:fs';
import { extname } from 'node:path';

const UI_EXTENSIONS = new Set(['.html', '.htm', '.css', '.scss', '.jsx', '.tsx', '.vue', '.svelte', '.astro']);
const MAX_FILE_BYTES = 2 * 1024 * 1024; // 대용량 번들/생성물 스킵
const MAX_FINDINGS_SHOWN = 10;

function readStdin() {
  try { return readFileSync(0, 'utf8'); } catch { return ''; }
}

try {
  const raw = readStdin();
  if (!raw) process.exit(0);
  const payload = JSON.parse(raw);
  const filePath = payload?.tool_input?.file_path || payload?.tool_input?.notebook_path || '';
  if (!filePath || !UI_EXTENSIONS.has(extname(filePath).toLowerCase())) process.exit(0);
  if (!existsSync(filePath) || statSync(filePath).size > MAX_FILE_BYTES) process.exit(0);

  // npx는 첫 실행 후 캐시됨. shell 경유(윈도우 npx.cmd 대응).
  // 주의: detect는 발견이 있으면 exit 2 — 종료 코드와 무관하게 stdout을 파싱해야 함.
  const res = spawnSync(`npx -y impeccable detect --json "${filePath}"`, {
    encoding: 'utf8', timeout: 40000, shell: true, windowsHide: true,
  });
  const findings = JSON.parse(res.stdout || '[]');
  if (!Array.isArray(findings) || findings.length === 0) process.exit(0);

  const byRule = {};
  for (const f of findings) byRule[f.antipattern] = (byRule[f.antipattern] || 0) + 1;
  const lines = [`[impeccable detect] ${filePath} — ${findings.length}건: ` +
    Object.entries(byRule).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}(${v})`).join(', ')];
  // 규칙별 대표 스니펫 1건씩 (같은 규칙 반복으로 슬롯 낭비 방지)
  const seen = new Set();
  let shown = 0;
  for (const f of findings) {
    if (seen.has(f.antipattern) || shown >= MAX_FINDINGS_SHOWN) continue;
    seen.add(f.antipattern); shown++;
    lines.push(`  - ${f.antipattern}: ${(f.snippet || f.name || '').toString().slice(0, 120)}`);
  }
  if (byRule['low-contrast']) {
    lines.push('  (주의: 정적 모드는 다크 미디어 분기·호버 전환 색을 오짝으로 계산할 수 있음 — 렌더 확인으로 교차 검증)');
  }
  console.log(lines.join('\n'));
} catch {
  // 네트워크/파싱/타임아웃 실패 — 훅은 절대 턴을 깨지 않는다
}
process.exit(0);
