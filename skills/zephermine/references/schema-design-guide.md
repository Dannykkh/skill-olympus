# Schema Design Guide

젭마인 Step 14에서 서브에이전트가 참조하는 스키마 설계 가이드.

---

## 출력 형식: claude-db-schema.md

```markdown
# Database Schema

## Target Database
- **DB**: {PostgreSQL 16 / MySQL 8.0 / SQLite / MongoDB 등}
- **이유**: {왜 이 DB를 선택했는지}
- **참조**: {plan/architect 산출물에서 결정된 근거}

## ERD (Entity Relationship Diagram)

\```mermaid
erDiagram
    USERS ||--o{ ORDERS : places
    USERS {
        bigint id PK
        varchar email UK
        varchar name
        timestamptz created_at
    }
    ORDERS ||--|{ ORDER_ITEMS : contains
    ORDERS {
        bigint id PK
        bigint user_id FK
        decimal total_amount
        varchar status
        timestamptz created_at
    }
    ...
\```

## DDL

\```sql
-- 대상 DB 방언으로 작성
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    ...
);
\```

## 설계 근거 테이블

| 테이블 | 관계 | 설계 근거 |
|--------|------|----------|
| users | — | 모든 기능의 주체. email UK로 중복 방지 |
| orders | users 1:N | 사용자가 여러 주문 생성. user_id FK |
| order_items | orders 1:N, products M:N | 주문-상품 다대다를 중간 테이블로 해소 |

## 인덱스 전략

| 테이블 | 인덱스 | 유형 | 근거 (접근 패턴) |
|--------|--------|------|-----------------|
| orders | idx_orders_user_id | B-Tree | 사용자별 주문 목록 조회 빈번 |
| orders | idx_orders_status | B-Tree | 상태별 필터링 |
| products | idx_products_search | GIN (tsvector) | 상품 전문검색 (PostgreSQL) |

## 마이그레이션 노트
- 초기 스키마이므로 별도 마이그레이션 전략 불필요
- 향후 변경 시 backward-compatible 마이그레이션 권장
```

---

## DB-First 원칙

**"DB 무관하게 설계 후 DDL 변환" 방식은 사용하지 않음.**

DB 특성이 테이블 구조 자체를 결정함:
- PostgreSQL → JSONB로 메타데이터 1컬럼 vs MySQL → 별도 테이블 정규화
- PostgreSQL → RLS로 멀티테넌시 vs MySQL → WHERE tenant_id + 미들웨어
- MongoDB → Document 임베딩 vs SQL → JOIN

**올바른 흐름:**
1. 어떤 DB? (architect/plan/인터뷰에서 결정)
2. 그 DB의 강점을 활용해서 설계 (구조 자체가 달라짐)
3. 해당 DB용 DDL + ERD 출력

**DB 감지 순서:**
1. `claude-plan.md`에서 기술 스택 명시 확인
2. 기존 프로젝트라면 코드베이스에서 DB 감지 (package.json, pom.xml, .env 등)
3. 미결정 시 AskUserQuestion으로 질문

---

## 엔티티 추출 규칙

**입력**: `domain-process-analysis.md`의 업무 흐름표

| 추출 대상 | 규칙 | 예시 |
|-----------|------|------|
| **명사** → 테이블 | 업무 흐름표에서 반복되는 명사 | 사용자, 주문, 상품, 결제 |
| **동사** → 관계 테이블 | "A가 B를 한다" 패턴 | 주문하다→orders, 결제하다→payments |
| **역할** → 권한 테이블 | CRUD 권한이 역할별로 다름 | 관리자/일반회원→roles, permissions |
| **상태** → ENUM/컬럼 | 상태 전이가 있는 엔티티 | 주문상태: PENDING→PAID→SHIPPED |
| **입출력** → 컬럼 | 각 기능의 입력/출력 필드 | 이름, 이메일, 주소→users 컬럼 |

**주의:**
- UI 요소(버튼, 모달)는 테이블이 아님
- 파생 데이터(총 매출)는 컬럼이 아님 (쿼리로 계산)
- 1개 속성만 있는 엔티티는 ENUM 또는 부모 테이블 컬럼으로 흡수

---

## 관계 판별 규칙

| 패턴 | 관계 | 구현 |
|------|------|------|
| "A가 여러 B를 가진다" | 1:N | FK on B side |
| "A와 B가 서로 여러" | M:N | 중간 테이블 (junction) |
| "A 안의 A" (조직도, 카테고리) | Self-Reference | parent_id FK |
| "A 또는 B에 달린 C" (댓글) | Polymorphic | 별도 FK 또는 type+id |
| "A는 반드시 B가 있어야" | 필수 관계 | FK NOT NULL |
| "A에 B가 있을 수도" | 선택 관계 | FK NULLABLE |

---

## 정규화 결정 기준

| 기준 | 3NF 유지 | 역정규화 허용 |
|------|---------|-------------|
| 데이터 특성 | 트랜잭션 (주문, 결제, 재고) | 조회 (대시보드, 리포트, 검색) |
| 쓰기:읽기 비율 | 쓰기 빈번 | 읽기 압도적 |
| 일관성 요구 | 높음 (금융, 재고) | 낮음 (캐시 가능) |
| 데이터 크기 | 소~중 | 대규모 (조인 비용 큼) |

**역정규화 시 반드시 주석으로 이유 기록:**
```sql
-- 역정규화: 주문 조회 시 매번 user JOIN 방지. 사용자 이름 변경 시 비동기 업데이트
customer_name VARCHAR(100) NOT NULL
```

---

## DB별 설계 차이

| 설계 결정 | PostgreSQL | MySQL | SQLite | MongoDB |
|----------|-----------|-------|--------|---------|
| PK 전략 | UUID / BIGSERIAL | AUTO_INCREMENT | INTEGER AUTOINCREMENT | ObjectId |
| 반정형 데이터 | JSONB + GIN 인덱스 | TEXT + 별도 테이블 | JSON (제한적) | 네이티브 Document |
| 멀티테넌시 | RLS 정책 | WHERE tenant_id | 파일 분리 | DB 분리 or tenant 필드 |
| 전문 검색 | tsvector + GIN | FULLTEXT INDEX | FTS5 | Text Index |
| 배열/리스트 | ARRAY 타입 | 별도 테이블 | 불가 | 네이티브 Array |
| 인덱스 유형 | B-Tree/GIN/GiST/Partial | B-Tree/FULLTEXT | B-Tree | Single/Compound/Text |

---

## 안티패턴 목록

| 안티패턴 | 문제 | 올바른 방법 |
|---------|------|-----------|
| VARCHAR(255) 남용 | 저장 낭비, 의도 불명확 | 필드별 적절한 길이 지정 |
| FLOAT로 금액 저장 | 반올림 오류 | DECIMAL(10,2) |
| FK 제약조건 없음 | 고아 데이터 발생 | 항상 FK 정의 |
| FK에 인덱스 없음 | JOIN 느림 | FK 컬럼 인덱스 필수 |
| 날짜를 문자열로 저장 | 비교/정렬 불가 | DATE, TIMESTAMP 타입 |
| soft delete만 사용 | 데이터 무한 증가 | archive 테이블 분리 고려 |
| 만능 테이블 (EAV) | 쿼리 복잡, 성능 저하 | 엔티티별 전용 테이블 |
| created_at 누락 | 데이터 추적 불가 | 모든 테이블에 audit 컬럼 |

---

## 설계 검증 질문

스키마 완성 후 각 테이블에 대해:
1. 이 테이블의 데이터가 필요한 **화면**은?
2. 가장 자주 실행되는 **쿼리 패턴**은?
3. 데이터 **증가 속도**는? (일/월 단위)
4. **삭제 정책**은? (soft delete vs hard delete vs archive)
5. **인덱스**가 쿼리 패턴을 커버하는가?
6. **FK 제약조건**과 ON DELETE 전략이 정의되었는가?

---

## 관련 참조

- 정규화 이론: `skills/database-schema-designer/references/normalization.md`
- 성능 최적화: `skills/database-schema-designer/references/performance-optimization.md`
- NoSQL 설계: `skills/database-schema-designer/references/nosql-mongodb.md`
- MySQL 전문가: `agents/database-mysql.md`
- PostgreSQL 전문가: `agents/database-postgresql.md`
- 스키마 설계 에이전트: `agents/database-schema-designer.md`
