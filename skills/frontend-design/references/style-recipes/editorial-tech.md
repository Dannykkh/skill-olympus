# 에디토리얼 테크 (editorial-tech)

> 프리미엄 매거진 스프레드와 하이엔드 테크 제품 인터페이스의 중간. 서사적 구성 + 기계적 정밀 디테일.
> Credits: MengTo/Skills(MIT) `editorial-tech` 각색 — 원본에 없던 토큰/폰트 바인딩 추가.

## 정체성 (경계 선언)

- **이것**: 비대칭 에디토리얼 구성, 시네마틱 미디어 밴드, 모노 유틸리티 라벨, 절제된 액센트 1색.
- **이것이 아님**: 제네릭 기업 SaaS 아님. 순수 매거진 미니멀리즘도 아님 — 그 중간에서 "엔지니어링된 잡지"로.

## 토큰

```css
:root {
  --et-bg: #101014;            /* near-black 뉴트럴 (순수 #000 금지) */
  --et-surface: #17171c;
  --et-text: #f4f4f5;
  --et-copy: #a1a1aa;
  --et-line: rgba(244, 244, 245, 0.14);
  --et-line-strong: rgba(244, 244, 245, 0.28);
  --et-accent: #e05d38;        /* 액센트 1색 — 브랜드 색으로 치환 가능 */
  --et-on-accent: #101014;
}
```

라이트 변형: `--et-bg: #f6f5f2; --et-surface: #ffffff; --et-text: #191919; --et-copy: #57534e; --et-line: rgba(25,25,25,0.14)`.

## 폰트 (한·영 스택)

| 역할 | 스택 | 비고 |
|------|------|------|
| Headline | `"Fraunces", "Hahmlet", serif` | 고대비 세리프. 한글은 Hahmlet(9 weights)으로 폴백 |
| Body | `"DM Sans", "Pretendard", sans-serif` | 라틴은 DM Sans, 한글은 Pretendard |
| Label/Meta | `"JetBrains Mono", "IBM Plex Sans KR", monospace` | 모노 유틸리티 — 스텝·타임스탬프·단위 |

```css
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Hahmlet:wght@400;600;700&family=DM+Sans:wght@400;500;700&family=JetBrains+Mono:wght@400;500&family=IBM+Plex+Sans+KR:wght@400;500&display=swap');
@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css');
```

## Visual Target

- 강한 컬럼 구조의 비대칭 구성 + 의도된 네거티브 스페이스 + 명확한 공간 리듬.
- 거대한 표현적 헤드라인 옆에 조용한 유틸리티 텍스트(모노 라벨, 작은 메타데이터, 절제된 카피).
- 시네마틱 미디어 밴드 — 파노라마 이미지 스트립, 인셋 사진 패널이 그리드를 가로지르며 서사를 만든다.
- 가는 구분선, 그리드 트레이스, 섹션 룰, 테크니컬 마커로 "소프트"가 아닌 "엔지니어링된" 느낌.

## 권장 패턴

- **내비게이션**: 넓은 간격의 희소한 톱바, 음소거된 링크, 정밀한 중앙 마크.
- **히어로**: 한쪽에 오버사이즈 에디토리얼 헤드라인 + 다른 쪽에 컴팩트 카피, 그 아래를 가로지르는 시네마틱 밴드.
- **정보 모듈**: 스텝 리스트, 챕터 마커, 모노 카운터(`01 / 04`), 타임라인 틱, 보더 pill, 메타데이터 클러스터.
- **컨테이너**: 얇은 프레임 패널, 통제된 이미지 크롭, 그리드를 강화하는 구조선 (→ technique-recipes §5 Container Lines).
- **CTA**: 크리스프한 지오메트리의 프리미엄 컨트롤 — 거대한 마케팅 버튼 금지.

## 모션 기본값

- 마스크드 텍스트 리빌(→ technique-recipes §7), 차분한 패럴랙스(speed 0.12~0.2), 느린 미디어 드리프트.
- hover는 라인 밝아짐(`--et-line` → `--et-line-strong`)과 같은 기술적 반응. 바운스/플레이풀 금지.

## Tuning Knobs

- **에디토리얼 강도**: 비대칭·오버랩 정도.
- **테크니컬 밀도**: 룰/마커/모노 라벨/메타데이터 양.
- **액센트 절제**: active 상태·숫자 하이라이트·현재 스텝·핵심 CTA에만.
- **미디어 비중**: 시네마틱 이미지 vs 순수 타이포 비율.

## Avoid

- 중앙 정렬 SaaS 히어로 + 교체 가능한 카드 그리드.
- 과장식 sci-fi 크롬, 네온 과다, HUD 오버레이.
- 절제된 톤을 깨는 멀티컬러 팔레트.
- 테크 정밀 큐 없는 순수 매거진 (반대 극단도 금지).

## DESIGN.md 컴파일

```yaml
colors:
  primary: "#101014"
  neutral: "#17171C"
  accent: "#E05D38"
  on-primary: "#F4F4F5"
  on-accent: "#101014"
  copy: "#A1A1AA"
typography:
  h1: { fontFamily: "Fraunces, Hahmlet, serif", fontSize: 4rem, fontWeight: 600, lineHeight: 1.05, letterSpacing: "-0.02em" }
  body-md: { fontFamily: "DM Sans, Pretendard, sans-serif", fontSize: 1.0625rem, lineHeight: 1.65 }
  label-mono: { fontFamily: "JetBrains Mono, IBM Plex Sans KR, monospace", fontSize: 0.75rem, letterSpacing: "0.08em" }
rounded: { sm: 2px, md: 6px, lg: 10px }
```

프리셋 근사값: VARIANCE 7 · MOTION 5 · DENSITY 4 (매거진 프리셋 계열)
