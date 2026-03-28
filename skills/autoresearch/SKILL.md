---
name: autoresearch
description: >
  Karpathy의 autoresearch 패턴을 스킬 프롬프트 최적화에 적용.
  체크리스트(3~6개 예/아니오 기준) 기반 hill-climbing 루프로
  SKILL.md를 자동 개선합니다. 한 번에 하나만 바꾸고, 채점하고,
  유지하거나 되돌립니다. 95%+ × 3회 연속 달성 시 종료.
  /autoresearch로 실행.
triggers:
  - "autoresearch"
  - "스킬 최적화"
  - "스킬 개선"
  - "프롬프트 최적화"
  - "optimize skill"
  - "improve skill"
auto_apply: false
allowed-tools:
  - Read
  - Write
  - Edit
  - Grep
  - Glob
  - Bash
  - Agent
  - AskUserQuestion
---

# Autoresearch

> **Karpathy의 autoresearch** — 한 번에 하나만 바꾸고, 채점하고, 유지하거나 되돌린다.
> 레시피를 고쳐서 앞으로 만드는 요리를 전부 좋게 만드는 것.

---

## 핵심 원리

```
점수를 매길 수 있으면, autoresearch할 수 있다.
— Ole (@unclejobs)
```

| 원본 (Karpathy ML) | 이 스킬 (프롬프트 최적화) |
|--------------------|-----------------------|
| `train.py` 수정 | `SKILL.md` 수정 |
| `program.md` 지침 | 이 SKILL.md = 루프 지침 |
| `val_bpb` 메트릭 | 체크리스트 점수 (pass/total × 100) |
| `results.tsv` | `autoresearch-log.md` 변경 로그 |
| `git commit/reset` | 유지/되돌림 |

---

## 사용법

```bash
# 기본 — 단일 스킬 최적화
/autoresearch humanizer

# 옵션 지정
/autoresearch humanizer --input sample.md --rounds 20

# 체크리스트 파일 직접 지정
/autoresearch humanizer --checklist my-checklist.md

# 스캔 모드 — 전체 스킬 품질 진단
/autoresearch --scan

# 스캔 후 바로 최적화
/autoresearch --scan --auto
```

### 인자

| 인자 | 필수 | 기본값 | 설명 |
|------|------|--------|------|
| `<skill-name>` | — | — | 개선할 대상 스킬 이름 (scan 모드 시 생략) |
| `--scan` | — | — | 전체 스킬 품질 스캔 모드 |
| `--auto` | — | — | scan 후 최하위 스킬부터 자동 최적화 시작 |
| `--input` | — | 자동 생성 | 테스트용 샘플 입력. 파일 경로 또는 인라인 텍스트 |
| `--checklist` | — | 대화로 수집 | 체크리스트 파일 경로 (.md) |
| `--rounds` | — | 20 | 최대 라운드 수 |
| `--target` | — | 95 | 목표 점수 (%) |
| `--streak` | — | 3 | 연속 달성 횟수 |

---

## Scan 모드 (`--scan`)

> **어떤 스킬을 돌려야 하는지 모르면** scan부터.
> 96개 스킬을 빠르게 훑어서 우선순위 리스트를 뽑아준다.

### 사용법

```bash
# 전체 스캔
/autoresearch --scan

# 스캔 + 최하위부터 자동 최적화
/autoresearch --scan --auto
```

### Scan 워크플로우

```
1. 스킬 목록 수집
   └─ skills/*/SKILL.md를 Glob으로 전부 수집

2. 각 스킬에 Quick Health Check (6개 항목, 예/아니오)
   └─ skill-judge의 D1~D8 차원을 빠른 이진 질문으로 압축:

   ┌─────────────────────────────────────────────────────────────┐
   │ Q1 [Knowledge Delta]                                        │
   │    SKILL.md에 Claude가 모르는 전문 지식이 있는가?            │
   │    (결정 트리, 비직관적 트레이드오프, 경험 기반 엣지 케이스)  │
   │                                                             │
   │ Q2 [Anti-Patterns]                                          │
   │    구체적인 NEVER 리스트(하지 말 것 + 이유)가 있는가?        │
   │                                                             │
   │ Q3 [Examples]                                                │
   │    좋은 예시 또는 나쁜 예시가 스킬 안에 포함돼 있는가?       │
   │                                                             │
   │ Q4 [Description Quality]                                    │
   │    frontmatter description이 WHAT + WHEN + KEYWORDS를       │
   │    모두 포함하는가?                                          │
   │                                                             │
   │ Q5 [Progressive Disclosure]                                 │
   │    SKILL.md가 500줄 이하이고, 무거운 콘텐츠가               │
   │    references/로 분리돼 있는가?                              │
   │                                                             │
   │ Q6 [Actionable Instructions]                                │
   │    지시가 구체적인가? ("좋은 코드를 작성하라" ❌ vs          │
   │    "함수는 20줄 이내, 단일 책임" ✅)                         │
   └─────────────────────────────────────────────────────────────┘

3. 점수 산출
   └─ 각 항목 PASS=1, FAIL=0
   └─ 점수 = (PASS / 6) × 100

4. 등급 분류 + 정렬

   | 점수 | 등급 | 의미 |
   |------|------|------|
   | 0~33% | 🔴 낮음 | 즉시 autoresearch 필요 |
   | 34~66% | 🟡 보통 | 개선 여지 있음 |
   | 67~100% | 🟢 양호 | 유지 |
```

### Scan 출력 형식

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Autoresearch Skill Scan — 96 skills
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔴 낮음 (즉시 개선 필요)
  17%  domain-name-brainstormer  — 예시 없음, 지시 모호, NEVER 리스트 없음
  17%  meme-factory              — 전문 지식 없음, 예시 없음
  33%  web-to-markdown           — description 불완전, 예시 없음

🟡 보통 (개선 여지)
  50%  marp-slide               — NEVER 리스트 없음, 지시 일부 모호
  50%  commit-work              — 예시 없음, 엣지 케이스 미비
  67%  naming-analyzer          — 예시 풍부하나 NEVER 리스트 없음

🟢 양호
  83%  humanizer                — 예시 필요
  83%  zephermine               — description 보강 여지
 100%  skill-judge              — 모든 항목 통과

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🔴 3개 | 🟡 3개 | 🟢 3개
  추천: domain-name-brainstormer부터 /autoresearch 실행
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Scan + skill-judge 연동

scan의 Quick Health Check는 **skill-judge의 경량 버전**입니다.

| skill-judge 차원 | Scan 질문 | 매핑 |
|-----------------|-----------|------|
| D1: Knowledge Delta (20pt) | Q1: 전문 지식 존재? | 핵심 차원 → 직접 매핑 |
| D3: Anti-Pattern Quality (15pt) | Q2: NEVER 리스트? | 구체적 안티패턴 유무 |
| D8: Practical Usability (15pt) | Q3: 예시 포함? | 예시 = 실용성 핵심 |
| D4: Spec Compliance (15pt) | Q4: Description 품질? | WHAT+WHEN+KEYWORDS |
| D5: Progressive Disclosure (15pt) | Q5: 500줄 이하? | 토큰 효율 |
| D6: Freedom Calibration (15pt) | Q6: 지시 구체성? | 모호 vs 구체 |

**심층 평가가 필요하면**: scan 결과에서 특정 스킬을 골라 `/skill-judge <skill-name>`으로 120점 만점 정밀 평가 가능.

### `--scan --auto` 모드

scan 후 자동으로 최하위 스킬부터 순서대로 autoresearch를 실행합니다.

```
1. --scan 실행 → 우선순위 리스트 생성
2. 🔴 등급 스킬 중 최하위 선택
3. 해당 스킬에 대해:
   └─ scan에서 FAIL된 항목을 체크리스트로 자동 생성
   └─ 스킬 유형에 맞는 테스트 입력 자동 생성
   └─ Hill-Climbing 루프 실행
4. 완료 후 다음 🔴 스킬로 이동
5. 🔴 전부 처리 후 → 사용자에게 "🟡 스킬도 진행할까요?" 질문
```

**자동 체크리스트 생성 규칙**:
scan에서 FAIL된 Q1~Q6 항목을 해당 스킬의 체크리스트로 변환합니다.

```
FAIL된 항목 → 체크리스트 변환 예시:
Q1 FAIL → "스킬 출력에 Claude가 기본적으로 모르는 전문적 판단이 반영됐는가?"
Q2 FAIL → "구체적인 '하지 마라' 사례가 출력에 포함됐는가?"
Q3 FAIL → "좋은 예시/나쁜 예시가 출력 품질을 좌우하는가?"
Q6 FAIL → "지시가 모호하지 않고 측정 가능한 기준을 제시하는가?"
```

FAIL 항목이 3개 미만이면 해당 스킬 유형에 맞는 범용 체크리스트를 보충합니다.

---

## 워크플로우 (단일 스킬 최적화)

### Phase 0: 준비

```
1. 대상 스킬 확인
   └─ skills/<skill-name>/SKILL.md 존재 확인
   └─ 없으면 에러 → 종료

2. 체크리스트 확보 (--checklist 없으면 사용자에게 질문)
   └─ AskUserQuestion: "이 스킬의 '잘 됐는지' 기준을 알려주세요. 예/아니오로 답할 수 있는 질문 3~6개."
   └─ 6개 초과 시 경고: "6개 넘으면 게이밍이 시작됩니다. 가장 중요한 6개만 골라주세요."

3. 테스트 입력 확보 (--input 없으면)
   └─ 스킬 유형에 맞는 샘플 자동 생성
   └─ 글쓰기 스킬: 의도적으로 AI스러운 샘플 텍스트
   └─ 코드 스킬: 대표적인 코드 스니펫
   └─ 설계 스킬: 간단한 기능 요구사항

4. 백업 생성
   └─ SKILL.md 원본을 .autoresearch/backup/<skill-name>-original.md로 복사
   └─ git stash 또는 별도 백업 (되돌림 안전장치)

5. 로그 파일 초기화
   └─ .autoresearch/<skill-name>/autoresearch-log.md 생성
```

### Phase 1: 기준점 측정 (Baseline)

```
1. 대상 스킬의 SKILL.md를 프롬프트로 사용하여 테스트 입력 처리
   └─ Agent 서브에이전트로 스킬 실행 (격리된 컨텍스트)

2. 출력물을 체크리스트로 채점
   └─ 각 항목: PASS (1) 또는 FAIL (0)
   └─ 점수 = (PASS 수 / 전체 항목 수) × 100
   └─ ⚠️ Eval 격리: 출력물만 보고 채점. 프롬프트를 보면 관대해짐.

3. 기준점 기록
   └─ 로그에 "Baseline: 56% (3/5 pass)" 기록
```

### Phase 2: Hill-Climbing 루프

```
LOOP (라운드 1 ~ --rounds):

  ┌─ ① 약점 분석
  │  └─ 가장 최근 FAIL 항목 중 하나 선택
  │  └─ 왜 실패했는지 분석 (출력물 vs 체크리스트 항목)
  │
  ├─ ② Mutation 전략 선택 (하나만)
  │  └─ add_counterexample: 실패 케이스를 스킬에 "이렇게 하지 마라" 예시로 삽입
  │  └─ tighten_language: 모호한 지시를 구체적으로 강화
  │  └─ add_constraint: 형식/길이/구조 제약 추가
  │  └─ add_negative_example: "나쁜 예시 vs 좋은 예시" 쌍 삽입
  │  └─ add_good_example: 이상적인 출력 예시 직접 삽입
  │  └─ remove_bloat: 불필요한 지시 제거 (토큰 절약)
  │
  ├─ ③ SKILL.md 수정 (딱 하나만 변경)
  │  └─ Edit 도구로 최소 변경
  │  └─ 변경 내용을 로그에 기록
  │
  ├─ ④ 재실행 + 채점
  │  └─ 동일한 테스트 입력으로 스킬 재실행
  │  └─ 체크리스트로 재채점
  │
  ├─ ⑤ 판정
  │  ├─ 점수 상승 → ✅ 유지 (Keep)
  │  │  └─ 로그: "R3: ✅ Keep — add_constraint '20단어 제한' (75% → 83%)"
  │  │
  │  ├─ 점수 동일 → ✅ 유지 (중립 변경은 유지 — 로컬 옵티마 탈출)
  │  │  └─ 로그: "R4: ✅ Keep (neutral) — tighten_language (83% → 83%)"
  │  │
  │  └─ 점수 하락 → ❌ 되돌림 (Revert)
  │     └─ SKILL.md를 이전 상태로 복원
  │     └─ 로그: "R5: ❌ Revert — remove_bloat → CTA 약화 (83% → 67%)"
  │
  └─ ⑥ 종료 조건 확인
     └─ 목표 점수(--target) 이상이 --streak회 연속? → Phase 3로
     └─ 최대 라운드 초과? → Phase 3로
     └─ 아니면 → 다음 라운드
```

### Phase 3: 완료 + 산출물

```
1. 최종 SKILL.md 저장 (이미 수정된 상태)

2. 변경 로그 완성 — .autoresearch/<skill-name>/autoresearch-log.md:
   ┌──────────────────────────────────────────────┐
   │ # Autoresearch Log: humanizer                │
   │ Target: 95% × 3 streak                       │
   │ Baseline: 56% (3/5)                          │
   │ Final: 92% (4.6/5 avg over 3 runs)           │
   │ Rounds: 7 (4 kept, 1 neutral, 2 reverted)    │
   │                                              │
   │ ## Checklist                                  │
   │ 1. AI 유행어가 없는가? ................. ✅   │
   │ 2. 문장이 20단어 이내인가? ............ ✅   │
   │ 3. 능동태를 사용했는가? ............... ✅   │
   │ 4. em dash 2개 이하인가? .............. ✅   │
   │ 5. 개성이 느껴지는가? ................. ⚠️   │
   │                                              │
   │ ## Rounds                                     │
   │ R1: ✅ Keep — add_negative_example 유행어     │
   │     (56% → 75%)                               │
   │ R2: ✅ Keep — tighten_language 능동태          │
   │     (75% → 75%, neutral)                      │
   │ R3: ❌ Revert — add_constraint 15단어 제한    │
   │     (75% → 50%, CTA 약화)                     │
   │ R4: ✅ Keep — add_good_example 문장 분리      │
   │     (75% → 92%)                               │
   │ R5-7: 92%, 92%, 92% → 3 streak 달성 🏁       │
   │                                              │
   │ ## Mutation Stats                             │
   │ add_negative_example: 1/1 (100%)              │
   │ tighten_language:     1/1 (100%, neutral)     │
   │ add_constraint:       0/1 (0%)                │
   │ add_good_example:     1/1 (100%)              │
   │                                              │
   │ ## Diff Summary                               │
   │ +3 lines: 유행어 금지 목록                     │
   │ +2 lines: 능동태 변환 규칙                     │
   │ +4 lines: 좋은 예시 삽입                       │
   │ -0 lines: (되돌림으로 제거됨)                  │
   └──────────────────────────────────────────────┘

3. 사용자에게 결과 요약 출력
```

---

## 체크리스트 작성 가이드

### 규칙

| 규칙 | 이유 |
|------|------|
| **3~6개** | 3개 미만 → 허점 발생. 6개 초과 → 게이밍 시작 |
| **예/아니오만** | 1~7점 척도 쓰면 "기술적으로 5점"인 쓰레기가 나옴 |
| **구체적으로** | "좋은 글인가?" ❌ → "유행어가 없는가?" ✅ |
| **독립적으로** | 항목 간 상충하지 않아야 함 |

### 좋은 체크리스트 예시

**글쓰기 스킬용:**
```
1. "혁신적", "획기적", "탁월한" 같은 AI 유행어가 없는가?
2. 모든 문장이 20단어 이내인가?
3. 수동태 대신 능동태를 사용했는가?
4. em dash(—)를 2개 이하로 사용했는가?
5. 첫 문장이 구체적인 고충이나 상황을 짚는가?
```

**설계 스킬용:**
```
1. API 명세에 에러 응답 코드(4xx, 5xx)가 정의됐는가?
2. 비기능 요구사항(성능, 보안)이 포함됐는가?
3. 컴포넌트 간 의존성 방향이 명시됐는가?
4. 데이터 스키마가 정규화(3NF 이상)됐는가?
```

**코드 생성 스킬용:**
```
1. 타입이 any 없이 구체적으로 지정됐는가?
2. 에러 처리가 try-catch로 감싸졌는가?
3. 함수가 단일 책임을 지키는가? (20줄 이내)
4. import 경로가 절대 경로인가?
```

---

## 제약 사항

### 반드시 지킬 것

| # | 규칙 |
|---|------|
| 1 | **한 번에 하나만 변경.** 두 가지를 동시에 바꾸면 뭐가 효과 있었는지 모름 |
| 2 | **Eval 격리.** 채점 시 SKILL.md(프롬프트)를 보지 말 것. 출력물만 보고 판단 |
| 3 | **되돌림은 즉시.** 점수가 떨어지면 고민하지 말고 바로 되돌림 |
| 4 | **같은 테스트 입력 사용.** 입력이 바뀌면 공정한 비교 불가 |
| 5 | **로그는 매 라운드 기록.** 건너뛰면 변경 로그의 가치가 사라짐 |

### 하지 말 것

| # | 금지 사항 | 이유 |
|---|----------|------|
| 1 | 체크리스트 7개 이상 | 게이밍 시작 — 시험 답만 외우는 학생 |
| 2 | 1~7점 슬라이딩 척도 | "기술적 5점" 쓰레기 양산 |
| 3 | 한 번에 여러 변경 | 어떤 변경이 효과인지 구분 불가 |
| 4 | 프롬프트 전체 재작성 | Hill climbing이 아니라 random restart |
| 5 | 테스트 입력 중간 변경 | 점수 비교의 기준이 무너짐 |

---

## Mutation 전략 상세

| 전략 | 설명 | 성공률* | 언제 사용 |
|------|------|---------|----------|
| `add_counterexample` | 실패 케이스를 "이렇게 하지 마라" 예시로 삽입 | 높음 | 특정 안티패턴이 반복될 때 |
| `tighten_language` | "좋은 글을 써라" → "능동태, 20단어 이내, 구체적 숫자 포함" | 높음 | 지시가 모호할 때 |
| `add_constraint` | 형식/길이/구조 제약 추가 | 중간 | 출력이 산만할 때 |
| `add_negative_example` | "나쁜 예시 → 좋은 예시" 쌍 삽입 | 중간 | 경계가 불분명할 때 |
| `add_good_example` | 이상적인 출력 예시 삽입 | 중간 | 기대 수준이 명확할 때 |
| `remove_bloat` | 불필요한 지시 삭제 | 낮음 | 토큰 과다, 지시 충돌 시 |

*성공률은 Balu Kosuri의 14-cycle 실험 기준 참고치

### 전략 선택 우선순위

```
1. 실패 항목 분석 → 원인이 "안티패턴 반복"이면 → add_counterexample
2. 원인이 "지시가 모호"이면 → tighten_language
3. 원인이 "형식 이탈"이면 → add_constraint
4. 원인이 "경계 불명확"이면 → add_negative_example
5. 위 전략이 이미 시도됐으면 → add_good_example
6. 점수가 정체(5 라운드 이상 변화 없음)이면 → remove_bloat (정체 탈출)
```

---

## 산출물 파일 구조

```
.autoresearch/
├── scan-report.md                  # --scan 결과 (전체 스킬 품질 리포트)
├── backup/
│   └── <skill-name>-original.md    # 원본 백업
└── <skill-name>/
    └── autoresearch-log.md         # 변경 로그 + 점수 히스토리
```

---

## 관련 스킬

| 스킬 | 관계 |
|------|------|
| `skill-judge` | 스킬 품질 평가 (1회성) — autoresearch는 평가 + 수정 + 반복 |
| `humanizer` | 대표적인 최적화 대상 (글쓰기 스킬) |
| `auto-continue-loop` | 자율 루프 인프라 — autoresearch는 자체 루프 보유 |
| `manage-skills` | 스킬 관리 — autoresearch는 스킬 개선 |

---

## 레퍼런스

- [karpathy/autoresearch (GitHub)](https://github.com/karpathy/autoresearch)
- [Autoresearch 101 Builder's Playbook](https://sidsaladi.substack.com/p/autoresearch-101-builders-playbook)
- [Universal Skill (Balu Kosuri)](https://medium.com/@k.balu124/i-turned-andrej-karpathys-autoresearch-into-a-universal-skill-1cb3d44fc669)
- [autoexp Gist](https://gist.github.com/adhishthite/16d8fd9076e85c033b75e187e8a6b94e)
