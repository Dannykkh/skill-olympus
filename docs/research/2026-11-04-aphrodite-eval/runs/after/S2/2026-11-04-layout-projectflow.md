# Layout Blueprint — 플로우보드 첫 실행 경험 (Phase 2-5 저충실도 와이어프레임 게이트)

- 작성: 2026-11-04 · 계층 판정 strategy · Source Mode product-derived
- 계약: [experience](2026-11-04-experience-projectflow.md) · [sitemap](2026-11-04-sitemap-projectflow.md) · [brief](2026-11-04-brief-projectflow.md)
- 읽은 절: `MODULE_ROOT[frontend-design]` = `D:\git\claude-code-agent-customizations\skills\frontend-design` — `references/layout-block-anatomy.md`의 `공통 문법`, `App 블록`(Dashboard·Sidebar·Onboarding·Todo List), `페이지 유형 → 블록 시퀀스 템플릿`; `references/coder-interface-pattern-playbook.md`의 `1. 페이지 유형 게이트`, `4. Agent Workbench`, `7. 기능형 프롬프트 컴파일러`
- 게이트 결과: **통과(1회 수정 후)** — 아래 6절. Phase 3 시각 방향 탐색은 이 실행 범위 밖이라 하지 않았다.

## 1. Interface Mode와 첫 뷰포트 주인공

| 화면 | Mode / anatomy | 첫 뷰포트 주인공 | 고른 이유 |
|---|---|---|---|
| home-empty | Dashboard **첫 실행 변형**(데이터 0건) — Data Instrument 아님 | 시작 단계 블록 안의 "첫 프로젝트 만들기" | 핵심 사람(팀 리더)은 현황을 확인하는 사람이 아니라 첫 프로젝트를 만들어야 하는 신규 사용자(anatomy Dashboard "이 구조가 아닐 때"). KPI 대시보드는 상류 제외(athena 삭제 권고 — 활성 팀 100개 이후). 사람 카드 질문 ① "지금 뭘 먼저?"의 답 |
| board · project-created · board-joined | Agent Workbench를 업무 보드에 맞게 줄임(좌 사이드바 = 정체성·탐색, 중앙 = 현재 작업, 우측 = 할 일 상세 패널) | owner: 완료 줄의 "담당자 정하기" / member: "내게 맡겨진 할 일" 블록 | 화면을 카드 모음이 아니라 지속되는 작업 공간으로 봄(playbook 4절). terminal·agent·command palette는 해당 없어 뺌 |
| project-wizard-1~3 | anatomy Onboarding(중앙 단일 카드, 필드 1~2, CTA 풀폭, 현재 스텝 1개 강조) | 단계 질문 + 입력 1개 | 첫 프로젝트까지 입력 1개 |
| invite-accept | 인증 계열 단독 카드(로고만) | 초대한 사람·프로젝트 문장 + "참여하고 보드 열기" | 팀원 질문 ① "누가 어디로 불렀지?" |

- 기능형 5종 중 정확히 맞는 Mode가 없다(만들기가 첫 행동인 온보딩 + 팀 할 일 보드). Data Instrument를 고르면 페이지 유형 템플릿 "앱 대시보드 → Stats/KPI → Chart"로 이어져 상류 제외를 어기므로 배제했다.
- korean-mobile-app.md 4절 화면 유형: `NOT APPLICABLE` — 데스크톱 우선 웹 SPA(모바일 앱·모바일 우선 웹앱 아님). 그래도 2-4 규칙에 따라 각 화면의 첫 뷰포트 주인공은 위 표에 적었다.
- 효과 예산(playbook 7절): 장식 0 · 상태 모션 3(패널 열기·토스트·카드 이동) · 최대 단계 A. DENSITY medium.

## 2. 와이어프레임 파일

| 파일 | 내용 |
|---|---|
| [wireframes/2026-11-04-wireframe-projectflow.html](wireframes/2026-11-04-wireframe-projectflow.html) | 반응형 HTML/CSS 와이어프레임 원본. `?s=<id>`로 화면 하나를 연다(id: home-empty, wizard-1, wizard-3, project-created, assign, invite-accept, board-joined) |
| `wireframes/2026-11-04-wf-<id>-desktop.png` × 7 | 1280×800 뷰포트 캡처 |
| `wireframes/2026-11-04-wf-<id>-mobile.png` × 7 | 390×844 뷰포트 캡처 |

- 캡처: `@playwright/test`(전역 설치) + 설치된 Chrome 채널, viewport 고정, deviceScaleFactor 1. 14장 모두 가로 넘침 `scrollWidth - innerWidth = 0`.
- 첫 시도(Chrome `--headless=new --window-size=390,844`)는 실제 레이아웃 폭이 390보다 넓게 잡혀 화면 오른쪽이 잘렸다 → 버리고 위 방식으로 다시 찍었다.
- 표현 규칙: 잉크 3단계 그레이스케일, 단색 도형, 실제 문구는 Experience Contract `Scenario Facts`만 인용. 브랜드 색·사진·그림자·모션 없음. 그래서 `DESIGN.md` 토큰(색·라운드·글자 크기)과 일부러 다르다 — 편집 훅이 보고한 토큰 불일치 13건(글자 크기 8, 라운드 4, 색 1)은 이 단계에서 의도한 것이며 Phase 3-2에서 토큰으로 바꾼다.
- 그리지 않은 화면(블록 순서만 아래 표로 고정, Phase 4에서 그림): project-wizard-2, home(데이터 있음), members, invite-sheet, task-detail, invite-expired, forbidden.

## 3. 화면별 블록 시퀀스

### home-empty (owner, 프로젝트 0개) — 대표 화면

| # | 블록 | anatomy 체크 | 판단 근거 |
|---|---|---|---|
| 1 | Sidebar | 팀 이름 / 홈(활성 1) · 팀원 / 프로젝트 "아직 없음" + "+ 새 프로젝트" / 하단 고정 "팀원 초대"(outline) · 팀 설정 · 사용자 | P2: 초대가 설정 깊숙이 → 사이드바 하단에 상시 |
| 2 | 페이지 타이틀 | 인사 + 첫 행동 제안 h1, 설명 1줄 | "지금 뭘 먼저?"에 답 |
| 3 | 시작 단계(다음 한 단계 + 남은 단계) | 블록 강조 1(2px 테두리) / 현재 스텝 1개 강조 / primary 1 "첫 프로젝트 만들기" / 남은 2·3단계 흐림 / "0/3 완료" | anatomy 첫 실행 변형 그대로 |
| 4 | 빈 상태 칸 2개 | "내게 맡겨진 할 일"(2/3) · "프로젝트"(1/3), 점선 상자 + 문장 | 0값 KPI·빈 차트 대신 앞으로 채워질 자리를 문장으로. 2:1 비대칭 |

```
+------------+---------------------------------------------------+
| 온결 스튜디오 | 김서연님, 첫 프로젝트부터 만들어 볼까요?                 |
| [홈]        | 이름 하나면 할 일 보드가 생겨요. …                     |
| 팀원      1 | +===============================================+ |
|            | | 시작 단계                              0/3 완료 | |
| 프로젝트    | | (1) 프로젝트 만들기          [첫 프로젝트 만들기] | |
| 아직 없음   | | (2) 팀원 초대  (흐림)                           | |
| + 새 프로젝트 | | (3) 할 일 맡기기 (흐림)                         | |
|            | +===============================================+ |
|            | 내게 맡겨진 할 일              프로젝트              |
| (팀원 초대)  | [ ……점선: 만들면 여기에 …… ]   [ 아직 없어요 ]       |
| 팀 설정     |                                                   |
| 김서연·소유자 |                                                   |
+------------+---------------------------------------------------+
```

데이터가 생긴 뒤 `home`: 3번 자리를 "내게 맡겨진 할 일"(마감 가까운 순, 3~6행)이 채우고 4번은 프로젝트 목록. 시작 단계는 3/3에서 사라진다. KPI 행 없음.

### project-wizard-1 / 2 / 3 (집중 화면)

| # | 블록 | anatomy 체크 | 판단 근거 |
|---|---|---|---|
| 1 | 상단 바 | "프로젝트 만들기" + "나가기" | 사이드바 없는 집중 화면 |
| 2 | 스테퍼 | 3칸, 현재 1개 강조, 끝난 칸 ✓ (모바일은 "1/3 · 다음: …" 한 줄) | 남은 양이 보여야 불안이 줄어듦 |
| 3 | 질문 h1 + 필드 | wizard-1: 프로젝트 이름 1칸 / wizard-2: 첫 할 일 3칸(빈 칸 허용) / wizard-3: 이메일 칩 입력 1칸 + 발송 주체 안내 | 한 스텝 필드 4개+ 금지 |
| 4 | CTA | primary 풀폭 1 + 보조 텍스트 링크 0~1("건너뛰기"·"나중에 초대하기"), 저장 시점 안내 | 모바일은 하단 고정 |

```
 프로젝트 만들기                                   나가기
        +--------------------------------------+
        | ━━━━━ 1 프로젝트 이름  ───── 2  ───── 3 |
        | 어떤 프로젝트를 시작하나요?             |
        | 프로젝트 이름                           |
        | [ 11월 뉴스레터 발행               ]    |
        | 팀원에게 보이는 이름이에요. …           |
        | [        다음: 첫 할 일 적기         ]  |
        | 다음을 누르면 프로젝트가 저장돼요. …     |
        +--------------------------------------+
```

### project-created · assign (owner, 보드의 완료 모습)

| # | 블록 | anatomy 체크 | 판단 근거 |
|---|---|---|---|
| 1 | Sidebar | 프로젝트 "11월 뉴스레터 발행" 활성 1 | 현재 위치 |
| 2 | 보드 헤더 | h1 프로젝트 이름 / 팀원 아바타(초대 대기는 점선·이메일 이니셜) + "팀원 3명 · 초대 대기 2명" / ⋯ 프로젝트 설정 | 질문 ③ "초대한 사람이 들어왔나?" |
| 3 | 완료 줄(After) | 블록 강조 1 / "✓ 첫 보드를 만들었어요" / 할 일 3개 · 초대 2명 보냄 · 2/3 / primary "담당자 정하기" | 결과 화면 + 마지막 단계 하나 |
| 4 | 보드 3열 | 할 일 3 · 진행 중 0 · 완료 0 / 카드 내부 구조 동일(제목 → 담당자 칸 → 마감) / 빈 열 문장 / 열 끝 "+ 할 일 추가" | Todo List·반복 요소 규칙 |
| 5 | 담당자 팝오버(assign) | 첫 카드 담당자 칸 포커스 / 김서연(나) · minji@ongyeol.kr 초대 대기 · doyun@ongyeol.kr 초대 대기 / 선택 1 강조 / 안내 1줄 | 모바일은 바텀 시트 |

```
+------------+---------------------------------------------------+
| …          | 11월 뉴스레터 발행           (김)(m)(d) 팀원 3명·초대 대기 2명 ⋯ |
| [11월 뉴스…] | +===============================================+ |
|            | | ✓ 첫 보드를 만들었어요            [담당자 정하기] | |
|            | | 할 일 3개 · 초대 2명 보냄 · 시작 단계 2/3       | |
|            | +===============================================+ |
|            | 할 일 3        | 진행 중 0       | 완료 0          |
|            | [원고 초안 쓰기 ]| 진행 중인 할 일이 | 완료한 할 일이    |
|            | [(?) 담당자 없음]| 없어요          | 여기에 모여요     |
|            | [마감 11/6(금)  ]|                 |                 |
|            | [표지 이미지 …  ]|                 |                 |
|            | [발송 명단 정리 ]|                 |                 |
|            | + 할 일 추가     |                 |                 |
+------------+---------------------------------------------------+
```

### invite-accept (초대받은 사람, 휴대폰 우선)

| # | 블록 | anatomy 체크 | 판단 근거 |
|---|---|---|---|
| 1 | 워드마크 "플로우보드" | 로고만 | 인증 계열 |
| 2 | 초대 문장 | 팀 이름(보조) → "김서연님이 ‘11월 뉴스레터 발행’에 초대했어요"(h1) | 질문 ① |
| 3 | 사실 목록 | 받은 주소 · 맡겨진 할 일(마감) | 링크 신뢰 + 동기 |
| 4 | 내 이름 필드 | 1칸 "박민지" + "팀원들에게 이 이름으로 보여요" | 1회차 수정에서 추가(6절) |
| 5 | CTA + 안내 | primary 풀폭 "참여하고 보드 열기"(모바일 하단 고정) / "비밀번호 없이 … 내 주소가 아니면 무시" | 불안 ④ 직전 근거 |

### board-joined (member, 참여 직후)

| # | 블록 | anatomy 체크 | 판단 근거 |
|---|---|---|---|
| 1 | Sidebar(member 변형) | 팀 설정 숨김 / 팀원 초대·새 프로젝트 표시(AI 권장) / "박민지 · 팀원" | Role Variants |
| 2 | 참여 알림 | "온결 스튜디오에 참여했어요. 김서연님이 할 일 1개를 맡겼어요." + 닫기 | 초대 수락의 After |
| 3 | 보드 헤더 | h1 / "팀원 3명 · 초대 대기 1명" / ⋯ 없음(프로젝트 설정 숨김) | Role Variants |
| 4 | 내게 맡겨진 할 일 | 블록 강조 1 / 제목 크게 → 마감 · 맡긴 사람 / primary "진행 중으로 옮기기" + 텍스트 링크 "할 일 열기" | 질문 ②③, 성공한 순간 |
| 5 | 보드 3열 | 내 카드에 "나" 표시 | 팀 전체 맥락 |

## 4. 역할 처리 (spec `화면` 열: owner·member 모두 `공용 권한차등`)

같은 블록 순서 위에 역할별 노출을 둔다. 변형표 정본은 Experience Contract `## Role Variants`. 이 단계에서 그린 것: owner(home-empty, project-created, assign), member(board-joined — 팀 설정·⋯ 숨김, 시작 단계 대신 내게 맡겨진 할 일). 역할을 지웠을 때 비는 곳(member 홈에서 시작 단계가 사라짐)은 "내게 맡겨진 할 일"과 맡은 일 0개 문안으로 채웠다.

## 5. 반응형 변환(와이어프레임에서 확인한 것만)

사이드바 → 상단 바 + 하단 탭 3개(replace) / 사이드바 "팀원 초대" → 상단 바 "초대"(replace) / 시작 단계 버튼 풀폭(retain) / 빈 상태 칸 → 한 줄 행(compress) / 마법사·초대 수락 CTA 하단 고정(sticky) / 보드 3열 → 상태 세그먼트 탭(replace) / 팝오버 → 바텀 시트(replace) / 보드 헤더 h1 → 상단 바 제목(replace). 전체 표는 Experience Contract `## Mobile Transformations`.

## 6. 다섯 기준 판단 — 관찰 근거와 수정 결정

캡처 14장을 직접 보고 판단했다. 1회차에서 걸린 것을 고친 뒤 같은 조건으로 다시 찍었다.

| 기준 | 화면에서 관찰한 근거 | 결정 |
|---|---|---|
| 위계 | home-empty 데스크톱·모바일 모두 솔리드 버튼은 "첫 프로젝트 만들기" 하나이고, 2px 테두리 블록 하나가 시선을 받는다. 2·3단계는 흐린 잉크라 색 없이도 "지금은 1단계"가 읽힌다. project-created는 완료 줄의 "담당자 정하기", board-joined는 "진행 중으로 옮기기"가 유일한 솔리드. 사이드바 "팀원 초대"는 outline이라 경쟁하지 않는다 | 유지 |
| 구조 | 홈은 타이틀 → 시작 단계 → 빈 상태 칸 순서로 팀 리더 질문 순서(뭘 먼저 → 얼마나 남았나 → 나중에 뭐가 생기나)와 맞다. 보드는 헤더(누가 들어왔나) → 완료 줄(다음 할 일) → 3열. KPI·차트 블록 0개 | 유지 |
| 흐름 | 진입→행동→완료: home-empty → wizard-1(저장 안내) → wizard-3 → project-created(✓ 결과 + 2/3) → assign → task-assigned(3/3)를 화면 사이에서 따라갈 수 있다. 실패→복구: wizard-3의 틀린 칩과 오류 문장, 저장 실패·발송 실패·링크 만료는 States 표. **1회차 문제**: project-created·assign에서 아직 수락하지 않은 사람을 "박민지·이도윤" 이름으로 보여 줬는데, wizard-3에서 받은 것은 이메일뿐이라 시스템이 알 수 없는 사실이었다 | 수락 전에는 이메일·이니셜로 표시, invite-accept에 "내 이름" 1칸 추가, Scenario Facts·States·Trust·Open Decisions 역반영 |
| 일관성 | 카드 내부 구조(제목 → 담당자 칸 → 마감)가 owner·member 보드에서 같다. "초대 대기" 라벨이 wizard-3 안내·헤더·팝오버에서 같은 이름. 담당자 없음은 점선 칸, 정해진 담당자는 실선 칸으로 같은 의미를 같은 모양으로 그렸다. 1회차에서 헤더 요약이 owner "초대 대기 2명" / member "팀원 3명 · 초대 대기 1명"으로 달랐다 | owner 헤더도 "팀원 3명 · 초대 대기 2명"으로 통일 |
| 명료성 | 라벨·상태·다음 행동이 문장으로 있다("다음을 누르면 프로젝트가 저장돼요", "참여하면 이름으로 바뀌고 맡은 할 일이 바로 보여요"). **1회차 문제**: 마법사 카드가 데스크톱에서 화면 끝까지 늘어나 빈 흰 면이 생김 / 모바일 wizard-3 오류 문장에서 "예:"와 예시 주소가 줄바꿈으로 갈라짐 / 모바일 board-joined 알림의 "닫기"가 본문과 붙어 읽힘 / 화면 표시 태그(와이어프레임 주석)가 모바일 CTA를 가림. 2회차: 태그를 상단으로 옮기자 home-empty 모바일 h1 끝과 겹침 | 카드 높이를 내용에 맞춤, 예시 주소 묶음 줄바꿈 금지, 닫기를 ×(aria-label 닫기)로, 폰 폭에서는 태그 숨김(파일 이름이 화면 id) → 재캡처 후 수정이 들어간 프레임을 다시 열어 해소 확인(데스크톱 wizard-1·wizard-3·invite-accept·assign·board-joined, 모바일 7장 전부. 데스크톱 project-created는 같은 헤더·보드를 쓰는 assign으로 확인) |

### 시각 시안 전에 남은 구조 결정 (Experience Contract `## Open Decisions`, 전부 structure·skeleton)

member 권한(새 프로젝트·초대·담당자 바꾸기), 수락 전 맡기기 허용, 프로젝트 저장 시점, 팀 이름을 정하는 시점, 팀원 표시 이름을 정하는 곳, 보드 실시간 반영, 보드 형태(칸반 3열). 권장안으로 그렸고, 사용자가 반대로 정하면 해당 블록(사이드바 member 변형, 팝오버, 마법사 1단계 안내, invite-accept 이름 칸)만 다시 판단한다.

## 7. 이 실행의 완료 증거 (Phase 0~2-5, 2026-11-04)

| 항목 | 결과 |
|---|---|
| 계층 판정·Source Mode | strategy · product-derived (brief 첫 줄) |
| 상류 제외 충돌 | 없음 — 요청이 KPI 대시보드·시간 추적·리포트 내보내기를 요구하지 않음. 홈에 KPI 0개 |
| PRODUCT.md | 루트 대신 `2026-11-04-product-projectflow.md`(쓰기 범위 제한). `validate_experience_contract.py <파일> --product` → valid, 열린 결정 1건(scope, 비차단: 리포트 내보내기·Slack 복구 조건) |
| Experience Contract | `validate_experience_contract.py 2026-11-04-experience-projectflow.md` → valid, errors 0, 경고 7건(structure 6 + skeleton 1 미결) |
| 와이어프레임 | HTML 1 + PNG 14(1280×800·390×844), 다섯 기준 판단 위 6절, 1회 수정 후 통과 |
| 사이트맵 Mermaid | 작성. 렌더러 없음 → 문법 검증 NOT RUN |
| Object Flows·사실 대조 | Object Flows 6행 검증기 통과. 와이어프레임 글자 ↔ Scenario Facts 대조에서 어긋남 1건(수락 전 이름 표시) 발견·수정 |
| 시장 관례·P0/P1 | NOT APPLICABLE — 모바일 앱 아님 |
| 한글 줄바꿈 실측(wrapcheck) | NOT RUN — Phase 6 항목, 이 실행 범위 밖. 와이어프레임에서 눈으로 본 줄바꿈 문제 1건(예시 주소 분리)은 수정 |
| Product Design Gate | NOT APPLICABLE — `--plan-only`, Claude 런타임 |
| Web Motion Contract | NOT APPLICABLE — 대표 모션 없음(상태 전환 3종만) |
| Phase 3~4 | NOT RUN — 작업 지시로 Phase 2에서 멈춤(`--plan-only`는 원래 Phase 0~4). DESIGN.md·렌더 방향·Mobile Transformations 완성·Role Variants 상세화는 다음 실행 |
| Module Coverage | `frontend-design`: `D:\git\claude-code-agent-customizations\skills\frontend-design\SKILL.md`(name 확인) — module, references 절만 읽음(2-4·2-5 규칙대로 SKILL.md 본문 미열람). `mermaid-diagrams`: `D:\git\claude-code-agent-customizations\skills\mermaid-diagrams\SKILL.md` — module 전체 읽음. `ui-ux-auditor`·`web-design-guidelines`: Phase 6 모듈 — 이 실행에서 NOT RUN. `design-system-starter`·`stitch`·`skill-evolve`·`autoresearch`: NOT REQUESTED. 해석 경로는 작업 지시가 정한 레포 원본(`D:\git\...\skills\<이름>`)이며 0-1 해석 순서 1~3단계는 실행하지 않음 |
