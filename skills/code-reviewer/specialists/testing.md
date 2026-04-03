# Testing Specialist 체크리스트

Scope: 항상 실행 (모든 리뷰)
Output: JSON (한 줄에 하나). 발견 없으면 `NO FINDINGS`만 출력.

```json
{"severity":"CRITICAL|INFORMATIONAL","confidence":N,"path":"file","line":N,"category":"testing","summary":"...","fix":"...","specialist":"testing"}
```

---

## 카테고리

### 실패 경로 테스트 누락
- 에러/거부/잘못된 입력 처리 코드에 대응 테스트 없음
- 가드 절과 early return이 테스트되지 않음
- try/catch, rescue, error boundary의 실패 경로 미테스트
- 권한/인증 체크의 "거부" 케이스 미테스트

### 엣지 케이스 커버리지 누락
- 경계값: 0, 음수, max-int, 빈 문자열, 빈 배열, nil/null/undefined
- 단일 요소 컬렉션 (루프 off-by-one)
- 유니코드 및 특수문자 (사용자 입력)
- 동시 접근 패턴에 경쟁 조건 테스트 없음

### 테스트 격리 위반
- 변경 가능 상태 공유 (클래스 변수, 글로벌 싱글턴, 미정리 DB 레코드)
- 순서 의존 테스트 (순차 통과, 랜덤화 실패)
- 시스템 시계, 타임존, 로케일 의존
- 스텁/모의 대신 실제 네트워크 호출

### 불안정 테스트 패턴
- 타이밍 의존 어설션 (sleep, setTimeout, 타이트한 waitFor)
- 비순서 결과에 순서 어설션 (해시 키, Set 반복, async 해소 순서)
- 폴백 없는 외부 서비스 의존
- 시드 제어 없는 랜덤 테스트 데이터

### 보안 강제 테스트 누락
- 컨트롤러 인증/권한 체크에 "미인가" 테스트 없음
- 속도 제한 로직에 차단 증명 테스트 없음
- 입력 소독에 악의적 입력 테스트 없음
- CSRF/CORS 설정에 통합 테스트 없음

### 커버리지 갭
- 새 public 메서드/함수에 테스트 커버리지 0
- 변경된 메서드에 기존 테스트가 구 동작만 커버
- 여러 곳에서 호출되는 유틸 함수가 간접적으로만 테스트됨
