---
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, mcp__playwright__browser_navigate, mcp__playwright__browser_snapshot, mcp__playwright__browser_take_screenshot, mcp__playwright__browser_console_messages, mcp__playwright__browser_network_requests, mcp__playwright__browser_click, mcp__playwright__browser_type, mcp__playwright__browser_fill_form, mcp__playwright__browser_hover, mcp__playwright__browser_press_key, mcp__playwright__browser_wait_for, mcp__playwright__browser_navigate_back, mcp__playwright__browser_close, mcp__playwright__browser_tabs, mcp__playwright__browser_select_option, mcp__playwright__browser_handle_dialog, mcp__playwright__browser_evaluate, mcp__playwright__browser_resize, mcp__playwright__browser_install
description: QA 시나리오 기반 Playwright 테스트 자동 생성 + 브라우저 탐색 QA + fix-until-pass 루프 (미노스)
---

# /minos

QA 시나리오를 Playwright 테스트로 변환하고, 모든 테스트가 통과할 때까지 자동 수정을 반복합니다.

## 실행 절차

1. `skills/minos/SKILL.md`를 읽어 전체 워크플로우를 파악합니다.
2. 7단계 워크플로우를 순서대로 실행합니다:
   - Step 1: 시나리오 수집 ($ARGUMENTS가 있으면 해당 파일, 없으면 자동 탐색)
   - Step 2: Playwright 코드 생성 (references/playwright-codegen.md 참조)
   - Step 3: 서버 준비
   - Step 4: 테스트 실행
   - Step 5: 브라우저 탐색 QA (references/browser-explorer.md 참조, 탐색 스크립트 생성·실행 → 이슈 회수. `--explore-mcp` 시 Playwright MCP fallback)
   - Step 6: Healer Loop (references/healer-loop.md 참조)
   - Step 7: 결과 보고
3. 각 단계에서 실패하면 사용자에게 보고하고 다음 단계 진행 여부를 확인합니다.

## 사용 예시

```
/minos                           # 자동 감지
/minos @qa-scenarios.md   # 특정 QA 문서
/minos --api-only                # API 테스트만
/minos --ui-only                 # UI 테스트만
/minos --max-retries 3           # 최대 3회 반복
/minos --fix-test-only           # 구현 코드 수정 금지
/minos --explore-only            # 브라우저 탐색 QA만 실행
/minos --no-explore              # 브라우저 탐색 QA 스킵
/minos --no-explore-active       # 탐색 QA 패시브 수집만 (인터랙션 스킵)
/minos --explore-mcp             # 탐색 QA를 Playwright MCP 방식으로 (fallback)
```

> 탐색 QA(Step 5)는 기본적으로 탐색 스크립트(`tests/explore/*.spec.ts`)를 생성·실행하고
> 결과 `report.json`에서 이슈만 추출합니다. Playwright만 있으면 동작하며, MCP 도구는
> `--explore-mcp` fallback에서만 사용됩니다.
