---
description: 프로젝트 기술 스택 분석 후 내부 스킬/에이전트 + 외부 리소스(MCP, 외부 스킬) 추천 및 설치
argument-hint: [--dry-run]
---

# Smart Setup

프로젝트의 기술 스택을 자동 감지하여 최적의 스킬, 에이전트, MCP 서버, 훅을 추천하고 설치합니다.

## 인수

- `--dry-run` - 추천 목록만 표시하고 실제 설치하지 않음 (선택)

## 워크플로우

아래 5단계를 순서대로 실행하세요.

---

### 1단계: 기술 스택 감지

프로젝트 루트에서 다음 파일들을 스캔하여 기술 태그를 수집합니다.

**레지스트리 로드:**
```
docs/smart-setup-registry.json 파일을 읽어 detection-rules 배열을 가져옵니다.
```

**파일 스캔 로직:**

각 detection-rule에 대해:

1. **Glob 도구**로 `file` 패턴에 해당하는 파일 존재 여부 확인
2. 파일이 존재하면:
   - `match`가 `null`이면 → 파일 존재만으로 해당 `tags` 추가
   - `match`가 문자열이면 → **Read 도구**로 파일 내용 읽어 문자열 포함 여부 확인 → 포함 시 `tags` 추가
3. 수집된 모든 태그를 중복 제거하여 `detectedTags` 집합에 저장

**감지 결과 출력:**
```
🔍 기술 스택 감지 결과:
  감지된 태그: react, typescript, nextjs, postgresql
  스캔 파일: package.json, tsconfig.json, prisma/schema.prisma
```

**참고:** 어떤 태그도 감지되지 않으면 `["*"]`만 적용 (범용 리소스만 추천)

---

### 2단계: 레지스트리 조회 및 태그 매칭

registry.json에서 각 카테고리별로 감지된 태그와 매칭되는 리소스를 필터링합니다.

**매칭 로직:**

각 리소스의 `tags` 배열과 `detectedTags`를 비교:
- 리소스 태그에 `"*"`가 있으면 → 항상 매칭
- 리소스 태그 중 하나라도 `detectedTags`에 있으면 → 매칭

**결과를 3개 그룹으로 분류:**
- **필수 (essential)**: `priority: "essential"` — 감지된 스택에 핵심적인 리소스
- **추천 (recommended)**: `priority: "recommended"` — 생산성 향상에 도움
- **선택 (optional)**: `priority: "optional"` — 특정 용도에 유용

---

### 3단계: 추천 목록 표시

매칭된 리소스를 카테고리와 우선순위별로 정리하여 표시합니다.

**출력 형식:**

```
📦 Smart Setup 추천 목록
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔴 필수 (Essential)
  [외부 스킬] vercel-agent-skills — React/Next.js 45+ 최적화 규칙
  [외부 스킬] mastering-typescript-skill — 엔터프라이즈급 TypeScript
  [내부 스킬] react-dev — React 개발 가이드
  [에이전트] frontend-react — React/TypeScript 전문가

🟡 추천 (Recommended)
  [MCP] Context7 — 라이브러리 문서 실시간 검색
  [MCP] Playwright — 브라우저 자동화
  [외부 스킬] oh-my-claudecode — 32개 에이전트, 40+ 스킬
  [내부 스킬] code-reviewer — 코드 리뷰
  [내부 스킬] long-term-memory — 장기 메모리 관리
  [훅] save-conversation — 대화 저장
  [훅] validate-code — 코드 품질 검사

🟢 선택 (Optional)
  [MCP] Pandoc — 문서 변환
  [내부 스킬] reducing-entropy — 코드베이스 최소화
  [에이전트] qa-engineer — QA 검증

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
총 N개 리소스 추천 (필수 X개, 추천 Y개, 선택 Z개)
```

**`--dry-run` 인수가 있으면:** 여기서 중단하고 추천 목록만 표시

---

### 4단계: 사용자 확인

AskUserQuestion 도구를 사용하여 설치 범위를 확인합니다.

**질문:**
```
어떤 범위까지 설치하시겠습니까?
```

**선택지:**
1. **전체 설치** (Recommended) — 필수 + 추천 + 선택 모두 설치
2. **추천까지** — 필수 + 추천만 설치
3. **필수만** — 필수만 설치
4. **개별 선택** — 리소스를 하나씩 확인

**"개별 선택" 시:** 각 리소스별로 설치 여부를 물어봅니다:
```
[외부 스킬] vercel-agent-skills — React/Next.js 45+ 최적화 규칙
설치하시겠습니까? (Y/n)
```

---

### 5단계: 설치 실행

선택된 리소스를 다음 순서로 설치합니다:

**설치 순서:** 내부 리소스 → 외부 스킬 → MCP 서버

#### 5-1. 내부 스킬 안내

내부 스킬은 이미 이 저장소에 포함되어 있으므로 설치 불필요. 활성화 방법만 안내:

```
✅ 내부 스킬 활성화 안내:
  - react-dev: skills/react-dev/SKILL.md (트리거: /react-dev)
  - code-reviewer: skills/code-reviewer/SKILL.md (트리거: /code-reviewer)
  ※ install.bat 또는 install.sh로 글로벌 설치 가능
```

#### 5-2. 내부 에이전트 안내

에이전트도 이미 포함. Task 도구에서 사용 가능 여부 안내:

```
✅ 내부 에이전트 활성화 안내:
  - frontend-react: agents/frontend-react.md
  - code-reviewer: agents/code-reviewer.md
  ※ install.bat 또는 install.sh로 글로벌 설치 가능
```

#### 5-3. 훅 안내

훅 설정 필요 여부 안내:

```
✅ 훅 설정 안내:
  - SETUP.md의 "훅 설정 가이드" 섹션 참고
  - 또는 settings.example.json을 .claude/settings.json으로 복사
```

#### 5-4. 외부 스킬 설치

**Bash 도구**를 사용하여 각 외부 스킬의 `installCommand`를 실행:

```bash
# 각 외부 스킬의 installCommand를 순서대로 실행
npx add-skill vercel-labs/agent-skills -a claude-code
npx add-skill SpillwaveSolutions/mastering-typescript-skill -a claude-code
```

각 명령 실행 후 성공/실패를 기록합니다.

#### 5-5. MCP 서버 설치

**Bash 도구**를 사용하여 각 MCP 서버의 `installCommand`를 실행:

```bash
claude mcp add context7 -- npx -y @upstash/context7-mcp
claude mcp add playwright -- npx -y @playwright/mcp@latest
```

`note` 필드가 있는 MCP는 사전 안내:
```
⚠️ GitHub MCP: GITHUB_PERSONAL_ACCESS_TOKEN 환경변수 필요
계속 설치하시겠습니까? (Y/n)
```

#### 5-6. MEMORY.md 기록

설치 결과를 MEMORY.md의 `tools/` 섹션에 기록:

```markdown
### smart-setup-결과
`tags: smart-setup, 자동설치`
`date: YYYY-MM-DD`

- **감지된 태그**: react, typescript, nextjs, postgresql
- **설치된 외부 스킬**: vercel-agent-skills, mastering-typescript-skill
- **설치된 MCP**: context7, playwright
- **활성화된 내부 스킬**: react-dev, code-reviewer, long-term-memory
```

---

### 최종 리포트

```
🎉 Smart Setup 완료!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

감지된 기술 스택: react, typescript, nextjs, postgresql

📦 설치 결과:
  ✅ 외부 스킬: 3개 설치 완료
  ✅ MCP 서버: 2개 설치 완료
  ℹ️ 내부 스킬: 5개 활성화 안내
  ℹ️ 내부 에이전트: 3개 활성화 안내
  ℹ️ 훅: 4개 설정 안내

⚠️ 추가 작업:
  - install.bat/install.sh 실행하여 내부 스킬/에이전트 글로벌 설치
  - .claude/settings.json에 훅 설정 추가 (SETUP.md 참고)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 도구 사용 가이드

| 도구 | 용도 |
|------|------|
| **Read** | registry.json 로드, 프로젝트 파일 내용 확인 |
| **Glob** | 파일 존재 여부 스캔 (*.csproj, package.json 등) |
| **Grep** | 파일 내 문자열 매칭 (match 필드 확인) |
| **AskUserQuestion** | 설치 범위 확인, 개별 선택 |
| **Bash** | 외부 스킬/MCP 설치 명령 실행 |
| **Edit** | MEMORY.md 업데이트 |

## 에러 처리

- **외부 스킬 설치 실패**: 오류 메시지 표시 후 다음 항목 계속 진행. 최종 리포트에 실패 목록 포함
- **MCP 설치 실패**: 수동 설치 명령 안내 후 계속 진행
- **파일 스캔 실패**: 해당 파일 건너뛰고 다음 규칙 확인
- **레지스트리 파일 없음**: 오류 메시지 표시 후 중단

## 성공 기준

- 프로젝트의 기술 스택이 정확히 감지됨
- 감지된 스택에 맞는 리소스만 추천됨
- 사용자가 선택한 범위 내에서만 설치됨
- 설치 결과가 MEMORY.md에 기록됨
- 실패한 항목이 있으면 최종 리포트에 명시됨
