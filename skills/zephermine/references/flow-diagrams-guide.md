# Flow Diagrams Guide

Step 18 — 공정 도면 생성 상세 절차.

> **⚠️ 이 단계는 건너뛸 수 없습니다.** 공정 도면이 없으면 다이달로스(workpm)가 기준선 없이 시공하게 됩니다.

## 절차

### 1. 핵심 프로세스 식별

Plan에서 독립적인 비즈니스/기술 프로세스 추출:
- 기준: "사용자 또는 시스템이 시작~종료까지 거치는 완결된 흐름" 1개 = 다이어그램 1개
- 프로세스 수: 핵심 3~8개 (너무 많으면 상위 레벨로 통합)
- **단일 프로세스 프로젝트(CLI, 라이브러리)라도 최소 1개의 메인 흐름도를 생성**

### 2. 서브에이전트 위임

각 프로세스별 다이어그램 생성:

```
Task(subagent_type=Explore, prompt="""
skills/flow-verifier/SKILL.md의 plan 모드와 skills/mermaid-diagrams/SKILL.md를 읽고 참조하세요.

다음 프로세스의 Mermaid flowchart를 작성하세요:
프로세스: {process_name}
컨텍스트: {plan에서 추출한 해당 프로세스 설명}
API 엔드포인트: {관련 API 목록}

규칙:
- 노드 ID: 영문 camelCase
- 분기(decision): 모든 경로(Yes/No, 에러) 포함
- 정상 경로(happy path) + 에러 경로 + 엣지 케이스
- 노드 20개 이하
- 각 노드에 관련 API 엔드포인트 또는 함수명 주석

결과만 반환하세요 (파일 작성 금지).
""")
```

### 3. 파일 저장

서브에이전트 결과를 수집하여 `<planning_dir>/flow-diagrams/`에 저장:
- 파일명: `{process-name}.mmd` (kebab-case)
- 인덱스: `<planning_dir>/flow-diagrams/index.md` 생성

## 인덱스 파일 형식

```markdown
# Process Flow Diagrams

| 프로세스 | 파일 | 노드 수 | 관련 섹션 |
|----------|------|---------|-----------|
| 사용자 인증 | user-auth.mmd | 12 | section-02 |
| 주문 처리 | order-process.mmd | 15 | section-03, section-04 |
| 결제 프로세스 | payment.mmd | 10 | section-05 |

## 의존성
user-auth → order-process → payment
```

## workpm 연계

- workpm Phase 2: 이 도면을 읽어서 추가/수정 여부 판단
- workpm Phase 2: 각 Worker에게 담당 다이어그램 노드 배분
- workpm Phase 4: 구현 후 이 도면과 코드를 대조 검증
