# Repository Security Audit Contract

전체 저장소 감사 절차는 명시적인 보안 감사 범위에서 적용합니다. 일반 diff 리뷰에서 API·권한·입력 처리에
영향이 있으면 아래 `API 직접 호출·서버 검증 계약`만 변경 범위에 적용합니다. 이 참조를 읽는 것만으로
전체 저장소·이력 감사나 운영 서버 테스트를 시작하지 않습니다.

## API 직접 호출·서버 검증 계약

### 적용과 판단

- 브라우저, curl, REST 클라이언트, LLM 도구 모두 같은 서버 경계를 통과한다. 자기 권한 안의 정상 API 호출은 취약점이 아니다. UI 버튼 숨김·라우팅·CORS·User-Agent 검사는 서버 인가의 근거가 아니다.
- 관련 엔드포인트의 메서드·경로, 역할/소유권/조직, 입력 스키마, 상태 전이와 부수 효과를 명세 및 실제 코드로 연결한다. 명세가 빠진 허용 범위는 임의로 정하지 않고 `UNVERIFIED`로 남긴다.
- 리뷰는 변경된 호출 경로와 공통 검증기의 영향을 추적한다. 전체 감리는 대상 API 목록에 아래 항목을 매핑하고 적용 제외 이유를 남긴다. GS 인증의 공식 판정이나 전체 OWASP 준수를 이 체크리스트만으로 주장하지 않는다.

### 공통 검증 항목

| ID | 서버 통제 | 직접 요청으로 확인할 사례 |
|---|---|---|
| API-AUTH | 보호 API 인증 및 기능별 인가 | 무인증·만료/무효 세션, 일반 계정의 관리자 기능 호출, 다른 메서드·동일 기능의 대체 경로 |
| API-OBJECT | 객체 소유권·조직 범위 및 반환 필드 | 다른 사용자/조직의 ID로 단건·목록·검색·내보내기·변경·삭제; 목록 필터와 민감 필드 노출도 확인 |
| API-FIELD | 쓰기 허용 필드만 바인딩, 서버 관리 값 보호 | body/query/path 및 중첩 객체에 role·ownerId·tenantId·price·status 추가/변조; 거부 또는 명시된 무시 정책 뒤 값 불변 확인 |
| API-FLOW | 업무 선행 조건·허용 상태 전이 및 필요한 원자성 | 결제/승인 전 완료, 순서 건너뛰기, 취소 후 실행, 일회성 작업 재전송; 중복·경합 위험이 있는 작업은 제한된 동시 요청 |
| INPUT-SCHEMA | 서버 자료형·필수·길이·범위·형식·선택값 검증 | 누락/null/빈 문자열/공백만, 문자열 대신 배열/객체, 음수·소수·범위 초과, 길이/수치 경계의 바로 전·정확한 경계·바로 다음, 잘못된 날짜·enum |
| INPUT-TEXT | 필드별 문자·정규화 정책과 업무 의미 검증 | 제어문자·유니코드/인코딩 변형·긴 문자열, 시작일 이후/이전 종료일 등 필드 간 모순; 변환·정규화 뒤 검증 우회 여부 |
| INPUT-SINK | SQL·HTML·명령·파일 등 사용 지점별 방어 | SQL/HTML/스크립트 문자열의 실행·오류·정보 노출 여부; SQL 매개변수화, 문맥별 출력 인코딩 확인. 특수문자 전체 차단으로 대체하지 않음 |

정상 이름·다국어·따옴표·본문 기호는 필드 계약이 허용하면 수용해야 한다. 파일 업로드가 있으면
크기·허용 형식·실제 콘텐츠·파일명/경로도 검증한다. 무제한 퍼징 대신 재현 가능한 제한된 입력을 사용한다.

### 실제 실행과 증거

1. 허용된 테스트 환경에서 독립 계정 A/B, 필요한 조직·역할, 격리된 테스트 데이터를 준비한다. 실제 결제·메일 등 외부 효과는 테스트 대역을 사용한다. 준비되지 않은 사례는 `NOT RUN`과 이유를 기록한다.
2. 같은 엔드포인트의 정상 대조군을 먼저 확인하고 한 조건씩 바꾼 API 요청을 UI 없이 실행한다. 막힌 정상 호출이나 잘못된 URL의 404를 인가 성공 증거로 삼지 않는다.
3. 각 사례에 계약에 맞는 응답 코드(예: 400/422, 401/403 또는 의도된 404)와 응답 본문을 검증한다. 500·민감 데이터 노출은 정상 거부가 아니다.
4. 거부 전후 DB 또는 권한 있는 조회, 작업 큐/이벤트·파일·테스트 외부 서비스 기록을 비교한다. 부분 저장·상태 전이·중복 결제 등 금지된 효과가 없어야 한다. 의도된 감사 로그·실패 횟수 기록은 구분한다. 관찰 수단이 없으면 해당 검증은 `NOT RUN`이다.
5. `TC-ID | 계약 ID | 메서드/경로 | 계정 역할·조직 | 변조 조건 | 기대/실제 응답 | 전후 상태·부수 효과 | 테스트 파일/명령·실행 시각·대상 버전 | 판정`을 남긴다. 토큰·쿠키·개인정보는 마스킹한다.

코드리뷰어는 파일·줄과 기존 회귀 테스트를 근거로 판단하며 실행하지 않은 테스트를 통과로 표시하지 않는다.
api-tester/Minos는 이 계약의 관련 사례를 실행하고 Argos는 커버리지와 실행 증거를 최종 판정한다.
같은 대상 버전·환경·조건의 증거는 재사용한다. 해당 없음은 근거 있는 `N/A`, 미실행은 `NOT RUN`,
우회 또는 금지된 저장/부수 효과 재현은 `FAIL`이다. 필요한 실행 증거가 빠지면 전체 검증 완료 `PASS`를 부여하지 않는다.

공식 근거: [OWASP API Security Top 10](https://owasp.org/API-Security/editions/2023/en/0x11-t10/),
[Input Validation](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html).

## 범위 선택

| 모드 | 범위 | 사용 시점 |
|------|------|-----------|
| `diff` | 현재 change set | PR 전 보안 회귀 확인 |
| `infra` | 시크릿, CI/CD, 배포 설정 | 인프라 변경 검증 |
| `supply-chain` | manifest, lockfile, provenance | 의존성 감사 |
| `comprehensive` | 저장소 + 이력 + 신뢰 경계 | 배포 전 또는 명시적 전체 감사 |

범위가 없으면 먼저 변경 파일, manifest, lockfile, CI/CD 파일을 확인해 최소 모드를 선택합니다.
개인정보 흐름과 처리방침은 `themis`, 사용자 정의 정적 분석 규칙은 `semgrep-rule-creator`,
spec 대비 전체 준공 검증은 `argos`의 영역입니다.

## 안전 계약

- 기본은 읽기 전용입니다. 수정은 사용자가 별도로 요청한 경우에만 구현 작업자가 수행합니다.
- 비밀값 원문을 터미널, 보고서, 대화에 출력하지 않습니다. 경로·줄·종류·마스킹된 지문만 기록합니다.
- `git log -p`, 광범위한 raw grep처럼 비밀값 본문을 그대로 내보내는 명령은 사용하지 않습니다.
- 저장소에 설정된 scanner와 CI 결과를 우선합니다. 도구가 없거나 실행하지 못했으면 `PASS`가 아니라
  `NOT RUN`으로 기록합니다.
- 취약점 데이터와 도구 사용법은 현재 프로젝트 버전과 공식 문서로 확인합니다. 정적 CVE 목록이나
  특정 알고리즘·프레임워크 처방을 보편 규칙으로 단정하지 않습니다.

## 감사 순서

### 1. 컨텍스트와 신뢰 경계

- 배포 형태, 외부 진입점, 인증·권한 경계, 데이터 저장소, 제3자 전송을 식별합니다.
- 변경 범위와 실제로 도달 가능한 실행 경로를 확인합니다.

### 2. 시크릿 고고학

- tracked 파일, ignore 규칙, CI 변수 참조, 배포 설정을 검사합니다.
- 저장소에 gitleaks, trufflehog 같은 scanner가 구성되어 있으면 그 출력을 사용합니다.
- 이력 검사가 필요하지만 redacting scanner가 없으면 파일명·커밋 메타데이터까지만 수집하고,
  의심 파일 내용은 값이 출력되지 않는 방식으로 별도 확인합니다.
- 예제·테스트·주석도 일괄 제외하지 말고 실제 비밀인지 문맥으로 판정합니다.

### 3. 공급망

- manifest와 lockfile의 일치, lockfile 커밋 여부, 설치 스크립트, registry/provenance 설정을 봅니다.
- 프로젝트가 실제 사용하는 package manager의 audit 명령과 기존 CI 결과를 우선합니다.
- advisory 존재만으로 확정하지 않고 영향 버전, reachability, exploitability, 배포 노출을 확인합니다.

### 4. CI/CD와 배포

- workflow 권한, fork PR의 secret 접근, OIDC/장기 키, artifact provenance, mutable action 참조,
  배포 승인·롤백 경계를 확인합니다.
- 단순 문자열 패턴이 아니라 실제 workflow 권한과 실행 조건을 근거로 판정합니다.

### 5. 코드와 데이터 경계

- 인증·인가, 입력 검증, injection, XSS/CSRF, SSRF, path traversal, 업로드, rate/cost limit,
  오류·로그의 정보 노출을 실제 호출 경로에서 검증합니다.
- diff 모드에서는 `../specialists/security.md`를 함께 적용합니다.

### 6. STRIDE와 LLM 경계

- 각 신뢰 경계에 대해 Spoofing, Tampering, Repudiation, Information Disclosure,
  Denial of Service, Elevation of Privilege를 평가합니다.
- LLM 기능은 출력 검증, prompt/tool trust boundary, 간접 prompt injection, PII 전송,
  비용 폭주, 권한 있는 tool 호출을 추가로 확인합니다.

## 발견 확정 게이트

발견에는 다음 근거를 함께 기록합니다.

1. `path:line` 또는 설정 위치
2. 공격자 입력에서 위험 sink까지의 도달 경로
3. 현재 방어가 없거나 우회 가능한 증거
4. exploitability와 impact
5. 재현·scanner·테스트 중 하나의 외부 검증, 없으면 `UNVERIFIED`

심각도는 취약점 이름만으로 고정하지 않고 evidence, reachability, exploitability, impact를 합쳐 정합니다.

## 출력 형식

```markdown
## Security Audit
- Mode: diff | infra | supply-chain | comprehensive
- Scope: {검사한 경로와 제외 범위}
- Tool evidence: {실행 결과 또는 NOT RUN 사유}

### Findings
- [severity] path:line — 요약
  - Reachability:
  - Evidence:
  - Impact:
  - Remediation:

### Coverage Gaps
- NOT RUN 또는 확인하지 못한 영역과 이유
```
