# Claude Code 응답 완료 알림 — IDE 연동 가이드

linuxserverai IDE에서 Claude Code의 응답 완료를 감지하기 위한 구현 가이드.

## 개요

Claude Code는 **글로벌 훅 + 프로젝트 로컬 훅**을 모두 실행합니다.
IDE 연동은 프로젝트 로컬 훅으로 처리합니다.

```
응답 완료 → Stop 이벤트
  → 글로벌 훅 실행 (save-response, loop-stop 등)
  → 프로젝트 로컬 훅 실행 (.claude/settings.json)
     → ide-response-notify 실행
     → IDE가 감지
```

---

## 구현

### 1. 훅 스크립트 (프로젝트 로컬)

IDE가 프로젝트의 `.claude/hooks/`에 이 파일을 생성합니다.

**Windows (PowerShell):**

```powershell
# .claude/hooks/ide-response-notify.ps1
$ErrorActionPreference = "SilentlyContinue"

try {
    $hookInput = $input | Out-String
    $hook = $hookInput | ConvertFrom-Json

    $projectPath = if ($hook.cwd) { $hook.cwd } else { $PWD.Path }
    $sessionId = if ($hook.session_id) { $hook.session_id } else { "" }

    # IDE에 알리는 방법 (택 1)
    # 방법 A: 신호 파일
    $signalDir = Join-Path $projectPath ".claude"
    $signal = @{
        project   = $projectPath
        sessionId = $sessionId
        timestamp = (Get-Date -Format "o")
    } | ConvertTo-Json -Compress
    [System.IO.File]::WriteAllText(
        (Join-Path $signalDir "response-done.json"),
        $signal,
        [System.Text.Encoding]::UTF8)

    # 방법 B: UDP (IDE가 리스너를 돌리는 경우)
    # $bytes = [System.Text.Encoding]::UTF8.GetBytes($signal)
    # $udp = [System.Net.Sockets.UdpClient]::new()
    # $udp.Send($bytes, $bytes.Length, "127.0.0.1", 9999) | Out-Null
    # $udp.Dispose()
} catch {}

exit 0
```

**Linux/Mac (Bash):**

```bash
#!/bin/bash
# .claude/hooks/ide-response-notify.sh
INPUT=$(cat)
PROJECT_PATH=$(echo "$INPUT" | jq -r '.cwd // empty' 2>/dev/null)
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // empty' 2>/dev/null)
TIMESTAMP=$(date -Iseconds)

# 신호 파일 생성
cat > "$PROJECT_PATH/.claude/response-done.json" << EEOF
{"project":"$PROJECT_PATH","sessionId":"$SESSION_ID","timestamp":"$TIMESTAMP"}
EEOF

exit 0
```

### 2. 프로젝트 로컬 settings.json

IDE 설치 시 프로젝트의 `.claude/settings.json`에 등록합니다.

```json
{
  "hooks": {
    "Stop": [
      {
        "type": "command",
        "command": "powershell -ExecutionPolicy Bypass -File .claude/hooks/ide-response-notify.ps1"
      }
    ]
  }
}
```

> 기존 Stop 훅이 있으면 배열에 **추가** (덮어쓰기 아님).

### 3. IDE 쪽 — 감지

**방법 A: FileSystemWatcher (신호 파일 감시)**

```csharp
// 프로젝트별로 watcher 생성
var watcher = new FileSystemWatcher
{
    Path = Path.Combine(projectPath, ".claude"),
    Filter = "response-done.json",
    EnableRaisingEvents = true
};

watcher.Changed += (s, e) =>
{
    var json = File.ReadAllText(e.FullPath);
    var evt = JsonSerializer.Deserialize<ResponseEvent>(json);
    Dispatcher.Invoke(() => ShowNotification(evt));
};
```

**방법 B: UDP (여러 프로젝트 통합 감지)**

```csharp
// 하나의 리스너로 모든 프로젝트 수신
var udp = new UdpClient(9999);
while (true)
{
    var result = await udp.ReceiveAsync();
    var json = Encoding.UTF8.GetString(result.Buffer);
    var evt = JsonSerializer.Deserialize<ResponseEvent>(json);
    Dispatcher.Invoke(() => FindTab(evt.Project).ShowNotification());
}
```

### 어떤 방법을 선택할지

| | 방법 A (파일) | 방법 B (UDP) |
|---|---|---|
| **프로젝트 1개** | 간단 | 과함 |
| **프로젝트 여러 개** | watcher 여러 개 | 리스너 1개로 통합 |
| **IDE가 서버 돌려야?** | 아니오 | 아니오 (수신만) |
| **구현 복잡도** | 매우 간단 | 간단 |

---

## 데이터 흐름

```
Claude Code 응답 완료
  ↓
Stop 이벤트
  ↓
글로벌 훅: save-response (mnemo 저장)     ← 기존, 건드리지 않음
로컬 훅: ide-response-notify              ← IDE가 등록
  ↓
.claude/response-done.json 생성 (또는 UDP)
  ↓
IDE FileSystemWatcher (또는 UdpClient)
  ↓
해당 탭에 알림
```

## 주의사항

- 로컬 훅이므로 **이 프로젝트에서만** 동작 (다른 프로젝트 영향 없음)
- `exit 0`이므로 실패해도 Claude Code 동작에 영향 없음
- IDE가 꺼져 있으면 신호 파일만 남고, 다음에 IDE가 읽으면 됨
- 글로벌 훅(skill-olympus)은 수정 불필요
