# 전역 에이전트 규칙 설치와 설정

2026-09-07에 공식 가이드와 이 저장소의 설치기를 대조했다. 규칙 정리는 모델 선택이나 권한 완화를 요구하지 않는다. 규칙 로드, 자동 대화 저장, 모델의 실제 준수 여부는 각각 확인한다.

## 설치 대상과 정본

| 런타임 | 설치 위치 | 저장소 정본 |
|---|---|---|
| Claude Code | `~/.claude/CLAUDE.md`의 MNEMO 관리 블록 | [claude-md-rules.md](../skills/mnemo/templates/claude-md-rules.md) |
| Codex | `<CODEX_HOME>/AGENTS.md`의 CODEX-MNEMO 관리 블록 | [agents-md-rules.md](../skills/codex-mnemo/templates/agents-md-rules.md) |
| Antigravity CLI | `~/.gemini/GEMINI.md`의 ANTIGRAVITY-MNEMO 관리 블록 | [gemini-md-rules.md](../skills/antigravity-mnemo/templates/gemini-md-rules.md) |
| Grok Build | `~/.grok/rules/grok-mnemo.md` 및 Claude 공통 규칙 | [grok-rules.md](../skills/grok-mnemo/templates/grok-rules.md) |

`CODEX_HOME` 미설정 시 `~/.codex`를 쓴다. `install.bat` 또는 `bash install.sh`는 각 Mnemo 설치기와 스킬 동기화를 호출한다. 재설치하면 관리 블록을 교체하고 블록 밖 개인 규칙은 유지한다. Grok 전용 규칙 파일은 설치기가 소유하며 전체 교체한다. 프로젝트 규칙 파일은 별도 범위다.

관리 블록 안의 사용자 수정도 교체 대상이다. 통합 설치기는 변경 전에 대상 규칙 파일과 Codex `config.toml`·Mnemo 알림 wrapper를 `~/.olympus/install-backups/`에 백업한다. 개별 Mnemo 설치기를 직접 실행하면 이 통합 백업 절차는 적용되지 않는다. 스킬 충돌본의 `_olympus-preserved` 보존 정책은 별도다.

## 설치 백업과 명시적 복원

`install.bat`·`bash install.sh`는 매 실행마다 고유 백업 디렉터리를 만들고 `manifest.json` 경로를 출력한다. 설치 전 파일은 `.before`, 설치 후 지문은 manifest, 검사 결과는 `verification.json`에 보관한다. 백업을 만들지 못하면 관리 파일 변경을 시작하지 않는다.

```bash
# 먼저 복원 대상 확인: 파일을 변경하지 않음
node scripts/install-state.js restore "<출력된 manifest.json 경로>"
# 확인한 스냅샷으로 복원
node scripts/install-state.js restore "<출력된 manifest.json 경로>" --apply
```

복원은 규칙 파일·Codex 설정·알림 wrapper의 **파일 전체**를 설치 직전으로 되돌린다. Codex `config.toml` 안의 MCP·스킬 설정도 함께 되돌아간다. 설치 후 내용과 현재 내용이 다르면 나중에 한 사용자 수정을 보존하기 위해 전체 복원을 중단한다. 강제 덮어쓰기 옵션은 없다. 재설치가 여러 번 있었다면 가장 최근 스냅샷부터 역순으로 복원한다.

이 명령은 전체 제거가 아니다. 스킬·일반 훅·Claude 및 Antigravity 설정 전체를 되돌리지 않으며, `--uninstall`도 이 스냅샷을 자동 복원하지 않는다. 설치 도중 실패해 완료 시점의 지문이 없는 `prepared` 스냅샷은 자동 복원하지 않는다. 해당 `.before` 파일을 현재 파일과 대조해 필요한 부분을 수동으로 복구한다. 백업에는 원래 설정값이 들어 있으므로 공유용 로그와 구분해 보관한다.

## v6.1.2에서 달라지는 지침

| 항목 | 새 기본값 |
|---|---|
| 응답 | 질문한 언어로 답하고, 주요 응답 끝에 검색 태그 3~7개를 남김 |
| 실행 범위 | 승인된 목표를 계속 진행하되 읽기 전용 요청에서는 기억·인계 문서도 직접 쓰지 않음 |
| 코드 탐색 | 코드맵이 있으면 인덱스와 관련 카테고리부터 확인 |
| 과거 작업 | 기억 → 대화 링크·태그 → 본문 → 프로젝트·기간을 좁힌 원본 확인; 태그 누락만으로 검색을 끝내지 않음 |
| 상세 절차 | 카탈로그의 정확한 스킬 원본을 읽고, 문서·핸드오프·검증은 작업 범위와 현재 CLI 기능에 맞춤 |

이 내용은 에이전트가 따르는 지침이다. `MNEMO_DISABLE` 같은 실행 설정과 달리 문장만으로 파일 접근이나 저장을 강제 차단하지는 않는다.

Claude는 기본 진입점으로 `CLAUDE.md`를 읽는다. 프로젝트 정본이 `AGENTS.md`라면 `@AGENTS.md` import로 연결할 수 있다. import도 시작 컨텍스트에 포함되므로 단순 파일 분할만으로 로드량이 줄지는 않는다. [Claude 공식 가이드](https://code.claude.com/docs/en/memory)

Antigravity는 전역 `GEMINI.md`와 프로젝트 규칙을 사용한다. 기존 네이티브 워크플로를 우선하고 Olympus가 추가하는 산출물·검증 계약만 붙인다. [규칙 가이드](https://antigravity.google/docs/rules-workflows), [CLI 가이드](https://www.antigravity.google/docs/cli/best-practices/)

Grok은 Claude 규칙·스킬도 호환 로드한다. 그래서 공통 본문은 Claude 정본에서 재사용하고 Grok 파일에는 역할·훅·복구 경로의 차이만 둔다. [Grok 공식 가이드](https://docs.x.ai/build/features/skills-plugins-marketplaces)

## 필수 조건과 선택 설정

| 항목 | 필요한 상태 | 설치·운영 시 처리 |
|---|---|---|
| 규칙 로드 | 실행 중인 CLI가 위 파일을 발견해야 함 | 설치 후 새 세션에서 확인. 별도의 언어·autonomy 환경변수는 없음 |
| Mnemo 자동 저장 | 해당 CLI의 훅 등록과 스크립트가 있고 실행 가능 | 설치기가 등록. `MNEMO_DISABLE=1/true/yes`이면 저장을 끄므로 사용자 의도를 확인 |
| Claude 훅 | `settings.json`의 Submit·Stop·관찰 훅이 활성 상태 | `disableAllHooks: true` 등의 실행 차단 설정은 별도 확인 |
| Codex 저장 | 현재 어댑터의 `config.toml` notify가 save-turn에 연결됨 | 아래 알림 설정의 교체·보존 조건을 확인. CLI 전체를 notify-only라고 단정하지 않음 |
| Antigravity 저장 | `~/.gemini/config/hooks.json`의 `olympus-antigravity-mnemo` Stop 등록 | 개별 훅의 `enabled: false` 여부도 확인 |
| Grok 공통 규칙·스킬 | Claude rules·skills 호환이 활성 상태 | 기본 호환을 이용. `grok inspect`로 실제 상태 확인; 꺼진 사용자 선택을 임의로 변경하지 않음 |
| 모델·추론 강도 | 현재 작업을 수행할 수 있는 설정 | 이 정리의 필수값이 아니므로 기존 선택 유지 |
| 권한·샌드박스 | 현재 사용자 정책 준수 | 규칙 적용을 위해 우회 플래그나 전역 승인 해제를 추가하지 않음 |
| Claude auto memory | Mnemo 설치 시 비활성화 | `autoMemoryEnabled=false`; 새 기억은 프로젝트에 저장. 기존 기록은 보존 |
| 스킬 opt-in | 기본 active/source-only 정책 | `--include-source-only-skills`는 선택. 모든 스킬 활성화는 필수 아님 |

Mnemo 설치기는 새 기억이 프로젝트 밖으로 분산되지 않도록 Claude 네이티브 auto memory를 비활성화한다. 이전 설정은 제거 시 복원하며, 기존 네이티브 기억과 CLI 원본 세션은 삭제하지 않는다. 프로젝트 설정이 이를 다시 활성화하지 않아야 한다. [Claude 기억 가이드](https://code.claude.com/docs/en/memory)
Antigravity 실행 정책은 `toolPermission`·`artifactReviewPolicy`·`enableTerminalSandbox`이고, 훅의 실행 여부는 별도 설정이다. [설정](https://www.antigravity.google/docs/cli/settings), [훅](https://www.antigravity.google/docs/hooks/)

`project_doc_max_bytes` 같은 Codex 로드 한도는 실제 누락·잘림을 확인했을 때 조정한다. `AGENTS.override.md`와 다른 `CODEX_HOME`도 확인 대상이며 무조건 한도를 올리지 않는다. [Codex 규칙 가이드](https://learn.chatgpt.com/docs/agent-configuration/agents-md)

커스텀 홈은 설치기와 CLI가 같은 디렉터리를 읽는지 확인한다. 현재 Claude 설치기는 `~/.claude`를 사용하므로 `CLAUDE_CONFIG_DIR`를 지정한 설치는 별도 대상 점검이 필요하다. `ANTIGRAVITY_HOME`·`GROK_HOME`은 이 저장소 설치기의 대체 경로이며 CLI 자체의 동일 변수 지원을 보장하지 않는다.

## Codex 설치기가 바꾸는 알림·애니메이션 설정

이번 문서·규칙 정리 이전부터 [Codex Mnemo 설치기](../skills/codex-mnemo/install.js)는 `notify`를 구성하고 `tui.notifications=false`를 설정한다.

설치·재설치 시 같은 전역 `config.toml`에 `tui.animations=false`와 `tui.whimsy=false`도 적용한다. `CODEX_HOME`이 있으면 해당 홈을 사용한다. 일반 터미널 애니메이션과 Astra 입력창의 별 효과를 끄며, Codex를 재시작해야 반영된다. 이 두 설정은 제거 후에도 유지된다. 다시 켜려면 두 값을 `true`로 바꾼다. 재설치하면 다시 `false`가 적용된다. `whimsy`의 의미는 [공식 설정 스키마](https://developers.openai.com/codex/config-schema.json)에서 확인할 수 있다.

- 기존 notify에 save-turn이 이미 연결돼 있으면 그 체인을 유지하고 필요한 셸 경로를 보정한다.
- save-turn 없이 데스크톱·IDE 알림 전용으로 판정된 notify는 Mnemo notify로 교체한다.
- 그 외 기존 notify는 생성한 Mnemo wrapper를 통해 함께 호출한다.
- 제거 시 `notify` 항목은 삭제된다. 이전 사용자 notify를 자동 복원하지 않으며, `[tui]` 테이블 안의 `notifications=false`는 남을 수 있다. 위 스냅샷 복원은 설치 직후 상태를 기준으로 하므로, 제거 등으로 설정이 바뀐 뒤에는 `.before`와 대조해 필요한 알림 항목을 수동 복원한다.

규칙 파일만 교체하는 작업과 전체 설치를 구분한다. 전체 설치는 훅·MCP·스킬 등록 설정도 관리하므로, 규칙 변경에 새 설정값이 필요 없다는 말이 기존 설정을 전혀 바꾸지 않는다는 뜻은 아니다.

<a id="customize-disable-remove"></a>

## 수정·저장 중지·제거

### 개인 규칙과 정본 수정

Claude·Codex·Antigravity는 각각 `<!-- MNEMO:START -->`, `<!-- CODEX-MNEMO:START -->`, `<!-- ANTIGRAVITY-MNEMO:START -->`부터 대응하는 `END`까지가 관리 구간이다. 개인 선호는 구간 밖에 쓴다. Grok의 `~/.grok/rules/grok-mnemo.md`는 전체가 관리 파일이므로 `~/.grok/rules/my-preferences.md`처럼 별도 파일을 사용한다.

프로젝트별 기준은 프로젝트 규칙에 둔다. 전역의 “항상 한국어로 답하기”와 질문 언어 응답이 충돌한다면 사용자가 선택한 기준을 명확히 한다. 예를 들어 “한국어로 답할 때는 존댓말 사용”은 다른 언어의 응답도 허용한다. 설치기는 개인 문장을 자동으로 바꾸지 않는다.

설치 기본값 자체를 바꾸려면 위 표의 정본 템플릿을 관리 중인 체크아웃에서 수정하고 재설치한다. 상위 저장소 업데이트와 충돌할 수 있으므로 변경 이력을 유지한다. 설치본만 직접 수정하면 다음 설치에서 덮어쓴다.

### 자동 저장만 중지

새 CLI를 시작하는 셸에서 설정한다. 이미 실행 중인 CLI에는 소급 적용되지 않는다.

```powershell
# PowerShell: 이 셸에서 시작하는 CLI에 적용
$env:MNEMO_DISABLE = "1"
codex
```

```bash
# macOS/Linux: 이 프로세스에 적용
MNEMO_DISABLE=1 codex
```

`codex` 대신 사용할 CLI를 실행한다. 이 변수는 Mnemo 저장 훅의 opt-out이다. 에이전트의 명시적 기억·핸드오프 작성이나 CLI 고유 세션 기록을 중단하지 않는다. 규칙만 제거해도 저장 훅은 남으며, `<private>` 표시 역시 모든 저장소의 삭제를 보장하지 않는다.

### 제거 범위 선택

- **규칙만 제거:** 해당 관리 마커 구간을 제거한다. Grok 전용 규칙은 관리 파일을 제거하되, Claude 공유 규칙은 계속 로드될 수 있음을 `grok inspect`로 확인한다. Claude 공통 파일을 수정하면 Claude도 영향을 받는다.
- **Mnemo 어댑터 제거:** 저장소 루트에서 아래 명령 중 해당 CLI를 선택한다. 어댑터가 소유한 훅·규칙을 제거하며 스킬 라이브러리나 다른 설치기가 등록한 공통 훅까지 모두 제거하는 명령은 아니다.

```bash
node skills/mnemo/install.js --uninstall
node skills/codex-mnemo/install.js --uninstall
node skills/antigravity-mnemo/install.js --uninstall
node skills/grok-mnemo/install.js --uninstall
```

- **Olympus 전체 제거:** Windows는 `install.bat --uninstall`, macOS/Linux는 `bash install.sh --uninstall`을 사용한다. CLI별 선택·스킬 보존본·수동 복원 범위는 [마이그레이션 가이드](skill-registry-migration.md)를 따른다.

제거 후에도 프로젝트의 `conversations/`, `MEMORY.md`, `memory/`, `docs/handoffs/`와 CLI 원본 세션은 남는다. 삭제는 사용자가 필요한 기록을 판단한 뒤 별도로 수행한다. 다시 설치하면 기본 규칙과 훅이 돌아오므로 영구적인 설치 opt-out으로 오해하지 않는다.

## 검증

통합 설치 마지막에 관리 블록의 정본 일치·마커 1쌍·블록 밖 개인 내용 보존, 어댑터 등록, 설치 훅 파일 일치를 자동 검사한다. 별도 프로젝트에서 설치된 훅을 실행해 사용자·응답 저장, 비공개 태그 가림, 중복 방지, 기억 scaffold, `MNEMO_DISABLE`도 확인하고 임시 프로젝트는 정리한다. 필수 검사가 실패하면 설치 완료 문구를 출력하지 않고 실패 코드로 종료한다.

`MNEMO_DISABLE`이 켜졌거나 설치 홈이 저장 훅에서 제외하는 OS 임시 디렉터리에 있으면 실행 검사는 `NOT RUN`으로 기록한다. Grok 홈이 없어 어댑터를 건너뛴 경우도 별도 표시한다. 이 검사는 설치 훅을 직접 호출하는 검증이며, CLI 자체의 이벤트 전달·모델의 규칙 준수·외부 MCP 연결을 인증하지 않는다.

저장소 루트에서 설치 상태를 읽기 전용으로 점검한다.

```bash
node skills/mnemo/install.js --check
node skills/codex-mnemo/install.js --check
node skills/antigravity-mnemo/install.js --check
node skills/grok-mnemo/install.js --check
grok inspect
```

Claude는 새 세션의 `/context`·`/memory`, Antigravity는 `/context`·`/hooks`에서 로드 상태를 확인한다. Grok의 `inspect`는 규칙 파일과 호환 상태를 보여준다. [Grok 규칙 확인](https://docs.x.ai/build/features/project-rules)

`--check` 통과는 설치 파일·등록 검사다. 실제 저장은 새 턴 후 `conversations/` 결과로, 검색 순서 준수는 메모리·태그 누락 사례를 포함한 별도 세션으로 검증한다. 설치 검사만으로 모든 런타임 분기의 실행을 인증하지 않는다.

## 원본 복구의 차이

네 CLI 모두 기억 → 대화 링크·태그 → 본문 → 범위를 좁힌 원본 확인 순서를 따른다. 상세 절차는 각 Mnemo 스킬을 읽는다.

- Claude: `reconcile_conversations.py`가 assistant 텍스트를 복구한다. 프로젝트와 날짜를 지정한다. `--dry-run`은 쓰기 예정 요약이다.
- Codex: `reconcile_codex_conversations.py`의 현재 파서와 인수를 사용한다. `--dry-run`은 대화 텍스트 추출 명령이 아니다.
- Antigravity: `latestTurn(payload)`는 마지막 사용자·모델 쌍 추출용이다. 이전 턴 전체를 복구하는 CLI는 없다.
- Grok: 현재 Mnemo에 일괄 복구 CLI가 없다. 다른 CLI용 reconcile을 대신 실행하지 않는다.

읽기 전용 요청에서는 복구 파일을 쓰거나 저장 훅을 재실행하지 않는다. 필요한 원본 텍스트만 파싱하고, 가능한 추출 경로가 없으면 확인 범위와 한계를 보고한다.
