# Implementation Context Matching

섹션의 파일 패턴을 분석해 네이티브 teammate에게 필요한 프로젝트 계약을 전달하는 프로토콜.

## 왜 필요한가?

파일 종류만으로 전역 프레임워크 취향을 주입하지 않고, 실제 프로젝트 설정·인접 코드·테스트를
teammate의 구현 계약으로 전달해야 기존 구조를 보존할 수 있습니다.

## 매칭 테이블

### 파일 패턴 → 전문가

| 파일 패턴 | 작업 역할 | 우선 전달할 계약 |
|-----------|------------|--------------|
| `src/components/**`, `src/pages/**`, `src/app/**`, `*.tsx`, `*.jsx` | 프론트엔드 작업자 | `package.json`, lockfile, `tsconfig*`, 실제 라우팅·컴포넌트·상태 패턴, `DESIGN.md`, 테스트 |
| `src/styles/**`, `*.css`, `*.scss`, `tailwind.*` | UI 구현 작업자 | `DESIGN.md`, 실제 CSS 도구 설정, 기존 토큰·컴포넌트, 렌더 테스트 |
| `src/api/**`, `src/controllers/**`, `src/routes/**` | 백엔드 작업자 | 빌드 manifest, 실제 라우팅·서비스 경계, API 계약, 통합 테스트 |
| `src/services/**`, `src/flows/**`, `src/repositories/**` | 백엔드 작업자 | 인접 모듈 경계, 트랜잭션 관례, persistence 설정, 테스트 |
| `*.java`, `pom.xml`, `build.gradle*` | Java/Spring 작업자 | Java toolchain, Spring BOM/plugin, 기존 package 경계, `application*.yml`, 테스트 |
| `*.py`, `requirements.txt`, `pyproject.toml` | Python 작업자 | 네이티브 범용 teammate + 프로젝트 `pyproject.toml`·테스트 |
| `migrations/**`, `src/db/**`, `prisma/**`, `*.sql` | DB 작업자 | 실제 DB 버전, ORM·migration 설정, 기존 schema, 실행 계획·migration 테스트 |
| `supabase/**`, `*.rls.sql` | Supabase/PostgreSQL 작업자 | 프로젝트 schema·RLS 모델·연결 설정, 필요 시 `supabase-postgres-best-practices` |
| `src/types/**`, `src/interfaces/**`, `src/models/**` | TypeScript 작업자 | 네이티브 범용 teammate + 프로젝트 `tsconfig`·컴파일러 |
| `tests/**`, `__tests__/**`, `*.test.*`, `*.spec.*` | 테스트 작업자 | 실제 test runner 설정, 인접 테스트 패턴, build manifest, QA 시나리오, 실행 명령 |
| `docs/**`, `*.md` (코드 외) | 문서 전문가 | 네이티브 범용 teammate + 목적별 문서 스킬/프로젝트 템플릿 |
| `src/auth/**`, `src/security/**` | 보안 구현 작업자 | 네이티브 범용 작업자 + 실제 auth middleware/session/token 설정·인접 negative test; 검토 분기를 선택하면 전역 카탈로그에서 해석한 `${code_reviewer_root}/SKILL.md`와 `${code_reviewer_root}/references/security-audit.md` 적용 |
| `src/ai/**`, `src/ml/**`, `src/llm/**` | AI/ML 작업자 | 프로젝트 SDK·lockfile·기존 추상화·평가 테스트 + 해당 공급자 공식 문서; OpenAI는 `openai-docs` |
| `Dockerfile`, `docker-compose.*`, `k8s/**` | 인프라 전문가 | (범용) |

### 복합 패턴 처리

섹션이 여러 카테고리의 파일을 포함하면:

1. **가장 많은 파일이 속한 카테고리**의 전문가를 선택
2. 동률이면 **더 전문적인 역할** 우선 (DB > 백엔드 > 프론트)
3. 어디에도 매칭 안 되면 별도 가이드 없이 **네이티브 범용 teammate** 사용

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
  5. 해당 역할과 프로젝트 계약 파일 반환

  return {
    role: "프론트엔드 전문가",
    contextFiles: ["package.json", "tsconfig.json", "DESIGN.md", "관련 테스트"],
    reason: "tsx 파일 5개 (전체 7개 중)"
  }
```

## Teammate 지시에 활용

역할이 매칭되면 teammate에게 다음을 추가 전달:

```
"너는 이 섹션의 **프론트엔드 구현 작업자**야.
package.json, lockfile, tsconfig, DESIGN.md와 인접 컴포넌트·테스트를 먼저 읽어.
현재 라우팅·상태관리·데이터 패칭·스타일 구조를 보존하고, 새 라이브러리나 병렬 계층을
추가하지 마. 완료 후 프로젝트의 타입 검사와 관련 테스트를 실행해."
```

**핵심:** 전역 에이전트 프롬프트가 아니라 **프로젝트 근거 파일 + 작업 경계 + 검증 명령**을 전달합니다.

## DB 전문가 선택 기준

| 조건 | 전달할 DB 계약 |
|------|------|
| `supabase/**` 또는 `*.rls.sql` 존재 | Supabase schema·RLS·migration 설정 + 명시 요청 시 `supabase-postgres-best-practices` |
| `prisma/schema.prisma`에 `postgresql` | PostgreSQL 버전·Prisma schema·migration·테스트 |
| `prisma/schema.prisma`에 `mysql` | MySQL 버전·Prisma schema·migration·테스트 |
| `*.sql`만 존재 (판단 불가) | 프로젝트의 DB 종류 추론 (package.json 등 확인) |
| 추론 불가 | DB를 임의 선택하지 말고 DB 중립 작업으로 유지한 뒤 Lead에게 보고 |
