# Verification Protocol

모든 Wave 완료 후 결과를 검증하는 프로토콜. 0단계만 Wave 1 시작 전에 실행합니다.

## 0단계: 소유권 기준점 기록 (Wave 1 시작 전)

작업 중에는 커밋하지 않으므로, 끝난 뒤 "무엇이 바뀌었나"를 커밋 이력으로 알 수 없습니다.
시작 시점의 작업 트리를 기준점으로 남겨 두고 3단계에서 그 기준점과 비교합니다.

```bash
git stash create                            # 출력된 SHA = 기준점 (작업 트리가 깨끗하면 빈 출력 → 아래 HEAD 사용)
git rev-parse HEAD                          # 빈 출력일 때의 기준점
git ls-files --others --exclude-standard    # 이미 있던 새 파일(untracked) 목록
```

- `git stash create`는 작업 트리를 건드리지 않고, 이미 있던 미커밋 수정을 포함한 상태를 커밋 객체로만 만듭니다. 그래서 사용자가 작업 전부터 고치던 파일이 오탐되지 않습니다.
- 기준점 SHA와 기존 untracked 목록은 Lead가 activity log(`conversations/{YYYY-MM-DD}-team-poseidon.md`)의 `## Ownership baseline`에 적습니다. 컨텍스트가 압축돼도 3단계에서 다시 읽기 위해서입니다.
- git 저장소가 아니면 `ownership baseline: NOT APPLICABLE (no git)`으로 적고, 3단계는 작업자가 반환한 변경 파일 목록만으로 수행합니다.

## 검증 절차

### 1단계: 파일 존재 검증

각 섹션의 "Files to Create/Modify"에 명시된 파일이 실제로 존재하는지 확인:

```
for each section:
  for each expected_file in section.files:
    Glob(expected_file)
    if not exists:
      FAIL: "section-NN: {file} 파일이 생성되지 않았습니다"
```

**결과 분류:**
- ✅ 모든 파일 존재
- ⚠️ 일부 파일 누락 (경고)
- ❌ 대부분 파일 누락 (실패)

### 2단계: Acceptance Criteria 검증

각 섹션의 "Acceptance Criteria" 체크리스트를 확인:

```markdown
## Acceptance Criteria (section-01)

- [x] BaseModule 클래스가 init()과 destroy() 메서드를 가짐
- [x] AppConfig 인터페이스가 필수 필드를 정의함
- [ ] 단위 테스트가 존재함  ← 실패
```

**검증 방법:**
- 파일 내용을 Read로 확인하여 각 criteria 충족 여부 판단
- 코드 존재 여부 확인 (Grep으로 함수/클래스명 검색)
- 테스트 파일 존재 여부 확인 (Glob으로 `*.test.ts`, `*.spec.ts` 등)

### 3단계: 파일 소유권 검증

0단계 기준점 대비 실제로 바뀐 파일을 구한 뒤, 섹션 소유와 작업자 보고에 대조합니다.

**변경 파일 = 아래 둘의 합집합:**
```bash
git diff --name-only {기준점 SHA}             # 추적 파일: 커밋 여부와 무관하게 기준점 이후 바뀐 파일
git ls-files --others --exclude-standard     # 새 파일 — 0단계 기존 untracked 목록에 있던 것은 제외
```

**대조:**
```
for each changed_file:
  owners = file이 들어 있는 섹션의 Files to Create/Modify (자유 모드: 태스크 담당 파일)
  if file이 Lead 기록(activity log, checklist-status.md, implementation-notes.md): 건너뜀
  if len(owners) >= 2:
    if owners 중 둘 이상이 같은 Wave: CONFLICT: "파일 충돌: {file}을 같은 Wave의 {owners}가 함께 맡음"
    else: SHARED: "{file}을 다른 Wave의 {owners}가 순차로 고침 — 각자 Module Contract가 맡은 부분만 바꿨는지 diff 확인"
  if len(owners) == 0:
    if file이 sections/index.md Harness의 조립 지점이고 변경이 등록 줄뿐: 허용
      # 등록 줄뿐 = `git diff {기준점 SHA} -- {file}`에 '-'로 시작하는 줄(삭제·수정)이 없고 추가 줄만 있음
    else: UNOWNED: "소유 섹션 없는 변경: {file}"
  if file이 어느 작업자의 반환 '변경 파일'에도 없음:
    UNREPORTED: "보고되지 않은 변경: {file}"
```

- `UNOWNED`·`UNREPORTED`는 해당 Wave 작업자의 반환 내용과 diff를 보고 원인을 판단합니다. 근거 없는 변경이면 revert를 지시하고, 필요한 변경이면 섹션 소유에 추가한 뒤 activity log에 기록합니다.
- 기존 untracked 파일을 작업 중에 수정한 경우는 이 방식으로 잡히지 않습니다. 해당 파일이 있으면 0단계에서 이름을 적어 두고 3단계에서 직접 diff를 확인합니다.

### 4단계: 도면 노드 검증 (flow-diagrams 존재 시)

`<planning_dir>/flow-diagrams/` 디렉토리가 존재하면 실행:

각 섹션의 담당 도면 노드가 실제 코드에 구현되었는지 확인:

```
for each section with diagram:
  1. Read flow-diagrams/{diagram}.mmd
  2. 담당 노드 목록 (section-parser에서 추출)과 코드 대조
  3. 각 노드에 대응하는 함수/메서드/조건문이 코드에 존재하는지 Grep
  4. 분기(decision) 노드의 모든 경로(Yes/No/에러)가 구현되었는지 확인
```

**검증 방법:**
- 다이어그램 노드 ID (예: `FindUser`, `CheckPwd`)를 코드에서 Grep
- 분기 노드의 Yes/No 경로가 if/else 또는 switch로 구현되었는지 확인
- 에러 경로 노드 (예: `Error401`)에 대응하는 예외 처리가 있는지 확인

**결과 형식:**
```
📐 도면 검증: section-02-auth (user-auth.mmd)
  ✅ Validate — src/auth/login.ts:15
  ✅ FindUser — src/auth/auth.service.ts:32
  ✅ CheckPwd — src/auth/auth.service.ts:38
  ❌ GenRefresh — 미구현
  매칭률: 75% (3/4)
```

**실패 시:** 누락된 노드를 재시도 Task의 description에 포함.

### 4.5단계: 경계면 정합성 교차 비교 (사전 점검 — 통합 코히런스)

> ⚠️ **"빌드 통과 ≠ 정상 동작."** TS 제네릭/캐스팅(`fetchJson<T>()`)은 런타임 응답 shape이 `T`와 달라도 컴파일을 통과시킨다.
> 빌드/테스트(5단계)는 *그 경계를 테스트가 실제로 건드려야* 잡지만, 이 교차 비교는 **모든 경계를 정적으로 빠짐없이** 대조한다(런타임 전 그물).

**적용 범위(과적용 방지):** 통합 경계면이 있을 때만. 경계 종류를 감지해 해당 경계만 대조하고, 경계가 없으면(단일 바이너리·정적사이트) 건너뛴다.

| 프로젝트 | 교차 비교 대상 |
|---|---|
| **웹앱(프론트+API)** | API 응답 shape ↔ 훅 `fetchJson<T>`의 `T`, 라우트 경로 ↔ 링크 href, 엔드포인트 ↔ 훅 1:1, 상태 전이 맵 ↔ 실제 status 업데이트 코드 |
| CLI | 인자 스키마(parser) ↔ 핸들러가 읽는 필드 |
| 라이브러리/SDK | export 타입 ↔ 문서/테스트 시그니처 |
| 마이크로서비스 | producer 이벤트 스키마 ↔ consumer 파싱 |

**방법 — "양쪽 동시 읽기":** 한쪽만 보고 "맞다" 판단 금지. 경계의 양쪽 파일을 동시에 Read해 계약을 직접 대조한다.
- 래핑 확인: API가 `{ data: [...] }`를 반환하면 훅이 `.data`를 꺼내는가
- 필드명 케이스(camelCase ↔ snake_case) 일치
- 1:1 매핑: 호출 안 되는 API, 대응 API 없는 훅 탐지
- 동기/비동기 응답 구분(즉시 `{ status }` ↔ 프론트가 `data.failedIndices` 접근)
- 불일치 발견 → 해당 섹션을 재시도 프로세스로 (5단계 게이트 전에 수정)

> 이 단계는 **사전 점검**이다 — 완료 권한은 여전히 5단계 통합 게이트(빌드/테스트)에 있다. 둘은 상보적: 4.5는 정적·전수, 5는 런타임·동작.

### 5단계: 통합 검증 게이트 (필수 — 유일한 완료 권한)

> ⚠️ 1~2단계의 파일 존재·Grep/Read 기반 AC 확인은 "코드가 있다"는 **사전 점검일 뿐, 동작 검증이 아니다.**
> 모델이 코드를 읽고 "충족됨"이라 판단하는 것(자기판단)은 비컴파일·비통합 코드를 "100% 통과"로 통과시킬 수 있다.
> 완료 선언은 아래 **외부 실행 게이트로만** 한다 — Grep/Read AC가 100%여도 이 게이트가 우선한다.

모든 Wave 병합 후 1회 실행:

1. **빌드/타입 체크** (도구 있으면 필수):
   ```bash
   npx tsc --noEmit          # TypeScript
   python -m py_compile ...  # Python (또는 ruff check)
   mvn compile -q            # Java
   ```
2. **전체 테스트 스위트** (테스트 있으면 필수): `npm test` / `pytest` / `mvn test` — 개별 Wave가 아니라 **병합된 전체를 1회**
3. **통합/E2E 1회** (있으면): 서비스 기동 + 핵심 경로 1개 실행, 또는 minos 핸드오프

빌드 에러·테스트 실패가 있으면 관련 섹션을 식별해 재시도 프로세스로. **게이트 미통과 상태로 "완료" 선언 금지.** 빌드/테스트 도구가 아예 없으면 그 사실을 명시하고 수동 확인을 요청한다(자동 PASS 금지).

## 검증 결과 형식

```
═══════════════════════════════════════
검증 결과
═══════════════════════════════════════

📁 파일 존재: 18/20 (90%)
  ❌ src/api/handlers/admin.ts — 미생성 (section-04)
  ❌ src/tests/api.test.ts — 미생성 (section-04)

✅ Acceptance Criteria: 14/16 (87.5%)
  ❌ section-04: "관리자 API 엔드포인트" 미충족
  ❌ section-04: "API 테스트 코드" 미충족

🔒 파일 소유권: 이상 없음

🔨 빌드: 성공 (또는 N/A)
═══════════════════════════════════════
```

## 실패 시 재시도 프로세스

검증 실패 섹션이 있으면:

1. **실패 내용 정리:**
   ```
   section-04-api 검증 실패:
   - admin.ts 미생성
   - api.test.ts 미생성
   - Acceptance Criteria 2개 미충족
   ```

2. **재시도 Task 생성:**
   ```
   TaskCreate({
     subject: "Section 04: API (재시도)",
     description: "[원본 section 내용] + [실패 피드백 추가]",
     activeForm: "Section 04 재구현 중"
   })
   ```

3. **실패 피드백을 description에 추가:**
   ```
   ## ⚠️ 이전 시도 실패 사항
   - src/api/handlers/admin.ts가 생성되지 않았습니다. 반드시 생성하세요.
   - src/tests/api.test.ts 테스트 파일이 필요합니다.
   - Acceptance Criteria: "관리자 API 엔드포인트" 구현 필요
   ```

4. **최대 재시도: 2회** — 3번 시도(초기 1회 + 재시도 2회) 후에도 실패하면 사용자에게 보고

## 전체 검증 통과 기준

| 항목 | 통과 기준 | 성격 |
|------|-----------|------|
| 파일 존재 | 100% (모든 명시 파일 존재) | 사전 점검 |
| Acceptance Criteria (Grep/Read) | 80% 이상 | 사전 점검 — **완료 권한 아님** |
| 파일 소유권 | 충돌 0건 | 사전 점검 |
| 경계면 정합성 (4.5단계) | 불일치 0건 (경계 있는 웹앱 등) | 사전 점검 |
| **빌드 (5단계)** | **에러 0건** | **필수 게이트** (도구 있는 경우) |
| **전체 테스트 (5단계)** | **통과** | **필수 게이트** (테스트 있는 경우) |
| **통합/E2E (5단계)** | 핵심 경로 1개 통과 | 게이트 (있는 경우) |

**완료는 5단계 게이트(빌드+테스트) 통과로만 선언한다.** 1~4단계(존재·Grep AC·소유권)는 사전 점검이며 그것만으로 "완료"가 되지 않는다. 빌드/테스트 도구가 없으면 그 사실을 명시하고 수동 확인을 요청(자동 PASS 금지). 게이트 미통과면 "부분 성공"으로 보고.
