# Auto Interview Generator - 합성 인터뷰 생성

Zeus가 zephermine Step 6 인터뷰를 자동 생성하는 로직.

---

## 개요

사용자 대신 AI가 CPS 3-Phase + 3-Gate 구조에 맞춰 `interview.md`를 합성 생성.
모든 답변에 `[ZEUS-AUTO]` 태그를 붙여 자동 생성임을 명시.

> **중요**: interview-protocol.md의 CPS Phase C/P/S + Gate 1/2/3 구조와 완전히 일치해야 합니다.
> Step 8(Spec Synthesis)이 Gate 1에서 Context Map, Gate 2에서 Problem Statement를 추출합니다.

---

## 입력

1. **Phase 0 파싱 결과** (description-parser.md)
2. **산업별 프리셋** (autopilot-defaults.md)
3. **zephermine interview-protocol.md** 의 CPS Phase C/P/S + Gate 1/2/3 구조

---

## 생성 프로세스

### Step 1: CPS Phase별 답변 생성

#### Phase C: 구현 컨텍스트 (Implementation Context)

```markdown
## Phase C: Implementation Context

### Q1: 이 프로젝트를 만들려는 가장 큰 이유는 무엇인가요?
**[ZEUS-AUTO]** {industry} 분야의 핵심 기능을 갖춘 웹 애플리케이션이 필요합니다.
사용자가 "{원본 설명}"이라고 요청했으며, 이를 구현하는 것이 목표입니다.

### Q2: 이 프로젝트가 성공하면 어떤 모습인가요?
**[ZEUS-AUTO]** 모든 핵심 기능({features 목록})이 동작하고,
사용자가 회원가입부터 주요 플로우까지 완료할 수 있는 상태입니다.

### Q3: 타겟 사용자와 이해관계자는 누구인가요?
**[ZEUS-AUTO]** 일반 사용자 + 관리자. {roles 목록} 역할로 구분됩니다.

### Q4: 이 서비스가 동작하려면 연결되어야 하는 다른 시스템이 있나요?
**[ZEUS-AUTO]** v1에서는 외부 연동 없음. 자체 DB + API로 완결.
향후 필요 시: 결제(PG), 이메일(SMTP), 파일 저장(S3 호환).

### Q5: 기존 환경이나 기술 스택은 정해져 있나요?
**[ZEUS-AUTO]** Frontend: {techStack.frontend}, Backend: {techStack.backend}, DB: {techStack.db}.
기존 코드 없음. 신규 프로젝트.

### 🚧 Gate 1 Result: ✅ Confirmed
**구현 전제 요약:**
- 목표: {industry} 분야 웹 애플리케이션 — {원본 설명}
- 산업: {industry} | 범위: MVP
- 성공 기준: 핵심 기능({features 목록}) 전체 동작, 회원가입~주요 플로우 완료 가능
- 이해관계자:

| 역할 | 설명 |
|------|------|
| 일반 사용자 | 서비스 주요 기능 사용 |
| 관리자 | 데이터 관리, 사용자 관리 |

- 필요 시스템 (에코시스템 맵):

| 시스템 | 대상 | 연동 방식 |
|--------|------|-----------|
| 인증 | 전체 사용자 | 내장 (JWT) |
| DB | 백엔드 | 내장 ({techStack.db}) |
| 결제 | 사용자 (해당 시) | 제외 (v2) |
| 이메일 알림 | 사용자 | 제외 (v2) |

- 기존 환경: {techStack.frontend} + {techStack.backend} + {techStack.db} (신규)
```

---

#### Phase P: 구현 난제 (Implementation Problems)

```markdown
## Phase P: Implementation Problems

### Q6: 이 프로젝트에서 가장 어려울 것 같은 부분은?
**[ZEUS-AUTO]** {industry}별 핵심 비즈니스 로직 구현.
특히 {features 목록 중 상위 2~3개}의 상태 관리와 데이터 정합성.

### Q7: 마감이나 일정 제약이 있나요?
**[ZEUS-AUTO]** Zeus 자동 파이프라인으로 즉시 생성. 별도 마감 없음.

### Q8: 기술적 제약이나 보안 요구사항은?
**[ZEUS-AUTO]** 기본 보안: 비밀번호 해싱, JWT, CORS, XSS/CSRF 방지.
규제 준수(GDPR, 개인정보보호법)는 v2에서 고려.

### 🚧 Gate 2 Result: ✅ Confirmed
**핵심 문제:**

| # | 핵심 문제 | 영향 | 우선순위 |
|---|-----------|------|----------|
| P1 | {industry} 핵심 비즈니스 로직 구현 | 서비스 핵심 가치 | 🔴 필수 |
| P2 | 인증/권한 체계 구축 | 보안, 사용자 신뢰 | 🟠 중요 |
| P3 | 반응형 UI + 사용성 확보 | UX 품질 | 🟡 있으면 좋음 |
```

---

#### Phase S: 구현 해법 (Implementation Solution)

```markdown
## Phase S: Implementation Solution

### Q9: 원하는 디자인 톤/무드는?
**[ZEUS-AUTO]** 깔끔하고 모던한 미니멀 디자인.
Primary: #3B82F6 (Blue), Accent: #10B981 (Green).
Pretendard (한글) + Inter (영문) 폰트.

### Q10: 참고할 벤치마킹 사이트가 있나요?
**[ZEUS-AUTO]** {industry}별 대표 서비스 참고:
- ecommerce: 쿠팡, 무신사
- healthcare: 똑닥, 캐시닥
- education: 인프런, 클래스101
- productivity: Todoist, Notion
- social: 블라인드, 에브리타임
- 기타: 해당 산업 대표 서비스

### Q11: MVP에서 제외해도 되는 기능은?
**[ZEUS-AUTO]** 결제 연동(실제 PG), 알림(이메일/푸시), 소셜 로그인은 v2로.
MVP는 핵심 CRUD + 기본 인증에 집중.

### Q12: 각 기능의 우선순위는?
**[ZEUS-AUTO]** 인증 > 핵심 엔티티 CRUD > 대시보드 > 검색/필터 > 부가기능

### Q13: 확장성과 성능 목표는?
**[ZEUS-AUTO]** 동시 100명, 응답 < 2초. v1은 단일 서버.
사용자 증가 시 컨테이너화 + 로드밸런싱. API는 RESTful + 버저닝.

### 🚧 Gate 3 Result: ✅ Confirmed
**솔루션 방향:**
- 차별화: {industry} 도메인 특화 UX + 핵심 기능 완성도
- 디자인 톤: 미니멀/모던 (Primary: #3B82F6, Accent: #10B981)
- 기술 방향: {techStack.frontend} + {techStack.backend} + {techStack.db}
- MVP 범위: {features 목록} (결제/알림/소셜로그인은 v2)
- 주요 트레이드오프: 빠른 MVP 출시 > 완벽한 기능 — 기술 부채 일부 허용
```

---

### Step 2: 변수 치환

파싱 결과와 프리셋을 기반으로 템플릿의 변수를 치환:

| 변수 | 소스 |
|------|------|
| `{industry}` | description-parser.industry |
| `{features}` | description-parser.features 또는 autopilot-defaults.entities |
| `{roles}` | autopilot-defaults.roles |
| `{techStack.*}` | description-parser.techStack |
| `{원본 설명}` | 사용자 입력 원문 |

---

### Step 3: interview.md 저장

```markdown
---
generated-by: zeus-autopilot
date: {YYYY-MM-DD}
source-description: "{원본 설명}"
industry: {industry}
---

# Interview Transcript

> 이 인터뷰는 Zeus 자동 파이프라인에 의해 합성 생성되었습니다.
> 모든 [ZEUS-AUTO] 답변은 산업별 기본값과 사용자 설명을 기반으로 추론되었습니다.

{Phase C + Gate 1 + Phase P + Gate 2 + Phase S + Gate 3 전체 내용}
```

---

## 주의사항

- 인터뷰는 **합리적 기본값**이지 정답이 아님
- 모든 답변에 `[ZEUS-AUTO]` 태그 필수 (나중에 사용자가 검토 가능)
- 복잡한 도메인(의료, 금융)은 규제 관련 답변을 보수적으로
- 기술스택 미명시 부분은 autopilot-defaults.md 기본값 사용
- **Gate 1/2/3 Result 블록은 반드시 생성** — Step 8(Spec Synthesis)이 이 블록에서 Context Map과 Problem Statement를 추출함
