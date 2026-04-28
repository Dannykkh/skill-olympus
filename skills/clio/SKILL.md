---
name: clio
description: >
  마무리투수(Closer) + 역사의 뮤즈. 파이프라인 최종 점검(GO/NO-GO 판정) +
  소스 기반 흐름도 추출 + 문서 산출물(PRD, 기술문서, 매뉴얼) 일괄 생성.
  /clio로 실행.
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
license: MIT
metadata:
  version: "2.0.0"
---

# Clio (클리오) — 마무리투수 + 역사의 뮤즈

> **클리오(Clio / Kleio)**: 그리스 신화 9 뮤즈 중 **역사의 뮤즈**.
> 야구의 마무리투수(Closer)처럼, 모든 파이프라인이 끝난 뒤 최종 점검하고 판정을 내린다.
> 그리고 역사의 뮤즈답게, 확정된 코드를 후대에 남길 기록으로 정리한다.
>
> **마무리투수 → 기록자.** 점검 먼저, 문서는 그 다음.

## Quick Start

```
/clio                          # 전체 실행 (점검 + 문서)
/clio src/                     # 특정 소스 디렉토리 지정
/clio --check-only             # 최종 점검만 (Phase 1, GO/NO-GO 판정)
/clio --docs-only              # 문서 생성만 (Phase 2~3, 점검 건너뜀)
/clio --flow-only              # 흐름도만 추출 (Phase 2)
```

**공식 호출명:** `/clio` (별칭: `클리오`, `마무리`, `최종 점검`, 레거시: `/closer`, `클로저`)

## 파이프라인 위치

```
/zephermine → /agent-team → /argos → /minos → /clio
  설계사        포세이돈        감리관     QA 실사      마무리투수 + 기록자
```

**전제 조건:** 구현이 완료된 상태. argos/minos는 선행 권장이지만 필수는 아님.

---

## CRITICAL: First Actions

### 1. Print Intro

```
Clio(클리오) — 마무리투수 등판
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
순서: Detect → Phase 1 (최종 점검) → Phase 2 (흐름도) → Phase 3 (문서) → Phase 3.5 (문서 사이트) → Phase 4 (보고서)
"마무리투수가 먼저 점검하고, 역사의 뮤즈가 기록한다."
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
  QA(minos):         {통과율 N% | 없음}
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
    │   ├── CHECKLIST.md            # Phase 1 산출물 (최종 점검 결과)
    │   ├── flow-diagrams/          # Phase 2 산출물
    │   │   ├── system-overview.mmd
    │   │   └── {feature-name}.mmd
    │   ├── PRD.md                  # Phase 3 산출물
    │   ├── TECHNICAL.md            # Phase 3 산출물
    │   ├── USER-MANUAL.md          # Phase 3 산출물
    │   └── FINAL-REPORT.md         # Phase 4 산출물
    └── archive/                    # 이전 실행 이력
```

---

## Phase 1: 최종 점검 (마무리투수)

**목적:** 모든 파이프라인 결과를 수집하고, 누락·미통과 항목을 탐지하여 GO/NO-GO를 판정한다.

### 1-1. 파이프라인 결과 수집

| 항목 | 수집 방법 | 없으면 |
|------|----------|--------|
| argos 감리 보고서 | `docs/plan/*/verify-report.md` 파싱 | "미실행" 기록 |
| minos QA 결과 | Playwright 테스트 결과 파싱 | "미실행" 기록 |
| 설계 spec | `docs/plan/*/spec.md` | "없음" 기록 |
| 섹션 AC | `docs/plan/*/sections/section-*.md`에서 Acceptance Criteria 추출 | 건너뜀 |

### 1-2. 코드 품질 최종 실행

서브에이전트(`model: "sonnet"`)에게 아래를 실행시킵니다:

```bash
# 테스트 실행
npm test 2>&1 || pytest 2>&1 || go test ./... 2>&1 || dotnet test 2>&1

# 린트
npx eslint src/ 2>&1 || ruff check . 2>&1 || golangci-lint run 2>&1

# 타입 체크
npx tsc --noEmit 2>&1 || mypy . 2>&1

# 테스트 커버리지 (가능하면)
npx jest --coverage 2>&1 || pytest --cov=src 2>&1
```

프로젝트에 해당 도구가 없으면 건너뜁니다 (에러 무시).

### 1-3. 누락 탐지

spec이 있으면, **설계 대비 구현 누락**을 탐지합니다:

1. spec.md에서 기능 목록 추출
2. 소스 코드에서 해당 기능이 구현되었는지 Grep으로 확인
3. Acceptance Criteria가 있으면 각 항목의 충족 여부 확인
4. 누락된 기능/AC 목록 생성

### 1-4. GO / NO-GO 판정

| 판정 | 조건 |
|------|------|
| **GO** | 테스트 전체 통과 + 린트 에러 0 + 타입 에러 0 + 누락 기능 0 |
| **CONDITIONAL GO** | 테스트 통과 + Minor 린트 경고만 있음, 또는 argos/minos 미실행 |
| **NO-GO** | 테스트 실패, 또는 누락 기능 있음, 또는 argos FAIL |

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
마무리투수 판정: {GO / CONDITIONAL GO / NO-GO}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  테스트:       {PASS (N/N) | FAIL (N/M)}
  린트:         {CLEAN | WARN N개 | ERROR N개}
  타입 체크:    {PASS | FAIL N개}
  커버리지:     {N% | 미측정}
  argos 감리:   {PASS | CONDITIONAL | FAIL | 미실행}
  minos QA:     {N% 통과 | 미실행}
  구현 누락:    {없음 | N개 항목}

  블로커: {없음 | 목록}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**NO-GO 시:**
- 블로커 목록을 사용자에게 보고
- "블로커를 해결한 뒤 `/clio`를 다시 실행해주세요" 안내
- Phase 2~4 진행하지 않음 (문서를 만들어봤자 코드가 바뀔 것)

**CONDITIONAL GO 시:**
- 경고 목록을 보고하고 사용자에게 확인
- 사용자가 승인하면 Phase 2로 진행

**GO 시:**
- Phase 2로 즉시 진행

**Phase 1 출력:** `docs/clio/latest/CHECKLIST.md`

---

## Phase 2: 소스 기반 프로세스 흐름도 추출

**목적:** 최종 확정된 소스 코드에서 실제 프로세스 흐름을 Mermaid 다이어그램으로 추출

### 절차

1. **엔트리포인트 탐색**
   - API: 라우터/컨트롤러에서 엔드포인트 목록 추출
   - UI: 페이지/라우트 목록 추출
   - 서비스: 주요 public 메서드 추출

2. **핵심 흐름 식별** (서브에이전트 `model: "sonnet"`, `subagent_type="Explore"` 사용)
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

**Phase 2 출력:**

```
✅ Phase 2 완료: 프로세스 흐름도 추출
  생성: {N}개 다이어그램
  시스템 개요: system-overview.mmd
  핵심 흐름: {feature-1}.mmd, {feature-2}.mmd, ...
  설계 대비 차이: {있음/없음}
```

---

## Phase 3: 문서 산출물 생성

**목적:** Phase 2의 흐름도 + 기존 검증 결과 + 소스 코드를 기반으로 문서 생성

**원칙: "코드가 진실"** — 설계 문서가 아니라 최종 확정된 코드에서 문서를 추출합니다.

3종 문서의 입력/출력 경로 및 포함 항목 상세: See [document-templates.md](references/document-templates.md)

### Phase 3 시작: 도메인사전 컨텍스트 로드

`docs/domain-dictionary.md`가 있으면 모든 문서 생성 서브에이전트에게 컨텍스트로 주입합니다. 없으면 이 단계 건너뜀.

**문서별 사전 활용:**

| 문서 | 사전 활용 |
|------|----------|
| PRD.md | 기능명/엔터티명을 사전 영문 식별자로 표기 + 한글 표기 병기. 금지 표현 검출 시 정정 |
| TECHNICAL.md | 모듈명/클래스명/타입명이 사전 영문 식별자 따르는지 확인. 위반 시 보고 (코드 수정은 clio 권한 외) |
| USER-MANUAL.md | UI 라벨/메뉴명/메시지가 사전 한글 표기 따르는지 확인. 매뉴얼 본문은 사전 표기로 통일 |

**용어 색인 자동 생성**: 3종 문서 모두에 마지막 부록으로 "용어 색인" 섹션 자동 추가 (사전을 alphabetical로 나열, 한글 표기 + 한 줄 정의).

신규 멤버 온보딩 시 USER-MANUAL.md 한 장으로 도메인 어휘 + 사용법을 동시에 학습 가능.

### 3-1. PRD — `docs/clio/latest/PRD.md`

`documentation` 에이전트 패턴을 참조하여 서브에이전트(`model: "sonnet"`)에게 생성 위임.
소스 코드 기준으로 기능 요구사항, 데이터 모델, API 목록, 화면 흐름을 추출합니다.

### 3-2. 기술 문서 — `docs/clio/latest/TECHNICAL.md`

아키텍처 개요(Mermaid C4), 기술 스택, 핵심 모듈, 환경 설정, 빌드/배포 절차를 포함합니다.

### 3-3. 사용자 매뉴얼 — `docs/clio/latest/USER-MANUAL.md`

기능별 사용법, 화면 가이드(UI), 또는 API 레퍼런스(API only), FAQ/트러블슈팅을 포함합니다.

**Phase 3 출력:**

```
✅ Phase 3 완료: 문서 산출물 생성
  PRD.md          — {N}개 기능 요구사항, {M}개 API 엔드포인트
  TECHNICAL.md    — {N}개 모듈, {M}개 의존성
  USER-MANUAL.md  — {N}개 기능 가이드
```

---

## Phase 3.5: 문서 사이트 생성 (웹 매뉴얼)

**목적:** Phase 3에서 만든 마크다운 문서를 docs.example.com 같은 문서 웹사이트로 빌드

> 마크다운 파일만 있으면 아무도 안 본다. 웹 문서로 만들어야 실제로 쓰인다.

### 3.5-1. 기존 문서 프레임워크 감지

```bash
# 기존 문서 사이트 감지
_DOC_FRAMEWORK=""
[ -f "docusaurus.config.js" ] || [ -f "docusaurus.config.ts" ] && _DOC_FRAMEWORK="docusaurus"
[ -f "mkdocs.yml" ] && _DOC_FRAMEWORK="mkdocs"
[ -f ".vitepress/config.ts" ] || [ -f ".vitepress/config.js" ] && _DOC_FRAMEWORK="vitepress"
[ -f "astro.config.mjs" ] && grep -q "starlight" "astro.config.mjs" && _DOC_FRAMEWORK="starlight"

echo "DOC_FRAMEWORK: ${_DOC_FRAMEWORK:-없음}"
```

### 3.5-2. 프레임워크 선택 (없으면)

기존 프레임워크가 없으면 프로젝트 스택에 맞게 자동 선택:

| 프로젝트 스택 | 추천 | 이유 |
|-------------|------|------|
| React / Next.js | **Docusaurus** | React 기반, MDX 지원, 버전 관리 |
| Vue / Nuxt | **VitePress** | Vue 기반, Vite 빌드, 가벼움 |
| Python / FastAPI | **MkDocs Material** | pip install 한 줄, 가장 간단 |
| 기타 / 범용 | **VitePress** | 빠르고 가볍고 마크다운 그대로 사용 |

### 3.5-3. 셋업 + 문서 배치

서브에이전트(`model: "sonnet"`)에게 실행 위임:

**핵심: 복사가 아니라 직접 참조.** 문서 프레임워크가 `docs/clio/latest/`를 소스로 읽도록 설정하면, md를 수정할 때 Hot Reload로 즉시 반영됩니다.

**VitePress 예시:**
```bash
# 초기화 (docs/clio/latest/를 소스 루트로 지정)
npm add -D vitepress

# .vitepress/config.ts에서 srcDir을 clio 산출물로 지정
# → 별도 복사 불필요, md 수정 시 즉시 반영
```

```ts
// docs/clio/latest/.vitepress/config.ts
export default {
  title: '{프로젝트명} 문서',
  themeConfig: {
    sidebar: [
      { text: '시작하기', items: [
        { text: '소개', link: '/PRD' },
        { text: '사용자 가이드', link: '/USER-MANUAL' },
      ]},
      { text: '기술 문서', items: [
        { text: '아키텍처', link: '/TECHNICAL' },
        { text: '최종 보고서', link: '/FINAL-REPORT' },
      ]},
    ]
  }
}
```

```bash
# dev server (md 수정 → 즉시 반영)
npx vitepress dev docs/clio/latest
```

**MkDocs 예시:**
```bash
pip install mkdocs-material
```

```yaml
# mkdocs.yml (docs_dir을 clio 산출물로 지정)
site_name: '{프로젝트명} 문서'
docs_dir: docs/clio/latest
nav:
  - 소개: PRD.md
  - 사용자 가이드: USER-MANUAL.md
  - 기술 문서: TECHNICAL.md
  - 최종 보고서: FINAL-REPORT.md
```

```bash
mkdocs serve  # md 수정 → 즉시 반영
```

### 3.5-4. 사이드바/네비게이션 자동 생성

Phase 3 문서가 이미 `docs/clio/latest/`에 있으므로 그대로 소스 디렉토리로 사용합니다.
문서가 많아지면 분할하되, **원본 .md 파일이 유일한 소스**입니다:

```
docs/clio/latest/               ← 문서 사이트의 소스 루트
├── .vitepress/config.ts        # 또는 mkdocs.yml (사이트 설정)
├── index.md                    # 프로젝트 소개 (자동 생성)
├── PRD.md                      # Phase 3 원본 그대로
├── TECHNICAL.md                # Phase 3 원본 그대로
├── USER-MANUAL.md              # Phase 3 원본 그대로
├── CHECKLIST.md                # Phase 1 원본 그대로
├── FINAL-REPORT.md             # Phase 4 원본 그대로
└── flow-diagrams/              # Phase 2 원본 그대로
    ├── system-overview.mmd
    └── {feature}.mmd
```

> `.md`를 수정하면 문서 사이트가 즉시 반영됩니다. 별도 빌드/동기화 불필요.

### 3.5-5. 프리뷰 실행

```bash
# VitePress
npx vitepress dev docs

# MkDocs
mkdocs serve

# Docusaurus
npm start
```

사용자에게 프리뷰 URL 안내: `http://localhost:5173` (또는 해당 포트)

### Phase 3.5 건너뛰는 경우

- `--check-only`, `--flow-only` 옵션 사용 시
- 사용자가 "문서 사이트 불필요" 명시 시
- API만 있는 프로젝트에서 사용자가 거부 시

**Phase 3.5 출력:**

```
✅ Phase 3.5 완료: 문서 사이트 생성
  프레임워크: {VitePress / Docusaurus / MkDocs}
  페이지: {N}개
  프리뷰: http://localhost:{port}

  빌드: npx vitepress build docs
  배포: Vercel / Netlify / GitHub Pages
```

---

## Phase 4: 최종 보고서

모든 Phase 결과를 통합한 최종 보고서를 생성합니다.

**출력:** `docs/clio/latest/FINAL-REPORT.md`

보고서 마크다운 전체 템플릿: See [report-template.md](references/report-template.md)

### 사용자에게 안내

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Clio 기록 완료! 마무리투수가 판정하고, 역사의 뮤즈가 기록했습니다.

🏟️ 판정: {GO / CONDITIONAL GO}

📁 산출물 위치: docs/clio/latest/
  CHECKLIST.md      — 최종 점검 결과 (Phase 1)
  flow-diagrams/    — 프로세스 흐름도 (Phase 2)
  PRD.md            — 제품 요구사항 문서 (Phase 3)
  TECHNICAL.md      — 기술 문서 (Phase 3)
  USER-MANUAL.md    — 사용자 매뉴얼 (Phase 3)
  FINAL-REPORT.md   — 최종 보고서 (Phase 4)

📖 문서 사이트: http://localhost:{port} (Phase 3.5)
  프레임워크: {VitePress / Docusaurus / MkDocs}
  빌드: {빌드 명령어}

📂 이전 이력: docs/clio/archive/

👉 다음 단계:
  /commit              → 산출물 커밋
  /release             → 버전 태그 + CHANGELOG
  /launch              → 배포 전 체크리스트
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 옵션

| 옵션 | 설명 | 기본값 |
|------|------|--------|
| `--check-only` | Phase 1만 실행 (GO/NO-GO 판정만) | false |
| `--docs-only` | Phase 2~3만 실행 (문서 생성만, 점검 건너뜀) | false |
| `--flow-only` | Phase 2만 실행 (흐름도만) | false |
| `--no-site` | 문서 사이트 생성 건너뜀 (Phase 3.5 스킵) | false |
| `--output-dir` | 산출물 디렉토리 변경 | `docs/clio/latest/` |
| `--force` | NO-GO여도 문서 생성 강제 진행 | false |

---

## 예외사항

다음은 **문제가 아닙니다**:

1. **argos/minos 미실행** — CHECKLIST에 "미실행"으로 기록, CONDITIONAL GO로 판정
2. **기존 설계 산출물 없음** — 누락 탐지 건너뜀, 코드 기준으로 문서 생성
3. **UI 없음** — Phase 3에서 API 레퍼런스 매뉴얼로 대체
4. **기존 흐름도 없음** — Phase 2에서 새로 생성 (비교 단계만 건너뜀)
5. **테스트 프레임워크 없음** — CHECKLIST에 "미설정"으로 기록, 경고만

---

## 연관 스킬

| 스킬 | 역할 | 연결 |
|------|------|------|
| zephermine | 설계 산출물 생성 | spec + AC 참조 (누락 탐지) |
| agent-team | 구현 수행 | 선행 완료 |
| argos | 감리 (준공검사) | Phase 1에서 결과 수집 |
| minos | Playwright QA 실사 | Phase 1에서 결과 수집 |
| flow-verifier | 프로세스 흐름도 생성/검증 | Phase 2에서 활용 |
| documentation | 문서 생성 에이전트 | Phase 3 템플릿 참조 |
| mermaid-diagrams | Mermaid 문법 가이드 | Phase 2 다이어그램 생성 시 참조 |
| release-notes | 버전 + CHANGELOG | Phase 4 이후 후속 |
| shipping-and-launch | 배포 전 체크리스트 | Phase 4 이후 후속 |
| documentation-and-adrs | ADR 작성 | Phase 4 보고서에 ADR 목록 포함 가능 |
| zeus | 전체 파이프라인 | zeus 완료 후 /clio로 마무리 |

## Related Files

| 파일 | 역할 |
|------|------|
| `references/document-templates.md` | 3종 문서 포함 항목 상세 |
| `references/report-template.md` | 최종 보고서 마크다운 템플릿 |
| `skills/flow-verifier/SKILL.md` | 프로세스 흐름도 생성/검증 로직 |
| `skills/argos/SKILL.md` | 감리 검증 프로세스 |
| `agents/documentation.md` | 문서 생성 에이전트 (PRD, API, IMPLEMENTATION 템플릿) |
| `skills/minos/SKILL.md` | QA 시나리오 생성 + Playwright 테스트 |
| `skills/mermaid-diagrams/SKILL.md` | Mermaid 문법 가이드 |
