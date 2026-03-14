# Verification Protocol

모든 Wave 완료 후 결과를 검증하는 프로토콜.

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

다른 teammate가 수정하면 안 되는 파일을 수정했는지 확인:

```
for each section A:
  for each other_section B (where B != A):
    for each file in A.files:
      if file was modified and file is in B.files:
        CONFLICT: "파일 충돌: {file}이 section-A와 section-B 모두에서 수정됨"
```

**git diff 활용:**
```bash
git diff --name-only HEAD~{N}  # 변경된 파일 목록
```

각 변경 파일이 어떤 섹션의 소유인지 매핑하여 교차 수정 감지.

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

### 5단계: 빌드/타입 체크 (선택적)

프로젝트에 빌드 도구가 있는 경우:

```bash
# TypeScript
npx tsc --noEmit

# Python
python -m py_compile src/**/*.py

# Java
mvn compile -q
```

빌드 에러가 있으면 관련 섹션 식별 후 보고.

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

4. **최대 재시도: 1회** — 2번 실패하면 사용자에게 보고

## 전체 검증 통과 기준

| 항목 | 통과 기준 |
|------|-----------|
| 파일 존재 | 100% (모든 명시 파일 존재) |
| Acceptance Criteria | 80% 이상 |
| 파일 소유권 | 충돌 0건 |
| 빌드 | 에러 0건 (빌드 도구 있는 경우) |

80% 미만이면 "부분 성공"으로 보고하고 사용자에게 수동 확인 요청.
