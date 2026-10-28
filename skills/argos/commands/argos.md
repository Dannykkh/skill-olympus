---
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
description: 설계 산출물 대비 구현 검증 — 준공검사 감리 (아르고스)
---

# /argos

설계 산출물(spec, api-spec, qa-scenarios, flow-diagrams) 대비 실제 구현을 검증합니다.

## 실행 절차

1. `skills/argos/SKILL.md`를 읽어 전체 워크플로우를 파악합니다.
2. `--report-only`는 기존 보고서만 표시합니다. 그 외에는 요청 범위의 Phase를 순서대로 검증합니다:
   - Phase 0: CPS Traceability (Problem→Solution, Ecosystem→Section 매핑)
   - Phase 1: Static Analysis (기능 요구사항 vs 코드, 비기능/품질)
   - Phase 2: Runtime Verification (빌드, 단위 테스트, E2E)
   - Phase 3: API Spec Verification (api-spec.md vs 실제 라우트)
   - Phase 3A: MCP Spec Verification (mcp-spec.md vs 실제 등록 도구)
   - Phase 4: QA Scenario Checklist (qa-scenarios.md 항목별 통과/실패)
   - Phase 4A: 완료 기준 이행 감리 (checklist.md가 있을 때)
   - Phase 5: Flow Diagram Verification (flow-diagrams/ 노드 매칭)
   - Phase 6: Design Compliance (design-system.md 준수 + AI Slop + 0-10 채점)
   - Phase 7: Security Review (시크릿 + 의존성 + OWASP + STRIDE)
3. 결과를 `<planning_dir>/verify-report.md`에 저장합니다. 읽기 전용 요청에서는 파일 대신 응답으로 제공합니다.
4. 수리가 허용된 실패 항목만 SKILL.md의 `결과 보고 및 자동 수정`으로 전달합니다. 이때만 source-only 디버깅 모듈을 직접 읽으며, 기존 항목별 라운드·권한·최종 판정 기준을 유지합니다.

## 사용 예시

```
/argos                              # 자동 감지 (docs/plan/*/spec.md)
/argos @docs/plan/my-feature/       # 특정 planning_dir
/argos --phase 1                    # 정적 분석만
/argos --skip-build                 # 빌드 검증 스킵
/argos --skip-e2e                   # E2E 검증 스킵
/argos --report-only                # 기존 보고서 표시만
```
