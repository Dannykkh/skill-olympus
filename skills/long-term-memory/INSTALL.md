# 장기기억 스킬 설치 가이드

## 빠른 설치 (3단계)

### 1. 파일 복사

```bash
# 훅 복사
mkdir -p hooks
cp skills/long-term-memory/hooks/save-conversation.ps1 hooks/  # Windows
cp skills/long-term-memory/hooks/save-conversation.sh hooks/   # Linux/Mac

# 대화 폴더 생성
mkdir -p .claude/conversations
```

### 2. CLAUDE.md 설정

```bash
# CLAUDE.md.snippet 내용을 CLAUDE.md에 추가
cat skills/long-term-memory/CLAUDE.md.snippet >> CLAUDE.md
```

### 3. 훅 등록

`.claude/settings.local.json`:

**Windows:**
```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "matcher": ".*",
        "hooks": [{
          "type": "command",
          "command": "powershell -ExecutionPolicy Bypass -File hooks/save-conversation.ps1 \"$PROMPT\""
        }]
      }
    ]
  }
}
```

**Linux/Mac:**
```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "matcher": ".*",
        "hooks": [{
          "type": "command",
          "command": "bash hooks/save-conversation.sh \"$PROMPT\""
        }]
      }
    ]
  }
}
```

---

## MEMORY.md 생성

프로젝트 루트에 `MEMORY.md` 파일 생성:

```markdown
# MEMORY.md - 프로젝트 장기기억

## 프로젝트 목표

| 목표 | 상태 |
|------|------|
| (목표 추가) | 🔄 진행중 |

---

## 키워드 인덱스

| 키워드 | 섹션 |
|--------|------|

---

## architecture/

## patterns/

## gotchas/

---

## meta/
- **프로젝트**: [프로젝트명]
- **생성일**: [날짜]
```

---

## 설치 확인

```
# Claude Code에서 테스트
기억해: 테스트 메모입니다

# 확인
장기기억 보여줘
```

---

## 디렉토리 구조

설치 완료 후:

```
프로젝트/
├── CLAUDE.md                    # @MEMORY.md 참조
├── MEMORY.md                    # 컨텍스트 트리
├── hooks/
│   └── save-conversation.ps1    # 대화 저장 (30줄)
└── .claude/
    ├── settings.local.json      # 훅 설정
    └── conversations/           # 대화 로그
```

---

## 트러블슈팅

### 훅이 실행 안됨

**Windows:**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

**Linux/Mac:**
```bash
chmod +x hooks/*.sh
```

### 대화 파일이 생성 안됨

```bash
mkdir -p .claude/conversations
```

---

**최종 업데이트:** 2026-02-03
