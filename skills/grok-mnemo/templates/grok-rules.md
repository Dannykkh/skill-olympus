# Grok-Mnemo 규칙 (Grok Build 전용 차이)

Grok Build는 글로벌 `~/.claude/CLAUDE.md`를 rules 호환으로 이미 로드한다.
응답 언어·자율 실행·코드맵·문서·기억·핸드오프·검증은 그 공통 규칙을 재사용한다.
Claude 전용 역할·훅·별칭·복구 도구는 아래 Grok 규칙으로 해석한다. 같은 본문을 다시 복제하지 않는다.

## 로드와 스킬

- `grok inspect`로 실제 로드된 규칙·호환 설정·스킬·훅을 확인한다. Claude 호환의 rules 또는 skills가 비활성화됐다면 공통 규칙이나 스킬을 사용 가능하다고 가정하지 않는다. 사용자 선택을 임의로 변경하지 않는다.
- Olympus의 Grok 스킬은 Claude 공유 표면을 사용한다. `~/.claude/SKILLS-CATALOG.md` → 프로젝트 카탈로그 → `~/.claude/skills/*/SKILL.md` 순서로 조회한다. Grok 자체 스킬·명령도 존재할 수 있으므로 현재 런타임에서 실제 제공되는지 구분한다.
- 상대경로는 실제 프로젝트 파일 → Claude 공유 활성 스킬 → 카탈로그의 source-only 원본을 기준으로 절대경로로 해석한다. 내부 모듈은 정확한 `SKILL.md`를 읽고 그 디렉터리에서 참조·스크립트를 찾는다. 필수 모듈 누락은 `NOT RUN`이다.
- `/mnemo`, 므네모, mnemo는 `grok-mnemo`, `/agent-team`·`/poseidon`은 `agent-team`으로 연결한다. 인용·설명에 이름만 등장하면 실행하지 않는다.
- source-only의 네이티브 등록을 명시적으로 원할 때만 `--include-source-only-skills`로 Claude 공유 표면을 동기화한다. 네이티브 명령과 충돌하는 호출명은 스킬 자연어 요청으로 구분한다.

## 역할과 저장

- 읽기 전용 탐색에는 제공되는 `explore`, 쓰기·명령 실행에는 `general-purpose` 또는 메인을 사용한다. 공통 파일 소유권과 메인의 검증·완료 책임을 유지한다.
- 자동 저장은 `~/.grok/hooks/grok-mnemo.json`의 `UserPromptSubmit`·`Stop` 등록과 `grok-mnemo-save-turn.ps1` 또는 `.sh`가 담당한다. 대화는 `conversations/YYYY-MM-DD-grok.md`, 핸드오프는 `docs/handoffs/`를 사용한다.
- 현재 어댑터는 camelCase 입력과 `lastAssistantMessage`를 사용하며 `reason: end_turn`인 Stop만 저장한다. Claude 어댑터를 대신 실행하지 않는다.

## 원본 세션 확인

- 공통 검색 순서인 `MEMORY.md` → 관련 기억 → 대화 링크·`#tags:` → 대화 본문을 따른다. 모든 CLI의 `conversations/*.md`를 함께 검색하고, 태그 누락을 기록 부재로 판단하지 않는다.
- 그래도 부족하면 프로젝트·시기를 좁혀 `~/.grok/sessions/**/updates.jsonl` 등 실제 세션 경로와 형식을 확인한다. 필요한 사용자·응답 텍스트만 읽기 전용으로 파싱하고 원본 전체나 비밀값을 컨텍스트에 넣지 않는다.
- 현재 `grok-mnemo`에는 세션 일괄 복구 CLI가 없다. Claude·Codex의 reconcile 도구를 Grok 원본에 적용하지 않는다. 파싱할 수 없으면 확인한 검색 범위와 제한을 알린다.
- 정본은 `grok-mnemo`의 `templates/grok-rules.md`, 설치본은 `~/.grok/rules/grok-mnemo.md`이다. 설치 상태는 해당 모듈의 `install.js --check`로 확인한다.
