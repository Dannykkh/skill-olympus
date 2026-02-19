# Code Reviewer - 리뷰 상세 예시

## 리뷰 보고서 템플릿

```markdown
# 코드 리뷰 결과

**파일:** `backend/app/api/v1/users.py`
**날짜:** 2026-01-16
**리뷰어:** Code Reviewer (Auto)

## 요약
- **상태:** FAIL / WARN / PASS
- **전체 점수:** 75/100

## Critical Issues (반드시 수정)
### 파일 크기 초과
- **현재:** 623줄
- **최대:** 500줄
- **조치:** 서비스 레이어 분리 필요

### 보안 취약점
- **라인 145:** SQL Injection 가능성

## High Priority (강력 권장)
### 타입 힌트 누락
- **라인 78:** `get_user` 함수에 타입 힌트 없음
- **조치:** 반환 타입 `Optional[User]` 추가

### 중복 코드
- **라인 120-135, 180-195:** 거의 동일한 검증 로직
- **조치:** `utils/validators.py`로 공통 함수 분리

## 통과 항목
- [x] 모든 함수 50줄 이하
- [x] 환경 변수 사용 (하드코딩 없음)
- [x] 에러 핸들링 적절
```

## 자동 실행 로직

### 파일 저장 시
```
User: "users.py 파일 작성 완료"
    ↓
Assistant: [파일 Write/Edit 도구 사용]
    ↓
Auto-Trigger: Code Reviewer 실행
    ↓
결과: 리뷰 보고서 생성
```

### 명시적 요청 시
```
User: "방금 작성한 코드 리뷰해줘"
    ↓
Assistant: [Code Reviewer 스킬 실행]
    ↓
리뷰 대상 파일 확인
    ↓
리뷰 보고서 생성
```

## 성능 최적화 예시

**React:**
```typescript
// 매번 재계산
function Component({ items }) {
  const total = items.reduce((sum, item) => sum + item.price, 0);
  return <div>{total}</div>;
}

// 메모이제이션
function Component({ items }) {
  const total = useMemo(
    () => items.reduce((sum, item) => sum + item.price, 0),
    [items]
  );
  return <div>{total}</div>;
}
```

**Python:**
```python
# N+1 쿼리
users = await db.execute(select(User))
for user in users:
    projects = await db.execute(select(Project).where(Project.user_id == user.id))

# Eager Loading
users = await db.execute(select(User).options(selectinload(User.projects)))
```
