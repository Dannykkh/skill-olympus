---
name: codex-mnemo
description: Codex CLI용 장기기억 시스템. notify 훅으로 대화 자동 저장, 키워드 태깅, 과거 검색.
triggers:
  - "codex 기억"
  - "codex memory"
  - "codex-mnemo"
auto_apply: false
---

# Codex-Mnemo - Codex CLI 기억 시스템

> 기억의 여신 Mnemosyne에서 유래. Claude Code용 Mnemo를 Codex CLI에 이식.

Codex CLI 세션 간 컨텍스트 유지를 위한 장기기억 시스템입니다.

## 설치

```bash
node skills/codex-mnemo/install.js              # 설치
node skills/codex-mnemo/install.js --uninstall  # 제거
```

---

## Claude Code Mnemo와의 차이

| | Claude Code (Mnemo) | Codex CLI (Codex-Mnemo) |
|---|---|---|
| 훅 | 2개 (UserPromptSubmit + Stop) | **1개** (notify: agent-turn-complete) |
| 데이터 전달 | stdin JSON + transcript JSONL 파싱 | **argv JSON** (user+assistant 직접 포함) |
| 설정 | settings.json (JSON) | **config.toml** (TOML) |
| 규칙 파일 | CLAUDE.md | **AGENTS.md** |
| 저장 경로 | `.claude/conversations/` | **`.codex/conversations/`** |
| 중복 방지 | 타임스탬프 기반 | **turn-id 기반** (더 정확) |

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
codex-mnemo/
├── SKILL.md                     # 이 파일
├── install.js                   # 설치/제거 스크립트
├── hooks/
│   ├── save-turn.ps1            # Windows notify 스크립트
│   └── save-turn.sh             # Linux/Mac notify 스크립트
└── templates/
    └── agents-md-rules.md       # AGENTS.md 주입 규칙
```

---

## 동작 흐름

```
Codex CLI 대화
    ↓
[notify: agent-turn-complete]
    → argv JSON 페이로드 수신
    → input-messages → User 입력 추출
    → last-assistant-message → Assistant 응답 추출
    → 코드 블록 제거 + 2000자 제한
    → .codex/conversations/YYYY-MM-DD.md에 append
    → turn-id 기반 중복 방지
```

---

## 저장 위치

| 파일 | 위치 |
|------|------|
| 대화 로그 | `.codex/conversations/YYYY-MM-DD.md` |
| 의미기억 | `MEMORY.md` (프로젝트 루트) |
| 훅 | `~/.codex/hooks/save-turn.ps1\|.sh` |
| 설정 | `~/.codex/config.toml` |
| 규칙 | `~/.codex/AGENTS.md` |
