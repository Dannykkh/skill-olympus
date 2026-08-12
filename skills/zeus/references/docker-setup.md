# Docker Setup — Phase 4 상세 절차

Zeus Phase 4에서 Docker 환경 구성 및 컨테이너 실행 절차.

---

## Source-only module precondition

Zeus 본문의 `Source-only internal module resolution (mandatory)` 우선순위(프로젝트 exact 파일 →
현재 런타임 active root exact 파일 → 전역 `SKILLS-CATALOG.md`의 유일한 행과 정확한
`읽을 경로`)로 `docker-deploy`를 해석합니다.
그 `SKILL.md`의 부모를 `docker_deploy_root`로 두고, Dockerfile/Compose/배치 파일 계약에
필요한 모든 `references/`를 `${docker_deploy_root}/references/...`에서 읽습니다.

이는 이름 기반 slash command나 등록 스킬 호출이 아닙니다. 행·파일·필수 reference를 읽지 못하면
`BLOCKED: docker-deploy source module unavailable`을 zeus-log.md에 남기고 dev server로
폴백합니다. Phase 4는 `weak`이며 최종 SUCCESS 근거가 될 수 없습니다.

## 실행 흐름

```
1. docker-deploy source module 계약 로드
   ├── 전역 카탈로그의 정확한 읽을 경로 성공 → module_root 기반 references 로드
   └── 실패 → BLOCKED 기록 + dev server fallback (Phase 4 weak)

2. Docker 설치 확인
   ├── docker --version 성공 → 계속
   └── 실패 → dev server fallback (Phase 5에서 dev server 사용)

3. 실제 Compose 파일 경로 결정
   - 로드한 모듈이 선언한 산출물 경로 확인 (현 계약: docker-images/docker-compose.yml)
   - 프로젝트의 기존 Compose 파일이 있으면 그 파일과 충돌 여부 확인
   - 선택한 exact 경로를 compose_file로 기록 (루트 docker-compose.yml 가정 금지)
   ├── compose_file 있음 → Step 4 건너뛰고 Step 5로
   └── 없음 → 로드한 docker-deploy 모듈 계약 수행

4. docker-deploy 모듈 계약 수행 (파일 생성)
   - Phase 0 파싱 결과의 techStack 참조
   - Dockerfile + docker-compose.yml 생성
   - DB 컨테이너 포함 (PostgreSQL, MySQL 등)
   - 포트 매핑: playwright.config.ts baseURL과 일치하도록 설정
   - 필요한 template/reference는 docker_deploy_root 기준으로 해석
   - 생성 후 산출물 실존을 확인하고 compose_file을 exact 경로로 갱신

5. 포트 충돌 해결
   - compose_file에서 외부 포트 추출 (ports: "HOST:CONTAINER")
   - 각 외부 포트에 대해 점유 프로세스 확인 + 종료
   - Windows: Get-NetTCPConnection → Stop-Process
   - Linux/Mac: lsof -ti:{PORT} | xargs kill -9

6. 컨테이너 실행
   - docker compose -f "${compose_file}" down --remove-orphans 2>/dev/null
   - docker compose -f "${compose_file}" up -d --build
   - 헬스체크 대기 (최대 120초, 2초 간격)
   - 실패 시 docker compose -f "${compose_file}" logs로 원인 확인

7. 실행 확인
   ├── 헬스체크 통과 → Phase 5로 진행 (서버 이미 실행 중)
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
| docker-deploy source module 로드 실패 | `BLOCKED` + Phase 4 `weak` 기록 후 dev server fallback |
| docker-deploy 모듈 계약 수행 실패 | `FAILED` + Phase 4 `weak` 기록 후 dev server fallback |
| 포트 충돌 해결 불가 (권한 부족) | 다른 포트로 재시도 + 로그 기록 |
| Compose 산출물 미생성/경로 불명 | `FAILED` + Phase 4 `weak`; 추측 경로 실행 금지, dev server fallback |
| 컨테이너 실행 실패 | exact compose_file logs + Phase 4 `weak` 기록 후 dev server fallback |

**어떤 경우든 서버 실행을 시도한 기록이 zeus-log.md에 남아야 함.**
