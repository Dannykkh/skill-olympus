---
name: biz-strategy
description: >
  사업성 검토 통합 스킬. 비즈니스 모델 캔버스, 수익/가격 전략, 시장 분석(TAM/SAM/SOM),
  GTM 전략, 북극성 지표, 코호트 분석을 한 번에 수행. /hermes로 실행.
triggers:
  - "hermes"
  - "헤르메스"
  - "biz-strategy"
  - "사업성"
  - "사업화"
  - "비즈니스 모델"
  - "시장 분석"
  - "business model"
  - "market analysis"
auto_apply: false
---

# Hermes (헤르메스) — 사업성 검토

> **헤르메스(Hermes)**: 상업과 무역의 신, 메신저.
> "이거 돈 되나?" — 프로젝트 시작 전, 사업성을 6개 영역으로 분석합니다.

## Quick Start

```
/hermes                       # 전체 6개 영역 분석
/hermes "온라인 교육 플랫폼"   # 주제 지정
/hermes --canvas-only          # 비즈니스 모델 캔버스만
/hermes --market-only          # 시장 분석만
```

**공식 호출명:** `/hermes` (별칭: `헤르메스`, `사업성`, `사업화`)

## 파이프라인 위치

```
/hermes → /athena → /zephermine → /agent-team → ... → /estimate
 사업분석    CEO 코칭    기술 설계      구현              견적서
```

**독립 실행 가능** — 파이프라인 밖에서 단독 사용.

---

## CRITICAL: First Actions

### 1. Print Intro

```
Hermes(헤르메스) — 상업의 신이 사업성을 검토합니다
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
6개 영역: 모델 → 수익 → 시장 → GTM → 지표 → 코호트
```

### 2. 주제 확인

`$ARGUMENTS`가 없으면 AskUserQuestion:

```
question: "어떤 사업/제품/서비스를 분석할까요?"
header: "분석 대상"
```

기존 젭마인 산출물(`spec.md`)이 있으면 거기서 자동 추출 가능.

### 3. 웹 리서치

분석 대상에 대해 WebSearch로 기초 조사:
- 산업 현황, 시장 규모, 주요 플레이어
- 결과를 이후 6개 영역에 활용

---

6개 영역 분석 프레임워크 상세(캔버스 템플릿, 가격 모델 테이블, TAM/SAM/SOM 다이어그램, GTM 체크리스트, 북극성 지표/입력 지표 테이블, 코호트 테이블/단위 경제학): See [frameworks.md](references/frameworks.md)

## 영역 1: 비즈니스 모델

BMC 9블록(핵심 파트너~수익원)과 Lean Canvas(초기 스타트업용)를 작성합니다.
출력: 텍스트 캔버스 + Mermaid 다이어그램

---

## 영역 2: 수익 전략

구독형·건당과금·프리미엄·라이선스·광고 모델 중 적합한 것을 선택하고, 3~5개 수익화 방안을 예상 규모·난이도·검증 방법과 함께 제시합니다.

---

## 영역 3: 시장 분석

TAM(전체) → SAM(접근 가능) → SOM(1~3년 확보 가능) 순으로 WebSearch 데이터를 활용하여 산출합니다.

---

## 영역 4: GTM (Go-to-Market) 전략

비치헤드 고객·채널·메시지·차별화·파트너를 정의하고, 런치 체크리스트(랜딩 페이지~분석 도구)를 완성합니다.

---

## 영역 5: 핵심 지표 (North Star Metric)

비즈니스 유형별 북극성 지표를 설정하고, 이를 움직이는 입력 지표 3~5개를 정의합니다.

---

## 영역 6: 코호트 분석 프레임워크

실제 데이터가 없어도 코호트 기준·측정 지표·분석 주기·세그먼트를 설계하고 CAC/LTV/Payback Period 목표를 설정합니다.

---

## 완료 안내

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Hermes 검토 완료! 상업의 신이 분석을 마쳤습니다.

📁 산출물: docs/hermes/{project-name}.md

📊 요약:
  비즈니스 모델: {유형}
  시장 규모(SOM): {금액}
  핵심 지표: {북극성}
  LTV/CAC: {비율}

👉 다음 단계:
  /athena             → CEO 코칭 (전략적 도전)
  /okr                → 분기별 OKR 설정
  /zephermine         → 기술 설계 시작
  /estimate           → 개발 견적서
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 옵션

| 옵션 | 설명 | 기본값 |
|------|------|--------|
| `--canvas-only` | 비즈니스 모델 캔버스만 | false |
| `--market-only` | 시장 분석(TAM/SAM/SOM)만 | false |
| `--lean` | Lean Canvas 포함 | false |
| `--output-dir` | 출력 디렉토리 | `docs/hermes/` |

---

## 연관 스킬

| 스킬 | 역할 | 연결 |
|------|------|------|
| ceo (athena) | CEO 코칭 | 후행 — 사업 분석 데이터로 전략적 도전 |
| okr | 분기별 목표/핵심결과 설정 | 후행 — 사업성 검토 후 실행 계획 |
| zephermine | 기술 설계 | 후행 — 사업성 확인 후 설계 |
| estimate | 개발 견적서 | 후행 — 비용 산정 |
| reddit-researcher | 시장 조사 (Reddit) | 보완 — 시장 분석에 활용 |
| game-changing-features | 10x 기회 발굴 | 보완 — 차별화 전략에 활용 |

## Related Files

| 파일 | 역할 |
|------|------|
| `skills/okr/SKILL.md` | OKR 설정 |
| `skills/zephermine/SKILL.md` | 기술 설계 (사업성 확인 후) |
| `skills/estimate/SKILL.md` | 개발 견적서 |
| `skills/reddit-researcher/SKILL.md` | Reddit 시장 조사 |
