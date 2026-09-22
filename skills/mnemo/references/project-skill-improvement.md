# Project Skill Improvement — Mnemo 프로젝트 개선

Mnemo 전용 내부 모듈이다. 공용 skill-evolve와 별개로 프로젝트 교훈을 로컬 스킬 개선에 연결한다.
독립 slash 스킬로 등록하지 않는다. 비교 실험은 Mnemo 전용 project-skill-evaluation.md를 사용한다.

## 입력

- `project_root`: Mnemo project-storage 규약으로 확정한 절대경로.
- `entries`: 이번 정제에서 선택한 항목의 파일·제목 또는 ID·근거 링크 목록.
  단일본과 분할본 모두 허용한다. 디렉터리 전체나 과거 백로그를 다시 스캔하지 않는다.
- `session`: 실제 세션 ID와 시작 시각. 턴 ID를 세션 ID로 대신하지 않는다.
- `targets`: 프로젝트 카탈로그에서 프로젝트 전용으로 명시한 스킬의 정확한 경로.
- `stage`: `candidate`(핸드오프 기본) 또는 `evaluate`(승인된 개선 작업).
- `authorization`: 이번 작업에서 이미 허용된 대상과 수정 범위.
- `module_root`: 실행 중인 Mnemo 어댑터의 정확한 SKILL.md 디렉터리.

프로젝트 루트·입력 범위가 불명확하면 보류한다. targets의 실경로가 프로젝트 밖이거나
전역 배포 정본·설치 미러이면 대상에서 제외한다. `skills/`라는 이름만으로 프로젝트 전용이라고
판단하지 않는다. 대응하는 로컬 스킬이 없으면 교훈만 보존하고 자동 생성·전역 복사를 하지 않는다.

## 현재 LLM의 후보 판별

Jev나 외부 API를 호출하지 않는다. 현재 CLI가 각 항목에 아래 형식으로 짧게 답한다.
각 판단은 해당 관찰과 실제 검증을 근거로 하며, 오류 문구 부재를 검증된 성공으로 취급하지 않는다.

```text
entry: 파일#항목
reusable: yes | no | uncertain
relation: new | duplicate | conflict
evidence: verified | observed | insufficient
candidate: yes | no | defer
target: 프로젝트 기준 상대경로 | none
reason: 근거 링크를 포함한 한 줄
```

`confidence`와 관찰 횟수는 정제 우선순위이며 진실의 확률이 아니다. 여러 세션의 독립된 근거,
실제 실패·복구 결과, 적용 조건과 반례를 검토한다. 모순은 기존 교훈을 덮어쓰지 않고 보류한다.
동일 근거·동일 대상 버전으로 이미 기각된 후보는 새 근거 없이 다시 올리지 않는다.

## 전달과 결과

1. candidate 단계는 스킬을 수정하거나 반복 실험을 시작하지 않는다. Mnemo가 핸드오프의
   `Session Memory Review`에 후보·보류 이유·평가 기준·다음 행동을 기록한다.
   읽기 전용이면 응답으로만 남긴다. 후보 0건은 정상 결과다.
2. evaluate 단계는 대상, 가설 하나, 기준점, 개발 사례, 별도 평가 사례, 필수 회귀 검사,
   시간/라운드 상한을 확정한다. 기법 준수 대신 과업 결과를 평가한다.
3. 이미 받은 대상·범위 승인을 재요청하지 않는다. 범위가 정해지지 않은 전역 수정은 하지 않는다.
4. [프로젝트 스킬 비교 검증](project-skill-evaluation.md)을 직접 읽는다.
   대상 원본 경로와 결과 경로는 별개다. 설치된 내부 모듈 자체를 개선 대상으로 삼지 않는다.
5. 결과는 `accepted | rejected | deferred | not-run` 중 하나로 반환한다.
   기록에는 입력 근거, 대상의 이전/이후 버전 또는 해시, 가설, 실제 명령·결과,
   비용(미측정은 unknown), 채택·기각 이유, 재시도 조건을 포함한다.
6. Mnemo가 `<project_root>/memory/skill-evolution/`에 결과를 보존하고 MEMORY.md에서 연결한다.
   채택 시에만 프로젝트 SKILLS-CATALOG.md의 해당 항목을 갱신한다. 기존 행과 사용자 내용을 보존한다.
   `evolved-by` 하나로 성공과 실패를 합치지 않는다. 저장 경로는 project-storage 경계를 따른다.

닥터는 누락된 근거·대상 경로·오래된 후보를 진단하는 보완 경로다. 이 문서는 닥터의
자동 검사 구현을 의미하지 않는다. 실제 실행 기록 재생과 탐색 정책 최적화는 이 모드의 범위 밖이다.
