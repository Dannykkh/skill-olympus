# Mnemo 프로젝트 저장 경계

기억과 대화 사본, 핸드오프는 작업 프로젝트 하나의 루트 안에 보관한다.
저장 전에 루트를 절대경로로 확정하고, 폴더를 바꾼 뒤에도 그 경로를 기준으로 쓴다.

| 산출물 | 확정된 루트 기준 경로 |
|---|---|
| 기억 인덱스 | `MEMORY.md` |
| 정제 기억·관찰 | `memory/` |
| 대화 사본·도구 로그·중복 인덱스 | `conversations/` |
| 인계 문서 | `docs/handoffs/` |

## 루트 판별

1. 실제 파일 트리의 가장 가까운 `.git` 디렉터리 또는 worktree의 `.git` 파일을 찾는다.
   `GIT_DIR`, `GIT_WORK_TREE` 등 상속된 설정이나 Git 실행 파일의 유무로 저장 위치를 바꾸지 않는다.
2. Git이 없으면 훅 payload에 명시된 workspace를 사용한다. `cwd`만 있는 경우에는 현재·상위
   폴더의 `.mnemo-root`가 필요하다. `MEMORY.md`, `conversations/`, `build/` 같은 이름은 루트 근거가 아니다.
3. 확인되지 않은 일반 폴더와 HOME, 파일시스템 루트, CLI 설정 디렉터리에는 기록하지 않는다.
   훅 실행 폴더나 프로젝트들의 상위 폴더를 대체 저장소로 사용하지 않는다.
4. Antigravity의 workspace가 여러 개면 현재 `cwd`가 속한 한 프로젝트를 선택한다.
   소속이 모호하면 첫 항목으로 추측하지 않고 저장을 건너뛴다.
5. 저장 폴더·파일의 junction/symlink가 프로젝트 밖으로 이어지면 쓰기 전에 중단한다.

`.mnemo-root`는 내용이 빈 파일이며 절대경로를 저장하지 않는다. 프로젝트와 함께 이동한다.
Git이 없는 새 프로젝트는 사용자가 지정한 workspace를 확인한 후 그 루트에 이 파일을 한 번 만든다.
일반 작업 폴더를 자동으로 프로젝트로 승격하거나 모든 프로젝트에 한 절대경로를 강제하지 않는다.

## 수동 기억·핸드오프

에이전트가 직접 쓰는 기억에도 같은 규약을 적용한다. 다른 프로젝트의 루트와 전역 CLI 메모리,
하위 cwd의 `memory/`, `.claude/memory/`, `.codex/memories/` 등에 새 기록을 만들지 않는다.
근거가 없으면 쓰기를 보류하고 실제 작업 프로젝트를 확인한다.

설치된 각 Mnemo 스킬의 `scripts/`에는 같은 핸드오프 도구가 포함된다. 소스 checkout에서는
`skills/mnemo/scripts/`가 정본이다. Python 3와 Node.js가 필요하며, 두 언어의 도구 모두 공통
`hooks/mnemo-project-root.js`를 사용한다. helper가 없으면 임의 경로로 대체하지 않고 재설치한다.

```bash
python "<module_root>/scripts/create_handoff.py" "task-slug"
python "<module_root>/scripts/create_handoff.py" "task-slug" --project-root "<workspace>"
python "<module_root>/scripts/list_handoffs.py"
python "<module_root>/scripts/check_staleness.py" --all
```

하위 폴더에서 실행해도 생성·조회·점검 모두 같은 루트를 사용한다. `--project-root`는 비-Git
workspace의 최초 지정에도 쓸 수 있으며 Git 프로젝트의 하위 경로는 Git 루트로 정규화된다.
복구 도구는 삭제·이동 전 경로를 조회하기 위해 존재하지 않는 명시적 alias와 임시 staging을
처리할 수 있다. 자동 훅은 임시 폴더를 저장 프로젝트로 사용하지 않는다.

## 설정과 적용 범위

Claude의 Mnemo 설치기는 `autoMemoryEnabled=false`를 유지한다. 프로젝트 설정 등에서 다시 켜면
네이티브 auto memory가 별도 위치에 쓰일 수 있으므로 해당 설정도 확인한다.
Codex notify wrapper와 각 CLI의 훅 등록은 실제 설치본을 확인한다. 설정·규칙이 이미 로드된
세션에는 새 세션이 필요할 수 있다. `MNEMO_DISABLE`로 사용자가 저장을 끈 선택은 유지한다.

이 규약은 Mnemo 저장 훅과 제공된 도구에서 검사하며, 직접 파일을 쓰는 에이전트에는 작업 규칙으로
적용된다. 임의 셸·외부 프로그램의 모든 파일 쓰기를 가로채는 OS 차단기는 아니다.
CLI가 자체 관리하는 원본 세션은 런타임 고유 경로에 남는다. 기존에 흩어진 데이터는 자동으로
이동·삭제하지 않고 실제 프로젝트 소속을 검증한 후 처리한다.
