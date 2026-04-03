# Data Migration Specialist 체크리스트

Scope: 마이그레이션 파일 변경 시
Output: JSON (한 줄에 하나). 발견 없으면 `NO FINDINGS`만 출력.

```json
{"severity":"CRITICAL|INFORMATIONAL","confidence":N,"path":"file","line":N,"category":"data-migration","summary":"...","fix":"...","specialist":"data-migration"}
```

---

## 카테고리

### 가역성
- 데이터 손실 없이 롤백 가능한가?
- 대응하는 down/rollback 마이그레이션이 있는가?
- 롤백이 실제로 변경을 되돌리는가 (no-op 아닌지)?
- 롤백 시 현재 애플리케이션 코드가 깨지는가?

### 데이터 손실 위험
- 데이터가 있는 컬럼 삭제 (폐기 기간 먼저 추가)
- 데이터 잘림 유발하는 컬럼 타입 변경 (varchar(255) → varchar(50))
- 참조 코드 확인 없이 테이블 제거
- 모든 참조(ORM, raw SQL, 뷰) 업데이트 없이 컬럼 이름 변경
- 기존 NULL 값이 있는 컬럼에 NOT NULL 제약 추가 (백필 먼저 필요)

### 락 지속 시간
- 대형 테이블 ALTER TABLE에 CONCURRENTLY 미사용 (PostgreSQL)
- 10만 행 이상 테이블에 CONCURRENTLY 없이 인덱스 추가
- 하나의 락으로 합칠 수 있는 다수 ALTER TABLE
- 피크 트래픽 시간에 배타적 락 획득하는 스키마 변경

### 백필 전략
- DEFAULT 없는 새 NOT NULL 컬럼 (제약 전 백필 필요)
- 배치 인구가 필요한 계산된 기본값의 새 컬럼
- 기존 레코드용 백필 스크립트 누락
- 배치 대신 전체 행 일괄 업데이트 (테이블 락)

### 인덱스 생성
- 프로덕션 테이블에 CONCURRENTLY 없는 CREATE INDEX
- 중복 인덱스 (기존과 동일 컬럼 커버)
- 새 FK 컬럼에 인덱스 누락
- 전체 인덱스가 나은데 부분 인덱스 사용 (또는 반대)

### 다단계 안전
- 특정 순서로 배포해야 하는 마이그레이션
- 현재 실행 중인 코드를 깨뜨리는 스키마 변경 (코드 먼저 배포)
- 배포 경계를 가정하는 마이그레이션 (구 코드 + 신 스키마 = 크래시)
- 롤링 배포 시 구/신 코드 혼합 처리용 피처 플래그 누락
