# Layout Blueprint — 플로우보드 첫 실행 흐름 (Phase 2-5 와이어프레임 판단)

- 작성일: 2026-11-11
- 상태: 저충실도 와이어프레임 게이트 통과. Phase 3(시각 방향)과 Phase 4(정교화)는 하지 않았다.
- 계약: [experience](2026-11-11-experience-projectflow.md) · [sitemap](2026-11-11-sitemap-projectflow.md) · [brief](2026-11-11-brief-projectflow.md)
- 읽은 anatomy: `layout-block-anatomy.md`의 `공통 문법`, App 블록(`Dashboard`·`Sidebar`·`Onboarding`·`Todo List`), `페이지 유형 → 블록 시퀀스 템플릿`

## 와이어프레임 파일

화면 전환과 상태를 확인해야 해서 HTML/CSS 한 파일로 그리고 뷰포트별 스크린샷을 남겼다. 잉크 3단계와 단색 도형만 썼고
브랜드 색·사진·그림자는 없다. 글꼴은 시스템 한글 폰트다(`DESIGN.md`의 Pretendard는 Phase 3에서 적용).

- 원본: [wireframes-projectflow/index.html](wireframes-projectflow/index.html) — 주 행동을 누르면 다음 화면으로 넘어간다. 오른쪽 아래 점선 상자는 화면 전환 도구이며 제품 화면이 아니다
- 캡처 조건: Chromium(Playwright), 데스크톱 1280×800, 모바일 390×844, 라이트 테마

| # | 화면 | 데스크톱 | 모바일 |
|---|---|---|---|
| 1 | home — 프로젝트 0개, owner (대표 화면) | [png](wireframes-projectflow/01-home-first-desktop.png) | [png](wireframes-projectflow/01-home-first-mobile.png) |
| 2 | home — 저장 실패 | [png](wireframes-projectflow/02-home-first-error-desktop.png) | [png](wireframes-projectflow/02-home-first-error-mobile.png) |
| 3 | setup-invite — 2단계 (프로젝트의 After) | [png](wireframes-projectflow/03-setup-invite-desktop.png) | [png](wireframes-projectflow/03-setup-invite-mobile.png) |
| 4 | setup-task — 3단계 | [png](wireframes-projectflow/04-setup-task-desktop.png) | [png](wireframes-projectflow/04-setup-task-mobile.png) |
| 5 | board — 도착 모습, owner (할 일·초대의 After) | [png](wireframes-projectflow/05-board-arrived-desktop.png) | [png](wireframes-projectflow/05-board-arrived-mobile.png) |
| 6 | home — 프로젝트 0개, member | [png](wireframes-projectflow/06-home-member-empty-desktop.png) | [png](wireframes-projectflow/06-home-member-empty-mobile.png) |
| 7 | board — member 시점 | [png](wireframes-projectflow/07-board-member-desktop.png) | [png](wireframes-projectflow/07-board-member-mobile.png) |
| 8 | home — 프로젝트 1개, owner | [png](wireframes-projectflow/08-home-list-desktop.png) | [png](wireframes-projectflow/08-home-list-mobile.png) |

그리지 않은 화면: task-detail, members, invite-accept, settings, 403. 댓글 포함 여부와 권한 결정이 미결이어서 Phase 4로 미뤘다.

## Interface Mode와 효과 예산

- home(프로젝트 0개): `Mode: 없음 — 첫 실행`. 첫 뷰포트의 주인공은 첫 행동(프로젝트 이름 입력)이다. anatomy `Dashboard`의 첫 실행 변형을 출발점으로 삼았다.
- board: 기능형 5종의 판별 질문 어디에도 들지 않는다(숫자 비교·후보 좁히기·여러 문맥 동시 유지·대기·효과 조절이 아니다). Mode를 붙이지 않고 anatomy `Sidebar`·`Todo List`를 체크리스트로 썼다.

```text
INTERFACE MODE
- 없음 — 첫 실행 (home) / 없음 (board)

PRIMARY ACTION
- 프로젝트 이름을 넣고 Enter

INFORMATION ARCHITECTURE
- 화면에 계속 남아야 하는 문맥: 사이드바의 현재 위치, 단계 표시 3개
- 비교해야 하는 필드: 없음 (보드에서는 카드의 제목·담당자)
- 상세로 숨겨도 되는 필드: 할 일의 마감일·상태 변경 → task-detail

DENSITY
- low (첫 실행 3단계) / medium (board)
- 입력 칸 높이 56px, 본문 1열, 단계당 입력 1~2개, 보드 열 3개

STATE MODEL
- loading / empty(owner·member) / error / success / permission / stale

EFFECT BUDGET
- 장식 효과 0
- 상태 모션 2 이하 (단계 전환, 카드 등장)
- 가장 무거운 구현 단계 A (CSS transition)
```

## 블록 순서와 각 블록이 기여하는 곳

### home — 프로젝트 0개, owner

| 순서 | 블록 | 답하는 질문 | 기여하는 성공 조건·과업 단계 |
|---|---|---|---|
| 0 | 사이드바 (제품·팀 이름, 홈, 팀원, 설정, 내 이름) | 여기가 어디인가 | 현재 위치 신호. P2의 초대 경로(`팀원`) |
| 1 | 제목 `첫 프로젝트 만들기` | 여기서 뭘 하나 | 성공 조건 1 |
| 2 | 단계 표시 (프로젝트 · 팀원 초대 · 첫 할 일) | 얼마나 걸리나 | 성공 조건 3, 과업 전체 |
| 3 | `프로젝트 이름` 입력 칸 | 무엇을 넣나 | 성공 조건 1·2, 과업 1단계 |
| 4 | `프로젝트 만들기` | 어떻게 끝내나 | 성공 조건 2 |

- 첫 뷰포트: 다섯 블록이 모두 들어온다. 버튼 하단이 데스크톱 313px, 모바일 345px에 있다.
- 강조 1개: 채운 버튼. 가장 큰 요소: 입력 칸.
- anatomy `Onboarding`은 중앙 단일 카드지만, `DESIGN.md` Layout("좌측 내비 + 본문 1열")에 맞춰 본문 왼쪽 위에 카드 없이 두었다. 프로젝트가 생긴 뒤의 화면과 뼈대가 같아 단계가 바뀌어도 화면이 튀지 않는다.

### setup-invite · setup-task

| 순서 | 블록 | 기여 |
|---|---|---|
| 1 | 제목 (`팀원 초대` / `첫 할 일 배정`) | 과업 2·3단계 |
| 2 | 단계 표시 (지난 단계는 ✓) | 성공 조건 3. 프로젝트가 만들어졌다는 완료 피드백 |
| 3 | 입력 (이메일 + `추가` / 할 일 + 담당자) | 과업 2·3단계 |
| 4 | 받을 사람 행 + `지우기` (2단계만) | Trust — 보내기 전에 누구에게 가는지 확인 |
| 5 | primary (`2명 초대하기` / `배정하기`) + `나중에 하기` | 성공 조건 3 |

### board — 도착 모습

| 순서 | 블록 | 기여 |
|---|---|---|
| 1 | 상태 알림 `초대 메일 2통을 보냈습니다.` | 성공 조건 4, Trust — 초대가 갔는지 |
| 2 | 제목(프로젝트 이름) + 팀원 줄 + `팀원 초대` | 성공 조건 4, P2 |
| 3 | `할 일 추가` | 다음 과업 |
| 4 | 열 3개 (`할 일` 1 · `진행 중` 0 · `완료` 0)와 카드 | 성공 조건 4 — 리더의 성공한 순간 |

## 덜어내기

| 뺀 것 | 어디에 있었나 | 왜 뺐나 |
|---|---|---|
| 0으로 채운 KPI 행, 빈 차트 | anatomy `Dashboard` 기본 구조 | 상류 제외(KPI 대시보드). 핵심 사람이 현황을 보는 사람이 아니다 |
| 앞으로 채워질 구역의 빈 상태 칸(보드 미리보기) | anatomy `Dashboard` 첫 실행 변형 | 성공 조건 어디에도 기여하지 않는다. 단계 이름 3개가 "무엇이 생기나"를 이미 말한다 |
| 기존 문구 "아직 프로젝트가 없습니다." (owner) | `src/pages/Home.tsx` | owner에게는 상태 설명이 아니라 입력 칸이 답이다. member의 빈 홈에만 남겼다 |
| 제목 아래 서브텍스트(환영 문구, 제품 소개) | anatomy `Onboarding`의 (선택) 서브 | 보조 한 가지 자리는 단계 표시가 쓴다 |
| 단계마다 붙는 설명 문장 | 설계 초안 | 제목과 라벨로 통한다 |
| "이름은 나중에 바꿀 수 있습니다" 도움말 | 설계 초안 | 프로젝트 편집 범위가 미결이라 약속할 수 없다. 없어도 다음 행동이 분명하다 |
| 완료 축하 화면 | 설계 초안 | 보드 도착 모습이 결과 화면이다. 화면을 하나 더 거치게 하지 않는다 |
| 보드 열마다의 "+ 추가" 행 | anatomy `Todo List`의 추가 버튼 | 머리의 `할 일 추가`와 목적이 같다. 하나만 둔다 |
| 빈 열의 안내 문구 | 설계 초안 | 열 제목과 건수 `0`으로 통한다 |
| 사이드바의 프로젝트 묶음과 "프로젝트 없음" | anatomy `Sidebar` 내비 5~7개 | 프로젝트 0개일 때 갈 곳이 없는 항목이다 |

남긴 설명 문구와 이유:

| 문구 | 화면 | 이유 |
|---|---|---|
| `한지우 님이 프로젝트를 만들면 여기에 나타납니다.` | member의 빈 홈 | 빈 상태의 회복 안내. member에게는 만들기 조작이 없어 이 문장이 유일한 다음 정보다 |
| `만들지 못했습니다. 잠시 뒤 다시 눌러 주세요.` | 저장 실패 | 오류의 회복 안내 |
| `초대 메일 2통을 보냈습니다.` | 보드 도착 | 설명이 아니라 완료 상태 알림이다 |

## 다섯 기준 판단

| 기준 | 화면에서 관찰한 근거 | 수정한 결정 |
|---|---|---|
| 위계 | 색 없이도 home에서 입력 칸(테두리 1.5px, 높이 56px)과 검은 버튼이 먼저 읽힌다. 모바일 board 첫 캡처에서는 화면 폭 전체의 `할 일 추가`가 방금 만든 카드보다 컸다 | 모바일 board의 `할 일 추가`를 글자 폭·높이 44px로 줄였다. 다시 캡처해 카드가 가장 큰 흰 덩어리인 것을 확인했다 |
| 구조 | 제목 → 단계 → 입력 → 버튼이 리더의 질문 순서(뭘 하나 → 얼마나 → 무엇을 넣나)와 같다. home(프로젝트 1개) 첫 캡처에서 `새 프로젝트` 버튼이 행 목록 폭 밖 오른쪽 끝에 떨어져 있었다 | 머리와 행 목록의 폭을 720px로 맞췄다 |
| 흐름 | 키보드만으로 home → setup-invite → setup-task → board-arrived를 따라갔다(입력 후 Enter, 각 단계 primary에서 Enter). 저장 실패 화면에서 입력값 `가을 카탈로그 리뉴얼`이 남아 있고 같은 버튼으로 다음 단계에 갔다. 모바일 세그먼트를 누르면 열이 바뀐다 | 없음. task-detail·members로 가는 흐름은 그리지 않아 Phase 4에서 확인한다 |
| 일관성 | 세 단계의 제목·단계 표시·입력·버튼 자리가 같다. 확정 버튼은 "~하기"(만들기·초대하기·배정하기), 여는 버튼은 명사형(할 일 추가·팀원 초대·새 프로젝트)이다. 첫 캡처에서 초대 상태가 setup-task에서는 `박서준 초대 보냄`, board에서는 `박서준 · 초대 보냄`으로 달랐다 | 모든 화면에서 `이름 · 초대 보냄`으로 통일했다 |
| 명료성 | owner 화면에는 지울 설명 문장이 없다. 라벨(프로젝트 이름·이메일·할 일·담당자)과 버튼 문구만으로 다음 행동이 읽힌다. 모바일 오류 문구가 두 줄로 넘어가 "주세요."만 떨어졌다 | 오류 문구를 `만들지 못했습니다. 잠시 뒤 다시 눌러 주세요.`로 줄여 한 줄에 넣었다 |

남은 관찰: 마법사 2·3단계에서 사이드바의 `팀원` 항목과 본문 제목 `팀원 초대`가 함께 보인다. 활성 표시는 프로젝트 이름에 있어 위치는 읽히지만, Phase 4에서 members를 그릴 때 이름이 헷갈리는지 다시 본다.

## 역할별 화면 (초안)

spec 역할 표의 `화면` 열이 두 역할 모두 `공용 권한차등`이라 같은 블록 순서 위에서 요소를 숨긴다. 변형표는 Experience Contract `Role Variants`에 있다.

- owner·member의 차이가 화면을 바꾸는 곳 두 군데를 그렸다: 프로젝트 0개인 홈(#1 ↔ #6), board 머리(#5 ↔ #7).
- member의 빈 홈은 만들기 폼이 숨겨져 CTA가 사라지는 경우다. 빈 상태 문안을 두었고 사이드바 `팀원`이 남은 진입점이다.
- member에게 프로젝트 생성·팀원 초대를 숨기는 것은 권장안이며 `Open Decisions`에 올렸다.

## 모바일 변환 (초안)

Experience Contract `Mobile Transformations` 표가 정본이다. 와이어프레임에서 확인한 것: 가로 넘침 0건(16장 모두), 폼 primary는 화면 폭 전체, 보드 열은 세그먼트로 한 번에 하나.
