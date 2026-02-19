---
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
description: QA 시나리오 기반 Playwright 테스트 자동 생성 + fix-until-pass 루프 (큐패신저)
---

# /qpassenger

QA 시나리오를 Playwright 테스트로 변환하고, 모든 테스트가 통과할 때까지 자동 수정을 반복합니다.

## 실행 절차

1. `skills/qpassenger/SKILL.md`를 읽어 전체 워크플로우를 파악합니다.
2. 5단계 워크플로우를 순서대로 실행합니다:
   - Step 1: 시나리오 수집 ($ARGUMENTS가 있으면 해당 파일, 없으면 자동 탐색)
   - Step 2: Playwright 코드 생성 (references/playwright-codegen.md 참조)
   - Step 3: 테스트 실행
   - Step 4: Healer Loop (references/healer-loop.md 참조)
   - Step 5: 결과 보고
3. 각 단계에서 실패하면 사용자에게 보고하고 다음 단계 진행 여부를 확인합니다.

## 사용 예시

```
/qpassenger                           # 자동 감지
/qpassenger @claude-qa-scenarios.md   # 특정 QA 문서
/qpassenger --api-only                # API 테스트만
/qpassenger --ui-only                 # UI 테스트만
/qpassenger --max-retries 3           # 최대 3회 반복
/qpassenger --fix-test-only           # 구현 코드 수정 금지
```
