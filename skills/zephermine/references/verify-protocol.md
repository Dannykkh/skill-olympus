# Verify Protocol

구현 완료 후 SPEC 대비 검증. 정적 분석(코드 탐색) + 런타임 검증(빌드/테스트/E2E).

## 트리거

zephermine resume 시 모든 계획 파일이 존재하고 사용자가 "구현 완료" 또는 "--verify" 전달 시.

## 검증 프로세스

### Step 20: 서브에이전트 검증 실행

**Phase 1: 정적 검증** — Task(subagent_type="Explore") 2개 병렬 실행:

1. **기능 검증 에이전트**: claude-spec.md의 기능적 요구사항 vs 실제 코드
   - 각 요구사항별 구현 여부 (✅/❌)
   - 누락된 기능 구체적 명시
   - 엣지 케이스 처리 확인

2. **품질 검증 에이전트**: 비기능 요구사항 + 코드 품질
   - 성능/보안/접근성 요구사항 충족 여부
   - 테스트 커버리지
   - 타입 안전성
   - 문서화 상태

```
# 두 에이전트를 하나의 메시지에서 병렬 실행:

Task(
  subagent_type="Explore",
  prompt="""
  기능 검증: claude-spec.md 대비 구현 상태 확인

  1. <planning_dir>/claude-spec.md를 읽고 기능적 요구사항 목록 추출
  2. 코드베이스에서 각 요구사항의 구현 여부 확인
  3. 결과를 다음 형식으로 반환:

  ## 기능 검증 결과
  | 요구사항 | 상태 | 근거 |
  |----------|------|------|
  | ... | ✅/❌ | 파일:라인 또는 미구현 사유 |

  - 엣지 케이스 처리 여부도 확인
  - 누락된 기능은 구체적으로 명시
  """
)

Task(
  subagent_type="Explore",
  prompt="""
  품질 검증: 비기능 요구사항 + 코드 품질 확인

  1. <planning_dir>/claude-spec.md에서 비기능 요구사항 추출
  2. 코드베이스에서 다음 항목 확인:
     - 성능/보안/접근성 요구사항 충족 여부
     - 테스트 커버리지 (테스트 파일 존재 여부)
     - 타입 안전성 (any 사용, 타입 누락)
     - 문서화 상태 (README, JSDoc 등)

  ## 품질 검증 결과
  | 항목 | 상태 | 상세 |
  |------|------|------|
  | ... | ✅/❌ | ... |
  """
)
```

두 에이전트의 결과를 합쳐 정적 검증 보고서 작성.

---

**Phase 2: 런타임 검증** — 빌드, 테스트, E2E 실행

정적 검증 완료 후, 실제로 코드를 실행하여 검증합니다.

#### 2-1. 프로젝트 감지

코드베이스를 탐색하여 기술 스택과 실행 명령어를 자동 감지:

```
감지 대상:
- package.json → npm/yarn/pnpm (scripts 섹션에서 build, test, e2e 추출)
- pom.xml / build.gradle → Maven/Gradle
- pyproject.toml / requirements.txt → Python (pytest)
- Makefile → make 명령어
- docker-compose.yml → Docker 기반 테스트
```

#### 2-2. 빌드 검증

```
Bash: {detected_build_command}

예시:
- npm run build
- mvn compile
- ./gradlew build
- python -m py_compile src/**/*.py
```

빌드 실패 시: 에러 로그를 `claude-verify-report.md`에 기록하고 사용자에게 보고.

#### 2-3. 단위 테스트 실행

```
Bash: {detected_test_command}

예시:
- npm test
- mvn test
- pytest
- ./gradlew test
```

결과 파싱:
- 총 테스트 수, 통과, 실패, 스킵
- 실패한 테스트명 + 에러 메시지 추출

#### 2-4. E2E 테스트 실행 (있는 경우)

E2E 테스트 존재 여부를 먼저 확인:

```
감지 기준:
- playwright.config.* → Playwright
- cypress.config.* → Cypress
- package.json scripts에 "e2e", "test:e2e" 키 존재
- tests/e2e/**, e2e/**, cypress/** 디렉토리 존재
```

E2E 프레임워크가 감지되면 실행:

```
Bash: {detected_e2e_command}

예시:
- npx playwright test
- npx cypress run
- npm run test:e2e
```

**E2E 미감지 시**: 건너뜀 (경고 없음, 모든 프로젝트에 E2E가 있진 않으므로)

#### 2-5. 런타임 검증 결과 요약

```markdown
## 런타임 검증 결과

| 단계 | 상태 | 상세 |
|------|------|------|
| 빌드 | ✅/❌ | {build_command} — 성공/실패 사유 |
| 단위 테스트 | ✅/❌ | {passed}/{total} 통과 (실패: {failed_list}) |
| E2E 테스트 | ✅/❌/⏭️ | {passed}/{total} 통과 또는 "미감지 — 건너뜀" |
```

---

---

**Phase 3: QA 시나리오 검증** — claude-qa-scenarios.md 기반 통과 체크

계획 단계에서 정의한 입출력 기대값을 실제 구현과 대조합니다.

#### 3-1. QA 시나리오 문서 로드

`<planning_dir>/claude-qa-scenarios.md`를 읽어 모든 테스트 케이스 추출.

#### 3-2. 시나리오별 통과 판정

각 테스트 케이스에 대해:

| 판정 방법 | 조건 |
|-----------|------|
| **테스트 코드 존재** | 해당 시나리오를 커버하는 테스트가 있고, Phase 2에서 통과 → ✅ |
| **코드 분석** | 테스트는 없지만 코드상 해당 로직이 구현됨 → ⚠️ (테스트 미작성) |
| **미구현** | 코드에서 해당 처리가 없음 → ❌ |

#### 3-3. QA 시나리오 결과 마킹

`claude-qa-scenarios.md`의 체크박스를 업데이트:

```markdown
## Section 01: User API
### POST /api/users
- [x] 정상 생성: { name: "홍길동" } → 201 ✅
- [x] 필수값 누락: { name: "" } → 400 ✅
- [ ] 이메일 중복: → 409 ❌ (중복 체크 로직 미구현)
- [x] 이메일 형식 오류: → 400 ⚠️ (코드 있음, 테스트 없음)
```

#### 3-4. QA 통과율 요약

```markdown
## QA 시나리오 검증 결과

| 카테고리 | 통과 | 경고 | 실패 | 통과율 |
|----------|------|------|------|--------|
| 정상 케이스 | 12 | 1 | 0 | 100% |
| 에러 케이스 | 8 | 2 | 3 | 62% |
| 엣지 케이스 | 4 | 3 | 2 | 44% |
| **합계** | **24** | **6** | **5** | **69%** |
```

---

Phase 1 + Phase 2 + Phase 3 결과를 합쳐 `<planning_dir>/claude-verify-report.md`로 작성.

### Step 21: 검증 결과 보고

사용자에게 결과 제시:
- 전체 충족률 (%)
- 카테고리별 상세 (기능/품질/런타임)
- 빌드/테스트 통과 여부
- 누락 항목 목록

AskUserQuestion으로 다음 선택:
- "수정 후 재검증" → Step 19 반복
- "현재 상태 승인" → 완료

```
AskUserQuestion:
  question: "검증 결과를 확인했습니다. 어떻게 하시겠습니까?"
  options:
    - "수정 후 재검증" (누락 항목 수정 후 Step 19 재실행)
    - "현재 상태 승인" (검증 완료, 종료)
```
