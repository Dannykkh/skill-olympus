# Performance Specialist 체크리스트

Scope: 백엔드 또는 프론트엔드 파일 변경 시
Output: JSON (한 줄에 하나). 발견 없으면 `NO FINDINGS`만 출력.

```json
{"severity":"CRITICAL|INFORMATIONAL","confidence":N,"path":"file","line":N,"category":"performance","summary":"...","fix":"...","specialist":"performance"}
```

---

## 카테고리

### N+1 쿼리
- ORM 연관관계가 루프 안에서 eager loading 없이 순회 (.includes, joinedload, include)
- 반복 블록(each, map, forEach) 안에서 DB 쿼리 — 배치 처리 가능
- 중첩 시리얼라이저가 lazy-loaded 연관 트리거
- GraphQL 리졸버가 필드별 쿼리 (DataLoader 미사용)

### DB 인덱스 누락
- 인덱스 없는 컬럼에 새 WHERE 절
- 인덱스 없는 컬럼에 ORDER BY
- 복합 쿼리(WHERE a AND b)에 복합 인덱스 없음
- FK 컬럼 추가 시 인덱스 누락

### 알고리즘 복잡도
- O(n^2) 이상: 중첩 루프, Array.find inside Array.map
- 반복 선형 검색 → hash/map/set 사용 가능
- 루프 안 문자열 연결 → join 또는 StringBuilder
- 대량 컬렉션을 여러 번 정렬/필터 (한 번이면 충분)

### 번들 크기 (프론트엔드)
- 무거운 프로덕션 의존성 (moment.js, lodash 전체, jquery)
- 배럴 임포트(`import from 'library'`) → 딥 임포트 가능
- 최적화 없는 대용량 정적 에셋 (이미지, 폰트)
- 라우트별 코드 스플리팅 누락

### 렌더링 성능 (프론트엔드)
- Fetch 워터폴: 병렬 가능한 순차 API 호출 (Promise.all 미사용)
- 불안정 참조로 불필요한 리렌더 (렌더 시 새 객체/배열)
- 비싼 연산에 React.memo, useMemo, useCallback 누락
- 루프 안 DOM 읽기+쓰기 (레이아웃 스래싱)
- 스크롤 아래 이미지에 `loading="lazy"` 누락

### 페이지네이션 누락
- 무제한 결과 반환 (LIMIT 없음, 페이지네이션 파라미터 없음)
- 데이터 증가에 비례하는 LIMIT 없는 쿼리
- 중첩 전체 객체 대신 ID + expansion 사용 가능

### 비동기 컨텍스트 블로킹
- async 함수 안에서 동기 I/O (파일, subprocess, requests)
- async 함수에서 `time.sleep()` → `asyncio.sleep()` 사용
- 이벤트 루프 핸들러에서 CPU 집약 연산 (워커 오프로드 없음)
