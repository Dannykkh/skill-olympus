# Style Recipes Index — 명명된 스타일 레시피 라이브러리

> 하나의 완결된 미학을 "경계 선언 + 토큰(hex) + 한·영 폰트 스택 + 패턴 + Tuning Knobs + Avoid"로
> 캡슐화한 레시피 12종. **모든 레시피는 실제 값이 박혀 있어 두 번 생성해도 같은 방향이 나옵니다.**
>
> Credits: 캡슐 문법과 일부 레시피는 [MengTo/Skills](https://github.com/MengTo/Skills)(MIT)에서 각색.
> 원본의 "값 없는 산문" 한계를 이 레포의 CSV DB(hex/한글 폰트)로 바인딩해 보완했습니다.

## 사용법

1. **아프로디테 Phase 1**: 프리셋 선택 후 아래 매핑에서 레시피 후보 2~3개를 카드로 제시.
2. **레시피 선택 시**: 해당 레시피 파일 **하나만 Read** → `## DESIGN.md 컴파일` 섹션 값으로 DESIGN.md 생성.
3. **변주**: 레시피 토큰은 시작점 — 액센트/지배색은 `color-palettes.csv`에서 산업별 팔레트로 치환 가능. 단 무드(다크/라이트, 대비 구조)는 유지.
4. **frontend-design 단독 사용 시**: 사용자 요구와 가장 가까운 레시피 1개를 골라 그 값으로 시작.

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

## 프리셋 → 레시피 후보 매핑

아프로디테 Phase 1에서 프리셋 선택 후 이 후보들을 제시:

| 프리셋 | 1순위 후보 | 2~3순위 후보 |
|--------|-----------|--------------|
| 깔끔하게 | paper-tech-light | dark-glass, tech-green-dark |
| 럭셔리하게 | luxury-quiet | dark-glass, editorial-tech |
| 대담하게 | dopamine-bold | swiss-brutalist, mesh-dark-blue |
| 미니멀하게 | notion-minimal | book-serif-editorial, luxury-quiet |
| 대시보드 | tech-green-dark | swiss-brutalist(Tactical), paper-tech-light |
| 매거진 | editorial-tech | book-serif-editorial, framed-grid-agency |
| 직접 설정 | V/M/D 근사값이 가장 가까운 레시피 제시 | — |

## 레시피 공통 규칙

- **정체성 우선**: 레시피의 "이것이 아님" 경계를 지켜라 — 두 레시피를 한 페이지에 혼합하지 말 것.
- **토큰은 계약**: 레시피 hex/폰트를 그대로 DESIGN.md에 박고, 구현은 DESIGN.md만 참조 (값 재발명 금지).
- **한글 폴백 보장**: 모든 레시피의 폰트 스택은 라틴+한글 조합 — 스택 순서 규칙은 `design-md-guide.md` 참조 (라틴 먼저 = 라틴은 라틴 폰트, 한글만 폴백).
- **액센트 1색 원칙**: 레시피가 서포트 색을 정의해도 대면적 채도는 지배색 1개 (dopamine-bold의 스티커 예외도 태그 수준).
- **테크닉 조합**: 그림자·blur·리빌 등 구현 디테일은 [technique-recipes.md](../technique-recipes.md)에서 — 레시피가 §번호로 지시.
- **컴파일 스니펫은 기반이지 완성본이 아님**: 최종 DESIGN.md에서는 선언한 색을 `components:`가 중괄호로 참조하도록 연결할 것 — 참조 없는 색은 lint의 orphaned-tokens에 걸린다. 대비 짝꿍(on-*)이 붙은 색만 텍스트 배경으로 사용.
