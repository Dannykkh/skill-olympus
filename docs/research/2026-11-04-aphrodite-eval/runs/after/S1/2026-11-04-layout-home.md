# Layout Blueprint — 플로우보드 홈(첫 실행)

- 날짜: 2026-11-04 · 단계: Phase 2-4 Interface Mode + 2-5 저충실도 와이어프레임 판단 게이트
- 관련: [brief](2026-11-04-brief-home.md) · [experience](2026-11-04-experience-home.md) · [sitemap](2026-11-04-sitemap-home.md) · [PRODUCT 초안](2026-11-04-product-draft-home.md)
- 와이어프레임(최종본, 색·사진·그림자 없음):
  - 데스크톱 1280×800: [2026-11-04-wireframe-home-desktop.svg](2026-11-04-wireframe-home-desktop.svg) · 캡처 [png](2026-11-04-wireframe-home-desktop.png)
  - 모바일 390×844: [2026-11-04-wireframe-home-mobile.svg](2026-11-04-wireframe-home-mobile.svg) · 캡처 [png](2026-11-04-wireframe-home-mobile.png)
  - 상태 시트(모바일 폭 360, (a) loading · (b) error · (c) success · (d) member · (e) 시작하기 완료 뒤 잠정): [2026-11-04-wireframe-home-states.svg](2026-11-04-wireframe-home-states.svg) · 캡처 [png](2026-11-04-wireframe-home-states.png)
- 캡처 조건: Chrome headless(`--headless=new`), SVG를 로컬 HTTP로 열어 뷰포트 크기 그대로 캡처. Pretendard가 설치돼 있지 않아 Malgun Gothic으로 렌더됨 — 글꼴은 Phase 3 몫이라 구조 판단에는 영향 없음.

## 1. Interface Mode (2-4)

| 항목 | 결정 | 근거 |
|---|---|---|
| Mode | **Data Instrument (최근접) + anatomy `Dashboard` 첫 실행 변형** | anatomy 시퀀스 표 "앱 대시보드 \| … \| coder-interface playbook의 Data Instrument 계약 우선. 데이터 0건·신규 사용자면 Dashboard 첫 실행 변형". SKILL 2-4 "데이터가 0건인 첫 실행 화면은 가장 가까운 Mode를 고르되 첫 뷰포트의 주인공은 첫 행동" |
| 쓰지 않는 Data Instrument 요소 | Compact KPI strip | playbook IA의 KPI strip은 상류 제외(팀 성과 KPI 대시보드)와 anatomy "0으로 채운 KPI·빈 차트 금지"에 걸림. scope 결정 대기 |
| 데이터 상태에서 쓰는 요소 | Primary action → anomalies(마감이 가까운 할 일) → 비교 표(내 할 일) | 사람의 데이터로 같은 자리를 채움(anatomy 첫 실행 변형 마지막 문장) |
| 첫 뷰포트 주인공 | 다음 한 단계 카드("첫 프로젝트를 만드세요") | 팀 리더의 "알고 싶은 것" 1번 "지금 뭘 하면 되지?" |

기능형 프롬프트 컴파일러(playbook 7절):

```text
INTERFACE MODE
- Data Instrument (첫 실행 변형: KPI strip 없음)

PRIMARY ACTION
- "프로젝트 만들기" 1개 (단계에 따라 같은 자리에서 "팀원 초대하기" → "첫 할 일 배정하기"로 교체)

INFORMATION ARCHITECTURE
- 계속 남아야 하는 문맥: 팀 이름, 지금 할 단계(n/3), 남은 단계
- 비교해야 하는 필드: (데이터 상태) 할 일 · 프로젝트 · 마감 · 상태
- 상세로 숨겨도 되는 필드: 할 일 설명·댓글(→ task-detail), 초대 주소 목록(→ members)

DENSITY
- medium (DESIGN.md "밀도는 중간"). 패널 2줄 × 2열(2/3:1/3), 기본 노출 = 단계 3 + 구역 3

STATE MODEL
- loading / empty(팀 리더·팀원) / error(로드·초대) / success(단계·시작하기 완료) / permission(member) / stale(초대 대기)

EFFECT BUDGET
- 장식 효과 0
- 상태 모션 1 (단계 완료 확인 문구 등장)
- 가장 무거운 구현 단계 A (CSS transition만)
```

## 2. 블록 시퀀스와 판단 근거 (anatomy `Dashboard` 첫 실행 변형)

anatomy 기본 시퀀스 "Sidebar + (타이틀 → Stats/KPI → Chart+리스트 → Data Table)"에서 KPI·Chart를 빼고 첫 실행 변형 "페이지 타이틀 → 다음 한 단계(primary 1개) + 남은 단계 진행 → 앞으로 채워질 구역의 빈 상태 칸"을 따른다.

| # | 블록 | anatomy 체크 | 판단 근거 |
|---|---|---|---|
| 0 | Sidebar | 로고/팀 → 내비 4(활성 1) → 하단 사용자 | 내비 5~7개 기본값보다 적음. 채우려고 항목을 늘리지 않음 |
| 1 | 페이지 타이틀 | 제목 "한빛 마케팅팀 시작하기" + 약속 1줄 | 현재 Home.tsx의 "홈"은 위치만 알리고 할 일을 말하지 않음. 위치는 사이드바가 이미 알림 |
| 2 | 다음 한 단계 카드 (2/3) | eyebrow "지금 할 단계 · 1/3" → 헤딩 → 설명 1줄 → primary solid 1 → 만들면 열리는 보드 모양 | 블록 강조 정확히 1개. 헤딩 28px가 페이지에서 가장 큼. 보드 모양은 "만들면 무엇이 생기나"의 증거 |
| 3 | 시작하기 3단계 (1/3) | 순서 목록 3행, 현재 1개만 채운 원, 2단계에 outline 1개 | 2/3:1/3 비율(공통 문법 4). CTA 문법: solid 1 + outline 1 |
| 4 | 채워질 구역: 내 할 일 (2/3) | 제목 → 열 머리(할 일·프로젝트·마감·상태) → 안내 1줄, 점선 | 히어로의 2/3:1/3을 다시 씀(공통 문법 7). 세 칸 중 이 칸만 크게 이탈 — 매일 쓰는 구역이고 member의 주인공 |
| 5 | 채워질 구역: 프로젝트 · 팀원 (1/3 세로) | 제목 → 안내 1줄, 점선. 팀원 칸에는 이미 있는 "박지수 · 팀 소유자" | 반복 칸 내부 구조 동일(공통 문법 5). 실제로 있는 데이터(나)는 바로 보여 줌 |

```text
+--------+-------------------------------------------------------------+
| 로고   | 한빛 마케팅팀 시작하기                                       |
| 팀 ▼   | 세 단계를 마치면 …                                          |
| [홈]   | +--------------------------------+ +----------------------+ |
| 프로젝트| | 지금 할 단계 · 1/3             | | 시작하기 3단계       | |
| 팀원   | | 첫 프로젝트를 만드세요  (H 28) | | ● 1 프로젝트 만들기  | |
| 설정   | | [프로젝트 만들기]              | | ○ 2 팀원 초대 (먼저) | |
|        | | 할 일 | 진행 중 | 완료 (점선)  | | ○ 3 첫 할 일 배정    | |
|        | +--------------------------------+ +----------------------+ |
|        | 데이터가 생기면 채워지는 구역                                 |
|        | +- - - - - - - - - - - - - - - - + +- - - - - - - - - - -+ |
|        | | 내 할 일 (열 머리 + 안내)      | | 프로젝트             | |
|        | |                                | +- - - - - - - - - - -+ |
| 박지수 | |                                | | 팀원 · 박지수        | |
+--------+-------------------------------------------------------------+
```
(ASCII는 빠른 초안 기록이며 최종 와이어프레임은 위 SVG다.)

## 3. 역할별 화면 (공용 권한차등)

spec 시스템 역할 표의 `화면` 열이 owner·member 모두 "공용 권한차등"이라 같은 블록 순서 위에서 노출만 바꾼다. `operation-scenarios.md`가 없어 spec `금지 행동`을 옮겼고, 금지 행동에 없는 칸은 권장안으로 두고 experience `Open Decisions`(structure)에 올렸다.

| 요소 | owner | member |
|---|---|---|
| 다음 한 단계 카드("프로젝트 만들기") | 표시 | 숨김 (Open Decisions) |
| 시작하기 3단계 패널 | 표시 | 숨김 |
| 먼저 초대하기 | 표시 | 숨김 (Open Decisions) |
| 내 할 일 구역 | 표시 | 표시 — 첫 뷰포트 주인공 자리로 reorder |
| 프로젝트 구역 | 표시 | 표시 |
| 팀원 구역(목록) | 표시 | 표시 |
| 내비 "설정"(팀 설정) | 표시 | 숨김 — spec 금지 행동 "팀 설정 변경" |
| members 화면 "내보내기" | 표시 | 숨김 — spec 금지 행동 "팀원 내보내기" |

역할을 지운 결과 member 홈은 primary가 사라지므로, 빈 상태 문구 "아직 배정된 할 일이 없어요"와 primary "11월 신제품 런칭 보드 보기"를 둔다 → states SVG (d).

## 4. 화면 유형과 첫 화면 주인공

- korean-mobile-app.md 4절 화면 유형: **NOT APPLICABLE** — 한국 사용자 대상 모바일 앱이 아니라 데스크톱 우선 웹 SPA.
- 그래도 첫 화면 주인공은 정한다: 팀 리더 = 다음 한 단계 카드(데스크톱·모바일 모두 첫 뷰포트에서 가장 큰 헤딩과 유일한 solid 버튼). member = 내 할 일 카드. 근거는 각 사람 카드의 "알고 싶은 것" 1번.

## 5. 다섯 기준 판단 (최종 캡처 관찰 기준)

| 기준 | 관찰한 근거 | 수정한 결정 | 판정 |
|---|---|---|---|
| 위계 | 1차 캡처에서 페이지 타이틀(28px)이 카드 헤딩(26px)보다 커서 눈이 타이틀에 먼저 감. 수정 뒤 데스크톱·모바일 모두 "첫 프로젝트를 만드세요"와 검은 solid 버튼이 가장 먼저 읽힘. 색 없이 잉크 농도와 테두리 두께만으로 구분됨 | 타이틀 22px·카드 헤딩 28px(모바일 18/24)로 뒤집음 | 통과 |
| 구조 | 읽는 순서가 타이틀 → 지금 할 단계 → 남은 단계 → 앞으로 채워질 구역으로, 팀 리더의 질문 순서(뭘 하지 → 얼마나 남았지 → 팀원은 → 들어왔나)와 같음. 모바일도 같은 순서 | 모바일에서 3단계 패널을 카드 아래로 reorder | 통과 |
| 흐름 | states 시트에서 (c) 1단계 완료 → 같은 자리가 2/3 "팀원 초대하기"로 바뀌고 프로젝트 칸이 실선·실제 값으로 채워짐, (e) 시작하기 완료 뒤 데이터 상태까지 따라감. 실패 → (b) "다시 시도". member 진입 → (d)에서 갈 곳(보드 보기)이 있음. 초대 실패 회복은 invite-dialog 몫으로 sitemap 4절에 분기만 둠 | 홈 상단 확인 문구 1줄을 단계 완료 피드백으로 고정 | 통과(초대 실패 화면은 invite-dialog 설계 때 확인) |
| 일관성 | 1차 캡처에서 (1) 빈 구역의 회색 막대가 loading 스켈레톤과 같은 모양, (2) 보드 미리보기 열이 회색 채운 둥근 상자라 버튼처럼 보임, (3) 단계 상태 이름이 행마다 다른 말(먼저 해도 돼요/프로젝트를 만든 뒤), (4) 모바일 단계 묶음 제목이 첫 실행 "남은 단계", 1단계 완료 뒤 "제목 없음"으로 달랐음 | 회색 막대는 loading 전용으로 하고 빈 구역은 열 머리 + 안내 1줄만 / 보드 미리보기를 흰 바탕 점선 + 작은 열 머리로 / 모든 단계 행에 상태 이름(지금 할 단계·완료·남은 단계)을 같은 자리에 / 모바일 묶음 제목을 데스크톱과 같은 "시작하기 3단계"로 통일 | 통과 |
| 명료성 | 라벨·상태·다음 행동이 글자로 보임: "지금 할 단계 · 1/3", "남은 단계", "프로젝트를 만든 뒤 할 수 있어요", 빈 칸마다 "무엇이 여기에 채워지나". 1차 캡처의 내 할 일 "담당" 열은 항상 나라서 의미가 없었음. error 문구가 모바일에서 "사이드 메뉴"를 가리켰음 | "담당" 열 삭제 / error 문구를 "다른 화면은 메뉴에서 그대로 쓸 수 있어요."로 | 통과 |

시각 시안에서 처음 생긴 주 행동은 없다(Phase 3 미실행). Phase 3 후보가 primary·블록 순서를 바꾸면 이 게이트를 다시 실행한다.

## 6. 반복 기록

| 회차 | 본 것 | 고친 것 |
|---|---|---|
| 1 | 데스크톱 1차 캡처 | 타이틀·헤딩 위계 뒤집기, 보드 미리보기 점선화, 단계 상태 이름 통일, 빈 구역 회색 막대 제거, 담당 열 삭제 |
| 1 | 모바일 1차 캡처 | 단계 행의 상태 이름 중복을 줄였다가 → 2회차에서 데스크톱과 일관성을 위해 되돌림 |
| 2 | 상태 시트 1차 캡처 | error 문구의 "사이드 메뉴" 수정, (c)에 "시작하기 3단계" 제목 추가, 모바일 첫 실행 묶음 제목 통일 |
| 3 | 데스크톱·모바일·상태 시트 최종 캡처 | 추가 수정 없음 — 다섯 기준 통과 |

## 7. Phase 0~2 실행 기록 (Completion Evidence 중 이번 범위 해당분)

- 계층 판정·Source Mode: brief 첫 줄 `strategy`, product-derived.
- PRODUCT.md: 루트에 쓰지 못해 [초안](2026-11-04-product-draft-home.md)을 만들고 `validate_experience_contract.py --product`로 검증 → **통과**(scope 미결 1건 보고).
- Experience Contract 검증(4-4 선행 점검, `python -B`): **실패 — 예상된 실패**. 오류는 scope 미결 1건("대시보드답게 채워줘"를 KPI 대시보드 복구로 볼지)뿐이고 structure 경고 6건. 절·표·Object Flows·Role Variants 형식 오류 없음. 사용자 결정 전에는 구현으로 넘어가지 않는다.
- 와이어프레임: 데스크톱·모바일·상태 SVG + 캡처 PNG(위 링크), 다섯 기준 판단 5절.
- 사이트맵 Mermaid 문법 렌더 검증: **NOT RUN** — mmdc 없음.
- 한글 줄바꿈 실측(`wrapcheck.mjs`): **NOT RUN** — Phase 6 단계이며 이번 범위 밖. 와이어프레임 문구는 SVG 고정 좌표라 줄바꿈 판단 대상 아님.
- 시장 관례: **NOT APPLICABLE** — 한국 모바일 앱 아님.
- `Object Flows`: 3개 대상 작성, 사실 대조(6-3)는 구현 뒤라 **NOT RUN**.
- Product Design Gate: **NOT APPLICABLE** — `--plan-only` 경로이며 런타임이 Codex가 아님(0-0).
- Web Motion Contract: 해당 없음 — 대표 모션 없음(상태 모션 1개만).
- Phase 3~7: **NOT RUN** — 호출자 지시로 Phase 2에서 멈춤(`--plan-only`의 정의는 Phase 0~4).
- Module Coverage:

| 모듈 | 해석 경로 | 상태 | 읽은 범위 |
|---|---|---|---|
| frontend-design | `D:\git\claude-code-agent-customizations\skills\frontend-design\SKILL.md` (호출자 지정 경로, frontmatter `name: frontend-design` 확인) | module | `references/coder-interface-pattern-playbook.md` 1·2·7절, `references/layout-block-anatomy.md` 공통 문법·App 블록·시퀀스 템플릿. 2-4·2-5 규칙에 따라 SKILL.md 본문은 열지 않음 |
| mermaid-diagrams | `D:\git\claude-code-agent-customizations\skills\mermaid-diagrams\SKILL.md` (frontmatter 일치) | module | SKILL.md 전체. 렌더 검증 NOT RUN |
| ui-ux-auditor | 미해석 | NOT RUN | Phase 6 — 범위 밖 |
| web-design-guidelines | 미해석 | NOT RUN | Phase 6 — 범위 밖 |
| design-system-starter · stitch · skill-evolve · autoresearch | 미해석 | NOT REQUESTED | - |

- 해석 순서 메모: SKILL.md 계약의 1번(프로젝트 루트 `skills/<name>`)은 projectflow에 없음. 2번(활성 루트 `~/.claude/skills`) 대신 호출자가 지정한 원본 경로를 썼다.
