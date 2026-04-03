# Code Reviewer v3 — 리뷰 보고서 예시

## 전체 보고서 예시

```
═══════════════════════════════════════
Pre-Landing Review: 7 issues (2 critical, 5 informational)
Specialist: 4개 디스패치 (Testing, Maintainability, Security, Performance)
═══════════════════════════════════════

SCOPE CHECK: CLEAN
Intent: 사용자 프로필 편집 API 추가
Delivered: 프로필 편집 API + 검증 로직 + 테스트

AUTO-FIXED: (3건)
- [app/services/user_service.py:45] 미사용 import `json` → 제거
- [app/models/user.py:120] 매직 넘버 30 → MAX_NAME_LENGTH = 30
- [app/views/profile.tsx:88] O(n*m) 룩업 → Map 기반 O(n) 변환

NEEDS INPUT: (2건)
1. [CRITICAL] (confidence: 9/10) app/api/v1/users.py:67 — 프로필 업데이트 경쟁 조건
   현재: SELECT → 검증 → UPDATE (비원자적)
   수정: WHERE version = ? 추가 (낙관적 락)
   → 사용자 선택: A) 수정 완료

2. [CRITICAL] (confidence: 8/10) app/api/v1/users.py:89 — 이메일 변경 시 본인 확인 없음
   수정: 이메일 변경 시 인증 토큰 발송 플로우 추가
   → 사용자 선택: B) 건너뛰기 (별도 티켓 생성)

SPECIALIST REVIEW: (2건, 4 specialists)
[INFORMATIONAL] (confidence: 7/10, specialist: testing)
  app/tests/test_users.py — 이메일 중복 실패 테스트 누락
  Fix: test_update_profile_duplicate_email 추가

[INFORMATIONAL] (confidence: 6/10, specialist: performance)
  app/api/v1/users.py:42 — selectinload 없이 user.projects 순회
  Fix: .options(selectinload(User.projects)) 추가
  중간 신뢰도, 실제 이슈인지 확인

ADVERSARIAL REVIEW:
[FIXABLE] app/api/v1/users.py:92 — 프로필 이미지 URL에 SSRF 검증 없음
  → AUTO-FIXED: URL 호스트 허용 목록 추가

───────────────────────────────────────
PR Quality Score: 7/10
(10 - 2×2 - 2×0.5 = 5 → 수정 후 재계산: 10 - 0×2 - 2×0.5 = 9)
═══════════════════════════════════════
```

---

## Fix-First 분류 예시

### AUTO-FIX (자동 수정)
```python
# 발견: 미사용 변수
- [app/utils/helpers.py:23] temp = calculate() (미읽힘) → 변수 제거

# 발견: 매직 넘버
- [app/config/limits.py:8] if retries > 3 → MAX_RETRIES = 3; if retries > MAX_RETRIES

# 발견: N+1 쿼리
- [app/api/v1/projects.py:45] 루프 내 user 쿼리
  → .options(selectinload(Project.owner)) 추가
```

### ASK (사용자 판단)
```
1. [CRITICAL] (confidence: 9/10) app/models/order.py:78
   상태 전이가 비원자적: status='pending' 확인 후 'confirmed'로 변경
   동시 요청 시 이중 확인 가능
   수정: UPDATE orders SET status='confirmed' WHERE id=? AND status='pending'
   → A) 수정  B) 건너뛰기

2. [INFORMATIONAL] (confidence: 7/10) app/services/payment.py:112
   결제 실패 시 부분 롤백 — 주문은 취소되지만 재고는 미복구
   수정: 트랜잭션으로 감싸기
   → A) 수정  B) 건너뛰기
```

---

## Scope Drift 예시

### CLEAN
```
Scope Check: CLEAN
Intent: 로그인 API에 2FA 지원 추가
Delivered: 2FA 토큰 검증 + 백업 코드 + 테스트
```

### DRIFT DETECTED
```
Scope Check: DRIFT DETECTED
Intent: 비밀번호 재설정 이메일 템플릿 수정
Delivered: 이메일 템플릿 수정 + 사용자 모델 리팩토링 + 로깅 추가
Scope Creep:
  - app/models/user.py: 사용자 모델 리팩토링 (의도에 없음)
  - app/utils/logger.py: 새 로깅 유틸 추가 (의도에 없음)
```

### REQUIREMENTS MISSING
```
Scope Check: REQUIREMENTS MISSING
Intent: 결제 API + 웹훅 핸들러 + 관리자 대시보드
Delivered: 결제 API + 웹훅 핸들러
Missing:
  - 관리자 대시보드 구현 없음 (커밋/diff에 증거 없음)
```

---

## Confidence 점수 예시

```
[CRITICAL] (confidence: 10/10) auth.py:47
  토큰 만료 체크가 undefined 반환 — 세션 만료 시 인증 우회
  (코드를 직접 읽어 검증)

[INFORMATIONAL] (confidence: 7/10) api/users.py:23
  페이지네이션 없이 전체 사용자 목록 반환 — 데이터 증가 시 성능 저하
  (패턴 매치, 높은 신뢰도)

[INFORMATIONAL] (confidence: 5/10) services/cache.py:56
  캐시 무효화 타이밍 이슈 가능 — 중간 신뢰도, 실제 이슈인지 확인

[NOTE] (confidence: 3/10) utils/format.py:12
  날짜 형식 변환에서 타임존 처리 불확실 — 부록에만 기록
```
