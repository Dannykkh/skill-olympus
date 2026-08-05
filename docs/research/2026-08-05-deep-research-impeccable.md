# 딥리서치: pbakaus/impeccable — AI 코딩 에이전트용 디자인 언어

`date: 2026-08-05`
`source: claude`
`대상: https://github.com/pbakaus/impeccable (클론 스냅샷 2026-08-04, 커밋 620ba1f)`

## 요약

Impeccable은 "AI 하네스가 디자인을 더 잘하게 만드는 디자인 언어"다. 1개 스킬 + 23개 커맨드 + 59개 결정론 검출 규칙 + 브라우저 라이브 반복 모드로 구성되며, 14개 이상의 AI 코딩 도구(Claude Code, Cursor, Codex, Gemini CLI, Grok Build 등)에 동일하게 배포된다. Anthropic의 frontend-design 스킬에서 출발해 이를 대체하는 사실상의 표준으로 성장했고, 제작자는 a16z 투자로 회사를 설립했다.

핵심 설계 사상은 셋이다:

1. **"하지 마라"는 린터에게, "이렇게 해라"는 프롬프트에게** — 금지 규칙을 프롬프트에 쌓지 않고 LLM 없는 결정론 검출기(훅/CLI/CI)로 빼냈다.
2. **다양성은 제약이 아니라 외부 난수로** — "모델의 1순위 선택은 매 실행이 출하할 것"이므로 방향 배정을 외부 스크립트(concept-seed)가 주사위로 강제한다.
3. **원샷 디자인 도구가 아니다** — "It's never going to be a tool for one-shot design." 80%는 AI, 마지막 20%는 라이브 모드에서 사람이 고른다.

## 1. 지표와 배경

| 항목 | 값 (2026-08-04 기준) |
|---|---|
| GitHub 스타 / 포크 | 54,927 / 3,305 |
| 저장소 생성 | 2025-11-16 (약 9개월 경과) |
| npm 월간 다운로드 | 326,544회 |
| 커밋 | 1,411 (제작자 1인이 1,131건 — 사실상 1인 주도) |
| 릴리스 | 3원 독립: Skill v4.0.4 / CLI v3.5.0 / Extension v1.3.1, 2~5일 간격 |
| 라이선스 | Apache 2.0 |

- **제작자**: Paul Bakaus — jQuery UI 공동 제작자, 전 Google(Chrome/AMP).
- **사업화**: a16z 투자(리드 Anish Acharya)로 회사 **Renaissance Geek** 설립. GitHub 파트너십으로 **GitHub Copilot 앱에 기본 번들** 포함. 컨셉/컴포지션 카탈로그는 사설 레포로 분리 — "the catalog is the paid-service moat" (CLAUDE.md:83).
- **출발점**: README가 명시 — "Anthropic's frontend-design was the first widely-used design skill for Claude. Impeccable started from there."
- 참고 문헌: [a16z 인터뷰](https://www.a16z.news/p/impeccable-by-design), [Latent Space "skill engineering"](https://www.latent.space/p/skill-engineering-design), [공식 사이트](https://impeccable.style)

## 2. 아키텍처: 1스킬 23커맨드

**의도적 통합**: "There is one user-invocable skill... Do not add standalone skills... the `/` menu pollution problem is real" (CLAUDE.md:5-12). 자주 쓰는 커맨드만 `/impeccable pin audit`으로 `/audit` 단축 생성.

| 카테고리 | 커맨드 |
|---|---|
| Build | shape(코드 전 계획) · init(PRODUCT.md) · document(코드→DESIGN.md) · extract(토큰 승격) |
| Evaluate | critique(UX 리뷰+채점) · audit(a11y/perf/responsive) |
| Refine | polish · bolder · quieter · distill · harden · onboard |
| Enhance | animate · colorize · typeset · layout · delight · overdrive |
| Fix | clarify · adapt · optimize |
| Iterate | live(브라우저 변형 반복) |

**컨텍스트 소비 순서** (SKILL.src.md, 85줄짜리 라우터):
1. 세션당 1회 `context.mjs` — PRODUCT.md / DESIGN.md / surface 브리프 로드
2. 요청을 소유한 **플레이북 1개만** 로드 (reference/ 35개 중)
3. UI 편집 **직전에만** `craft-floor.md`(품질 바닥) 로드

3번의 이유가 핵심 통찰: "**Models over-cautious themselves into safe, underdesigned output when reminded about accessibility at design time**" — a11y 규칙은 audit.md에만 있다. 디자인 시점의 부정 제약 리마인더가 소심한 출력을 만든다는 진단.

**Visitor Mode 4종**: Persuade(결정·행동) / Operate(작업 완수) / Read(이해) / Experience(작품). 프로젝트가 아니라 **화면 단위** 판정 — "A tool's landing page is still Persuade."

**서브에이전트 4종**: finish-reviewer(트랜스크립트 격리 — "a reviewer that inherits your transcript inherits your framing, your optimism"), documenter, asset-producer, manual-edit-applier. 서브에이전트 없는 하네스엔 `reference/degraded/` 인라인 폴백을 빌드가 자동 생성하고 실행 시 대체 사실을 공시하게 한다.

## 3. 디자인 언어의 실체 (craft-floor + 플레이북)

v4에서 도메인별 레퍼런스 12개(typography.md, color-and-contrast.md 등)를 전부 삭제하고 커맨드 플레이북에 흡수 — "적용될 때만 로드".

**"밴"의 정의**: "These are the category's defaults, not bans: the brief's own words can earn any of them. **Reaching for one when the axis is free means you were not deciding.**" 유일한 진짜 절대 금지는 eyebrow 라벨 하나.

수치 규칙 발췌:
- 타이포: 본문 65-75ch, 모바일 입력 16px(iOS 강제 줌), 다크 배경 3축 보정(행간·자간·굵기 한 단계씩), 제품 UI 스케일비 1.125-1.2
- 색: 4전략(Restrained/Committed/Full/Drenched), OKLCH, "Choose hue from product meaning, never from a default category association", "Never gray on color"
- 모션: 100-800ms 4구간, `cubic-bezier(0.16,1,0.3,1)`, "Exit faster than entrance", 제품 UI는 "No orchestrated page-load sequences"
- 제품 UI: "Skeleton states, not spinners", "Modal as first thought. Modals are usually laziness"

**폰트 블랙리스트** (가장 강한 규칙): Fraunces, Playfair Display, Cormorant, Lora, Crimson, Newsreader, Syne, **Space Grotesk**, Space Mono, IBM Plex, Inter-as-display, DM Sans, Outfit, Plus Jakarta Sans, Instrument Sans. "a subject association is never that reason: books wanting a serif... are the associations the list exists to break."

**안티 슬롭 다층 방어**에서 독창적인 것들:
- **모델별 편향 블록**: `<claude>` 블록 — "warm, bookish subjects come out as cream grounds, serif display with italic accents... **Treat that first palette as already spent.**" `<codex>`/`<gemini>` 블록도 별도.
- **AI 3대 클러스터 호명**: warm cream+serif+terracotta/red / near-black+neon+glow / broadsheet+italic serif+mono labels. "**if someone could guess your aesthetic from the category alone, or from category-plus-avoidance, rework until neither answer is obvious**" — "뻔한 것의 반대"도 예측 가능하므로 슬롭.
- **외부 주사위(concept-seed.mjs)**: "your top-ranked structure is what every run would ship, so the dice come from outside." 재굴림은 사실 근거로만 — "taste is never grounds." 매 라운드 "카테고리 표준안" 탈출구를 조용히 제공하되 "never recommend it".
- **검증 상한**: "Verify in bounded passes, not a loop... two rounds is the ceiling" — "Open-ended self-QA burns the user's money."
- **소심함 방어**: "In unattended work, the safe rendition is the known risk."

**critique 채점**: Nielsen 10 휴리스틱 × 0-4 = 40점. "Most real interfaces score 20-32." 모드별 비적용 휴리스틱은 재정규화("Never print /40 over a partial set"). A/B 평가는 **서브에이전트 2개 격리 의무** — "Detector output is deterministic, but it still anchors judgment."

## 4. 검출 엔진 (cli/, 59규칙 × 4엔진)

- 규칙 = 메타데이터(registry) + 판정 로직(checks.mjs 5,580줄) 분리. 순수 함수 한 벌에 엔진별 어댑터.
- **4엔진**: 정규식(소스 파일, CSS-in-JS/Vue/Svelte 블록 추출) / 정적 HTML(**jsdom 없이 CSS 캐스케이드 자체 구현** — htmlparser2+css-tree+css-select 위에 specificity·@layer·shorthand 확장) / 브라우저(Puppeteer — script-error, 리빌 실패 감지, 실측 레이아웃 규칙) / 시각(픽셀 — 요소에 `color: transparent` 적용 전후 스크린샷 diff로 글리프 픽셀을 식별해 이미지/그라데이션 위 대비를 10퍼센타일로 판정).
- 규칙 구성: slop 32(side-tab, overused-font, ai-color-palette, nested-cards, icon-tile-stack, italic-serif-display, hero-eyebrow-chip, em-dash-overuse...) + quality 27(low-contrast, cramped-padding, heading-rhythm, tiny-text, design-system-* 4종...).
- **advisory 티어**: 탐지·보고되지만 실패로 집계 안 됨(종료 코드 0). 확신 낮은 규칙을 삭제하지 않고 유지하는 장치.
- **억제 3계층**: config(ignoreRules/Files/Values, reason 필수) → 인라인 주석(`impeccable-disable`, 파일과 함께 이동하는 면제) → DESIGN.md 대조(허용오차 명시). "오탐은 규칙 완화가 아니라 억제 수단 정교화로 해결."
- **오탐 방어 정책**: 새 규칙마다 fixture에 flag ≥4 / **pass ≥5** (거짓양성 케이스를 더 많이 요구), 통과 케이스마다 이유 주석.
- 실행: `npx impeccable detect <file|dir|url>` (--json, --scope, --viewport), primary 발견 시 exit 2. stdin JSON도 받음 — 이것이 훅 경로.

## 5. 훅 2티어 (하네스 통합)

| 티어 | 이벤트 | 내용 |
|---|---|---|
| immediate | PostToolUse (5s) | 편집 파일 1개, 13개 규칙만 (broken-image, low-contrast, design-system-* 등) |
| deep | Stop (30s) | 세션 중 만진 모든 UI 파일에 전체 룰셋, 중복 제거 후 1회 |

티어링 근거: "the per-edit stream fires overwhelmingly on copy-level rules, and **that steady nag stream makes models more conservative**." 계약: "never break a turn. Always exit 0." Cursor만 pre-edit 차단형(stop 훅이 headless에서 불안정), Copilot은 post만.

## 6. 라이브 변형 모드 (독창성 최고 지점)

브라우저에서 요소 선택 → 액션 선택("bolder" 등) → 에이전트가 **DOM 패치가 아니라 실제 소스 파일에** N개 변형을 작성 → HMR 핫스왑 → 사용자가 사이클/accept/discard.

- 서버: 의존성 0의 Node HTTP (SSE + fetch POST, 127.0.0.1:8400+, 토큰 게이트)
- 에이전트 연결: HTTP 롱폴 — "every harness can run a shell command and read its stdout. No harness-specific integration needed" (MCP도 확장도 아님)
- 변형 래퍼: `display: contents` (flex/grid 부모-자식 관계 보존)
- `.impeccable/live/sessions/*.jsonl` append-only 저널이 정본, 서버 재시작 시 복원
- 스크린샷은 **주석이 있을 때만** 에이전트에 전달 — "Without annotations the image is pure visual anchoring"
- 소스 역매핑: React Fiber 없이 특이성 순 텍스트 검색 + 태그 깊이 카운팅, 모호하면 `element_ambiguous`로 실패 인정. Svelte만 앱 자신의 컴파일러로 진짜 AST — "A wrong preview is worse than a plain one."

**브라우저 확장(extension/)은 이것과 별개 시스템** — 임의 페이지에서 안티패턴을 DevTools 패널에 띄우는 독립 리포터. AI와의 유일한 접점은 클립보드 복사("Suggested Impeccable skills to fix: distill, polish"). 네트워크 호출 0건.

## 7. 멀티 하네스 배포 (16 provider)

- SoT는 `skill/SKILL.src.md` — 파일명이 SKILL.md가 아닌 이유: `npx skills`가 리터럴 SKILL.md를 찾아 **미컴파일 소스를 설치**해버리는 사고 방지.
- provider descriptor 1개(configDir, frontmatterFields, agentFormat, emitHooks...)가 도구 1개를 정의. 같은 소스가 Claude에선 `/audit`, Codex에선 `$audit`으로, `{{ask_instruction}}`은 AskUserQuestion/question tool/직접 질문으로 갈린다.
- JS 스크립트는 정규식 치환 대신 마커 1줄만 교체 — "slash-command heuristics can collide with regex literals."
- 훅 스키마 5종(이벤트명 대소문자, 매처, 평면/중첩, timeout 필드명, 경로 변수까지 하네스마다 다름), 에이전트 포맷 4종(MD+YAML / TOML / .agent.md / cursor-md).
- 생성물 15개 dot-디렉터리를 **의도적으로 커밋** + CI가 `git diff --exit-code`로 드리프트 차단.
- 빌드 게이트 6종(카운트 정합, 버전 드리프트, 매니페스트 형태, **산문 린터** — em dash + 금칙어 21종이 빌드 실패).
- `docs/HARNESSES.md` — 14개 하네스의 frontmatter/훅/스킬 디렉터리/서브에이전트 지원 매트릭스 (점검일 명시).

## 8. 테스트 전략 (AI 스킬을 어떻게 테스트하는가)

**skill-behavior**: LLM judge 없음. 시스템 프롬프트 = SKILL.src.md 원본, 모델 4종(Claude/GPT/Gemini/DeepSeek — "가장 유용한 발견은 provider 간 발산"), 도구 5개 샌드박스, 결정론적 시뮬레이션 유저. **assertion은 툴 호출 트레이스에만** — "The trace is the source of truth, not the model's free-form reply." 인과 순서는 툴 호출 인덱스 비교, 스코프 준수는 fixture에 심은 감시 마커(`data-untouched`) 생존 여부로 환원. 재시도·temperature·N-of-M 없음 — 대신 **문서화된 베이스라인 표**: "a regression is 'more failures than baseline', not 'any failures at all'." CI 게이트가 아니라 리팩터 전후 비교 계측기(PR에선 안 돌림, 풀 스윕 $0.5-1.5).

**live-e2e**: 반대 접근 — temperature 0, 코드로 작성된 검증기 60개+, 실패 메시지 되먹임 3회 self-repair. 라우팅 검증(trace)과 콘텐츠 검증(결정론 rubric)에 다른 도구.

**테스트 인프라 자체를 테스트**: "모든 테스트 파일은 자기를 실행하는 스위트에 등록돼야 한다" 불변식 (실제 사고 4건이 계기).

## 9. 관찰된 리스크

1. Antigravity(.agent) provider가 CI 동기화 경로에 누락 (배포 채널 간 비대칭)
2. 브라우저 번들러가 정규식 import 제거 + 하드코딩 모듈 순서 (조용한 파손 가능)
3. 카운트 검증기는 정규식 휴리스틱 ("five stale counts shipped while the validator reported clean" 자백)
4. live 소스 역매핑의 구조적 취약성 — 자기비판 문서(LIVE-REWRITE-PLAN.md)에 "projectRoot is an ambient parameter, re-derived in at least 12 scripts" 등 5대 문제 기록
5. 커뮤니티 평가: "슬롭 제거의 최고 도구지만, **슬롭의 부재가 곧 취향은 아니다**"

## 10. 이 레포에 주는 시사점

### 실험으로 확인된 것 (2026-08-04 A/B/C 실험)

같은 브리프(가상 노트 앱 랜딩)를 아프로디테 파이프라인(A) / Claude 네이티브 플러그인 단독(B) / 레포 포크본 단독(C)에 독립 컨텍스트로 부여, impeccable detect 59규칙 + 육안으로 판정.

최종본 원시 검출: A 83 > C 45 > B 15. 단 **정적 엔진 오탐을 분류 제거하면** (A의 저대비 41건 전부 = 다크 미디어 분기 색을 흰 배경과 짝지은 것, C의 저대비 24건 대부분 = 호버 반전 전환 상태 오짝):

- **실질 결함: B 약 1건 << C 약 20건(과소 텍스트 11·자간 3·여백 6) ≈ A 약 25건(여백 20) + A만의 자기 DESIGN.md 토큰 위반 17건**
- B(네이티브 최신본)만 "모델 편향 클러스터 회피" 지침을 담고 있어 실제로 크림 지면을 의도 회피(회녹 종이 선택, NOTES에 근거 기록). A는 자체 루브릭이 오히려 Cream/Vermilion(Claude 편향 클러스터)을 1위(4.75)로 **선정** — 고유성 채점이 카테고리 대비였지 모델 편향 대비가 아니었음. C(포크본)도 클러스터 내 착지 — 포크가 최신 반편향 지침을 놓친 구버전 스냅샷이라는 증거.
- 소요 시간은 A·B 비슷(약 70분), C 최속(약 35분). 아프로디테의 비용은 시간보다 **산출물 7종의 컨텍스트 소비와 무익한 절차**(하드 게이트가 수렴을 못 막음, 자기 토큰 위반 17건).
- 운영 교훈: impeccable detect **정적 모드는 듀얼 테마·호버 전환에 오탐** — 훅/CI 도입 시 URL(브라우저) 모드 우선 또는 오탐 분류 필요.
- 결론: 간섭 가설 지지 — 네이티브 단독이 실질 결함 최소 + 유일한 편향 탈출. 아프로디테 절차는 품질 이득 없이 컨텍스트만 소비. impeccable의 진단("디자인 시점의 부정 제약 리마인더 → 소심한 출력", "다양성은 제약이 아니라 외부 난수로")과 일치.
- 산출물: scratchpad `design-experiment/` (A/B/C index.html + NOTES.md + 검출 JSON + 스크린샷)

### 적용 후보 (우선순위 논의 필요)

1. **금지 규칙의 결정론 이관**: 아프로디테/frontend-design 프롬프트의 블랙리스트를 `npx impeccable detect` 훅(Apache-2.0, LLM 불필요)으로 이관. code-reviewer v4 "네이티브 위임" 패턴과 동일 방향.
2. **frontend-design 이중 설치 해소**: 포크본(~/.claude/skills)과 공식 플러그인이 동시 로드 — 미학의 소유자를 하나로.
3. **/ 메뉴 오염**: 스킬 100+개 평면 노출 vs 1스킬 N커맨드+pin. 디자인 계열만이라도 통합 검토.
4. **검증 상한**: chronos/argos 루프에 "two rounds is the ceiling" 개념 도입.
5. **트레이스 기반 스킬 회귀 테스트**: zephermine/zeus/argos에 skill-behavior 패턴(툴 호출 assertion + 베이스라인 표) 이식.
6. **advisory 티어**: 확신 낮은 검사를 삭제 대신 비차단 등급으로.
7. **데이터 갱신**: impeccable은 Space Grotesk를 과사용 폰트로 분류 — 전역 가드레일·font-pairings.csv의 추천과 충돌. 갱신 필요.
8. **모델별 편향 블록**: "Claude의 첫 팔레트는 이미 소진된 것으로 취급" 같은 자기 편향 명시를 frontend-design에 추가.

### 이미 우리가 앞서 있는 것

- Grok 처리 (동일 결론 + GROK_HOOK_EVENT 이중 저장 가드)
- 3계층 장기기억 (impeccable엔 대응물 없음)

### 복제 불가 영역

- 컨셉/컴포지션 카탈로그는 사설 레포 (paid moat) — 주사위 메커니즘을 이식하려면 카탈로그를 자체 구축해야 함

## 부록: 원자료

- 스킬 본체 분석: explore-skill 보고 (대화 기록, 플레이북 전수 분석은 scratchpad `playbook-report.md`)
- 엔진/테스트/빌드 분석: explore-engine 보고 3부 (대화 기록)
- 클론: scratchpad `impeccable/` (620ba1f)
- 실험: scratchpad `design-experiment/`

`#tags: impeccable, deep-research, design-skill, anti-slop, detector, live-mode, multi-cli, skill-testing, aphrodite`
