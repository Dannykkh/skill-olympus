# Architecture - 설계 결정

> MEMORY.md 키워드 인덱스에서 이 파일로 연결됩니다.

---

### agents, skills, passive-context, vercel
`tags: agents, skills, passive-context, vercel`
`date: 2026-01-31`

- **AGENTS.md**: 프레임워크 지식, 코드 생성 규칙 (패시브 = 100% 통과율)
- **Skills**: 사용자 트리거 워크플로우, 마이그레이션
- **원칙**: Retrieval-led reasoning > Pre-training knowledge
- **참조**: [2026-01-31 대화](.claude/conversations/2026-01-31.md)

### memory, conversation, hooks, append, context-tree, response-saving
`tags: memory, conversation, hooks, append, context-tree, response-saving`
`date: 2026-02-03`

- Before: Stop 훅에서 Claude 2번 호출 (키워드 추출 + 메모리 업데이트)
- After: Stop 훅 없음, Claude가 대화 중 직접 처리
- **이유**: 속도 개선 (훅에서 AI 호출 금지 원칙)
- Before: 코드 작성, 파일 수정 등 "실제 작업"만 저장
- After: 의미있는 대화 모두 저장 (토론, 의사결정 과정 포함)
- **이유**: "의견을 도출해나가는 과정"도 가치 있음
- **제외**: 단순 인사, 잡담만
- User 입력: 훅에서 자동 저장
- Assistant 응답: Claude가 직접 저장 (Edit 도구, ~100ms) → 실패, Stop 훅으로 대체
- MEMORY.md: 컨텍스트 트리 구조 (architecture/, patterns/, gotchas/)

### synonym, 동의어, search, 확장, memory, grep
`tags: synonym, 동의어, search, 확장, memory, grep`
`date: 2026-02-04`

- 과거 대화 검색 시 정확한 키워드 매칭 → **동의어/관련어 확장** 검색으로 개선
- 한↔영 양방향 확장 (예: "병렬 작업" → parallel, orchestrator, pm-worker)
- 최대 3회 재시도, 하위 키워드 발견 시 추가 탐색 1회
- 벡터 DB 없이 Claude의 언어 이해력으로 동의어 확장
- CLAUDE.md 검색 규칙 3단계 → 5단계로 확장
- **참조**: [2026-02-04 대화](.claude/conversations/2026-02-04.md)

### stop-hook, transcript, save-response, jsonl
`tags: stop-hook, transcript, save-response, jsonl`
`date: 2026-02-08`

- **변경 이유**: "Claude가 직접 저장"은 실행되지 않음 (수동 지시 무시됨)
- Stop 훅에서 **AI 호출 없이** transcript JSONL에서 기계적으로 추출
- Claude Code JSONL은 thinking/text/tool_use를 별도 줄로 분리 → `"type":"assistant"` AND `"type":"text"` 모두 매칭 필요
- **2026-02-08 개선**: Tail 20→500 (도구 100+개 호출 시에도 텍스트 추출), 500자→2000자 (상세 응답 보존), HH:mm→HH:mm:ss (초 단위 중복 방지)
- **2026-02-08 성능 수정**: `Get-Content -Tail 500` → `FileStream.Seek` 역방향 읽기. 대용량 JSONL(수백MB)에서 1분+ → 수ms. 512KB 청크, 최대 5MB 탐색. `.sh`는 `tail -n`이 이미 lseek 사용하므로 수정 불필요
- **파일**: `hooks/save-response.ps1`, `hooks/save-response.sh`
- **참조**: [2026-02-08 대화](.claude/conversations/2026-02-08.md)

### official-docs, frontmatter, subagent-spec, 공식문서, claude-code-docs
`tags: official-docs, frontmatter, subagent-spec, 공식문서, claude-code-docs`
`date: 2026-02-09`

- `name` (필수), `description` (필수)
- `tools`, `disallowedTools`, `model` (sonnet/opus/haiku/inherit)
- `permissionMode` (default/acceptEdits/delegate/dontAsk/bypassPermissions/plan)
- `maxTurns`, `skills` (프리로드), `mcpServers` (서브에이전트에 MCP 할당)
- `hooks` (서브에이전트 스코프 훅), `memory` (user/project/local 영속)

### agent, skill, fullstack, spring-boot, react, orchestration, flow
`tags: agent, skill, fullstack, spring-boot, react, orchestration, flow`
`date: 2026-02-03`

- Before: 단일 에이전트 484줄 (규칙+코드 예시 혼재)
- After: 에이전트(~235줄 규칙/체크리스트) + 스킬(코드 예시 + templates/)
- **이유**: 500줄 제한 준수, 패시브 에이전트는 규칙만, 상세 코드는 on-demand
- 백엔드 4계층: Controller → Flow → Service → Repository
- Flow 항상 존재 (단순 위임도 통일성 우선)
- 프론트 Feature-based + TanStack Query 3계층
- Java/Spring Boot 12개 코딩 규칙 포함 (@Transactional, DTO 변환, 예외 처리 등)

### global-install, codex-parity, mnemo-name
`tags: global-install, codex-parity, mnemo-name`
`date: 2026-03-13`
`source: codex`

- Codex runtime의 source of truth는 repo-local이 아니라 전역 설치본(`~/.codex`, Roaming 설치 경로)으로 유지하고, repo 변경은 sync/install을 통해 반영.
- 원칙상 Claude에서 제공하는 skills, agents, hooks, rules, MCP 기능은 Codex에서도 동일 기능 parity를 목표로 맞추며, 단순 복사가 아니라 Codex 실행 모델에 맞는 bridge/adapter까지 포함해 구현.
- 사용자 호출명도 CLI 간 동일하게 유지하고, 우선 고정 호출명은 `/zephermine`, `/zeus`, `workpm`, `/chronos`, `/qpassenger`, `/agent-team`으로 관리한다. parity 판단은 "파일이 복사됐는가"가 아니라 "전역 설치본에서 실제 같은 이름으로 호출되고 동작하는가" 기준으로 한다.
- `mnemo` 명칭은 유지하고 `codex-mnemo`, `gemini-mnemo`는 CLI별 어댑터 이름으로 계속 사용.
