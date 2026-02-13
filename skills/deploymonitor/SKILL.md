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
│    - deploy.bat changes?                │
├─────────────────────────────────────────┤
│ 3. Ask deploy mode (UPDATE/RESET)       │
│    - UPDATE: Keep DB, cache build       │
│    - RESET: Delete DB, full reinstall   │
├─────────────────────────────────────────┤
│ 4. Write .deploy-mode file (reset only) │
│    - UPDATE는 기본값이라 파일 불필요    │
├─────────────────────────────────────────┤
│ 5. Commit all changes                   │
│    - Descriptive commit message         │
│    - Co-Authored-By 포함                │
├─────────────────────────────────────────┤
│ 6. Push to remote                       │
│    - git push origin master             │
├─────────────────────────────────────────┤
│ 7. DeployMonitor 감지                   │
│    - refs/heads/master 파일 변경 감지   │
│    - deploy.bat auto 자동 실행          │
├─────────────────────────────────────────┤
│ 8. 배포 완료                            │
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

## Instructions

### Step 1: Check Git Status

```bash
git status
git diff --stat
```

Show user what will be deployed.

### Step 2: Analyze Changes

Check for:
- `database/migrations/*.sql` - New migrations = suggest UPDATE
- `database/schema.sql` changes - Major DB changes = warn about RESET
- `backend/` or `frontend/` only - Code changes = suggest UPDATE
- First deploy - suggest RESET

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

```bash
git add [files]
git commit -m "deploy: [description]

Mode: UPDATE|RESET
Changes:
- [list of changes]

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

### Step 6: Push

```bash
git push origin master
```

Report success:
```
✅ Pushed to origin/master
📡 DeployMonitor가 자동 배포합니다
🔧 Mode: UPDATE (DB preserved)
```

---

## .gitignore 필수 항목

`.deploy-mode` 파일은 반드시 `.gitignore`에 추가:

```gitignore
# Deploy mode file (temporary, for reset deploy)
.deploy-mode
```

**이유**: git에 커밋되면 매번 `git pull` 시 복원되어 의도치 않은 reset 배포 발생

---

## DeployMonitor 동작 원리

```
┌─────────────────────────────────────────┐
│ Bonobo Git Server (Bare Repo)           │
│   refs/heads/master 파일                │
└─────────────────┬───────────────────────┘
                  │ FileSystemWatcher
                  ▼
┌─────────────────────────────────────────┐
│ DeployMonitor (WPF App)                 │
│   - 해시 변경 감지                       │
│   - deploy.bat auto 자동 실행           │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│ deploy.bat (v3.0 Self-Reload)           │
│   0. git pull → 자기 자신 재실행        │
│   1. .deploy-mode 확인 (있으면 reset)   │
│   2. docker compose down [-v] (reset시) │
│   3. DB만 먼저 시작 (up -d db)          │
│   4. DB 덤프/seed 복원 (API 시작 전!)   │
│   5. API 시작 (up -d api [frontend])    │
│   6. 헬스체크                           │
└─────────────────────────────────────────┘
```

### 핵심: DB 시작 순서

**JPA/ORM이 빈 DB에 테이블을 먼저 생성하면 덤프 복원 시 "already exists" 충돌 발생.**
반드시 DB → 덤프 복원 → API 순서를 지켜야 합니다.

```
❌ 잘못된 순서:
docker compose up -d          ← DB + API 동시 시작
  → JPA ddl-auto: update → 빈 테이블 생성
  → 덤프 적용 → "relation already exists" 충돌!

✅ 올바른 순서:
docker compose up -d db       ← DB만 먼저
pg_isready / mysqladmin ping  ← DB ready 대기
psql < dump.sql               ← 깨끗한 DB에 덤프 복원
docker compose up -d api      ← API 나중에 시작 (JPA는 기존 테이블 skip)
```

---

## deploy.bat Self-Reload 패턴 (v3.0)

### 문제
Windows 배치 파일은 실행 시작 시점에 전체 로드됨.
`git pull`로 deploy.bat 파일이 업데이트되어도, 메모리에 로드된 **구버전**이 계속 실행됨.

### 해결: Self-Reload
```batch
@echo off
REM deploy.bat v3.0 - self-reload after git pull

if "%~2"=="--reloaded" goto MAIN_START

REM 첫 실행: git pull 후 새 deploy.bat으로 재실행
git pull
call "%~f0" %1 --reloaded
exit /b %errorlevel%

:MAIN_START
REM 여기서부터 실제 배포 로직 (최신 버전 보장)
```

### 동작 흐름
```
1. DeployMonitor → deploy.bat auto (구버전 메모리 로드)
2. git pull → deploy.bat 파일 업데이트
3. call "%~f0" %1 --reloaded → 새 deploy.bat 실행
4. --reloaded 플래그로 git pull 스킵 → 실제 로직 실행
```

---

## DB 초기화 판단 로직

### Reset 모드 (DB 볼륨 삭제 후 재설치)

**순서가 핵심: DB만 먼저 → 덤프 복원 → API 시작**

```batch
REM 1. 기존 서비스 + 볼륨 완전 삭제
docker compose down -v

REM 2. DB만 먼저 시작 (API가 빈 DB에 테이블 만드는 것 방지)
docker compose up -d db

REM 3. DB ready 대기
:WAIT_DB
docker exec %PROJECT_NAME%-db pg_isready -U %DB_USER% >nul 2>&1
if not errorlevel 1 goto DB_READY
timeout /t 2 /nobreak >nul
goto WAIT_DB

:DB_READY
REM 4. 덤프 복원 (우선순위: dump > seed-data)
if exist "dump.sql" (
    docker exec -i %PROJECT_NAME%-db psql -U %DB_USER% -d %DB_NAME% < dump.sql
) else if exist "seed-data.sql" (
    docker exec -i %PROJECT_NAME%-db psql -U %DB_USER% -d %DB_NAME% < seed-data.sql
)

REM 5. API 시작 (JPA는 이미 있는 테이블을 skip)
docker compose up -d api frontend
```

### Update 모드에서 DB 상태 확인

Update 모드에서는 DB가 유지되므로 API와 동시 시작 가능:
```batch
REM DB 있으면 API만 재시작
docker compose stop api frontend
docker compose rm -f api frontend
docker compose up -d api frontend
```

마이그레이션이 필요한 경우:
```batch
REM users 테이블 데이터 개수로 판단
for /f "usebackq" %%c in (`docker exec db mysql --silent --skip-column-names -u root -pPASS DB -e "SELECT COUNT(*) FROM users"`) do set "USER_COUNT=%%c"

if "!USER_COUNT!"=="" goto DB_INIT          REM 쿼리 실패 → 초기화
if "!USER_COUNT!"=="0" goto DB_SEED_ONLY    REM 스키마만 있음 → seed
REM USER_COUNT > 0 → 마이그레이션만
```

### 분기 흐름
| 모드 | 조건 | 동작 |
|------|------|------|
| **Reset** | 항상 | down -v → DB만 시작 → 덤프 복원 → API 시작 |
| **Update** | users 쿼리 실패 | DB_INIT: schema.sql + seed-data.sql |
| **Update** | users = 0 | DB_SEED_ONLY: seed-data.sql만 |
| **Update** | users > 0 | DB_MIGRATE: migrations/*.sql만 |

---

## 빌드 강제 트리거

코드 변경 없이 재빌드가 필요할 때 deploy.bat 끝에 트리거 수정:

```batch
REM rebuild trigger 1234567890 - description
```

---

## Examples

### Example 1: 프론트엔드 코드 변경
```
User: /deploy
Assistant:
  변경 파일:
  - frontend/src/pages/WeeklyReport.tsx (modified)

  Recommended: UPDATE (code only)

  [사용자 확인]
  [커밋 & 푸시]

  ✅ Pushed to origin/master
  📡 DeployMonitor가 자동 배포합니다
```

### Example 2: DB 마이그레이션 추가
```
User: 배포해줘
Assistant:
  변경 파일:
  - database/migrations/004_add_column.sql (new)
  - backend/app/models/user.py (modified)

  Recommended: UPDATE (migration will be applied)

  [커밋 & 푸시]

  ✅ 배포 시작
  📋 새 마이그레이션이 자동 적용됩니다
```

### Example 3: DB 리셋 필요
```
User: /deploy reset
Assistant:
  ⚠️ RESET 모드: 모든 DB 데이터가 삭제됩니다!
  정말 진행하시겠습니까?

  [확인 받고]
  [.deploy-mode = reset 파일 생성]
  [커밋 & 푸시]

  ✅ Reset 배포 시작
  🔄 DB 전체 초기화 후 재설치
```

---

## 배포 결과 확인

### 서비스 상태
```bash
docker compose -f docker-compose.server.yml ps
```

### 로그 확인
```bash
docker logs bizmanagement-api -f
docker logs bizmanagement-frontend -f
```

### 헬스체크
```bash
curl http://localhost:9201/health
```

---

## 문제 해결

| 증상 | 원인 | 해결 |
|------|------|------|
| 배포 안 됨 | DeployMonitor 미실행 | DeployMonitor 앱 확인 |
| 빌드 실패 | Dockerfile 오류 | docker logs 확인 |
| DB 연결 실패 | 컨테이너 순서 | docker compose restart |
| API 500 에러 | 코드 오류 | docker logs api 확인 |
| 이전 코드 실행 | Docker cache | deploy.bat의 rebuild trigger 변경 |
| deploy.bat 변경 미적용 | 구버전 메모리 실행 | v3.0 self-reload 패턴 적용 |
| DB 매번 초기화됨 | users 체크 로직 누락 | USER_COUNT 판단 로직 추가 |
| .deploy-mode 계속 복원 | git에 커밋됨 | .gitignore에 추가 |
| **덤프 복원 시 "already exists"** | **JPA가 빈 DB에 테이블 먼저 생성** | **DB만 먼저 시작 → 덤프 → API 시작** |

---

## Anti-Patterns

| Avoid | Why | Instead |
|-------|-----|---------|
| 매번 모드 물어보기 | 대부분 UPDATE | Update가 기본, reset만 확인 |
| 불필요한 .deploy-mode | 기본이 update | reset 때만 생성 |
| push 전 확인 물어보기 | 자동화 지연 | 바로 push |
| .deploy-mode git 커밋 | pull마다 복원됨 | .gitignore에 추가 필수 |
| deploy.bat에서 git pull만 | 구버전 계속 실행 | self-reload 패턴 적용 |
| TABLE_COUNT로 DB 판단 | 빈 테이블도 운영DB로 오판 | USER_COUNT로 판단 |
| Push without asking mode | User should decide | Always ask |
| Default to RESET | Data loss risk | Default to UPDATE |
| Reset에서 DB+API 동시 시작 | JPA가 빈 테이블 생성→덤프 충돌 | DB만 먼저→덤프→API 시작 |

---

## Checklist

- [ ] Git status 확인
- [ ] 변경사항 분석
- [ ] Deploy mode 선택 (사용자)
- [ ] .deploy-mode 파일 생성 (reset 시)
- [ ] 변경사항 커밋
- [ ] git push 완료
- [ ] DeployMonitor 트레이 아이콘 확인
- [ ] 배포 완료 풍선 알림 확인
- [ ] 웹 접속 테스트
