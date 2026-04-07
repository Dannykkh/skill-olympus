# Server Setup — minos 서버 준비 상세

## 서버 환경 감지 (Step 3-1)

```
판단 순서:
1. docker-compose.yml (또는 docker-compose.yaml, compose.yml) 존재?
   → Docker 모드 (DB, 백엔드, 프론트 통합 실행)
2. package.json의 "dev" 또는 "start" 스크립트 존재?
   → Dev Server 모드
3. manage.py 존재? (Django)
   → python manage.py runserver
4. 전부 없음 → 사용자에게 안내
```

## 포트 정리 (Step 3-2)

**타겟 포트를 확인하고, 점유 중이면 해당 프로세스를 종료합니다.**
새 포트로 열리면 baseURL이 꼬이므로 반드시 지정 포트로 실행해야 합니다.

```
타겟 포트 결정:
1. playwright.config.ts의 baseURL에서 포트 추출
2. .env 또는 .env.test의 PORT 값
3. docker-compose.yml의 ports 매핑
4. 기본값: 3000 (프론트), 8080 (백엔드)
```

**포트 점유 프로세스 종료 (Bash):**
- **Windows**: `powershell -Command "Get-NetTCPConnection -LocalPort {PORT} -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }"`
- **Linux/Mac**: `lsof -ti:{PORT} | xargs kill -9 2>/dev/null`

## 서버 실행 (Step 3-3)

### Docker 모드 (우선)

```bash
# 기존 컨테이너 정리 + 빌드 + 실행
docker compose down --remove-orphans 2>/dev/null
docker compose up -d --build

# 헬스체크 대기 (최대 120초)
# docker-compose.yml에 healthcheck가 있으면 그것을 사용
# 없으면 baseURL에 HTTP 요청으로 확인
```

장점:
- DB (PostgreSQL, MySQL 등)가 함께 올라옴
- Redis, 큐 등 인프라 의존성 해결
- 프로덕션과 동일한 환경에서 테스트

### Dev Server 모드 (fallback)

```bash
# 백그라운드로 dev 서버 실행
npm run dev &    # 또는 yarn dev, pnpm dev
DEV_SERVER_PID=$!

# 헬스체크 대기 (최대 60초, 2초 간격)
for i in $(seq 1 30); do
  curl -s -o /dev/null -w "%{http_code}" http://localhost:{PORT} | grep -q "200\|301\|302" && break
  sleep 2
done
```

## 헬스체크 (Step 3-4)

```
baseURL에 HTTP GET 요청:
├── 200/301/302 → ✅ 서버 준비 완료
├── 타임아웃 (120초 초과) → ❌ 실패 보고 후 테스트 중단
└── 연결 거부 → 재시도 (2초 간격)
```

헬스체크 통과 시 표시:
```
🚀 서버 준비 완료
  모드: {Docker / Dev Server}
  URL: http://localhost:{PORT}
  DB: {PostgreSQL 15 / MySQL 8 / 없음}
```

## 사전 조건 + CPU 감지 (Step 4 보조)

**CPU 코어 감지 (Bash):**
- **Windows**: `powershell -Command "(Get-CimInstance Win32_Processor).NumberOfLogicalProcessors"`
- **Linux**: `nproc`
- **Mac**: `sysctl -n hw.logicalcpu`

감지 결과를 기반으로 표시:

```
🖥️ 머신 상태:
  CPU: {감지된 코어}코어 (논리 프로세서)
  Workers (50%): {코어/2}개 동시 실행
  예상 RAM: ~{코어/2 * 200}MB (Worker당 ~200MB)
```

## 서버 정리 (Step 6 후처리)

테스트 완료 후 Step 3에서 실행한 서버를 정리합니다:

```
Docker 모드:
  → docker compose down (컨테이너 중지 + 제거)
  → 볼륨은 유지 (다음 테스트에서 재사용)

Dev Server 모드:
  → $DEV_SERVER_PID 프로세스 종료
  → kill $DEV_SERVER_PID 2>/dev/null
```
