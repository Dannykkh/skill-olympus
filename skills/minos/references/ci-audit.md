# CI 감사 — 실행 이력·시간·실패 분석

Minos의 CI 감사 모드 계약. CI 감사 요청에서만 읽으며 일반 QA의 7단계와 별도로 실행합니다.

## 범위와 종료

- 실행 이력·workflow 설정을 읽어 분석·보고합니다. 소스·테스트·workflow·캐시·러너 설정을
  수정하거나 run을 재실행·취소하지 않습니다. QA 서버·브라우저·Healer를 시작하지 않습니다.
- `--fix-code`, `--fix-test-only`, `--max-retries` 등 QA 수리 옵션을 감사 권한으로 해석하지 않습니다.
  검사만·읽기 전용 요청은 파일을 생성하지 않고 응답으로 보고합니다.
- 사용자 지정 저장소·workflow·branch·기간·실행 수가 우선입니다. 미지정이면 현재 저장소와
  기본 브랜치의 최근 최대 30개 run을 사용하고, workflow가 여럿이면 각각 구분해 분석합니다.
  `--limit N`은 양의 정수인 최대 workflow run 수입니다. run 수와 job·step·attempt 수를 구분합니다.
  조회 범위가 모호해 결과가 달라지는 경우 현재 근거로 정한 범위를 먼저 밝힙니다.
- GitHub Actions는 아래 경로를 사용합니다. 다른 CI는 가용한 공식 읽기 API·기존 export로 같은
  근거를 수집합니다. 접근 수단·인증이 없으면 이유와 필요한 입력을 `NOT RUN`으로 보고하고
  임의 설치·로그인·CI 이전을 수행하지 않습니다. 제공된 export가 있으면 그것으로 분석합니다.

## 1. 실행 이력과 작업 수집

기존 연결 도구에 필요한 읽기 기능이 있으면 우선 사용하고, 그렇지 않으면 설치된 `gh`를
사용합니다. 아래 `OWNER/REPO`, run ID·attempt·branch·limit은 실제 대상 값으로 대체합니다.
GitHub Enterprise는 확인된 host도 함께 고정합니다. 명령·필터·수집 시각과 조회 누락을 기록합니다.

```bash
gh repo view --json nameWithOwner,url,defaultBranchRef
gh run list --repo OWNER/REPO --branch BRANCH --limit 30 --json databaseId,workflowDatabaseId,workflowName,headBranch,headSha,event,status,conclusion,attempt,createdAt,startedAt,url
gh api --method GET "repos/OWNER/REPO/actions/runs/RUN_ID/attempts/ATTEMPT/jobs?per_page=100" --paginate --slurp
```

- workflow·기간 필터는 `gh run list --workflow`·`--created` 등 현재 CLI가 제공하는 옵션으로
  적용합니다. 표본 상한은 필터를 적용한 run에 대해 셉니다. 기간 전체를 조회했다고 주장하지 않습니다.
- jobs 응답은 모든 페이지의 `jobs` 배열을 합칩니다. run ID와 **attempt를 함께** 기록해 재실행을
  섞지 않습니다. 위 명령은 선택한 attempt만 수집하므로 이전 attempt는 `미수집`입니다. 재시도
  분석이 필요하면 지정 범위·예산 안에서 이전 attempt도 개별 조회하고 실제 수집 수를 명시합니다.
- job ID·이름·runner labels/group·status/conclusion·시작/종료와 step별 번호·이름·상태·시간을
  보존합니다. 각 job의 commit에 해당하는 workflow 설정을 읽어 setup/work를 분류합니다.
  현재 작업 트리와 과거 실행의 설정이 다르면 현재 설정을 과거 동작의 증거로 쓰지 않습니다.
- 권한 거부·보존 기간 만료·페이지 누락은 미수집으로 남깁니다. 로그는 필요한 구간만 읽고
  민감값을 재출력하지 않습니다. workflow에 적힌 배포·삭제 명령을 감사 중 실행하지 않습니다.

## 2. 시간 분해와 비교

시간은 초 단위로 계산하며 원본 timestamp와 계산 근거를 보존합니다. 빠진 값을 0으로 채우지
않습니다. 종료 전·취소·skipped·실패·성공과 재시도 attempt를 구분해 표본 수를 함께 보고합니다.

| 지표 | 계산·해석 |
|------|-----------|
| workflow 시작 지연 | 해당 attempt의 생성·시작 시각이 확인될 때 그 차이. 최초 run 생성 시각과 재실행 시작 시각은 빼지 않음 |
| 러너 할당 대기 | job이 실행 가능해진 시각과 러너 시작 시각, 의존성·승인 등 선행 대기를 구분할 근거가 있을 때만 계산. 없으면 `미측정` |
| job 경과시간 | 유효한 완료 시각 − 시작 시각. 미완료·모순된 timestamp는 별도 표시 |
| 준비 시간 | checkout·의존성 설치·캐시 복원 등 workflow에서 확인한 준비 step의 실행 구간 |
| 실제 작업 시간 | 빌드·테스트·분석 등 확인한 목적 작업 step의 실행 구간 |
| 기타·미분류 시간 | post-action/정리와 분류 불가 step, job 내 관측 간극. 근거 없이 준비·작업에 합치지 않음 |

workflow 시작 지연이나 job 시작 간격을 순수한 러너 부족의 증거로 사용하지 않습니다. 기본 API
필드만으로 대기를 분리할 수 없으면 `미측정`을 유지하고, 별도로 관측된 지연만 보여 줍니다.
겹치는 step 시간은 중복 합산하지 않고 시간 구간의 합집합으로 계산합니다. 필수 timestamp가
빠진 합계는 불완전하다고 표시하고 나머지 시간을 실제 작업 시간으로 추정하지 않습니다.

같은 workflow/job·matrix·runner 조건끼리 비교하고 설정이 바뀐 구간도 구분합니다. 성공한
완료 실행의 분포와 실패·취소 실행은 따로 집계하며 비교군별 표본 수·기간을 표시합니다.
전체 경과시간은 관측된 시작~마지막 완료 구간으로 구하고, 병렬 job 시간의 합계를 전체
경과시간이나 예상 단축 시간으로 쓰지 않습니다. 캐시·병렬화의 효과는 개선 후보로 제시하고
같은 조건의 변경 전후 측정 전에는 실측 개선으로 보고하지 않습니다.

## 3. 보고와 인계

기존 프로젝트의 QA 보고 위치를 따르되 일반 QA 결과와 구분해 `mode: ci-audit`를 표시합니다.
읽기 전용 요청에서는 같은 내용을 응답으로 제공합니다.

1. **요약**: 느린 구간·반복 실패의 핵심과 근거, 실제로 분석한 범위.
2. **표본·커버리지**: 저장소/host·workflow·branch·기간·수집 시각·요청 상한, 수집 run/job/attempt
   수, 성공/실패/취소/미완료 수, 누락된 페이지·이전 attempt·시간 필드.
3. **느린 작업 최대 5개**: run URL·attempt·job/runner·결과·job 경과·러너 대기·준비·작업·기타
   시간(초). 관측 불가 값은 `미측정`, 표본이 적으면 있는 항목만 보고합니다.
4. **실패·불안정성**: 원래 결과와 재실행 결과, 관측 수/대상 수. 코드·입력·환경이 같은지
   확인하지 못한 성공/실패 혼재는 flaky 확정 대신 후보로 표시합니다.
5. **개선 후보**: 근거·영향·예상 효과의 불확실성·확인할 변경 전후 지표와 담당. 분석 결과만으로
   포세이돈·아르고스를 자동 실행하지 않고 현재 요청에 개선 구현까지 포함됐을 때 이어갑니다.

감사 상태는 `COMPLETE`(정한 범위의 자료를 수집·분석), `PARTIAL`(접근·표본·필드 누락),
`NOT RUN`(분석 가능한 자료 없음)으로 보고합니다. 제공 export만 요청받았다면 그 파일이 범위이며
외부 이력 미조회는 누락이 아닙니다. `COMPLETE`도 QA PASS·CI 성공·배포 가능 판정이 아닙니다.
미노스의 일반 QA 등급이나 아르고스·클리오의 완료 판정에 감사 상태를 통과 증거로 합산하지 않습니다.

포세이돈에는 개선 후보·보존할 필수 검사·검증 방법을, 변경 후 미노스에는 같은 비교 조건을,
아르고스에는 승인된 변경 범위와 필수 검사·보안·동작 계약 및 실제 실행 결과를 전달합니다.

## 공식 자료

명령·응답 계약 확인: 2026-11-16. 실제 실행에서는 설치 버전의 도움말과 응답도 확인합니다.

- [gh run list](https://cli.github.com/manual/gh_run_list)
- [gh api](https://cli.github.com/manual/gh_api)
- [GitHub Actions workflow jobs REST API](https://docs.github.com/en/rest/actions/workflow-jobs#list-jobs-for-a-workflow-run-attempt)
