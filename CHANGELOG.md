# Changelog

All notable changes to this project will be documented in this file.

## [4.8.6] - 2026-06-20

### Bug Fixes
- **orchestrator**: provider 설명에서 stale 모델 라벨(GPT-5.2 / Gemini 3 Pro) 제거. detectAIProviders가 CLI명만 표시 — 워커는 각 CLI 기본 모델로 실행되므로(모델 비지정) 라벨에 모델명이 불필요하고 stale만 유발했음. README/launch.ps1 + 3-CLI 설치본까지 정리 (5529fe2)

### Documentation
- **resources**: 방치된 외부 도구 문서 3건(multi-llm-integration, pal-mcp, claude-flow) 삭제 + README 인덱스 정리. 모두 4~5개월 미갱신·미사용 서드파티 도구 소개. External AI CLI 테이블 모델 라벨도 제거, 통계 25+→22+ (ff90cc1)

## [4.8.5] - 2026-06-17

### Fixed — mnemo notify 임계값 누적 카운터 버그 (delta 전환)

`save-response`/`save-turn` 훅의 mnemo-status notify가 `observations.jsonl` **누적 total**(>=500)로 판정해, 누적이 한 번 임계를 넘기면 `/memory-distill`을 돌려도 파일이 비워지지 않아(append-only) **매 턴 영구히 경고가 뜨던** 문제를 수정. 실제로 이 레포는 누적 1780건이라 경고가 상시 발화 중이었다.

- **판정 기준을 누적 total → delta(마지막 정제 이후 새 raw)로 전환.** 기준선은 `memory/.mnemo-distill-offset` 마커(`<gotchas> <learned> <ref_epoch>`)에 기록
- **정제 자동 감지 + baseline 리셋:** `gotchas/learned`의 정제 `.md` 최신 mtime이 마커보다 새로우면 정제가 일어난 것으로 보고 baseline을 현재 누적값으로 리셋 → 정제하면 경고가 실제로 사라짐. 별도 producer 배선(SKILL/handoff 수정) 불필요
- **임계 미만이면 묵은 `.mnemo-status.md` 자동 정리**
- **임계값:** 누적 500 → delta 200, 핸드오프 14일은 유지. 메시지도 "새 관찰 N건(누적 M)"으로 변경
- **적용 범위:** Claude `save-response` + Codex/Gemini `save-turn` + 동면 `save-response` 복사본까지 ps1/sh 16개 파일 전부. PowerShell 파서 + `bash -n` 구문 검증, 실제 함수 추출 4시나리오(정상/임계초과/정제후리셋/임계미만) 동작 검증 통과
- `skills/project-gotchas/config.json`: `notify_threshold_total` → `notify_threshold_new_observations`(delta 의미)로 갱신

## [4.8.4] - 2026-06-15

### Added — 프롬프트 규율 가드레일 상시 적용 (3-CLI always-on)

스킬을 호출해야만 적용되던 프롬프트 디시플린을, 스킬 없이 묻는 일반 턴에도 상시 적용되도록 mnemo 주입 템플릿에 가드레일 섹션 추가. 설치 시 각 CLI의 always-on 파일(CLAUDE.md / AGENTS.md)에 주입된다.

- **상시 가드레일 3종(의례 없는 항목만 → 과적용 위험 최소화):** 사실은 출처/도구로 확인(`[확인 필요]` 표기), 검증은 외부 신호로(자기판단 금지), 페르소나는 톤 전용(정확도 보장 X)
- **무거운 의례(ToT/ReAct/반복개선)는 인라인하지 않고 스킬로 라우팅** — 2계층 상호보완: 가드레일은 일반 턴, 스킬은 트리거된 깊이
- 맨 위 가드: 단순 턴엔 추가 절차 없이 바로 답(과적용 금지)
- `claude-md-rules.md` + `codex/gemini agents-md-rules.md` 3종 동일 적용, 3-CLI 라이브 설정에 주입 확인

근거: "LLMs Cannot Self-Correct Reasoning Yet"(ICLR'24), "When 'A Helpful Assistant' Is Not Really Helpful"(EMNLP'24). v4.8.3 스킬 보완의 상시화 버전.

## [4.8.3] - 2026-06-15

### Added — 프롬프트 기법 감사 기반 스킬 보완 (3패턴 일괄)

검증된 프롬프트 기법(Tree of Thoughts, 자기검증 한계 ICLR'24, 페르소나 무용 EMNLP'24, 메타프롬프트) 기준으로 ~21개 스킬을 감사하고, 갭을 3패턴으로 묶어 일괄 보완. 모두 chronos 보강(v4.8.2)과 같은 원리 — "자가판단 금지, 외부 검증으로만 멈춤".

**패턴 A — 자기판단 게이트에 외부근거 강제:**
- **agent-team / agent-team-codex**: 검증 통합 게이트를 선택→필수 완료권한(빌드+전체테스트+E2E)으로 승격. Grep 기반 AC는 사전점검으로 강등
- **zeus**: SUCCESS 판정을 minos 통과율+빌드 green에 바인딩, argos/minos 자동승인 시 통과 수치 기록 의무
- **skill-judge**: 독립 adversarial 교차검증(Step 4.5) 추가 — 반대 입장 재채점 + 조정, Redundant 판정은 외부 신호 의무
- **clio**: Phase 3 문서 사실 검증 게이트 — 소스 미확인 수치/식별자는 `[확인 필요]`
- **ko-en-translator**: 의료/법률 고위험 용어 외부 용어집 조회 의무
- **writing-specialist**: 사실 검증 패스 + 페르소나는 톤 전용 명시
- **professional-communication / crafting-effective-readmes**: 발송 전 사실 확인 / 명령 실행 검증

**패턴 B — 단일경로 → 대안 생성+채점 (ToT):**
- **zephermine**: Step 12를 전략 후보 2-3개 생성·루브릭 채점·선택으로 확장 + plan.md `## 전략 선택` 앵커
- **workpm (native/MCP)**: 제안 3개를 fit/risk/effort 루브릭으로 채점(사용자 떠넘김 방지)
- **biz-strategy**: 경쟁 비즈니스모델 2-3개 수요/해자/단위경제 채점
- **architect**: 매트릭스 작성 전 후보 2-3개 생성 강제
- **design-plan**: 팔레트/폰트 가중 루브릭 채점

**패턴 C — autoresearch 엔진 재사용:**
- **command-creator / manage-skills**: 생성물을 `/autoresearch` hill-climbing 루프에 연결

전 항목 3-CLI 동기화(.claude/.codex/.gemini). 출처 아이디어: baskduf/FableCodex Capability Ceiling, "LLMs Cannot Self-Correct Reasoning Yet"(ICLR'24), "When 'A Helpful Assistant' Is Not Really Helpful"(EMNLP'24).

## [4.8.2] - 2026-06-15

### Added — 크로노스 PARK 전 능력 에스컬레이션 사다리

검증 실패를 사람에게 주차(PARK)하기 전, 모델 능력을 한 칸 올려 한 번 더 시도하는 단계 도입. 기존엔 3회 재시도 실패 시 즉시 PARK였으나, 사람에게 결정을 떠넘기기 전 모델 능력으로 풀 수 있는 길을 먼저 소진한다. baskduf/FableCodex의 Capability Ceiling 아이디어를 chronos 규율에 맞게 적응.

- **에스컬레이션 사다리** — 재시도(사이클 내 3회) → 능력 1회 상향(추론 effort↑ / 더 강한 모델 / 둘 다 불가하면 focused review pass) → 그래도 실패해야 PARK. 같은 방식 재시도만으로 한 주차는 무효, 에스컬레이션은 이슈당 1회, 결과는 Owner Decision Brief 증거란에 기록
- SKILL.md에 "에스컬레이션 사다리" 전용 섹션 신설 + VERIFY 단계·PARK 표·주차 규칙·Owner Decision Brief 증거란·goal 목표문 필수 요소(6번)·예시 박스 반영
- chronos-worker(루트/skills 2사본, Gemini 3순위 경로) Verify 단계 동일 반영
- README 영/한 v4.8.0 섹션에 에스컬레이션 항목 추가
- 3-CLI 전역 설치본(.claude/.codex/.gemini) 동기화 완료

## [4.8.1] - 2026-06-14

### Fixed — mnemo 훅 프로젝트 루트 결정: 비-git 프로젝트 하위 폴더 오저장 방지

비-git 프로젝트에서 Bash로 하위 폴더(`reference/1week` 등)에 `cd`하면(작업 디렉터리가 이후 호출까지 유지됨) mnemo 자동저장 훅이 프로젝트 루트가 아니라 그 하위 폴더에 `conversations/`·`memory/`·`MEMORY.md`를 만들던 문제 수정.

- **루트 결정을 2-pass 후보 평가로 교체** — 후보(세션 시작 cwd → 마지막 cwd → transcript 디코딩 → PWD) 중 Pass 1 = git 루트가 잡히는 첫 후보(git repo는 어느 하위 폴더에서도 정규화), Pass 2 = 비-git이면 세션 시작(launch) cwd를 앵커로 사용. 전역 `cd`가 마지막 cwd를 옮겨도 launch cwd가 프로젝트 루트를 가리킴
- **HOME-git 가드** — HOME 자체가 git 저장소인 환경 방어: HOME을 후보에서 제외 + git 루트가 HOME이면 dotfiles repo로 보고 건너뜀
- 8개 훅(save-response/save-conversation/save-tool-use/reconcile-conversations × ps1·sh)에 동일 적용, 설치본(.claude/.codex/.gemini)·.agents 동기화. PowerShell 7/7 · Bash 7/7 시나리오 테스트 통과

### Removed

- agents/·hooks/에 잘못 추적되던 빈 memory scaffold 8개 제거 (gitignore 대상이 과거 커밋에 포함됐던 것)

## [4.8.0] - 2026-06-13

### Added — 크로노스 루프 프로그래밍: 주차(PARK) + Owner Decision Brief + 재진입 규약

Peter Steinberger의 maintainer-orchestrator 루프 분석에서 증류한 "루프는 의지가 아니라 구조로 유지된다" 원칙의 적용. 막힌 이슈 하나가 루프 전체를 멈추지 못하게 하는 3종 규율.

- **주차(PARK)** — 유효 사유 4가지(검증 3회 실패 / 권한 경계 / 외부 접근 부재 / 제품 결정)로만 주차 가능. 사유 없는 "막힘" 선언은 회피로 간주, 주차 전 갈 수 있는 데까지(재현/원인 분석/권한 안의 수정) 진행 의무
- **Owner Decision Brief** — 주차 이슈는 결재 가능 상태로 보고: 무엇/왜 지금/증거/트레이드오프/추천(의무 — 기술 분석을 사용자에게 떠넘기지 않음)/정확한 선택지. 사용자의 일은 4지선다(추천대로 승인/반려/접근 권한 1개 부여/문서화된 대안 택일)
- **재진입 규약(READ)** — 매 사이클 FIND 전 감사 로그 재독, 기억과 로그가 어긋나면 로그가 이김. 새 세션이 chronos-log.md만으로 루프 재개 — 루프 상태는 컨텍스트 윈도우가 아니라 파일에 있음
- **goal 목표문 필수 요소 6번 추가** — 주차만 남으면 Brief 보고로 종료 허용(거짓 promise 출력 금지). 주차-only 큐에서 goal 게이트가 영원히 미달 판정하는 데드락 방지
- chronos-worker(Gemini 3순위 경로) 2사본에 동일 규율 반영
- README 영/한 v4.8.0 섹션 + 루프 구조 다이어그램(`docs/assets/chronos-loop-programming.svg`)

### Added — 제우스 Decision Ledger (사후 결재 장부)

- `[ZEUS-AUTO:taste]` 결정을 결정 + 근거 + 기각한 대안 + **되돌리는 법** 규격으로 승격, 되돌리기 쉬운(reversible) 기본값 우선 명시
- Phase 6 리포트 Taste Decisions 섹션을 Decision Ledger로 개편, Next Steps에 장부 검토 항목 추가
- zero-interaction 유지 — 질문을 사전에 하지 않는 대신 결재를 사후로 이동

### Fixed — 크로노스 훅을 주차 정책과 정렬 (거짓 promise 보상 제거)

- loop-stop.ps1/.sh, continue-loop.ps1/.sh의 "`<promise>` 태그만 있으면 완료" 분기 제거 — 내용이 불일치하는 promise는 종료 대신 재투입. 거짓 promise를 기계가 보상하면 SKILL.md의 검증 게이트가 무력화됨
- 멀티라인 promise 매칭 보강, 재투입 너지 메시지에 주차 규칙 주입(막힌 이슈는 사유와 함께 주차, 주차는 할 작업으로 세지 않음, 최종 보고에 Brief)
- 검증: loop-stop.ps1 기능 테스트 4/4(불일치 거부 / 정확 일치 종료 / 주차-only Chronos Complete 종료 / 마커 없음 재투입), .sh 동일 로직 + 문법 검증

### Fixed — codex-mnemo notify 판정 순서 (save-turn 체인 래퍼 보존)

- IDE 알림 제거 검사가 save-turn 체인 검사보다 먼저 실행되어, "save-turn 체인 + 자체 알림"을 겸하는 외부 래퍼까지 제거하던 문제 수정 — Codex notify는 단일 슬롯이라 외부 도구 통합이 재설치로 조용히 끊겼음 (실측 후 교정)
- 체인 검사 우선으로 겸용 래퍼는 보존(Refreshing 분기), save-turn을 체인하지 않는 순수 알림 체인만 제거. 설치기 재실행으로 보존 검증

## [4.7.1] - 2026-06-11

### Added — ui-ux-auditor 시각 검증 (스크린샷 관찰 채점)

아프로디테 파이프라인의 구조적 약점 해소: 12신 중 유일하게 결과물을 안 보고(Grep 코드 검사 + 모델 자가채점) 판정하던 디자인 영역에 관찰 기반 게이트를 추가. 사용자 피드백 "자동화 테스트만으로는 부족, 실제 브라우저 확인 필수"의 디자인 영역 적용.

- **Step 2.5 시각 검증 신설** — dev server 준비(minos Step 3 감지 순서 재사용) → 주요 페이지 스크린샷 캡처(데스크톱 1440×900 / 모바일 390×844 × 라이트/다크) → 스크린샷을 이미지로 직접 읽어 관찰 채점
- **캡처 경로 이중화** — 1순위 로컬 `npx playwright screenshot`(MCP 불필요, 3-CLI 공통), 2순위 Playwright/chrome-devtools MCP
- **충돌 규칙** — Grep 결과와 관찰이 다르면 **관찰이 이김** (코드에 `dark:`가 있어도 화면에서 안 보이면 실패)
- **폴백 투명성** — 서버 구동 불가 시 정적 스캔으로 폴백하되 스코어카드에 "관찰 미반영" + 등급 `*` 표기
- design-plan(아프로디테) Phase 4가 시각 검증을 필수로 명시, 기존 "8영역" 표기 오류도 9영역으로 정정
- **스모크 테스트 실증** — 결함 4종(다크모드 대비 붕괴, 보라 그라데이션, 3열 대칭 그리드, 고정폭 가로 오버플로)을 심은 테스트 페이지로 캡처→관찰 절차를 end-to-end 실행, 4/4 관찰 검출 확인 (`npx playwright screenshot` 동작 검증 포함)

### Changed — design-plan(아프로디테) 구현 범위 "외관 한정" 명시

- Phase 3에 담당/범위 밖 구분표: 토큰·레이아웃·마크업·스타일·비주얼 인터랙션은 담당, 상태·API 연동·비즈니스 로직·라우팅은 포세이돈/다이달로스 몫
- 파이프라인 모드(포세이돈 구현 후)는 로직 변경 금지, 단독 모드는 mock + `TODO(기능)` 주석으로 인계

### Fixed — clio v2.1.1: GO/NO-GO 판정식 구멍 2개 보완

- minos 결과를 판정식에 반영 (PASS=GO 조건 / CONDITIONAL=CONDITIONAL GO / FAIL=NO-GO) — 기존엔 수집만 하고 판정에 미반영
- 공허한 GO 차단 — 테스트 0개는 "전체 통과"로 인정하지 않음 (테스트 부재 시 최대 CONDITIONAL GO)
- `--force`/`--docs-only` 게이트 우회 시 산출물 상단에 미통과/미수행 표기 의무화

## [4.7.0] - 2026-06-11

### Changed — 네이티브 결합 감사 후속 정리 (5건)

2026-06-10 전체 결합 감사(병렬 Explore 에이전트 5개)에서 나온 수정 대상을 일괄 반영.

- **zeus** — Auto-Continue Contract에 네이티브 `/goal` 관계 명시: zero-interaction 원칙상 훅 자동 재개를 기본 엔진으로 유지(goal은 사용자 입력 필요), 단 사용자가 `/goal`을 미리 설정한 경우 setup-loop 부트스트랩 생략(이중 Stop 게이트 방지 — 크로노스 `--goal-mode`와 동일 원칙)
- **agent-team** — `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` env var 요구를 구버전 호환 항목으로 강등 (현행 Claude Code는 Teams 도구 기본 제공)
- **메모리 경계 명시 (4파일)** — mnemo/memory-distill/memory-compact description + CLAUDE.md 메모리 규칙에 "프로젝트 루트 3계층 메모리는 Claude 네이티브 auto-memory(~/.claude/projects/)와 별개" 경계 추가, 중복 기록 방지 규칙 포함
- **orchestrator** — 네이티브(Agent Teams/spawn_agent) vs MCP 모드 선택 기준표 추가 (규모/CLI/파일잠금 기준)
- **auto-continue-loop** — flow-verifier가 주장하던 `--flow-verify` 옵션의 수신측 정의를 크로노스 옵션 테이블에 추가 (반쪽 연동 해소)
- **zephermine** — 네이티브 plan mode와의 구분 명시: plan mode는 단일 작업 계획 게이트, 젭마인은 다운스트림이 소비하는 아티팩트 생산 파이프라인. plan mode는 쓰기 금지라 그 안에서 젭마인 실행 금지 경고 추가
- **clio v2.1.0 — humanizer 한국어 윤문 연동** — v4.6.0에서 강화한 humanizer 한국어 모듈이 정작 한국어 문서를 대량 생산하는 클리오에 연결돼 있지 않던 공백 해소. Phase 3에 2단계 적용: 생성 시 번역투/AI 문체 금지 제약 주입 + 생성 후 S1 패턴 윤문 패스(과잉편집 가드 준수, USER-MANUAL > PRD > TECHNICAL 우선순위)
- **minos / argos** — 네이티브 `/run`·`/verify`와의 역할 구분 한 줄 명시 (자체 절차가 의도된 설계임을 표기). argos 연관 스킬 표의 code-reviewer 항목도 v4 기준으로 정정 — diff 기반 자재검사(시공 중) vs spec 기반 준공검사(아르고스)는 입력·시점이 달라 diff 엔진으로 대체 불가

### Fixed — chronos 구 별칭 /loop 폐기 (네이티브 /loop 충돌)

Claude Code에 네이티브 `/loop`(주기 반복 실행기: 인터벌 또는 자가 페이싱으로 프롬프트/커맨드 재투입)가 들어오면서 크로노스의 별칭 `/loop`와 이름이 충돌. Claude에서 `/loop` 입력 시 네이티브가 우선 매칭되어 별칭이 사실상 무력화됐고, Codex/Gemini에서만 크로노스로 연결되는 크로스-CLI 불일치가 생김. 호출명 통일 정책에 따라 별칭을 전 CLI에서 폐기.

- `skills/auto-continue-loop/SKILL.md` — description/triggers/공식 호출명에서 `/loop`·`loop` 제거, 폐기 사유 명기. "/goal(Stop 게이트) vs /loop(반복 실행기) vs /chronos(루프 규율)" 3종 비교표 추가
- `skills/codex-mnemo/templates/agents-md-rules.md`, `skills/gemini-mnemo/templates/agents-md-rules.md` — 우선 고정 alias에서 `/loop` 제거
- `QUICK-REFERENCE.md` — 경로 테이블 갱신

### Changed — code-reviewer v4: 네이티브 엔진 위임 + 정책 레이어 분리

Claude(`/code-review`)와 Codex(`/review`, `codex review --base`) 양쪽에 네이티브 리뷰 엔진이 생기면서, code-reviewer 스킬이 직접 수행하던 일반 리뷰가 중복이 됨. v3.0.0 → v4.0.0으로 재구성하여 리뷰 엔진과 정책 레이어를 분리.

- **엔진 위임 (Step 2 신설)** — CLI 감지 후 경로 분기: 경로 A(Claude → 네이티브 code-review 스킬, effort high), 경로 B(Codex → `codex review --base` / `--uncommitted` / 비대화형 `codex exec review`), 경로 C(Gemini 등 네이티브 없음 → 기존 풀 경로 폴백). 네이티브 호출 실패 시에도 경로 C 폴백
- **정책 레이어 P1~P5 (공통)** — 네이티브가 못 하는 것만 담당: P1 Scope Drift 감지, P2 도메인 보강 패스(LLM 출력 신뢰 경계, Enum 완전성, 비동기/동기 혼합, 컬럼명 안전 — 경로 A/B만), P3 Suppressions, P4 Fix-First(AUTO-FIX/ASK 분류), P5 통합 보고서(Engine/source 표기 추가)
- **경계 명시** — `/code-review ultra`는 사용자 트리거 전용(과금)이라 스킬이 호출하지 않으며 권유 안내도 하지 않음. 포세이돈 Step 5 자재검사 teammate는 Skill 도구 접근이 보장되지 않으므로 경로 C 체크리스트 임베드 방식 유지
- **풀 경로 보존** — v3의 2-Pass Critical 체크리스트, Specialist 병렬 dispatch, Adversarial Review는 경로 C 상세로 전부 유지 (Gemini parity + 폴백 + teammate 임베드 소스)

### Docs — Codex 네이티브 /review 문서화

`docs/resources/codex-cli.md`에 그동안 누락돼 있던 Codex 내장 리뷰 기능(TUI `/review`, `codex review --base/--uncommitted`, `codex exec review`, GitHub `@codex review`) 섹션 추가.

## [4.6.0] - 2026-06-10

### Added — Humanizer 한국어 윤문 모듈 + 절차적 가드

humanizer 스킬에 한국어 번역투 전용 모듈을 신설하고 윤문 절차 노하우를 흡수해 v2.1.1 → v2.5.0으로 강화. 기존 humanizer는 영어 패턴(Wikipedia "Signs of AI writing")만 다뤄 한국어 글의 진짜 AI 신호(번역투·명사화·쉼표 습관)를 놓쳤음. 한국 번역학 계보 기반 분류 체계를 도입해 해결.

#### Added — 한국어 번역투 모듈 (10분류 67패턴)

A 번역투 문법 ~ J 시각장식까지 10개 대분류. 핵심 지표로 연결어미 뒤 쉼표(인간 글의 4.84배, 단일 최강 신호), ~성/~적/~화 명사화, 진행형 과다, 대명사 직역 등 한국어 고유 AI 신호 포함. 정량 1차 스캔(수치 기반 진단) + 장르별 가드레일(에세이/논문/블로그/대본/격식체) 추가.

#### Added — 심각도 등급 + 과잉편집 가드 (영/한 공통)

24개 영어 패턴 + 67개 한국어 패턴에 S1(항상 제거)/S2(군집만)/S3(중첩만) 등급 부여. 변경률 30% 경고 / 50% 중단 가드로 의미 훼손 방지.

#### Added — 윤문 절차 노하우

Do-NOT 사전 마스킹(고유명사·숫자·인용 보호), 위험도순 수정(D→A→I→G→H→F→B→C·J→E), 변경률 실시간 추적 + 안전버전 롤백, 단일 롤백 게이트, 의미 drift 정밀 체크(인과 역전·한정사·의무 강도·극성), 윤문 전후 패턴 카운트 비교.

분류·절차는 im-not-ai(MIT) v2.0 taxonomy 참고. 3개 CLI(Claude/Codex/Gemini)에 배포 완료.

### Docs — api-tester 유지 근거 정정

에이전트/스킬 정리 감사에서 api-tester를 passive로 잘못 분류했던 것을 정정. spawn 0 + 스킬 상위호환이 실제 유지 근거.

## [4.4.2] - 2026-05-30

### Fixed — Chronos Hardening + Cross-CLI Parity

3-CLI에 걸친 Chronos 자동 재투입 메커니즘의 결함 3가지를 발견하고 수정. 한 사이클 돌고 멈추거나, 메시지 길이 때문에 종료 신호가 미탐되거나, Gemini에선 아예 작동하지 않던 문제들이 동시에 있었음. 5회 반복 카운터 스트레스 테스트로 재투입 메커니즘 end-to-end 검증.

#### Fixed — done-pattern 조기 종료 오탐

Stop 훅의 종료 감지 정규식에 `모든.*작업.*완료`, `더 이상.*고칠.*없`, `남은.*이슈.*없` 등 느슨한 서술형 패턴 6개가 있어, AI가 사이클 중간에 진행 보고를 할 때(예: "1번 버그 수정. 모든 작업이 완료되었으니 다음 사이클로 넘어가겠습니다") 이를 완료 선언으로 오인해 루프를 조기 종료시키던 문제. SKILL.md가 명시한 종료 계약("`Chronos Complete` 마커 또는 `<promise>` 태그만 종료")과 코드가 모순되고 있었음. 명시적 마커만 남기도록 정리.

대상 파일 (8개, 소스 + Claude/Codex/Gemini 활성 복사본):
- `hooks/loop-stop.{ps1,sh}`
- `skills/auto-continue-loop/scripts/continue-loop.{ps1,sh}`
- `.agents/hooks/`, `~/.claude/hooks/`, `~/.codex/hooks/`, `~/.gemini/hooks/`

재현 테스트: 6개 진행-보고 문장 중 5개가 OLD에선 조기 종료 트리거, NEW에선 모두 "계속"으로 판정. `Chronos Complete` 1건만 "종료" → PASS.

#### Fixed — tail-500 가드로 인한 종료 신호 미탐

종료 감지가 마지막 500자만 검사하던 가드(`$tailOutput = $lastOutput.Substring(...)`) 때문에 `<promise>` 태그가 메시지 상단에 있고 뒤에 긴 설명/표/태그가 붙으면 종료 신호가 끝 500자 밖으로 밀려나 미탐 발생. 이 가드의 본래 목적은 위에서 제거한 느슨한 패턴의 오탐 방지였으나, 명시적 마커만 보는 새 로직에선 가드의 존재 이유가 사라지고 미탐 위험만 남음. 전체 출력 검사로 변경.

재현 테스트: 507자 메시지(promise 상단 + 긴 설명)에서 OLD=False(놓침), NEW=True(종료) → PASS.

#### Fixed — Gemini state-path 하드코딩 (Gemini Chronos 완전 무력화)

`loop-stop.ps1/.sh`가 `$stateFile = ".claude/loop-state.md"` 하나만 보고 있었음. setup-loop는 Gemini 세션이면 `.chronos/loop-state.md`에 상태를 만들지만, loop-stop은 `.claude/`를 찾아 없으니 그냥 통과 → Gemini에서 Chronos가 절대 작동하지 않던 버그.

3-경로 탐색으로 변경: `.claude/`, `.codex/`, `.chronos/` 순서로 먼저 발견된 것 사용.

```powershell
$stateCandidates = @(".claude/loop-state.md", ".codex/loop-state.md", ".chronos/loop-state.md")
$stateFile = $stateCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
```

행동 시뮬레이션: `.chronos/loop-state.md`만 만들어둔 상태에서 훅 실행 → 정상 탐지 및 처리(이전 버그라면 조용히 통과 + 파일 잔존).

#### Changed — 알림 fanout 제거 (Mnemo 인스톨러/save-turn)

Mnemo 인스톨러와 save-turn 훅에서 데스크톱/IDE 알림 체인을 제거. save-turn, Chronos 체인, hook-bridge 흐름은 유지. 더 portable한 워크플로우로 정리.

#### Verified — Codex 호환성 감사

체인 구조 end-to-end 검증: `notify (config.toml)` → `ide-response-notify-wrapper.ps1` → `save-turn.ps1` → `continue-loop.ps1` → `codex exec resume --last`. continue-loop.ps1의 상태 파일 탐색은 이미 3-경로 지원.

#### Verified — Claude 재투입 스트레스 테스트

5회 반복 카운터 루프로 메커니즘 end-to-end 입증. iteration 1~4 진행 보고만 출력(promise 없음) → Stop 훅 `decision: block` + reason 재투입 → 다음 iteration. iteration 5에서 `<promise>5회 도달</promise>` → 매칭 → state file 삭제 → 종료. 재투입 4회 발동 직접 확인.

#### Cleaned — Memory 정제

gotchas/learned 항목 정제(memory-distill 정기 운용 결과). Mnemo/Chronos 런타임 잡파일(`docs/chronos/`, `memory/.mnemo-status.md`)은 이미 `.gitignore`로 처리되어 추가 작업 불필요.

---

## [4.4.1] - 2026-05-11

### Fixed — mnemo 점검 패치 (의도와 문구 일치 + 인지 안내 + 누락 보강)

v4.4.0 직후 mnemo 시스템 종합 점검 결과 발견된 갭들을 정리. **자동 분석기는 의도적으로 두지 않았다**는 설계 의도(LLM 호출 비용 절감)를 SKILL.md/config.json 문구와 일치시키고, 핸드오프 누락 시 사용자 인지를 도울 비용 0짜리 안내 메커니즘 추가.

문제 진단: raw observations 1038건 누적, 마지막 핸드오프 2026-04-06으로 34일간 정제 멈춤. v4.4.0에서 적은 "임계값 50 자동분석"은 실제 호출 코드가 없는 문서 표현이었음. 사용자는 짧은 세션 후 핸드오프가 발동되지 않으면 정제 누락을 인지할 수단이 없었음.

#### Added — Stop/save-turn 훅에 mnemo-status notify (LLM 호출 X)

매 응답 종료 시 raw jsonl 누적량과 마지막 핸드오프 일수를 계산해, 임계값 도달 시 `memory/.mnemo-status.md` 파일 작성 + stderr 한 줄 안내.

| 항목 | 값 |
|------|-----|
| raw 누적 임계값 | 500건 |
| 마지막 핸드오프 임계값 | 14일 |
| LLM 호출 | 없음 (단순 텍스트 출력) |

대상 파일 (6개, Claude/Codex/Gemini × .sh + .ps1):
- `hooks/save-response.{sh,ps1}` (Claude Stop)
- `skills/codex-mnemo/hooks/save-turn.{sh,ps1}` (Codex notify)
- `skills/gemini-mnemo/hooks/save-turn.{sh,ps1}` (Gemini AfterAgent)

#### Fixed — SKILL.md/config.json 문구를 의도된 설계와 일치

v4.4.0에서 잘못 적은 "임계값 자동 분석" 표현을 정정. 자동 분석기는 의도적으로 두지 않으며, 정제는 사용자 의지(`/memory-distill`) 또는 세션 경계(핸드오프)에서만 발동.

| 파일 | Before | After |
|------|--------|-------|
| `skills/project-gotchas/config.json` | `min_observations_to_analyze: 50` | `notify_threshold_total: 500` + `notify_threshold_handoff_days: 14` |
| `skills/project-gotchas/SKILL.md` | "안전망 자동분석" | "안내 출력 (LLM 호출 X)" |
| `skills/memory-distill/SKILL.md` | 자동 트리거 표 | 사용자 의지/세션 경계 트리거 표 |

#### Fixed — `list_handoffs.py` 파일명 파싱 버그

`YYYY-MM-DD-{slug}.md` 형식(HHMMSS 없음)이 "Date Unknown"으로 표시되던 버그 수정. HHMMSS 옵셔널 지원.

검증: `2026-04-06-v2.1-release.md` → "Date: 2026-04-06 00:00" 정상 표시.

#### Added — `check_staleness.py --all` 일괄 모드

기존: 인자로 핸드오프 파일 1개씩만 점검 가능 → 다수 핸드오프 점검 불편.
추가: 인자 없이 또는 `--all` 시 `docs/handoffs/` 전체 일괄 점검 + 요약 출력.

```
$ python check_staleness.py --all
Checking staleness for 3 handoff(s):
  Status     Level              Age  File
  [OK]       FRESH              <1d  2026-04-06-v2.1-release.md
  [OK]       SLIGHTLY_STALE     <1d  2026-03-13-140000-pipeline-architecture.md
  [WARN]     VERY_STALE         58d  2026-03-13-012826-codex-compatibility-wrap-up.md
```

#### Fixed — Codex sync EXCLUDE 누락 보강

`scripts/sync-codex-assets.js`의 `CODEX_EXCLUDE_SKILLS`에 `gemini-mnemo` 누락. Gemini 전용 스킬이 Codex 설치본에 잘못 들어가던 정합성 문제 해결.

| 설치본 | Before | After |
|--------|--------|-------|
| `~/.codex/skills/` | `codex-mnemo`, `gemini-mnemo` | `codex-mnemo`만 |

#### 적용

```bash
install.bat   # Windows
./install.sh  # macOS/Linux
```

새 세션부터 자동 안내가 활성화됩니다. 1038건 raw를 즉시 정제하려면 새 세션에서 `/memory-distill --rebuild` 실행.

## [4.4.0] - 2026-05-08

### Added — /memory-distill 스킬 + Dreaming-동등 자기개선 시스템

Anthropic Dreaming(2026-05) 발표를 계기로 메모리 정제 시스템을 보강. 사용자 의지 트리거(`/memory-distill`)와 분석 모델 격상으로 Dreaming의 핵심 기능(rebuild + 메인 모델 분석)을 멀티 CLI(Claude/Codex/Gemini) 환경에서 무료/저비용으로 구현.

문제 진단: raw observations 988건(326+662) 누적 동안 정제 .md 8% 미만(`memory/learned/`는 0개), 마지막 핸드오프 2026-04-06으로 한 달 이상 정제 흐름 중단. append-only 구조라 중복/모순 누적되며 부풀음.

#### Added — `/memory-distill` 스킬

신규 사용자 트리거 스킬(`skills/memory-distill/SKILL.md`). raw `observations.jsonl`을 정제 .md로 변환.

| 모드 | 동작 |
|------|------|
| `--scan` (기본) | 후보 미리보기, 파일 미생성 |
| `--apply` | 신규 정제 .md 생성 (incremental) |
| `--rebuild` | 기존 정제 .md + 신규 관찰 통째 재구성 (Dreaming-like) |

`--rebuild` 모드 처리:
- 중복 병합 (tags 70%+ 매칭 → 1개로 통합, observations 합산, last_seen 갱신)
- 모순 처리 (SUPERSEDED 패턴, 이력 보존)
- 기존 .md `.archive/`로 백업 후 NNN 재부여
- `index.md` + 카테고리 `.md` 동기화

`--type`, `--since`, `--min-cluster` 필터 지원.

#### Changed — gotcha-analyzer 모델 정책 격상

`cleanup-low` 티어(Haiku/mini/flash-lite) → 호출자 메인 세션 모델 상속. Dreaming(`model: claude-opus-4-7`)과 동등 분석 품질을 무료에 가깝게 얻기 위함.

| 항목 | Before | After |
|------|--------|-------|
| frontmatter | `model: haiku` + `model_tier`/`model_map` | model 미지정 (호출자 상속) |
| Claude 분석 모델 | haiku | claude-opus-4-7 |
| Codex 분석 모델 | gpt-5.4-mini + reasoning low | gpt-5.5 |
| Gemini 분석 모델 | gemini-3.1-flash-lite-preview | gemini-3.1-pro-preview |

비용 vs 품질 트레이드오프: 임계값 격하(아래)로 호출 빈도 감소 → 메인 모델 분석으로 정제 품질 ↑ → 노이즈 후보 .md 감소 → 사용자 검토 비용 ↓.

#### Added — gotcha-analyzer rebuild 모드

기존 incremental 모드(append-only)에 더해 `rebuild` 모드 추가. `/memory-distill --rebuild` 또는 핸드오프 정제 시 호출되어 동일 로직을 공유합니다.

#### Changed — 자동 분석 임계값 20 → 50 (안전망 격하)

같은 세션 내 학습은 컨텍스트가 처리하므로 정제는 세션 경계에서만 의미가 있다는 통찰을 반영. 주 정제는 핸드오프와 `/memory-distill`로 이관, 임계값 자동 분석은 핸드오프 누락 대비 안전망으로 격하.

| 트리거 | 빈도 | 깊이 | 역할 |
|--------|------|------|------|
| Stop 훅 (jsonl append) | 매 응답 | 0 | 관찰 수집 |
| 임계값(50) gotcha-analyzer | 가끔 | 가벼운 후보 추출 | 안전망 |
| `/memory-distill` | 사용자 의지 | 풀 정제 + rebuild | 주 정제 |
| 핸드오프 자동 추출 | 컨텍스트 위기 | 풀 정제 + 통합 | 세션 경계 정제 |

#### Documentation

- `README.md`, `README-ko.md`: 95 → 96 skills, 메모리 섹션 + Haiku analyzer 표기를 "메인 모델 상속"으로 갱신
- `AGENTS.md`, `QUICK-REFERENCE.md`: memory-distill 등록
- `docs/smart-setup-registry.json` `internal-skills`에 추가

#### 적용

```bash
install.bat   # Windows
./install.sh  # macOS/Linux
```

#### 사용 (새 세션 시작 후)

```bash
/memory-distill --scan          # 후보 미리보기 (raw 988건 → 클러스터)
/memory-distill --rebuild       # 통째 재구성 (기존 22개 정제 + 신규 통합)
```

## [4.3.4] - 2026-05-07

### Removed — nano-banana 스킬 + 레거시 모델 표 행

원칙: "스킬 안의 모델 참조는 최신이거나 없애야 한다." 더 이상 쓰지 않는 nano-banana 스킬을 제거하고, Codex/Gemini 모델 표에서 레거시 행을 정리했습니다.

#### Removed — nano-banana 스킬

- `skills/nano-banana/` 폴더 전체 삭제
- `docs/smart-setup-registry.json`에서 `nano-banana` 항목 제거
- `skills/video-maker/SKILL.md`의 "연관 리소스" 표에서 `nano-banana` 행 제거

#### Removed — 모델 표 레거시 행

| 파일 | 제거된 행 |
|------|----------|
| `skills/codex/SKILL.md` | `gpt-5.2 (Legacy general-purpose)` |
| `skills/gemini/SKILL.md` | Available models 리스트의 `gemini-2.5-pro`, `gemini-2.5-flash`, `gemini-2.5-flash-lite` (3개) + Quick reference의 `Cost-optimized background` 행 + Model Selection Guide 표의 legacy 3행 + Tips 섹션의 cost-optimized 권고 |
| `docs/resources/codex-cli.md` | `gpt-5.2 (레거시 범용)` |
| `docs/resources/gemini-cli.md` | `gemini-2.5-pro`, `gemini-2.5-flash`, `gemini-2.5-flash-lite` (3개) |

#### Changed — zephermine 비추천 default 안내문 정리

`team-review-protocol.md:151`의 비추천 default 예시에서 `gemini-2.5-flash-lite` 제거 (이제 cleanup-low가 `gemini-3.1-flash-lite-preview`로 통일됨).

#### 보존된 이력 항목 (의도적)

- `CHANGELOG.md` 본문의 옛 모델 ID 인용 — 변경 이력 자체
- `docs/skill-agent-dedup-audit-2026-04-26.md` — 시점 박힌 감사 보고서
- `skills/mnemo/evals/results-opus-baseline.md` — 2025-11-27 평가 baseline
- 각 agents/*.md의 `model: sonnet/opus/haiku` — Claude alias라 항상 최신 매핑

#### 적용

```bash
install.bat   # Windows
./install.sh  # macOS/Linux
```

## [4.3.3] - 2026-05-07

### Changed — chronos-worker default 모델 + project-gotchas mini 일관성

v4.3.2 점검 후 발견된 잔여 옛 모델 ID 6곳 정리.

#### Changed — chronos-worker `model:` 키 제거

`agents/chronos-worker.md`, `skills/auto-continue-loop/agents/chronos-worker.md` 두 파일 frontmatter에서 `model: gemini-2.5-pro` 라인을 제거. 이제 사용자 `~/.gemini/settings.json` default를 존중. zephermine과 동일한 철학(사용자 default 존중 + 모델 ID 유지보수 부담 소멸).

#### Changed — project-gotchas Gemini cleanup-low 갱신

cleanup-low 티어 매핑에서 Codex만 갱신했던 v4.3.2의 비대칭 해소:

- `gemini-2.5-flash-lite` → `gemini-3.1-flash-lite-preview` (4곳)
- 대상: `skills/project-gotchas/{SKILL.md, config.json, agents/gotcha-analyzer.md}`

#### 적용

```bash
install.bat   # Windows
./install.sh  # macOS/Linux
```

## [4.3.2] - 2026-05-07

### Changed — zephermine 도메인 전문가 입력 보강

도메인 전문가 호출 시 일부 입력 파일이 누락되던 문제를 해결하고, 사용자 CLI default 모델을 존중하도록 변경했습니다.

#### Fixed — 누락 입력 파일 보강 (`team-review-protocol.md`)

도메인 프로세스/기술 전문가가 받던 입력에서 빠지던 두 파일을 모든 모드(Claude-only / Codex / Gemini)에 통일 전달:

- **`research.md`** (Step 5 초기 리서치) — Claude-only는 받았지만 External AI(Codex/Gemini)는 누락. 이제 sandwich/`@file`로 조건부 첨부
- **`domain-dictionary.md`** (도메인 사전 v1) — 모든 모드에서 명시적으로 누락. "Step 10 메인 컨텍스트 위임"에 의존하던 비명시적 규칙을 코드 레벨로 박아넣음

조건부 처리: Step 5/Step 8을 건너뛴 mini 플로우에서도 에러 없이 동작 (`[ -f file ] && cat ... || echo "(파일 없음)"`).

**효과**: 모드 간 분석 품질 격차 해소 + 사전 일관성 확보 → Step 11(`domain-confirmation-guide.md`) CONFLICT 판정 감소.

#### Changed — External AI 호출 시 `-m` 플래그 제거

`team-review-protocol.md`, `external-review.md`의 외부 AI 자동 호출에서 `-m` 모델 지정을 제거. 이제 사용자의 CLI default를 존중:

- Codex → `~/.codex/config.toml`의 `model` 키 (없으면 CLI default `gpt-5.5`)
- Gemini → `~/.gemini/settings.json`의 default

**효과**: 모델 ID가 바뀔 때마다 우리가 따라잡을 필요 없음. 사용자가 비용/품질 선택 가능.

**경고문 추가**: 실행 모드 결정 표 직후 reasoning 모델 default 안내 (mini/lite로 default 잡혀있으면 분석 품질 저하 가능).

#### Fixed — 모델 ID 일괄 갱신 (공식 문서 기준)

OpenAI Codex Models 및 Gemini API Models 공식 문서 확인 후 박혀있던 옛 ID를 정정:

| 영역 | 기존 | 변경 |
|------|------|------|
| 플래그십 (Codex) | `gpt-5.2` | `gpt-5.5` |
| 플래그십 (Gemini) | `gemini-3-pro-preview` | `gemini-3.1-pro-preview` |
| Mini (sub-agent용) | `gpt-5.2-mini` | `gpt-5.4-mini` |
| Codex 모델 표 | 5.2-max/5.2/5.2-mini/5.1-thinking | 5.5/5.4/5.4-mini/5.3-codex/5.3-codex-spark |
| Gemini 모델 표 | 3-pro-preview/3-flash | 3.1-pro-preview/3-flash-preview/3.1-flash-lite-preview |

대상 파일: `skills/codex/SKILL.md`, `skills/gemini/SKILL.md`, `skills/project-gotchas/{SKILL.md,config.json,agents/gotcha-analyzer.md}`, `docs/resources/{codex-cli.md,gemini-cli.md,claude-flow.md}`.

> 모델 표에는 "정확한 컨텍스트/가격은 공식 모델 카드 확인" 안내 박힘 — preview 단계 변동 대비.

#### 적용

```bash
# 글로벌 동기화 (~/.claude, ~/.codex, ~/.gemini)
install.bat   # Windows
./install.sh  # macOS/Linux
```

## [4.3.1] - 2026-05-06

### Fixed — Zeus 자동 연속 실행

- `zeus` 스킬에 CLI별 자동 재개 계약을 추가해 제품 파이프라인 요청 시 `zephermine → 구현 → argos → docker-deploy → minos → report`가 중간 보고에서 멈추지 않도록 보강
- Claude/Codex/Gemini 상태 파일을 각각 `.claude/`, `.codex/`, `.chronos/loop-state.md`로 분리하고, Codex notify 재개 시 git root 기준으로 상태 파일을 찾도록 수정
- Codex notify 체인에서 PowerShell pipeline stdin 누락 가능성을 피하기 위해 Chronos payload를 임시 파일로 전달
- Codex sync가 이미 동일한 hook/agent 파일을 덮어쓰다 Windows 파일 잠금(`EBUSY`)에 걸리는 문제를 방지

## [4.3.0] - 2026-05-05

### 🧠 므네모 메모리 정합성 점검

mnemo 시스템 5개 영역(대화 / 메모리 / 핸드오프 / gotchas / learning)과 3 CLI parity를 종합 점검하고, 발견된 이슈를 일괄 정리한 릴리즈입니다.

#### Changed — 핸드오프 경로 (마이그레이션)

- 핸드오프 저장 위치를 `.claude/handoffs/` → **`docs/handoffs/`**로 이전
  - **이유**: `.claude/`는 `.gitignore` 대상이라 핸드오프가 공유 안 됨 + Codex/Gemini 사용자에게 `.claude` 위화감
  - 4 핸드오프 스크립트(`create_handoff.py`, `list_handoffs.py`, `validate_handoff.py`, `check_staleness.py`) + 1 테스트 환경 스크립트 동시 갱신
  - 기존 핸드오프 3 파일 자동 이전, 외부 가이드(`docs/resources/softaworks-agent-toolkit.md`) 경로 동기화

#### Added — 핸드오프 시 자동 추출 + 저장

- 핸드오프 절차에 **gotcha/learned 자동 추출 + 저장 단계** 박힘 (3 mnemo 템플릿 동일 — Claude/Codex/Gemini)
  - 이번 세션 jsonl 신규 라인을 LLM이 분석 → 정제 .md 자동 저장 (사용자 검토 없음)
  - secret 자동 마스킹 (`validate_handoff.py`의 SECRET_PATTERNS 재사용)
  - 글로벌(CLI/OS 공통) vs 프로젝트(특정 API) 자동 분류, 애매하면 보수적으로 프로젝트로
  - 백로그(누적된 raw observation)는 손대지 않음 — 다음 세션 분량부터 적용

#### Added — memory 항목 형식 가이드 (오용 방지)

H1 사례(2026-04-21)에서 LLM이 사용자 prompt를 `source:` 필드에 통째로 박은 패턴 발견. 재발 방지를 위해 3 mnemo 템플릿에 명시적 금지 추가:

- `source:` 필드는 정확히 `claude` / `codex` / `gemini` **한 단어**만 (사용자 prompt/분석 텍스트/코드 블록 금지)
- 항목명에 "항목" / "메모" / "기록" 같은 일반 단어 금지 — 검색 가능한 키워드 조합 사용
- `tags:` 필드는 **최소 3개 키워드** (영/한 혼용 OK) — 검색 매칭 정확도 보장
- 항목 본문은 **3줄 이내** 권장 — 길어지면 별도 파일/대화 링크로 참조

#### Fixed — memory 위생

- `memory/*.md` 4 파일에서 누락된 `source:` 필드 일괄 백필 (48 항목)
- `memory/claude-global-config.md`의 잘못된 글로벌 `~/.claude/handoffs/` 트리 정정 (실재하지 않는 경로)
- MEMORY.md 정리: 거대한 source 폐기물 제거 + 카테고리별 line count 표기 (118줄/6.1KB → 54줄/2.5KB)

#### 적용

```bash
# 글로벌 mnemo 규칙 갱신
install.bat   # Windows
./install.sh  # macOS/Linux
```

설치 후 `~/.claude/CLAUDE.md`, `~/.codex/AGENTS.md`, `~/.gemini/AGENTS.md`의 마커 영역(`<!-- MNEMO:START -->` ~ `<!-- MNEMO:END -->`)이 새 가이드로 자동 갱신됩니다.

## [4.2.0] - 2026-05-04

### 🆕 Markdown → 출판품질 PDF (한국 기본값)

`pdf` 스킬에 Markdown → 출판품질 PDF 변환 모드를 추가했습니다. A4 + 25mm 마진 + Pretendard 본문 폰트의 한국 출판 기본값을 따르며, Clio 스킬의 Phase 3-4에서 자동으로 호출되어 PRD/TECHNICAL/USER-MANUAL.md 산출물을 PDF로 함께 출력합니다.

#### Added — pdf 스킬

- `skills/pdf/scripts/markdown_to_pdf.py` — playwright + Chromium 기반 변환기
  - 서브커맨드: `generate` / `preview` / `setup`
  - **한국 기본값**: A4(210×297mm), 25mm 마진, Pretendard, "YYYY년 M월 D일"
  - **자동 다운로드**: Pretendard Regular/Bold + JetBrains Mono (SIL OFL 1.1)
  - **80% 케이스 무플래그**: `python markdown_to_pdf.py generate spec.md`
  - **표지/TOC**: `--cover --toc --title --author --org`
  - **워터마크**: `--watermark "초안"` 등 한글/영문 모두 지원 (대각선, 페이지 정중앙)
  - **CONFIDENTIAL 푸터**: `--confidential` 옵션
  - **preview 모드**: HTML 렌더 후 브라우저 자동 오픈 (PDF 라운드트립 회피)
  - **외부 이미지 fetch 차단 기본 ON** — 트래커 픽셀 방어
  - **Output Contract**: stdout=경로 한 줄, stderr=진행, exit code 0/1/2/3/4

- `skills/pdf/templates/default.css` — A4 print CSS (Paged Media)
- `skills/pdf/templates/cover.html` — 표지 템플릿
- `skills/pdf/templates/watermark.css` — 대각선 워터마크 (mm 절대 좌표)

#### Changed — pdf/SKILL.md

- "Markdown → 출판품질 PDF" 섹션 추가 (한국 기본값/사용법/페이지 구성 옵션/Output Contract/의존성 설치)

#### Changed — Clio (마무리투수)

- Phase 3-4 신규: PDF 출력 단계
  - AskUserQuestion 3단계 (PDF 여부 / 페이지 구성 모드 / 워터마크)
  - 3종 산출물(PRD/TECHNICAL/USER-MANUAL)을 자동으로 PDF로도 출력
  - 의존성 누락 시 자동 점검 + PDF만 건너뛰고 다음 Phase 진행 (블로커 아님)
- 옵션 추가: `--no-pdf`, `--pdf=user-manual`
- 산출물 디렉토리 트리/연관 스킬 테이블에 PDF 산출물 표기

#### 백엔드 결정

playwright + Chromium 채택 (gstack make-pdf의 Paged.js와 동등). `/minos` 스킬이 이미 사용 중이므로 의존성 중복 없음. weasyprint는 Windows GTK 런타임 의존성 문제로 제외.

#### 의존성

```
pip install playwright markdown pygments
playwright install chromium
```

또는 한 방에:
```
python skills/pdf/scripts/markdown_to_pdf.py setup
```

## [4.1.0] - 2026-04-28

### 🆕 Domain Dictionary — Ubiquitous Language

DDD(Domain-Driven Design)의 **Ubiquitous Language** 개념을 한국 SI 영-한 혼용 환경에 맞춘 새 스킬과 풀파이프라인 통합. 코드/스펙/대화의 도메인 용어를 추출하여 동의어/이의어/과부하/영-한 불일치를 탐지하고, 마스터(`docs/domain-dictionary.md`) + 델타(`<planning_dir>/domain-dictionary-delta.md`) + 글로벌(`~/.claude/memory/domain-dictionaries/`) 3계층으로 관리합니다.

#### Added

- **domain-dictionary** (신규 스킬) — 글로벌-프로젝트 패턴, 마스터-델타 구조, 글로벌 동기화 (참고형 + 명시 채택, 자동 상속 ❌)
  - `references/extraction-guide.md` — 용어 추출 알고리즘, 동의어/이의어/과부하/영-한 불일치/약어/외래어 탐지
  - `references/global-sync.md` — 글로벌 폴더 자동 생성, 도메인 추정, 명시적 글로벌 반영 절차
  - `references/global-readme-template.md` — 첫 실행 시 글로벌 폴더에 복사되는 README 시드

- **explain** — `--zoom-out` 모드 추가 (mattpocock/skills의 zoom-out 흡수): 호출자/형제 모듈/상위 맵 출력
  - `references/zoom-out.md` — 줌아웃 모드 워크플로우

#### Changed — 풀파이프라인 통합 (12개 스킬)

- **zephermine** — 26단계를 6 Phase로 그룹화 + Step 8/10/11 끝부산물로 사전 v1→v2→v3 진화 + Resume 보정 규칙 (별도 단계 추가 X)
- **zephermine team-review-protocol** — 6명 전문가에 사전 컨텍스트 자동 주입 + `## Dictionary Updates` 출력 의무화
- **zephermine domain-confirmation-guide** — Step 11에서 multiSelect 3개(도메인 제안 + 사전 변경 + 글로벌 반영) 통합
- **code-reviewer** — `maintainability` specialist에 "도메인사전 위반" + "모듈 깊이(인터페이스 가성비)" 카테고리 추가 (mattpocock improve-codebase-architecture 흡수)
- **argos** — Phase 8 신규 (도메인사전 감리 4-step: 영문 식별자/금지 표현/UI 한글/미등재 신규). 8 Phase → 9 Phase
- **agent-team(포세이돈)** — `teammate-context-template.md`에 사전 자동 주입 + 강제 사용 지침 (모든 worker 공통)
- **agent-team-codex** — Codex spawn 명령에 사전 준수 지침 인라인 + 6번 공통 도메인사전 컨텍스트 템플릿
- **workpm(다이달로스)** — Phase 1 끝 사전 자동 생성/로드 + Phase 4 teammate 전달 + Phase 5 사전 준수 검증
- **minos(미노스)** — Step 1 끝 사전 컨텍스트 로드 + Step 2 코드 생성 시 `describe`/`it`이 사전 따름
- **clio(클리오)** — Phase 3 시작 사전 로드 + 3종 문서(PRD/TECHNICAL/USER-MANUAL) 일관성 + 용어 색인 자동 부록
- **biz-strategy(헤르메스)** — 산출물 끝 "## 핵심 도메인 용어 시드" 부록 (zephermine 사전 v1 시드 가교)
- **ceo(아테나)** — Phase 6 신규 "도메인 명확성 점검" (Go/No-Go 보조 지표)
- **hestia(헤스티아)** — 2-6 신규 "사전 미등재 도메인 식별자" 보고 (사전 갱신 트리거, 삭제 X)

#### Docs

- README.md / README-ko.md / AGENTS.md / QUICK-REFERENCE.md / docs/smart-setup-registry.json — 95개 → 96개 스킬 갱신
- AGENTS.md Documentation 카테고리에 `domain-dictionary` 등록
- explain 카테고리 설명에 "줌아웃 모드" 명시

#### Decisions (보류)

- **caveman 모드** — 핸드오프와 결이 다름 + 한국어 경어체 정책과 충돌 → 별도 도입 안 함
- **design-an-interface** (mattpocock) — zephermine Step 16-20에 이미 인터페이스 설계 단계가 있음 + architect agent로 보강 → 별도 도입 안 함
- **improve-codebase-architecture** — code-reviewer maintainability "모듈 깊이" 카테고리로 흡수

---

## [4.0.2] - 2026-04-27

### Changed
- **skills**: shortened routing-focused `description` metadata for 17 high-safety skills without changing workflow bodies.
- **codex**: synced shortened descriptions to installed Codex skill copies to reduce startup skills prompt pressure.
- **install**: copy-mode sync now skips nested `node_modules` directories when refreshing existing installs, avoiding Windows file-lock failures from running Orchestrator MCP native modules.
- **install**: defined Codex/Gemini install directories before Orchestrator MCP checks so `install.bat` validates the correct targets.
- **docs**: updated README/README-ko/AGENTS counts and hook tables to match the current 95 skills, 42 agents, and 9 hooks.

---

## [4.0.1] - 2026-04-20

### Bug Fixes
- **chronos**: `continue-loop.ps1` Line 215 — `Get-FrontmatterValue $stateContent` → `Get-FmValue $frontmatter` (Codex 자동 재개 매 턴 실패 원인)
- **install**: `install-hooks-config.js`에서 삭제된 훅 3개(validate-code, validate-docs, format-code) 설치 시도 제거
- **cross-cli**: codex-mnemo/gemini-mnemo agents-md-rules에서 삭제된 스킬(workpm-mcp, pmworker) 참조 수정
- **docs**: AGENTS.md Task Lookup + Workflow 체이닝 stale 참조 전부 교체, 500줄 제한 → 구조 원칙
- **hooks**: settings.example*.json, SETUP.md에서 삭제된 훅 설정 제거
- **.agents/hooks**: check-new-file "Reducing Entropy" → "New File Check" 동기화
- **.agents/.codex-sync-manifest.json**: 삭제된 훅 4개 참조 제거

### Other Changes
- **hooks**: ddingdong-noti(데스크톱 알림) 비활성화 → archive

---

## [4.0.0] - 2026-04-20

### 🧹 The Great Cleanup — 정리의 시대

**v4.0.0은 대규모 품질 감사 + 정리 + 강화입니다.** addyosmani/agent-skills 벤치마크 후 중복 제거, 약한 스킬 강화, 새 올림포스 신 추가, 훅 현대화.

#### ⚠️ BREAKING CHANGES

- **에이전트 7개 삭제** (archive/로 이동, 복원 가능):
  - `humanizer-guidelines` → `writing-guidelines`에 흡수
  - `react-useeffect-guidelines` → `react-best-practices`에 흡수
  - `web-preview-development` → `web-preview-guide`에 이미 포함
  - `code-review-checklist` → `code-reviewer` 스킬이 커버
  - `general-purpose` — 가치 없음 (삭제)
  - `fullstack-development-workflow` → `fullstack-coding-standards`에 흡수
  - `reducing-entropy` → `deprecation-and-migration` + `hestia`에 흡수

- **스킬 7개 삭제** (archive/로 이동):
  - `stitch-design-md`, `stitch-enhance-prompt`, `stitch-loop`, `stitch-react` → **`stitch`** 1개로 통합 (4 모드)
  - `workpm-mcp` → `orchestrator` 트리거 흡수
  - `pmworker` → `workpm` 트리거 흡수
  - `multi-ai-orchestration` → `orchestrator`에 흡수
  - `qa-test-planner` → `minos`에 흡수 (시나리오 현장 생성)
  - `reducing-entropy` → `deprecation-and-migration` + `hestia`에 분리 흡수

- **훅 3개 삭제** (archive/로 이동):
  - `validate-code` — Claude Code 내장 보안 검사가 대체
  - `validate-docs` — `humanizer` + `writing-guidelines`가 대체
  - `debug-stop-hook` — 디버깅 전용, 개발 완료
  - `format-code` — Claude Code가 포매팅 대체 + stdin 파싱 불일치

- **500줄 파일 크기 제한 폐지** — LLM 시대에 줄 수 제한 불필요. 구조 원칙(단일 책임, 순환 의존 금지)으로 전환

#### 🏛️ New Olympians

| 신 | 스킬 | 역할 |
|---|---|---|
| Hestia (헤스티아) | `/hestia` | 화로의 여신 — Dead Code 탐지 + 코드 위생 관리 |
| — | `/adr` | ADR(Architecture Decision Records) 작성 + 인덱스 관리 |
| — | `/launch` | 프리런치 체크리스트 + 단계적 롤아웃 + 롤백 플레이북 |
| — | `/deprecate` | 코드 부채 정리 + 마이그레이션 가이드 |

#### 🔧 Skill Enhancements

- **clio v2.1** — 마무리투수(Closer) 복원:
  - Phase 1 신설: GO/NO-GO 판정 (테스트/린트/타입/커버리지/누락 탐지)
  - Phase 3.5 신설: 문서 사이트 생성 (VitePress/Docusaurus/MkDocs, Hot Reload)
  - NO-GO 시 문서 생성 중단
- **agent-team + workpm** — Phase별 Opus/Sonnet 모델 배분:
  - 판단 작업 (아키텍처, 도메인 조사) → Opus
  - 코딩 작업 (구현, 테스트) → Sonnet
  - Phase 4 테스트 단계 + 에러 복구 전략 5종 추가
- **chronos** — loop-state.md 접근 금지 명시, 책임 분리 (AI vs 훅 vs 사용자)
- **minos** — qa-test-planner 흡수, 시나리오 없을 때 4단계 현장 생성 프로세스
- **seo-audit** — Lighthouse CLI 자동 실행 + 점수 기반 우선순위
- **test-driven-development** — 테스트 프레임워크 자동 감지 (Vitest/Jest/pytest/JUnit/xUnit/Go)
- **excel2md** — 구조 분석, 데이터 타입 감지, 병합 셀/멀티 헤더 처리
- **web-to-markdown** — 배치 변환, 로그인 페이지, 선택적 추출
- **stitch** — 4종 통합 (design/prompt/loop/react 모드)

#### 📊 Numbers

| 항목 | v3.1.0 | v4.0.0 | 변화 |
|------|--------|--------|------|
| Skills | 98 | 95 | -3 |
| Agents | 49 | 42 | -7 |
| Hooks | 13 | 10 | -3 |
| Archive | 0 | 17 | 복원 가능 |

---

## [3.1.0] - 2026-04-16

### Features
- **skills**: add skill-evolve + gotcha analyzer에 스킬 개선 제안 연결 (03b2085)
- add update-check system + VERSION file for upgrade notifications (8b62d09)

### Bug Fixes
- **mnemo**: JSONL 직접 읽기 금지 가드 추가 — 3-CLI parity (af4c9eb)
- **chronos**: AI가 loop-state.md를 직접 rm하지 않도록 개선 (e53b7bf)

### Other Changes
- **gitignore**: docs/launch/ 추적 해제 — 마케팅 초안은 local only (27b0f8e)

## [3.0.0] - 2026-04-08

### 🏛️ Skill Olympus — The Pantheon Awakens

**v3.0.0은 이번 프로젝트의 가장 큰 변경입니다.** 데이터 유실 방지 종합 개편, 그리스 신화 네이밍 통일, repo rename, 3-CLI parity 강화. BREAKING change 포함.

#### ⚠️ BREAKING CHANGES

- **Repo rename**: `claude-code-agent-customizations` → **`skill-olympus`**
  - GitHub 자동 redirect 활성 — 옛 URL은 한동안 유효
  - Local clone은 `git remote set-url origin https://github.com/Dannykkh/skill-olympus.git` 권장
- **Skill rename** (legacy alias 모두 유지):
  - `qpassenger` → **`minos`** (저승의 심판자, fix-until-pass)
  - `final-inspection` (closer) → **`clio`** (역사의 뮤즈, 마지막 기록자)
  - `agent-team` 별칭 `대니즈팀` → **`포세이돈`** (바다의 신, 파도/wave 비유)
- **호출명 변경**: `/qpassenger`, `/closer` → `/minos`, `/clio` (옛 명령은 alias로 유지)

#### 🔱 The Pantheon — 12명의 그리스 신으로 통일

| 신 | 스킬 | 역할 |
|---|---|---|
| Zeus | `/zeus` | Sovereign — 한 줄로 전체 파이프라인 |
| Zephermine | `/zephermine` | Architect — 26단계 인터뷰 |
| Poseidon | `/agent-team` `/poseidon` | Sea Lord — 병렬 시공 |
| Daedalus | `/workpm` `/daedalus` | Hands-On Builder — 직접 구현 |
| Argos | `/argos` | All-Seeing — 100개의 눈 |
| Minos | `/minos` | Judge — 저승의 심판자 |
| Clio | `/clio` | Chronicler — 역사의 뮤즈 |
| Chronos | `/chronos` | Tireless — 시간을 지치지 않는 자 |
| Hermes | `/hermes` | Wayfarer — 상업의 신 |
| Athena | `/athena` | Strategist — 전략의 여신 |
| Aphrodite | `/aphrodite` | Beauty — 미의 여신 |
| Mnemo | `mnemo` | Keeper of Memory — 모든 뮤즈의 어머니 |

#### 🧠 Mnemo — JSONL 기반 데이터 유실 방지 종합 개편

**문제**: Stop 훅이 한 번이라도 실패하면 turn이 영구 손실. 실측 결과 **27일치 대화 중 약 67% (Claude), 88% (Codex)가 누락 상태**였음.

**해결**:
- **reconcile 시스템 신규** — JSONL transcript를 source of truth로 선언하고, save-response/save-turn이 놓친 turn을 자동 backfill
  - `skills/mnemo/scripts/reconcile_conversations.py` (Claude)
  - `skills/codex-mnemo/scripts/reconcile_codex_conversations.py` (Codex, sha1 dedup)
  - `hooks/reconcile-conversations.ps1`/`.sh` (SessionStart wrapper, Claude+Codex 동시 실행)
- **사이드카 인덱스** `conversations/.mnemo-index.json` — uuid/sha1 기반 멱등 dedup, save-response와 reconcile이 동일 인덱스 공유
- **Days lookback 7일** — 자정 넘긴 세션 + 어제 hook 실패 자동 복구
- **Silent failure 제거** — 모든 mnemo hook이 `.claude/mnemo-errors.log`에 통합 기록 + SessionStart 24시간 에러 배너
- **Truncation 제거** — 4000자 제한 삭제 (실측 6233자 turn 정상 저장)
- **JSONL 청크 경계 버그 수정** — 5MB 청크 역방향 → ReadLines 전체 스캔 (PS), tail -n 500 → grep 전체 (sh)

#### 📁 conversations 폴더 잘못된 위치 버그 수정 (Critical)

**증상**: Visual Studio가 bin/Debug에서 실행되어 그 cwd에서 hook이 호출되면 conversations가 거기에 잘못 생성. 사용자 보고: "윈도우 프로그램 짤 때 갑자기 debug 폴더에 conversations가 생기더라". 실측 한 프로젝트에 흩어진 conversations 폴더 7개 발견.

**해결**: 8개 hook에 cwd 정규화 헬퍼 추가 (`Get-ClaudeProjectRoot` / `get_claude_project_root`):
1. JSONL transcript의 cwd 필드 → 그 cwd에서 git -C rev-parse
2. transcript_path 부모 디렉토리 디코딩 (D--git-foo → D:\git\foo)
3. 기존 PWD + git rev-parse (최종 fallback)

적용: save-response/save-conversation/save-tool-use/reconcile-conversations + Codex/Gemini save-turn

#### 🌐 3-CLI Parity 강화

- **Hook parity audit** — Claude/Codex/Gemini의 hook event 매핑 매트릭스 작성
- **Rules parity** — 6개 핵심 규칙(`#tags`, `<private>`, 과거 검색, MEMORY.md, 핸드오프, alias)이 3-CLI 모두 100% parity
- **Codex 구조적 한계 명시** — notify 1개 event라 PreToolUse 차단형 hook 불가능 → 사용자에게 솔직히 안내
- **Gemini 구조적 한계 명시** — 자체 transcript 부재 (reconcile 불가), `/poseidon`은 multi-agent 부재로 `workpm` (다이달로스) fallback
- **CLI 전용 alias 추가** — `/minos`, `/clio`, `/poseidon` + legacy alias가 codex-mnemo + gemini-mnemo agents-md-rules.md에 동기화

#### 🪄 Hidden bug 수정 (audit 중 발견)

- **PowerShell BOM** — `[System.Text.Encoding]::UTF8`은 BOM 포함 인코더. `New-Object System.Text.UTF8Encoding $false`로 8개 PS 스크립트 18곳 교체
- **PS 5.1 Join-Path 3-인수 미지원** — gemini-mnemo, codex-mnemo, save-tool-use 3곳 중첩 호출로 수정
- **subprocess 인코딩 cp949 디코드 실패** — handoff 스크립트 4개에 `encoding="utf-8", errors="replace"` 명시 (한글 git 출력 처리)
- **Windows App Store python3 stub exit 49** — wrapper에서 `python` 우선 시도 + `--version` 검증
- **Codex/Gemini의 cwd 정규화 부재** — Visual Studio 같은 환경에서 Claude와 동일한 버그 발생 → 동일 패턴으로 수정

#### 📜 README 호메로스 서사시 톤

- **The Pantheon of Olympus** 섹션 신설 — "포도주처럼 검푸른 바다 너머, 구름이 갈라지는 곳에 올림푸스 산이 솟아 있다"
- 12명의 신마다 epithet + 묘사 + 명대사 (Robert Fagles / 천병희 번역체 풍)
- "구름을 모으시는 자 제우스", "땅을 흔드시는 자 포세이돈", "회색 눈의 아테나" 등 호메로스 별호
- 영문 + 한글 양쪽 동일 톤

#### 🚀 GitHub Launch 준비

- **GitHub topics 16개** — `claude-code`, `codex-cli`, `gemini-cli`, `agent-skills`, `greek-mythology`, `llm-agents`, `agent-orchestration`, `mcp`, `prompt-engineering`, `ai-tools` 등
- **README hero 재구성** — "Twelve Greek gods. One command. A working SaaS."
- **Reddit launch playbook** — `docs/launch/reddit-post.md` (제목 후보 + 본문 초안 + 댓글 답변 playbook)
- **`.claude-plugin/` 메타데이터 갱신** — name/description/keywords 모두 v2.0.0 → 새 정보로

#### 🧹 Gitignore 정리

- `*.log`, `tmp-*`, `*-debug.log` 패턴 추가
- `tmp-claude-debug.log` 추적 해제

---

## [2.1.0] - 2026-04-06

### Pipeline Integrity Audit + gstack-Inspired Improvements

**Zeus 파이프라인 정합성 (6건)**
- **zeus** — auto-interview-generator를 CPS Gate 1/2/3 구조로 재작성 (A~G → Phase C/P/S)
- **zeus** — phase-transitions.md를 5-Phase → 7-Phase로 전면 재작성 (verification + docker 추가)
- **zeus** — commands/zeus.md를 7-Phase로 동기화
- **zeus** — docker-setup.md Phase 번호 수정 ("Phase 3" → "Phase 5")
- **zeus** — Taste Decision 분류 추가 (mechanical/taste → Phase 6 리포트에 표시)
- **zephermine** — docs/athena/ + docs/hermes/ 사전 파이프라인 산출물 참조 추가

**gstack 참고 비즈니스 스킬 개선 (4건)**
- **hermes** — 영역 0 수요 검증 추가 (4개 강제 질문 + 수요 판정 등급, YC office-hours 참고)
- **hermes** — 3-Layer 리서치 패턴 (정석/트렌드/1원칙 + 유레카)
- **athena** — Anti-sycophancy 규칙 + CEO 인지 모델 7개 (Bezos/Munger/Grove/Jobs/Horowitz/Altman)
- **zeus** — Taste Decision (mechanical/taste 분류)

**gstack 참고 디자인 스킬 개선 (6건)**
- **frontend-design** — AI Slop 블랙리스트 공유 reference 생성 (10항목 + Hard Rejection 7개 + 폰트 블랙/대안)
- **ui-ux-auditor** — 8영역 → 9영역 (AI Slop 탐지) + 0-10 채점 + A~F 등급
- **design-plan** — Phase 4에 9영역 채점 + AI Slop 반영
- **zephermine** — design-system-guide CPS Phase S-1 참조 + AI Slop 방지 + /aphrodite 안내
- **zephermine** — Step 24/26에 /aphrodite 다음 단계 추가

**Argos 감리 확장 (Phase 6~7)**
- **argos** — Phase 6: 디자인 준수 검증 (디자인 토큰 + AI Slop + 9영역 채점)
- **argos** — Phase 7: 보안 검증 (시크릿 고고학 + 의존성 + OWASP + STRIDE)
- **argos** — commands/argos.md 신규 생성

**Daedalus 점검 (9건)**
- **workpm** — 4단계 → 5단계 헤더, Phase 자기참조 5건, Phase 기준선 수정
- **workpm** — argos/aphrodite 다음 단계 추가, allowed-tools 3개 추가, description 업데이트
- **workpm-mcp** — Phase 차이 문서화, 기준선 코멘트, argos/aphrodite 추가
- **orchestrator** — SKILL.md 워크플로우 5단계/4단계 업데이트
- **pmworker** — orchestrator_heartbeat allowed-tools 추가
- **state-manager.ts** — lockFile TOCTOU 레이스 컨디션 트랜잭션 수정

**Danny's Team 점검 (8건)**
- **agent-team** — 재시도 횟수 2회로 통일, Step 라벨 수정, 인트로 Activity Log 추가
- **agent-team** — argos/aphrodite 다음 단계, Pre-Step 좀비 팀 정리, Wave 간 컨텍스트 체크
- **agent-team-codex** — Step 0 PM 게이트 + Step 6 코드 리뷰 게이트 + 보조문서 매핑 추가
- **hooks** — save-tool-use skip 목록에 TeamCreate/TeamDelete/SendMessage 추가

**Chronos 점검 (7건)**
- **chronos** — setup-loop help "무제한" → "50, 0=무제한"
- **chronos** — chronos-worker 완료 신호 + gotchas/learned 참조 추가
- **chronos** — loop-stop 오탐 방지 (마지막 500자만 검사)
- **chronos** — Codex continue-loop 2시간 stale guard 추가
- **chronos** — setup-loop 기존 루프 감지 (동시 루프 방어)
- **chronos** — agents/chronos-worker.md 글로벌 복사

**보안 에이전트 보강**
- **security-reviewer** — 인프라 우선 6 Phase (시크릿→의존성→CI/CD→OWASP→STRIDE→LLM)
- **security-reviewer** — 6개 실행 모드 + 신뢰도 게이트 + False-Positive 17개 제외 목록

**인프라 개선**
- **install-hooks-config.js** — format-code 훅 등록 + shouldIncludeHook 번들 필터링 복원

### New Skills
- **health-data** — Health Connect/HealthKit 건강 데이터 통합 가이드 (심박수, 수면, 걸음, 동기화)

### Improvements
- **social-login** — frontmatter에 triggers + auto_apply 추가

---

## [2.0.0] - 2026-03-30

### Harness Engineering — CPS Framework
- **zephermine** — Interview restructured from A-G categories to **CPS 3-Phase + 3-Gate** (Context → Problem → Solution with mandatory user agreement checkpoints) (f5b08eb)
- **zephermine** — spec.md now includes **Context Map** (ecosystem map, stakeholders) and **Problem Statement** (core problems with priority) as traceable anchors (f5b08eb)
- **zephermine** — Section index gains **Ecosystem Coverage Check**: every system in Context Map must be covered by a section or explicitly excluded (f5b08eb)
- **argos** — New **Phase 0: CPS Traceability** — validates Problem→Solution, Ecosystem→Section, Problem→Section mapping before code inspection (f5b08eb)
- **pipeline** — Clear role separation: `/hermes` (business CPS) stays outside `/zeus`, `/zephermine` (implementation CPS) stays inside (f5b08eb)
- **docs** — Harness Engineering Report: full pipeline flow, 3-axis model, CPS framework documentation (f5b08eb)

### Bug Fixes
- **install** — Disable Gemini MCP install routine (gemini CLI MCP support unstable) (998637f)

---

## [1.9.0] - 2026-03-24

### Features
- **ceo (Athena)** — CEO coaching skill: Go/No-Go gate, strategic challenge, scope decisions (Expand/Reduce/Pivot/Kill), kill test. Hermes synergy for data-driven challenge (d0a6541)
- **pipeline** — New pipeline phase: `/hermes` → `/athena` → `/zephermine` (d0a6541)

### Docs
- **README** — Full rewrite: star-optimized structure, Meet the Team section with Greek myth naming (e14a1d8, f859c14)
- **README-ko** — Korean README renewal: same structure as English version (d5f7ef7)
- **zephermine** — 24-step → 26-step correction (d1fa029)

---

## [1.8.0] - 2026-03-23

### Features
- **project-gotchas** — Auto gotcha + learned pattern management with Haiku analyzer (656167c)
- **cross-cli** — Codex/Gemini save-turn hooks integrated with gotchas/learned observation (dbca431)
- **codemap** — CodeMap index files + AGENTS.md section link (ab5ba39)
- **GEMINI.md** — Gemini CLI project instructions (85b30a8)

### Bug Fixes
- **hooks** — save-tool-use.ps1 PowerShell syntax error + JSON parsing error guard (e47a62a, 017715a)
- **installer** — better-sqlite3 prerequisite check + PROJECT_ROOT removal (939d85d)
- **skills** — qa-test-planner YAML frontmatter folded block scalar fix (0055ce1)

---

## [1.7.0] - 2026-03-21

### Features
- **orchestrator** — state.json → SQLite WAL migration (2db3d2c)
- **minos** — Playwright MCP browser exploration QA Step 5 (d076b19)
- **agents** — Large-scale agent improvements (octopus reference) (a406744)

### Bug Fixes
- **skills** — Subagent AskUserQuestion blocking prevention + argos healer (acbbe5d)
- **installer** — jq prerequisite check for hook error prevention (4a1b9ea)

---

## [1.6.0] - 2026-03-18

### Features
- **mnemo** — Progressive disclosure, PostToolUse hook, privacy tag, token hints (d869969)
- **design-plan** — Aphrodite design orchestrator skill (ef56d87)
- **estimate** — Development cost estimation with Excel output (3dd1f9e)
- **biz-strategy** — Business model canvas, TAM/SAM/SOM, renamed to /hermes (cf67dfe, 6ffb9ea)
- **okr** — OKR goal setting and tracking (cf67dfe)
- **frontend-design** — Design databases: 161 palettes, 73 fonts, 84 styles (d906bae)

### Refactoring
- **skills** — Anthropic skill-making best practices applied (7a4856b)
- **skills** — Progressive disclosure split for minos, hermes, closer (91916b4)
- **skills** — Trigger conditions added to 11 skill descriptions (97e55fe)

---

## [1.5.0] - 2026-03-09

### Features
- **final-inspection** — Closer skill for post-pipeline flow diagrams + document generation (b1ed739)
- **release-notes** — Version + CHANGELOG + tag automation (92cc997)
- **seo-audit** — Expanded to SEO + AEO + GEO 10-area audit v2.0.0 (c87e2e6)
- **zephermine** — Academic research, competitor analysis, persona & journey map (2893d92)
- **youtube-transcript** — yt-dlp based, no MCP needed (615f59e)
- **frontend-design** — Anthropic official skill integration (74d1169)

### Refactoring
- **pipeline** — Integer numbering, PM principles, role separation, sync filtering (909d7a6)
- **artifacts** — CLI-neutral naming, zeus archive cleanup (b3a793a)

---

## [1.4.0] - 2026-03-02

### Features
- **auto-continue-loop** — Chronos: iterative FIND-FIX-VERIFY loop (7dc6b28)
- **argos** — Pipeline architecture + construction inspection skill (067984a)
- **memory-compact** — MEMORY.md explosion prevention (9b912b1)
- **orchestrator** — Portable workpm and chronos entrypoints (1ef7089)
- **docker-db-backup** — PostgreSQL/MySQL/MariaDB backup in Docker (f18c194)

### Bug Fixes
- **hooks** — Use absolute paths for Windows compatibility (e1b9229)
- **install** — Safe-copy.js for broken symlink handling (3cb344d)
- **install** — Remove broken symlinks before copy (c478f50)

---

## [1.3.0] - 2026-02-19

### Features
- **codex-mnemo / gemini-mnemo** — Cross-CLI memory sync (f70775f)
- **workpm v2** — Full overhaul + 8-person team test (70f6b35)
- **selective install** — Choose components during install (85923a4)
- **Gemini CLI** — Full support with MCP install (85923a4)
- **agents** — ASP.NET Core + WPF Desktop + web-preview agents (0bd52fc, b36d282)
- **spawn_workers** — Multi-AI auto execution: Claude + Codex + Gemini (681b2c1)

### Bug Fixes
- **mnemo** — Conversation search integration + Codex duplicate save fix (5d18306)
- **install-mcp** — MCP health check + auto-repair on connection failure (bade9c2)

---

## [1.2.0] - 2026-02-09

### Features
- **zephermine** — GitHub similar project search + QA scenarios + API spec generation (3fcbe84, b2fa3ea, 3129b73)
- **agent-team** — Native Agent Teams with wave grouping + free mode (c3c0438, ad4af93)
- **qa-until-pass** — Fix-until-pass test loop (later renamed to minos) (c818470)
- **zeus** — Zero-interaction full pipeline skill (e55bb64)
- **stitch UI skills** — Design-md, enhance-prompt, loop, react (230bebf)
- **plugin manifest** — Claude Code plugin marketplace support (033c4ba)

### Bug Fixes
- **zephermine** — Context explosion prevention in team review (166e45a)
- **workpm** — AI assignment realistic adjustment (3b0d178)

---

## [1.1.0] - 2026-02-01

### Features
- **zephermine** — Renamed from gepetto, orchestrator MCP expansion (f6a04fb)
- **docker-deploy** — v2.0.0 ~ v2.7.0 evolution (66f418d ~ 9c188bf)
- **fullstack-coding-standards** — Agent + skill with smart-setup (da81254)
- **install.bat** — 7-step installer with hook auto-registration (655b561, 9f96b1c)
- **mnemo** — Skill folder consolidation + keyword extraction + conversation search (178a239, 7c6e31f, c8d558b)
- **orchestrator** — Skill folder consolidation + project install script (dfb830d, bcaf8e6)
- **excel2md** — Excel to markdown converter (b44a16a)
- **external skills** — TDD, debugging, Semgrep, Wrangler, DOCX, PDF (5ad580d)

### Refactoring
- **skills** — Duplicate cleanup: 5 deleted, 2 merged (24e5244)
- **memory** — Context tree structure + 3-layer architecture (b2788c1, 604d20f)

---

## [1.0.0] - 2026-01-29

### Initial Release

The foundation of the AI agent harness customization system.

- **30+ skills** — humanizer, ppt-generator, docker-deploy, and more
- **10+ agents** — ai-ml, code-review, architecture, debugging, and more
- **Hooks** — PowerShell + Bash hook scripts for Windows/Mac/Linux
- **MCP servers** — Presentation, document, and free/local alternatives
- **3-layer memory** — MEMORY.md index + memory/*.md + conversations/
- **Multi-AI** — Orchestrator with workpm/pmworker triggers
- **install.bat/sh** — One-command installation
- **QUICK-REFERENCE.md** — Easy resource discovery
