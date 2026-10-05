# Mnemo Doctor 기존 기억 정비 — 후속 검증

- 날짜: 2026-10-05, Windows / PowerShell, Python 3.12.
- 요구: 기존 기억을 지금의 규칙에 맞춰 다시 정비할 수 있어야 한다는 현재 사용자 요청.
- 범위: `--upgrade-memory`, 기존 설치 bundler, 실제 네 CLI 모듈 갱신과 이 프로젝트의 기존 기억 정비.
- 앞선 [Argos 보고서](verify-report.md)의 실행·해시·합성 평가는 당시 결과로 보존한다. 이 문서는 이후 닥터 변경의 실행 근거다.

## 적용 계약

기존 파일과 항목 번호를 유지하며 실제로 확인되는 Markdown 경로를 보정한다. 공개된
`참조:`·`근거:`·`출처:`의 명시적 대화 링크만 `evidence:`로 승격한다. Markdown 링크는 문서
기준, evidence는 프로젝트 루트 기준이다. 기존 evidence와 명시적 `#L행번호`를 보존한다.

번호·작성 CLI·날짜·상태·조건을 추측해 채우지 않는다. private·fence·외부 대상·복수 후보·
확인 불가 원문은 보정 대상에서 제외하거나 확인 대상으로 남긴다. 모든 항목 경계를 먼저
확인하고 파일별 원문 바이트 백업, 동시 변경 확인, 원자 교체를 수행한다. CRLF도 보존한다.

기본 진단과 핸드오프 주기 방문은 이 쓰기 모드를 자동 실행하지 않는다. 기존 `--fix`의
세 가지 보정 계약은 유지한다. 상세 정본은 [기억 위생](../../../skills/mnemo/docs/memory-hygiene.md)이다.

## 실행 검증

| 검사 | 실제 결과 |
|---|---|
| 전체 Python unittest | 243/243 PASS, 새 정비 검사 12개 포함 |
| 기존 Doctor 회귀 | 39/39 PASS, 위 243개에 포함 |
| Node 설치·저장 경계·정책·Devin | 최종 25/25 PASS; 앞선 네 CLI 검사 22개에 Devin 관련 3개 포함 |
| 네 CLI fresh standalone 설치본 | 실제 구형 기억 정비 → 질문·응답 근거 회상 PASS |
| 전역 설치 자산 | 기존 네 모듈 각 25개, 총 100개 갱신; 배포 manifest SHA-256과 실제 파일 모두 일치 |
| 실제 프로젝트 두 번째 정비 | 대상 파일 0개 / 보정 0개 / 추가 백업 0개; memory 파일·백업 SHA-256 변화 없음 |
| 정비 전후 기존 메타데이터 | 원문 백업 16개 대조: tags/date/source/status/대체·의존·재검토 필드 변화 없음 |
| 실제 네 설치본의 새 옵션 | 모두 `--help`에 `--upgrade-memory` 제공 |
| 실제 네 설치본의 `arch:031` + `.gitignore` | 기존 기억 본문과 근거 대화 2개 반환, 질문·응답 확인, 미해결 연결 0개 |
| 실제 네 설치본의 `arch:056` | SUPERSEDED 056과 CURRENT 069 연결, 근거 대화 5개 반환, 미해결 연결 0개 |
| Devin 공유 Mnemo와 설치된 producer | 한국어 질문·응답 저장 → 구형 근거 정비 → 공통 회상 PASS, private fixture 제외 |
| 정비 방문 차트 | 최종 설치본의 실제 재실행에서 `--upgrade-memory`와 보정 0개를 정확히 기록 |

```powershell
python -B -X utf8 -m unittest discover -s skills/mnemo/scripts/tests
node --test --test-reporter=spec scripts/tests/mnemo-improvement-bundle.test.js scripts/tests/mnemo-storage-install.test.js scripts/tests/skill-sync-policy.test.js scripts/tests/devin-mnemo.test.js
python -B -X utf8 C:/Users/Administrator/.codex/skills/codex-mnemo/scripts/mnemo_doctor.py --project-root D:/git/claude-code-agent-customizations --upgrade-memory
```

멱등성 검사는 설치된 Codex 모듈의 `upgrade_memory_format(root, report, fix=True)`를 직접
재실행해 확인했다. 전체 CLI를 다시 실행하면 의도적으로 방문 차트를 덧붙이므로, 원래
기억·백업의 무변경 여부와 방문 기록을 구분했다.

## 실제 기존 기억 적용

2026-10-05 18:59:23에 **파일 16개 / Markdown 경로 11개 / 항목 evidence 21개**를 정비했다.
새 기억으로 복제하지 않았고 기존 파일 옆에 `.bak-20261005-185923-<microseconds>`를 남겼다.
끊긴 로컬 링크 진단은 **43 → 32**로 줄었다. 나머지 32개는 연결 근거가 확인되지 않아
원문을 유지했다. CLI 종료 코드 1은 남은 프로젝트 진단 FAIL을 뜻하며 정비 쓰기 실패는 아니다.

실제 적용에는 설치된 Codex Doctor를 사용했다. 전역 모듈 갱신 전 자산 백업은
`C:/Users/Administrator/.codex/.mnemo-deploy-backups/20261005T095856607Z`에 있다.
네이티브 설정·훅 등록·스킬 활성화 목록은 변경하지 않았다.

파일 링크를 보완해도 턴 시각·예약 태그가 없는 옛 대화를 ID 하나로 특정할 수 있는 것은
아니다. 실제 `arch:031` 단독 조회는 기억 본문을 반환했지만 대화는 `turn-not-located`였다.
`.gitignore`를 추가한 조회에서는 같은 파일의 관련 질문·응답 2개를 연결했다. 닥터가 대화
시각을 지어내지 않고 현재 에이전트의 검색어·본문 확인을 사용하는 경계다.

## 남은 범위

- 미확인 링크 32개, 중복 architecture 069, 기존 상태·재검토 조건 누락은 자동으로 메우지 않았다.
- 실제 최종 LLM 답변 정확도·독립 holdout·시간/토큰 감소는 NOT RUN.
- 앞선 합성 회상 12/12는 이번에 재실행하지 않았다. 회상·공통 Markdown 소스는 이번 변경에 포함되지 않았다.
- Python 3.9 구문 호환은 AST로 확인했으며 실제 실행 환경은 Python 3.12다.
- 닥터 정비 단계에서는 ZIP·릴리즈·Git 커밋/푸시를 실행하지 않았다. 이후 사용자의 커밋·핸드오프 요청에 따른 최종 커밋은 로컬 `docs/handoffs/`에 기록한다. 동시 세션의 Recipe/MCP 변경과 관찰 offset은 보존했다.

## 이후 요청 — 5개 CLI 확인과 커밋 준비

사용자의 “5대 llm 다 적용?” 질문에 따라 Devin CLI 3000.11.3과 실제 설정을 확인했다.
Claude 설정 호환이 활성화되어 있고 공통 Mnemo 설치본의 회상·닥터를 사용한다. 별도
다섯 번째 전체 동기화 대상이나 중복 패키지를 만들지 않았다.

설치 진단에서 Devin 훅 자산 3개의 stale 상태를 발견해 백업 후 갱신했다. 새 통합 검사에서는
Python stdout cp949를 Node가 UTF-8로 해석해 한국어 응답이 깨지는 결함을 재현했다.
DB 조회용 Python을 `-X utf8`로 고쳐 설치된 producer의 한국어 저장·정비·회상을 통과했다.
설치 설정 검사도 PASS이며 config.json·글로벌 AGENTS.md는 보존했다. 갱신 전 백업은
`C:/Users/Administrator/.codex/.mnemo-deploy-backups/20261005T110639818Z`다.
실제 Devin 모델의 새 대화 턴은 이번에 실행하지 않았으며, producer 검사는 격리 SQLite fixture다.

새 정비 모드가 차트에 `진단만`·`고친 것: 없음`으로 기록되는 누락도 수정했다. 현재는
`--upgrade-memory`와 실제 보정 수량을 남긴다. 기존 append_chart 호출 계약은 유지했다.
최종 소스로 Python 243개·Node 25개를 다시 통과했다. 네 설치본의 Doctor 파일도 백업 후
갱신하고 자산 100개를 현재 소스와 다시 대조했다. 백업은
`C:/Users/Administrator/.codex/.mnemo-deploy-backups/20261005T111303203Z`다.
실제 프로젝트 재실행에서 새 기억 수정 0개와 올바른 방문 차트를 확인했다. 이전 방문은
append-only 역사로 남기고, 실제 최초 정비 수량 16/11/21은 이 문서의 적용 기록을 따른다.

## 검증 소스 SHA-256

| 경로 | SHA-256 |
|---|---|
| skills/mnemo/scripts/mnemo_doctor.py | `4eba6c78661b3e4d71ded4fb645e3596834487342a9f863edec6f0cf18c0d344` |
| skills/mnemo/scripts/bundle-improvement.js | `766a4521841bb592097357fced18900ba148ac15e29b1189fa2fbc4a2ff12af2` |
| scripts/skill-catalog.js | `35b52d8f8ff3deaa256d32d889422c0e077775877c115907b4a63ef4addbee20` |
| skills/mnemo/scripts/tests/test_mnemo_doctor_upgrade.py | `95e2df5e92374252d8c4278ff6a6441190128567f9a8be19700ebd8d2d7d398c` |
| skills/devin-mnemo/hooks/save-turn.js | `f35daef53bf113b5c80cf8665872ccb1104d6385308b6fd9e272cc52827978ab` |
| scripts/tests/mnemo-improvement-bundle.test.js | `768ab3e1e5857e235ce49578849c0d7b11ad3f852485c0007476e6f5c0ee817e` |
