# ruvnet/claude-flow

> Multi-agent 스웜 오케스트레이션 프레임워크

## 기본 정보

| 항목 | 내용 |
|------|------|
| **저장소** | [github.com/ruvnet/claude-flow](https://github.com/ruvnet/claude-flow) |
| **제작자** | ruvnet |
| **라이선스** | MIT |
| **분류** | Multi-Agent Framework |

---

## 개요

여러 Claude 에이전트를 동시에 실행하고 조율하는 프레임워크. 복잡한 작업을 여러 전문 에이전트에게 분산하여 병렬 처리.

**해결하는 문제:**
- 단일 에이전트의 한계 (전문성, 컨텍스트)
- 복잡한 작업의 순차 처리 병목
- 다양한 LLM 모델 간 전환 필요성

---

## 주요 기능

### Multi-Agent 스웜

여러 에이전트가 동시에 작업 수행:

```
┌─────────────┐
│ Orchestrator│
└──────┬──────┘
       │
   ┌───┴───┐
   ▼       ▼
┌─────┐ ┌─────┐ ┌─────┐
│Agent│ │Agent│ │Agent│
│ #1  │ │ #2  │ │ #3  │
└─────┘ └─────┘ └─────┘
   │       │       │
   └───────┴───────┘
           │
      ┌────┴────┐
      │ Results │
      └─────────┘
```

### LLM 간 자동 전환

작업 특성에 따라 최적 모델 선택:
- 추론 → Claude Opus
- 코드 생성 → GPT-5.2
- 대규모 컨텍스트 → Gemini 3 Pro

### 작업 분할 및 병합

- 큰 작업을 작은 단위로 분할
- 각 에이전트가 병렬 처리
- 결과 자동 병합

---

## 설치 방법

```bash
npm install claude-flow

# 또는 글로벌 설치
npm install -g claude-flow
```

---

## 사용 예시

### 기본 스웜 실행

```javascript
import { ClaudeFlow } from 'claude-flow';

const flow = new ClaudeFlow({
  agents: [
    { role: 'researcher', model: 'claude-opus' },
    { role: 'coder', model: 'gpt-5.2' },
    { role: 'reviewer', model: 'claude-sonnet' }
  ]
});

const result = await flow.execute({
  task: '새로운 인증 시스템 구현',
  strategy: 'parallel'
});
```

### CLI 사용

```bash
claude-flow run --task "리팩토링" --agents 3
```

---

## 장단점

### 장점
- 복잡한 작업의 병렬 처리
- 모델별 강점 활용 (비용/성능 최적화)
- 확장 가능한 에이전트 구조
- 실패 시 자동 재시도

### 단점/주의사항
- 여러 API 키 필요 (다중 모델 사용 시)
- 오케스트레이션 오버헤드
- 에이전트 간 통신 복잡성
- 비용 관리 필요 (병렬 실행 = 비용 증가)

---

## 관련 리소스

- [PAL MCP](./pal-mcp.md) - Multi-model 오케스트레이션 MCP
- [Multi-LLM Integration Guide](./multi-llm-integration.md)
- [wshobson/agents](https://github.com/wshobson/agents) - 유사 프로젝트

---

**문서 작성일:** 2026-02-01
