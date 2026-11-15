Mode: 없음 — 하나의 매뉴얼 제목·본문을 직접 편집한다. 다중 작업·agent·terminal을 다루지 않으므로 Agent Workbench에 끼워 맞추지 않는다.
# Layout Blueprint — 사내 매뉴얼 편집기

- Source Mode: product-derived.
- 정본: ../../PRODUCT.md, ../../DESIGN.md, 2026-11-15-experience-manual-editor.md.
- 범위: Phase 2-5 저충실도 구조 판단까지만. 시각 방향·최종 토큰·앱 구현으로 진행하지 않는다.
- 화면 유형: NOT APPLICABLE — 데스크톱 우선. 폰은 반응형 변환으로 처리한다.
- 주 작업 대상: 매뉴얼 본문. 새 문서의 주 작업 대상은 제목·본문 입력면.
- 디자인 제한: 회색조·시스템 한글 폰트·본문16px. 장식 효과·모션0.
- 전용 Editor anatomy는 카탈로그에 없다. 공통 문법 #1~#9와 Sidebar 구조를 적용한다. Settings의 label+input 원리만 입력 필드에 사용하고 설정 탭 구조는 가져오지 않는다.

## 실제 볼 수 있는 와이어프레임

| 자료 | 절대경로 | 확인할 크기 |
|---|---|---|
| 내용 있는 편집기 | C:/Users/ADMINI~1/AppData/Local/Temp/aphrodite-main-first-eval-38xrnoba/candidate-editor/docs/design-refs/wireframe-editor.html | 1280×800, 390×844 |
| 새 문서 빈 상태 | C:/Users/ADMINI~1/AppData/Local/Temp/aphrodite-main-first-eval-38xrnoba/candidate-editor/docs/design-refs/wireframe-empty.html | 1280×800, 390×844 |
| 주요 상태 시트 | C:/Users/ADMINI~1/AppData/Local/Temp/aphrodite-main-first-eval-38xrnoba/candidate-editor/docs/design-refs/wireframe-states.html | 1280×800 권장 |
| 공통 CSS | C:/Users/ADMINI~1/AppData/Local/Temp/aphrodite-main-first-eval-38xrnoba/candidate-editor/docs/design-refs/wireframe.css | 세 HTML이 공통 사용 |

주요 상태 시트는 같은 편집기의 상태 설명 자료이며 세 번째 제품 화면이 아니다. HTML/CSS만 작성했으며 브라우저를 사용하지 않았다. 스크린샷·렌더 판정은 메인이 담당한다.

## Layout Blueprint — 내용 있는 문서

| # | 블록 | anatomy 체크 | 변주·선택 이유 |
|---|---|---|---|
| 1 | 앱 Sidebar | 워크스페이스 / 최근 문서·팀 폴더·템플릿·즐겨찾기 / 현재 문서 강조1 / 계정 | 승인된 탐색 네 개만 사용. Sidebar의 5~7개 기본 개수보다 제품 범위를 우선한다. |
| 2 | 문서 헤더 | 제목 입력 / 저장 상태 / 저장1 | 제목·상태·주 행동 외 설명0. 제목 입력은 현재 문서 전체에 영향. |
| 3 | 본문 도구 | 문단 스타일·굵게·기울임·목록·링크·표 / 본문 검색 / 미리보기 / 더보기 | 서식은 본문 직전, 보조 문서 행동은 더보기로 접음. |
| 4 | 본문 작업면 | h1 / 소개문 / h2 검사 절3 / 제공된 본문 | 가장 큰 면적. 실제 매뉴얼 문장이 주인공이며 별도 카드로 감싸지 않음. |
| 5 | 하단 점검 | 문서 정보 / 확대 비율 | 부가 조작을 문서 머리에서 분리하고 필요할 때 펼침. |

## Layout Blueprint — 새 문서 빈 상태

| # | 블록 | anatomy 체크 | 변주·선택 이유 |
|---|---|---|---|
| 1 | 같은 앱 탐색 | 네 탐색 대상 / 현재 새 문서 / 최근 문서 없음 / 계정 | 문서가 없어도 앱의 위치와 생성 결과가 놓일 문맥 보존. |
| 2 | 같은 문서 헤더 | 새 문서 / 아직 저장되지 않음 / 저장 | 별도 시작 CTA를 더하지 않고 기존 문서 작업 문법 유지. |
| 3 | 같은 본문 도구 | 승인된 모든 서식·검색·미리보기·더보기 | 첫 입력에서도 같은 기능 접근점. |
| 4 | 빈 편집 작업면 | 제목 label+input / 본문 label+textarea | 거대한 빈 상태 그림·설명 카드 대신 입력면 자체를 사용. 저장 후 결과가 놓일 같은 자리 확보. |
| 5 | 같은 하단 점검 | 문서 정보 / 확대 비율 | 같은 의미와 동작 위치 유지. |

## 메인부터 확보한 영역과 상단 예산

아래 값은 wireframe.css에 명시한 설계값이다. 실제 폰트·줄바꿈·레이아웃 측정 결과가 아니다.

| 조건 | 상단 전체 | 메인 시작 | 확보한 작업면 | 첫 화면의 실제 내용·입력 | 구조 판단 |
|---|---|---|---|---|---|
| 내용 있음 1280×800 | 헤더72 + 도구52 = 2행124px. 전역 탐색은 좌측에 별도 확보 | canvas y=124, 종이 y=148 | 좌208px 외 나머지1072px 중 종이 최대840px, 하단44px 외 본문632px | “입고 검사 매뉴얼”, 소개문, “1. 입고 확인”과 실제 검사 절차, 뒤 절들 | 메인 시작이400px보다 앞. 실제 보이는 절 범위는 캡처 대기 |
| 내용 있음 390×844 | 헤더76 + 도구52 = 2행128px. 탐색은 접힌 상태 | canvas·종이 y=128, 문서 첫 제목 y≈152 | 전체390px에서 본문 좌우24px, 본문 영역672px | 실제 제목·소개문·첫 검사 절. 뒤 절은 본문 스크롤 | 메인 시작이422px보다 앞. 줄바꿈·끝점은 캡처 대기 |
| 빈 문서 1280×800 | 같은2행124px | canvas y=124, 종이 y=148 | 같은840px 작업면 | 제목 label/input과 본문 label/textarea | 제목·도구만 보이는 빈 화면을 피함. 캡처 대기 |
| 빈 문서 390×844 | 같은2행128px | canvas·종이 y=128 | 전체폭, 제목 입력 y≈180, 본문 입력 y≈287 | 제목과 “첫 문장을 입력하세요.” 입력면 | 첫 입력과 결과가 놓일 영역이 모두 첫 화면에 있음. 캡처 대기 |

- 헤더는 문서를 식별하고 저장 결과를 확인하므로72/76px를 사용한다.
- 별도 도구 행52px는 본문 바로 앞에서 서식·검색·미리보기를 찾게 하기 위한 유일한 추가 행이다.
- 앱 탐색·경로·제목·상태·설명·탭을 여러 상단 행으로 쌓지 않는다.
- 하단44px는 정보·배율만 담으며 본문 중간에 끼지 않는다.
- 상단 행에서 글자 축소나 아이콘만으로 폭을 맞추지 않는다. 모바일에서 서식·검색을 접는 구조로 바꾼다.

## 조작 대상과 배치

| 조작 | 영향 대상 | 배치 | 연결된 성공 조건 |
|---|---|---|---|
| 워크스페이스·최근·폴더·템플릿·즐겨찾기·계정 | 앱 전체 | Sidebar / 모바일 탐색 | G4 |
| 제목 입력·저장·저장 상태 | 현재 문서 | 헤더, 빈 상태 제목은 작업면 | G2·G3·G6 |
| 문단 스타일·굵게·기울임·목록·링크·표 | 본문/선택 영역 | 본문 직전 도구 / 모바일 서식·삽입 | G2·G4 |
| 본문 검색 | 본문 | 도구 모음 찾기 | G4 |
| 미리보기 | 본문 결과 | 도구 모음, 같은 작업면을 읽기 상태로 전환 권장 | G3 |
| 공유·버전 기록·댓글·내보내기·문서 설정 | 문서 전체의 드문 보조 행동 | 더보기 | G4 |
| 문서 정보·확대 | 읽기·점검 | 하단 | G4 |
| 다시 저장 | 실패한 저장 | 실패 안내 바로 아래 | G5 |

## 텍스트 도식 (실제 HTML을 대체하지 않음)

데스크톱:

  [워크스페이스] | [문서 제목 + 저장 상태]                  [저장]
  [최근 문서]   | [서식 도구........] [찾기][미리보기][더보기]
  [팀 폴더]     |        [매뉴얼 제목 / 실제 검사 절차]
  [템플릿]      |        [본문 편집 또는 첫 입력]
  [즐겨찾기]    |        [뒤 절은 같은 본문 스크롤]
  [현재 문서]   |
  [계정]        | [문서 정보]                    [확대 비율]

모바일:

  [탐색] [문서 제목 + 저장 상태]              [저장]
  [서식·삽입] [찾기] [미리보기] [더보기]
  [실제 본문 제목 / 또는 제목 입력]
  [본문 검사 절차 / 또는 첫 문장 입력면]
  [뒤 내용은 본문 스크롤]
  [문서 정보]                      [확대 비율]

## 덜어내기 — 다섯 기준 판단 전

| 대상 | 처리 | 주 과업·Page Goal과의 관계 |
|---|---|---|
| 편집기 소개·목적 설명 문단 | 생략 | 제목·본문·도구 라벨이 역할을 설명하므로 G1~G6에 새 기여 없음 |
| 별도 경로 행·문서 메타 행·상태 배지 행 | 만들지 않음 | 제목과 하나의 저장 상태로 위치·진행을 전달, 본문이 밀리지 않음 |
| 공유·버전·댓글·내보내기·설정을 모두 펼친 상단 행 | 더보기로 접음 | 승인된 G4 기능은 유지하고 G1 본문 면적 확보 |
| 폰의 상시 앱 Sidebar | 탐색으로 접음 | G4 접근점을 유지하고 G2 읽기 폭 확보 |
| 폰의 서식 도구 전체 펼침 | 서식·삽입으로 접음 | 라벨·기능을 삭제하지 않고 G1·G4 동시 만족 |
| 빈 문서 일러스트·환영 카드·별도 온보딩 | 추가하지 않음 | G6 첫 입력을 늦추는 중간 단계 |
| 결과가 놓일 빈 작업면 | 유지 | G2·G6 첫 입력과 저장 후 결과가 놓일 자리 |
| 실제 문서의 소개문·검사 절차 | 유지 | 제품 정본의 편집 대상. UI 설명 문장이 아님 |
| 저장 실패의 “입력 내용은 이 화면에 남아 있습니다.” | 상태 시트에 유지 | G5 오류 회복에 필요한 안내이며 텍스트 예산 예외 |
| label·저장 상태·빈 입력 placeholder | 유지 | 입력·진행·다음 행동을 이해하는 필수 기능·접근성 텍스트 |

빈 상태의 여백은 작업면 자체다. 설명 문구나 임의 콘텐츠로 채우지 않고 입력 가능한 본문을420px 이상 확보한다.

## 다섯 기준 — 정적 구조 검토와 렌더 대기 분리

| 기준 | 산출물에서 확인할 근거 | 내린 결정·수정 | 렌더 판단 |
|---|---|---|---|
| 위계 | 가장 큰840px 종이 / 폰의 전체폭 본문, 상단124/128px, 저장 솔리드1개 | 본문부터 확보, 헤더 설명·보조 행동 행 제거 | 메인 시작·실제 보이는 내용 관찰 대기 |
| 구조 | 앱 탐색은 앱 영역, 본문 서식은 본문 직전, 문서 보조는 더보기 | 헤더에 모든 기능을 모으지 않음 | 메뉴·도구가 본문을 가리지 않는지 관찰 대기 |
| 흐름 | 내용 있음·빈 입력·저장 중·실패·저장됨·미리보기 상태 | 빈 상태에서 별도 시작 단계 없이 바로 입력, 실패 옆 다시 저장 | 실제 서비스 기능 NOT RUN, 상태 시트 시각 확인 대기 |
| 일관성 | 두 상태가 동일 헤더·도구·더보기·하단 구조와 라벨 사용 | 새 문서에서도 같은 저장 문법 유지 | 두 뷰포트 대조 대기 |
| 명료성 | “저장”·“미리보기”·“제목”·“본문” 실제 라벨, 오류 문구 한 개 | 설명으로 보완하지 않고 라벨과 배치로 전달 | 폰 줄바꿈·버튼 글자 잘림 관찰 대기 |

판정: 구조의 근거와 수정 결정을 기록했다. 실제 브라우저 관찰을 맡은 메인의 확인 전에는 다섯 기준 전체 PASS 또는 계획 완성을 선언하지 않는다. Phase 3로 넘어가지 않는다.

## Module Coverage

해석 기준 디렉터리:
C:/Users/ADMINI~1/AppData/Local/Temp/aphrodite-main-first-eval-38xrnoba/candidate-editor

| 모듈 | 정확한 SKILL.md 절대경로 | 사용·상태 |
|---|---|---|
| frontend-design | C:/Users/ADMINI~1/AppData/Local/Temp/aphrodite-main-first-eval-38xrnoba/candidate-editor/skills/frontend-design/SKILL.md | frontmatter name 일치. Phase2는 본문을 열지 않고 references/layout-block-anatomy.md의 공통 문법·Sidebar·Settings·페이지 유형·청사진 절, references/coder-interface-pattern-playbook.md의1절·7절 사용 |
| mermaid-diagrams | C:/Users/ADMINI~1/AppData/Local/Temp/aphrodite-main-first-eval-38xrnoba/candidate-editor/skills/mermaid-diagrams/SKILL.md | frontmatter name 일치. 제품 페이지3개 미만이므로 문법 본문 NOT APPLICABLE |
| ui-ux-auditor | C:/Users/ADMINI~1/AppData/Local/Temp/aphrodite-main-first-eval-38xrnoba/candidate-editor/skills/ui-ux-auditor/SKILL.md | frontmatter name 일치. Phase6 본문·감사 NOT RUN — Phase2 상한 |
| web-design-guidelines | C:/Users/ADMINI~1/AppData/Local/Temp/aphrodite-main-first-eval-38xrnoba/candidate-editor/skills/web-design-guidelines/SKILL.md | frontmatter name 일치. Phase6 본문·감사 NOT RUN — Phase2 상한 |
| design-system-starter / stitch / skill-evolve / autoresearch | 해석하지 않음 | NOT REQUESTED — 조건부 모듈 |

- Product Design Gate: NOT APPLICABLE — --plan-only이므로 추천·조회 생략.
- Web Motion Contract: NOT APPLICABLE — 모션 없음.
- Phase3 방향 렌더·Phase4 계약 고정·검증 스크립트·Phase5 구현·Phase6 감사: NOT RUN — 명시적 Phase2 상한.
- 브라우저·스크린샷·한글 줄바꿈 실측·폰트 로드 실측: NOT RUN — 메인이 담당.
- 원본 PRODUCT.md·DESIGN.md·스킬·외부 실행 폴더·공유 장부·전역 설정: 변경 없음.

## 따르기 어렵거나 모호한 규칙

1. 스킬 Options의 “Phase 0~4 실행.”과 입력의 “Phase 2(저충실도 와이어프레임 판단 게이트 포함)까지 진행하고 멈춥니다.”가 범위를 다르게 정한다. 더 구체적인 현재 입력에 따라 Phase2까지만 실행했다.
2. “HTML이면 각 뷰포트의 스크린샷을 남기고, 캡처 도구가 없으면 직접 볼 수 있는 SVG를 산출합니다.”라는 규칙은 입력의 브라우저 사용 금지·메인 캡처 분담과 함께 해석했다. 요구된 HTML을 만들고 캡처는 메인 대기로 남겼다.
3. “해당 화면의 블록 절”에 대응하는 전용 Editor 절이 없다. 공통 문법과 Sidebar, label+input 원리를 적용하고 존재하지 않는 Editor anatomy를 만들어 주장하지 않았다.

## 실제 수행한 정적 확인

- HTML 3개의 HTMLParser 파싱·한국어 lang 선언·중복 ID 없음: PASS.
- label의 for 대상 존재·로컬 링크/CSS/fragment 대상 존재: PASS.
- 외부 URL·외부 리소스 참조·script 태그 없음: PASS.
- 산출물8개가 docs/design-refs/ 안에 존재함을 확인.
- 이는 정적 참조 검사만의 결과다. 브라우저 레이아웃·스크린샷·키보드 실제 조작·본문 저장·서식 결과는 NOT RUN이며 메인이 담당한다.
