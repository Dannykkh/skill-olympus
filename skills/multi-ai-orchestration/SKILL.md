---
name: multi-ai-orchestration
description: 멀티 AI CLI 오케스트레이션 설정 및 사용 가이드. Claude, Codex, Gemini를 동시에 활용
triggers:
  - "multi ai"
  - "orchestration"
  - "codex gemini"
  - "멀티 에이전트"
  - "병렬 ai"
---

# Multi-AI Orchestration Guide

여러 AI CLI (Claude, Codex, Gemini)를 동시에 활용하는 오케스트레이션 설정 가이드입니다.

## 빠른 시작

```
workpm      ← PM 모드 시작 (프로젝트 분석, 태스크 분해)
pmworker    ← Worker 모드 시작 (태스크 수행)
```

## 1. 보유 도구: orchestrator-mcp

### 개요
PM + Multi-AI Worker 패턴으로 여러 AI를 병렬 실행합니다.

```
┌─────────────────────────────────────────────────────┐
│                    PM (Claude)                      │
│  - orchestrator_detect_providers (AI 감지)          │
│  - orchestrator_analyze_codebase                    │
│  - orchestrator_create_task (ai_provider 지정)      │
│  - orchestrator_get_progress                        │
├─────────────────────────────────────────────────────┤
│  ┌───────────┐ ┌───────────┐ ┌───────────┐         │
│  │ Worker-1  │ │ Worker-2  │ │ Worker-3  │         │
│  │ (Claude)  │ │ (Codex)   │ │ (Gemini)  │         │
│  └───────────┘ └───────────┘ └───────────┘         │
└─────────────────────────────────────────────────────┘
```

### 실행 방법

```powershell
# 기본 실행 (Claude만)
.\skills\orchestrator\mcp-server\scripts\launch.ps1 -ProjectPath "C:\your\project"

# Multi-AI 모드 (설치된 CLI 자동 감지)
.\scripts\launch.ps1 -ProjectPath "C:\your\project" -MultiAI

# Worker별 AI 직접 지정
.\scripts\launch.ps1 -ProjectPath "C:\your\project" -AIProviders @('claude', 'codex', 'gemini')

# Worker 수 지정
.\scripts\launch.ps1 -ProjectPath "C:\your\project" -WorkerCount 5 -MultiAI
```

### AI 자동 감지 & Fallback

| 모드 | 조건 | 동작 |
|------|------|------|
| **Full Mode** | 3개 AI 설치됨 | Claude + Codex + Gemini 병렬 |
| **Dual Mode** | 2개 AI 설치됨 | 사용 가능한 2개 AI 병렬 |
| **Single Mode** | Claude만 설치 | Claude 전용 (기본) |

### MCP 도구

| 역할 | 도구 | 설명 |
|------|------|------|
| Multi-AI | `orchestrator_detect_providers` | 설치된 AI CLI 감지 |
| Multi-AI | `orchestrator_get_provider_info` | AI별 강점 조회 |
| PM | `orchestrator_analyze_codebase` | 프로젝트 구조 분석 |
| PM | `orchestrator_create_task` | 태스크 생성 (ai_provider 옵션) |
| PM | `orchestrator_get_progress` | 진행 상황 조회 |
| Worker | `orchestrator_claim_task` | 태스크 담당 |
| Worker | `orchestrator_lock_file` | 파일 락 |
| Worker | `orchestrator_complete_task` | 완료 처리 |

### AI별 최적 용도

| AI | 강점 | 추천 태스크 |
|----|------|------------|
| **Claude** | 복잡한 추론, 맥락 이해 | 리팩토링, 아키텍처 설계, 문서 작성 |
| **Codex** | 빠른 코드 생성 | 테스트 작성, 반복 코드 수정, 프로토타이핑 |
| **Gemini** | 대용량 컨텍스트 (1M 토큰) | 전체 코드 리뷰, 보안 분석, 멀티파일 이해 |

---

## 2. 외부 도구: Claude-Octopus (추천)

### 설치

```bash
# Claude Code에서 실행
/plugin marketplace add https://github.com/nyldn/claude-octopus
/plugin install claude-octopus@nyldn-plugins
```

### 초기 설정

```bash
/octo:setup
```

Codex CLI 또는 Gemini CLI가 필요합니다:
- Codex: `npm install -g @openai/codex`
- Gemini: `npm install -g @google/gemini-cli`

### 핵심 명령어

```bash
# 멀티 AI 리서치 (3개 AI 동시 분석)
octo research OAuth authentication patterns

# 전문가 호출
I need a security expert to review this code

# Double Diamond 워크플로우
/octo:embrace authentication
```

### 장점
- 3개 AI 동시 실행 + 자동 합성
- 29개 전문 페르소나
- 35개+ 전문 스킬

---

## 3. 대안 도구

### Claude-Code-Workflow (CCW)
가장 풍부한 기능, 4단계 워크플로우

```bash
npm install -g claude-code-workflow
ccw install -m Global
ccw view  # 대시보드
```

### myclaude
간단한 설치

```bash
npx github:cexll/myclaude
```

---

## 비교표

| 도구 | 지원 AI | 특징 | 설치 난이도 |
|------|---------|------|------------|
| orchestrator-mcp | Claude (다중) | 파일 락, 태스크 의존성 | 보유 중 |
| Claude-Octopus | Claude+Codex+Gemini | 다양한 관점 수집 | 쉬움 |
| CCW | Claude+Codex+Gemini+Qwen | 가장 풍부한 기능 | 보통 |
| myclaude | Claude+Codex+Gemini+OpenCode | 심플 | 쉬움 |

---

## 사용 시나리오

### 시나리오 1: 대규모 리팩토링
→ **orchestrator-mcp** 사용
- PM이 모듈별 태스크 분배
- Worker들이 병렬로 각 모듈 작업
- 파일 락으로 충돌 방지

### 시나리오 2: 아키텍처 리뷰
→ **Claude-Octopus** 사용
- Claude: 구현 관점
- Codex: 성능 관점
- Gemini: 설계 관점
- 3가지 의견 자동 합성

### 시나리오 3: 복잡한 문제 해결
→ **CCW** 사용
- brainstorm:auto-parallel로 다중역할 분석
- 체계적인 워크플로우 진행
