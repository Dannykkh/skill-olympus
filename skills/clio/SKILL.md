---
name: clio
description: >
  전체 파이프라인 완료 후 마무리 스킬 (클리오 — 역사의 뮤즈). 소스 기반 프로세스
  흐름도 추출, 기존 검증 결과(argos/minos) 수집, 문서 산출물(PRD, 기술문서,
  매뉴얼) 일괄 생성. /clio로 실행.
triggers:
  - "clio"
  - "클리오"
  - "kleio"
  - "마무리"
  - "최종 점검"
  - "최종점검"
  - "산출물 생성"
  - "closer"
  - "클로저"
  - "final-inspection"
auto_apply: false
---

# Clio (클리오) — 역사의 뮤즈, 마지막 기록자

> **클리오(Clio / Kleio)**: 그리스 신화 9 뮤즈 중 **역사의 뮤즈**.
> 영웅의 위업과 사건을 책에 기록해 후대에 남긴다.
>
> 설계 → 구현 → 감리 → QA까지 모든 파이프라인이 끝난 뒤,
> 소스 코드 기준으로 흐름도를 추출하고 문서 산출물을 일괄 생성하는 스킬.
> 검사를 다시 하는 게 아니라, **최종 확정된 코드를 후대에 남길 기록으로 정리**하는 것이 핵심.

## Quick Start

```
/clio                          # 프로젝트 자동 탐색
/clio src/                     # 특정 소스 디렉토리 지정
/clio --docs-only              # 문서 생성만 실행 (Phase 2~3)
/clio --flow-only              # 흐름도만 추출 (Phase 1)
```

**공식 호출명:** `/clio` (별칭: `클리오`, `마무리`, `최종 점검`, 레거시: `/closer`, `클로저`)

## 파이프라인 위치

```
/zephermine → /agent-team → /argos → /minos → /clio
  설계사        포세이돈        감리관     QA 실사       기록자(역사의 뮤즈)
```

**전제 조건:** 설계 → 구현 → 감리 → QA 전체 파이프라인이 완료된 상태

---

## CRITICAL: First Actions

### 1. Print Intro

```
Clio(클리오) — 역사의 뮤즈, 기록 시작
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
순서: Detect → Phase 1 (흐름도) → Phase 2 (문서) → Phase 3 (보고서)
"코드가 진실" — 최종 확정된 소스 코드에서 모든 산출물을 생성합니다.
```

### 2. Detect Project

프로젝트를 감지합니다:

1. `$ARGUMENTS`로 전달된 경로 사용
2. 없으면 현재 디렉토리에서 자동 감지:
   - `package.json`, `pom.xml`, `pyproject.toml`, `*.csproj` 등 프로젝트 파일 탐색
   - `src/`, `app/`, `lib/` 등 소스 디렉토리 탐색
3. 기존 산출물 수집 (archive/ 경로 제외):
   - `docs/plan/*/spec.md` — 설계 산출물
   - `docs/plan/*/verify-report.md` — argos 감리 보고서
   - `docs/flow-diagrams/` — 기존 흐름도
   - Playwright/Cypress 테스트 결과 — minos 결과

상태 출력:

```
📂 프로젝트 감지:
  프로젝트: {project-name}
  기술 스택: {tech-stack}
  소스 경로: {src-path}

📋 기존 산출물:
  설계(spec):        {있음/없음}
  감리(argos):       {PASS/CONDITIONAL/FAIL | 없음}
  QA(minos):    {통과율 N% | 없음}
  흐름도:            {N개 | 없음}
```

### 3. Archive Previous & Create Output Directory

**기존 산출물이 있으면 아카이브 후 클린 상태로 시작합니다.**

1. `docs/clio/latest/` 디렉토리가 존재하는지 확인
2. 존재하면 → `docs/clio/archive/YYYY-MM-DD-HHMMSS/`로 이동
3. 새 `docs/clio/latest/` 디렉토리 생성

```
docs/
└── clio/
    ├── latest/                     # 항상 최신본 (여기를 참조)
    │   ├── flow-diagrams/          # Phase 1 산출물
    │   │   ├── system-overview.mmd
    │   │   └── {feature-name}.mmd
    │   ├── PRD.md                  # Phase 2 산출물
    │   ├── TECHNICAL.md            # Phase 2 산출물
    │   ├── USER-MANUAL.md          # Phase 2 산출물
    │   └── FINAL-REPORT.md         # Phase 3 산출물
    └── archive/                    # 이전 실행 이력
        ├── 2026-03-16-143000/
        └── 2026-03-10-091500/
```

---

## Phase 1: 소스 기반 프로세스 흐름도 추출

**목적:** 최종 확정된 소스 코드에서 실제 프로세스 흐름을 Mermaid 다이어그램으로 추출

### 절차

1. **엔트리포인트 탐색**
   - API: 라우터/컨트롤러에서 엔드포인트 목록 추출
   - UI: 페이지/라우트 목록 추출
   - 서비스: 주요 public 메서드 추출

2. **핵심 흐름 식별** (서브에이전트 `subagent_type="Explore"` 사용)
   - 사용자 요청 → 응답까지의 주요 흐름 추적
   - 분기(if/else, switch), 에러 처리, 외부 호출 식별
   - 흐름별 Mermaid flowchart 생성

3. **다이어그램 파일 저장**
   - `docs/clio/latest/flow-diagrams/{feature-name}.mmd`
   - 전체 시스템 개요 다이어그램: `system-overview.mmd`

4. **기존 흐름도와 비교** (있는 경우)
   - `docs/flow-diagrams/` 또는 `docs/plan/*/flow-diagrams/`에 기존 다이어그램이 있으면
   - `flow-verifier` verify 모드 로직을 참조하여 기존 설계 ↔ 최종 코드 차이 표시
   - 차이가 있으면 리포트에 기록 (설계 변경 이력으로 활용)

**Phase 1 출력:**

```
✅ Phase 1 완료: 프로세스 흐름도 추출
  생성: {N}개 다이어그램
  시스템 개요: system-overview.mmd
  핵심 흐름: {feature-1}.mmd, {feature-2}.mmd, ...
  설계 대비 차이: {있음/없음}
```

---

## Phase 2: 문서 산출물 생성

**목적:** Phase 1의 흐름도 + 기존 검증 결과 + 소스 코드를 기반으로 문서 생성

**원칙: "코드가 진실"** — 설계 문서가 아니라 최종 확정된 코드에서 문서를 추출합니다.

3종 문서의 입력/출력 경로 및 포함 항목 상세: See [document-templates.md](references/document-templates.md)

### 2-1. PRD — `docs/clio/latest/PRD.md`

`documentation` 에이전트 패턴을 참조하여 생성. 소스 코드 기준으로 기능 요구사항, 데이터 모델, API 목록, 화면 흐름을 추출합니다.

### 2-2. 기술 문서 — `docs/clio/latest/TECHNICAL.md`

아키텍처 개요(Mermaid C4), 기술 스택, 핵심 모듈, 환경 설정, 빌드/배포 절차를 포함합니다.

### 2-3. 사용자 매뉴얼 — `docs/clio/latest/USER-MANUAL.md`

기능별 사용법, 화면 가이드(UI), 또는 API 레퍼런스(API only), FAQ/트러블슈팅을 포함합니다.

**Phase 2 출력:**

```
✅ Phase 2 완료: 문서 산출물 생성
  PRD.md          — {N}개 기능 요구사항, {M}개 API 엔드포인트
  TECHNICAL.md    — {N}개 모듈, {M}개 의존성
  USER-MANUAL.md  — {N}개 기능 가이드
```

---

## Phase 3: 최종 보고서

모든 Phase 결과 + 기존 검증 결과(argos, minos)를 통합한 최종 보고서를 생성합니다.

**출력:** `docs/clio/latest/FINAL-REPORT.md`

보고서 마크다운 전체 템플릿: See [report-template.md](references/report-template.md)

### 사용자에게 안내

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Clio 기록 완료! 모든 산출물을 후대에 남겼습니다.

📁 산출물 위치: docs/clio/latest/
  FINAL-REPORT.md   — 최종 보고서 (파이프라인 결과 통합)
  flow-diagrams/    — 프로세스 흐름도 (소스 기반)
  PRD.md            — 제품 요구사항 문서
  TECHNICAL.md      — 기술 문서
  USER-MANUAL.md    — 사용자 매뉴얼

📂 이전 이력: docs/clio/archive/

👉 다음 단계:
  /commit              → 산출물 커밋
  /wrap-up             → 세션 요약
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 옵션

| 옵션 | 설명 | 기본값 |
|------|------|--------|
| `--docs-only` | Phase 2~3만 실행 (문서 생성만) | false |
| `--flow-only` | Phase 1만 실행 (흐름도만) | false |
| `--output-dir` | 산출물 디렉토리 변경 | `docs/clio/latest/` |

---

## 예외사항

다음은 **문제가 아닙니다**:

1. **argos/minos 미실행** — 보고서에 "미실행"으로 기록하고 문서 생성은 정상 진행
2. **기존 설계 산출물 없음** — 코드 기준으로 문서를 생성하므로 spec.md가 없어도 동작
3. **UI 없음** — Phase 2에서 API 레퍼런스 매뉴얼로 대체
4. **기존 흐름도 없음** — Phase 1에서 새로 생성 (비교 단계만 건너뜀)

---

## 연관 스킬

| 스킬 | 역할 | 연결 |
|------|------|------|
| zephermine | 설계 산출물 생성 | 기존 spec 참조 (있으면) |
| agent-team | 구현 수행 | 선행 완료 |
| argos | 감리 (준공검사) | 보고서 수집 (verify-report.md) |
| minos | Playwright QA 실사 | 테스트 결과 수집 |
| flow-verifier | 프로세스 흐름도 생성/검증 | Phase 1에서 활용 |
| documentation | 문서 생성 에이전트 | Phase 2 템플릿 참조 |
| mermaid-diagrams | Mermaid 문법 가이드 | Phase 1 다이어그램 생성 시 참조 |
| zeus | 전체 파이프라인 | zeus 완료 후 /clio로 마무리 |

## Related Files

| 파일 | 역할 |
|------|------|
| `skills/flow-verifier/SKILL.md` | 프로세스 흐름도 생성/검증 로직 |
| `skills/argos/SKILL.md` | 감리 검증 프로세스 |
| `agents/documentation.md` | 문서 생성 에이전트 (PRD, API, IMPLEMENTATION 템플릿) |
| `skills/qa-test-planner/SKILL.md` | QA 테스트 계획 생성 |
| `skills/mermaid-diagrams/SKILL.md` | Mermaid 문법 가이드 |
