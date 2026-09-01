# 스킬 레지스트리 마이그레이션

Olympus의 기본 설치는 기존 스킬 디렉터리를 통째로 지우지 않습니다. 현재 Olympus가
알고 있는 이름만 새 활성/source-only 정책에 맞춰 조정하고, 이름이 다른 외부·개인
스킬은 그대로 둡니다.

## 설치 전에 알아둘 것

| 기존 항목 | 기본 설치 결과 |
|---|---|
| 이름이 다른 외부·개인 스킬 | 그대로 유지 |
| 현재 활성 allowlist에 있는 Olympus 스킬 | 현재 버전으로 갱신 |
| 현재 source-only가 된 Olympus 스킬 | 활성 디렉터리에서 제외하고 `.olympus/source-skills`에 게시 |
| Olympus와 이름이 같은 수정본·외부 스킬 | `_olympus-preserved/<timestamp>/`로 이동 후 Olympus 정책 적용 |
| 폐기된 구 Olympus 항목 | `_pruned-stale-olympus/<timestamp>/`로 이동 |

같은 이름의 두 스킬을 자동 병합하지는 않습니다. Olympus와 이름이 겹치는 외부 스킬을
계속 활성화하려면 복구 후 디렉터리 이름과 `SKILL.md`의 `name`을 고유한 이름으로 함께
바꾸세요. 설치된 Olympus 사본을 직접 수정하면 다음 동기화 때 다시 보존·교체될 수
있으므로, Olympus 자체 변경은 저장소 원본에서 해야 합니다.

## 권장 업데이트

### Windows

```powershell
git pull
.\install.bat --all
```

### macOS/Linux

```bash
git pull
./install.sh --all
```

이 명령은 현재의 가벼운 기본값을 적용합니다. Claude/Grok 공유 표면에는 21개,
Codex와 Antigravity에는 각각 20개의 Olympus 스킬이 활성화되고, 나머지 공개 source-only 76개는 필요할 때
읽을 수 있는 source-only 라이브러리로 남습니다.

OpenClaw과 Hermes Agent는 기본 네 CLI 설치에 포함되지 않습니다. 호스트별 skills-only 설치기는
런타임 어댑터 여섯 개를 제외하고 활성 18개와 source-only 76개를 설치합니다.

```powershell
.\install-openclaw.bat
.\install-hermes.bat
```

## 원하는 상태로 재설정

| 목적 | 추가 옵션 |
|---|---|
| 가벼운 기본 구성 | 옵션 없음 |
| source-only 76개까지 모두 활성 등록 | `--include-source-only-skills` |
| 기존 범용 코딩 가이드 8개만 추가 활성 | `--include-broad-coding-skills` |
| 레거시 에이전트 참고 파일 복사 | `--include-source-only-agents` |

예를 들어 Windows에서 모든 호환 스킬을 다시 활성화하려면 다음과 같이 실행합니다.

```powershell
.\install.bat --all --include-source-only-skills
```

다시 가벼운 구성으로 돌아가려면 옵션 없이 재실행합니다.

```powershell
.\install.bat --all
```

`--include-source-only-skills`는 Olympus의 source-only 원본을 활성 레지스트리에 추가하는
옵션이지, `_olympus-preserved`에 보관된 사용자 충돌본을 복원하는 옵션은 아닙니다.
`--include-source-only-agents`는 호환성 확인용 Markdown 참고 파일을 복사합니다. Codex에서는
이 파일이 네이티브 `.toml` 에이전트로 활성화되는 것이 아닙니다.

## 충돌본 확인과 복구

보존된 충돌본은 각 CLI 홈 아래에 있습니다.

```text
~/.claude/_olympus-preserved/
~/.codex/_olympus-preserved/
~/.gemini/_olympus-preserved/       # Antigravity가 사용하는 Google 공용 홈
~/.openclaw/_olympus-preserved/     # OpenClaw skills-only 설치
~/.hermes/_olympus-preserved/       # Hermes Agent skills-only 설치

~/.claude/_pruned-stale-olympus/
~/.codex/_pruned-stale-olympus/
~/.gemini/_pruned-stale-olympus/    # Antigravity가 사용하는 Google 공용 홈
```

Windows에서는 다음 명령으로 보존된 스킬을 확인할 수 있습니다.

```powershell
Get-ChildItem "$env:USERPROFILE\.claude\_olympus-preserved" -Recurse -Filter SKILL.md -ErrorAction SilentlyContinue
Get-ChildItem "$env:USERPROFILE\.codex\_olympus-preserved" -Recurse -Filter SKILL.md -ErrorAction SilentlyContinue
Get-ChildItem "$env:USERPROFILE\.gemini\_olympus-preserved" -Recurse -Filter SKILL.md -ErrorAction SilentlyContinue
Get-ChildItem "$env:USERPROFILE\.openclaw\_olympus-preserved" -Recurse -Filter SKILL.md -ErrorAction SilentlyContinue
Get-ChildItem "$env:USERPROFILE\.hermes\_olympus-preserved" -Recurse -Filter SKILL.md -ErrorAction SilentlyContinue
```

복구할 때는 해당 폴더를 대상 CLI의 `skills/` 아래에 복사합니다. Olympus 이름과 충돌했던
스킬은 다시 같은 이름으로 넣으면 다음 동기화에서 또 이동되므로, 디렉터리와 frontmatter
`name`을 함께 고유하게 바꾸는 것이 안전합니다.

현재 자동 `restore` 명령이나 설치 전체를 되돌리는 트랜잭션 rollback은 없습니다.
동기화가 실패하면 설치기는 실패로 종료하고 충돌본은 위 경로에 남기지만, 정확한 설치 전
상태가 필요하면 보존본에서 수동으로 복구해야 합니다.

## 제거 후 다시 설치

Olympus가 관리하는 구성을 제거하고 처음부터 다시 적용하려면 다음 순서를 사용합니다.

```powershell
.\install.bat --uninstall
.\install.bat --all
```

macOS/Linux에서는 `./install.sh`를 사용합니다. 최상위 설치기의 안전한 제거 옵션은
`--uninstall`입니다. 자산 동기화 스크립트의 내부 `--unlink`와 혼동하지 마세요.

전체 제거는 스킬뿐 아니라 Olympus가 등록한 훅과 기본 MCP 이름도 정리합니다. 사용자가
같은 이름으로 별도 등록한 MCP가 있다면 제거 후 다시 등록해야 할 수 있습니다.
