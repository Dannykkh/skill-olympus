# Docker Setup — Phase 4 상세 절차

Zeus Phase 4에서 Docker 환경 구성 및 컨테이너 실행 절차.

---

## 실행 흐름

```
1. Docker 설치 확인
   ├── docker --version 성공 → 계속
   └── 실패 → Phase 4 건너뜀 (Phase 5에서 dev server fallback)

2. docker-compose.yml 존재 확인
   ├── 있음 → Step 3 건너뛰고 Step 4로
   └── 없음 → docker-deploy 스킬 실행

3. docker-deploy 스킬 실행 (파일 생성)
   - Phase 0 파싱 결과의 techStack 참조
   - Dockerfile + docker-compose.yml 생성
   - DB 컨테이너 포함 (PostgreSQL, MySQL 등)
   - 포트 매핑: playwright.config.ts baseURL과 일치하도록 설정

4. 포트 충돌 해결
   - docker-compose.yml에서 외부 포트 추출 (ports: "HOST:CONTAINER")
   - 각 외부 포트에 대해 점유 프로세스 확인 + 종료
   - Windows: Get-NetTCPConnection → Stop-Process
   - Linux/Mac: lsof -ti:{PORT} | xargs kill -9

5. 컨테이너 실행
   - docker compose down --remove-orphans 2>/dev/null
   - docker compose up -d --build
   - 헬스체크 대기 (최대 120초, 2초 간격)
   - 실패 시 docker compose logs로 원인 확인

6. 실행 확인
   ├── 헬스체크 통과 → Phase 3로 진행 (서버 이미 실행 중)
   └── 실패 → 포트 재확인 → 1회 재시도 → 그래도 실패 시 로그 기록
```

## 포트 충돌 해결 스크립트

```bash
# docker-compose.yml에서 외부 포트 추출
# 예: ports: ["3000:3000", "5432:5432"] → 3000, 5432

# Windows
powershell -Command "
  @(3000, 5432, 8080) | ForEach-Object {
    \$port = \$_
    Get-NetTCPConnection -LocalPort \$port -ErrorAction SilentlyContinue |
      ForEach-Object { Stop-Process -Id \$_.OwningProcess -Force }
  }
"

# Linux/Mac
for port in 3000 5432 8080; do
  lsof -ti:$port | xargs kill -9 2>/dev/null
done
```

## 폴백 조건 (Phase 4도 skip 금지 — 최소 서버 실행 시도 필수)

| 상황 | 대응 |
|------|------|
| Docker 미설치 | dev server 즉시 전환 (npm run dev / python manage.py 등) + 로그에 "[ZEUS-AUTO] Docker 미설치, dev server fallback" 기록 |
| docker-deploy 스킬 실패 | dev server fallback + 로그 기록 |
| 포트 충돌 해결 불가 (권한 부족) | 다른 포트로 재시도 + 로그 기록 |
| 컨테이너 실행 실패 | docker compose logs 기록 후 dev server fallback |

**어떤 경우든 서버 실행을 시도한 기록이 zeus-log.md에 남아야 함.**
