# Expert Matching

섹션의 파일 패턴을 분석하여 적절한 전문가 에이전트를 teammate에 매칭하는 프로토콜.

## 왜 필요한가?

범용 teammate보다 전문가 역할을 부여받은 teammate가 더 좋은 코드를 작성합니다.
우리 에이전트(agents/*.md)에 축적된 지식을 teammate에게 전달하여 품질을 높입니다.

## 매칭 테이블

### 파일 패턴 → 전문가

| 파일 패턴 | 전문가 역할 | 참조 에이전트 |
|-----------|------------|--------------|
| `src/components/**`, `src/pages/**`, `src/app/**`, `*.tsx`, `*.jsx` | 프론트엔드 전문가 | `frontend-react.md` |
| `src/styles/**`, `*.css`, `*.scss`, `tailwind.*` | 프론트엔드 전문가 | `frontend-react.md` |
| `src/api/**`, `src/controllers/**`, `src/routes/**` | 백엔드 전문가 | `backend-spring.md` |
| `src/services/**`, `src/flows/**`, `src/repositories/**` | 백엔드 전문가 | `backend-spring.md` |
| `*.java`, `pom.xml`, `build.gradle` | Spring 백엔드 전문가 | `backend-spring.md` |
| `*.py`, `requirements.txt`, `pyproject.toml` | Python 백엔드 전문가 | `python-fastapi-guidelines.md` |
| `migrations/**`, `src/db/**`, `prisma/**`, `*.sql` | DB 전문가 | `database-postgresql.md` 또는 `database-mysql.md` |
| `supabase/**`, `*.rls.sql` | Supabase/PostgreSQL 전문가 | `database-postgresql.md` |
| `src/types/**`, `src/interfaces/**`, `src/models/**` | 타입/모델 전문가 | `fullstack-coding-standards.md` |
| `tests/**`, `__tests__/**`, `*.test.*`, `*.spec.*` | QA 전문가 | `qa-engineer.md` |
| `docs/**`, `*.md` (코드 외) | 문서 전문가 | `documentation.md` |
| `src/auth/**`, `src/security/**` | 보안 전문가 | `security-reviewer.md` |
| `src/ai/**`, `src/ml/**`, `src/llm/**` | AI/ML 전문가 | `ai-ml.md` |
| `Dockerfile`, `docker-compose.*`, `k8s/**` | 인프라 전문가 | (범용) |

### 복합 패턴 처리

섹션이 여러 카테고리의 파일을 포함하면:

1. **가장 많은 파일이 속한 카테고리**의 전문가를 선택
2. 동률이면 **더 전문적인 역할** 우선 (DB > 백엔드 > 프론트)
3. 어디에도 매칭 안 되면 **범용(fullstack-coding-standards.md)** 사용

**예시:**
```
section-04-api:
  - src/api/routes.ts      → 백엔드 (1)
  - src/api/middleware.ts   → 백엔드 (2)
  - src/api/handlers/*.ts   → 백엔드 (3)
  - src/types/api.ts        → 타입 (1)

결과: 백엔드 전문가 (3 > 1)
```

## 매칭 알고리즘

```
function matchExpert(section):
  1. section의 "Files to Create/Modify" 목록 추출
  2. 각 파일을 매칭 테이블의 패턴과 비교
  3. 카테고리별 파일 수 카운트
  4. 최다 카테고리의 전문가 선택
  5. 해당 에이전트 파일 경로 반환

  return {
    role: "프론트엔드 전문가",
    agentFile: "agents/frontend-react.md",
    reason: "tsx 파일 5개 (전체 7개 중)"
  }
```

## Teammate 지시에 활용

전문가가 매칭되면 teammate에게 다음을 추가 전달:

```
"너는 **프론트엔드 전문가**야.
agents/frontend-react.md의 규칙을 따라서 구현해.
특히 다음을 준수해:
- React 컴포넌트는 함수형으로 작성
- TypeScript strict 모드
- TanStack Query 3계층 패턴
..."
```

**핵심:** 에이전트 파일 전체를 임베딩하지 않고, **파일 경로 + 핵심 규칙 3~5개**만 전달.
teammate가 필요하면 Read로 에이전트 파일을 직접 읽을 수 있습니다.

## DB 전문가 선택 기준

| 조건 | 선택 |
|------|------|
| `supabase/**` 또는 `*.rls.sql` 존재 | `database-postgresql.md` |
| `prisma/schema.prisma`에 `postgresql` | `database-postgresql.md` |
| `prisma/schema.prisma`에 `mysql` | `database-mysql.md` |
| `*.sql`만 존재 (판단 불가) | 프로젝트의 DB 종류 추론 (package.json 등 확인) |
| 추론 불가 | `database-postgresql.md` (기본값) |
