# Repository Security Audit Contract

전체 저장소 보안 감사를 명시적으로 요청했을 때만 읽습니다. 일반 diff 리뷰는 런타임의 리뷰 엔진과
`../specialists/security.md`로 충분하며, 이 계약을 자동으로 실행하지 않습니다.

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
