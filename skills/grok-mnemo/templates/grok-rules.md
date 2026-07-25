# Grok-Mnemo 규칙 (Grok Build 전용 델타)

> Grok Build는 글로벌 `~/.claude/CLAUDE.md`를 rules 호환으로 이미 로드하므로,
> 공통 mnemo 규칙(응답 키워드 태그, 과거 대화 검색, MEMORY.md 관리, 핸드오프)은 거기서 적용됩니다.
> 이 파일은 Grok에서만 다른 부분만 담습니다.

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
- `conversations/`에서 못 찾으면 다른 CLI 파일(`*-claude.md`, `*-codex.md`, `*-gemini.md`)까지
  통합 검색한 뒤, 그래도 없으면 "관련 기록을 찾지 못했습니다"라고 솔직히 답변합니다.

## Grok 저장 경로 요약

| 항목 | 위치 |
|------|------|
| 대화 로그 | `conversations/YYYY-MM-DD-grok.md` (프로젝트) |
| 훅 스크립트 | `~/.grok/hooks/grok-mnemo-save-turn.ps1\|.sh` |
| 훅 등록 | `~/.grok/hooks/grok-mnemo.json` |
| 이 규칙 파일 | `~/.grok/rules/grok-mnemo.md` |
| 핸드오프 | 공통 프로젝트 경로 `docs/handoffs/YYYY-MM-DD-HHMMSS-slug.md` |
