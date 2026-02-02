# 장기기억 스킬 설치 가이드

## 빠른 설치 (3단계)

### 1. 파일 복사

```bash
# 프로젝트 루트에서 실행
mkdir -p .claude/skills/long-term-memory
mkdir -p .claude/conversations

# 스킬 파일 복사
cp -r path/to/long-term-memory/* .claude/skills/long-term-memory/

# 훅 스크립트 복사
cp .claude/skills/long-term-memory/hooks/* hooks/
```

### 2. CLAUDE.md 설정

프로젝트 루트에 `CLAUDE.md` 파일 생성 (또는 기존 파일에 추가):

```bash
# CLAUDE.md.snippet 내용을 CLAUDE.md에 복사
cat .claude/skills/long-term-memory/CLAUDE.md.snippet >> CLAUDE.md
```

### 3. 훅 설정

`.claude/settings.local.json` 파일에 추가:

**Windows (PowerShell):**
```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "description": "대화 로그 저장",
        "hooks": ["powershell -ExecutionPolicy Bypass -File hooks/save-conversation.ps1 \"$PROMPT\""]
      }
    ],
    "Stop": [
      {
        "description": "키워드 추출 + 메모리 업데이트",
        "hooks": ["powershell -ExecutionPolicy Bypass -File hooks/update-memory.ps1"]
      }
    ]
  }
}
```

**Linux/Mac (Bash):**
```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "hooks": ["bash hooks/save-conversation.sh \"$PROMPT\""]
      }
    ],
    "Stop": [
      {
        "hooks": ["bash hooks/update-memory.sh"]
      }
    ]
  }
}
```

---

## 설치 확인

### 1. MEMORY.md 생성

프로젝트 루트에 `MEMORY.md` 파일 생성:

```markdown
# MEMORY.md - 프로젝트 장기기억

이 파일은 Claude Code가 세션 간에 기억해야 할 정보를 저장합니다.

---

## 프로젝트 컨텍스트

- 프로젝트: [프로젝트명]
- 생성일: [날짜]

## 중요한 결정사항

(자동으로 추가됨)

## 학습된 교훈

(자동으로 추가됨)

## 작업 패턴

(자동으로 추가됨)
```

### 2. 테스트

```
# Claude Code에서 테스트
/memory add 테스트 메모입니다

# 확인
/memory list
```

---

## 디렉토리 구조

설치 완료 후 프로젝트 구조:

```
프로젝트/
├── CLAUDE.md                      # @MEMORY.md 참조 + 규칙
├── MEMORY.md                      # 장기기억 저장소
├── hooks/
│   ├── save-conversation.ps1      # 대화 저장 (Windows)
│   ├── save-conversation.sh       # 대화 저장 (Linux/Mac)
│   ├── update-memory.ps1          # 메모리 업데이트 (Windows)
│   └── update-memory.sh           # 메모리 업데이트 (Linux/Mac)
├── .claude/
│   ├── settings.local.json        # 훅 설정
│   ├── skills/
│   │   └── long-term-memory/      # 스킬 파일
│   └── conversations/             # 대화 로그 (자동 생성)
│       ├── 2026-02-02.md
│       └── index.json
```

---

## 사용법

### 기본 명령어

| 명령어 | 설명 |
|--------|------|
| `/memory add <내용>` | MEMORY.md에 정보 저장 |
| `/memory find <키워드>` | 키워드로 이전 대화 검색 |
| `/memory search <키워드>` | MEMORY.md 내 검색 |
| `/memory tag <키워드들>` | 오늘 대화에 키워드 추가 |
| `/memory read <날짜>` | 특정 날짜 대화 읽기 |
| `/memory list` | 전체 기억 보기 |

### 자동 동작

1. **대화 저장**: 모든 프롬프트가 `.claude/conversations/`에 자동 저장
2. **키워드 태깅**: Claude가 응답할 때 자동으로 키워드 추출
3. **메모리 업데이트**: 세션 종료 시 MEMORY.md 자동 정리

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

`.claude/conversations/` 폴더가 있는지 확인:
```bash
mkdir -p .claude/conversations
```

### 키워드가 저장 안됨

CLAUDE.md에 `@MEMORY.md` 참조와 키워드 태깅 규칙이 있는지 확인.

---

**문서 버전:** 1.0.0
**최종 업데이트:** 2026-02-02
