# Team Review Protocol

5개 Explore 서브에이전트가 spec을 병렬 분석하여 plan 품질을 높이는 단계.

## Overview

```
Phase A (병렬):
claude-spec.md ──┬──→ UX Agent (Claude) ─────────→ ux-analysis.md
                 ├──→ Architecture Agent (Claude) → architecture-analysis.md
                 ├──→ Red Team Agent (Claude) ────→ redteam-analysis.md
                 └──→ Domain Researcher (Claude)  → domain-research.md
                      (WebSearch로 산업별 기술/솔루션 검색)

Phase B (domain-research.md 활용):
                 ┌──→ Domain Process Expert ──────→ domain-process-analysis.md
                 │    (Codex / Gemini / Claude)
                 └──→ Domain Technical Expert ────→ domain-technical-analysis.md
                      (Gemini / Codex / Claude)
                                    │
                                    ▼
                            claude-team-review.md (통합)
```

## 에이전트 구성

### 고정 에이전트 (모든 프로젝트)

| # | 에이전트 | 관점 |
|---|----------|------|
| 1 | **UX Agent** | 사용자 경험, 사용성, 접근성, 사용자 여정 |
| 2 | **Architecture Agent** | 확장성, 성능, 보안, 기술 부채 |
| 3 | **Red Team Agent** (악마의 변호인) | 가정 검증, 실패 모드, 엣지 케이스, 누락 항목 |

### 동적 도메인 전문가 (산업군 기반)

| # | 에이전트 | 관점 |
|---|----------|------|
| 4 | **Domain Process Expert** | 해당 산업의 전체 업무 프로세스 |
| 5 | **Domain Technical Expert** | 해당 산업의 필수 기술/표준/규정 |

인터뷰에서 파악한 산업군(`[Industry: {산업군}]` 태그)을 기반으로 페르소나를 동적 결정.

> **Multi-AI 지원**: 도메인 전문가는 Codex/Gemini CLI가 설치되어 있으면 외부 AI로 실행하여 Claude 편향을 보완합니다. 고정 에이전트(UX, Architecture, Red Team)는 항상 Claude입니다.

## 산업군 → 도메인 전문가 매핑

| 산업군 | 프로세스 전문가 | 기술 전문가 |
|--------|----------------|-------------|
| 의료/헬스케어 | 병원 운영 전문가 (진료→처방→수납→보험청구) | 의료IT 전문가 (HL7/FHIR, HIPAA, EMR/EHR) |
| 금융/핀테크 | 금융 업무 전문가 (KYC→거래→정산→보고) | 금융IT 전문가 (PCI-DSS, 암호화, 실시간 거래) |
| 이커머스 | 커머스 운영 전문가 (상품등록→주문→결제→배송→CS) | 커머스 기술 전문가 (결제 PG, 재고 관리, 검색 엔진) |
| 교육/에듀테크 | 교육 과정 전문가 (커리큘럼→수업→평가→성적) | 에듀테크 전문가 (LMS, SCORM, 적응형 학습) |
| 물류/SCM | 물류 운영 전문가 (입고→보관→피킹→출고→배송) | 물류IT 전문가 (WMS, TMS, 바코드/RFID) |
| 제조 | 생산관리 전문가 (수주→자재→생산→품질→출하) | 제조IT 전문가 (MES, PLC, IoT 센서) |
| 부동산 | 부동산 거래 전문가 (매물등록→중개→계약→등기) | 프롭테크 전문가 (GIS, 공시가격 API, 등기 연동) |
| **범용 (불명확)** | **비즈니스 프로세스 분석가** | **시스템 통합 전문가** |

## 실행 절차

### 1단계: 입력 파일 준비 + 산업군 식별

1. `<planning_dir>/claude-interview.md`에서 `[Industry: {산업군}]` 태그 추출
2. 태그가 없으면 인터뷰 내용에서 산업군 추론, 없으면 "범용" 사용
3. 입력 파일 목록 확인:
   - `claude-spec.md` (필수)
   - `claude-interview.md` (필수)
   - `claude-research.md` (있으면 포함)

### 2단계: 도메인 전문가 페르소나 결정

산업군 매핑 테이블에서 프로세스/기술 전문가 페르소나 선택.
매핑에 없는 산업군이면 범용 fallback 사용.

### 3단계: External AI CLI 감지

도메인 전문가에 외부 AI(Codex/Gemini CLI)를 활용하여 Claude 편향을 보완합니다.

```bash
which codex 2>/dev/null && echo "codex: OK" || echo "codex: NOT FOUND"
which gemini 2>/dev/null && echo "gemini: OK" || echo "gemini: NOT FOUND"
```

**실행 모드 결정:**

| Codex | Gemini | 모드 | Process Expert | Technical Expert |
|-------|--------|------|----------------|------------------|
| ✅ | ✅ | **Dual-AI** | Codex (GPT) | Gemini |
| ✅ | ❌ | **Single-AI** | Codex | Codex |
| ❌ | ✅ | **Single-AI** | Gemini | Gemini |
| ❌ | ❌ | **Claude-only** | Explore subagent | Explore subagent |

**외부 AI 장점:** 같은 산업 분석을 서로 다른 LLM이 수행하면 다양한 관점 확보 + Claude 편향 보완.

### 4단계: 도메인 리서치 + 고정 에이전트 병렬 실행 (Phase A)

고정 3 에이전트와 도메인 리서치를 **동시에** 병렬 실행합니다.
도메인 전문가는 리서치 완료 후 5단계(Phase B)에서 실행합니다.

**⚠️ 컨텍스트 폭발 방지 — 필수 규칙:**
각 에이전트 프롬프트 끝에 반드시 아래 규칙을 포함해야 합니다:
```
CRITICAL RETURN RULE: Write your FULL analysis to the file specified above.
Your return message to the caller must be ONLY a 1-2 line summary like:
"✅ {filename}.md written. Critical: N, Important: N, Nice-to-Have: N"
DO NOT repeat the analysis content in your return message.
This prevents context overflow when 5 agents return simultaneously.
```

이 규칙이 없으면 5개 에이전트의 전체 분석 내용이 메인 대화에 합산되어 컨텍스트 한도 초과.

```
# Phase A: 고정 3 에이전트 + 도메인 리서치를 하나의 메시지에서 병렬 실행:

Task(
  subagent_type="Explore",
  prompt="""
  You are a **UX Expert** — 사용자 경험 전문가 (15년 경력).

  Read these files:
  - <planning_dir>/claude-spec.md
  - <planning_dir>/claude-interview.md
  - <planning_dir>/claude-research.md (if exists)

  Also explore the existing codebase for context.

  Analyze and report:
  1. **User Journey**: 주요 사용 시나리오별 흐름 매핑. 혼란/좌절 지점 식별.
  2. **Usability**: 정보 구조, 인지 부하, 일관성 문제.
  3. **Accessibility**: 키보드 네비게이션, 스크린 리더, 색상 대비.
  4. **Edge Scenarios**: 첫 사용자, 파워 유저, 에러 복구 시나리오.
  5. **DX** (프론트엔드 없는 프로젝트): API UX, 개발자 경험 관점.

  Format: 각 항목별 findings + severity (Critical/Important/Nice-to-Have).
  Write results to: <planning_dir>/team-reviews/ux-analysis.md

  CRITICAL RETURN RULE: Write your FULL analysis to the file above.
  Your return message must be ONLY: "✅ ux-analysis.md written. Critical: N, Important: N, Nice-to-Have: N"
  DO NOT repeat the analysis in your return message.
  """
)

Task(
  subagent_type="Explore",
  prompt="""
  You are a **Technical Architecture Expert** — 시스템 아키텍처 전문가 (15년 경력).

  Read these files:
  - <planning_dir>/claude-spec.md
  - <planning_dir>/claude-interview.md
  - <planning_dir>/claude-research.md (if exists)

  Also explore the existing codebase for context.

  Analyze and report:
  1. **Architecture Fit**: 아키텍처 패턴, 결합도, 데이터 흐름 적절성.
  2. **Scalability**: 병목 지점, 데이터 증가 대응, 캐싱 전략.
  3. **Performance**: 지연 민감 경로, I/O 패턴, DB 쿼리 효율성.
  4. **Security**: 인증/인가, 입력 검증, OWASP Top 10.
  5. **Tech Debt**: 의존성 리스크, 테스트 전략 적합성.

  Format: 각 항목별 findings + severity (Critical/Important/Nice-to-Have).
  Write results to: <planning_dir>/team-reviews/architecture-analysis.md

  CRITICAL RETURN RULE: Write your FULL analysis to the file above.
  Your return message must be ONLY: "✅ architecture-analysis.md written. Critical: N, Important: N, Nice-to-Have: N"
  DO NOT repeat the analysis in your return message.
  """
)

Task(
  subagent_type="Explore",
  prompt="""
  You are a **Red Team Agent** (악마의 변호인) — 모든 가정에 의문을 제기하는 전문가.

  Read these files:
  - <planning_dir>/claude-spec.md
  - <planning_dir>/claude-interview.md
  - <planning_dir>/claude-research.md (if exists)

  Also explore the existing codebase for context.

  Analyze and report:
  1. **Assumption Audit**: "simple"이라고 적힌 것이 진짜 심플한가? 숨겨진 복잡성.
  2. **Failure Modes**: 외부 의존성 장애, 레이스 컨디션, 데이터 손상 시나리오.
  3. **Edge/Corner Cases**: 경계값, 타이밍, 권한 변경, 동시성.
  4. **Scope Creep Risk**: 숨겨진 복잡성, 과소평가된 작업량.
  5. **Missing Items**: 에러 핸들링, 모니터링, 롤백, 마이그레이션, 문서.
  6. **Risk Matrix**: 각 리스크별 확률 × 영향 × 완화 방안.

  Be adversarial. Challenge EVERY assumption. If something "sounds easy", prove why it's not.
  Format: 각 항목별 findings + severity (Critical/Important/Nice-to-Have).
  Write results to: <planning_dir>/team-reviews/redteam-analysis.md

  CRITICAL RETURN RULE: Write your FULL analysis to the file above.
  Your return message must be ONLY: "✅ redteam-analysis.md written. Critical: N, Important: N, Nice-to-Have: N"
  DO NOT repeat the analysis in your return message.
  """
)

Task(
  subagent_type="Explore",
  prompt="""
  You are a **Domain Industry Researcher** for {산업군}.

  Read these files for context:
  - <planning_dir>/claude-spec.md
  - <planning_dir>/claude-interview.md

  Then use **WebSearch** to find current technologies, frameworks, standards, and solutions
  relevant to building a {산업군} system.

  Search and report:
  1. **필수 기술/표준**: {산업군}에서 사용하는 기술 표준, 프로토콜 (검색 키워드: "{산업군} technology standards")
  2. **오픈소스 솔루션**: GitHub stars 높은 관련 프로젝트 (URL + stars + 라이선스)
  3. **SaaS/상용 솔루션**: 시장에 있는 서비스 (가격대 포함)
  4. **규제/인증**: 법적 요구사항, 필수 인증 (예: HIPAA, PCI-DSS, GDPR)
  5. **업계 사례**: 유사 시스템 구축 사례, 아키텍처 블로그/포스트
  6. **SDK/API**: 연동에 사용되는 공식 SDK, API (예: PG 결제 API, FHIR API)

  For each finding:
  - Name + URL (가능하면)
  - Why it's relevant to this project
  - Adoption level: widely-used / emerging / niche

  NOTE: {산업군}을 인터뷰의 [Industry] 태그에서 추출한 실제 산업군으로 치환하여 실행.

  Write results to: <planning_dir>/team-reviews/domain-research.md

  CRITICAL RETURN RULE: Write your FULL research to the file above.
  Your return message must be ONLY: "✅ domain-research.md written. Technologies: N, Solutions: N, Regulations: N"
  DO NOT repeat the research in your return message.
  """
)
```

### 5단계: 도메인 전문가 실행 (Phase B)

4단계의 `domain-research.md`를 활용하여 도메인 전문가를 실행합니다.
**반드시 4단계 완료를 기다린 후 실행합니다** (domain-research.md 필요).

#### Claude-only 모드

```
# Phase B: 도메인 전문가 2명을 하나의 메시지에서 병렬 실행:

Task(
  subagent_type="Explore",
  prompt="""
  You are a **{산업군} Process Expert** — 20년 경력의 {산업군} 업무 전문가.
  {산업군}의 전체 비즈니스 프로세스와 업무 흐름을 깊이 이해하고 있습니다.

  Read these files:
  - <planning_dir>/claude-spec.md
  - <planning_dir>/claude-interview.md
  - <planning_dir>/claude-research.md (if exists)
  - <planning_dir>/team-reviews/domain-research.md (산업별 기술/솔루션 리서치)

  Use the domain-research.md findings to ground your analysis with real technologies and solutions.

  Analyze and report:
  1. **프로세스 완전성**: spec이 {산업군}의 핵심 업무 흐름을 빠짐없이 커버하는가?
  2. **프로세스 순서/의존성**: 업무 단계 간 순서가 올바른가? 누락된 단계는?
  3. **이해관계자**: 빠진 역할/부서가 있는가? (예: 승인자, 감사자, 외부 기관)
  4. **예외 프로세스**: 정상 흐름 외에 반품/취소/이의신청 등 예외 흐름은?
  5. **업계 관행**: {산업군}에서 당연시하는 관행인데 spec에 빠진 것은?
  6. **규제/컴플라이언스**: 법적 의무사항 중 누락된 것은?

  Format: 각 항목별 findings + severity (Critical/Important/Nice-to-Have).
  Write results to: <planning_dir>/team-reviews/domain-process-analysis.md

  NOTE: {산업군}을 인터뷰의 [Industry] 태그에서 추출한 실제 산업군으로 치환하여 실행.

  CRITICAL RETURN RULE: Write your FULL analysis to the file above.
  Your return message must be ONLY: "✅ domain-process-analysis.md written. Critical: N, Important: N, Nice-to-Have: N"
  DO NOT repeat the analysis in your return message.
  """
)

Task(
  subagent_type="Explore",
  prompt="""
  You are a **{산업군} Technical Domain Expert** — {산업군} IT 시스템 구축 전문가.
  {산업군}에서 핵심적으로 필요한 기술, 표준, 규격을 깊이 이해하고 있습니다.

  Read these files:
  - <planning_dir>/claude-spec.md
  - <planning_dir>/claude-interview.md
  - <planning_dir>/claude-research.md (if exists)
  - <planning_dir>/team-reviews/domain-research.md (산업별 기술/솔루션 리서치)

  Use the domain-research.md findings to ground your analysis with real technologies and solutions.

  Analyze and report:
  1. **필수 기술/표준**: {산업군}에서 반드시 사용해야 하는 기술 표준은?
  2. **필수 연동**: 이 산업에서 통상적으로 연동하는 외부 시스템은?
  3. **데이터 형식**: 업계 표준 데이터 포맷이 있는가?
  4. **보안/규정**: {산업군} 특화 보안 요구사항 (개인정보, 금융규제, 의료정보 등)
  5. **성능 기준**: {산업군}에서 통상적으로 요구하는 SLA/성능 수준은?
  6. **기존 솔루션**: 이미 검증된 오픈소스/상용 솔루션이 있어 바퀴를 재발명할 필요 없는 부분은?

  Format: 각 항목별 findings + severity (Critical/Important/Nice-to-Have).
  Write results to: <planning_dir>/team-reviews/domain-technical-analysis.md

  NOTE: {산업군}을 인터뷰의 [Industry] 태그에서 추출한 실제 산업군으로 치환하여 실행.

  CRITICAL RETURN RULE: Write your FULL analysis to the file above.
  Your return message must be ONLY: "✅ domain-technical-analysis.md written. Critical: N, Important: N, Nice-to-Have: N"
  DO NOT repeat the analysis in your return message.
  """
)
```

#### External AI 모드: 도메인 전문가 CLI 실행

3단계에서 Codex 또는 Gemini CLI가 감지된 경우, 위 Claude-only 모드의 `Task(Explore)`를 **아래 Bash 실행으로 대체**합니다.
`domain-research.md`는 동일하게 입력으로 전달합니다.

> 고정 에이전트 (UX, Architecture, Red Team)는 항상 위의 Task(Explore)로 실행합니다.

**1. 프롬프트 파일 생성:**

```bash
mkdir -p "<planning_dir>/team-reviews"

# 프로세스 전문가 프롬프트 ({산업군}은 실제 산업군으로 치환)
cat > "<planning_dir>/team-reviews/domain-process-prompt.txt" << 'PROMPT_EOF'
You are a {산업군} Process Expert — 20년 경력의 {산업군} 업무 전문가.
{산업군}의 전체 비즈니스 프로세스와 업무 흐름을 깊이 이해하고 있습니다.

Analyze the provided spec and interview documents:

1. 프로세스 완전성: 핵심 업무 흐름을 빠짐없이 커버하는가?
2. 프로세스 순서/의존성: 단계 간 순서가 올바른가? 누락된 단계는?
3. 이해관계자: 빠진 역할/부서가 있는가?
4. 예외 프로세스: 반품/취소/이의신청 등 예외 흐름은?
5. 업계 관행: 당연시하는 관행인데 spec에 빠진 것은?
6. 규제/컴플라이언스: 법적 의무사항 중 누락된 것은?

Format each finding with severity: Critical / Important / Nice-to-Have.
Output in markdown format.
PROMPT_EOF

# 기술 전문가 프롬프트
cat > "<planning_dir>/team-reviews/domain-technical-prompt.txt" << 'PROMPT_EOF'
You are a {산업군} Technical Domain Expert — {산업군} IT 시스템 구축 전문가.
{산업군}에서 핵심적으로 필요한 기술, 표준, 규격을 깊이 이해하고 있습니다.

Analyze the provided spec and interview documents:

1. 필수 기술/표준: 반드시 사용해야 하는 기술 표준은?
2. 필수 연동: 통상적으로 연동하는 외부 시스템은?
3. 데이터 형식: 업계 표준 데이터 포맷이 있는가?
4. 보안/규정: 특화 보안 요구사항
5. 성능 기준: 통상적으로 요구하는 SLA/성능 수준은?
6. 기존 솔루션: 검증된 오픈소스/상용 솔루션으로 대체 가능한 부분은?

Format each finding with severity: Critical / Important / Nice-to-Have.
Output in markdown format.
PROMPT_EOF
```

**2. Codex 실행** (timeout 3분):

```bash
echo "$(cat '<planning_dir>/team-reviews/domain-process-prompt.txt')

===== claude-spec.md =====
$(cat '<planning_dir>/claude-spec.md')

===== claude-interview.md =====
$(cat '<planning_dir>/claude-interview.md')

===== domain-research.md (산업별 기술/솔루션 리서치) =====
$(cat '<planning_dir>/team-reviews/domain-research.md')" \
  | codex exec -m gpt-5.2 \
    --sandbox read-only \
    --skip-git-repo-check \
    --full-auto \
    2>/dev/null \
  > "<planning_dir>/team-reviews/domain-process-analysis.md"
```

**3. Gemini 실행** (timeout 3분):

```bash
gemini -m gemini-3-pro-preview --approval-mode yolo \
  "$(cat '<planning_dir>/team-reviews/domain-technical-prompt.txt')" \
  @<planning_dir>/claude-spec.md \
  @<planning_dir>/claude-interview.md \
  @<planning_dir>/team-reviews/domain-research.md \
  > "<planning_dir>/team-reviews/domain-technical-analysis.md"
```

> **모드별 Bash 조합 (3단계에서 결정):**
>
> | 모드 | Process Expert → | Technical Expert → |
> |------|------------------|--------------------|
> | **Dual-AI** | Codex (위 2번) | Gemini (위 3번) |
> | **Single-AI (Codex)** | Codex (process 프롬프트) | Codex (technical 프롬프트) |
> | **Single-AI (Gemini)** | Gemini (process 프롬프트) | Gemini (technical 프롬프트) |
> | **Claude-only** | Task(Explore) 위 그대로 | Task(Explore) 위 그대로 |
>
> **실패 폴백**: 외부 AI 출력 파일이 비어있거나 오류면 해당 전문가만 Claude Explore로 재실행.

### 6단계: 개별 결과 저장

각 서브에이전트가 `<planning_dir>/team-reviews/` 디렉토리에 직접 작성:

| 에이전트 | 산출물 | Phase |
|----------|--------|-------|
| UX Agent | `team-reviews/ux-analysis.md` | A |
| Architecture Agent | `team-reviews/architecture-analysis.md` | A |
| Red Team Agent | `team-reviews/redteam-analysis.md` | A |
| Domain Researcher | `team-reviews/domain-research.md` | A |
| Domain Process Expert | `team-reviews/domain-process-analysis.md` | B |
| Domain Technical Expert | `team-reviews/domain-technical-analysis.md` | B |

### 7단계: 통합 리뷰 작성

6개 분석 결과(리서치 1 + 고정 3 + 도메인 2)를 읽고 `<planning_dir>/claude-team-review.md` 작성.

**통합 기준:**
- **Critical**: 다수 팀 공통 지적 + 레드팀 고위험 + 도메인 전문가 필수 지적
- **Important**: 2팀 이상 지적 또는 중요도 높은 사항
- **Nice-to-Have**: 단일 팀 지적, 개선 사항
- **Dismissed**: 반영하지 않는 항목 + 이유

**통합 리뷰 형식:**

```markdown
# Team Review Summary

## Industry Context
- 산업군: {산업군}
- 도메인 프로세스 전문가: {페르소나명} (via {Codex/Gemini/Claude})
- 도메인 기술 전문가: {페르소나명} (via {Gemini/Codex/Claude})

## Critical Findings (반드시 plan에 반영)
- [출처: UX/Arch/RedTeam/DomainProcess/DomainTech] finding 내용

## Important Findings (plan에 반영 권장)
- [출처] finding 내용

## Nice-to-Have (선택적 반영)
- [출처] finding 내용

## Dismissed (반영하지 않음 + 이유)
- [출처] finding 내용 — 사유: ...

## Impact on Plan
- 어떤 영역이 변경되어야 하는지 요약
```

## 실패 처리

| 상황 | 대응 |
|------|------|
| 서브에이전트 1개 실패 | 나머지 결과로 통합 진행, 실패 에이전트 결과는 "N/A" 표기 |
| 서브에이전트 3개 이상 실패 | 팀 리뷰 스킵, 로그에 경고 남기고 Step 10으로 진행 |
| 산업군 식별 불가 | 범용 fallback 사용 (비즈니스 프로세스 분석가 + 시스템 통합 전문가) |
| team-reviews/ 디렉토리 생성 실패 | planning_dir 루트에 직접 작성 |
| **External AI 실행 실패** | 출력 파일이 비어있거나 오류 → 해당 전문가만 Claude Explore로 폴백 재실행 |
| **External AI timeout (3분+)** | 프로세스 kill, 해당 전문가만 Claude Explore로 폴백 |
| **Context limit reached** | 에이전트가 파일에 쓴 결과는 보존됨. `/compact` 후 재개하면 team-reviews/ 파일을 읽어 통합 진행. Resume 테이블에서 `+ spec → Step 9` 자동 매핑 |
