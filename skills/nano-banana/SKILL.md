---
name: nano-banana
description: Gemini CLI 기반 이미지 생성/편집. 썸네일, 아이콘, 다이어그램, 패턴 생성 및 사진 복원, 이미지 편집. 이미지/그래픽/비주얼 관련 요청 시 사용.
allowed-tools: Bash(gemini:*)
---

# Nano Banana - 이미지 생성/편집

Gemini CLI의 nanobanana 확장으로 이미지를 생성하고 편집합니다.

## 언제 사용하나

- 이미지, 그래픽, 일러스트, 비주얼 요청
- 썸네일, 배너, 대표 이미지
- 아이콘, 다이어그램, 패턴
- 사진 편집, 복원, 배경 제거
- "생성", "만들어", "그려줘", "디자인" 등의 키워드

## 사전 설치

```bash
# 1. Gemini CLI 설치
npm install -g @google/gemini-cli

# 2. nanobanana 확장 설치
gemini extensions install https://github.com/gemini-cli-extensions/nanobanana

# 3. 확인
gemini extensions list | grep nanobanana
```

API 키 설정 또는 Google 계정 로그인 필요:
```bash
export GEMINI_API_KEY="your-api-key"
```

## 명령어 선택 가이드

| 요청 | 명령어 |
|------|--------|
| 블로그 헤더/대표 이미지 | `/generate` |
| 앱 아이콘 | `/icon` |
| 플로우차트/아키텍처 | `/diagram` |
| 오래된 사진 복원 | `/restore` |
| 배경 제거/이미지 수정 | `/edit` |
| 반복 텍스처/패턴 | `/pattern` |
| 만화/스토리보드 | `/story` |

## 사용법

**`--yolo` 플래그 필수** (자동 승인, 프롬프트 대기 방지)

```bash
# 텍스트 → 이미지
gemini --yolo "/generate '프롬프트' --preview"

# 이미지 편집
gemini --yolo "/edit file.png '수정 지시'"

# 사진 복원
gemini --yolo "/restore old_photo.jpg 'fix scratches'"

# 아이콘 생성
gemini --yolo "/icon '설명' --sizes='64,128,256,512' --corners='rounded'"

# 다이어그램
gemini --yolo "/diagram '설명' --type='flowchart' --style='modern'"

# 패턴/텍스처
gemini --yolo "/pattern '설명'"

# 스토리/시퀀스
gemini --yolo "/story '설명'"

# 자연어 인터페이스
gemini --yolo "/nanobanana 프롬프트"
```

## 주요 옵션

| 옵션 | 설명 |
|------|------|
| `--yolo` | **필수.** 자동 승인 |
| `--count=N` | N개 변형 생성 (1-8) |
| `--preview` | 생성 후 자동 열기 |
| `--styles="style1,style2"` | 아트 스타일 적용 |
| `--format=grid\|separate` | 출력 배치 |

## 자주 쓰는 크기

| 용도 | 크기 | 옵션 |
|------|------|------|
| YouTube 썸네일 | 1280x720 | `--aspect=16:9` |
| 블로그 대표 이미지 | 1200x630 | 소셜 미리보기 호환 |
| 정사각형 (인스타) | 1080x1080 | |
| X/Twitter 헤더 | 1500x500 | 와이드 배너 |
| 세로 스토리 | 1080x1920 | `--aspect=9:16` |

## 모델 선택

- **기본**: `gemini-2.5-flash-image` (~$0.04/장, 빠르고 저렴)
- **고품질**: `gemini-3-pro-image-preview` (4K, 더 나은 추론)

```bash
# 고품질 모델로 전환
export NANOBANANA_MODEL=gemini-3-pro-image-preview
```

## 출력 위치

생성된 이미지는 `./nanobanana-output/`에 저장됩니다.

## 생성 후 절차

1. `./nanobanana-output/` 내용 확인
2. 최신 이미지를 사용자에게 제시
3. 필요 시 변형 제안 (`--count=3`)

## 수정/반복 요청 시

| 요청 | 대응 |
|------|------|
| "다시" / "옵션 줘" | `--count=3`으로 재생성 |
| "더 ~하게" | 프롬프트 조정 후 재생성 |
| "이거 수정해" | `/edit nanobanana-output/파일.png '수정사항'` |
| "다른 스타일로" | `--styles="요청_스타일"` 추가 |

## 프롬프트 팁

1. **구체적으로**: 스타일, 분위기, 색상, 구도 포함
2. **텍스트 방지**: 이미지에 글자 불필요 시 "no text" 추가
3. **스타일 참조**: "editorial photography", "flat illustration", "3D render", "watercolor"
4. **비율 맥락**: "wide banner", "square thumbnail", "vertical story"

## 트러블슈팅

| 문제 | 해결 |
|------|------|
| API 키 미설정 | `export GEMINI_API_KEY="your-key"` |
| 확장 못 찾음 | 설치 명령 재실행 |
| 할당량 초과 | 리셋 대기 또는 flash 모델 전환 |
| 생성 실패 | 프롬프트 정책 위반 확인, 단순화 |
