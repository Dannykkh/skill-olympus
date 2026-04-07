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
   - Step 5: 브라우저 탐색 QA (references/browser-explorer.md 참조, Playwright MCP 사용)
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
```
