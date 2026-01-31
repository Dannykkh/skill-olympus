# Docker Deploy Skill

Docker 이미지 기반 배포 환경을 자동으로 구성하는 스킬입니다.

## Features

- **멀티스테이지 빌드**: 최적화된 이미지 크기
- **보안 강화**: 비root 사용자, 헬스체크
- **소스코드 보호**: Cython/PyArmor 옵션
- **크로스 플랫폼**: Windows/Linux/Mac 지원

## Usage

```bash
/docker-deploy              # 전체 배포 파일 생성
/docker-deploy build        # 빌드 스크립트만 생성
/docker-deploy install      # 설치 스크립트만 생성
```

## Generated Files

```
project/
├── backend/Dockerfile          # Backend 멀티스테이지 빌드
├── frontend/Dockerfile         # Frontend 멀티스테이지 빌드
├── frontend/nginx.conf         # Nginx 설정
├── docker-compose.yml          # 개발용
├── docker-compose.prod.yml     # 프로덕션 오버라이드
├── docker-build-images.bat/sh  # 이미지 빌드 스크립트
└── docker-images/              # 배포 폴더
    ├── docker-compose.yml      # 배포용 Compose
    ├── .env                    # 환경변수
    ├── install.bat/sh          # 설치 스크립트
    ├── update.bat/sh           # 업데이트
    ├── reset.bat/sh            # 초기화
    ├── logs.bat/sh             # 로그 보기
    └── cleanup.bat/sh          # 정리
```

## Workflow

### 1. 개발 PC에서

```bash
# 1. 배포 파일 생성
/docker-deploy

# 2. 이미지 빌드
./docker-build-images.sh  # or .bat

# 3. ZIP 생성
zip -r project-deploy.zip docker-images/
```

### 2. 배포 PC에서

```bash
# 압축 해제 후
./install.sh              # 처음 설치
./update.sh               # 소스 업데이트 (DB 유지)
./reset.sh                # 완전 초기화
```

## Port Configuration

| Service | Container | Host (Default) |
|---------|-----------|----------------|
| Frontend | 80 | 8960 |
| Backend | 8950 | 8950 |
| MySQL | 3306 | 3310 |
| Redis | 6379 | - (internal) |

## Source Code Protection

Python 프로젝트의 경우 소스코드 보호 옵션:

| Option | Level | Description |
|--------|-------|-------------|
| None | - | 소스코드 그대로 배포 |
| Cython | High | .py → .so 컴파일 (권장) |
| PyArmor | High | 난독화 + 암호화 |

## Templates

자세한 템플릿은 `templates/` 폴더 참조:

- `dockerfile-backend.md` - Backend Dockerfile 템플릿
- `dockerfile-frontend.md` - Frontend Dockerfile 템플릿
- `docker-compose.md` - Docker Compose 설정
- `scripts-windows.md` - Windows 스크립트
- `scripts-linux.md` - Linux/Mac 스크립트
