# OCR & 문서 인식 리소스

> 문서 인식 기술이 필요한 프로젝트에서 참고할 스킬/MCP 모음

## 개요

Claude Code는 기본적으로 이미지를 읽을 수 있지만(multimodal), 대량 처리나 정밀한 OCR이 필요한 경우 전문 스킬/MCP를 사용합니다.

### 언제 전문 OCR이 필요한가?

| 상황 | Claude 내장 | 전문 OCR |
|------|------------|----------|
| 간단한 스크린샷 읽기 | ✅ 충분 | 불필요 |
| PDF 대량 텍스트 추출 | ❌ 한계 | ✅ 필요 |
| 손글씨/저해상도 이미지 | ❌ 부정확 | ✅ 필요 |
| 코드 이미지 → 실행 가능 코드 | ❌ 수동 복사 | ✅ 자동화 |
| 영수증/인보이스 구조화 | ❌ 수동 | ✅ 자동화 |
| 프라이버시 (로컬 처리) | ❌ API 전송 | ✅ 로컬 가능 |

---

## Skills

### 1. Code From Image

이미지/스크린샷에서 코드를 추출하여 실행 가능한 코드로 변환.

| 항목 | 내용 |
|------|------|
| **링크** | [mcpmarket.com/tools/skills/code-from-image](https://mcpmarket.com/ko/tools/skills/code-from-image) |
| **용도** | 코드 스크린샷, 알고리즘 다이어그램 → 실행 코드 |
| **특징** | 멀티패스 OCR, 문자 모호성 해결, 저해상도 지원 |

**사용 예시:**
```
/code-from-image "이 알고리즘 다이어그램을 Python으로 구현해줘"
```

---

### 2. PDF Processing Suite

PDF 문서 종합 처리 도구.

| 항목 | 내용 |
|------|------|
| **링크** | [mcpmarket.com/tools/skills/pdf-processing-suite](https://mcpmarket.com/tools/skills/pdf-processing-suite) |
| **용도** | PDF 텍스트/테이블 추출, OCR, 병합, 리포트 생성 |
| **라이브러리** | pypdf, reportlab |

**기능:**
- PDF 텍스트 추출
- 테이블 데이터 추출
- 여러 PDF 병합
- OCR (스캔 문서)
- 영수증/인보이스 자동 처리

**사용 예시:**
```
/pdf-process "invoices/ 폴더의 모든 PDF에서 금액과 날짜 추출해줘"
```

---

### 3. DeepSeek-OCR

로컬 DeepSeek-OCR 모델을 사용한 이미지→마크다운 변환.

| 항목 | 내용 |
|------|------|
| **링크** | [mcpmarket.com/tools/skills/deepseek-ocr-tool](https://mcpmarket.com/tools/skills/deepseek-ocr-tool) |
| **용도** | 교과서, 강의 슬라이드, 이미지 시퀀스 → 마크다운 |
| **특징** | 로컬 실행 (Ollama), 프라이버시 보장, 배치 처리 |

**장점:**
- 데이터가 외부로 전송되지 않음
- 대량 이미지 배치 처리
- 구조화된 마크다운 출력

**사용 예시:**
```
/deepseek-ocr "lecture-slides/ 폴더를 마크다운으로 변환해줘"
```

---

## MCP Servers

### 4. Vision OCR MCP

로컬 오프라인 텍스트 인식 MCP 서버.

| 항목 | 내용 |
|------|------|
| **링크** | [mcpmarket.com/server/vision](https://mcpmarket.com/server/vision) |
| **용도** | 오프라인 OCR, 프라이버시 중시 환경 |
| **특징** | 인터넷 연결 불필요, 로컬 처리 |

**설치:**
```bash
claude mcp add vision-ocr -- npx vision-ocr-mcp
```

---

### 5. OCR Web Service MCP (Composio)

클라우드 OCR API 연동 MCP.

| 항목 | 내용 |
|------|------|
| **링크** | [composio.dev/toolkits/ocr_web_service](https://composio.dev/toolkits/ocr_web_service/framework/claude-code) |
| **용도** | 고정밀 OCR, 좌표 포함 텍스트 추출 |
| **특징** | 워드 좌표 제공, 포맷된 파일 출력 |

**기능:**
- 이미지→텍스트 자동 인식
- 단어별 좌표 정보
- 계정 사용량 모니터링

---

## 프로젝트별 추천

| 프로젝트 유형 | 추천 리소스 |
|--------------|------------|
| **코드 스크린샷 변환** | Code From Image |
| **PDF 문서 처리** | PDF Processing Suite |
| **교육 자료 디지털화** | DeepSeek-OCR |
| **프라이버시 중시** | Vision OCR MCP, DeepSeek-OCR |
| **고정밀 OCR (API)** | OCR Web Service MCP |
| **영수증/인보이스 자동화** | PDF Processing Suite |

---

## 설치 가이드

### Skills 설치
```bash
# MCP Market에서 설치 (예시)
npx add-skill mcpmarket/code-from-image -a claude-code
npx add-skill mcpmarket/pdf-processing-suite -a claude-code
```

### MCP 설치
```bash
# Vision OCR MCP
claude mcp add vision-ocr -- npx vision-ocr-mcp

# Composio OCR (API 키 필요)
claude mcp add ocr-service -- npx composio-ocr-mcp
```

### 로컬 OCR (DeepSeek + Ollama)
```bash
# Ollama 설치 후
ollama pull deepseek-ocr
# 스킬에서 로컬 모델 사용
```

---

## 관련 리소스

- [mcp-pandoc](./mcp-pandoc.md) - 문서 변환 (MD→PDF/DOCX)
- [Office-PowerPoint-MCP](./office-powerpoint-mcp.md) - PPT 자동화
- [Claude 공식 이미지 인식](https://docs.anthropic.com/claude/docs/vision) - 내장 기능

---

**문서 작성일:** 2026-02-01
