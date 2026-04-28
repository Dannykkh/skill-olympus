# Maintainability Specialist 체크리스트

Scope: 항상 실행 (모든 리뷰)
Output: JSON (한 줄에 하나). 발견 없으면 `NO FINDINGS`만 출력.

```json
{"severity":"INFORMATIONAL","confidence":N,"path":"file","line":N,"category":"maintainability","summary":"...","fix":"...","specialist":"maintainability"}
```

---

## 카테고리

### 죽은 코드 & 미사용 임포트
- 할당되었지만 읽히지 않는 변수
- 정의되었지만 호출되지 않는 함수/메서드 (Grep으로 레포 전체 확인)
- 변경 후 더 이상 참조되지 않는 import/require
- 주석 처리된 코드 블록 (삭제하거나 존재 이유 설명)

### 매직 넘버 & 문자열 커플링
- 로직에 노출된 숫자 리터럴 (임계값, 제한, 재시도 횟수) → 상수로 변환
- 에러 메시지 문자열이 다른 곳에서 쿼리 필터/조건으로 사용
- 하드코딩된 URL, 포트, 호스트명 → 설정으로 분리
- 여러 파일에 중복된 리터럴 값

### 유효하지 않은 주석 & Docstring
- 코드 변경 후 구 동작을 설명하는 주석
- 완료된 작업을 참조하는 TODO/FIXME
- 현재 함수 시그니처와 불일치하는 파라미터 Docstring
- 코드 흐름과 맞지 않는 ASCII 다이어그램

### DRY 위반
- diff 내 유사 코드 블록(3줄 이상) 반복
- 공유 헬퍼가 더 깔끔한 복사-붙여넣기 패턴
- 테스트 파일 간 중복된 설정/설정 로직
- 룩업 테이블이나 맵으로 대체 가능한 반복 조건 체인

### 조건부 부작용
- 조건 분기에서 한쪽에만 부작용 누락
- 조건부로 건너뛴 작업을 수행했다고 주장하는 로그
- 한 분기만 관련 레코드를 업데이트하는 상태 전이
- 에러/엣지 경로에서 누락된 이벤트 발행

### 모듈 경계 위반
- 다른 모듈의 내부 구현에 접근 (private-by-convention 메서드)
- 서비스/모델을 거치지 않는 컨트롤러/뷰의 직접 DB 쿼리
- 인터페이스 대신 직접 결합된 컴포넌트

### 도메인사전 위반

> 마스터 사전 `docs/domain-dictionary.md`(또는 프로젝트 루트의 `domain-dictionary.md`)가 있을 때만 검사.
> 사전이 없으면 이 카테고리 건너뛰기.
> 참고: `docs/plan/*/domain-dictionary-delta.md`는 변경 이력 파일이며 검증 기준은 항상 마스터.

**검사 절차:**
1. 마스터 사전 위치 확인 — `docs/domain-dictionary.md` 우선, 없으면 프로젝트 루트 `domain-dictionary.md`
2. 사전의 "핵심 용어"와 "금지 표현" 섹션 파싱
3. diff에서 금지 표현 사용 여부 검사
4. diff에서 동의어 혼용 여부 검사 (사전이 정의한 규범 용어를 따르지 않음)

**보고 패턴:**
- 금지 표현 사용: `cart`로 통일된 사전인데 새 코드가 `basket`을 도입
- 정의 위반: 사전의 정의와 다른 의미로 같은 단어 사용
- 영-한 매핑 불일치: 사전이 "Customer = 고객"으로 정의했는데 UI 라벨이 "회원"

**보고 형식:**
```json
{"severity":"INFORMATIONAL","confidence":8,"path":"src/shop/basket.ts","line":1,"category":"domain-dictionary","summary":"파일명/변수명에 'basket' 사용. 도메인사전(docs/domain-dictionary.md)은 'cart'로 통일 규정","fix":"basket → cart로 변경 (또는 사전을 갱신해 의도 명시)","specialist":"maintainability"}
```

**오탐 주의:**
- 외부 라이브러리 / 표준 API 식별자는 변경 불가 → 보고하지 않음
- 사전이 오래된 경우 사용자가 "사전 갱신" 선택 가능

### 모듈 깊이 (인터페이스 가성비)

> *A Philosophy of Software Design* (John Ousterhout) — "deep module" 관점.
> 인터페이스는 단순한데 구현 안에 많은 동작을 숨길수록 "깊은 모듈" = 가성비 좋음.

**Shallow 모듈 시그널 (개선 여지):**
- `getX`, `getXById`, `getXByEmail`, `getXByPhone`, `searchX` — 같은 일의 변형 5+ 개 → `findX(criteria)` 하나로 통합 가능
- 구현이 거의 한 줄 위임만 하는 pass-through wrapper (`return this.repo.save(x)`)
- 인터페이스 메서드 수 ≈ 구현 함수 수 (캡슐화 거의 없음)
- Getter/setter만 있는 클래스 (구조체로 충분)
- 호출자가 매번 여러 메서드를 정해진 순서로 호출해야 함 → `execute()` 하나로 흡수 가능
- 옵션 플래그 6+ 개를 받는 메서드 (오히려 인터페이스 분리가 답일 수도)

**판단 기준 (오탐 주의):**
- 메서드가 많아도 각각 **분명히 다른 의도**라면 OK (`save` vs `softDelete`는 다름)
- 도메인이 본질적으로 복잡하면 인터페이스가 큰 게 정상
- 신뢰도 5-7점으로 보고. 단정적 표현 금지 ("개선 여지" 정도)

**보고 형식 (예시):**
```json
{"severity":"INFORMATIONAL","confidence":6,"path":"src/users/repo.ts","line":12,"category":"module-depth","summary":"5개 finder 메서드(getById/getByEmail/getByPhone/search/listActive)가 같은 테이블 조회 변형. UserCriteria로 통합 시 인터페이스 1개로 축소 가능","fix":"findUsers(criteria: UserCriteria) 단일 메서드로 통합 검토","specialist":"maintainability"}
```
