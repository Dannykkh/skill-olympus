---
name: skill-evolve
description: >
  gotcha/learned 관찰에서 스킬 개선점을 추출하여 autoresearch로 연결하는 자기 개선 루프.
  축적된 관찰을 스킬에 매핑하고 실제 과업 실패나 측정된 비용의 개선을 autoresearch로 검증합니다.
  memory-distill이 정제한 패턴을 입력으로 사용합니다.
  기본 설치에서는 source-only 모듈 직접 로드, 전체 활성화 설치에서는 /skill-evolve로 실행.
---

# Skill Evolve — gotcha/learned → 스킬 자동 개선

> memory-distill이 정제한 gotcha/learned에서 개선 후보를 찾으면 이 스킬을 실행합니다.
> 축적된 실패/성공 관찰을 체크리스트로 변환하여 autoresearch에 넘깁니다.

## Antigravity `/learn` 경계

Antigravity 네이티브 `/learn`은 현재 대화에서 드러난 교정·선호를 Rules 또는 Skill로 바로 정리할 때
우선합니다. 이 모듈은 여러 세션에서 누적·정제된 gotcha/learned를 기존 스킬에 매핑하고, 최소 관찰 수와
대조 체크리스트를 거쳐 반복 가능한 개선인지 검증하는 경로입니다. `/learn`을 프로그램적으로 호출하거나
한 번의 최근 교정을 누적 개선 근거로 승격하지 않습니다.

## Autoresearch source-only handoff

`autoresearch`가 활성 스킬이나 slash command로 등록됐다고 가정하지 않습니다. 상위 하네스가
`MODULE_SKILL[autoresearch]`와 `MODULE_ROOT[autoresearch]`를 전달했으면 그 정확한 파일을
사용합니다. standalone 실행이면 사용자의 승인 뒤에만 프로젝트의
`skills/autoresearch/SKILL.md` exact frontmatter → 현재 CLI 활성 루트 → 전역
`SKILLS-CATALOG.md`에서 첫 셀이 정확히 `autoresearch`인 단 하나의 행과 그 `읽을 경로` 순으로
해석합니다. 해석된 `SKILL.md` 전체를 직접 읽어 체크리스트 인자를 적용하며 `/autoresearch`
호출로 넘기지 않습니다. 파일·행·경로가 없거나 중복이면 비교 실험은 `NOT RUN`으로 남기고
전역 스킬을 수정하지 않습니다.

---

## 사용법

기본 설치에서는 전역 카탈로그의 이 `SKILL.md`를 직접 읽고 아래 인자 의도를 적용합니다.
다음 표기는 명령 실행이 아니라 route intent입니다. `--include-source-only-skills`로 전체 활성화한
설치에서만 앞에 `/`를 붙인 `/skill-evolve` compatibility alias를 사용할 수 있습니다.

```text
# 스캔 — 어떤 스킬에 개선 후보가 있는지 확인
skill-evolve

# 특정 스킬 직접 개선
skill-evolve humanizer

# 최소 gotcha 수 지정 (기본: 3)
skill-evolve --min 5
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
   └─ 현재 CLI의 글로벌/로컬 스킬 경로에 있는 `*/SKILL.md` (있으면)

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

관찰 수·태그 가중치는 조사 우선순위다. 같은 사건의 중복 기록을 별개 실패로 세지 않고,
반복 관찰만으로 스킬 결함이나 개선 필요를 확정하지 않는다. 실제 기준점은 autoresearch에서 실행한다.

### Phase 3: 결과 출력 (인자 없이 실행 시)

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Skill Evolve — 개선 후보 스캔
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  스킬                  gotcha  learned  총계   상태
  humanizer               4       1       5    개선 권장
  react-dev               3       0       3    개선 가능
  commit-work             1       2       3    개선 가능

  권장: skill-evolve humanizer route로 시작하세요
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Phase 4: 체크리스트 생성 (스킬 지정 시)

먼저 관찰한 실패의 수정 위치를 고릅니다. 기존 검사 누락·오류는 검사/연결을, 잘못된 탐색은
경로/카탈로그를, 판단 실패는 해당 스킬 지침을 후보로 삼습니다. 스킬 수정이 필요하지 않은 항목은
기존 관찰에 이유를 남기고 이 루프에서 제외합니다. 다른 파일의 수정 권한까지 자동 확대하지 않습니다.
스킬에 해당하는 gotcha/learned만 autoresearch 체크리스트(예/아니오 질문)로 변환합니다.

**변환 규칙:**

| 출처 | 변환 방식 | 예시 |
|------|----------|------|
| gotcha의 **함정** | "~하지 않는가?" (부정 확인) | 함정: YAML 파싱 오류 → "YAML 파싱 시 들여쓰기 오류가 없는가?" |
| gotcha의 **교훈** | "~하고 있는가?" (정방향 확인) | 교훈: 항상 스키마 검증 → "입력 스키마 검증이 포함됐는가?" |
| learned의 **패턴** | 그 패턴이 보장하려는 과업 결과 | 기존 코드 탐색 → "기존 구현을 재사용하고 요청한 변경 범위를 지켰는가?" |

**체크리스트 제약:**
- 결과 기준은 보통 3~6개로 합치되 필수 제약·회귀 검사는 별도로 유지
- 신뢰도 높은 순서로 선택
- 중복/유사 항목 병합
- 실제 출력·변경·명령 결과로 판정할 질문; UNCERTAIN·NOT RUN은 통과로 세지 않음
- 문서 형식·단계 준수·금지 목록의 존재만으로 개선 목표를 만들지 않음
- 기준점에서 실패나 측정된 비용 문제가 없으면 변경하지 않음; 지침 형태는 재현한 실패에 맞춤

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
1. 체크리스트·필수 제약·회귀·대상과 상한을 먼저 대화에 제시

2. 이번 대상과 수정 범위가 이미 승인됐으면 그대로 진행.
   아직 승인되지 않은 범위만 사용자에게 확인하고, 승인 뒤에만 파일로 저장.

3. 승인 시:
   - 체크리스트를 .skill-evolve/<skill-name>/checklist.md에 저장
   - 위 source-only handoff로 `MODULE_SKILL[autoresearch]`를 해석하고 전체를 직접 읽음
   - `<skill-name> --checklist .skill-evolve/<skill-name>/checklist.md` 의도를 해당 워크플로우에 전달

4. 완료 후:
   - .skill-evolve/<skill-name>/evolve-log.md에 실제 status, 근거, 원본·후보 해시와 적용 여부 기록
   - accepted인 경우에만 사용된 gotcha/learned 파일에 `evolved-by: skill-evolve`와 결과 링크를 기록
   - rejected / deferred / not-run은 그 이유를 로그에 남기고 적용 완료로 마킹하지 않음
```

개발 라운드의 점수·streak와 최종 채택을 구분한다. 별도 평가 피드백을 수정에 썼다면 그 입력은
개발용이 되며, 새 평가 입력에서 원본과 후보를 모두 실행해야 한다. 예산 부족은 deferred다.
필수 실패를 평균으로 상쇄하지 않고, 동점은 사전 비용 지표의 개선이 입증된 경우에만 채택한다.
세부 실행·해시 확인·평가셋 전환은 해석한 autoresearch 문서가 소유한다.

---

## 제약 사항

### 반드시 지킬 것

| # | 규칙 |
|---|------|
| 1 | **승인된 대상·범위 유지.** 기존 승인을 재사용하며 추가 범위만 확인 |
| 1a | **미승인 범위는 무수정.** 체크리스트는 먼저 대화에 제시하고, 미승인 대상은 승인 뒤에만 파일로 저장 |
| 2 | **과업 결과 중심.** 핵심 기준은 보통 3~6개; 필수 제약을 개수 때문에 삭제하지 않음 |
| 3 | **신뢰도 0.5 이상만.** confidence 0.3 이하 gotcha는 체크리스트에 포함하지 않음 |
| 4 | **1스킬 1실행.** 여러 스킬을 한 번에 autoresearch하지 않음 |

### 하지 말 것

| # | 금지 사항 | 이유 |
|---|----------|------|
| 1 | gotcha 내용을 직접 SKILL.md에 삽입 | autoresearch의 hill-climbing을 우회 |
| 2 | observations.jsonl 직접 읽기 | raw 정제는 memory-distill의 역할, 여기선 정제 결과물만 사용 |
| 3 | 문서 형식 점수를 행동 개선으로 보고 | 실행 결과가 좋아졌다는 증거가 아님 |
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
