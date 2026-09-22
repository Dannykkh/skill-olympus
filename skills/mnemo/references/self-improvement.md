# Mnemo 자기개선 진입점

Mnemo가 정제·후보 판별·비교 실험·결과 기록을 연결한다. 별도의 스킬 설치나 slash 등록은 필요 없다.
현재 CLI의 LLM을 사용하고 수집 훅에서는 AI를 호출하지 않는다.

1. project-storage.md로 프로젝트 루트를 확정한다.
2. 이번 세션 또는 명시한 정제 범위에 대해서만 [세션 교훈 정제](session-learning.md)를 읽어 정제한다.
3. [project-skill-improvement](project-skill-improvement.md)를 읽고
   `stage: candidate`로 항목을 판별한다. 핸드오프 중에는 후보만 남기고 인계를 완료한다.
4. 승인된 개선 작업에서는 `stage: evaluate`로 정확한 대상·근거·사례·상한을 전달한다.
5. 전용 비교 검증의 실제 결과를 기억에 연결하고 채택한 로컬 스킬의 카탈로그만 갱신한다.

## 전용 모듈 경로

`module_root`는 실행 중인 Mnemo 또는 Mnemo 어댑터의 SKILL.md 디렉터리다.
절차 정본은 Mnemo의 references/에 있다:
- session-learning.md: 이번 세션의 근거 있는 교훈 정제
- project-skill-improvement.md: 로컬 대상 매핑과 후보·결과 기록
- project-skill-evaluation.md: 후보 실행·비교·회귀·채택 검증

각 문서를 module_root 기준으로 읽는다. 소스 checkout의 어댑터에는 해당 문서가 없으면
실제 형제 mnemo/references/를 사용한다. 설치본에는 모두 포함되며 다른 스킬·카탈로그가
없어도 동작한다. 필수 파일 누락은 NOT RUN으로 남기고 전역 스킬로 대체하지 않는다.
공용 skill-evolve·autoresearch·memory-distill은 다른 사용처를 위해 수정 없이 유지한다.
전용 절차는 별도 활성 스킬로 등록하지 않는다. 배포 성공은 LLM 판단 품질 인증이 아니다.

현재 계약은 후보 선별과 비교 실험 연결이다. 프로젝트 지침 관리 블록 자동 초기화와
닥터의 개선 후보 자동 진단은 별도 구현·검증 전까지 제공한다고 주장하지 않는다.
