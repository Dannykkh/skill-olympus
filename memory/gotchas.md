# Gotchas - 주의사항, 함정

> MEMORY.md 키워드 인덱스에서 이 파일로 연결됩니다.

---

### windows-bat, utf8, chcp65001
`tags: windows-bat, utf8, chcp65001`
`date: 2026-03-13`
`source: codex`

- tracked `.bat`/`.js` 점검 결과 BOM 문제는 없었고, Windows 쪽 실제 위험 요소는 BOM보다 **비ASCII 문자가 들어간 `.bat`에서 `chcp 65001 >nul`이 빠진 경우**였다.
- `.js`는 Node가 UTF-8 no-BOM을 정상 처리하므로 line ending/LF 자체는 주 원인이 아니고, `.bat`는 한글 echo/comment가 있으면 UTF-8 codepage를 먼저 고정하는 편이 안전하다.
- **참조**: [대화 링크](conversations/2026-03-13-codex.md)

### duplication, skill, agent
`tags: duplication, skill, agent`
`date: 2026-01-31`

- 새 스킬/에이전트 추가 전 기존 항목과 중복 확인
- 예: erd-designer는 mermaid-diagrams에 포함 → 삭제됨

### context, token, loading
`tags: context, token, loading`
`date: 2026-01-31`

- Skills: on-demand 로딩 (트리거 시에만)
- AGENTS.md: 항상 로드 → 핵심만 압축
- 500줄+ 파일: 참조로 분리 (progressive disclosure)

### doc-sync-checklist ❌ SUPERSEDED
`tags: doc-sync-checklist, readme, agents-md, registry, 문서동기화`
`date: 2026-02-08`
`superseded-by: #cross-cli-sync-checklist`

- 에이전트 전용 체크리스트 → 전체 리소스 + 크로스-CLI로 확장됨
- **참조**: [2026-02-08 대화](.claude/conversations/2026-02-08.md)

### cross-cli-sync-checklist ✅ CURRENT
`tags: cross-cli-sync, doc-sync, codex, gemini, 문서동기화, 체크리스트`
`date: 2026-02-19`
`source: claude`
`supersedes: #doc-sync-checklist`

**변경 이유**: 에이전트 전용 체크리스트를 전체 리소스 + 크로스-CLI로 확장

**CLAUDE.md에 영구 규칙으로 등록됨.** 스킬/에이전트/훅/MCP 변경 시:

1. **문서 동기화** (5~7개 파일):
   - AGENTS.md, README.md, README-ko.md, QUICK-REFERENCE.md, smart-setup-registry.json
   - 에이전트 시: fullstack-development-workflow.md 2곳 추가

2. **크로스-CLI 동기화** (Claude ↔ Codex ↔ Gemini):
   - Skills/Agents/Hooks: `sync-codex-assets.js`, `sync-gemini-assets.js`가 자동 처리
   - MCP: 3개 install-mcp 스크립트 각각 업데이트
   - Mnemo: CLI별 전용 install.js
   - 훅 이벤트 차이: Claude(Stop), Codex(notify), Gemini(AfterAgent)

3. **문서 품질 기준**:
   - description에 트리거 설명 포함
   - Related Files 실제 경로만 (플레이스홀더 금지)
   - README에서 사용자가 찾을 수 있도록 카테고리 등록

- **참조**: 이 세션 (2026-02-19)

### context-explosion, team-review, return-rule, 컨텍스트폭발, zephermine
`tags: context-explosion, team-review, return-rule, 컨텍스트폭발, zephermine`
`date: 2026-02-09`

- **문제**: 젭마인 Step 9 (5개 에이전트 팀 리뷰) 실행 시 컨텍스트 한도 초과
- **원인**: 5개 Explore 서브에이전트가 **분석 전문을 return text로 반환** → 메인 대화에 합산되어 폭발
- **해결**: `CRITICAL RETURN RULE` 추가 — 전체 분석은 파일에만 쓰고, return은 1줄 요약만
- `✅ {filename}.md 작성 완료. Critical: N건, Important: N건, Nice-to-Have: N건`
- **수정 파일**:
- `skills/zephermine/SKILL.md` Step 9: ⚠️ CONTEXT MANAGEMENT 경고 추가
- `skills/zephermine/references/team-review-protocol.md`: 5개 에이전트 프롬프트에 return rule 삽입
- **교훈**: Task 도구의 return value는 메인 컨텍스트에 추가됨 → 서브에이전트가 파일 쓰기 후 짧은 요약만 반환해야 함

### save-response, context-limit, 미저장, stop-hook, transcript
`tags: save-response, context-limit, 미저장, stop-hook, transcript`
`date: 2026-02-09`

- **문제**: 컨텍스트 한도 초과 시 대화 내용이 저장되지 않음
- **분석 결과**: 정상 동작 (버그 아님)
- 컨텍스트 한도 → API가 요청 거부 → assistant 텍스트 응답 생성 안 됨
- Stop 훅(`save-response.ps1`)은 assistant 텍스트를 추출 → 텍스트가 없으므로 저장할 것 없음
- **보존되는 것**: transcript JSONL 파일 + 서브에이전트가 디스크에 쓴 파일
- **보존 안 되는 것**: 마지막 assistant 응답 (생성 자체가 안 됨)
- **대응**: 별도 수정 불필요, 사용자에게 동작 설명

### filestream, seek, tail, 대용량, powershell, get-content
`tags: filestream, seek, tail, 대용량, powershell, get-content`
`date: 2026-02-08`

- PowerShell `Get-Content -Tail N`은 **파일 전체를 메모리에 로드** 후 마지막 N줄 반환 → 수백MB에서 1분+
- 해결: `[System.IO.FileStream]::Seek`로 끝에서 청크 단위 역방향 읽기 → 수ms
- Linux/Mac `tail -n N`은 `lseek` 사용하여 이미 효율적 → 수정 불필요
- **교훈**: PowerShell과 Unix 도구의 동작 방식이 다름, 대용량 파일 처리 시 항상 확인

### memory-explosion, install-log, MEMORY.md, 쓰레기데이터
`tags: memory-explosion, install-log, MEMORY.md, 쓰레기데이터`
`date: 2026-03-08`
`source: claude`

- **문제**: MEMORY.md에 install 출력 로그(400줄)가 통째로 저장되어 성능 경고 발생
- **원인**: `source:` 필드에 로그 텍스트가 들어감 (구조화된 항목이 아닌 raw 출력)
- **해결**: `/memory-compact` 스킬 생성 + CLAUDE.md 규칙에 크기 가드(100줄/5KB) 추가
- **예방**: MEMORY.md에는 인덱스만, 상세 내용은 `memory/*.md`로, 로그/출력은 절대 저장 금지

### orchestrator-mcp, dependency-missing, node-modules, handshake, install-bat, install-sh
`tags: orchestrator-mcp, dependency-missing, node-modules, handshake, install-bat, install-sh`
`date: 2026-02-19`
`source: codex`

- 증상: `MCP startup failed: handshaking with MCP server failed: connection closed: initialize response`
- 실제 원인: `dist/index.js`는 존재하지만 `node_modules/@modelcontextprotocol/sdk`가 없어 런타임 즉시 종료
- 로그 단서: `Error [ERR_MODULE_NOT_FOUND]: Cannot find package '@modelcontextprotocol/sdk' .../dist/index.js`
- 즉시 복구: 실행 경로의 `skills/orchestrator/mcp-server`에서 `npm install && npm run build`
- 재발 방지: `install.bat`, `install.sh`에서 `dist` 존재 여부만 보지 않고 `node_modules/@modelcontextprotocol/sdk/package.json`도 함께 검사하도록 수정
- **참조**: [대화 링크](conversations/2026-02-19-codex.md)

### qa-test-planner-yaml, orchestrator-install, better-sqlite3, codex-project-root
`tags: qa-test-planner, yaml, frontmatter, orchestrator, better-sqlite3, codex-project-root`
`date: 2026-03-21`
`source: codex`

- `skills/qa-test-planner/SKILL.md` frontmatter는 한 key에 여러 quoted scalar를 쉼표로 이어 써서 YAML 파싱이 깨졌다.
- 해결: `description`을 folded block scalar (`>`)로 바꿔 Codex 스킬 로더가 정상 파싱하도록 수정했다.
- Codex용 `orchestrator`는 `dist`와 MCP SDK만 확인하고 등록해 `better-sqlite3`가 빠진 설치본에서도 handshake 실패가 재발할 수 있었다.
- 해결: `install.bat`, `install.sh`에서 `node_modules/better-sqlite3/package.json`까지 확인해 누락 시 재설치/재빌드하도록 강화했다.
- 추가로 전역 Codex 등록 시 `ORCHESTRATOR_PROJECT_ROOT`를 설치 디렉터리로 고정하던 동작을 제거해, 런타임이 현재 워크스페이스 기준으로 동작하게 맞췄다.
- 즉시 복구 절차: 실행 경로의 `skills/orchestrator/mcp-server`에서 `npm install && npm run build` 후 `codex mcp remove/add orchestrator`
- **참조**: [대화 링크](conversations/2026-03-21-codex.md)

### powershell-bom, system-text-encoding-utf8, utf8nobom
`tags: powershell, bom, utf8, encoding, system-text-encoding`
`date: 2026-04-08`
`source: claude`

- **함정**: PowerShell의 `[System.Text.Encoding]::UTF8`은 **BOM 포함** 인코더 (혼동 큰 .NET API)
- 결과: `WriteAllText`/`AppendAllText`로 새 파일 만들면 첫 3 바이트가 `EF BB BF` BOM으로 시작
- 영향: 첫 줄 grep/awk 매칭 실패, log 파일 cutoff 정규식 깨짐, mnemo-errors.log 24시간 카운트 오류
- **해결**: 파일 상단에 `$Utf8NoBom = New-Object System.Text.UTF8Encoding $false` 정의 후 모든 호출에 사용
- 8개 PS 스크립트 18곳에서 일괄 교체
- **참조**: commit b11761e

### powershell-join-path, ps5.1, 3-arg-unsupported
`tags: powershell, join-path, ps-5.1, windows`
`date: 2026-04-08`
`source: claude`

- **함정**: PowerShell 5.1의 `Join-Path`는 인수 2개만 받음 (PS 6+에서 `-AdditionalChildPath` 추가)
- `Join-Path $base "memory" "gotchas"` → 에러: "'gotchas' 인수를 허용하는 위치 매개 변수를 찾을 수 없습니다"
- **해결**: 중첩 호출 — `Join-Path (Join-Path $base "memory") "gotchas"`
- 발견 위치: gemini-mnemo, codex-mnemo, save-tool-use 각 SKILL의 observation 블록
- 증상: 대화 진행 중 "에러 잔뜩 출력" — 실제 저장은 성공하지만 stderr 노이즈

### subprocess-encoding-cp949, python-windows, korean
`tags: python, subprocess, encoding, cp949, windows, korean`
`date: 2026-04-08`
`source: claude`

- **함정**: `subprocess.run(text=True)`만 쓰면 Windows에서 시스템 기본 인코딩(cp949)으로 디코딩 시도
- git 출력에 한글이 포함되면 `UnicodeDecodeError: 'cp949' codec can't decode...`
- handoff 스크립트(create_handoff.py / check_staleness.py)의 git rev-parse 호출에서 발생
- **해결**: `text=True, encoding="utf-8", errors="replace"` 명시
- `read_text()` / `write_text()` 도 동일하게 `encoding="utf-8"` 명시 필요
- `sys.stdout.reconfigure(encoding="utf-8")`도 추가 (한글 print 깨짐 방지)

### windows-app-store-python3-stub, exit-49
`tags: python, windows, app-store, python3, stub, exit-49`
`date: 2026-04-08`
`source: claude`

- **함정**: Windows에서 `python3` 명령은 보통 App Store stub
- 위치: `C:\Users\...\AppData\Local\Microsoft\WindowsApps\python3.exe`
- 실행 시 Windows Store로 리다이렉트하면서 **exit code 49** 반환
- 영향: bash 스크립트가 `command -v python3` → 성공하니까 사용 → exit 49
- **해결**: 순서를 `python` → `py` → `python3`으로. 또한 `--version`으로 stub 검증 후 사용
- reconcile-conversations.sh에 적용

### codex-cwd-stay-as-bin-debug, payload-cwd-not-normalized
`tags: codex, cwd, sub-directory, vs-bin-debug, normalization`
`date: 2026-04-08`
`source: claude`

- **함정**: Codex save-turn은 payload의 cwd 필드를 그대로 사용 (git rev-parse 정규화 없음)
- 결과: Visual Studio가 bin/Debug에서 실행되어 그 cwd가 payload에 들어오면 conversations가 거기에 생성
- **해결**: baseDir 결정 직후 `git -C $baseDir rev-parse --show-toplevel`로 부모 git root 정규화
- Gemini의 save-turn도 동일 문제 — 동일 패턴으로 수정
- Claude의 헬퍼(Get-ClaudeProjectRoot)는 transcript JSONL에서 cwd 추출 → Codex/Gemini는 다른 source

### gemini-no-transcript, hook-failure-permanent-loss
`tags: gemini, transcript, hook-failure, data-loss, no-recovery`
`date: 2026-04-08`
`source: claude`

- **구조적 한계**: Gemini CLI는 자체 conversation transcript를 저장하지 않음
- Claude (`~/.claude/projects/.../*.jsonl`) / Codex (`~/.codex/sessions/.../rollout-*.jsonl`)와 달리, Gemini는 hook payload만이 유일한 데이터
- 결과: **save-turn hook이 한 번 실패하면 해당 turn은 영구 손실** (reconcile 불가능)
- mitigation: gemini-mnemo의 save-turn fail-open 강화 + .claude/mnemo-errors.log에 기록
- 사용자 인지 필요: Gemini reconcile 자동화 불가, 수동도 source 자체가 없음

### codex-notify-only-event, no-pretooluse-block
`tags: codex, notify, hook-event, pretooluse, block, structural-limit`
`date: 2026-04-08`
`source: claude`

- **구조적 한계**: Codex CLI는 `notify` event 1개만 존재 — turn이 끝난 후에만 발동
- 결과: PreToolUse 시점이 없어서 `protect-files`, `check-new-file` 같은 **차단형 hook 절대 동작 불가**
- codex-hook-bridge.js가 turn 끝에 모든 변경 파일을 검증하지만, 이미 일이 끝난 사후 검증
- 사용자가 `.env`나 `credentials.json`을 수정해도 차단되지 않음 (경고만)
- mitigation 불가능 — Codex CLI 자체 한계
