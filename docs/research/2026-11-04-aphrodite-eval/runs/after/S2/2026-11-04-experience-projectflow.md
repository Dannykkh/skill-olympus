# Experience Contract: 플로우보드 — 첫 실행 홈 · 프로젝트 만들기 · 첫 보드 · 팀원 합류

- 상태: Phase 2-3 초안(2026-11-04). Phase 2-5 와이어프레임 게이트로 과업·메시지·CTA·상태를 확인함. Phase 4에서 화면별 세부·모바일 변환·역할 변형을 보강한다.
- 계층 판정: strategy (brief 첫 줄)
- 관련: [brief](2026-11-04-brief-projectflow.md) · [PRODUCT 초안](2026-11-04-product-projectflow.md) · [sitemap](2026-11-04-sitemap-projectflow.md) · [layout](2026-11-04-layout-projectflow.md)

## Source Mode

- Mode: product-derived
- Evidence: docs/plan/projectflow/spec.md(공유 전제·Problem Statement·시스템 역할 표), docs/plan/projectflow/interview.md(Soft Gate 3), docs/athena/projectflow.md(판정·삭제 권고), 루트 DESIGN.md, src/pages/Home.tsx(현재 스텁), 2026-11-04 brief

## Product Facts

해당 없음 — 사용자에게 제시할 사실 주장 없음. "가입 5분 안에 첫 보드"는 차별화 목표(hypothesis)라 카피로 쓰지 않는다(Content Integrity).

## Benchmark Sources

해당 없음 — product-derived

## Page Goal

- 사용자가 이 화면에서 달성할 결과: 팀 리더는 가입 당일 첫 프로젝트 보드를 만들고, 팀원을 초대하고, 첫 할 일을 맡긴다. 팀원은 초대 메일에서 들어와 자기가 맡은 할 일을 찾아 진행 중으로 옮긴다.
- 제품이 얻어야 하는 결과: 가입 후 24시간 안에 첫 프로젝트를 만드는 계정 비율 30% → 60% 이상(spec 공유 전제).
- 관찰 가능한 성공 조건: 홈 첫 실행 첫 뷰포트의 solid 버튼이 "첫 프로젝트 만들기" 하나 / 마법사 1단계 "다음"에서 프로젝트 저장 / 3단계 이내 보드 도달 / "팀원 초대" 진입점이 홈·보드 첫 뷰포트에 상시 / 0값 KPI·빈 차트 0개 / 팀원은 참여 직후 첫 화면에서 맡은 할 일·마감·맡긴 사람을 읽는다.

## Audience and Tasks

- 주요 사용자와 사용 상황: 5~20명 소규모 팀. 팀 리더가 가입 직후 프로젝트 0개 계정에서 시작하고(데스크톱), 팀원은 초대 메일을 휴대폰에서 처음 연다.
- 최우선 과업: 팀 리더의 첫 프로젝트 만들기. 이어서 팀원 초대 → 첫 할 일 맡기기.
- 시작 조건과 완료 조건: 시작 = 프로젝트 0개 홈. 완료 = 시작 단계 3/3(프로젝트 저장 · 초대 1명 이상 발송 · 할 일 1개 이상 담당자 지정). 팀원 완료 = 참여 + 맡은 할 일을 "진행 중"으로 옮김.
- 주요 불안·마찰·실패 가능성: 빈 화면에서 무엇을 할지 모름(P1) / 초대 경로를 못 찾음(P2) / 초대 메일 주소 오타·발송 실패 / 수락 전 팀원에게 맡겨도 되는지 / 팀원은 링크 신뢰와 "내 일이 어디 있지".

사람 카드(정본: brief 2절. 이름은 spec 이해관계자 구분 그대로)

| 사람 | 누구인가 | 처음 오는 이유와 마음 | 알고 싶은 것 → 답이 보일 화면 | 성공한 순간 | 주로 쓰는 화면 |
|---|---|---|---|---|---|
| 팀 리더(`owner`) — 핵심 사람 | 김서연(34), 8명 스튜디오 실장 | 단톡방에서 할 일이 묻힘 · 기대 반 막막함 반 | 지금 뭘 먼저? → home-empty / 팀원은 어떻게? → 사이드바·wizard-3 / 들어왔나? → 보드 헤더 / 누가 언제까지? → 보드 카드 | 첫 카드에 박민지 이름이 붙음 | 홈, 보드 |
| 팀원(`member`) | 박민지(27), 에디터 | 실장의 초대 · 귀찮음과 궁금함 | 누가 어디로? 믿어도 되나? → invite-accept / 내 일·마감? → board-joined / 뭘 누르지? → 내 할 일 카드 / 질문은? → task-detail | 맡은 할 일을 진행 중으로 옮김 | 보드, 할 일 상세 |

여정표(막히는 순간은 States 표의 행으로 이어짐)

| 시기 | 사람 | 할 일 | 궁금해지는 것 | 막히는 순간 → 푸는 화면·상태 |
|---|---|---|---|---|
| 사용 전 | 팀 리더 | 가입 링크 열기 | 이거 오래 걸리나? | 빈 화면 → home-empty 시작 단계 블록 |
| 사용 전 | 팀원 | 초대 메일 열기 | 누가 보냈지? | 링크 만료 → invite-expired |
| 사용 중 | 팀 리더 | 이름 적기 · 할 일 적기 · 초대 | 저장됐나? 메일 잘 갔나? | 저장 실패 → error(입력 유지·다시 시도) / 주소 오타 → error(칩) / 발송 실패 → error(보내지 못함) |
| 사용 중 | 팀원 | 참여 · 내 할 일 찾기 | 내 일은 어디? | 맡은 일 없음 → board-joined의 빈 상태 문안 |
| 사용 후 | 팀 리더 | 담당자 정하기 | 수락 전에 맡겨도 되나? | 초대 대기 표시 + "참여하면 바로 보여요" |
| 사용 후 | 팀원 | 진행 중으로 옮기기 · 댓글 | 실장이 봤나? | 권한 없는 메뉴 → 숨김, URL 직접 진입 → forbidden |

## System Roles

| 역할 ID | 표시명 | 화면 | 금지 행동(spec) | 인증 주체 |
|---|---|---|---|---|
| owner | 팀 소유자 | 공용 권한차등 | - | 사람 |
| member | 팀원 | 공용 권한차등 | 팀 설정 변경, 팀원 내보내기 | 사람 |

operation-scenarios.md가 없어 spec 역할 표의 `금지 행동`을 4-1-1 어휘로 옮겼다. 표에서 정해지지 않는 칸은 Open Decisions(structure)에 올렸다.

## Role Variants

같은 블록 순서 위의 요소별 노출. owner는 모든 요소가 `표시`인 기준 화면이다.

| 요소 | owner | member |
|---|---|---|
| 사이드바 "팀 설정" | 표시 | 숨김 |
| 팀원 목록 행의 "내보내기" | 표시 | 숨김 |
| 팀원 목록 행의 "다시 보내기·초대 취소" | 표시 | 숨김 |
| 사이드바·상단 바 "팀원 초대" | 표시 | 표시 (AI 권장 — Open Decisions) |
| "+ 새 프로젝트" · "첫 프로젝트 만들기" | 표시 | 표시 (AI 권장 — Open Decisions) |
| 카드 담당자 바꾸기 | 표시 | 표시 (AI 권장 — Open Decisions) |
| 할 일 상태 옮기기 · 댓글 | 표시 | 표시 |
| 홈 "시작 단계" 블록 | 표시 | 숨김 — member는 그 자리에 "내게 맡겨진 할 일" |
| 보드 헤더 "프로젝트 설정" 메뉴 | 표시 | 숨김 |
| 팀 설정 URL 직접 진입(진입 차단) | 표시 | 403 → forbidden 화면 |

- 숨김을 고른 이유: member에게는 팀 설정·내보내기를 요청할 경로가 없어, 비활성으로 보여도 할 수 있는 다음 행동이 없다.
- 역할을 지웠을 때 비는 곳: member의 홈 첫 실행에서 시작 단계가 사라지면 CTA가 없어진다 → "내게 맡겨진 할 일"이 그 자리를 채우고, 맡은 일이 0개면 "아직 맡은 할 일이 없어요. 보드에서 할 일을 골라 '나에게 맡기기'를 눌러 보세요" + "보드 열기"(outline).

## Header and Navigation

- 브랜드·현재 위치·전역 이동·주 행동의 순서: 팀 이름(온결 스튜디오) → 활성 내비 1개 → 홈·팀원·프로젝트 목록 → 주 행동은 본문 블록 안의 solid 1개. "팀원 초대"는 전역 보조(outline)로 항상.
- 데스크톱 내비게이션: 좌측 고정 사이드바 240px. 위에서부터 팀 이름 → 홈 · 팀원 → 프로젝트 목록(첫 실행은 "아직 없음" + "+ 새 프로젝트" 텍스트 행) → 하단 고정 "팀원 초대"(outline) · 팀 설정(owner) · 사용자(김서연 · 소유자). 마법사는 사이드바 없는 집중 화면.
- 모바일 대체 구조: 상단 바(현재 화면 제목 + 우측 "초대" 텍스트 버튼) + 하단 탭 3개(홈 · 프로젝트 · 팀원). 팀 설정은 팀원 탭 안의 행(owner만).

## Core Message

- 핵심 약속: 이름 하나면 첫 보드가 생기고, 팀원 초대와 첫 할 일 맡기기까지 이 화면에서 이어 간다.
- 설명: 홈의 시작 단계 3개(프로젝트 만들기 → 팀원 초대 → 할 일 맡기기)와 현재 단계 1개 강조.
- 증거: 단계 수와 단계 이름, 1단계 뒤 "프로젝트를 저장했어요" 확인, 사람별 초대 상태 — 제품이 스스로 보여 주는 사실만. 고객 수치·후기·배지 없음.
- 사용자가 다음에 이해해야 할 것: 보드에서 할 일에 담당자를 정하면 시작이 끝난다. 팀원이 참여하면 맡은 일이 그 사람 첫 화면에 보인다.

## Content Integrity

| Content item | Classification | Evidence | Presentation rule |
|---|---|---|---|
| "가입 5분 안에 첫 보드" | hypothesis | interview.md Soft Gate 3 차별화 | 화면 카피 금지. 측정 목표로만 |
| 시작 단계 "3단계"와 단계 이름 | verified | 이 계약의 마법사 정의 | 표시 가능. 단계 수가 바뀌면 카피를 함께 바꿈 |
| 성공 기준 30% → 60% | hypothesis | spec.md 공유 전제 | 화면에 노출하지 않음 |
| Scenario Facts 전체(팀·사람·프로젝트·할 일·날짜·상태) | prototype | 이 계약 Scenario Facts | 와이어프레임·시안 전용. 운영 데이터로 승격 금지 |
| 입력 예시 문구("예: 11월 뉴스레터 발행") | prototype | Scenario Facts | 구현 시 실제 placeholder 문구로 검토 |

## Section Order

홈 첫 실행(`home-empty`, owner) — 대표 화면

1. 페이지 타이틀 "김서연님, 첫 프로젝트부터 만들어 볼까요?" + 한 줄 설명: "지금 뭘 먼저 하지?"에 답
2. 시작 단계 블록(0/3): 현재 단계 "프로젝트 만들기" 행에 primary 1개, 남은 두 단계는 흐린 행 — 첫 행동과 그 뒤가 얼마나 남았는지를 한 블록에서
3. 앞으로 채워질 구역의 빈 상태 칸 "내게 맡겨진 할 일" · "프로젝트": 프로젝트를 만들면 이 자리가 무엇으로 채워지는지 — 0값 지표 대신 문장

다른 화면의 블록 순서는 Layout Blueprint가 정본이다: project-wizard-1·3(Onboarding 카드), project-created·board(보드 헤더 → 완료 줄 → 3열), invite-accept(초대 카드), board-joined(참여 알림 → 내게 맡겨진 할 일 → 3열).

프로젝트가 생긴 뒤 홈(`home`): 시작 단계 블록 자리를 "내게 맡겨진 할 일"(마감 가까운 순)이 채우고, 그 아래 프로젝트 목록. KPI 행·차트를 기본으로 두지 않는다(athena: 활성 팀 100개 이후 재검토).

## CTA Strategy

- Primary: 화면마다 solid 1개.
  - home-empty: "첫 프로젝트 만들기" → project-wizard-1, 첫 뷰포트 시작 단계 블록 안 1회
  - project-wizard-1: "다음: 첫 할 일 적기"(이때 프로젝트 저장) / wizard-2: "다음: 팀원 초대" / wizard-3: "초대 보내고 보드 열기"
  - project-created: "담당자 정하기" → 첫 카드 담당자 칸에 포커스 + assignee-popover
  - invite-accept: "참여하고 보드 열기" → board-joined
  - board-joined: "진행 중으로 옮기기" → 내 할 일 카드가 진행 중 열로
- Secondary: 전역 "팀원 초대"(outline, 사이드바 하단·모바일 상단 바). 마법사 2·3단계는 텍스트 링크 "건너뛰기" · "나중에 초대하기". 같은 위계 solid 2개 금지.
- 반복 규칙: 시작 단계가 3/3이 되면 시작 단계 블록은 사라지고 그 자리를 "내게 맡겨진 할 일"이 채운다. "팀원 초대"는 모든 앱 셸 화면에 항상.
- 완료·실패 피드백: 프로젝트 저장 → 2단계 상단 "프로젝트를 저장했어요" / 저장 실패 → 입력 유지 + "저장하지 못했어요. 연결을 확인하고 다시 시도해 주세요" + "다시 시도" / 초대 → 사람별 칩 상태 / 맡기기 → 토스트 "원고 초안 쓰기를 minji@ongyeol.kr에게 맡겼어요" + "되돌리기"(5초). 수락 전 사람은 이메일로 부른다(Scenario Facts).

## Trust Strategy

- 사용자가 불안을 느끼는 지점: ① 홈 "설정만 하다 끝나지 않을까" ② wizard-3 "메일이 잘 갔나·이상하게 보이진 않을까" ③ 담당자 정하기 "수락 전에 맡겨도 되나" ④ invite-accept "이 링크 믿어도 되나·가입부터 해야 하나"
- 그 직전에 제시할 근거: ① 단계 3개의 이름과 "2·3단계는 건너뛸 수 있어요" ② 버튼 바로 위 "김서연님 이름으로 초대 메일을 보내요. 받은 사람은 메일의 링크로 바로 참여해요" + 발송 뒤 사람별 상태 ③ 팝오버의 이메일 주소 + "초대 대기" 라벨 + "참여하면 이름으로 바뀌고 맡은 할 일이 바로 보여요" ④ 초대한 사람·팀·프로젝트 이름, 받은 이메일 주소, 맡겨진 할 일, "비밀번호 없이 이메일 링크로 들어와요"
- 출처·날짜·검증 가능성: 모두 이 계정의 실제 데이터(Scenario Facts는 시안용). 이메일 링크 인증은 spec 기존 환경.
- 근거가 없을 때 생략할 요소: 고객 수, 별점·후기, 보안 인증 배지, 고객 로고 띠, "N개 팀이 사용 중".

## Asset Provenance

해당 없음 — 프로젝트 내부 자산만 사용. 와이어프레임 단계라 이미지·아이콘·로고 없음. 폰트(Pretendard Variable)는 DESIGN.md 값이며 출처·라이선스는 Phase 3-2에서 확인한다.

## Desktop Structure

- 기준 뷰포트: 1280×800
- 첫 뷰포트: home-empty = 사이드바 240 + 본문 1열(최대 폭 720, 좌정렬). 타이틀 → 시작 단계 블록 → 빈 상태 칸 2개가 스크롤 없이 들어감. project-created = 보드 헤더 → 완료 줄(primary) → 3열 보드.
- 그리드·pane·콘텐츠 위계: 좌 사이드바(정체성·탐색) / 중앙 현재 작업 / 우측 할 일 상세 패널(보드에서 카드를 열 때만). Agent Workbench 공간 모델을 업무 보드에 맞게 줄인 것(layout 참조).
- 스크롤 흐름과 밀도 변화: 홈 첫 실행은 스크롤 없이 끝남. 보드는 열 3개 고정, 세로 스크롤은 열 안에서. 밀도 중간(DESIGN.md).

## Mobile Transformations

Phase 2-5 와이어프레임 기준 초안. Phase 4-2에서 요소 전체로 보강한다.

| Desktop element | Operation | Mobile result | Reason |
|---|---|---|---|
| 좌측 사이드바 | replace | 하단 탭 3개(홈·프로젝트·팀원) + 상단 바 | 엄지 영역 이동, 본문 폭 확보 |
| 사이드바 "팀원 초대" | replace | 상단 바 우측 "초대" 텍스트 버튼 | P2 — 첫 화면에서 초대 경로 유지 |
| 시작 단계 블록 + primary | retain | 첫 화면 최상단, 버튼 풀폭 | 첫 행동이 주인공 |
| 빈 상태 칸 2개 | compress | 한 줄 요약 행 2개 | 첫 화면을 시작 단계에 양보 |
| 마법사 중앙 카드의 CTA | sticky | 화면 하단 고정 풀폭(키보드 위) | 입력 중에도 다음 행동에 닿음 |
| 보드 3열 | replace | 상태 세그먼트 탭(할 일 3 · 진행 중 0 · 완료 0) + 선택 열의 카드 목록 | 3열 축소는 카드 글자가 잘림 |
| 할 일 상세 우측 패널 | replace | 전체 화면 시트 | 좁은 폭에서 댓글 입력 공간 |
| 담당자 팝오버 | replace | 바텀 시트 | 화면을 벗어나지 않는 고르기 |
| board-joined "내게 맡겨진 할 일" | retain | 첫 화면 최상단 | 팀원의 첫 질문 |
| 보드 헤더 팀원 상태 | compress | 아바타 묶음을 빼고 "팀원 3명 · 초대 대기 2명" 한 줄 | 이름 나열은 팀원 탭으로 |
| 보드 헤더 프로젝트 이름(h1) | replace | 상단 바 제목이 맡음 | 같은 이름을 두 번 쓰지 않음 |

## States

| State | Trigger | User sees | Available action | Recovery |
|---|---|---|---|---|
| loading | 홈·보드 첫 로드 | 사이드바·타이틀·카드 자리의 고정 높이 스켈레톤(레이아웃 이동 없음) | 없음 | 10초 넘으면 error(불러오지 못함)로 전환 |
| empty — 홈 프로젝트 0개 | 가입 직후 | home-empty(시작 단계 0/3, 빈 상태 칸 2개) | 첫 프로젝트 만들기 | — |
| empty — 보드 열 0개 | 마법사 2단계 건너뜀 또는 열 비어 있음 | 열 안 "+ 할 일 추가" 행, 진행 중 열 "진행 중인 할 일이 없어요" | 할 일 추가 | — |
| empty — member 맡은 일 0개 | 참여했지만 담당 없음 | "아직 맡은 할 일이 없어요…" + 보드 열기(outline) | 보드 열기 | — |
| error — 이름 비어 있음 | wizard-1 다음 클릭 | 필드 아래 "프로젝트 이름을 적어 주세요" + 필드 포커스 | 입력 | 즉시 |
| error — 저장 실패 | wizard-1 저장 요청 실패 | 입력값 유지, 카드 상단 "저장하지 못했어요. 연결을 확인하고 다시 시도해 주세요" | 다시 시도 | 입력 보존 |
| error — 주소 형식 | wizard-3·invite-sheet 칩 | 칩에 경고 표시 + 아래 "doyun@ongyeol — 주소 끝이 빠졌어요. 예: doyun@ongyeol.kr" | 칩 눌러 고치기·지우기 | 틀린 칩이 있으면 보내지 않고 그 칩에 포커스 |
| error — 발송 실패 | 이메일 외부 API 실패 | 사람별 "보내지 못함" + "다시 보내기"(members·보드 헤더도 같은 이름) | 다시 보내기 | 다른 사람 초대는 유지 |
| error — 초대 링크 만료 | 오래된 링크 | invite-expired "이 초대 링크는 만료됐어요. 김서연님(seoyeon@ongyeol.kr)에게 새 초대를 요청해 주세요" | 안내만 | 새 링크 받기 |
| success — 프로젝트 저장 | wizard-1 통과 | wizard-2 상단 "프로젝트를 저장했어요" | 다음 · 건너뛰기 | — |
| success — 첫 보드 | wizard-3 완료 또는 건너뜀 | project-created 완료 줄(할 일 3개 · 초대 2명 보냄 · 시작 단계 2/3) | 담당자 정하기 | — |
| success — 맡기기 | 담당자 선택 | 카드에 "minji@ongyeol.kr · 초대 대기" + 토스트 "원고 초안 쓰기를 minji@ongyeol.kr에게 맡겼어요" + 시작 단계 3/3 | 되돌리기(5초) | 되돌리면 담당자 없음 |
| success — 참여 | invite-accept 참여 | board-joined 상단 "온결 스튜디오에 참여했어요" | 진행 중으로 옮기기 | — |
| permission | member가 팀 설정 URL 진입 | forbidden "팀 설정은 팀 소유자만 바꿀 수 있어요" | 홈으로 | — |
| stale | 다른 사람이 보드를 바꿈 | MVP는 화면 재진입·창 포커스 때 다시 불러옴(Open Decisions) | — | — |

## Object Flows

| Object | Create | View | Edit | After |
|---|---|---|---|---|
| 프로젝트 | home-empty → project-wizard-1 | board | project-settings | project-created (첫 보드 준비됨) |
| 팀원 초대 | project-wizard-3 · invite-sheet | members | invite-resend (다시 보내기·초대 취소) | invite-sent (사람별 발송 결과) |
| 할 일 | project-wizard-2 · board-add-row | task-detail | task-detail-edit (고치기·지우기·상태 옮기기) | task-added (열 끝에 새 카드) |
| 할 일 맡기기 | assignee-popover | board-card-assignee | assignee-popover-change (바꾸기·빼기) | task-assigned (카드에 이름 + 되돌리기 토스트) |
| 초대 수락(팀원) | invite-accept | board | n/a — 수락 뒤 되돌리기·팀 나가기는 spec MVP 범위에 없음 | board-joined (참여 완료 + 내게 맡겨진 할 일) |
| 댓글 | task-detail-comment-input | task-detail-comments | n/a — spec 역할 표에 댓글 고치기·지우기 없음 | comment-posted (목록 끝 새 댓글) |

## Scenario Facts

모든 와이어프레임·시안 글자는 이 표만 인용한다(prototype).

| Fact | Value | Screens |
|---|---|---|
| 오늘 | 2026년 11월 4일(수) | 전 화면 |
| 팀 이름 | 온결 스튜디오(가입 때 만든 팀 — Open Decisions) | 사이드바·상단 바 전 화면, invite-accept |
| 팀 리더 | 김서연 · seoyeon@ongyeol.kr · 소유자 | home-empty, project-wizard-3, invite-accept, invite-expired |
| 팀원 1 | 박민지 · minji@ongyeol.kr · 팀원. 이름 "박민지"는 참여 뒤에만 나오고, 그 전 화면에는 이메일만 나옴 | 이메일: project-wizard-3, project-created, assign, invite-accept / 이름: invite-accept(내 이름 칸), board-joined |
| 팀원 2 | 이도윤 · doyun@ongyeol.kr · 팀원(3단계에서 처음 "doyun@ongyeol"로 잘못 입력했다가 고침). 아직 참여 전이라 이름 "이도윤"은 어느 화면에도 나오지 않음 | project-wizard-3, project-created, board-joined |
| 초대 대기 중인 사람의 표시 | 이름 대신 이메일 주소(minji@ongyeol.kr, doyun@ongyeol.kr)와 이니셜 m·d, 점선 아바타. 이름은 본인이 invite-accept "내 이름"에 적은 뒤부터 표시 | project-created, assign, board-joined |
| 프로젝트 이름 | 11월 뉴스레터 발행 | project-wizard-1~3, project-created, invite-accept, board-joined |
| 첫 할 일 3개 | 원고 초안 쓰기 · 표지 이미지 고르기 · 발송 명단 정리 | project-wizard-2, project-created, board-joined |
| 마감 | 원고 초안 쓰기 — 11월 6일(금), 이틀 남음. 나머지 둘은 마감 없음 | project-created, invite-accept, board-joined |
| 담당자 | 원고 초안 쓰기 → 박민지(김서연이 맡김. 맡길 때는 "minji@ongyeol.kr · 초대 대기"로 표시, 참여 뒤 "박민지"). 나머지 둘은 담당자 없음 | assign, task-assigned, invite-accept, board-joined |
| 할 일 상태 이름 | 할 일 · 진행 중 · 완료(보드 열 이름과 같음) | project-created, board, board-joined |
| 초대 상태 이름 | 초대 대기 · 참여함 · 보내지 못함 | project-wizard-3, project-created, members, board-joined |
| 시작 단계 | 프로젝트 만들기 → 팀원 초대 → 할 일 맡기기. home-empty 0/3 · project-created 2/3 · task-assigned 3/3 | home-empty, project-created |
| 열별 개수 | 할 일 3 · 진행 중 0 · 완료 0(project-created, board-joined 모두 박민지가 옮기기 전) | project-created, board-joined |
| 팀원 상태 — project-created 시점 | 김서연 참여함 · minji@ongyeol.kr 초대 대기 · doyun@ongyeol.kr 초대 대기 → "팀원 3명 · 초대 대기 2명" | project-created, assign |
| 팀원 상태 — board-joined 시점 | 김서연 참여함(소유자) · 박민지 참여함(나) · doyun@ongyeol.kr 초대 대기 → "팀원 3명 · 초대 대기 1명" | board-joined |
| member가 invite-accept에서 적는 이름 | 박민지 | invite-accept, board-joined |

## Performance Budget

- 첫 화면 필수 자산: 앱 셸 JS, Pretendard Variable 한글 서브셋 1파일(DESIGN.md), 이미지 0
- 지연 가능한 자산: 할 일 상세 패널, 팀 설정·프로젝트 설정 화면 코드
- 폰트 weight·이미지·영상·모션 예산: 가변 폰트 1파일, 일러스트·영상 0, 모션은 상태 전환 3종(패널 열기, 토스트, 카드 이동)만
- 저성능 기기와 느린 네트워크 폴백: 고정 높이 스켈레톤, 저장·발송 버튼의 진행 상태("저장하는 중…")와 중복 제출 방지

## Accessibility Contract

- 문서·랜드마크·헤딩 읽기 순서: nav(사이드바 또는 상단 바) → main(h1 = 페이지 타이틀) → 하단 탭 nav(모바일). 마법사는 h1 = 단계 질문, "1/3"은 h1 앞 텍스트.
- 키보드·포커스·Escape 동작: 마법사 Enter = 다음, Esc = 나가기 확인(입력이 있을 때). 담당자 팝오버 Esc로 닫고 담당자 칸으로 포커스 복귀. 칩 입력 Backspace로 마지막 칩 지우기. "담당자 정하기"는 첫 카드 담당자 칸으로 포커스 이동.
- 레이블·오류 연결·상태 알림: 이메일 입력 label "초대할 팀원 이메일", 오류는 aria-describedby, 사람별 발송 결과와 토스트는 role=status(polite).
- 대비·색 외 신호·터치 타깃: 상태는 텍스트 라벨("초대 대기", "보내지 못함")+아이콘, 마감 임박은 accent 색 + "이틀 남음" 텍스트. 터치 타깃 44px 이상.
- reduced-motion과 대체 경험: 패널·토스트·카드 이동을 즉시 전환으로.

## Adopt

해당 없음 — product-derived

## Adapt

해당 없음 — product-derived

## Avoid

해당 없음 — product-derived (제품 근거로 피할 것: 0으로 채운 KPI 카드, 빈 차트 자리, 일러스트 히어로, 근거 없는 고객 수치 — brief 7절)

## Open Decisions

| Decision | Layer | Recommendation | Owner |
|---|---|---|---|
| member의 프로젝트 만들기·팀원 초대·담당자 바꾸기 권한 | structure | 셋 다 표시 — spec 금지 행동에 없고, 팀원도 초대할 수 있어야 P2(혼자 쓰다 그만둠)가 줄어든다. 팀 설정·팀원 내보내기·초대 관리(다시 보내기·취소)·프로젝트 설정만 숨김 | 사용자(제품 책임자) |
| 팀원 표시 이름을 정하는 곳 | structure | invite-accept에서 본인이 "내 이름" 1칸을 적고, 그 전에는 이메일 주소로 표시 — 초대할 때 이름을 묻지 않아 마법사 3단계 입력을 1종(이메일)으로 유지 | 사용자(제품 책임자) |
| 초대 수락 전 팀원에게 할 일 맡기기 | structure | 허용하고 담당자 칸에 "초대 대기"를 함께 표시 — 막으면 첫 세션 안에 시작 단계 3/3을 끝낼 수 없다 | 사용자(제품 책임자) |
| 프로젝트 저장 시점 | structure | 마법사 1단계 "다음"에서 저장, 2·3단계는 건너뛸 수 있음 — 중간 이탈도 첫 프로젝트 생성으로 남고 보드에서 이어 간다 | 사용자(제품 책임자) + 개발 리드(API) |
| 팀 이름을 정하는 시점 | structure | 이메일 링크 가입 직후 팀 이름 1칸(기본값 "김서연님의 팀"), 마법사는 프로젝트만 — 첫 보드까지 입력 1개 유지 | 사용자(제품 책임자) |
| 보드 변경 실시간 반영 | structure | MVP는 화면 재진입·창 포커스 때 다시 불러오기, 배너·실시간 없음 | 개발 리드 |
| 보드 형태 | skeleton | 칸반 3열(할 일·진행 중·완료) — 포스트잇 보드 은유, 5~20명 규모에서 상태가 한눈에. 리스트 보기는 later | 사용자(제품 책임자) |

## Prompt Contract

INTERFACE MODE — Agent Workbench를 업무 보드에 맞게 줄임(좌 사이드바 · 중앙 현재 작업 · 우측 할 일 상세 패널). 홈 첫 실행은 anatomy Dashboard의 첫 실행 변형. Data Instrument 아님.
PRIMARY ACTION — home-empty "첫 프로젝트 만들기", project-created "담당자 정하기", board-joined "진행 중으로 옮기기"
INFORMATION ARCHITECTURE — 계속 남는 문맥: 팀 이름, 현재 프로젝트, 팀원 초대 상태. 비교 필드: 할 일 제목·담당자·마감·상태. 상세로 숨김: 설명·댓글.
DENSITY — medium. 카드 3~6개/열, 패널 최대 2개(사이드바 + 본문, 상세를 열면 3개)
STATE MODEL — loading · empty · error · permission · stale · success (States 표)
EFFECT BUDGET — 장식 효과 0, 상태 모션 3(패널 열기·토스트·카드 이동), 최대 구현 단계 A
GOAL — 가입 당일 첫 프로젝트 보드를 만들고 팀원 초대·첫 할 일 맡기기까지 끝내게 한다
AUDIENCE — 팀 리더(핵심, 데스크톱) · 팀원(초대 메일, 휴대폰)
TASK — 첫 프로젝트 만들기 → 팀원 초대 → 할 일 맡기기 / 팀원: 참여 → 내 할 일 진행 중으로
FLOW — home-empty → project-wizard-1(저장) → 2 → 3 → project-created → task-assigned → home / invite-accept → board-joined
HEADER — 사이드바: 팀 이름 → 홈·팀원 → 프로젝트 → 팀원 초대(outline)·팀 설정(owner)·사용자
MESSAGE — 이름 하나면 첫 보드가 생기고, 초대와 맡기기까지 이어 간다
FACTS — Scenario Facts만 인용. 표에 없는 날짜·숫자·상태를 지어내지 말 것
CONTENT_INTEGRITY — "5분" 카피 금지, Scenario Facts는 prototype
SECTION_ORDER — Section Order와 layout 블록 시퀀스
CTA — 화면당 solid 1개, 전역 보조 "팀원 초대" outline, 마법사 보조는 텍스트 링크
TRUST — 초대 버튼 위 발송 주체 안내, 사람별 발송 상태, invite-accept의 초대한 사람·받은 주소
ASSETS — 없음(내부 자산만)
LAYOUT — 좌측 내비 + 본문 1열(DESIGN.md), 보드는 3열
RESPONSIVE — Mobile Transformations 표
STATES — States 표 전체
PERFORMANCE — 이미지 0, 가변 폰트 1파일, 고정 높이 스켈레톤
ACCESSIBILITY — Accessibility Contract
PRESERVE — DESIGN.md 토큰, React 18 SPA 구조, src/pages/Home.tsx 경로
EXCLUDE — 팀 성과 KPI 대시보드, 시간 추적, 리포트 내보내기, Slack 알림, 0값 지표, 빈 차트, 고객 수치·후기·배지, 제품 투어 코치마크
SUCCESS — Success Checks + brief 6절

## Success Checks

- 첫 5초 안에 핵심 약속과 주 행동을 설명할 수 있는가? (home-empty: "첫 프로젝트 만들기" 하나)
- 화면의 사실·수치·후기·브랜드 자산이 출처와 상태를 가지며, unverified 항목을 사실처럼 보이지 않는가? ("5분" 카피 없음)
- 주요 과업을 막는 상태·정보·행동 누락이 없는가? (저장 실패·주소 오타·발송 실패·링크 만료·권한 없음)
- 모바일이 데스크톱 축소판이 아니라 우선순위에 맞게 재구성됐는가? (보드 3열 → 세그먼트 탭)
- 아름다움, 접근성, 성능 중 하나를 다른 하나의 희생으로 얻지 않았는가?
- 0값 KPI·빈 차트가 한 개도 없는가?
- "팀원 초대"가 홈·보드 첫 뷰포트에 보이는가?
