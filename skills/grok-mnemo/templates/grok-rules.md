# Grok-Mnemo 규칙 (Grok Build 전용 델타)

> Grok Build는 글로벌 `~/.claude/CLAUDE.md`를 rules 호환으로 이미 로드하므로,
> 공통 mnemo 규칙(응답 키워드 태그, 과거 대화 검색, MEMORY.md 관리, 핸드오프)은 거기서 적용됩니다.
> 이 파일은 Grok에서만 다른 부분만 담습니다.

- Olympus 사용자 정의 에이전트는 기본 등록 0개다. 일반 분업은 CLI 네이티브 서브에이전트를 사용하고, 절차는 명시형 스킬이 소유한다. source-only `.md`는 런타임 능력으로 간주하지 않는다.
- Olympus 스킬은 사용자 진입점 하네스만 `~/.claude/skills/`에 기본 활성화한다. 하위 기능은 `~/.claude/SKILLS-CATALOG.md`의 source-only 내부 모듈로 보존하고 그 요청 동안만 직접 읽는다.
- 스킬 문서의 `skills/{name}/...`는 프로젝트에 실제 파일이 없으면 `~/.claude/skills/{name}/...`, 이어서 카탈로그의 source-only 원본을 기준으로 절대경로를 해석한다.
- 활성 하네스가 source-only 하위 모듈을 필요로 하면 `/name` 호출로 넘기지 않는다. 정확한 `SKILL.md`를 직접 읽고 참조·스크립트는 그 모듈 디렉터리 기준으로 실행한다. 필수 모듈 누락은 실패 또는 `NOT RUN`, 선택 모듈만 명시된 네이티브 폴백을 허용한다.
- source-only 스킬은 자연어 요청으로 카탈로그에서 라우팅한다. 네이티브 `/이름` 등록이 필요하면 `--include-source-only-skills`로 Claude 호환 스킬을 다시 동기화한다.
- Grok의 읽기 전용 탐색은 `explore`, 파일 생성·수정·명령 실행은 `general-purpose`에 맡긴다. 읽기 전용 작업자에게 쓰기 작업을 주지 않는다.
- 메인 컨텍스트가 공유 태스크 장부·활동 로그·완료 판정을 소유한다. 작업자는 고유 파일을 맡거나 결과만 반환하며 같은 공유 파일을 함께 쓰지 않는다.
- 네이티브 위임 도구가 없거나 병렬 이득이 없으면 같은 계약을 메인 컨텍스트에서 순차 실행한다.

## 대화 자동 저장 (grok-mnemo)

- Grok 세션의 대화는 `~/.grok/hooks/grok-mnemo.json` 훅(UserPromptSubmit + Stop)이
  프로젝트의 `conversations/YYYY-MM-DD-grok.md`에 자동 저장합니다.
- 글로벌 CLAUDE.md의 "Stop 훅이 응답 텍스트를 자동 저장" 규칙은 Grok에서도 동일하게 적용됩니다.
  응답 끝에 `` `#tags: keyword1, keyword2, ...` `` 블록을 붙여 검색 가능하게 하세요.
- `<private>...</private>` 블록은 저장 전에 `[PRIVATE]`로 대체됩니다.

## 호출명 매핑 (Grok 전용)

- `/mnemo`, `므네모`, `mnemo` 요청 시 Grok에서는 `grok-mnemo` 스킬(SKILL.md)을 기준으로 안내합니다.
  (저장 구조·훅 경로가 Claude용 mnemo와 다름)

## 과거 대화 검색 시 주의 (Grok 전용)

- Grok 자체 transcript(`~/.grok/sessions/**/updates.jsonl`)는 mnemo 내부 백업 취급입니다.
  Read 도구로 직접 열지 마세요. 검색 대상은 **오직 프로젝트의 `conversations/*.md`** 입니다.
- `conversations/`에서 못 찾으면 다른 CLI 파일(`*-claude.md`, `*-codex.md`, `*-antigravity.md`)과 legacy `*-gemini.md`까지
  통합 검색한 뒤, 그래도 없으면 "관련 기록을 찾지 못했습니다"라고 솔직히 답변합니다.

## Grok 저장 경로 요약

| 항목 | 위치 |
|------|------|
| 대화 로그 | `conversations/YYYY-MM-DD-grok.md` (프로젝트) |
| 훅 스크립트 | `~/.grok/hooks/grok-mnemo-save-turn.ps1\|.sh` |
| 훅 등록 | `~/.grok/hooks/grok-mnemo.json` |
| 이 규칙 파일 | `~/.grok/rules/grok-mnemo.md` |
| 핸드오프 | 공통 프로젝트 경로 `docs/handoffs/YYYY-MM-DD-HHMMSS-slug.md` |
