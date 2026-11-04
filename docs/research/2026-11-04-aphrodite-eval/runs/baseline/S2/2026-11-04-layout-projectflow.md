# Layout Blueprint — 플로우보드 첫 실행 (Phase 2-5 저충실도 와이어프레임 게이트)

- 작성일: 2026-11-04 · 범위: Phase 2-5까지. Phase 3(시각 방향) 이후는 이번 실행에서 하지 않음
- 정본 연결: Experience Contract `2026-11-04-experience-projectflow.md` · Sitemap `2026-11-04-sitemap-projectflow.md` · Brief `2026-11-04-brief-projectflow.md`
- 구조 기준: `D:\git\claude-code-agent-customizations\skills\frontend-design\references\layout-block-anatomy.md` (공통 문법 1~7, App 블록 Sidebar·Onboarding·Todo List·Data Table), `coder-interface-pattern-playbook.md`

## 와이어프레임 산출물

| 파일 | 내용 |
|---|---|
| `docs/design-refs/2026-11-04-wireframe-projectflow.html` | HTML/CSS 와이어프레임 11개 화면·상태. `?s=<id>`로 하나씩 표시, 720px 이하에서 모바일 변환. 잉크 3단계 그레이만 사용 |
| `docs/design-refs/wireframes/2026-11-04-projectflow/*-desktop.png` | 1280×800 첫 뷰포트 10장: home-first-run, create-error, setup-invite, setup-task, invite-partial, setup-done, home-resume, board-loading, board-member, permission |
| `docs/design-refs/wireframes/2026-11-04-projectflow/*-mobile.png` | 390×844(@2x) 첫 뷰포트 7장: home-first-run, create-error, setup-invite, setup-task, setup-done, board-member, invite-expired |

캡처: Python Playwright + Chromium(chromium-1234) headless, 화면마다 `scrollWidth - clientWidth = 0`(가로 넘침 없음) 확인.
SVG 대신 HTML/CSS를 쓴 이유: 설정 단계 전환과 역할(owner/member) 차이, 실패→복구 상태를 같은 구조에서 비교해야 해서 SKILL 2-5의 "상태·화면 전환을 확인할 때는 HTML/CSS" 조건에 해당.

## Interface Mode 판정

- 선택: **Agent Workbench (공간 모델만 차용, 정확한 일치 아님)**
- 근거: 플레이북 4절의 "좌측 = 정체성·탐색, 중앙 = 현재 작업, 우측/하단 = 증거·도구" 공간 모델과 "개입이 필요한 상태를 위로"라는 상태 위계가 보드(좌측 내비 → 중앙 3열 → 우측 할 일 상세 패널)와 member의 모바일 과업(상태 확인·짧은 응답·알림에서 복귀)에 맞는다. 효과 예산은 기능형 기본값 **장식 0, 상태 피드백만**.
- 맞지 않는 부분: terminal·editor·browser split, command palette, agent 상태 모델은 이 제품에 없다. 첫 실행 설정(마법사)은 6개 Mode 어느 것에도 해당하지 않는다(Waiting State는 "다른 작업의 완료를 기다리는 화면"이라 불일치). 설정 화면은 Mode 대신 layout-block-anatomy의 Onboarding 블록 계약을 따른다.
- 명시적 배제: **Data Instrument** — KPI strip·지표 카드 홈은 athena가 삭제 권고한 "팀 성과 KPI 대시보드"이며 layout-block-anatomy의 "앱 대시보드" 기본 시퀀스(Stats/KPI → Chart)도 쓰지 않는다. 홈 프로젝트 행의 "할 일 0 · 진행 중 0 · 완료 0"은 지표가 아니라 열 개수 표기다.

## 화면별 블록 순서

### 1. home-first-run — 홈 · 첫 실행 = 설정 1/3 (대표 화면, owner)

| # | 블록 | 답하는 사용자 질문 | anatomy 체크 | 변주 |
|---|---|---|---|---|
| 1 | Sidebar | 나는 어디에 있나 | 팀/내비 5(활성 1: 홈)/하단 사용자 + 보조 "팀원 초대" | 프로젝트 0개면 "아직 없음" |
| 2 | 단계 표시 | 얼마나 걸리나 | 스텝 3, 현재 1개만 강조 | Onboarding 블록의 하단 스텝 도트를 **상단 번호+이름 pill**로 Adapt — 시작 전에 길이를 먼저 알려야 해서 |
| 3 | 제목 + 설명 | 지금 뭘 하나 | 타이틀 / 서브 1줄 | 좌측 정렬, 본문 최대 680px |
| 4 | 이름 입력 + primary | — (바로 행동) | 필드 1 + primary solid 1 | Onboarding "CTA 풀폭"을 데스크톱은 입력 옆 인라인으로 Adapt(한 줄 = 한 행동), 모바일은 하단 고정 풀폭 |
| 5 | 보드 윤곽 미리보기 | 끝나면 뭐가 남나 | 열 3 윤곽, 배경 잉크 | 점선·연회색. 입력보다 뒤 |

```text
+-----------+---------------------------------------------+
| 한결디자인랩 | (1 프로젝트 이름) (2 팀원 초대) (3 첫 할 일)      |
| [홈]      | 첫 프로젝트를 만들어 보세요                       |
|  프로젝트  | 이름만 정하면 보드가 바로 생겨요...               |
|   아직 없음 | 프로젝트 이름                                   |
|  팀원     | [예: 11월 웹사이트 개편          ] [프로젝트 만들기] |
|  팀 설정   | 초대한 팀원 모두에게 보이는 이름이에요.            |
|           | :- 만들면 생기는 보드 ------------------------:  |
| (팀원 초대) | : [할 일]   [진행 중]   [완료]                 :  |
| 김도윤     | :.............................................:  |
+-----------+---------------------------------------------+
```

### 2. setup-invite — 설정 2/3 · 팀원 초대 (입력 오류 상태로 그림)

| # | 블록 | 답하는 질문 | anatomy 체크 |
|---|---|---|---|
| 1 | 단계 표시 (1 완료 ✓, 2 현재) | 어디까지 왔나 | 현재 1개 강조 |
| 2 | 직전 결과 문구 "'11월 웹사이트 개편' 프로젝트를 만들었어요." | 앞 단계가 됐나 | 보조 잉크 1줄 |
| 3 | 제목 + 설명 | 무엇을 하나, 받은 사람은 어떻게 되나 | 타이틀/서브 |
| 4 | 이메일 필드(칩 + 입력) + 오류 + 도움말(팀원 권한) | 누구를, 어떤 권한으로 | 필드 1(다중 입력), 오류는 필드 바로 아래 |
| 5 | 받는 사람에게 가는 메일 미리보기 | 동료에게 이상한 메일이 가지 않나 | 신뢰 근거를 CTA 직전에 |
| 6 | primary "초대 보내기" + 텍스트 "나중에 초대하기" | — | solid 1 + 텍스트 1 |

### 3. setup-task — 설정 3/3 · 첫 할 일 / invite-partial — 일부 발송 실패 상태

| # | 블록 | 답하는 질문 | anatomy 체크 |
|---|---|---|---|
| 1 | 단계 표시 (1·2 완료, 3 현재) | 마지막 단계인가 | 현재 1개 강조 |
| 2 | 직전 결과 (정상: "박지윤님, 이서준님에게 초대 메일을 보냈어요" / 부분 실패: 테두리 알림 + "이서준님에게 다시 보내기") | 초대가 됐나 | 실패여도 다음 단계를 막지 않음 |
| 3 | 제목 + 설명(수락 전 배정 가능 — hypothesis) | 무엇을 정하나 | 타이틀/서브 |
| 4 | 필드 2: 할 일(1.6) · 담당자(1) | — | Onboarding "스텝당 필드 1~2" 준수 |
| 5 | primary "할 일 배정하기" + 텍스트 "건너뛰고 보드 보기" | — | solid 1 + 텍스트 1 |
| 6 | 미리보기: 카드가 '할 일' 열에 들어가는 모습 (정상 상태만) | 배정하면 어디에 보이나 | 배경 잉크 |

### 4. setup-done — 설정 완료 결과 (Object Flows의 After, owner)

| # | 블록 | 답하는 질문 | anatomy 체크 |
|---|---|---|---|
| 1 | Sidebar (활성: 프로젝트 > 11월 웹사이트 개편) | 어디에 있나 | 활성 1 |
| 2 | 보드 헤더: H1 · 참여 1명 · "수락 대기 2명"(팀원 화면 링크) · primary "+ 할 일 추가" | 이 보드는 무엇이고 누가 있나 | solid 1 |
| 3 | 결과 배너 "설정을 마쳤어요" ✓ 프로젝트 만들기 · … 팀원 2명 초대 · 수락 대기 · ✓ 첫 할 일 배정 + 닫기 | 다 됐나 | `role=status` |
| 4 | 3열 (할 일 1 · 진행 중 0 · 완료 0), "방금 배정" 카드 1개만 굵은 테두리 | 첫 할 일이 어디 있나 | Todo/열 반복 3, 강조 이탈 정확히 1(공통 문법 2·7) |

### 5. board-member — 보드 첫 진입 (member)

| # | 블록 | 답하는 질문 | 역할 차이 |
|---|---|---|---|
| 1 | Sidebar(member): 팀 설정·팀원 초대 없음 | 어디에 있나 | 숨김 2 |
| 2 | 안내 배너 "김도윤님이 '11월 웹사이트 개편'에 초대했어요 / 나에게 배정된 할 일 1개가 있어요" | 누가 무엇에 초대했나 | member 전용 |
| 3 | 보드 헤더: H1 · 참여 중 2명 · primary "+ 할 일 추가" | — | "수락 대기 N명" 숨김 |
| 4 | 3열, "나에게 배정됨" 카드 1개 강조 | 내 일은 | owner의 "방금 배정"과 같은 강조 문법 |

### 6. 상태 화면

| 화면 | 블록 순서 | 복구 행동 |
|---|---|---|
| create-error | 1단계 구조 그대로 + 입력값 유지 + 테두리 알림(`role=alert`) | 같은 primary "프로젝트 만들기" |
| invite-partial | 위 3번 참조 | "이서준님에게 다시 보내기" 또는 그대로 진행 |
| home-resume | H1 "홈" → 이어하기 블록(무엇이 남았나 + primary "설정 이어서 하기" + "보드로 가기") → 내 프로젝트 목록 | 멈춘 단계로 |
| board-loading | 보드 헤더(primary 비활성) → "보드를 불러오는 중이에요…" → 3열 skeleton | 내비 이동 |
| permission (member) | H1 "팀 소유자만 볼 수 있는 페이지예요" → 소유자 이름 포함 설명 → primary "보드로 돌아가기" | 보드 |
| invite-expired (member, 로그인 전) | 상단 바(플로우보드) → H1 → 유효 기간·초대한 사람 → primary "김도윤님에게 메일 쓰기" | 새 초대 요청 |

## 첫 화면 주인공

`korean-mobile-app.md` 4절 화면 유형 판정은 NOT APPLICABLE(데스크톱 업무 도구). 그래도 첫 뷰포트에서 가장 큰 면적을 차지할 요소는 다음으로 정했다 — owner 홈: **프로젝트 이름 입력 행**(모바일은 입력란 + 하단 고정 primary), owner 보드: **3열과 "방금 배정" 카드**, member 보드: **안내 배너 + "나에게 배정됨" 카드**. 근거는 Experience Contract `Audience and Tasks`의 "알고 싶은 것".

## 다섯 기준 판단 (스크린샷 관찰 근거)

### 1차 캡처에서 발견해 고친 것

| 관찰 (스크린샷) | 어긴 기준 | 결정 |
|---|---|---|
| home-first-run·setup-invite 데스크톱에 primary("프로젝트 만들기", "초대 보내기")가 두 번 렌더 — 모바일 전용 하단 CTA가 데스크톱에도 보임 | 위계·일관성 | 데스크톱에서 하단 고정 CTA 숨김. 화면당 solid 1개 |
| setup-done 데스크톱 헤더의 "팀원 초대"가 primary보다 32px 아래, 사이드바 "팀원 초대"가 점선 — 미리보기 블록 스타일이 보조 버튼에 번짐 | 일관성 | 미리보기 클래스를 분리. 보조 버튼은 모든 화면에서 같은 실선 outline |
| 모바일 보드 상단 바 제목과 H1이 모두 "11월 웹사이트 개편" | 명료성 | 보드 화면 모바일 상단 바는 팀 이름. 설정 단계 화면만 프로젝트 이름 |
| 보드 한 화면에 "+ 할 일 추가"가 두 곳(열 안 추가 행 + 헤더/하단 고정) | 일관성·위계 | 열 안 추가 행 제거, 헤더(모바일 하단 고정) 1곳 |
| owner 보드에 "팀원 초대"가 사이드바와 헤더 두 곳 | 일관성 | 헤더 버튼 제거, "수락 대기 2명"을 팀원 화면 링크로. 상시 진입점은 사이드바(P2) |
| 1단계 도움말 "나중에 바꿀 수 있어요." — spec에 프로젝트 이름 변경 기능 없음 | 명료성(검증 불가 약속) | "초대한 팀원 모두에게 보이는 이름이에요."로 교체, 이름 변경은 질문으로 남김 |
| 모바일 상단 바가 본문 패딩 안쪽에 들여써짐, 수락 대기 아바타의 점선이 겹침 테두리에 가려짐 | 일관성 | 상단 바 전폭, 수락 대기 = 점선 아바타로 헤더·카드 동일 |

### 최종 캡처 판정

| 기준 | 판정 | 화면에서 관찰한 근거 | 남은 결정 |
|---|---|---|---|
| 위계 (Hierarchy) | 통과 | home-first-run 데스크톱: 가장 진한 잉크는 H1 "첫 프로젝트를 만들어 보세요"와 입력 옆 검은 "프로젝트 만들기" 하나. 보드 윤곽은 점선·연회색으로 물러남. 모바일: H1 → 입력란 → 화면 하단 풀폭 검은 버튼 하나. setup-done: solid는 "+ 할 일 추가" 하나, 보드 안 굵은 테두리는 "방금 배정" 카드 하나 | 결과 배너(1.5px 테두리)와 카드 강조(2px)가 비슷한 무게 — Phase 4에서 배너를 표면 톤으로 낮출지 검토 |
| 구조 (Structure) | 통과 | 설정 화면 순서가 owner의 질문 순서(얼마나 → 뭘 → 입력 → 결과)와 같음. setup-invite는 필드 → 권한 설명 → 메일 미리보기 → "초대 보내기" 순으로 신뢰 근거가 행동 직전에 옴(데스크톱 첫 뷰포트 안 y≈510). 보드는 요약 → 결과 → 열 | — |
| 흐름 (Flow) | 통과(범위 한정) | 단계 pill이 ✓(완료)·검정(현재)·윤곽(남음)으로 1→2→3 진행을 보여 줌. 실패→복구: create-error(입력 유지·같은 버튼), setup-invite(필드 아래 예시 포함 오류), invite-partial(다시 보내기, 다음 단계 열림), home-resume(멈춘 단계 이어하기), permission(보드로), invite-expired(초대한 사람에게 메일). member: 초대 안내 → 내 카드 | 할 일 상세·팀원 화면·로그인·보드 오류·stale·member 배정 0개는 이번에 그리지 않음 → Phase 4 |
| 일관성 (Consistency) | 통과 | 프로젝트 이름·사람 이름·"수락 대기"·열 이름이 모든 화면에서 Scenario Facts와 같은 글자. primary는 모두 검은 solid, 보조는 밑줄 텍스트. 수락 대기는 헤더·카드 모두 점선 아바타. 실패 알림은 create-error·invite-partial 모두 2px 테두리 상자 | — |
| 명료성 (Clarity) | 통과 | 모든 입력에 보이는 레이블. 오류는 무엇을 고칠지 예시와 함께("예: seojun.lee@hangyeol.kr"). member 배너가 "누가·무엇에·내 일 몇 개"를 한 번에 말함. 403 화면이 소유자 이름과 돌아갈 곳을 줌 | 모바일 단계 표시는 현재 단계 이름만 보이고 남은 단계는 번호뿐 — 3개라 수용, 사용성 테스트 대상 |

다섯 기준이 모두 통과해 Phase 3 시각 방향 탐색으로 넘어갈 수 있는 상태다. 단, 이번 실행 범위는 여기까지다.

## 역할 차이 (이 단계에서 그린 것)

- owner: home-first-run·setup-*·setup-done·home-resume·board-loading — 사이드바에 "팀 설정"·"팀원 초대", 보드 헤더에 "수락 대기 N명" 링크.
- member: board-member·permission·invite-expired — 사이드바에 "팀 설정"·"팀원 초대" 없음(숨김), 보드 헤더에 참여 중 인원만, 팀 설정 URL은 403.
- 요소별 표는 Experience Contract `## Role Variants`(초안). 숨김/비활성 판단 근거도 거기에 있다.

## Phase 4로 넘기는 미해결 항목

1. 그리지 않은 화면: `auth-link`(로그인·링크 만료), `task-detail`(우측 패널 / 모바일 전체 화면), `members`(owner 관리·member 읽기전용), `team-settings`, 모바일 메뉴 시트, member 배정 0개, 보드 오류, stale.
2. hypothesis 확인 필요: 1단계 즉시 생성, 수락 전 배정, 초대 링크 7일, 보드 열 이름, 초대가 팀 단위인지 프로젝트 단위인지(사이드바 "팀원 초대"는 프로젝트 0개일 때도 보임).
3. Object Flows 적용 경위: SKILL 2-3은 "여러 화면 모바일 앱이면" `Object Flows`를 요구하고 experience-contract-guide 3절은 "여러 화면 앱"으로 적어 범위가 다르다. 이 제품은 데스크톱 우선이지만 프로젝트·초대·할 일을 만드는 여러 화면 앱이라 가이드 쪽 조건으로 채웠다.
4. 결과 배너와 강조 카드의 무게 조정, 단계 표시의 모바일 라벨.

## Module Coverage (Phase 0~2 범위)

| 모듈 | 해석 경로 | 상태 | 미실행 범위 |
|---|---|---|---|
| frontend-design | `D:\git\claude-code-agent-customizations\skills\frontend-design\SKILL.md` (호출 에이전트가 지정한 경로. SKILL 해석 순서 1번의 프로젝트 `skills/`는 없음) | module — SKILL.md 전체, `references/coder-interface-pattern-playbook.md`, `references/layout-block-anatomy.md` 읽음 | style-recipes·색·폰트 DB는 Phase 3이라 NOT RUN |
| mermaid-diagrams | `D:\git\claude-code-agent-customizations\skills\mermaid-diagrams\SKILL.md` | module — 에디토리얼 규칙 적용, 3블록 Mermaid 11.4.1 렌더 성공 | — |
| ui-ux-auditor | 해석하지 않음 | NOT RUN — Phase 6 범위 | 전체 |
| web-design-guidelines | 해석하지 않음 | NOT RUN — Phase 6 범위 | 전체 |
| design-system-starter · stitch · skill-evolve · autoresearch | — | NOT REQUESTED | — |

## Completion Evidence 중 이번 범위에 해당하는 항목

| 항목 | 상태 |
|---|---|
| brief와 Source Mode | 완료 — product-derived |
| 벤치마크 캡처·Adopt/Adapt/Avoid | NOT APPLICABLE — 벤치마크 없음 |
| Experience Contract | 초안 작성. Phase 4-4 검증 게이트는 이번 범위 밖 (참고용 정적 검사 결과는 아래) |
| 시각 탐색 전 데스크톱·모바일 와이어프레임 + 다섯 기준 판단 | 완료 — 위 파일·표 |
| Product Design Gate | NOT APPLICABLE — Claude 런타임, `--plan-only` |
| 한국어 줄바꿈 실측(wrapcheck) | NOT RUN — Phase 6-4 범위. 와이어프레임은 `word-break: keep-all`만 적용했고 실측하지 않음 |
| korean-mobile-app P0·P1, 시장 관례 | NOT APPLICABLE — 데스크톱 업무 도구 |
| 방향 렌더·DESIGN.md·구현·검증 | NOT RUN — 이번 실행 범위(Phase 2까지) 밖 |

참고용 정적 검사: 2026-11-04 `python D:\git\claude-code-agent-customizations\skills\design-plan\scripts\validate_experience_contract.py`
→ `valid: true`, missing·empty·placeholder 섹션 0, errors·warnings 0. 이것은 제목·형식 완성도 검사일 뿐이며, Phase 4에서
Desktop Structure·Mobile Transformations·Role Variants를 정교화한 뒤 다시 실행해야 4-4 게이트 통과로 본다.
