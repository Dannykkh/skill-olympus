---
name: code-reviewer
description: 자동 코드 리뷰 스킬. 500줄 제한, 모듈화, 재사용성, 보안 취약점을 검증합니다. 코드 작성 완료 시 자동 실행.
license: MIT
metadata:
  version: "2.0.0"
---

# Automatic Code Reviewer

코드 품질을 자동으로 검증하는 리뷰 시스템.

## 적용 시점

다음 상황에서 자동 실행:
- 파일 생성/수정 완료 시
- 명시적 리뷰 요청 시 (사용자가 "코드 리뷰 해줘" 요청)
- PR 생성 시

---

## 리뷰 체크리스트

### CRITICAL - 반드시 통과해야 함

#### 1. 파일 크기 제한
```
✅ PASS: 파일이 500줄 이하
❌ FAIL: 파일이 500줄 초과
⚠️  WARN: 파일이 400줄 이상 (분리 권장)
```

**초과 시 조치:**
```python
# 예: user_api.py (600줄)
# → 분리:
#   - user_api.py (200줄): API 엔드포인트만
#   - user_service.py (250줄): 비즈니스 로직
#   - user_repository.py (150줄): DB 접근
```

#### 2. 함수 크기 제한
```
✅ PASS: 모든 함수가 50줄 이하
❌ FAIL: 50줄 초과 함수 존재
⚠️  WARN: 30줄 이상 함수 존재 (리팩토링 권장)
```

#### 3. 보안 취약점

**필수 체크 항목:**
- [ ] SQL Injection 방지 (Parameterized Query 사용)
- [ ] XSS 방지 (입력 sanitization)
- [ ] 인증 없는 민감 API 확인
- [ ] 하드코딩된 비밀번호/키 확인
- [ ] 파일 업로드 검증 (확장자, 크기)

```python
# ❌ SQL Injection 취약
query = f"SELECT * FROM users WHERE id = '{user_id}'"

# ✅ 안전한 방식
query = select(User).where(User.id == user_id)

# ❌ 하드코딩된 비밀
SECRET_KEY = "mysecretkey123"

# ✅ 환경 변수
SECRET_KEY = os.getenv("SECRET_KEY")
```

---

### HIGH - 강력 권장

#### 4. 타입 정의

**Python:**
```python
# ❌ 타입 힌트 없음
def get_user(user_id):
    return db.query(User).filter(User.id == user_id).first()

# ✅ 타입 힌트 완벽
def get_user(user_id: str, db: AsyncSession) -> Optional[User]:
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()
```

**TypeScript/React:**
```typescript
// ❌ any 사용
const handleSubmit = (data: any) => { console.log(data); };

// ✅ 명확한 타입
interface FormData { voltage: number; result: 'Pass' | 'Fail'; }
const handleSubmit = (data: FormData): void => { console.log(data); };
```

#### 5. 단일 책임 원칙 (SRP)

```python
# ❌ 여러 책임
class UserManager:
    def create_user(self, data): pass
    def send_email(self, email): pass  # 이메일은 별도 클래스
    def log_activity(self, msg): pass  # 로깅은 별도 클래스

# ✅ 단일 책임
class UserService:
    def create_user(self, data): pass
    def update_user(self, data): pass
```

#### 6. 중복 코드 제거 (DRY)

```python
# ❌ 중복 코드
@router.get("/users/{id}")
async def get_user(id: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

# ✅ 공통 로직 분리
async def get_or_404(model: Type[T], id: str, db: Session) -> T:
    obj = db.query(model).filter(model.id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail=f"{model.__name__} not found")
    return obj
```

---

### MEDIUM - 권장

#### 7. 주석 및 문서화

**주석 규칙:**
- 복잡한 로직만 주석 작성
- "무엇을" 보다 "왜"를 설명
- 코드로 설명 가능하면 주석 생략

```python
# ❌ 불필요한 주석
# 사용자 ID로 사용자 조회
user = get_user_by_id(user_id)

# ✅ 필요한 주석
# NOTE: 폐쇄망 환경이므로 외부 API 호출 불가, 로컬 캐시 사용 필수
cached_data = local_cache.get(key)
```

#### 8. 에러 핸들링

```python
# ❌ 에러 무시
try:
    result = risky_operation()
except:
    pass

# ✅ 명확한 에러 처리
try:
    result = risky_operation()
except ValueError as e:
    logger.error(f"Validation error: {e}")
    raise HTTPException(status_code=400, detail=str(e))
except Exception as e:
    logger.exception("Unexpected error in risky_operation")
    raise HTTPException(status_code=500, detail="Internal server error")
```

#### 9. 변수명 명확성

```python
# ❌ 불명확한 이름
def process(d, f):
    r = [i * 2 for i in d if i > f]
    return r

# ✅ 명확한 이름
def filter_and_double_measurements(
    measurements: List[float], threshold: float
) -> List[float]:
    return [m * 2 for m in measurements if m > threshold]
```

---

### LOW - 최적화

#### 10. 성능 최적화

```python
# ❌ N+1 쿼리
users = await db.execute(select(User))
for user in users:
    projects = await db.execute(select(Project).where(Project.user_id == user.id))

# ✅ Eager Loading
users = await db.execute(select(User).options(selectinload(User.projects)))
```

---

## 리뷰 보고서 & 자동 실행 로직

> 리뷰 보고서 템플릿, 자동 실행 흐름도, 성능 최적화 예시: [references/review-examples.md](references/review-examples.md)

---

## 체크리스트 요약

### Critical (필수)
- [ ] 파일 크기 500줄 이하
- [ ] 함수 크기 50줄 이하
- [ ] SQL Injection 방지
- [ ] XSS 방지
- [ ] 하드코딩된 비밀 없음

### High (강력 권장)
- [ ] 타입 힌트 완벽
- [ ] 단일 책임 원칙
- [ ] 중복 코드 제거
- [ ] 에러 핸들링

### Medium (권장)
- [ ] Docstring 작성
- [ ] 명확한 변수명
- [ ] 주석 적절

### Low (최적화)
- [ ] 성능 최적화
- [ ] 메모이제이션
- [ ] N+1 쿼리 방지

---

## Severity Levels

| Level | Icon | Action |
|-------|------|--------|
| Critical | FAIL | Block merge |
| Major | WARN | Should fix |
| Minor | INFO | Nice to have |
| Nitpick | NOTE | Optional |

---

**버전:** 2.0.0 (통합 버전)

---

## 다음 단계 안내

리뷰가 완료되면 사용자에게 다음 단계를 안내합니다:

```
✅ 코드 리뷰 완료! (결과: {PASS/CONDITIONAL/FAIL})

다음 단계 (선택):
  /qa-until-pass       → Playwright 자동 테스트
  security-reviewer    → 보안 전문 리뷰
  /commit              → 변경사항 커밋
```
