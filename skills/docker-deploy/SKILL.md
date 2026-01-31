---
name: docker-deploy
description: Docker 이미지 기반 배포 환경을 자동으로 구성합니다. /docker-deploy 명령으로 Dockerfile, docker-compose, install.bat 등 배포에 필요한 모든 파일을 생성합니다.
license: MIT
metadata:
  author: user
  version: "2.0.0"
---

# Docker Deploy Skill

Docker 이미지 기반 배포 파일을 자동 생성하는 스킬입니다.

## Triggers

- `/docker-deploy` - 전체 Docker 배포 파일 생성
- `/docker-deploy build` - 이미지 빌드 스크립트만 생성
- `/docker-deploy install` - install 스크립트만 생성

## 생성되는 파일

| 파일 | 용도 |
|------|------|
| `backend/Dockerfile` | Backend 멀티스테이지 빌드 |
| `frontend/Dockerfile` | Frontend 멀티스테이지 빌드 |
| `frontend/nginx.conf` | Nginx 설정 |
| `docker-compose.yml` | 개발용 |
| `docker-compose.prod.yml` | 프로덕션 오버라이드 |
| `docker-build-images.bat/.sh` | 이미지 빌드 |
| `docker-images/` | 배포용 폴더 |

## Workflow

### 1. 프로젝트 분석

```bash
# 확인 항목
- backend/ 폴더 → Python/FastAPI, Node.js
- frontend/ 폴더 → React, Vue
- 기존 Dockerfile, docker-compose.yml
- package.json, requirements.txt
```

### 2. 사용자 질문 (AskUserQuestion)

#### 2.1 OS 선택
```
배포 대상 OS를 선택해주세요:
1. Windows (bat 스크립트)
2. Linux/Mac (sh 스크립트)
3. 둘 다 (bat + sh)
```

#### 2.2 소스코드 보호 (Python만)
```
Python 소스코드 보호가 필요합니까?
- 없음: 소스코드 그대로 배포
- Cython: .py → .so 컴파일 (권장)
- PyArmor: 난독화 + 암호화
```

#### 2.3 포트 설정
```
| 서비스 | 기본 포트 | 용도 |
|--------|----------|------|
| Frontend | 8960 | 웹 브라우저 (필수) |
| Backend | 8950 | Swagger, API 테스트 |
| MySQL | 3310 | DB 클라이언트 접속 |
```

### 3. 파일 생성

참조할 템플릿 파일:
- [templates/dockerfile-backend.md](templates/dockerfile-backend.md) - Backend Dockerfile
- [templates/dockerfile-frontend.md](templates/dockerfile-frontend.md) - Frontend Dockerfile
- [templates/docker-compose.md](templates/docker-compose.md) - Docker Compose 설정
- [templates/scripts-windows.md](templates/scripts-windows.md) - Windows 스크립트
- [templates/scripts-linux.md](templates/scripts-linux.md) - Linux/Mac 스크립트

### 4. 포트 규칙

| 서비스 | 컨테이너 내부 | 호스트 포트 |
|--------|--------------|------------|
| Frontend | 80 | {user_frontend_port} |
| Backend | 8950 | {user_backend_port} |
| MySQL | 3306 | {user_db_port} |
| Redis | 6379 | - (내부 전용) |

### 5. 완료 메시지

```
Docker 배포 환경이 구성되었습니다.

다음 단계:
1. docker-build-images.bat 실행하여 이미지 빌드
2. ZIP 파일 생성하여 배포

배포 PC에서:
- install.bat : 처음 설치
- update.bat  : 소스코드 업데이트 (DB 유지)
- reset.bat   : 완전 초기화
```

## Notes

- `{project}` → 실제 프로젝트명으로 대체
- 기존 파일이 있으면 백업 후 덮어쓰기 여부 확인
- 프로젝트 구조에 따라 Dockerfile 내용 조정
