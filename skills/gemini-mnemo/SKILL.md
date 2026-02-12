---
name: gemini-mnemo
description: Gemini CLI용 장기기억 시스템. AfterAgent 훅으로 대화 자동 저장, 키워드 태깅, 과거 검색.
triggers:
  - "gemini 기억"
  - "gemini memory"
  - "gemini-mnemo"
auto_apply: false
---

# Gemini-Mnemo - Gemini CLI 기억 시스템

> 기억의 여신 Mnemosyne에서 유래. Claude Code용 Mnemo를 Gemini CLI에 이식.

Gemini CLI 세션 간 컨텍스트 유지를 위한 장기기억 시스템입니다.

## 설치

```bash
node skills/gemini-mnemo/install.js              # 설치
node skills/gemini-mnemo/install.js --uninstall  # 제거
```

---

## 3종 Mnemo 비교

| | Claude Code (Mnemo) | Codex CLI (Codex-Mnemo) | Gemini CLI (Gemini-Mnemo) |
|---|---|---|---|
| 훅 | 2개 (Submit + Stop) | 1개 (notify) | **1개** (AfterAgent) |
| 데이터 전달 | stdin + transcript JSONL | argv JSON | **stdin JSON** |
| 페이로드 | prompt / transcript 파싱 | input-messages / last-assistant-message | **prompt / prompt_response** |
| 설정 형식 | settings.json | config.toml | **settings.json** (Claude와 동일!) |
| 규칙 파일 | CLAUDE.md | AGENTS.md | **AGENTS.md** |
| 저장 경로 | `.claude/conversations/` | `.codex/conversations/` | **`.gemini/conversations/`** |
| 중복 방지 | 타임스탬프 | turn-id | **타임스탬프** |

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
gemini-mnemo/
├── SKILL.md                     # 이 파일
├── install.js                   # 설치/제거 스크립트
├── hooks/
│   ├── save-turn.ps1            # Windows AfterAgent 스크립트
│   └── save-turn.sh             # Linux/Mac AfterAgent 스크립트
└── templates/
    └── agents-md-rules.md       # AGENTS.md 주입 규칙
```

---

## 동작 흐름

```
Gemini CLI 대화
    ↓
[AfterAgent 이벤트]
    → stdin JSON 페이로드 수신
    → prompt → User 입력 추출
    → prompt_response → Assistant 응답 추출
    → 코드 블록 제거 + 2000자 제한
    → .gemini/conversations/YYYY-MM-DD.md에 append
    → 타임스탬프 기반 중복 방지
```

---

## 저장 위치

| 파일 | 위치 |
|------|------|
| 대화 로그 | `.gemini/conversations/YYYY-MM-DD.md` |
| 의미기억 | `MEMORY.md` (프로젝트 루트) |
| 훅 | `~/.gemini/hooks/save-turn.ps1\|.sh` |
| 설정 | `~/.gemini/settings.json` |
| 규칙 | `~/.gemini/AGENTS.md` |
