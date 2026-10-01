# DB-First Design

대상 DB를 먼저 정하고, 그 DB의 강점으로 테이블 구조를 정하는 설계 규칙.
정규화·타입·인덱스·제약·마이그레이션의 일반 원칙은 같은 폴더의 다른 참조 문서가 담당한다.

---

## DB-First 원칙

**"DB 무관하게 설계 후 DDL 변환" 방식은 사용하지 않음.**

DB 특성이 테이블 구조 자체를 결정합니다:
- PostgreSQL → JSONB로 메타데이터 1컬럼 vs MySQL → 별도 테이블 정규화
- PostgreSQL → RLS로 멀티테넌시 vs MySQL → WHERE tenant_id + 미들웨어
- MongoDB → Document 임베딩 vs SQL → JOIN

**올바른 흐름:**
1. **어떤 DB?** (plan·아키텍처 검토·인터뷰에서 결정)
2. **그 DB의 강점을 활용해서 설계** (구조 자체가 달라짐)
3. **해당 DB용 DDL + ERD 출력**

### DB 감지 순서
1. Plan·아키텍처 산출물에서 기술 스택 명시 확인
2. 기존 프로젝트 → 코드베이스에서 감지 (package.json, pom.xml, .env, docker-compose)
3. 미결정 시 **반드시 사용자에게 질문** (추정 금지). 현재 CLI가 구조화 질문 도구를 지원하면 사용하고, 아니면 짧은 일반 텍스트 질문으로 진행.

---

## DB별 설계 차이 매트릭스

| 설계 결정 | PostgreSQL | MySQL | SQLite | MongoDB |
|----------|-----------|-------|--------|---------|
| **PK 전략** | UUID (`gen_random_uuid()`) / BIGSERIAL | BIGINT AUTO_INCREMENT | INTEGER AUTOINCREMENT | ObjectId |
| **반정형 데이터** | JSONB + GIN 인덱스 | TEXT + 별도 테이블 정규화 | JSON (제한적) | 네이티브 Document |
| **멀티테넌시** | RLS 정책 (DB 레벨 격리) | WHERE tenant_id + 미들웨어 | 파일 분리 | DB 분리 or tenant 필드 |
| **전문 검색** | tsvector + GIN | FULLTEXT INDEX | FTS5 | Text Index |
| **인덱스 유형** | B-Tree / GIN / GiST / Partial | B-Tree / FULLTEXT / Spatial | B-Tree | Single / Compound / Text / Geo |
| **배열/리스트** | ARRAY 타입 + GIN | 별도 테이블 (M:N) | 불가 | 네이티브 Array |
| **IP 주소** | INET 타입 | VARCHAR(45) | VARCHAR(45) | String |
| **타임스탬프** | TIMESTAMPTZ (타임존 필수) | DATETIME(6) | TEXT (ISO8601) | ISODate |
| **Audit 트리거** | `CREATE TRIGGER` 네이티브 | `CREATE TRIGGER` 네이티브 | 제한적 | Change Streams |
| **마이그레이션** | Supabase CLI / Flyway / Prisma | Flyway / Liquibase | Prisma / 수동 | Mongoose / 수동 |

---

## 엔티티 추출 규칙

**입력 소스:** 업무 흐름표(`domain-process-analysis.md`), 기술 스택 매핑(`domain-technical-analysis.md`), 구현 계획

| 추출 대상 | 규칙 | 예시 |
|-----------|------|------|
| **명사** → 테이블 | 업무 흐름표에서 반복되는 명사 | 사용자, 주문, 상품, 결제 |
| **동사** → 관계 테이블 | "A가 B를 한다" 패턴 | 주문하다 → orders |
| **역할** → 권한 테이블 | CRUD 권한이 역할별로 다름 | roles, permissions |
| **상태** → ENUM/컬럼 | 상태 전이가 있는 엔티티 | PENDING → PAID → SHIPPED |
| **입출력** → 컬럼 | 각 기능의 입력/출력 필드 | 이름, 이메일 → users 컬럼 |

**판별 제외:**
- UI 요소 (버튼, 모달) → 테이블 아님
- 파생 데이터 (총 매출) → 컬럼 아님 (쿼리로 계산)
- 1개 속성 엔티티 → ENUM 또는 부모 컬럼으로 흡수

---

## Audit 컬럼 (모든 테이블 필수)

```sql
created_at {TIMESTAMP_TYPE} NOT NULL DEFAULT {NOW_FUNC},
updated_at {TIMESTAMP_TYPE} NOT NULL DEFAULT {NOW_FUNC},
created_by BIGINT,
updated_by BIGINT
```

`{TIMESTAMP_TYPE}`·`{NOW_FUNC}`는 위 매트릭스의 타임스탬프 행을 따른다.

---

## ERD 작성 규칙 (Mermaid)

```
erDiagram
    TABLE_A ||--o{ TABLE_B : "relationship_name"
    TABLE_A {
        type column_name PK "설명"
        type column_name FK
        type column_name UK
        type column_name
    }
```

**관계 표기:**
- `||--||` : 1:1 (양쪽 필수)
- `||--o|` : 1:1 (한쪽 선택)
- `||--o{` : 1:N
- `}o--o{` : M:N (junction table 별도 표시)

---

## 출력 형식: db-schema.md

설계 산출물은 `db-schema.md` 하나로 낸다. agent-team·workpm·estimate가 이 파일명을 읽는다.

```markdown
# Database Schema

## Target Database
- **DB**: {종류 + 버전}
- **이유**: {선택 근거}

## ERD
{Mermaid erDiagram}

## DDL
{대상 DB 방언 SQL}

## 설계 근거 테이블
| 테이블 | 관계 | 설계 근거 |
|--------|------|----------|

## 인덱스 전략
| 테이블 | 인덱스 | 유형 | 근거 |
|--------|--------|------|------|

## 마이그레이션 노트
{초기/변경 마이그레이션 전략}
```
