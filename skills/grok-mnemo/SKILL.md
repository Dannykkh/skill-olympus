---
name: grok-mnemo
description: Grok Build(xAI CLI) 과거 대화를 검색하거나 장기기억을 설정할 때 사용. UserPromptSubmit+Stop 훅으로 대화 자동 저장, 키워드 태깅, 과거 검색. Grok 세션에서 /mnemo 요청 시 이 스킬 기준으로 안내.
triggers:
  - "mnemo"
  - "므네모"
  - "장기기억"
  - "memory"
  - "기억해"
  - "이전에"
  - "handoff"
  - "핸드오프"
  - "grok 기억"
  - "grok memory"
  - "grok-mnemo"
auto_apply: false
---

# Grok-Mnemo - Grok Build 기억 시스템

> 기억의 여신 Mnemosyne에서 유래. Claude Code용 Mnemo를 Grok Build(xAI CLI)에 이식.

Grok Build 세션 간 컨텍스트 유지를 위한 장기기억 시스템입니다.

## 설치

```bash
node skills/grok-mnemo/install.js              # 설치 (Grok 미설치 시 자동 skip)
node skills/grok-mnemo/install.js --uninstall  # 제거
node skills/grok-mnemo/install.js --check      # 설치 상태 점검
```

---

## 4종 Mnemo 비교

| | Claude Code (Mnemo) | Codex CLI | Gemini CLI | Grok Build (Grok-Mnemo) |
|---|---|---|---|---|
| 훅 | 2개 (Submit + Stop) | 1개 (notify) | 1개 (AfterAgent) | **1스크립트 2이벤트** (UserPromptSubmit + Stop) |
| 데이터 전달 | stdin + transcript JSONL | argv JSON | stdin JSON | **stdin JSON (camelCase)** |
| 페이로드 | prompt / transcript 파싱 | input/last-assistant-message | prompt / prompt_response | **prompt(`<user_query>` 래핑) / lastAssistantMessage** |
| 설정 형식 | settings.json | config.toml | settings.json | **hooks/*.json 자동 스캔** |
| 규칙 파일 | CLAUDE.md | AGENTS.md | AGENTS.md | **~/.grok/rules/*.md (델타만)** |
| 저장 경로 | `conversations/*-claude.md` | `conversations/*-codex.md` | `conversations/*-gemini.md` | **`conversations/*-grok.md`** |
| 중복 방지 | 타임스탬프 | turn-id | 타임스탬프 | **타임스탬프 + reason 필터** |

**Grok만의 특이점** (실측 근거, Grok Build 0.2.111):

1. **Claude 자산 직접 읽기**: 스킬/에이전트/MCP/규칙은 `[compat.claude]` 기본값으로 `~/.claude/`를 직접 읽음 → **mnemo 훅만 어댑터 필요** (memory/learned/018 참조)
2. **camelCase envelope**: Claude의 `transcript_path`(snake_case)와 달리 `transcriptPath`/`sessionId`/`lastAssistantMessage` — Claude 훅 스크립트가 그대로 동작하지 않는 이유
3. **`<user_query>` 래핑**: UserPromptSubmit의 `prompt`는 `<user_query>...</user_query>`로 감싸져 옴 → 훅에서 스트립
4. **Stop 이중 발화**: 세션 종료 시 observe-only Stop이 한 번 더 발화 (`reason: channel_closed|shutdown`) → `reason == "end_turn"`만 저장
5. **Stop stdout 파싱**: Stop 훅의 stdout JSON은 stop 결정으로 해석됨 → 훅은 stdout에 아무것도 쓰지 않음 (안내는 stderr)
6. **이중 저장 방지 가드**: Grok은 `~/.claude/settings.json`의 Claude 훅도 로드하므로, Claude용 mnemo 훅들은 첫 줄에서 `GROK_HOOK_EVENT` 환경변수를 감지하면 exit 0 (grok-mnemo가 전담)

---

## 핵심 원칙

| 원칙 | 설명 |
|------|------|
| **빠르게** | 훅에서 AI 호출 금지 |
| **단순하게** | 파일 기반, DB 없음 |
| **검색 가능하게** | 키워드 + 동의어 확장 |

---

## 포함 파일

```
grok-mnemo/
├── SKILL.md                     # 이 파일
├── install.js                   # 설치/제거 스크립트
├── hooks/
│   ├── save-turn.ps1            # Windows 훅 스크립트 (2이벤트 분기)
│   └── save-turn.sh             # Linux/Mac 훅 스크립트 (2이벤트 분기)
└── templates/
    └── grok-rules.md            # ~/.grok/rules/ 주입 규칙 (Grok 전용 델타)
```

---

## 동작 흐름

```
Grok Build 대화
    ├─ [UserPromptSubmit 이벤트]
    │      → stdin JSON (camelCase) 수신
    │      → prompt에서 <user_query> 래퍼 제거 → User 저장
    └─ [Stop 이벤트]
           → reason == "end_turn" 확인 (세션 종료 재발화 제외)
           → lastAssistantMessage → Assistant 저장 (transcript 파싱 불필요)
           → observations.jsonl 관찰 기록 (gotchas/learned)
           → MEMORY.md + memory/*.md scaffold 자동 생성(없을 때만)
    공통: <private> 스크럽 → conversations/YYYY-MM-DD-grok.md append
```

---

## 저장 위치

| 파일 | 위치 |
|------|------|
| 대화 로그 | `conversations/YYYY-MM-DD-grok.md` |
| 의미기억 | `MEMORY.md` (프로젝트 루트) |
| 훅 스크립트 | `~/.grok/hooks/grok-mnemo-save-turn.ps1\|.sh` |
| 훅 등록 | `~/.grok/hooks/grok-mnemo.json` |
| 규칙 | `~/.grok/rules/grok-mnemo.md` |
| 핸드오프 | 공통 프로젝트 경로 `docs/handoffs/YYYY-MM-DD-HHMMSS-slug.md` |

> 핸드오프는 CLI별 홈 디렉터리가 아니라 프로젝트 안의 공통 디렉터리 `docs/handoffs/`를 사용합니다.
> Claude, Codex, Gemini, Grok이 같은 프로젝트 핸드오프를 이어받기 위한 의도된 동작입니다.

## 검색 규칙 (Grok 세션에서)

- 검색 대상은 **오직 프로젝트의 `conversations/*.md`** (4개 CLI 파일 통합 검색).
- Grok 자체 transcript(`~/.grok/sessions/**/updates.jsonl`)는 내부 백업 취급 — 직접 읽기 금지.
- 공통 규칙(키워드 확장, Progressive Disclosure, MEMORY.md 관리)은 글로벌 `~/.claude/CLAUDE.md`를
  Grok이 rules 호환으로 직접 로드하므로 그대로 적용됩니다.
