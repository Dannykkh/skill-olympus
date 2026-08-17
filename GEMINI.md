# GEMINI.md

## Native-First 구현 경계

- 공개 추적 스킬 소스 99개 중 사용자 진입점 하네스 11개와 Gemini 어댑터 2개만 기본 활성화합니다. 나머지 82개는 `~/.gemini/SKILLS-CATALOG.md`의 source-only 내부·선택 모듈로 보존합니다.
- `skills/{name}/...` 참조는 프로젝트 파일이 없으면 `~/.gemini/skills/{name}/...`, 이어서 카탈로그의 source-only `읽을 경로`로 절대경로를 해석합니다. 활성 하네스는 하위 모듈을 별도 스킬로 호출하지 않고 정확한 `SKILL.md`를 직접 읽으며 참조·스크립트는 그 모듈 루트를 기준으로 실행합니다.
- 필수 source-only 모듈 누락은 실패 또는 `NOT RUN`으로 남기고, 선택 모듈만 명시된 네이티브 폴백을 사용합니다. 누락을 `PASS`로 처리하지 않습니다.
- Olympus 사용자 정의 에이전트는 기본 등록 0개이며 source-only `agents/*.md`를 런타임 능력으로 취급하지 않습니다. 절차는 명시형 스킬이 소유합니다.
- 읽기 전용 탐색은 Gemini 내장 `codebase_investigator`, 파일 생성·수정·명령 실행은 `generalist`를 사용합니다. 읽기 전용 작업자에게 쓰기 작업을 주지 않습니다.
- 메인 컨텍스트가 공유 태스크 장부·활동 로그·완료 판정을 소유합니다. 작업자는 고유 파일 또는 반환값만 담당하고, 위임이 없거나 병렬 이득이 없으면 메인 컨텍스트에서 순차 실행합니다.

<!-- CODEMAP_RULES_START -->

## Code Map (자동 생성)

> 이 섹션은 TermSnap CodeMapService가 자동 관리합니다. 수동 편집하지 마세요.

코드 위치를 찾을 때 다음 순서로 진행하세요. 앞 단계에서 충분한 정보를 얻으면 다음 단계는 건너뜁니다.

1. **`codemap/index.md`** — 카테고리 + 파일 수 요약. 필요하면 `codemap/info.md`의 작업별 라우터로 읽는 순서를 확인.
2. **해당 카테고리 `.md` grep** — 통째 read 금지. 항목 옆 `(L123)` 라인 번호는 그대로 `Read(file, offset=L, limit=N)` 사용.
3. **검색 결과가 많으면 로컬 압축 우선** — `rg --json`/`rg --vimgrep`/`file:line:text` 결과를 파일별로 묶고 routes/api/ui 신호와 source/test/document 가중치로 상위 파일만 읽음. MCP `codemap_compress_search`는 외부 agent용 선택 경로이며 필수 단계가 아님.
4. **못 찾으면 일반 grep/Glob** — codemap이 stale일 수 있음. 의심되면 사용자에게 "코드맵 갱신"을 권장.

코드 위치 답변 시 `file:line` 형식 사용 (예: `RAGService.cs:53`).

<!-- CODEMAP_RULES_END -->
