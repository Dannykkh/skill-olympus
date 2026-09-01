# 빠른 시작 가이드

Claude Code, Codex, Antigravity CLI, Grok Build에서 Olympus 커스터마이징을 설치하고 사용하는 방법입니다.

---

## 1. 설치

### Windows

```powershell
git clone https://github.com/Dannykkh/skill-olympus.git
cd skill-olympus
.\install.bat
```

### Linux/Mac

```bash
git clone https://github.com/Dannykkh/skill-olympus.git
cd skill-olympus
chmod +x install.sh && ./install.sh
```

인수 없이 실행하면 Claude, Codex, Antigravity, Grok 전체를 대상으로 설치합니다. `--all`은 같은
선택을 명시적으로 적는 옵션일 뿐 필수는 아닙니다. CLI 실행 파일이 아직 없어도 각 홈의
스킬·카탈로그·source-only 라이브러리·훅·설정 파일은 준비하고, MCP 등록처럼 실행 파일이
필요한 명령만 건너뜁니다. 나중에 CLI를 설치한 뒤 같은 설치기를 다시 실행하면 됩니다.

OpenClaw과 Hermes Agent에는 플러그인 없이 스킬만 설치하는 별도 진입점이 있습니다.

```powershell
.\install-openclaw.bat
.\install-hermes.bat

# 통합 설치기에서 명시 선택하는 것도 동일
.\install.bat --llm openclaw,hermes
```

```bash
bash ./install-openclaw.sh
bash ./install-hermes.sh
```

각 호스트에는 공통 활성 스킬 18개와 공개 source-only 모듈 76개가 설치됩니다. 기존 네 CLI용
런타임 어댑터, 플러그인, 훅, Mnemo, MCP, 사용자 정의 에이전트는 포함하지 않습니다.

### 기존 설치 업데이트

일반 업데이트는 제거 없이 다시 설치합니다. 이름이 다른 외부·개인 스킬은 유지됩니다.

```powershell
git pull
.\install.bat
```

macOS/Linux에서는 `git pull && ./install.sh`을 실행합니다. `--uninstall` 후 재설치는 설치가
깨졌거나 Olympus가 관리하는 훅·MCP 등록까지 처음부터 다시 구성할 때만 사용합니다.

source-only는 삭제되거나 구버전으로 남은 스킬이 아니라, 현재 원본을 자동 탐색 레지스트리 밖의 카탈로그 경로에 보관하는 상태입니다. 공개 추적 스킬 소스 100개는 기본 allowlist 합집합 24개(사용자 진입점 18개 + 런타임 어댑터 6개)와 source-only 내부·선택 모듈 76개로 나뉩니다. 런타임 전용 어댑터를 제외한 카탈로그 가용량은 Codex와 Antigravity 각각 96개(활성 20 + source-only 76), Claude 97개(활성 21 + source-only 76), OpenClaw과 Hermes Agent 각각 94개(활성 18 + source-only 76)입니다. 이는 파일·카탈로그 가용량이지 모든 선택 의존성과 런타임 분기의 실행 인증 수가 아닙니다. Grok의 논리 정책은 96개지만 실제 설치 표면은 Claude 공유 디렉터리의 활성 21개를 읽습니다. 내부 전용 `deploymonitor`는 로컬에만 있고 공개 배포에서 제외됩니다. 활성 하네스는 필요한 내부 모듈을 카탈로그의 정확한 경로에서 직접 읽습니다. 사용자가 source-only 기능을 자연어로 요청해도 같은 방식으로 정확한 `SKILL.md`를 찾아 적용하며, 해당 이름의 slash 호출이 필요할 때만 `--include-source-only-skills`로 활성화합니다. Olympus 사용자 정의 에이전트는 기본 등록 0개이고 참고 소스 42개는 모두 source-only입니다. 일반 분업은 통합 CLI의 네이티브 서브에이전트를 사용하며, 에이전트를 활용하는 스킬은 읽기 전용 탐색자와 쓰기 작업자를 구분하고 공유 상태는 메인 컨텍스트가 소유합니다.

---

## 2. 이렇게 씁니다

설치 후 기본 활성 진입점이나 자연어 요청으로 사용합니다.

### 메인 파이프라인

프로젝트 규모에 따라 필요한 단계만 골라 쓰세요:

```
설계              구현                 검증               배포
────────         ─────────           ──────────        ─────────────────────
/zephermine  →   /agent-team    →   /minos →  "Docker 배포 환경 만들어줘"
                 (또는 workpm)                 (source-only 직접 로드)
```

| 단계 | 진입점/요청 | 하는 일 |
|------|--------|--------|
| **설계** | `/zephermine "온라인 서점 만들어줘"` | 인터뷰 → 리서치 → 도메인 분석 → 스펙 → QA 시나리오 → 섹션 분리 |
| **구현** | `/agent-team` | 섹션별 팀원 배정 → 병렬 코딩 → 검증 |
| **검증** | `/minos` | Playwright 테스트 자동 생성 → 실패 시 자동 수정 (max 5회) |
| **배포** | `Docker 배포 환경 만들어줘` | 카탈로그의 source-only `docker-deploy`를 직접 읽어 Dockerfile + docker-compose + 원클릭 설치 스크립트 생성 |

각 단계가 끝나면 **다음에 뭘 할지 안내**가 나옵니다.

### 규모별 사용법

| 규모 | 사용법 |
|------|--------|
| **전자동** (제우스) | `/zeus "설명"` — 파싱→설계→구현→감리→Docker→테스트→증거 보고 7단계 자동 |
| **대형** (신규 프로젝트) | `/zephermine` → `/agent-team` → `/minos` → `Docker 배포 환경 만들어줘` |
| **중형** (기능 추가) | `/zephermine` → 직접 코딩 → `/minos` |
| **소형** (버그 수정) | 직접 수정 → `/minos` |
| **QA만** | `/minos` |

> 상세: [워크플로우 가이드](workflow-guide.md)

---

## 3. 자주 쓰는 진입점

### 핵심 파이프라인

| 진입점 | 설명 |
|--------|------|
| `/zeus` | 전자동 7단계 — 파싱→젭마인→agent-team/workpm→아르고스→Docker→미노스→증거 보고. Hermes/Athena/Clio는 암묵 호출하지 않음 |
| `/zephermine` | 심층 인터뷰 → 설계 스펙 생성 |
| `/agent-team` | 4-CLI 네이티브 병렬 구현. 런타임별 팀/서브에이전트 프리미티브 사용 |
| `workpm` | 설계 없이 바로 구현하는 네이티브 PM 흐름. hard lock·외부 보드·혼합 CLI는 명시적 MCP 모드 사용 |
| `/minos` | QA 시나리오 → Playwright 테스트 → 자동 수정 루프 |

### 코드 품질

| 요청 | 설명 |
|------|------|
| `코드 리뷰해줘` | CLI 네이티브 리뷰를 우선 사용하고 필요하면 카탈로그의 source-only `code-reviewer` 정책 모듈을 직접 읽음 |
| `테스트 실행해줘` | 프로젝트에 설정된 테스트 명령 실행 |
| `TDD로 구현해줘` | 네이티브 Red-Green-Refactor 루프 사용. `test-driven-development` 참고서는 기본 source-only |

### 문서화

| 요청 | 설명 |
|------|------|
| `/clio` | 최종 점검 후 PRD·기술 문서·매뉴얼 생성 |
| `Mermaid 다이어그램 만들어줘` | 카탈로그의 source-only `mermaid-diagrams`를 직접 읽어 다이어그램 생성 |
| `API 인수인계 문서 작성해줘` | 네이티브 문서 작성. 필요하면 source-only `api-handoff`를 카탈로그에서 읽음 |

### 유틸리티

| 요청 | 설명 |
|------|------|
| `커밋해줘` | 네이티브 Git 흐름으로 변경사항 검토 후 커밋. `commit-work`는 기본 source-only |
| `이 파일 설명해줘: 경로` | 네이티브 코드 설명. 비유·다이어그램이 필요하면 `/explain` |
| `Docker 배포 환경 만들어줘` | 카탈로그의 source-only `docker-deploy`를 직접 읽어 배포 환경 생성 |

### 세션 관리

| 진입점 | 설명 |
|--------|------|
| `/mnemo` | 장기기억 관리 (대화 저장/검색) |
| `핸드오프 준비해줘` | 세션 요약과 MEMORY.md 업데이트. 컨텍스트 한계가 가까우면 자동 실행 |

---

## 4. 자동으로 작동하는 것들

설치만 하면 별도 명령어 없이 자동 적용됩니다:

| 기능 | 동작 |
|------|------|
| **대화 자동 저장** | 모든 대화가 `conversations/`에 저장됨 (Claude/Codex/Antigravity/Grok 통합) |
| **키워드 태깅** | 응답 끝에 `#tags:`가 자동 저장되어 나중에 검색 가능 |
| **과거 대화 검색** | "이전에 OAuth 구현한 적 있어?" → 자동으로 기록 검색 |

---

## 5. 실전 예시

### 예시 1: 새 프로젝트 시작

```
나: /zephermine "할일 관리 앱 만들어줘"
→ 인터뷰 10분 → 스펙 + QA 시나리오 + 5개 섹션 생성

나: /agent-team
→ 5개 섹션 파싱 → 팀원 배정 → 병렬 구현 → 빌드 검증

나: /minos
→ QA 시나리오 25개 → Playwright 테스트 → 전체 PASS
```

### 예시 2: 코드 리뷰 후 배포

```
나: 코드 리뷰해줘
→ 품질/보안/성능 리뷰 → PASS

나: Docker 배포 환경 만들어줘
→ Dockerfile + docker-compose + install.bat 생성

나: 커밋해줘
→ 변경사항 분석 → 커밋 메시지 생성 → 커밋
```

### 예시 3: 기존 코드 이해

```
나: 이 파일 설명해줘: src/auth/login.ts
→ 한 줄 요약 + 실생활 비유 + Mermaid 흐름도
```

---

## 6. 트러블슈팅

### 스킬이 인식 안됨

```bash
# 스킬 설치 확인
ls ~/.claude/skills/
# 비어있으면 install.bat/sh 재실행
```

기본 공개 설치에서는 source-only 76개가 활성 디렉터리에 보이지 않는 것이 정상입니다.
자연어로 기능을 요청하면 `SKILLS-CATALOG.md`의 현재 원본을 직접 읽습니다. 해당 이름의
slash 메뉴가 꼭 필요할 때만 다음처럼 전체 활성화합니다.

```powershell
.\install.bat --include-source-only-skills
```

### 기존 수정 스킬이 이동됨

Olympus와 이름이 같은 수정본은 삭제하지 않고 각 CLI 홈의
`_olympus-preserved/<timestamp>/`로 옮깁니다. 폐기된 구 Olympus 항목은
`_pruned-stale-olympus/<timestamp>/`에 보존합니다. 이름이 다른 외부 스킬은 유지됩니다.

복구하려면 보존본의 디렉터리명과 `SKILL.md` frontmatter `name`을 함께 고유하게 바꾼 뒤
해당 CLI의 `skills/`에 수동 복사하세요. 같은 이름으로 복사하면 다음 설치 때 다시 이동합니다.
`--uninstall`과 `--include-source-only-skills`는 보존본을 자동 복구하지 않습니다. 상세 절차는
[스킬 레지스트리 마이그레이션](skill-registry-migration.md)을 참고하세요.

### MCP 서버 연결 안됨

```powershell
# CLI에 등록된 MCP 확인
claude mcp list
codex mcp list

# Olympus Orchestrator 설치 사용법 확인
node skills/orchestrator/install.js --help
```

### 훅이 작동 안함

```bash
# Linux/Mac: 실행 권한
chmod +x hooks/*.sh

# Windows: PowerShell 정책
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

---

## 7. 더 알아보기

| 문서 | 내용 |
|------|------|
| [워크플로우 가이드](workflow-guide.md) | 설계→구현→QA 파이프라인 상세 |
| [QUICK-REFERENCE.md](../QUICK-REFERENCE.md) | 외부 리소스 포함 전체 참조표 |
| [AGENTS.md](../AGENTS.md) | 에이전트/스킬 전체 목록 |
| [SETUP.md](../SETUP.md) | 프로젝트별 상세 설치 가이드 |
| [references.md](references.md) | 참고한 프로젝트/리소스 전체 |

---

**최종 업데이트:** 2026-08-13
