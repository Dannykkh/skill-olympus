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
