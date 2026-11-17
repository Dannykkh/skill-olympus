---
name: project-gotchas
description: >
  오답노트 + 성공 패턴 자동 관리. CLI(Claude/Codex/Antigravity/Grok)의 실패 패턴(gotchas)과
  성공 패턴(learned)을 프로젝트에 기록하고, 지정된 공유 기억을 참조하거나 명시된 범위에서 승격.
  므네모(mnemo)가 생성하는 memory/ 폴더 안에서 크로스 CLI 참조 가능.
  트리거 1 (참조): 작업 시작 시 gotchas + learned를 확인.
  트리거 2 (기록): "실수였어", "이거 기록해", "gotcha 추가", "함정이었네",
  "오답노트", "이것도 주의사항", "이 패턴 좋다", "이거 기억해" 같은 표현 시.
  트리거 3 (자발적 제안): CLI가 실수를 수정당하거나 성공 패턴이 반복될 때 기록을 제안.
---

# Project Gotchas (오답노트 + 성공 패턴)

CLI의 실패 패턴과 성공 패턴을 자동 수집하고 명시적으로 정제합니다.
글로벌 설치 1회로 어떤 프로젝트에서든 자동 작동합니다.
므네모(mnemo)가 생성하는 `memory/` 폴더 안에 관리하여 Claude/Codex/Antigravity/Grok 모두 참조 가능합니다.

단순 오타·일회성 실수·이미 전역 지침에 등록된 규칙은 새 항목으로 만들지 않습니다.

## 저장 루트와 공통 계약

기록 전에 현재 프로젝트의 실제 `skills/mnemo/SKILL.md`를 먼저 확인합니다. 없으면 현재 CLI의
Mnemo 어댑터를 활성 스킬 루트 → `SKILLS-CATALOG.md`의 정확한 `읽을 경로` 순서로 찾습니다
(Claude `mnemo`, Codex `codex-mnemo`, Antigravity `antigravity-mnemo`, Grok `grok-mnemo`).
찾은 `SKILL.md`를 읽고 그 디렉터리의 `references/project-storage.md`로 루트와 출력 절대경로를
확정합니다. 참조가 없는 어댑터 소스라면 같은 조회 순서로 공통 `mnemo` 모듈을 해석합니다.
그 Mnemo 스킬이 지정한 전역 규칙 정본의 `기억 관리` 절도 읽어 항목 형식을 적용합니다.
필수 참조나 루트를 확인하지 못하면 쓰기는 `NOT RUN`으로 남기고 경로를 추측하지 않습니다.

자동 관찰과 일반적인 수동 기억 요청은 현재 프로젝트에 기록합니다. 다른 프로젝트에도 유용하다는
이유만으로 저장 위치를 바꾸지 않습니다. 아래 글로벌 계층은 사용자가 지정한 공유 기억 저장소이며,
CLI 설정·네이티브 메모리 폴더를 뜻하지 않습니다. 조회만 할 때는 없는 폴더나 파일을 만들지 않습니다.

## 2계층 저장 구조

```
어떤-프로젝트/memory/
├── gotchas/                        ← 실패 패턴 (오답노트)
│   ├── index.md
│   ├── observations.jsonl          ← 에러 관찰 로그 (자동 생성)
│   ├── 001-특정API-반올림주의.md
│   └── 002-빌드설정-함정.md
└── learned/                        ← 성공 패턴 (학습 노트)
    ├── index.md
    ├── observations.jsonl          ← 성공 관찰 로그 (자동 생성)
    ├── 001-grep-먼저-edit-나중에.md
    └── 002-테스트-먼저-구현-나중에.md
```

- 기록할 때만 확정된 프로젝트 루트 아래에 필요한 `memory/` 폴더 생성
- 므네모가 이미 `memory/`를 관리하므로 별도 `.gitignore` 처리 불필요
- Claude, Codex, Antigravity 어떤 CLI에서든 접근 가능

### 참조 순서

1. **글로벌** 지정된 공유 기억 저장소가 있으면 그 `memory/gotchas/` + `memory/learned/` 확인
2. **프로젝트** 현재 프로젝트의 `memory/gotchas/` + `memory/learned/` 확인
3. 현재 작업과 관련된 키워드 매칭 → 해당 파일만 읽기

### 저장 범위 판단

| 범위 | 기준 | 예시 |
|------|------|------|
| **글로벌 승격 후보** | 다른 프로젝트에서도 확인된 공통 패턴; 현재 프로젝트에 기록 후 승격 후보로 표시 | YAML 파싱, PowerShell 성능, 서브에이전트 return 폭발 |
| **프로젝트 (기본)** | 일반 기억 요청과 프로젝트 고유 규칙 | 특정 DB 스키마, 사내 API 주의점, 빌드 설정 |

범위가 애매하면 프로젝트에 기록합니다. 글로벌 기록·승격은 사용자가 그 범위와 대상 저장소를
명시한 별도 작업에서 수행합니다. 이미 확인된 범위·대상은 다시 승인받지 않으며, 대상만
불명확하면 그 경로를 확인합니다. 단순히 "기억해"라는 요청을 글로벌 쓰기로 해석하지 않습니다.

## 기록 유형

| 유형 | 설명 | 예시 |
|------|------|------|
| **CLI 오답** | Claude/Codex/Antigravity가 반복 실수하는 패턴 | return text 폭발, YAML 형식 오류 |
| **환경 함정** | OS/도구/라이브러리의 예상치 못한 동작 | PowerShell tail 성능, .bat 인코딩 |
| **설치 함정** | dependency 누락, 설정 오류 | node_modules 누락 handshake 실패 |

## 워크플로우

### 1. 참조 (작업 시작 시)

1. 지정된 공유 기억 저장소가 있으면 `memory/{gotchas,learned}/index.md` 존재 여부 확인
2. 프로젝트 `memory/{gotchas,learned}/index.md` 존재 여부 확인
3. 양쪽 인덱스에서 현재 작업과 관련된 키워드 매칭
4. 매칭된 항목의 개별 파일만 읽기 (전체 읽기 금지)

### 2. 기록 (사용자 요청 또는 자발적 제안)

기록 트리거:
- 사용자가 "실수였어", "gotcha 추가", "오답노트" 등 요청
- CLI가 실수를 수정당한 후 반복 가능한 패턴이라 판단되면 자발적 제안

기록 절차:

1. 기본 프로젝트 루트를 확정하고 gotchas/learned 유형 선택; 명시된 글로벌 작업은 아래 승격 규칙 적용
2. 확정된 루트의 `memory/{gotchas,learned}/` 중 해당 디렉터리만 필요 시 생성
3. `index.md`가 없으면 빈 인덱스 테이블로 초기화
4. 기존 파일명에서 마지막 번호 확인 → 다음 번호로 파일 생성
5. `index.md` 테이블에 행 추가

### 3. 자발적 제안 판단 기준

기록을 제안할 것:
- CLI가 **2회 이상 같은 유형의 실수**를 했을 때
- 사용자가 **"아까도 그랬잖아"** 류의 지적을 했을 때
- 환경/도구의 **문서화되지 않은 동작**을 발견했을 때

기록하지 않을 것:
- 단순 오타, 일회성 실수
- 이미 CLAUDE.md에 규칙으로 등록된 내용
- 프로젝트와 무관한 일반 지식

## 파일 형식

### index.md (인덱스)

```markdown
# Gotchas

| # | 함정 | 유형 | 키워드 | 파일 |
|---|------|------|--------|------|
| 1 | 서브에이전트 return 폭발 | CLI 오답 | agent, subagent | [001-서브에이전트-return-폭발.md](001-서브에이전트-return-폭발.md) |
```

### 개별 gotcha 파일

```markdown
# 제목

`tags: keyword1, keyword2, keyword3`
`type: CLI 오답 | 환경 함정 | 설치 함정`
`date: YYYY-MM-DD`
`source: codex`  ← 예시; 실제 작성 CLI 한 값

**함정**: 무엇이 잘못되었는지 (구체적으로)
**해결**: 어떻게 고쳤는지 (재현 가능하게)
**교훈**: 다음에 이 상황에서 어떻게 해야 하는지
```

태그는 최소 3개, `source`는 실제 작성 CLI(`claude`, `codex`, `antigravity`, `grok`)를 사용합니다.
위 예시는 본문 형식이며, 근거·대안·재검토 조건 등은 적용 중인 Mnemo 기억 관리 계약을 따릅니다.
기존 항목을 단순 참조·복사하는 경우 작성자를 현재 CLI로 바꾸지 않고 원래 출처를 보존합니다.

## 승격 규칙

- 프로젝트 gotcha가 **다른 프로젝트에서도 동일하게 발생**하면 글로벌 승격 후보로 표시합니다.
  후보 판정만으로 다른 저장소나 전역 규칙을 수정하지 않습니다.
- 명시된 글로벌 기록·승격 작업에서는 대상 공유 저장소를 별도 작업 루트로 확정하고 같은
  `project-storage.md` 루트 판별을 적용합니다. HOME·CLI 설정 폴더를 임의 대상에 사용하지 않습니다.
- 대상의 기존 항목을 확인해 필요한 내용과 원래 출처를 기록합니다. 원본 프로젝트 항목은 보존하고,
  대상 쓰기가 성공한 뒤에만 원본 index.md에 `PROMOTED → <대상 항목 경로>`를 남깁니다.
- 글로벌 항목을 상시 지침으로 반영하는 것도 별도 명시 범위에서 수행합니다. 실제 대상
  `CLAUDE.md`·`AGENTS.md` 등으로 반영한 뒤에만 `PROMOTED → <대상 지침>`을 표시합니다.

## 자동 관찰 시스템

### 구조

```
skills/project-gotchas/
├── SKILL.md              ← 이 파일 (규칙서)
└── config.json           ← 관찰 설정

hooks/
├── save-tool-use.ps1|sh          ← Claude PostToolUse: 도구 단위 관찰
├── codex-mnemo/save-turn.ps1|sh  ← Codex notify: 턴 단위 관찰
├── antigravity-mnemo/save-turn.js ← Antigravity Stop: 턴 단위 관찰
└── grok-mnemo/save-turn.ps1|sh   ← Grok Stop: 턴 단위 관찰
```

### 동작 흐름

별도 훅 없이 각 CLI의 므네모 저장 훅에 통합되어 동작합니다.

```
Claude: 도구 호출 완료 (PostToolUse)
    ↓
hooks/save-tool-use.ps1|sh (기존 므네모 훅)
    ↓ 1. 도구 사용 로그 기록 (conversations/toollog.md) ← 기존 기능
    ↓ 2. 에러 패턴 감지 (error|fail|exception|denied 등)
    ↓ 에러가 있는 경우만:
    ↓   memory/gotchas/ 없으면 자동 생성
    ↓   시크릿 스크러빙
    ↓   observations.jsonl에 기록
    ↓
Codex/Antigravity/Grok: 턴 종료/응답 완료 훅
    ↓
save-turn.ps1|sh
    ↓ 응답에 에러 패턴이 있으면 memory/gotchas/observations.jsonl
    ↓ 정상 응답이면 memory/learned/observations.jsonl

observations.jsonl 에 관찰 축적
    ↓ 새 관찰 delta 또는 핸드오프 경과 기준 도달 시 텍스트 알림만 생성
    ↓ 사용자 /memory-distill 또는 핸드오프 정제
skills/memory-distill/SKILL.md (현재 CLI가 직접 실행)
    ↓ 클러스터링·중복/모순·범위·승격 후보 판단
memory/gotchas/·memory/learned/ 정제 파일 + index 갱신
```

### 정제 실행 경계

정제는 현재 CLI가 `memory-distill` 계약을 직접 수행하므로 별도 named agent나 고정 모델이 필요하지 않습니다. 대용량 입력의 읽기 전용 클러스터 추출만 네이티브 일반 작업자에게 격리할 수 있고, archive·쓰기·인덱스 갱신은 메인 스킬 실행이 담당합니다.

### 훅 등록

별도 등록 불필요. 므네모 설치 시 각 CLI에 맞는 훅이 자동 등록됩니다.
Claude는 도구 단위 관찰, Codex/Antigravity는 구조적 한계상 턴 단위 관찰입니다.

### 설정 (config.json)

```json
{
  "observer": {
    "enabled": true,
    "notify_threshold_new_observations": 200,
    "notify_threshold_handoff_days": 14
  }
}
```

| 키 | 기본값 | 설명 |
|----|--------|------|
| `observer.enabled` | `true` | 관찰 활성화 여부 |
| `observer.notify_threshold_new_observations` | `200` | 마지막 정제 offset 이후 새 raw 합계가 이 이상이면 안내 출력 |
| `observer.notify_threshold_handoff_days` | `14` | 마지막 핸드오프가 이 일수보다 오래되면 안내 출력 |

### 정제 트리거 (의도된 설계)

**자동 분석기는 두지 않습니다** — LLM 호출 비용을 한 번에 하나의 명시적 트리거에만 묶기 위함입니다.
같은 세션 내 학습은 컨텍스트가 처리하므로, 정제는 **세션 경계**(핸드오프) 또는 **사용자 의지**(/memory-distill)에서만 일어납니다.

| 트리거 | 빈도 | 깊이 | LLM 비용 | 역할 |
|--------|------|------|---------|------|
| Stop 훅 (jsonl append) | 매 응답 | 0 | 0 | 관찰 수집 |
| Stop 훅 (mnemo-status notify) | 임계값 도달 시 | 0 (텍스트 출력만) | 0 | 사용자 인지 |
| `/memory-distill` | 사용자 의지 | 풀 정제 + rebuild | 1회 | **주 정제** |
| 핸드오프 자동 추출 | 컨텍스트 위기 | 풀 정제 + 통합 | 1회 | 세션 경계 정제 |

`/memory-distill`과 핸드오프 자동 추출은 동일한 `memory-distill` rebuild 계약을 공유합니다.
Stop 훅의 안내 출력은 LLM 호출이 아니라 단순 텍스트 — `memory/.mnemo-status.md` 파일 작성 + stderr 한 줄.

### 관찰 데이터 관리

- **에러가 포함된 도구 호출만** 기록 (노이즈 최소화)
- `observations.jsonl`은 10MB 초과 시 자동 아카이브
- 아카이브: `memory/gotchas/archive/observations-YYYY-MM-DD.jsonl`
- 시크릿 패턴(api_key, token, password 등)은 `[REDACTED]`로 자동 스크러빙
- Glob/Grep/Read 등 빈번한 도구는 save-tool-use에서 이미 스킵

## 주의사항

- `index.md`는 **간결하게** 유지 (인덱스만, 상세 내용은 개별 파일에)
- 파일명은 `NNN-짧은-설명.md` 형식 (번호로 순서 보장)
- gotchas가 30개 이상 쌓이면 유형별로 하위 디렉토리 분리 고려
- 글로벌과 프로젝트 양쪽에 같은 내용이 중복되지 않도록 주의
- 분석 에이전트의 return은 **1줄 요약만** (컨텍스트 폭발 방지)
