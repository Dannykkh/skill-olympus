# 장기기억 시스템 (Long-term Memory System)

세션 간 컨텍스트 유지를 위한 메모리 시스템 구조입니다.

---

## 구성요소

| 구성요소 | 파일 | 역할 |
|---------|------|------|
| **저장소** | `MEMORY.md` | 구조화된 장기기억 |
| **규칙** | `CLAUDE.md` | Claude에게 메모리 기록 지시 |
| **대화 로그** | `hooks/save-conversation.sh` | 원시 대화 백업 |
| **자동 정리** | `hooks/update-memory.sh` | Stop 훅 → memory-writer 호출 |
| **정리 에이전트** | `agents/memory-writer.md` | 대화 분석 → MEMORY.md 작성 |
| **핸드오프** | `skills/session-handoff/` | 구조화된 세션 인수인계 문서 |

---

## 작동 흐름

```
세션 중
├── [자동] UserPromptSubmit 훅
│   └── save-conversation.sh → .claude/conversations/YYYY-MM-DD.md (원시 로그)
└── [수동] Claude가 중요한 결정 시 → MEMORY.md 직접 추가

세션 종료
└── [자동] Stop 훅
    └── update-memory.sh → memory-writer 에이전트 → MEMORY.md 정리

수동 백업 (Stop 훅 놓쳤을 때)
├── "메모리에 정리해줘" → memory-writer 에이전트 호출
└── /session-handoff → 구조화된 핸드오프 문서 생성
```

---

## 저장 위치

| 파일 | 위치 | Git 추적 |
|------|------|----------|
| 대화 로그 | `.claude/conversations/` | ❌ (.gitignore) |
| 장기기억 | `MEMORY.md` | ✅ |
| 핸드오프 | `.claude/handoffs/` | ❌ (.gitignore) |
| 설정 | `.claude/settings.local.json` | ❌ (.gitignore) |

---

## 훅 설정

`hooks/settings.example.json` 또는 `.claude/settings.local.json`에 추가:

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "matcher": "",
        "hooks": ["bash hooks/save-conversation.sh \"$PROMPT\""]
      }
    ],
    "Stop": [
      {
        "matcher": "",
        "hooks": ["bash hooks/update-memory.sh"]
      }
    ]
  }
}
```

---

## 핵심 원칙

1. **대화 로그는 항상 저장** - 데이터 손실 방지
2. **정리는 에이전트가 담당** - LLM이 중요한 것만 추출
3. **Stop 훅 놓쳐도 수동 복구 가능** - 로그가 남아있으므로

---

## 관련 파일

- [MEMORY.md](../MEMORY.md) - 장기기억 저장소
- [CLAUDE.md](../CLAUDE.md) - 메모리 기록 규칙
- [agents/memory-writer.md](../agents/memory-writer.md) - 메모리 정리 에이전트
- [skills/session-handoff/](../skills/session-handoff/) - 세션 핸드오프 스킬
- [hooks/save-conversation.sh](../hooks/save-conversation.sh) - 대화 로그 저장 훅
- [hooks/update-memory.sh](../hooks/update-memory.sh) - 메모리 업데이트 훅

---

## 참고 자료

### GitHub 프로젝트

| 프로젝트 | 참고 내용 | 링크 |
|---------|----------|------|
| **softaworks/agent-toolkit** | session-handoff 스킬 원본 | [GitHub](https://github.com/softaworks/agent-toolkit) |
| **anthropics/claude-code** | Claude Code 공식 훅 시스템 | [GitHub](https://github.com/anthropics/claude-code) |
| **Yeachan-Heo/oh-my-claudecode** | 메모리 관리 패턴 참고 | [GitHub](https://github.com/Yeachan-Heo/oh-my-claudecode) |

### 관련 문서

- [Claude Code Hooks Documentation](https://docs.anthropic.com/claude-code/hooks)
- [Vercel AGENTS.md Research](https://vercel.com/blog/agents-md-outperforms-skills-in-our-agent-evals)

---

**최종 업데이트:** 2026-02-01
