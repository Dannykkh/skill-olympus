# Gemini CLI Integration

> Google Gemini 3 Pro를 Claude Code에서 사용하기 위한 통합 스킬

## 기본 정보

| 항목 | 내용 |
|------|------|
| **저장소** | 내장 스킬 |
| **제작자** | Google |
| **분류** | Skill (외부 AI 통합) |
| **요구사항** | Gemini CLI v0.16.0+ |

---

## 개요

Google의 Gemini 3 Pro 모델을 Gemini CLI를 통해 활용하는 스킬입니다. 대규모 컨텍스트 윈도우(>200k 토큰) 및 최첨단 추론 기능이 필요한 작업에 적합합니다.

---

## 주요 기능

- **대용량 컨텍스트**: 최대 1M 토큰 입력 처리
- **최첨단 성능**: SWE-bench 76.2%, Gemini 2.5 Pro 대비 35% 향상
- **고급 추론**: 복잡한 코딩, 아키텍처 분석, 에이전트 워크플로우
- **유연한 자동화**: 대화형/백그라운드 실행 모드 지원

---

## 사용 시기

- 사용자가 명시적으로 Gemini CLI 실행 요청
- 여러 파일/전체 코드베이스에 대한 종합 코드 리뷰
- 아키텍처 계획, 기술 사양, 프로젝트 로드맵 분석
- 대용량 컨텍스트 (>200k 토큰) 처리
- 소프트웨어 엔지니어링 문제에 대한 고급 추론

**활성화 키워드**: "use Gemini", "run Gemini", "Gemini review", "analyze with Gemini", "big context", ">200k tokens"

---

## 모델 옵션

| 모델 | 용도 | 성능 |
|------|------|------|
| `gemini-3-pro-preview` ⭐ | 복잡한 추론, 코딩, 에이전트 작업 | 76.2% SWE-bench, 플래그십 품질 |
| `gemini-3-flash` | 밀리초 단위 지연 시간, 속도 중요 작업 | 3 Pro에서 증류, TPU 최적화 |
| `gemini-2.5-pro` | 레거시 범용 성능 | 안정적 |
| `gemini-2.5-flash` | 비용 효율적, 대량 작업 | $0.15/M 토큰 |
| `gemini-2.5-flash-lite` | 가장 빠른 처리 | 최대 속도 |

---

## 승인 모드

| 모드 | 대화형 | 백그라운드 | 자동 편집 | 사용 시기 |
|------|--------|-----------|----------|----------|
| `default` | ✅ | ❌ | ❌ | 수동 승인이 가능한 대화형 터미널 |
| `auto_edit` | ✅ | ⚠️ | ✅ | 자동 편집 제안 코드 리뷰 |
| `yolo` | ✅ | ✅ | ✅ | 백그라운드/자동화 작업 (필수) |

---

## 사용 예시

### 종합 코드 리뷰 (백그라운드)

```bash
gemini -m gemini-3-pro-preview --approval-mode yolo \
  "Perform a comprehensive code review focusing on:
   1. Security vulnerabilities
   2. Performance issues
   3. Code quality and maintainability
   4. Best practices violations"
```

### 아키텍처 계획 리뷰

```bash
gemini -m gemini-3-pro-preview --approval-mode yolo \
  "Review this architectural plan for:
   1. Scalability concerns
   2. Missing components
   3. Integration challenges
   4. Alternative approaches"
```

### 전체 코드베이스 분석

```bash
gemini -m gemini-3-pro-preview --approval-mode yolo \
  "Analyze the entire codebase to understand:
   1. Overall architecture
   2. Key patterns and conventions
   3. Potential technical debt
   4. Refactoring opportunities"
```

### 다중 디렉토리 분석

```bash
gemini -m gemini-3-pro-preview --approval-mode yolo \
  --include-directories /path/to/backend \
  --include-directories /path/to/frontend \
  "Analyze the full-stack application architecture"
```

---

## 핵심 플래그

| 플래그 | 설명 | 예시 |
|--------|------|------|
| `-m, --model` | Gemini 모델 선택 | `-m gemini-3-pro-preview` |
| `--approval-mode` | 도구 승인 제어 | `--approval-mode yolo` |
| `-y, --yolo` | 자동 승인 약어 | `-y` |
| `-i, --prompt-interactive` | 프롬프트 실행 후 계속 | `-i "Review auth system"` |
| `--include-directories` | 워크스페이스에 디렉토리 추가 | `--include-directories /path` |
| `-s, --sandbox` | 샌드박스 모드 실행 | `-s` |

---

## 중요: 백그라운드 모드 경고

**백그라운드나 비대화형 셸에서 `--approval-mode default` 절대 사용 금지** (Claude Code 도구 호출 등). 승인 프롬프트 대기로 무한 멈춤 발생.

### 자동화/백그라운드 작업용

✅ **올바른 방법**:
```bash
# 완전 자동화 실행에 yolo 사용
gemini -m gemini-3-pro-preview --approval-mode yolo "Review codebase"

# 안전을 위해 타임아웃 래핑
timeout 300 gemini -m gemini-3-pro-preview --approval-mode yolo "Review codebase"
```

❌ **절대 금지**:
```bash
# 백그라운드에서 무한 멈춤
gemini -m gemini-3-pro-preview --approval-mode default "Review codebase"
```

---

## 멈춤 프로세스 해결

### 증상
- 20분 이상 실행 중, CPU 사용률 0%
- 네트워크 활동 없음
- 프로세스 상태 'S' (sleeping)

### 해결 방법

```bash
# 멈춤 확인
ps aux | grep gemini | grep -v grep

# 필요시 종료
pkill -9 -f "gemini.*gemini-3-pro-preview"
```

---

## 성능 벤치마크

Gemini 3 Pro 장점:
- **SWE-bench**: 76.2% (최첨단)
- **GPQA Diamond**: 91.9%
- **WebDev Arena**: 1487 Elo
- 소프트웨어 엔지니어링 작업에서 **35% 향상** (Gemini 2.5 Pro 대비)

---

## 요구사항

- Gemini CLI v0.16.0 이상 (Gemini 3 지원)
- 버전 확인: `gemini --version`
- Google Cloud 자격 증명 구성
- 대용량 컨텍스트 작업을 위한 충분한 API 할당량

---

**지식 컷오프**: Gemini 3 모델은 2025년 1월까지의 지식 보유
**문서 작성일:** 2026-02-02
