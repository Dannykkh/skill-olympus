# IDE Integration Guide

이 문서는 Claude Code, Codex, Gemini를 IDE에서 관찰할 때의 지원 범위를 정리합니다.

## Policy

기본 설치는 데스크톱/IDE 응답 완료 알림을 제공하지 않습니다.

- `ide-response-notify.*`, `ddingdong-noti.*`, `BurntToast`, `notify-send`, UDP 신호 전송을 설치하지 않습니다.
- CLI 훅은 Mnemo 저장, Chronos 재개, 사후 검증처럼 실제 워크플로우에 필요한 작업만 수행합니다.
- IDE는 새 훅을 추가하지 않고 프로젝트 로컬 산출물을 읽어 상태를 갱신합니다.
- Codex의 `notify`는 Codex lifecycle entrypoint입니다. 데스크톱 알림이 아니라 `save-turn` 실행 경로로만 사용합니다.

## Supported Artifacts

IDE가 읽어도 되는 파일은 아래로 제한합니다.

| 파일 | 용도 | 비고 |
|---|---|---|
| `conversations/YYYY-MM-DD.md` | 저장된 대화 확인 | Mnemo가 turn 단위로 갱신 |
| `MEMORY.md` | 장기기억 인덱스 확인 | 100줄/5KB 이하 유지 |
| `memory/*.md` | 정제된 장기기억 확인 | 필요한 항목만 읽기 |
| `memory/.mnemo-status.md` | Mnemo 정리 필요 여부 확인 | 임계값 도달 시 생성/갱신 |

`loop-state.md`는 Chronos 내부 상태입니다. IDE에서 읽기 전용 표시를 할 수는 있지만, 일반적인 응답 완료 감지나 사용자 알림 용도로 사용하지 않습니다. 수정하거나 삭제하면 자동 재개 흐름이 깨질 수 있습니다.

## CLI Behavior

### Claude Code

Claude Code는 native hook 이벤트가 있습니다. 이 저장소에서는 Mnemo 저장, Chronos, 검증 훅에 사용합니다.

IDE 연동을 위해 별도의 `Stop` 훅을 추가하지 않습니다. 응답 이력은 Mnemo가 갱신하는 `conversations/` 파일에서 확인합니다.

### Codex

Codex는 `notify` 설정 하나가 lifecycle entrypoint입니다.

지원되는 흐름:

```text
Codex turn complete
  -> notify
  -> save-turn
  -> Mnemo 저장
  -> 선택적 Chronos/codex-hook-bridge 체인
```

`notify` 체인에 데스크톱 알림, 소리, IDE 팝업, UDP 전송을 추가하지 않습니다. UI 알림도 끕니다.

```toml
tui.notifications = false
```

### Gemini

Gemini도 Mnemo 저장 경로를 통해 대화 산출물을 갱신합니다. Claude 전용 `Stop` 훅이나 Codex 전용 `notify` 설정을 그대로 복사하지 않습니다.

## IDE Read Model

IDE가 상태를 보여줘야 한다면 파일 감시만 사용합니다.

권장 감시 대상:

```text
conversations/
MEMORY.md
memory/.mnemo-status.md
```

감시 동작:

1. 현재 프로젝트의 git root를 기준으로 경로를 계산합니다.
2. `conversations/YYYY-MM-DD.md`의 변경을 감지하면 대화 패널을 갱신합니다.
3. `memory/.mnemo-status.md`가 생기거나 바뀌면 정리 필요 상태만 표시합니다.
4. 사용자가 요청하지 않는 한 팝업, 소리, 토스트를 띄우지 않습니다.

## Removed Legacy Design

이전 설계는 응답 완료 시 별도 훅이 `.claude/response-done.json`을 쓰거나 UDP로 IDE에 신호를 보냈습니다. 이 방식은 제거되었습니다.

제거 대상:

- `.claude/hooks/ide-response-notify.ps1`
- `.claude/hooks/ide-response-notify.sh`
- `.claude/settings.json`의 `ide-response-notify` `Stop` 훅 등록
- `ddingdong-noti.*`
- `BurntToast`, `notify-send`, `ShowBalloonTip` 기반 알림
- 응답 완료 감지용 UDP 리스너

## Migration Check

프로젝트와 전역 설치본에서 아래 패턴이 남아 있으면 제거합니다.

```powershell
rg -n "ide-response-notify|ddingdong-noti|BurntToast|notify-send|ShowBalloonTip|response-done\.json" .
```

Codex는 설치 점검으로 데스크톱/IDE 알림이 `save-turn` 앞뒤에 남아 있지 않은지 확인합니다.

```powershell
node skills/codex-mnemo/install.js --check
```
