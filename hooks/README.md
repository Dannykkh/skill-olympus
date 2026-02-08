# Claude Code Hooks

Claude Code 훅 스크립트 모음입니다.

## 환경별 사용법

### Windows (Git Bash 설치됨)
```json
{
  "hooks": {
    "UserPromptSubmit": [
      { "command": "bash hooks/save-conversation.sh \"$PROMPT\"" }
    ],
    "PreToolUse": [
      { "matcher": "Write", "command": "bash hooks/protect-files.sh \"$TOOL_INPUT\"" }
    ]
  }
}
```

### Windows (PowerShell만 사용)
```json
{
  "hooks": {
    "UserPromptSubmit": [
      { "command": "powershell -ExecutionPolicy Bypass -File hooks/save-conversation.ps1 \"$PROMPT\"" }
    ],
    "PreToolUse": [
      { "matcher": "Write", "command": "powershell -ExecutionPolicy Bypass -File hooks/protect-files.ps1 \"$TOOL_INPUT\"" }
    ]
  }
}
```

### Mac/Linux
```json
{
  "hooks": {
    "UserPromptSubmit": [
      { "command": "bash hooks/save-conversation.sh \"$PROMPT\"" }
    ],
    "PreToolUse": [
      { "matcher": "Write", "command": "bash hooks/protect-files.sh \"$TOOL_INPUT\"" }
    ]
  }
}
```

## 훅 목록

| 파일 | 용도 | 이벤트 |
|------|------|--------|
| save-conversation | 사용자 입력 저장 | UserPromptSubmit |
| save-response | Assistant 응답 저장 (코드 블록 제거, 2000자) | Stop |
| orchestrator-detector.js | PM/Worker 모드 감지 | UserPromptSubmit |
| protect-files | 중요 파일 보호 | PreToolUse (Write/Edit) |
| check-new-file | 새 파일 생성 검토 | PreToolUse (Write) |
| validate-code | 코드 품질 검사 | PostToolUse (Write/Edit) |
| validate-api | API 파일 검증 | PostToolUse (Write/Edit) |
| validate-docs | 문서 AI 패턴 검출 | PostToolUse (Write) |
| format-code | 자동 코드 포맷팅 (Python/TS/JS/Java/CSS) | PostToolUse (Write/Edit) |

## 예시 설정 파일

| 환경 | 파일 |
|------|------|
| Bash (Git 있음) | `settings.example.json` |
| PowerShell (Git 없음) | `settings.example.powershell.json` |

## 주의사항

1. **줄바꿈**: `.sh` 파일은 반드시 LF (Unix) 줄바꿈이어야 합니다.
   - `.gitattributes`에서 자동 관리됨
   - Windows에서 CRLF로 저장하면 오류 발생

2. **PowerShell 실행 정책**: `-ExecutionPolicy Bypass` 플래그 필요

3. **의존성**:
   - `.sh` 파일: Git Bash 또는 WSL 필요
   - `.ps1` 파일: PowerShell 5.1+ (Windows 기본 포함)
   - `jq`: JSON 파싱용 (bash 스크립트에서 사용)

## 환경 확인 방법

```cmd
REM Git Bash 설치 여부 확인
where bash
```

결과가 나오면 → `.sh` 사용 가능
오류 발생 → `.ps1` 사용
