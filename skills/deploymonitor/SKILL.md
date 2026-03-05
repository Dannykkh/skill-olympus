---
name: deploymonitor
description: Git push 후 DeployMonitor 자동 배포 워크플로우를 점검하고 실행합니다.
---

# DeployMonitor Skill

Git push 후 DeployMonitor가 자동 배포하는 워크플로우.

---

## Triggers

| Trigger | Example |
|---------|---------|
| 배포 | "/deploymonitor", "/deploy", "배포해줘", "push and deploy" |
| 리셋 배포 | "/deploy reset", "reset 배포" |
| 빌드 트리거 | "rebuild trigger 추가해줘" |

---

## Workflow

```
/deploymonitor (또는 /deploy)
    │
    ▼
┌─────────────────────────────────────────┐
│ 1. Check git status                     │
│    - Uncommitted changes?               │
│    - What files changed?                │
├─────────────────────────────────────────┤
│ 2. Analyze changes                      │
│    - DB schema changes? (migrations/)   │
│    - Code only changes?                 │
│    - Docker file changes?               │
│    - deploy.bat changes?                │
├─────────────────────────────────────────┤
│ 3. Trigger 매칭 확인                    │
│    - DeployMonitor와 deploy.bat 트리거  │
│      둘 다 확인                         │
│    - 매칭 안 되면 rebuild trigger 추가  │
├─────────────────────────────────────────┤
│ 4. Ask deploy mode (UPDATE/RESET)       │
│    - UPDATE: Keep DB, cache build       │
│    - RESET: Delete DB, full reinstall   │
├─────────────────────────────────────────┤
│ 5. Write .deploy-mode file (reset only) │
│    - UPDATE는 기본값이라 파일 불필요    │
├─────────────────────────────────────────┤
│ 6. Commit all changes                   │
│    - Descriptive commit message         │
│    - Co-Authored-By 포함                │
├─────────────────────────────────────────┤
│ 7. Push to remote                       │
│    - git push origin master             │
├─────────────────────────────────────────┤
│ 8. DeployMonitor 감지                   │
│    - refs/heads/master 파일 변경 감지   │
│    - deploy.bat 자동 실행               │
├─────────────────────────────────────────┤
│ 9. 배포 상태 모니터링                   │
│    - 대시보드에서 도커 컨테이너 상태 확인│
│    - "배포중" → "정상" 변경 시 완료     │
│    - 로그 확인 가능                     │
├─────────────────────────────────────────┤
│ 10. 배포 완료                           │
│    - Docker 이미지 재빌드 (cache 사용)  │
│    - 컨테이너 재시작                    │
│    - DB 유지 (named volume)             │
└─────────────────────────────────────────┘
```

---

## Deploy Modes

| Mode | 방법 | Action |
|------|------|--------|
| **Update** (기본) | 그냥 push | DB 유지, Docker cache 빌드 (~30s-2min) |
| **Reset** | `.deploy-mode` 파일에 "reset" 작성 후 push | DB 삭제, 전체 재설치 (~3-5min) |

---

## ⚠️ CRITICAL: 2단계 트리거 시스템

**DeployMonitor와 deploy.bat는 각각 독립적인 트리거 목록을 가진다.**

```
커밋 push → DeployMonitor 트리거 체크 (1단계)
                 │
         매칭 O? ├─ YES → deploy.bat 실행 → deploy.bat 트리거 체크 (2단계)
                 └─ NO  → 스킵 (deploy.bat 실행 안 됨!)
```

### DeployMonitor 트리거 (1단계 — WPF 앱 내부)

DeployMonitor는 **자체 트리거 목록**으로 먼저 필터링한다.
이 목록은 deploy.bat의 DEPLOY_TRIGGERS와 **별개**이며, DeployMonitor 앱 재시작 시 deploy.bat에서 읽어온다.

**주의: deploy.bat에 새 트리거를 추가해도, DeployMonitor가 재시작되기 전까지는 이전 트리거 목록을 사용할 수 있다.**

### deploy.bat 트리거 (2단계 — 배치 스크립트 내부)

```batch
set "DEPLOY_TRIGGERS=app.js config/ middleware/ models/ routes/ services/ jobs/ views/ public/ migrations/ scripts/ seeds/ package.json package-lock.json deploy.bat Dockerfile docker-compose.yml docker-entrypoint.sh"
```

### 트리거 불일치 해결: rebuild trigger 패턴

**Docker 인프라 파일(.dockerignore, .gitattributes 등)이나 DeployMonitor 트리거에 없는 파일만 변경할 경우, 반드시 deploy.bat에 rebuild trigger를 추가하여 배포를 강제한다.**

```batch
REM deploy.bat 맨 끝에 추가
REM rebuild trigger YYYYMMDD-NN - description
```

### 언제 rebuild trigger가 필요한가?

| 변경 파일 | 트리거 매칭 | rebuild trigger 필요? |
|-----------|------------|----------------------|
| `app.js`, `routes/*.js` 등 | O | X |
| `deploy.bat` | O | X |
| `Dockerfile` | △ (deploy.bat에는 있지만 DeployMonitor에 없을 수 있음) | **O** |
| `docker-compose.yml` | △ | **O** |
| `.dockerignore` | X | **O (필수)** |
| `.gitattributes` | X | **O (필수)** |
| `docker-entrypoint.sh` | △ | **O** |
| `.env.docker` | X | **O (필수)** |

**규칙: 코드/설정 파일이 아닌 인프라 파일만 변경할 때는 항상 deploy.bat에 rebuild trigger를 함께 커밋한다.**

---

## Instructions

### Step 1: Check Git Status

```bash
git status
git diff --stat
```

Show user what will be deployed.

### Step 2: Analyze Changes + Trigger Check

Check for:
- `migrations/*.sql` - New migrations = suggest UPDATE
- `docs/database-schema.sql` changes - Major DB changes = warn about RESET
- `Dockerfile`, `docker-compose.yml`, `.dockerignore`, `docker-entrypoint.sh` changes - Docker infra
- Code only changes - suggest UPDATE
- First deploy - suggest RESET
- **DEPLOY_TRIGGERS 경로 외 변경만 있으면** - 배포 불필요 안내

**트리거 매칭 확인:**
1. deploy.bat에서 DEPLOY_TRIGGERS 목록을 읽는다
2. 변경된 파일이 트리거에 매칭되는지 확인
3. **매칭 안 되는 파일만 있으면** → deploy.bat에 rebuild trigger 추가 필요
4. deploy.bat 자체가 변경에 포함되면 트리거 매칭 보장

### Step 3: Ask Deploy Mode

Use AskUserQuestion:

```
Which deploy mode?

[UPDATE (Recommended)]
- Keep existing database
- Use Docker cache (fast)
- Apply new migrations only

[RESET]
- Delete all data
- Full reinstall
- Use for major DB schema changes
```

If RESET selected, confirm:
```
WARNING: All database data will be deleted!
Are you sure? (yes/no)
```

### Step 4: Write .deploy-mode (Reset only)

RESET 모드일 때만 파일 생성:

```bash
echo "reset" > .deploy-mode
```

**UPDATE는 기본값이므로 파일 생성 불필요.**

### Step 5: Commit Changes

**트리거 매칭 안 되는 파일만 변경된 경우, deploy.bat에 rebuild trigger를 추가한 후 함께 커밋한다.**

```bash
git add [files]
git commit -m "deploy: [description]

Mode: UPDATE|RESET
Changes:
- [list of changes]

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

### Step 6: Push

```bash
git push origin master
```

Report success:
```
Pushed to origin/master
DeployMonitor will auto-deploy
Mode: UPDATE (DB preserved)

배포 상태 확인: http://211.224.63.241:5001/
"배포중" → "정상" 변경 시 배포 완료
```

---

## 배포 모니터링 대시보드

### 접속 정보

| 항목 | 값 |
|------|-----|
| URL | http://211.224.63.241:5001/ |
| 아이디 | admin |
| 비밀번호 | admin1234 |

### 배포 상태 확인

대시보드에서 도커 컨테이너의 상태와 로그를 확인할 수 있다.

| 상태 | 의미 |
|------|------|
| **배포중** | Docker 빌드/재시작 진행 중 |
| **정상** | 배포 완료, 컨테이너 정상 작동 |

### 배포 후 확인 절차

1. `git push` 후 대시보드 접속
2. 해당 도커 컨테이너의 상태 확인
3. "배포중" → "정상"으로 변경되면 배포 완료
4. 문제 발생 시 대시보드에서 로그 확인

---

## Docker 배포 구조

### 파일 구성

| 파일 | 역할 |
|------|------|
| `Dockerfile` | Node.js 앱 이미지 빌드 (Alpine + bcrypt 빌드 의존성) |
| `docker-compose.yml` | MySQL 8.0 (db) + Node.js API (api) 서비스 정의 |
| `docker-entrypoint.sh` | MySQL 연결 대기 → 마이그레이션 → 앱 시작 |
| `.dockerignore` | Docker 빌드에서 제외할 파일 |
| `.env.docker` | 배포 서버용 환경변수 템플릿 |
| `deploy.bat` | 자동 배포 스크립트 (Docker Compose 기반) |

### deploy.bat 흐름 (Docker Edition)

```
0. git pull + self-reload
1. .env 없으면 .env.docker에서 자동 복사
2. Docker 실행 가능 여부 확인
3. 변경 파일 분석 (DEPLOY_TRIGGERS 매칭)
4. deploy mode 확인 (update/reset)
5. docker compose down [-v]
6. docker compose build api
7. docker compose up -d db (healthcheck 대기)
8. docker compose up -d api (entrypoint: migrate → start)
9. docker compose ps 상태 확인
```

### docker-entrypoint.sh 흐름

```
1. MySQL 연결 대기 (최대 30회 재시도)
2. node scripts/migrate.js 실행
   - tickets 테이블 없으면 → docs/database-schema.sql 기본 스키마 자동 적용
   - 이후 migrations/*.sql 순차 실행
3. node app.js 시작
```

### .dockerignore 주의사항

- `docs/` 는 제외되지만 `docs/database-schema.sql`은 반드시 포함 (`!docs/database-schema.sql`)
- `.env` 파일은 제외 (docker-compose.yml의 env_file로 주입)
- `*.sh` 파일은 `.gitattributes`에서 LF 줄바꿈 강제 (Windows CRLF → Linux LF)

---

## .gitignore 필수 항목

`.deploy-mode` 파일은 반드시 `.gitignore`에 추가:

```gitignore
# Deploy mode file (temporary, for reset deploy)
.deploy-mode
```

**이유**: git에 커밋되면 매번 `git pull` 시 복원되어 의도치 않은 reset 배포 발생

---

## .gitattributes 필수 항목

```gitattributes
# Force LF line endings for shell scripts (Linux containers)
*.sh text eol=lf
docker-entrypoint.sh text eol=lf
```

**이유**: Windows CRLF 줄바꿈이 Alpine Linux 컨테이너에서 `exec: no such file or directory` 에러 유발

---

## DeployMonitor 동작 원리

```
┌─────────────────────────────────────────┐
│ Git Server (Bare Repo)                  │
│   refs/heads/master 파일                │
└─────────────────┬───────────────────────┘
                  │ FileSystemWatcher
                  ▼
┌─────────────────────────────────────────┐
│ DeployMonitor (WPF App)                 │
│   - 해시 변경 감지                       │
│   - git pull 실행                       │
│   - DEPLOY_TRIGGERS 매칭 확인 (1단계)   │
│   - 매칭 시 deploy.bat 자동 실행        │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│ deploy.bat (Docker Edition)             │
│   0. git pull → 자기 자신 재실행        │
│   1. .env 자동 생성 (.env.docker 복사)  │
│   2. DEPLOY_TRIGGERS 매칭 확인 (2단계)  │
│   3. docker compose down [-v]           │
│   4. docker compose build               │
│   5. DB만 먼저 시작 + healthcheck 대기  │
│   6. API 시작 (entrypoint: migrate+run) │
│   7. docker compose ps 상태 확인        │
└─────────────────────────────────────────┘
```

---

## deploy.bat Self-Reload 패턴

### 문제
Windows 배치 파일은 실행 시작 시점에 전체 로드됨.
`git pull`로 deploy.bat 파일이 업데이트되어도, 메모리에 로드된 **구버전**이 계속 실행됨.

### 해결: Self-Reload
```batch
@echo off
if /I "%~1"=="--reloaded" goto MAIN_START

git pull --ff-only
call "%~f0" --reloaded
exit /b %errorlevel%

:MAIN_START
REM Actual deploy logic starts here (latest version guaranteed)
```

---

## 빌드 강제 트리거

코드 변경 없이 재빌드가 필요하거나, DeployMonitor 트리거에 매칭 안 되는 파일만 변경할 때:

```batch
REM deploy.bat 맨 끝에 트리거 수정
REM rebuild trigger YYYYMMDD-NN - description
```

**번호 규칙:** `YYYYMMDD-NN` (같은 날 여러 번이면 NN 증가)

---

## Examples

### Example 1: Code change
```
User: /deploy
Assistant:
  Changed files:
  - routes/tickets.js (modified)
  - views/tickets/detail.ejs (modified)

  트리거 매칭: O (routes/, views/)
  Recommended: UPDATE (code only)

  [User confirms]
  [Commit & Push]

  Pushed to origin/master
  DeployMonitor will auto-deploy
```

### Example 2: Docker infra change only
```
User: /deploy
Assistant:
  Changed files:
  - .dockerignore (modified)

  트리거 매칭: X (.dockerignore는 트리거 목록에 없음)
  → deploy.bat에 rebuild trigger 추가 필요

  [deploy.bat 끝에 rebuild trigger 추가]
  [.dockerignore + deploy.bat 함께 커밋]
  [Push]

  Pushed to origin/master
  DeployMonitor will auto-deploy (deploy.bat 변경으로 트리거 매칭)
```

### Example 3: DB migration added
```
User: 배포해줘
Assistant:
  Changed files:
  - migrations/020_add_column.sql (new)
  - models/Ticket.js (modified)

  트리거 매칭: O (migrations/, models/)
  Recommended: UPDATE (migration will be applied)

  [Commit & Push]

  Deploy started
  New migration will be applied automatically
```

### Example 4: DB reset required
```
User: /deploy reset
Assistant:
  ⚠️ RESET mode: All DB data will be deleted!
  Are you sure?

  [User confirms]
  [Create .deploy-mode = reset]
  [Commit & Push]

  Reset deploy started
  Full DB reset and reinstall
```

---

## 문제 해결

| 증상 | 원인 | 해결 |
|------|------|------|
| 배포 안 됨 | DeployMonitor 미실행 | DeployMonitor 앱 확인 |
| `[SKIP] 배포 대상 변경 없음` | 변경 파일이 트리거 목록에 없음 | deploy.bat에 rebuild trigger 추가 후 재푸시 |
| 빌드 실패 | Dockerfile 오류 | docker logs 확인 |
| DB 연결 실패 (.env 없음) | 배포 서버에 .env 없음 | deploy.bat가 .env.docker에서 자동 복사 |
| DB healthcheck 실패 | .env의 DB_PASSWORD 누락 | .env.docker 확인 |
| API 500 에러 | 코드 오류 | docker logs pfms-api 확인 |
| `exec: no such file or directory` | Windows CRLF 줄바꿈 | Dockerfile에서 `sed -i 's/\r$//'` + .gitattributes |
| `Table 'pfms.tickets' doesn't exist` | 기본 스키마 미적용 | .dockerignore에서 `!docs/database-schema.sql` 확인 |
| 이전 코드 실행 | Docker cache | deploy.bat의 rebuild trigger 변경 |
| deploy.bat 변경 미적용 | 구버전 메모리 실행 | self-reload 패턴 |
| .deploy-mode 계속 복원 | git에 커밋됨 | .gitignore에 추가 |

---

## Anti-Patterns

| Avoid | Why | Instead |
|-------|-----|---------|
| Docker 파일만 변경 후 push | DeployMonitor 트리거 불일치로 스킵 | rebuild trigger 함께 커밋 |
| 매번 모드 물어보기 | 대부분 UPDATE | Update가 기본, reset만 확인 |
| .deploy-mode git 커밋 | pull마다 복원됨 | .gitignore에 추가 필수 |
| .sh 파일 Windows CRLF | 컨테이너에서 실행 불가 | .gitattributes에 `eol=lf` |
| .dockerignore에서 docs/ 전체 제외 | base schema 누락 | `!docs/database-schema.sql` 예외 추가 |
| Push without asking mode | User should decide | Always ask |
| Default to RESET | Data loss risk | Default to UPDATE |

---

## Checklist

- [ ] Git status 확인
- [ ] 변경사항 분석
- [ ] **트리거 매칭 확인 (매칭 안 되면 rebuild trigger 추가)**
- [ ] Deploy mode 선택 (사용자)
- [ ] .deploy-mode 파일 생성 (reset 시)
- [ ] 변경사항 커밋
- [ ] git push origin master
- [ ] 대시보드에서 배포 상태 확인 ("배포중" → "정상")
- [ ] 문제 시 대시보드 로그 확인
