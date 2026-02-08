---
name: stitch-design-md
description: Stitch 프로젝트를 분석하여 DESIGN.md를 생성. 디자인 시스템 문서화, 토큰 추출, 시각적 일관성 보장. "DESIGN.md 생성", "디자인 시스템 분석" 요청 시 사용.
---

# Stitch DESIGN.md Generator

기존 Stitch 프로젝트를 분석하여 디자인 시스템 문서(DESIGN.md)를 생성합니다.
새로운 스크린 생성 시 기존 디자인 언어와의 일관성을 보장하는 source of truth 역할.

## 워크플로우

```
1. 네임스페이스 탐색 (list_projects)
2. 프로젝트/스크린 조회 (list_screens)
3. 메타데이터 수집 (get_screen_metadata, get_screen_html)
4. 에셋 다운로드 (download_screen_asset)
5. 분석 및 합성 → DESIGN.md 생성
```

## 분석 원칙

### 1. 프로젝트 아이덴티티 추출
- 전체적인 분위기와 스타일 방향 파악
- 형용사로 정의: Airy, Dense, Minimalist, Bold 등

### 2. 색상 팔레트 매핑
설명적 이름 + Hex 코드 + 역할을 함께 기록:
```
- Deep Ocean Blue (#0077B6) — Primary CTA, 강조 텍스트
- Soft Cloud (#F8F9FA) — 배경, 카드 표면
- Warm Coral (#FF6B6B) — 경고, 삭제 액션
```

### 3. 타이포그래피 체계
```
- Heading 1: Inter Bold 48px / 1.2 line-height
- Heading 2: Inter SemiBold 32px / 1.3
- Body: Inter Regular 16px / 1.6
- Caption: Inter Regular 12px / 1.4
```

### 4. 기하학 번역
기술 용어를 물리적 설명으로 변환:
- `border-radius: 8px` → "부드럽게 둥근 모서리, 카드형"
- `box-shadow: 0 2px 8px rgba(0,0,0,0.1)` → "은은한 떠있는 느낌"

### 5. 깊이 표현
그림자와 고도를 자연어로 설명:
- Level 0: 평면, 그림자 없음
- Level 1: 미세한 그림자 (카드, 입력 필드)
- Level 2: 눈에 띄는 그림자 (드롭다운, 모달)

## DESIGN.md 출력 구조

```markdown
# DESIGN.md

## 시각적 테마 및 분위기
{프로젝트의 전체적인 느낌을 2-3문장으로}

## 색상 팔레트
| 이름 | Hex | 역할 |
|------|-----|------|
| ... | ... | ... |

## 타이포그래피
| 용도 | 폰트 | 크기 | 굵기 |
|------|------|------|------|
| ... | ... | ... | ... |

## 컴포넌트 스타일
### 버튼
### 카드
### 입력 필드
### 네비게이션

## 레이아웃 원칙
- 그리드 시스템
- 간격 체계
- 반응형 브레이크포인트

## Stitch 생성 노트
{Stitch 프롬프트에 포함할 디자인 컨텍스트 블록}
```

## 핵심 규칙

- **설명적 언어 + 정확한 기술 값**: "Deep Ocean Blue (#0077B6)" 형식
- **역할 기반 정의**: 단순 색상 나열이 아닌 용도와 함께 기록
- **Stitch 프롬프트 호환**: 마지막 섹션에 Stitch에 바로 붙여넣을 수 있는 컨텍스트 블록 포함
- **점진적 업데이트**: 새 스크린 추가 시 DESIGN.md도 갱신

## 사용법

```
/stitch-design-md
# 또는
"이 Stitch 프로젝트의 DESIGN.md를 만들어줘"
```
