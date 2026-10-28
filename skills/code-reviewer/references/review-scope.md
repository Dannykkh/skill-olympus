# 리뷰 범위 고정

Step 1에서 읽는다. 리뷰 엔진·정책·specialist가 같은 변경을 보도록 범위를 정한다.
새 리뷰 도구나 작업 장부를 만들지 않는다. 읽기 전용 요청에서는 메모리에서 전달하고,
기존 보고서/활동 로그가 있거나 임시 산출물이 허용된 경우에만 그 위치에 기록한다.

## 선택과 수집

사용자가 지정한 범위 또는 호출 하네스의 범위가 기본 선택보다 우선한다.

| mode | 기준과 실제 입력 |
|------|------------------|
| uncommitted | 현재 HEAD, staged patch(`git diff --cached`), unstaged patch(`git diff`), `git ls-files --others --exclude-standard -z`로 찾은 새 파일 본문 |
| branch | 확인한 base ref와 HEAD의 SHA, `git merge-base <base-sha> <head-sha>`를 시작점으로 두 SHA 사이의 patch·변경 파일 |
| commit | 사용자가 지정한 SHA의 변경. merge commit이면 비교할 부모를 확인하고 부모를 추측하지 않음 |
| task | 호출 하네스가 전달한 원래 worktree·index 기준점 각각의 patch와 기존 untracked 목록 대비 새 파일. 이미 정한 AC/소유권 범위를 유지 |

- 명시 범위가 없으면 `git status --short`에 미커밋 변경이 있을 때 uncommitted, 없을 때 branch를 선택한다.
- uncommitted는 `git diff HEAD` 하나로 대체하지 않는다. staged 수정과 unstaged 되돌림이 상쇄돼도
  다음 커밋에 들어갈 index의 변경은 남는다. 두 patch와 해당 버전의 내용을 구분해 검토한다.
- branch는 두 커밋 사이의 변경만 다룬다. 별도 미커밋·새 파일이 있어도 요청 없이 섞지 않는다.
  원격 ref가 없으면 기존 로컬 ref·사용자 지정 기준을 확인한다. 없는 origin/main을 만들어 가정하지 않는다.
- task 범위는 기존 untracked를 모두 새 산출물로 취급하지 않는다. 기존 untracked 자체를 수정했다면
  호출자가 보존한 이전 내용/해시가 필요하다. 없으면 변경 구간은 `UNVERIFIED`로 남긴다.
- task도 index와 worktree를 따로 비교한다. worktree는 원래 ownership baseline,
  index는 기록된 index 기준점(기존 `git stash create` 객체라면 두 번째 부모, 깨끗한 시작이면 시작 HEAD)과
  `git diff --cached <index-baseline>`로 비교한다. 두 변경 집합을 합쳐 staged 수정 뒤 worktree 원복을 놓치지 않는다.
  시작 전 index와 worktree가 달랐던 사용자 변경은 각각의 원래 기준점으로 제외한다.
  index 기준을 복구하지 못하면 그 범위를 `UNVERIFIED`로 남기며 현재 HEAD로 추측하지 않는다.
- 파일 목록은 `git diff --name-status -z` 등 NUL 구분 출력을 해석한다. 공백·한글·개행이 있는
  경로를 공백으로 나누지 않는다. 삭제·이름 변경과 바이너리도 목록에 남긴다.
- untracked는 일반 diff에 나오지 않는다. 실제 파일을 읽거나 허용된 임시 patch로 포함한다.
  `.env`·인증 정보 등 민감 파일은 내용을 패키지에 복사하지 말고 위치와 마스킹한 위험만 보고한다.
  무시된 파일을 찾으려고 `--no-ignore`로 범위를 확대하지 않는다.
- patch 생성에 실패한 것은 빈 diff가 아니다. 읽을 수 없는 파일·submodule 내용·변경량은
  미검토로 표시하며, 이들이 남은 상태에서 전체 CLEAN을 선언하지 않는다.

## 전달 계약

현재 리뷰 안에서 다음 정보를 한 번 정하고 모든 검토자에게 동일하게 전달한다.

```text
review_scope:
  mode / requested scope:
  repo / base ref + SHA / head SHA (해당 값만):
  task worktree baseline / index baseline / existing untracked (task 모드만):
  files: 상태·경로·staged/unstaged/new 구분
  inputs: patch·새 파일 본문 또는 읽을 수 있는 정확한 경로
  constraints: AC/요구사항, 범위 제외, 미검토 항목
```

위임은 경로와 판단에 필요한 제약을 전달한다. 검토자가 접근할 수 없으면 필요한 내용만 전달하고,
자료가 누락됐을 때 다른 base를 추측해 복구하지 않는다. 범위 밖 코드를 읽을 때는 확인하려는
구체적인 호출·타입·상태 위험을 명시한다.

네이티브 엔진의 옵션으로 이 범위를 표현할 수 있으면 사용한다. 표현할 수 없거나 실제 선택 범위를
확인할 수 없으면 동일 입력으로 풀 경로를 수행하고 이유를 보고한다. 네이티브 호출의 성공 종료만으로
별도 파일·기준점 검토가 끝났다고 판단하지 않는다.

검토 도중 HEAD·index·대상 파일이 바뀌면 기존 결과가 무엇을 검토했는지 남기고 변경된 부분과
관련 경계만 다시 확인한다. 승인된 수정 뒤에도 동일 범위 기준으로 결과를 갱신한다.
범위를 맞추려고 사용자 작업 트리를 add/commit/stash/reset하지 않는다.
