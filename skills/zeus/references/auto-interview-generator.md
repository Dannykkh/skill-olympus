# Auto Interview Generator - 합성 인터뷰 생성

Zeus가 zephermine Step 6 인터뷰를 자동 생성하는 로직.

---

## 개요

사용자 대신 AI가 인터뷰 질문에 답변하여 `claude-interview.md`를 합성 생성.
모든 답변에 `[ZEUS-AUTO]` 태그를 붙여 자동 생성임을 명시.

---

## 입력

1. **Phase 0 파싱 결과** (description-parser.md)
2. **산업별 프리셋** (autopilot-defaults.md)
3. **zephermine interview-protocol.md** 의 A~G 카테고리 질문

---

## 생성 프로세스

### Step 1: 카테고리별 답변 템플릿 생성

#### A. 심층 목표 탐색 (Deep Goals)

```markdown
## A. 심층 목표 탐색

### Q: 이 프로젝트를 만들려는 가장 큰 이유는 무엇인가요?
**[ZEUS-AUTO]** {industry} 분야의 핵심 기능을 갖춘 웹 애플리케이션이 필요합니다.
사용자가 "{원본 설명}"이라고 요청했으며, 이를 구현하는 것이 목표입니다.

### Q: 이 프로젝트가 성공하면 어떤 모습인가요?
**[ZEUS-AUTO]** 모든 핵심 기능({features 목록})이 동작하고,
사용자가 회원가입부터 주요 플로우까지 완료할 수 있는 상태입니다.

### Q: 타겟 사용자는 누구인가요?
**[ZEUS-AUTO]** 일반 사용자 + 관리자. {roles 목록} 역할로 구분됩니다.
```

#### B. 디자인 비전 (Design Vision)

```markdown
## B. 디자인 비전

### Q: 원하는 디자인 톤/무드는?
**[ZEUS-AUTO]** 깔끔하고 모던한 미니멀 디자인.
Primary: #3B82F6 (Blue), Accent: #10B981 (Green).
Pretendard (한글) + Inter (영문) 폰트.

### Q: 참고할 벤치마킹 사이트가 있나요?
**[ZEUS-AUTO]** {industry}별 대표 서비스 참고:
- ecommerce: 쿠팡, 무신사
- healthcare: 똑닥, 캐시닥
- education: 인프런, 클래스101
- productivity: Todoist, Notion
- social: 블라인드, 에브리타임
- 기타: 해당 산업 대표 서비스

### Q: 반응형이 필요한가요?
**[ZEUS-AUTO]** 예, 모바일 우선 반응형. 다크모드는 v1에서 미지원.
```

#### C. 핵심 기능 (Core Features)

```markdown
## C. 핵심 기능

### Q: 반드시 있어야 하는 기능은?
**[ZEUS-AUTO]** {features 전체 목록}

### Q: MVP에서 제외해도 되는 기능은?
**[ZEUS-AUTO]** 결제 연동(실제 PG), 알림(이메일/푸시), 소셜 로그인은 v2로.
MVP는 핵심 CRUD + 기본 인증에 집중.

### Q: 각 기능의 우선순위는?
**[ZEUS-AUTO]** 인증 > 핵심 엔티티 CRUD > 대시보드 > 검색/필터 > 부가기능
```

#### D. 기술 요구사항 (Technical)

```markdown
## D. 기술 요구사항

### Q: 기술 스택 선호?
**[ZEUS-AUTO]** Frontend: {techStack.frontend}, Backend: {techStack.backend}, DB: {techStack.db}

### Q: 인증 방식?
**[ZEUS-AUTO]** JWT + 이메일/비밀번호. 소셜 로그인은 v2.

### Q: 외부 연동 서비스?
**[ZEUS-AUTO]** v1에서는 외부 연동 없음. Mock 데이터로 처리.

### Q: 성능 요구사항?
**[ZEUS-AUTO]** 동시 100명, 응답 < 2초. 프로덕션 최적화는 v2.
```

#### E. 일정 & 리소스 (Timeline)

```markdown
## E. 일정 & 리소스

### Q: 마감 기한?
**[ZEUS-AUTO]** 가능한 빨리. Zeus 자동 파이프라인으로 생성.

### Q: 팀 구성?
**[ZEUS-AUTO]** AI 자동 생성. 추후 사람이 유지보수.
```

#### F. 리스크 & 제약 (Risks)

```markdown
## F. 리스크 & 제약

### Q: 알려진 기술적 제약?
**[ZEUS-AUTO]** 없음. 표준 웹 기술 사용.

### Q: 보안 요구사항?
**[ZEUS-AUTO]** 기본 보안: 비밀번호 해싱, JWT, CORS, XSS/CSRF 방지.
규제 준수(GDPR, 개인정보보호법)는 v2에서 고려.
```

#### G. 확장성 (Scalability)

```markdown
## G. 확장성

### Q: 향후 확장 계획?
**[ZEUS-AUTO]** v1은 단일 서버. 사용자 증가 시 컨테이너화 + 로드밸런싱.
API 설계는 확장 가능하게 (RESTful, 버저닝).
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

### Step 3: claude-interview.md 저장

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

{A~G 카테고리 전체 내용}
```

---

## 주의사항

- 인터뷰는 **합리적 기본값**이지 정답이 아님
- 모든 답변에 `[ZEUS-AUTO]` 태그 필수 (나중에 사용자가 검토 가능)
- 복잡한 도메인(의료, 금융)은 규제 관련 답변을 보수적으로
- 기술스택 미명시 부분은 autopilot-defaults.md 기본값 사용
