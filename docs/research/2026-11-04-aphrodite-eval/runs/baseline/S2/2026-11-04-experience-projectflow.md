# Experience Contract: 플로우보드 첫 실행 (홈 → 설정 3단계 → 보드)

> 상태: **Phase 2-3 초안** (2026-11-04). Phase 2-5 와이어프레임 게이트 결과를 반영했다.
> Desktop Structure·Mobile Transformations·Role Variants·Performance·Accessibility는 와이어프레임을 그리는 데 필요한
> 만큼만 정했고 Phase 4에서 정교화한다. 이 계약은 아직 Phase 4-4 검증 게이트를 통과한 확정본이 아니다.

## Source Mode

- Mode: product-derived
- Evidence: `docs/design-refs/2026-11-04-brief-projectflow.md`, `docs/plan/projectflow/spec.md`(공유 전제·P1·P2·시스템 역할 표·에코시스템 맵), `docs/plan/projectflow/interview.md`(Soft Gate 3 MVP 포함·제외), `docs/athena/projectflow.md`(CONDITIONAL GO, 삭제 권고), 루트 `DESIGN.md`, 현재 `src/pages/Home.tsx`

## Product Facts

| Claim | Source | Captured at | Freshness/status | Allowed presentation |
|---|---|---|---|---|
| 초대받은 사람은 '팀원' 권한으로 들어와 할 일 처리와 댓글을 할 수 있고, 팀 설정 변경·팀원 내보내기는 할 수 없다 | `spec.md` 시스템 역할 표 (`member` 주요 업무·금지 행동) | 2026-11-04 | current | 설정 2/3 도움말, 403 화면에 그대로 표시 가능 |
| 로그인은 이메일 링크로 한다 (비밀번호 없음) | `spec.md` 기존 환경 | 2026-11-04 | current | 로그인·초대 메일 안내에 표시 가능 |

## Benchmark Sources

- 해당 없음 — product-derived. URL·스크린샷·HTML 벤치마크를 받지 않았다.

## Page Goal

- 사용자가 이 화면에서 달성할 결과: (owner) 가입 당일 첫 프로젝트를 만들고, 팀원을 초대하고, 첫 할 일을 배정해 팀 보드를 연다. (member) 초대 링크로 들어와 내 할 일을 찾는다.
- 제품이 얻어야 하는 결과: 가입 후 24시간 안에 첫 프로젝트를 만드는 계정 비율을 30% → 60% 이상으로 (spec 성공 기준). 초대 경로를 설정 메뉴 밖으로 꺼낸다 (P2).
- 관찰 가능한 성공 조건: 홈 첫 화면에서 추가 클릭 없이 프로젝트 이름 입력이 가능하다 / 1단계 완료 시점에 프로젝트가 생성되어 이후 이탈해도 남는다 / 3단계 뒤 보드에 담당자가 있는 첫 카드와 초대 상태가 보인다 / member 첫 화면에 초대한 사람·프로젝트·내 할 일이 보인다.

## Audience and Tasks

- 주요 사용자와 사용 상황: 5~20명 소규모 팀. `owner`(팀 리더)는 방금 이메일 링크로 가입해 데스크톱에서 처음 접속. `member`(팀원)는 초대 메일 링크로 데스크톱 또는 휴대폰에서 처음 접속.
- 최우선 과업: owner의 "첫 프로젝트 만들기 → 팀원 초대 → 첫 할 일 배정".
- 시작 조건과 완료 조건: 시작 = 프로젝트 0개인 계정의 홈. 완료 = 보드에 첫 할 일 카드(담당자 포함)와 초대 상태가 보이는 설정 완료 결과 화면. 최소 완료 = 1단계 "프로젝트 만들기" 성공.
- 주요 불안·마찰·실패 가능성: 빈 화면에서 무엇을 할지 모름(P1) / 초대 경로를 못 찾음(P2) / 동료에게 어떤 메일이 가는지 모름 / 마법사가 길어 보임 / 네트워크 실패로 입력이 사라질까 걱정 / (member) 무엇에 초대됐는지 모름, 초대 링크 만료.

사람 카드 (brief 2절 요약 — 화면 안 정보 순서의 근거):

| 사람 | 마음 | 알고 싶은 것 → 답이 놓일 자리 |
|---|---|---|
| owner 김도윤 (**핵심 사람**) | 막막함, 시간 들이기 싫음 | 지금 뭘 하나 → 홈 첫 화면 입력란 / 얼마나 남았나 → 단계 표시 / 팀원에게 무슨 메일이 가나 → 2단계 메일 미리보기 / 끝나면 뭐가 남나 → 1·3단계 보드 미리보기, 완료 결과 |
| member 박지윤 | 경계, 확인하러 옴 | 누가 무엇에 초대했나 → 보드 상단 안내 / 내 일은 → "나에게 배정됨" 카드 / 무엇을 바꿀 수 있나 → 권한차등 화면, 403 안내 |

여정표:

| 시기 | owner 할 일 | owner 막히는 순간 → 상태 | member 할 일 | member 막히는 순간 → 상태 |
|---|---|---|---|---|
| 사용 전 | 가입 링크 클릭 | 로그인 링크 만료 → `auth-expired` | 초대 메일 받기 | 메일을 늦게 엶 → `invite-expired` |
| 사용 중 | 이름 입력 → 초대 → 첫 할 일 | 생성 실패 → `error`(입력 유지) / 주소 형식 오류 → 필드 오류 / 일부 발송 실패 → `partial` / 중간 이탈 → `resume` | 보드에서 내 카드 열기 | 배정 0개 → `empty`(member) / 팀 설정 URL 진입 → `permission` |
| 사용 후 | 보드 확인, 추가 초대 | 아무도 수락 안 함 → 보드 헤더 "수락 대기 N명" → 팀원 화면에서 다시 보내기 | 상태 변경·댓글 | 다른 사람 변경으로 보드가 낡음 → `stale` |

## Header and Navigation

- 브랜드·현재 위치·전역 이동·주 행동의 순서: 팀 이름(한결디자인랩) → 현재 위치(활성 내비 1개) → 전역 이동 → 화면별 primary 1개.
- 데스크톱 내비게이션: 좌측 232px 고정 내비 — 팀 이름 / 홈 / 프로젝트(하위 목록, 0개면 "아직 없음") / 팀원 / 팀 설정(owner만) / 하단 "팀원 초대"(owner만, 보조 버튼) + 내 계정. 보드 2차 헤더 — 프로젝트 이름(H1) → 참여·수락 대기 요약("수락 대기 N명"은 팀원 화면 링크, owner만) → "+ 할 일 추가"(primary).
- 모바일 대체 구조: 52px 상단 바(팀 이름 또는 설정 중 프로젝트 이름 + "메뉴" 버튼) → 메뉴 시트에 전역 내비와 "팀원 초대". 화면별 primary는 하단 고정.

## Core Message

- 핵심 약속: 프로젝트 이름 하나로 시작해 오늘 팀 보드를 연다.
- 설명: 이름 → 팀원 초대 → 첫 할 일의 3단계. 1단계만 해도 보드가 생기고, 2·3단계는 나중에 이어서 할 수 있다.
- 증거: 단계 표시(1/3·2/3·3/3), 만들면 생길 보드 윤곽 미리보기, 보내기 전 초대 메일 미리보기, 완료 후 실제 카드와 초대 상태. 고객 수치·후기·배지는 쓰지 않는다.
- 사용자가 다음에 이해해야 할 것: 보드의 세 열(할 일·진행 중·완료)과 카드 하나가 할 일 하나라는 것, 수락 대기인 팀원이 있다는 것.

## Content Integrity

| Content item | Classification | Evidence | Presentation rule |
|---|---|---|---|
| member 권한 설명 문구 | verified | spec 시스템 역할 표 | 그대로 표시 |
| 설정 3단계 순서(이름 → 초대 → 첫 할 일) | hypothesis | spec 공유 전제의 동사 순서 | 화면 순서로만 사용. "5분이면 끝나요" 같은 시간 약속 카피 금지 (interview "가입 5분"은 목표이지 측정값 아님) |
| 1단계 완료 시 프로젝트 즉시 생성 | hypothesis | 성공 지표 정의(첫 프로젝트 생성 계정 비율)에서 유도 | API 계약 확인 전까지 prototype. 불가하면 resume 상태 재설계 |
| 수락 전 팀원에게 할 일 배정 가능 | hypothesis | 근거 없음 (API 미확인) | 확인 전 운영 노출 금지. 불가하면 3단계 담당자 목록을 "김도윤 (나)"와 참여 중 인원으로 제한하고 도움말 삭제 |
| 초대 링크 유효 기간 7일 | hypothesis | 근거 없음 | 확인 전 운영 노출 금지 (메일 미리보기·만료 화면 문구) |
| 보드 열 이름 할 일·진행 중·완료 | hypothesis | spec에 할 일 상태 정의 없음 | prototype으로만 사용 |
| 초대 메일 제목·본문 | prototype | 이 계약의 초안 | 발신 주소·발신자 표기 확정 필요 |
| 팀·사람·이메일·프로젝트·할 일 이름 | prototype | `## Scenario Facts` | 운영 데이터로 승격 금지 |
| spec 내부 지표(60%·30%·70%) | hypothesis | spec 문서 진술, 출처 데이터 미확인 | 화면 카피로 사용 금지 |

## Section Order

대표 화면 `home-first-run` (프로젝트 0개 owner의 홈):

1. 설정 단계 표시 (1 프로젝트 이름 · 2 팀원 초대 · 3 첫 할 일): "얼마나 걸리나"에 먼저 답한다.
2. 제목 "첫 프로젝트를 만들어 보세요" + 설명 1줄: "지금 뭘 하나"와 "이름만 정하면 보드가 생긴다"를 말한다.
3. 프로젝트 이름 입력 + "프로젝트 만들기": 읽자마자 행동. 별도 시작 버튼 없음 (P1 빈 화면 제거).
4. "만들면 생기는 보드" 윤곽 미리보기: "끝나면 뭐가 남나"에 답하는 보조 정보. 입력보다 뒤.

이어지는 화면의 블록 순서는 Layout Blueprint(`2026-11-04-layout-projectflow.md`)가 정본이다.

## CTA Strategy

- Primary: 화면마다 1개. `home-first-run` "프로젝트 만들기" → 프로젝트 생성 후 `setup-invite` / `setup-invite` "초대 보내기" → 발송 후 `setup-task` / `setup-task` "할 일 배정하기" → `setup-done` / 보드 "+ 할 일 추가" → 할 일 입력 / `home-resume` "설정 이어서 하기" → 멈춘 단계 / 403 "보드로 돌아가기" / 초대 만료 "김도윤님에게 메일 쓰기".
- Secondary: 텍스트 링크 1개까지 — "나중에 초대하기"(2단계), "건너뛰고 보드 보기"(3단계), "보드로 가기"(home-resume). 사이드바 "팀원 초대"는 owner의 상시 보조 버튼.
- 반복 규칙: 같은 행동은 화면당 1곳. 보드에서 "+ 할 일 추가"는 헤더(모바일은 하단 고정) 1곳만 — 열 안 추가 행은 두지 않는다(와이어프레임 관찰 후 결정). "팀원 초대" 버튼은 사이드바 1곳, 보드 헤더는 "수락 대기 N명" 링크로 대체.
- 완료·실패 피드백: 같은 행동은 같은 동사 — "초대 보내기" → "초대 메일을 보냈어요", "할 일 배정하기" → "방금 배정" 카드 표시. 실패 시 버튼 문구를 바꾸지 않고 같은 버튼을 다시 누르게 한다 ("프로젝트 만들기"를 다시 눌러 주세요).

## Trust Strategy

- 사용자가 불안을 느끼는 지점: 동료에게 메일을 보내기 직전, 입력 후 실패, (member) 낯선 링크로 들어온 직후, 권한 없는 화면.
- 그 직전에 제시할 근거: "초대 보내기" 바로 위에 받는 사람에게 가는 메일 미리보기(보낸 사람 이름·프로젝트·팀 이름·링크 유효 기간)와 초대받은 사람의 권한 설명. 실패 알림에는 "입력한 이름은 그대로 있어요". member 첫 보드에는 초대한 사람 이름과 프로젝트 이름.
- 출처·날짜·검증 가능성: 권한 설명은 spec 역할 표. 링크 유효 기간은 hypothesis — 확인 전 운영 노출 금지.
- 근거가 없을 때 생략할 요소: 고객 수·후기·보안 배지·"N개 팀이 사용 중" 같은 사회적 증거, 소요 시간 약속.

## Asset Provenance

- 해당 없음 — 프로젝트 내부 자산만 사용. 이번 단계는 그레이스케일 와이어프레임이며 로고·사진·아이콘·웹폰트를 쓰지 않았다 (와이어프레임 글꼴은 시스템 한글 글꼴 Malgun Gothic, 시각 단계에서 `DESIGN.md`의 Pretendard Variable로 교체).

## Desktop Structure

- 기준 뷰포트: 1280×800.
- 첫 뷰포트: (home-first-run) 단계 표시 → 제목·설명 → 입력+primary 한 줄 → 보드 윤곽. 스크롤 없이 primary와 결과 미리보기까지 보임. (보드) H1·요약·primary → 결과/안내 배너 → 3열.
- 그리드·pane·콘텐츠 위계: 좌측 내비 232px + 본문 1열. 설정 단계 본문은 최대 680px 좌측 정렬, 보드는 본문 전폭 3열. Interface Mode는 Agent Workbench 공간 모델 차용(근거·한계는 Layout Blueprint).
- 스크롤 흐름과 밀도 변화: 설정 단계는 저밀도(필드 1~2개). 보드는 중밀도(DESIGN.md "밀도 중간"), 열 안 세로 스크롤.

## Mobile Transformations

| Desktop element | Operation | Mobile result | Reason |
|---|---|---|---|
| 좌측 내비(팀·홈·프로젝트·팀원·팀 설정) | replace | 52px 상단 바(팀 이름) + "메뉴" 시트 | 모바일 주 과업(내 할 일 확인·댓글·설정 이어하기)에서 전역 이동은 드묾. 232px를 콘텐츠에 돌려줌 |
| 사이드바 "팀원 초대" (owner) | collapse | 메뉴 시트 안 항목 | 상시 노출 공간 없음. 보드의 "수락 대기 N명" 링크가 팀원 화면 진입을 유지 |
| 설정 단계 표시(번호+이름 3개) | compress | 번호 원 3개 + 현재 단계 이름만 | 390px 한 줄 유지 |
| 입력 옆 primary 버튼 | sticky | 하단 고정 풀폭 primary + 아래 보조 텍스트 링크 | 엄지 도달 영역, 긴 도움말과 메일 미리보기가 있어도 행동이 가려지지 않음 |
| 보드 헤더 "+ 할 일 추가" | sticky | 하단 고정 풀폭 primary | 같은 행동 한 곳 원칙 유지 |
| 보드 3열 | replace | 상태 탭(할 일 N · 진행 중 N · 완료 N) + 선택한 한 열 | 390px 3열은 카드 제목이 잘림. member의 첫 질문은 열 비교가 아니라 "내 일" |
| 설정 완료 결과 배너(가로 체크 3개) | compress | 세로 3행 | 가로 폭 부족, 순서 의미 유지 |
| 보드 윤곽 미리보기(설정 1·3단계) | compress | 3열 축소 윤곽 | "끝나면 뭐가 남나" 답 유지, 하단 CTA 고정이라 스크롤 부담 없음 |
| 초대 메일 미리보기 | retain | 같은 위치·순서 | 초대 직전 신뢰 근거 |
| 할 일 상세 우측 패널 | replace | 전체 화면 상세 | 패널 폭 확보 불가 (Phase 4에서 그림) |

## States

| State | Trigger | User sees | Available action | Recovery |
|---|---|---|---|---|
| loading | "프로젝트 만들기" 누름 | 300ms 이후 버튼 "만드는 중…"(비활성), 입력 잠금 | 기다림 | 10초 넘으면 error로 전환 |
| loading | 보드 진입 | 300ms 이후 3열 skeleton + "보드를 불러오는 중이에요…", "+ 할 일 추가" 비활성 | 내비 이동 | 실패 시 보드 error("보드를 불러오지 못했어요" + 다시 시도) |
| empty | owner, 프로젝트 0개 | 홈 = 설정 1/3 입력 화면 (`home-first-run`) | "프로젝트 만들기" | — |
| empty | 보드의 빈 열 | "아직 진행 중인 일이 없어요." / "끝낸 일이 여기에 모여요." | "+ 할 일 추가" | — |
| empty | member, 배정된 할 일 0개 | 안내 배너 "아직 나에게 배정된 할 일이 없어요" + 보드 | "+ 할 일 추가" | — |
| error | 프로젝트 생성 실패 | 입력값 유지 + 알림 "프로젝트를 만들지 못했어요. 연결이 끊긴 것 같아요. 입력한 이름은 그대로 있으니 '프로젝트 만들기'를 다시 눌러 주세요." | 같은 primary 재시도 | 성공 시 2/3로 |
| error | 이메일 형식 오류 | 해당 필드 테두리 강조 + "이메일 주소 형식을 확인해 주세요. 예: seojun.lee@hangyeol.kr", 제출 시 첫 오류로 포커스 | 수정 | 수정 즉시 오류 해제 |
| partial | 일부 주소 발송 실패 (외부 메일 API) | 3/3 상단 결과 문구에 "이서준님에게 보내지 못했어요" + 해당 주소 "발송 실패" | "다시 보내기", 그대로 다음 단계 | 팀원 화면에서도 다시 보내기 |
| success | 3단계 완료 | 보드 + "설정을 마쳤어요" 결과 배너(✓ 프로젝트 만들기 · … 팀원 2명 초대 · 수락 대기 · ✓ 첫 할 일 배정) + "방금 배정" 카드 | 닫기, "+ 할 일 추가" | — |
| resume | 2·3단계에서 이탈 | 홈 "'11월 웹사이트 개편' 설정이 2/3단계에서 멈췄어요" | "설정 이어서 하기", "보드로 가기" | 이어서 하기로 멈춘 단계 |
| permission | member가 팀 설정 URL 직접 입력 | 403 "팀 소유자만 볼 수 있는 페이지예요" + 소유자 이름 | "보드로 돌아가기" | — |
| expired | 만료된 초대 링크 | "초대 링크가 만료됐어요" + 유효 기간 + 초대한 사람 | "김도윤님에게 메일 쓰기" | 새 초대 메일 |
| stale | 다른 사람이 보드를 바꿈 | 보드 상단 "새 변경 사항이 있어요 · 새로 고침" (hypothesis — 실시간 반영 방식 미정) | 새로 고침 | — |

## Object Flows

| Object | Create | View | Edit | After |
|---|---|---|---|---|
| 프로젝트 | home-first-run (설정 1/3) | project-board | n/a — spec·interview의 MVP 범위에 프로젝트 이름 변경·삭제가 정의되지 않음 (사용자 확인 필요) | setup-done (설정 완료 결과 배너 + 첫 카드) |
| 팀원 초대 | setup-invite (설정 2/3) · 사이드바 "팀원 초대" → members 초대 입력 | members (수락 대기·참여 중·발송 실패) | members — 다시 보내기·초대 취소 (owner) | invite-sent (보낸 결과: setup-task 상단 결과 문구 / members 토스트 "초대 메일을 보냈어요") |
| 할 일 | setup-task (설정 3/3) · 보드 "+ 할 일 추가" | task-detail (보드 우측 패널) | task-detail — 제목·담당자·상태 변경 (삭제 여부는 Phase 4) | task-assigned (보드 '할 일' 열의 "방금 배정" 카드 + 상태 알림) |
| 초대 수락 (member) | invite-accept (메일 링크) | project-board (member 시점) | n/a — 수락 취소·팀 나가기가 spec에 없음 | board-member 첫 진입 안내 ("김도윤님이 '11월 웹사이트 개편'에 초대했어요" + 나에게 배정됨 카드) |

## Scenario Facts

| Fact | Value | Screens |
|---|---|---|
| 팀 이름 | 한결디자인랩 | 전 화면 사이드바·모바일 상단 바, 초대 메일 미리보기 |
| owner | 김도윤 | 사이드바(내 계정), 초대 메일 미리보기, board-member 안내, permission, invite-expired |
| 초대 대상 | 박지윤 jiyoon.park@hangyeol.kr · 이서준 seojun.lee@hangyeol.kr | setup-invite, setup-task, setup-done, board-member |
| 형식 오류 예시 입력 | seojun.lee@hangyeol (도메인 끝 누락) | setup-invite |
| 프로젝트 이름 | 11월 웹사이트 개편 | 1단계 이후 전 화면 |
| 첫 할 일 | 메인 배너 문구 초안 쓰기 · 담당 박지윤 | setup-task, setup-done, board-member |
| 설정 단계 이름 | 1 프로젝트 이름 · 2 팀원 초대 · 3 첫 할 일 | home-first-run, create-error, setup-invite, setup-task, home-resume |
| 할 일 상태 이름 (보드 열) | 할 일 · 진행 중 · 완료 | setup 미리보기, setup-done, board-member, board-loading |
| 초대 상태 이름 | 수락 대기 · 참여 중 · 발송 실패 | setup-task, setup-done, members |
| 초대일 / 링크 유효 기간 | 2026년 11월 4일(수) 발송 / 11월 11일(수)까지 (hypothesis) | setup-invite 메일 미리보기, invite-expired |
| owner 시점 인원 (setup-done) | 참여 중 1명 · 수락 대기 2명 | setup-done |
| member 시점 인원 (board-member, 박지윤 수락 후) | 참여 중 2명 (이서준 수락 대기는 member에게 숨김) | board-member |
| 설정 중단 지점 (resume 예시) | 2/3단계 (프로젝트만 만든 상태) | home-resume |

## Performance Budget

- 첫 화면 필수 자산: 앱 셸(내비)과 설정 1단계 폼만. 보드 미리보기는 CSS 도형이라 이미지 0개.
- 지연 가능한 자산: 보드 데이터(skeleton 뒤), 팀원 목록, 할 일 상세.
- 폰트 weight·이미지·영상·모션 예산: 시각 단계에서 Pretendard Variable 1파일(DESIGN.md). 이미지·영상 0. 장식 모션 0, 상태 피드백 모션만(Phase 4-3).
- 저성능 기기와 느린 네트워크 폴백: 300ms 미만 응답은 로더 없음. 생성·발송 실패 시 입력 보존. 오프라인이면 생성 버튼을 눌렀을 때 error 상태로.

## Accessibility Contract

- 문서·랜드마크·헤딩 읽기 순서: `nav`(전역) → `main` → 단계 목록(`ol`, 현재 단계 `aria-current="step"`) → H1 → 폼. 보드는 H1(프로젝트 이름) → 열마다 H2.
- 키보드·포커스·Escape 동작: 1단계 진입 시 이름 입력에 포커스. Enter로 primary 실행. 제출 오류 시 첫 오류 필드로 포커스. 결과·안내 배너 "닫기"는 Escape로도 닫힘. 메뉴 시트는 포커스 가둠 + Escape 닫기.
- 레이블·오류 연결·상태 알림: 모든 입력에 보이는 레이블. 오류 문구는 `aria-describedby`로 필드에 연결. 생성 실패 알림은 `role="alert"`, 설정 완료·초대 결과는 `role="status"`. 로딩 영역 `aria-busy`.
- 대비·색 외 신호·터치 타깃: 수락 대기는 점선 아바타 + 문구, 발송 실패는 문구 + 아이콘(색만으로 구분 금지). 모바일 primary 48px 높이.
- reduced-motion과 대체 경험: 장식 모션 없음. 상태 전환 모션(Phase 4-3에서 정함)은 `prefers-reduced-motion`에서 즉시 전환.

## Adopt

- 해당 없음 — product-derived. 벤치마크에서 채택할 원리 없음.

## Adapt

- 해당 없음 — product-derived. (참고: 내부 플레이북 Agent Workbench의 공간 모델·상태 위계를 보드에 차용 — 근거는 Layout Blueprint)

## Avoid

- 해당 없음 — product-derived 벤치마크 대상 없음. 대신 제품 범위 회피 항목: 팀 성과 KPI 대시보드·지표 카드 홈(athena 삭제 권고), 시간 추적, 리포트 내보내기, Slack 연동, 템플릿 갤러리·샘플 데이터 프로젝트(MVP 포함 기능에 없음), 소요 시간 약속 카피.

## System Roles

| 역할 ID | 표시명 | 화면 처리 (spec `화면` 열) | 출처 |
|---|---|---|---|
| owner | 팀 소유자 | 공용 권한차등 — 전권 기준 화면 | spec.md 시스템 역할 표 |
| member | 팀원 | 공용 권한차등 — 아래 변형표 | spec.md 시스템 역할 표 |

`operation-scenarios.md`가 없어 거부 동작 어휘를 물려받지 못했다. 아래 값은 SKILL 4-1-1 어휘로 쓴 Phase 2 초안이다.

## Role Variants

| 요소 | owner | member |
|---|---|---|
| 첫 실행 설정 1~3단계 | 표시 | 숨김 (초대 링크로 보드에 바로 들어옴) |
| 사이드바·모바일 메뉴 "팀원 초대" | 표시 | 숨김 (hypothesis — spec 금지 행동에는 없으나 주요 업무에도 없음, 사용자 확인 필요) |
| 보드 헤더 "수락 대기 N명" 링크 | 표시 | 숨김 (참여 중 인원만 표시) |
| 전역 내비 "팀 설정" | 표시 | 숨김 (금지 행동 "팀 설정 변경". MVP에 권한 상승 경로가 없어 존재를 알릴 이유 없음) |
| 팀원 화면 목록 | 표시 | 읽기전용 |
| 팀원 화면 "내보내기"·"다시 보내기"·"초대 취소" | 표시 | 숨김 (금지 행동 "팀원 내보내기") |
| 새 프로젝트 만들기 | 표시 | 숨김 (hypothesis — 사용자 확인 필요) |
| 보드 "+ 할 일 추가" | 표시 | 표시 |
| 할 일 상태 변경·댓글 | 표시 | 표시 |
| 할 일 담당자 변경 | 표시 | 표시 (hypothesis — "할 일 처리" 범위 확인 필요) |
| 팀 설정 URL 직접 진입 | 표시 | 403 (진입 차단 — 라우팅 결과, "보드로 돌아가기" 제공) |

역할을 지웠을 때 빈 화면 점검: member의 보드는 배정 0개여도 "+ 할 일 추가"와 안내 문구가 남는다. member 홈은 참여 프로젝트 목록이 있어 비지 않는다.

## Prompt Contract

GOAL — 가입 직후 빈 홈을 "프로젝트 이름 입력 → 팀원 초대 → 첫 할 일 배정 → 보드"로 이어지는 첫 실행 경험으로 바꾼다
AUDIENCE — 5~20명 팀의 리더(owner, 핵심)와 초대받은 팀원(member). 차분하고 실무적인 업무 도구를 기대
TASK — owner: 첫 프로젝트 생성(1단계에서 생성 완료), 초대, 첫 할 일 배정 / member: 초대 링크로 들어와 내 할 일 확인
FLOW — home-first-run → setup-invite → setup-task → setup-done(보드). 2·3단계 건너뛰기 가능, 이탈 시 home-resume. member: invite-accept → board-member
HEADER — 좌측 내비(팀 이름·홈·프로젝트·팀원·팀 설정[owner]·하단 팀원 초대[owner]) / 보드 헤더 H1 + 인원 요약 + "+ 할 일 추가"
MESSAGE — "첫 프로젝트를 만들어 보세요 — 이름만 정하면 보드가 바로 생겨요"
FACTS — `## Product Facts`와 `## Scenario Facts`만 인용. 사실 표에 없는 날짜·숫자·상태 이름을 지어내지 말 것
CONTENT_INTEGRITY — hypothesis 항목(수락 전 배정, 링크 7일, 열 이름, 즉시 생성)은 API 확인 전 운영 노출 금지
SECTION_ORDER — 단계 표시 → 제목·설명 → 입력+primary → 결과 미리보기 (설정 화면) / H1·요약·primary → 결과·안내 배너 → 3열 (보드)
CTA — 화면당 primary 1개 + 보조 텍스트 링크 0~1개. 같은 행동은 한 곳, 같은 동사
TRUST — 초대 직전 메일 미리보기 + 팀원 권한 설명, 실패 시 입력 보존 문구, member 첫 진입 시 초대한 사람·프로젝트
ASSETS — 이미지·로고·영상 없음. 시각 토큰은 `DESIGN.md`
LAYOUT — 좌측 내비 + 본문 1열(설정 최대 680px), 보드 3열. Layout Blueprint `2026-11-04-layout-projectflow.md` 정본
RESPONSIVE — `## Mobile Transformations` 표 그대로 (내비 replace, primary sticky, 보드 상태 탭 replace)
STATES — `## States` 표의 13개 상태를 모두 구현
PERFORMANCE — 이미지 0, 장식 모션 0, 300ms 미만 로더 없음
ACCESSIBILITY — `## Accessibility Contract` 그대로
PRESERVE — 단계 3개 구조, 1단계 즉시 생성, 화면당 primary 1개, member 숨김 항목
EXCLUDE — KPI 대시보드·지표 카드, 시간 추적, 리포트 내보내기, Slack, 템플릿 갤러리, 소요 시간 약속, 고객 수·후기·배지
SUCCESS — 홈 첫 화면 5초 안에 "이름 넣고 만들기, 3단계"를 말할 수 있음 / 키보드만으로 3단계 완주 / 실패·권한·만료에서 다음 행동이 보임

## Success Checks

- 첫 5초 안에 핵심 약속과 주 행동을 설명할 수 있는가? — 와이어프레임 home-first-run 데스크톱·모바일에서 확인 (Layout Blueprint 위계 판정)
- 화면의 사실·수치·후기·브랜드 자산이 출처와 상태를 가지며, unverified 항목을 사실처럼 보이지 않는가? — hypothesis 4건은 운영 노출 전 확인 필요로 표시
- 주요 과업을 막는 상태·정보·행동 누락이 없는가? — 13개 상태 정의. 할 일 상세·팀원 화면·로그인은 Phase 4에서 그림
- 모바일이 데스크톱 축소판이 아니라 우선순위에 맞게 재구성됐는가? — 내비 replace, 보드 상태 탭 replace, primary sticky
- 아름다움, 접근성, 성능 중 하나를 다른 하나의 희생으로 얻지 않았는가? — 시각 단계(Phase 3) 이후 판정
