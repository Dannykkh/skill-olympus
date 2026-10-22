# Builder 스킬 구현 비교 fixture

2026-10-22 후속 검증에서 사용한 두 개의 합성 API 프로젝트와 외부 검사다.
실제 HTTP 요청과 상태 변화를 검사하지만 운영 제품·브라우저·모델 품질 시험은 아니다.

## 입력과 판정

| 프로젝트 | 요청 | 외부 검사 |
|---|---|---|
| pagination | 승인된 기본 페이지 크기 20 → 30, 기존 동작 유지 | 6개: 기본값·명시 크기·잘못된 크기·인증·테넌트·라우트 |
| refunds | 현재 API 명세에 따라 실패 원인과 오래된 테스트 수정 | 12개: 성공·인증·인가·테넌트·숫자 형식·키·잔액·기한·재전송·충돌·누적·다른 테넌트 정상 요청 |

`service.mjs`는 의도적으로 수정 전 상태다. `api.test.mjs.fixture`는 작업자에게 제공할 기존
테스트이며, 환불 쪽에는 오래된 응답 키와 실제 결함을 검출하는 검사가 함께 있다.
`.fixture` 확장자는 저장소의 일반 테스트 탐색에서 이 실패 사례를 제외한다.

작업자는 별도 복사본의 코드와 기존 테스트를 수정한다. API 명세·공유 테스트 도우미·스킬 입력은
읽기 전용이며 외부 `verify-*.mjs`는 작업자에게 제공하지 않는다. 이 분리는 작업 지시의 범위이며
OS 수준의 접근 차단은 아니다. 완료 뒤 메인이 외부 검사를 실행하고 읽기 전용 입력 해시를 대조한다.
필수 사용자 입력으로 멈추면 미완료로 남기며, 임의로 후속 승인을 주지 않는다.

전체 통과는 외부 동작 검사 전부 성공, 입력 무변경, 요청한 수정 완료를 함께 요구한다.
기존 테스트를 완화했는지는 diff로 따로 확인한다. 문서 수·실행 시간은 관찰 지표이며 품질 점수에
합산하지 않는다. 시간은 각 작업자가 기록한 시작/완료 UTC의 차이로, 병렬 실행과 모델 변동의 영향을 받는다.

## 재현

필요 조건은 Python 3.9 이상, Git, Node.js 22다. 의존성 설치와 외부 API 호출은 없다.
`prepare.py`는 보존된 수정 전 스냅샷(`before/` 및 그 부모의 `original-hashes.json`)과 현재 소스에서
8개 격리 작업공간을 만든다. 출력 경로가 이미 있으면 중단하며 기존 파일을 삭제하지 않는다.

```powershell
python -X utf8 docs/research/builder-workflow-implementation/prepare.py `
  --repo-root D:/git/claude-code-agent-customizations `
  --baseline-root C:/Users/ADMINI~1/AppData/Local/Temp/olympus-builder-eval-20261022-f4vejh2w/before `
  --transport fetch-v1 `
  --output-root C:/Users/Administrator/AppData/Local/Temp/builder-implementation-replay
```

각 `run-NN-prompt.txt`를 별도 새 컨텍스트에 동일한 실행 조건으로 전달한다. 각 조건 2회이며 두 번째
반복은 전후 실행 순서를 뒤집는다. 작업자가 끝난 뒤 해당 작업공간에서 기존 테스트를 실행하고,
외부 검사에서는 다음처럼 경로만 주입한다.

```powershell
$env:EVAL_WORKSPACE = 'C:/Users/Administrator/AppData/Local/Temp/builder-implementation-replay/run-01'
node --test docs/research/builder-workflow-implementation/verify-pagination.mjs

$env:EVAL_WORKSPACE = 'C:/Users/Administrator/AppData/Local/Temp/builder-implementation-replay/run-03'
node --test docs/research/builder-workflow-implementation/verify-refunds.mjs
Remove-Item Env:EVAL_WORKSPACE
```

API 명세의 고정 시계와 초기 데이터는 양쪽이 동일하다. 수정 전 스킬의 기준 Git revision은
`0ee7598cc48342b07fd035f21e77eaef89bb3903`이며 실제 비교에는 보존 스냅샷과 기록한 해시를 사용했다.
재실행 시 입력 해시와 현재 소스 버전을 따로 기록해야 원래 실험과 구별할 수 있다.

위 명령의 `fetch-v1`은 최초 실험의 도우미를 그대로 복원한다. 기본값 `http-v2`는 아래 전송 결함을
보완한 버전이다. 현재 외부 검사도 `http-v2`를 사용한다. 최초 조건을 완전히 재현하려면 외부 검사와
도우미를 별도 폴더에 복사하고 `test-support.fetch-v1.mjs.fixture`를 그 폴더의 `test-support.mjs`로 둔다.

이 과제는 변경 작성자가 만든 소규모 후속 회귀 평가다. 작업자에게 보이지 않는 검사만으로
독립 실무 평가셋이나 통계적 유의성을 주장하지 않는다. 비용·토큰·정확한 모델 버전은 미측정이다.

## 사후 탐색 검사

run-01이 페이지네이션 시작 코드에서 `Bearer toString`을 유효 사용자처럼 취급하는 문제를 발견했다.
이 관찰 뒤 `probe-auth.mjs`를 추가해 모든 결과를 같은 3개 토큰으로 검사한다.
사전 기준 6개/12개에는 합산하지 않으며, 평가 작성자가 빠뜨린 기존 fixture 결함으로 분리한다.
페이지 크기 작업은 인증 동작 보존이 명시되어 있어 이 결함을 그대로 둔 것만으로 요청 실패로
판정하지 않는다. 발견·보고 여부와 API 전체 계약의 한계를 함께 기록한다.

```powershell
$env:EVAL_WORKSPACE = 'C:/Users/Administrator/AppData/Local/Temp/builder-implementation-replay/run-01'
$env:EVAL_CASE = 'pagination'
node --test docs/research/builder-workflow-implementation/probe-auth.mjs
Remove-Item Env:EVAL_WORKSPACE, Env:EVAL_CASE
```

## 전송 도구 수정과 결과 구분

최초 실행에서는 `fetch failed`가 간헐적으로 발생했다. 이 PC의 동적 포트 범위는 1024–15000이며
실제 `listen(0)`은 2631번을 할당했다. 독립 재현에서 6000번 HTTP 서버는 Fetch로 `bad port`,
Node HTTP로 200을 반환했다. 6000번은 [Fetch 차단 포트](https://fetch.spec.whatwg.org/#port-blocking)다.
이것은 재현한 도구 결함이며 최초 실패 각각의 포트는 기록되지 않아 같은 원인이라고 확정하지 않는다.

`test-support.mjs`는 이제 Node HTTP로 같은 요청을 보낸다. 기대 상태·본문·상태 불변 검사는 바꾸지
않았고, 원본 도우미는 `test-support.fetch-v1.mjs.fixture`에 보존했다. 변경 후 검사는 최초 성적을
덮어쓰지 않는 별도 단계다. 작업자 코드·프롬프트·스킬을 수정하거나 에이전트를 재실행하지 않는다.
`node docs/research/builder-workflow-implementation/probe-transport.mjs`로 전송 차이를 재현할 수 있다.
