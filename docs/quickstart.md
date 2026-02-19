# 빠른 시작 가이드

Claude Code 커스터마이징을 설치하고 사용하는 방법입니다.

---

## 1. 설치

### Windows

```powershell
git clone https://github.com/Dannykkh/claude-code-agent-customizations.git
cd claude-code-agent-customizations
.\install.bat
```

### Linux/Mac

```bash
git clone https://github.com/Dannykkh/claude-code-agent-customizations.git
cd claude-code-agent-customizations
chmod +x install.sh && ./install.sh
```

설치하면 **68개 스킬**, **35개 에이전트**, **훅**, **장기기억 시스템**이 활성화됩니다.

---

## 2. 이렇게 씁니다

설치 후 Claude Code에서 슬래시 명령어로 사용합니다.

### 메인 파이프라인

프로젝트 규모에 따라 필요한 단계만 골라 쓰세요:

```
설계              구현                 검증               배포
────────         ─────────           ──────────        ──────────
/zephermine  →   /agent-team    →   /qa-until-pass →  /docker-deploy
                 (또는 workpm)
```

| 단계 | 명령어 | 하는 일 |
|------|--------|--------|
| **설계** | `/zephermine "온라인 서점 만들어줘"` | 인터뷰 → 리서치 → 도메인 분석 → 스펙 → QA 시나리오 → 섹션 분리 |
| **구현** | `/agent-team` | 섹션별 팀원 배정 → 병렬 코딩 → 검증 |
| **검증** | `/qa-until-pass` | Playwright 테스트 자동 생성 → 실패 시 자동 수정 (max 5회) |
| **배포** | `/docker-deploy` | Dockerfile + docker-compose + 원클릭 설치 스크립트 |

각 단계가 끝나면 **다음에 뭘 할지 안내**가 나옵니다.

### 규모별 사용법

| 규모 | 사용법 |
|------|--------|
| **대형** (신규 프로젝트) | `/zephermine` → `/agent-team` → `/qa-until-pass` → `/docker-deploy` |
| **중형** (기능 추가) | `/zephermine` → 직접 코딩 → `/qa-until-pass` |
| **소형** (버그 수정) | 직접 수정 → `/qa-until-pass` |
| **QA만** | `/qa-until-pass` |

> 상세: [워크플로우 가이드](workflow-guide.md)

---

## 3. 자주 쓰는 명령어

### 핵심 파이프라인

| 명령어 | 설명 |
|--------|------|
| `/zephermine` | 심층 인터뷰 → 설계 스펙 생성 |
| `/agent-team` | Agent Teams 병렬 구현 (Claude 네이티브) |
| `workpm` | Multi-AI 병렬 구현 (Claude + Codex + Gemini) |
| `/qa-until-pass` | QA 시나리오 → Playwright 테스트 → 자동 수정 루프 |

### 코드 품질

| 명령어 | 설명 |
|--------|------|
| `/review` | 코드 리뷰 (품질/보안/성능) |
| `/test` | 테스트 실행 |
| `/tdd` | TDD 워크플로우 (Red-Green-Refactor) |

### 문서화

| 명령어 | 설명 |
|--------|------|
| `/write-prd` | PRD (요구사항 정의서) 작성 |
| `/write-api-docs` | API 문서 자동 생성 |
| `/diagram` | Mermaid 다이어그램 생성 |

### 유틸리티

| 명령어 | 설명 |
|--------|------|
| `/commit` | Git 커밋 (변경사항 분석 → 메시지 생성) |
| `/explain @파일` | 코드를 비유로 설명 + Mermaid 다이어그램 |
| `/docker-deploy` | Docker 배포 환경 자동 생성 |
| `/smart-setup` | 기술 스택 감지 → 필요한 리소스 추천 |

### 세션 관리

| 명령어 | 설명 |
|--------|------|
| `/wrap-up` | 세션 요약 + MEMORY.md 업데이트 |
| `/mnemo` | 장기기억 관리 (대화 저장/검색) |

---

## 4. 자동으로 작동하는 것들

설치만 하면 별도 명령어 없이 자동 적용됩니다:

| 기능 | 동작 |
|------|------|
| **대화 자동 저장** | 모든 대화가 `conversations/`에 저장됨 (Claude/Codex/Gemini 통합) |
| **코딩 규칙** | fullstack-coding-standards, naming-conventions 등 패시브 에이전트 |
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

나: /qa-until-pass
→ QA 시나리오 25개 → Playwright 테스트 → 전체 PASS
```

### 예시 2: 코드 리뷰 후 배포

```
나: /review
→ 품질/보안/성능 리뷰 → PASS

나: /docker-deploy
→ Dockerfile + docker-compose + install.bat 생성

나: /commit
→ 변경사항 분석 → 커밋 메시지 생성 → 커밋
```

### 예시 3: 기존 코드 이해

```
나: /explain @src/auth/login.ts
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

### MCP 서버 연결 안됨

```powershell
# MCP 설치 확인
node skills/orchestrator/install-mcp.js --list
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

**최종 업데이트:** 2026-02-09
