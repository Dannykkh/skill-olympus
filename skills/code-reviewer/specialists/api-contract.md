# API Contract Specialist 체크리스트

Scope: API 관련 파일 변경 시
Output: JSON (한 줄에 하나). 발견 없으면 `NO FINDINGS`만 출력.

```json
{"severity":"CRITICAL|INFORMATIONAL","confidence":N,"path":"file","line":N,"category":"api-contract","summary":"...","fix":"...","specialist":"api-contract"}
```

---

## 카테고리

### 호환성 파괴 (Breaking Changes)
- 응답 본문에서 필드 제거 (클라이언트 의존 가능)
- 필드 타입 변경 (string → number, object → array)
- 기존 엔드포인트에 새 필수 파라미터 추가
- HTTP 메서드 변경 (GET → POST) 또는 상태 코드 변경
- 리다이렉트/앨리어스 없이 엔드포인트 이름 변경
- 인증 요구사항 변경 (public → authenticated)

### 버전 관리
- 버전 범프 없이 breaking change
- 동일 API에 혼합된 버전 전략 (URL vs header vs query)
- 마감 일정/마이그레이션 가이드 없이 엔드포인트 폐기
- 컨트롤러에 분산된 버전별 로직

### 에러 응답 일관성
- 기존과 다른 에러 형식 반환
- 에러 응답에 표준 필드 누락 (error code, message, details)
- HTTP 상태 코드가 에러 유형과 불일치 (200으로 에러, 500으로 검증 실패)
- 에러 메시지에 내부 구현 노출 (스택 트레이스, SQL)

### 속도 제한 & 페이지네이션
- 유사 엔드포인트에 있는 속도 제한이 새 엔드포인트에 없음
- 하위 호환 없이 페이지네이션 방식 변경 (offset → cursor)
- 문서 없이 페이지 크기/기본 제한 변경
- 페이지네이션 응답에 총 개수/다음 페이지 표시 누락

### 문서 불일치
- 새 엔드포인트/변경된 파라미터에 OpenAPI/Swagger 미업데이트
- 변경 후 구 동작을 기술하는 README/API 문서
- 더 이상 작동하지 않는 예시 요청/응답
- 새 엔드포인트/변경된 파라미터에 문서 누락

### 하위 호환성
- 이전 버전 클라이언트 동작 여부
- 강제 업데이트 불가 모바일 앱 호환성
- 구독자 통보 없이 Webhook 페이로드 변경
- 새 기능 사용에 SDK/클라이언트 라이브러리 변경 필요 여부
