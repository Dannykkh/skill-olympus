# 실행 가능한 평가 절차

이 절차는 ISO 공개 설명의 측정·평가·문서 역할에 맞춘 GS 사전점검 구현이다.
유료 표준 전문의 모든 조항을 구현했다는 인증이 아니다. 기관별 기준은 매 실행에 확정한다.

## E1 평가 요구 확정

제품 바이너리/커밋·설정·데이터 버전과 평가 목적, 사용자, 장비/OS, 기관/등급을 scope.md에 고정한다.
제품설명서·사용자취급설명서의 판본을 연결한다. criteria.md에 적용 기관 기준의 모든 항목을 옮겨
CR-ID, 출처/조항, 해당/제외/미확인, 품질/업무적합성 그룹을 기록한다. 누락과 제외는 메인이 검토한다.
공식 기관 기준이 없으면 일반 품질 진단은 실행하되 criteria_reviewed=false로 유지한다.

## E2 측정과 시험 설계

CR-ID별로 TC-ID, 측정 대상·단위·표본/부하·초기 상태·절차·기준치·결과 저장 위치를 정한다.
시간은 p95 등 명시된 지표와 단위, 용량은 데이터 크기/사용자 수, 복구는 장애 주입과 회복 후
데이터 대조를 구체화한다. 수치 기준이 문서에 없으면 만들지 말고 미확인으로 남긴다.
정상/오류/경계값, 역할/조직, 설치/재시작/연계 환경별 적용 여부를 검토한다.
2등급은 별도의 business TC로 대상 업무의 시작→중간 상태→최종 결과와 예외 흐름을 검증한다.

## E3 실행 계획과 준비

기존 pytest/node test/Playwright/제품 CLI 등 실제 하네스에 assertion을 작성하고 Minos가 실행한다.
화면만 열기, HTTP 응답만 출력하기, grep 일치만으로 상태·품질을 통과시키는 명령은 금지한다.
시험 스크립트가 실제 기대값·금지된 저장/효과·회귀를 assertion하는지 검토한 뒤 assertions_reviewed=true로 둔다.
문서/수동/실기기 시험은 Clio 검토표·장비 증거를 먼저 만들고 이를 확인하는 프로젝트 검증 명령을 연결한다.
자동 검증 명령이 없는 사례는 NOT RUN으로 두고 Argos가 별도의 수동 증거를 검토한다.
준비도 집계는 자동 결과와 수동 근거를 함께 검토한 후에만 한다.

## E4 실제 실행 도구

Python 3 표준 라이브러리만 필요하며 Windows/macOS/Linux에서 사용한다.
명령은 실행 전에 읽고 요청 범위의 로컬/시험 환경인지 확인한다. argv에 비밀값을 넣지 말고 테스트 환경 변수를 쓴다.
실행 도구는 임의 명령을 격리하는 샌드박스가 아니다. 자식 프로세스를 남기는 서버 시작 명령 대신
준비/정리를 소유하는 테스트 하네스를 사용한다. timeout 뒤에는 남은 프로세스를 확인한다.

```text
python "<module_root>/scripts/run-evaluation.py" "<run_dir>/plan.json" --root "<product_root>" --output "<run_dir>/execution.json"
```

읽기 전용에서는 --output을 생략한다. 단, 테스트의 DB/파일/외부 효과는 별개이므로 격리 환경과
허용된 테스트 데이터만 사용한다. 출력 파일은 기존 파일을 덮어쓰지 않는다.
실행 실패/불완전은 종료 코드 1, 증거 수집 완료는 0, 잘못된 계획은 2다.
`EVIDENCE_COMPLETE`는 자동 실행 증거 수집 완료이지 READY나 인증 합격이 아니다.
stdout/stderr 원문은 비밀 노출을 피하려고 저장하지 않고 해시만 남긴다. 실제 측정값·테스트 리포트는
각 하네스가 마스킹해 저장하고 evidence.md에 경로·해시·대상 버전을 연결한다.

### plan.json 계약

필수 최상위: grade(정수 1/2), institution, build, environment, criteria_source,
criteria_version, criteria_reviewed(전체 기준표 검토 여부), cases. open_defects는 미해소 결함 ID 배열이다.
문자열 식별자는 비어 있으면 안 된다. grade-1과 grade-2는 다른 실행 디렉터리에 저장한다.
각 case: id(고유), area, required(boolean), criterion(실제 기준 조항), expected,
assertions_reviewed(boolean), argv(문자열 배열), timeout(초, 기본 60, 최대 3600).
argv 없음은 NOT RUN. N/A는 na_reason과 na_reviewed=true 및 criterion이 있어야 한다.
지원 area: functional, performance, compatibility, usability, reliability, security,
maintainability, portability, documentation; 2등급은 business도 필수 매핑한다.

한 사례의 작성 예(예시 명령을 존재하는 것으로 가정하지 말고 실제 하네스에 작성):
```json
{"id":"TC-API-01","area":"security","required":true,
 "criterion":"<기관 기준의 실제 조항>","expected":"타인 변경 거부 및 저장/이벤트 불변",
 "assertions_reviewed":false,"argv":["python","-m","pytest","tests/test_authorization.py"],"timeout":60}
```

## E5 결함 보완과 회귀

실패는 결함 ID와 원래 증거에 연결한다. --fix가 허용되면 수정한 새 빌드로 실패 TC와 영향받은
정상 TC를 다시 실행한다. 이전 execution.json은 보존한다. CLOSED에는 두 재시험 근거가 필요하다.
검사 삭제·기대값 완화·등급 하향으로 결과를 바꾸지 않는다. 무관한 시험은 재실행하지 않는다.

## E6 평가 종결

Argos가 [감리 절차](argos-gs-audit.md)를 적용해 기준 커버리지·증거·문서·결함을 검토한다.
Clio는 [문서 절차](clio-gs-documents.md)를 적용한다. 메인이 evidence-contract.md로 최종 판정한다.
자동 성공이라도 의미 없는 assertion·잘못된 제외·불일치 빌드이면 INCOMPLETE/NEEDS_WORK로 낮춘다.
