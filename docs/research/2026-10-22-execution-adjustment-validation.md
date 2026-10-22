# 실행 중 하네스 조정 — 구현 및 검증

날짜: 2026-10-22. 대상: 포세이돈·다이달로스의 기존 재시도 분기.

## 적용한 변경

공통 정책은 [execution-adjustment.md](../../skills/orchestrator/references/execution-adjustment.md)에 둔다.
포세이돈 공통 스킬·Codex 어댑터, 다이달로스 네이티브·MCP 경로가 필요한 때 같은 문서를 읽는다.
현재 에이전트가 이 지침을 해석해 실행한다. 새로운 자동 실행 엔진이나 강제 훅을 추가한 것은 아니다.

1. 명령·출력·부분 변경으로 구현 결함, 환경 문제, 문맥·분할·도구 순서 문제를 구분한다.
2. 명확한 구현 결함은 직접 수정한다. 실행 방식 문제의 근거가 있을 때 가설 하나를 정한다.
3. 시작 코드·입력·환경·모델·설정·도구·상한을 맞춰 기존 예산 안에서 실제 실행을 비교한다.
4. `task: recovered/unresolved`와 `adjustment: accepted/rejected/unverified/not-run`을 별도로 기록한다.
5. 현재 활동 로그에 근거·적용 조건을 남기고 므네모가 이후 핸드오프에서 정제한다.

AC·테스트 기대값·트립와이어·통합 게이트를 유지한다. 작업자 교체, 재분할, 순차 폴백과
최종 보고가 재시도 예산을 새로 만들지 않는다. 이미 MCP를 선택한 작업은 같은 Worker·태스크·락
경로를 유지한다. 비교 문서를 읽는 것만으로 MCP를 선택하지 않는다.

## 독립 실행 평가

스킬 작성 지침의 independent forward-testing에 따라 새 컨텍스트의 평가 에이전트에게
사례 파일, 현재 단계, 작업 범위·시도 한도와 스킬만 제공했다. 의도한 수정이나 기대 판정은 주지 않았다.
평가 기준은 실행 전에 사례 밖 JSON으로 고정했다. 사례별 수정 가능한 파일 하나를 지정하고
테스트·입력·스킬·기존 실패 로그는 읽기 전용으로 두었다. 이는 지시 기반 격리이며 OS 보안 격리는 아니다.

| 사례 | 관측된 작업 | 실제 검증 | 판정 |
|---|---|---|---|
| 할인 계산의 부호 오류, WorkPM Phase 4 | `pricing.py` 한 줄 수정. 별도 방식 비교·새 PM 산출물 없음 | 기존 unittest 3/3, 종료 0, 1회 실행 | 직접 결함 수정으로 복구 |
| API 계약 문맥 누락, Codex Poseidon Step 4 | `client.py`를 현재 `data.rows`·`meta.total` 계약으로 수정 | 기존 unittest 3/3, 종료 0, 남은 1회만 사용 | `recovered + unverified`; 이전 실행과 입력 해시가 달라 개선 효과를 분리하지 않음 |

API 사례는 리뷰 모듈과 별도 리뷰 에이전트를 사용할 수 없는 제한을 명시했고, 평가 에이전트가
기능 AC 충족과 전체 리뷰 게이트 `DEGRADED`를 구분했다. 제한된 기능 복구를 전체 파이프라인 PASS로
표시하지 않았다. `MCP: NOT SELECTED`도 보고했다.

메인은 실행 전후 해시를 대조해 두 구현 파일 외 변경·삭제·추가 파일이 없음을 확인했다.
사례 결과는 독립 에이전트의 실제 명령 실행 보고이며, 메인은 사례 예산을 초과하는 추가 테스트를
실행하지 않았다. 첫 두 사례가 읽은 스킬 해시와 최종 소스 해시는 evidence JSON에 각각 보존했다.

## 독립 검토와 수정

읽기 전용 검토 에이전트가 구체적인 충돌 두 건을 발견했다.

- 공통 문서의 실행자가 native/main으로만 쓰여 이미 선택한 MCP 락 경계를 벗어날 수 있었다.
  현재 엔진 유지와 MCP Worker 실행을 명시했다.
- 포세이돈 최종 보고의 추가 1회 재시도·Zeus 순차 폴백이 원래 상한을 넘길 수 있었다.
  최종 보고·오류 표·Wave 순차 폴백에도 남은 동일 실패 예산만 사용하도록 연결했다.

같은 검토자가 수정 후 두 결함의 해소를 확인했다. 이 검토는 정적 계약 확인이며 MCP 런타임
실행 증거가 아니다. 두 수정 뒤 아래 회귀 검사와 형식 검사를 다시 실행했다.

## 회귀·형식·설치 확인

```text
node --test scripts/tests/source-only-module-routing.test.js scripts/tests/skill-sync-policy.test.js scripts/tests/installers.test.js scripts/tests/acceptance-checklist-contract.test.js scripts/tests/tripwire-contract.test.js
56 passed, 0 failed, 0 skipped

python -X utf8 <skill-creator>/scripts/quick_validate.py skills/<name>
agent-team, agent-team-codex, workpm, orchestrator: 모두 유효

git diff --check
통과
```

기존 설치기를 순차 실행했다: `sync-claude-skills.js`, `sync-codex-assets.js`,
`sync-antigravity-assets.js`. Codex 12개·Claude 17개·Antigravity 17개 관련 Markdown을
소스와 바이트 단위로 대조했고 차이는 0개였다. 세 카탈로그의 orchestrator는 source-only를 유지하며
정확한 원본 경로에서 새 참조 문서를 읽을 수 있다. Grok은 Claude 공유 설치 표면을 사용한다.

설치기가 보존한 Codex Mnemo 사본과 새 사본의 차이는 Python 캐시 4개였고 소스 변경은 없었다.
기존 ZIP을 덮어쓰지 않고 임시 디렉터리에 변경된 스킬 4개를 패키징했다. ZIP 무결성과 orchestrator
패키지의 새 참조 문서 포함을 확인했다. 설치기·정책·활성 allowlist 코드 변경은 없다.

### 전역 Codex 설치본 실행

최종 수정·설치 뒤, 다른 새 에이전트가 프로젝트 스킬 사본이 없는 격리 디렉터리에서 API 사례를
다시 수행했다. 전역 `SKILLS-CATALOG.md`의 정확한 경로로 orchestrator와 code-reviewer를 찾았고,
`orchestrator/references/execution-adjustment.md`를 읽어 현재 단계에 적용했다.

- `client.py`만 수정했으며 문법 검사와 기존 unittest 3개를 통과했다. 테스트 실행은 허용된 1회였다.
- `task: recovered`, `adjustment: unverified`, `MCP: NOT SELECTED`를 보고했다.
- 별도 네이티브 리뷰·정적 타입 검사는 제한·도구 범위상 NOT RUN으로 남겨 리뷰 게이트를
  `DEGRADED`로 구분했다. 모듈을 찾은 사실만으로 전체 리뷰 PASS라고 하지 않았다.
- 메인의 전후 해시 대조에서 테스트·입력·계약·로그·상태 파일 보존과 새 파일 없음이 확인됐다.

따라서 실행 평가는 **사례 2종, 총 3회**다. 같은 API 사례를 설치 경로 검증에 다시 사용했으므로
세 번째 독립 문제에서 일반화 성능을 검증한 것으로 세지 않는다.

## 한계

- 합성 사례의 동작 확인이다. 이전 스킬과 통제된 전후 비교를 하지 않았으므로 품질·시간·토큰·비용
  개선을 주장하지 않는다. 토큰·모델 비용은 `unknown`이다.
- 동일 조건 후보의 `accepted`·`rejected` 실행 사례와 실제 제품 전체 작업은 NOT RUN이다.
- Claude·Antigravity·Grok 및 MCP 엔진의 실제 작업 실행은 NOT RUN이다. 설치 가용성과 런타임 실행을
  구분한다. Codex의 전체 설계→구현→검증 파이프라인을 인증한 결과도 아니다.
- 지침은 현재 에이전트가 적용하는 정책이다. 재시도 한도를 코드로 강제하는 새 엔진은 추가하지 않았다.

근거: [사례·해시·명령·검토·설치·최종 TAP 결과](2026-10-22-execution-adjustment-evidence.json).
결정: `memory/architecture/087-execution-adjustment-in-build-harnesses.md`.
