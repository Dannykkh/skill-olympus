# Style Recipes Index — 명명된 스타일 레시피 라이브러리

> 하나의 완결된 미학을 "경계 선언 + 토큰(hex) + 한·영 폰트 스택 + 패턴 + Tuning Knobs + Avoid"로
> 캡슐화한 레시피 12종. **모든 레시피는 실제 값이 박혀 있어 두 번 생성해도 같은 방향이 나옵니다.**
>
> Credits: 캡슐 문법과 일부 레시피는 [MengTo/Skills](https://github.com/MengTo/Skills)(MIT)에서 각색.
> 원본의 "값 없는 산문" 한계를 이 레포의 CSV DB(hex/한글 폰트)로 바인딩해 보완했습니다.

## 사용법

1. **아프로디테 Phase 3**: 먼저 `coder-interface-pattern-playbook.md`로 기능형/표현형과 효과 예산을 판별한 뒤, 아래 매핑의 **후보 풀**에서 레시피 2~3개를 카드로 제시.
2. **레시피 선택 시**: 해당 레시피 파일 **하나만 Read** → `## DESIGN.md 컴파일` 섹션 값으로 DESIGN.md 생성.
3. **변주**: 레시피 토큰은 시작점 — 액센트/지배색은 `color-palettes.csv`에서 산업별 팔레트로 치환 가능. 단 무드(다크/라이트, 대비 구조)는 유지.
4. **frontend-design 단독 사용 시**: 사용자 요구와 가장 가까운 레시피 1개를 골라 그 값으로 시작.

## 후보 선택 가드

- 표의 나열 순서는 추천 순위가 아닙니다. 첫 항목을 자동 선택하지 않습니다.
- 후보 3개는 **베이스 명도**, **액센트 색상 계열**, **표면 재질**, **모션 강도** 중 최소 3개가 달라야 합니다.
- 초록·주황 계열 레시피는 합쳐서 후보 3개 중 최대 1개만 허용합니다.
- `paper-tech-light`는 따뜻한 종이/산업 신호가 필요할 때, `tech-green-dark`는 모니터링·환경·핀테크 상태 신호가 필요할 때만 후보에 넣습니다.
- 방향이 모호하거나 사용자가 결과 반복을 지적하면 먼저
  [`motion-first-prompt-playbook.md`](../motion-first-prompt-playbook.md)의 서로 다른 3안 규칙으로
  구성·색상 레인을 정한 뒤 레시피를 매칭합니다.
- 데이터 도구·디렉터리·agent IDE·로딩·효과 문서면
  [`coder-interface-pattern-playbook.md`](../coder-interface-pattern-playbook.md)의 정보 구조와 모션 예산을
  먼저 고정합니다. 레시피는 표면·타입·토큰을 공급할 뿐 제품 구조를 덮어쓰지 않습니다.

## 레시피 카탈로그

| 레시피 | 무드 한 줄 | 베이스 | 디스플레이 폰트 (한·영) | 어울리는 프로젝트 | V/M/D |
|--------|-----------|--------|------------------------|-------------------|-------|
| [editorial-tech](editorial-tech.md) | 매거진 구성 × 테크 정밀 디테일 | 다크 뉴트럴 `#101014` | Fraunces + Hahmlet | 브랜드 사이트, 스튜디오, 제품 스토리 | 7/5/4 |
| [dark-glass](dark-glass.md) | frosted 글래스 + 그라데이션 엣지 | 딥 다크 `#05070D` | Space Grotesk + Pretendard | SaaS, AI 제품, 프리미엄 테크 | 5/5/4 |
| [mesh-dark-blue](mesh-dark-blue.md) | 프로시저럴 블루 메시 + 시스템 셸 | 네이비 블랙 `#030712` | Space Grotesk + Pretendard | 인프라, 플랫폼, 미래적 랜딩 | 6/6/4 |
| [swiss-brutalist](swiss-brutalist.md) | 스위스 인쇄 / 군용 터미널 | 용지 `#F4F4F0` 또는 CRT `#0A0A0A` | Archivo Black + Black Han Sans | 포트폴리오, 데이터 헤비, 실험적 | 8/2/7 |
| [notion-minimal](notion-minimal.md) | 문서형 워크스페이스, 따뜻한 모노크롬 | 본 화이트 `#F7F6F3` | Newsreader + Gowun Batang | 생산성 도구, 문서 제품, B2B | 4/2/3 |
| [skeuo-tactile](skeuo-tactile.md) | 만져지는 소프트 하드웨어 표면 | 쿨 그레이 `#E9EEF5` | Plus Jakarta Sans + Pretendard | 스마트홈, 오디오, 컨트롤 중심 UI | 4/3/4 |
| [paper-tech-light](paper-tech-light.md) | 따뜻한 종이 + 오렌지 시그널 | 오프화이트 `#FAF7F2` | Space Grotesk + Pretendard | SaaS, 가이드/문서, 개발자 도구 | 4/3/5 |
| [framed-grid-agency](framed-grid-agency.md) | 가시적 그리드 + 프레임 라인 | 라이트 `#FAFAFA` | Space Grotesk + Pretendard | 에이전시, 포트폴리오, 아카이브 | 6/4/5 |
| [book-serif-editorial](book-serif-editorial.md) | 책의 조판 규율, 세리프 지배 | 크림 `#FBF8F3` | Libre Bodoni + Gowun Batang | 출판, 블로그, 문화 콘텐츠 | 5/2/3 |
| [tech-green-dark](tech-green-dark.md) | 다크 그린 시스템 + 에메랄드 시그널 | 그린 블랙 `#04100A` | Space Grotesk + Pretendard | 모니터링, 개발자 도구, 핀테크 | 4/4/6 |
| [dopamine-bold](dopamine-bold.md) | 크림 + 잉크 보더 + 고채도 스티커 | 크림 `#FFF8E7` | Space Grotesk + Black Han Sans | 이벤트, Gen-Z 브랜드, 크리에이티브 | 8/5/5 |
| [luxury-quiet](luxury-quiet.md) | 여백 + 라이트 세리프 + 골드 헤어라인 | 아이보리 `#F8F5F0` | Cormorant + Noto Serif KR | 패션, 주얼리, 하이엔드 서비스 | 5/4/2 |

V/M/D = VARIANCE / MOTION / DENSITY 근사값 (frontend-design 프리셋 파라미터)

## 프리셋 → 레시피 후보 풀

아프로디테 Phase 3에서 프리셋 선택 후 이 풀에서 2~3개를 고릅니다. 풀 안의 순서는 우선순위가 아닙니다.

| 프리셋 | 기본 후보 풀 | 조건부 후보 |
|--------|----------------|-------------|
| 깔끔하게 | notion-minimal, framed-grid-agency, skeuo-tactile, dark-glass | paper-tech-light(따뜻한 종이/기술 문서) |
| 럭셔리하게 | luxury-quiet, editorial-tech, dark-glass, book-serif-editorial | — |
| 대담하게 | dopamine-bold, swiss-brutalist, mesh-dark-blue, editorial-tech | tech-green-dark(상태 신호가 핵심일 때) |
| 미니멀하게 | notion-minimal, book-serif-editorial, luxury-quiet, framed-grid-agency | paper-tech-light(웜 테크가 명시될 때) |
| 대시보드 | skeuo-tactile, swiss-brutalist(Tactical), mesh-dark-blue, notion-minimal | tech-green-dark(모니터링/핀테크), paper-tech-light(산업/물류) |
| 매거진 | editorial-tech, book-serif-editorial, framed-grid-agency, luxury-quiet | — |
| 직접 설정 | V/M/D 근사값 상위 4개에서 색상·명도·재질이 다른 2~3개 | 초록/주황 합계 최대 1개 |

## 레시피 공통 규칙

- **정체성 우선**: 레시피의 "이것이 아님" 경계를 지켜라 — 두 레시피를 한 페이지에 혼합하지 말 것.
- **토큰은 계약**: 레시피 hex/폰트를 그대로 DESIGN.md에 박고, 구현은 DESIGN.md만 참조 (값 재발명 금지).
- **한글 폴백 보장**: 모든 레시피의 폰트 스택은 라틴+한글 조합 — 스택 순서 규칙은 `design-md-guide.md` 참조 (라틴 먼저 = 라틴은 라틴 폰트, 한글만 폴백).
- **액센트 1색 원칙**: 레시피가 서포트 색을 정의해도 대면적 채도는 지배색 1개 (dopamine-bold의 스티커 예외도 태그 수준).
- **색 편향 방지**: CSV 행 순서나 이전 성공 사례를 추천 순위로 쓰지 않습니다. 후보군에서 색상 계열을 먼저 분산한 뒤 적합성을 채점합니다.
- **테크닉 조합**: 그림자·blur·리빌 등 구현 디테일은 [technique-recipes.md](../technique-recipes.md)에서 — 레시피가 §번호로 지시.
- **컴파일 스니펫은 기반이지 완성본이 아님**: 최종 DESIGN.md에서는 선언한 색을 `components:`가 중괄호로 참조하도록 연결할 것 — 참조 없는 색은 lint의 orphaned-tokens에 걸린다. 대비 짝꿍(on-*)이 붙은 색만 텍스트 배경으로 사용.
