---
name: skill-evolve
description: >
  gotcha/learned 관찰에서 스킬 개선점을 추출하여 autoresearch로 연결하는 자기 개선 루프.
  축적된 오답노트와 성공 패턴을 스킬에 매핑 → 체크리스트 자동 생성 → autoresearch 실행.
  gotcha-analyzer가 패턴 감지 후 이 스킬 실행을 제안합니다.
  /skill-evolve로 실행.
triggers:
  - "skill-evolve"
  - "스킬 진화"
  - "gotcha로 스킬 패치"
  - "스킬 자동 개선"
auto_apply: false
allowed-tools:
  - Read
  - Write
  - Edit
  - Grep
  - Glob
  - Bash
  - Agent
  - Skill
  - AskUserQuestion
---

# Skill Evolve — gotcha/learned → 스킬 자동 개선

> gotcha-analyzer가 "이 스킬 개선하세요"라고 제안하면, 이 스킬이 실행됩니다.
> 축적된 실패/성공 관찰을 체크리스트로 변환하여 autoresearch에 넘깁니다.

---

## 사용법

```bash
# 스캔 — 어떤 스킬에 개선 후보가 있는지 확인
/skill-evolve

# 특정 스킬 직접 개선
/skill-evolve humanizer

# 최소 gotcha 수 지정 (기본: 3)
/skill-evolve --min 5
```

### 인자

| 인자 | 필수 | 기본값 | 설명 |
|------|------|--------|------|
| `<skill-name>` | — | — | 특정 스킬 지정 시 바로 개선 진행 |
| `--min` | — | 3 | 개선 제안에 필요한 최소 관련 gotcha/learned 수 |
| `--dry-run` | — | — | 체크리스트 생성까지만 (autoresearch 실행 안 함) |

---

## 워크플로우

### Phase 1: 관찰 수집

```
1. gotcha/learned 파일 수집
   ├─ memory/gotchas/*.md (index.md 제외)
   └─ memory/learned/*.md (index.md 제외)

2. 각 파일에서 추출
   ├─ tags (키워드)
   ├─ type (CLI 오답 | 환경 함정 | 워크플로우 등)
   ├─ confidence (신뢰도)
   └─ 핵심 내용 (함정/패턴/교훈)
```

### Phase 2: 스킬 매핑

```
1. 스킬 목록 수집
   ├─ skills/*/SKILL.md (글로벌 스킬)
   └─ .claude/skills/*/SKILL.md (로컬 스킬, 있으면)

2. 각 스킬의 메타데이터 추출
   ├─ name
   ├─ description
   └─ triggers

3. gotcha/learned의 tags ↔ 스킬 name/description/triggers 매칭
   ├─ 정확 매칭: tag == skill name → 가중치 1.0
   ├─ 부분 매칭: tag ∈ skill description → 가중치 0.5
   └─ 유사 매칭: tag 동의어가 skill과 관련 → 가중치 0.3

4. 스킬별 관련 gotcha/learned 그룹핑
   └─ 관련 수 ≥ --min 인 스킬만 후보로 선정
```

### Phase 3: 결과 출력 (인자 없이 실행 시)

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Skill Evolve — 개선 후보 스캔
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  스킬                  gotcha  learned  총계   상태
  humanizer               4       1       5    개선 권장
  backend-spring          3       0       3    개선 가능
  commit-work             1       2       3    개선 가능

  💡 /skill-evolve humanizer 로 시작하세요
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Phase 4: 체크리스트 생성 (스킬 지정 시)

gotcha/learned 내용을 autoresearch 체크리스트(예/아니오 질문)로 변환합니다.

**변환 규칙:**

| 출처 | 변환 방식 | 예시 |
|------|----------|------|
| gotcha의 **함정** | "~하지 않는가?" (부정 확인) | 함정: YAML 파싱 오류 → "YAML 파싱 시 들여쓰기 오류가 없는가?" |
| gotcha의 **교훈** | "~하고 있는가?" (정방향 확인) | 교훈: 항상 스키마 검증 → "입력 스키마 검증이 포함됐는가?" |
| learned의 **패턴** | "~를 따르는가?" (패턴 준수) | 패턴: Grep→Read→Edit → "수정 전 Grep→Read로 확인하는가?" |

**체크리스트 제약:**
- 3~6개 (autoresearch 규칙 준수)
- 신뢰도 높은 순서로 선택
- 중복/유사 항목 병합
- 예/아니오로 답할 수 있는 구체적 질문

**생성 예시:**

```markdown
## 체크리스트: humanizer

출처: gotcha 4건, learned 1건

1. AI 유행어("혁신적", "획기적", "탁월한")가 출력에 없는가? [gotcha #2, confidence: 0.7]
2. em dash(—)를 2개 이하로 사용했는가? [gotcha #5, confidence: 0.5]
3. 능동태가 수동태보다 우선 사용됐는가? [gotcha #7, confidence: 0.7]
4. 문장 길이가 20단어 이내인가? [learned #1, confidence: 0.85]
5. 첫 문장이 구체적인 상황/고충으로 시작하는가? [gotcha #3, confidence: 0.5]
```

### Phase 5: autoresearch 실행

```
1. 체크리스트를 .skill-evolve/<skill-name>/checklist.md에 저장

2. 사용자에게 확인:
   "humanizer에 대해 위 체크리스트로 autoresearch를 실행할까요?"

3. 승인 시:
   /autoresearch <skill-name> --checklist .skill-evolve/<skill-name>/checklist.md

4. 완료 후:
   - .skill-evolve/<skill-name>/evolve-log.md에 결과 기록
   - 사용된 gotcha/learned 파일에 `evolved-by: skill-evolve` 마킹
```

---

## 제약 사항

### 반드시 지킬 것

| # | 규칙 |
|---|------|
| 1 | **사용자 승인 필수.** 체크리스트 확인 없이 autoresearch 실행 금지 |
| 2 | **3~6개 체크리스트.** autoresearch 규칙 준수 — 초과 시 상위 N개만 선택 |
| 3 | **신뢰도 0.5 이상만.** confidence 0.3 이하 gotcha는 체크리스트에 포함하지 않음 |
| 4 | **1스킬 1실행.** 여러 스킬을 한 번에 autoresearch하지 않음 |

### 하지 말 것

| # | 금지 사항 | 이유 |
|---|----------|------|
| 1 | gotcha 내용을 직접 SKILL.md에 삽입 | autoresearch의 hill-climbing을 우회 |
| 2 | observations.jsonl 직접 읽기 | 분석은 analyzer의 역할, 여기선 결과물만 사용 |
| 3 | 체크리스트 7개 이상 생성 | autoresearch 게이밍 방지 |
| 4 | 자동 실행 (사용자 승인 없이) | 의도치 않은 스킬 퇴행 방지 |

---

## 산출물

```
.skill-evolve/
├── scan-report.md                   # 스캔 결과 (어떤 스킬에 후보가 있는지)
└── <skill-name>/
    ├── checklist.md                 # 생성된 체크리스트
    └── evolve-log.md               # autoresearch 실행 결과 + 사용된 gotcha/learned 목록
```

---

## 관련 스킬

| 스킬 | 관계 |
|------|------|
| `project-gotchas` | 입력 — gotcha/learned 파일 제공 |
| `autoresearch` | 출력 — 생성된 체크리스트로 스킬 개선 실행 |
| `skill-judge` | 보완 — 개선 전후 품질 비교 가능 |
| `manage-skills` | 보완 — 개선 후 스킬 관리 |
