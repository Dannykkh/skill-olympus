---
name: code-reviewer
description: 자동 코드 리뷰 스킬. 500줄 제한, 모듈화, 재사용성, 보안 취약점을 검증합니다. 코드 작성 완료 시 자동 실행.
license: MIT
metadata:
  version: "1.0.0"
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

### 🚨 CRITICAL - 반드시 통과해야 함

#### 1. 파일 크기 제한
```
✅ PASS: 파일이 500줄 이하
❌ FAIL: 파일이 500줄 초과
⚠️  WARN: 파일이 400줄 이상 (분리 권장)
```

**체크 방법:**
- 빈 줄, 주석 포함 전체 줄 수 계산
- Import 문도 포함

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

**체크 방법:**
```python
def long_function():  # 시작
    # ...
    # 50줄 체크
    pass  # 끝

# ✅ 올바른 분리:
def process_data(data):
    validated = validate_data(data)
    transformed = transform_data(validated)
    return save_data(transformed)

def validate_data(data):
    # 검증 로직만 (< 20줄)
    pass

def transform_data(data):
    # 변환 로직만 (< 20줄)
    pass
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

### ⚠️  HIGH - 강력 권장

#### 4. 타입 정의

**Python:**
```python
# ❌ 타입 힌트 없음
def get_user(user_id):
    return db.query(User).filter(User.id == user_id).first()

# ✅ 타입 힌트 완벽
def get_user(user_id: str, db: AsyncSession) -> Optional[User]:
    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    return result.scalar_one_or_none()
```

**TypeScript/React:**
```typescript
// ❌ any 사용
const handleSubmit = (data: any) => {
  console.log(data);
};

// ✅ 명확한 타입
interface FormData {
  voltage: number;
  result: 'Pass' | 'Fail';
}

const handleSubmit = (data: FormData): void => {
  console.log(data);
};
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
    """사용자 관리만"""
    def create_user(self, data): pass
    def update_user(self, data): pass

class EmailService:
    """이메일 발송만"""
    def send_welcome_email(self, user): pass
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

@router.get("/equipment/{id}")
async def get_equipment(id: str, db: Session = Depends(get_db)):
    equipment = db.query(Equipment).filter(Equipment.id == id).first()
    if not equipment:
        raise HTTPException(status_code=404, detail="Equipment not found")
    return equipment

# ✅ 공통 로직 분리
async def get_or_404(model: Type[T], id: str, db: Session) -> T:
    """모델 조회 또는 404"""
    obj = db.query(model).filter(model.id == id).first()
    if not obj:
        raise HTTPException(
            status_code=404,
            detail=f"{model.__name__} not found"
        )
    return obj

@router.get("/users/{id}")
async def get_user(id: str, db: Session = Depends(get_db)):
    return await get_or_404(User, id, db)
```

---

### 📝 MEDIUM - 권장

#### 7. 주석 및 문서화

```python
# ✅ 좋은 Docstring
async def calculate_test_result(
    measurement: float,
    spec_min: float,
    spec_max: float
) -> TestResult:
    """
    시험 측정값이 기준치 범위 내인지 판정합니다.

    Args:
        measurement: 실제 측정값
        spec_min: 최소 허용 기준
        spec_max: 최대 허용 기준

    Returns:
        TestResult:
            - status: 'Pass' 또는 'Fail'
            - value: 측정값
            - deviation: 기준치 대비 편차

    Raises:
        ValueError: spec_min > spec_max인 경우

    Example:
        >>> calculate_test_result(230, 200, 240)
        TestResult(status='Pass', value=230, deviation=0)
    """
```

**주석 규칙:**
- 복잡한 로직만 주석 작성
- "무엇을" 보다 "왜"를 설명
- 코드로 설명 가능하면 주석 생략

```python
# ❌ 불필요한 주석
# 사용자 ID로 사용자 조회
user = get_user_by_id(user_id)

# ✅ 필요한 주석
# NOTE: 폐쇄망 환경이므로 외부 API 호출 불가
# 로컬 캐시 사용 필수
cached_data = local_cache.get(key)
```

#### 8. 에러 핸들링

```python
# ❌ 에러 무시
try:
    result = risky_operation()
except:
    pass  # Silent fail

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
    r = []
    for i in d:
        if i > f:
            r.append(i * 2)
    return r

# ✅ 명확한 이름
def filter_and_double_measurements(
    measurements: List[float],
    threshold: float
) -> List[float]:
    """측정값 중 임계값 초과 항목을 2배로"""
    doubled_results = []
    for measurement in measurements:
        if measurement > threshold:
            doubled_results.append(measurement * 2)
    return doubled_results

# ✅ 더 나은 방식 (함수형)
def filter_and_double_measurements(
    measurements: List[float],
    threshold: float
) -> List[float]:
    return [m * 2 for m in measurements if m > threshold]
```

---

### 💡 LOW - 최적화

#### 10. 성능 최적화

**React:**
```typescript
// ❌ 매번 재계산
function Component({ items }) {
  const total = items.reduce((sum, item) => sum + item.price, 0);
  return <div>{total}</div>;
}

// ✅ 메모이제이션
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
# ❌ N+1 쿼리
users = await db.execute(select(User))
for user in users:
    projects = await db.execute(
        select(Project).where(Project.user_id == user.id)
    )

# ✅ Eager Loading
users = await db.execute(
    select(User).options(selectinload(User.projects))
)
```

---

## 리뷰 보고서 형식

### 템플릿
```markdown
# 코드 리뷰 결과

**파일:** `backend/app/api/v1/users.py`
**날짜:** 2026-01-16
**리뷰어:** Code Reviewer (Auto)

## 요약
- **상태:** ❌ FAIL / ⚠️  WARN / ✅ PASS
- **전체 점수:** 75/100

## Critical Issues (반드시 수정)
### ❌ 파일 크기 초과
- **현재:** 623줄
- **최대:** 500줄
- **조치:** 서비스 레이어 분리 필요
  - `users.py` → `user_api.py` (200줄) + `user_service.py` (300줄)

### ❌ 보안 취약점
- **라인 145:** SQL Injection 가능성
  ```python
  # 현재 (위험)
  query = f"SELECT * FROM users WHERE name LIKE '%{name}%'"

  # 수정 (안전)
  query = select(User).where(User.name.contains(name))
  ```

## High Priority (강력 권장)
### ⚠️  타입 힌트 누락
- **라인 78:** `get_user` 함수에 타입 힌트 없음
- **조치:** 반환 타입 `Optional[User]` 추가

### ⚠️  중복 코드
- **라인 120-135, 180-195:** 거의 동일한 검증 로직
- **조치:** `utils/validators.py`로 공통 함수 분리

## Medium Priority (권장)
### 📝 문서화 부족
- **라인 45:** `complex_calculation` 함수 Docstring 없음
- **조치:** Args, Returns, Example 추가

## 통과 항목 ✅
- [x] 모든 함수 50줄 이하
- [x] 환경 변수 사용 (하드코딩 없음)
- [x] 에러 핸들링 적절

## 권장 사항
1. 파일 분리 후 재리뷰 요청
2. 보안 취약점 수정 필수
3. 타입 힌트 추가로 유지보수성 향상

## 다음 단계
- [ ] Critical 이슈 수정
- [ ] 수정 후 재리뷰
- [ ] 테스트 추가
```

---

## 자동 실행 로직

### 1. 파일 저장 시
```
User: "users.py 파일 작성 완료"
    ↓
Assistant: [파일 Write/Edit 도구 사용]
    ↓
Auto-Trigger: Code Reviewer 실행
    ↓
결과: 리뷰 보고서 생성
    ↓
User에게 보고서 전달
```

### 2. 명시적 요청 시
```
User: "방금 작성한 코드 리뷰해줘"
    ↓
Assistant: [Code Reviewer 스킬 실행]
    ↓
리뷰 대상 파일 확인
    ↓
리뷰 보고서 생성
```

---

## 사용 예시

### 요청
```
파일을 작성했어. backend/app/api/v1/forms.py
코드 리뷰해줘.
```

### 실행
```python
# 1. 파일 읽기
file_content = read_file("backend/app/api/v1/forms.py")

# 2. 줄 수 체크
line_count = len(file_content.split('\n'))
if line_count > 500:
    report_critical("파일 크기 초과", line_count)

# 3. 함수 크기 체크
for function in parse_functions(file_content):
    if len(function.body) > 50:
        report_critical("함수 크기 초과", function.name)

# 4. 보안 체크
if "f\"SELECT" in file_content:
    report_critical("SQL Injection 가능성")

# 5. 타입 힌트 체크
if "def " in file_content and "->" not in file_content:
    report_high("타입 힌트 누락")

# 6. 리뷰 보고서 생성
generate_report(all_findings)
```

---

## 체크리스트

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
| Critical | 🔴 | Block merge |
| Major | 🟠 | Should fix |
| Minor | 🟡 | Nice to have |
| Nitpick | 🟢 | Optional |

---

**버전:** 2.0.0 (통합 버전)
**최종 업데이트:** 2026-01-24

---

## 다음 단계 안내

리뷰가 완료되면 사용자에게 다음 단계를 안내합니다:

```
✅ 코드 리뷰 완료! (결과: {PASS/CONDITIONAL/FAIL})

👉 다음 단계 (선택):
  /qa-until-pass       → Playwright 자동 테스트 (아직 안 했다면)
  security-reviewer    → 보안 전문 리뷰 (필요하면)
  /commit              → 변경사항 커밋

📎 참고: docs/workflow-guide.md
```
