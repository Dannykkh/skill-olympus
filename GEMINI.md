# GEMINI.md

<!-- CODEMAP_RULES_START -->

## Code Map (자동 생성)

> 이 섹션은 TermSnap CodeMapService가 자동 관리합니다. 수동 편집하지 마세요.

코드 위치를 찾을 때 다음 순서로 진행하세요. 앞 단계에서 충분한 정보를 얻으면 다음 단계는 건너뜁니다.

1. **`codemap/index.md`** — 카테고리 + 파일 수 요약. 어느 카테고리를 봐야 할지 먼저 확인.
2. **해당 카테고리 `.md` grep** — 통째 read 금지. 항목 옆 `(L123)` 라인 번호는 그대로 `Read(file, offset=L, limit=N)` 사용.
3. **검색 결과가 많으면 로컬 압축 우선** — `rg --json`/`rg --vimgrep`/`file:line:text` 결과를 파일별로 묶고 routes/api/ui 신호와 source/test/document 가중치로 상위 파일만 읽음. MCP `codemap_compress_search`는 외부 agent용 선택 경로이며 필수 단계가 아님.
4. **못 찾으면 일반 grep/Glob** — codemap이 stale일 수 있음. 의심되면 사용자에게 "코드맵 갱신"을 권장.

코드 위치 답변 시 `file:line` 형식 사용 (예: `RAGService.cs:53`).

<!-- CODEMAP_RULES_END -->
