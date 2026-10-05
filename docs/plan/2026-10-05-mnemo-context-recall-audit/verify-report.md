# Argos 검증 보고서 — Mnemo 비벡터 맥락 회상

- 실행일: 2026-10-05, Windows / PowerShell, Python 3.12, Node.js 22.15.
- 대상: [감리 기준](spec.md)의 로컬 회상 도구·공통 Markdown·번들·네 CLI 검색 규약.
- 기준 revision: `4d380e5` 위의 작업 트리. AGENTS.md·GEMINI.md·기존 ZIP·다른 기능의 변경은 제외.
- 상태: **CONDITIONAL — 조건부 통과**. 기능·네이티브 품질 감리, 자동 수정과 실행 재검증 완료.

이후 사용자의 기존 기억 정비 요청으로 닥터에 별도 쓰기 모드를 추가했다. 해당 구현·네 CLI
전역 모듈 갱신·실제 기존 기억 적용은 [닥터 후속 검증](doctor-upgrade-results.md)에 기록한다.
아래 수치와 해시는 이 Argos 실행 당시의 근거로 유지한다.

## 요약

기존 Python 218개와 합성 일반 대화 12개는 통과했지만 독립 경계 검사·네이티브 리뷰·
실제 프로젝트 조회에서 소스 결함 **11개**를 재현했다. 모두 수정하고 회상 회귀를
19→32개로 확대했다. 개인정보 가림·프로젝트 경계·실제 대화 형식·기존 관계 해석·
근거 선택·출력 예산이 대상이었다. 069 기억과 인계의 `13/12` 기록도 실제 `12/12`로 바로잡았다.

최종 소스의 공통 Python **231/231**, 회상 **32/32**(231개 안에 포함), Node 설치·저장·정책
**22/22**, 합성 근거 수집 **12/12**가 통과했다. 실제 설치된 Grok producer의 출력도
검사했다. 해결되지 않은 소스 재현은 없다. 동시 작업으로 생긴 실제 `arch:069` 번호 중복은
양쪽 경로를 경고하도록 보완했으며 원본 기록을 보존했다. 번호 조정은 별도 데이터 작업이다.

사전 CPS·정식 QA/완료 장부·API·UI 감리는 해당 산출물이나 대상이 없어 N/A다.
최종 LLM 답변 정확도·독립 holdout·실사용 시간/토큰과 전면 시크릿 스캔은 NOT RUN이다.
확인한 기능 통과와 남은 데이터·검증 경고를 구분해 조건부 통과로 판정한다.

## Module Coverage

| 모듈 | 실제 읽은 경로 | 적용 상태 | 미실행·대체 범위 |
|---|---|---|---|
| Argos | `C:/Users/Administrator/.codex/skills/argos/SKILL.md`와 `references/verify-protocol.md` | module — phase·자동 수정·재검증·보고서 계약 | 사전 CPS·정식 QA/완료 장부 N/A |
| code-reviewer | `D:/git/claude-code-agent-customizations/skills/code-reviewer/SKILL.md`와 `references/security-audit.md` | module + native — 네이티브 품질 리뷰 완료·보안 경계 검사 | 전면 시크릿·Git 이력 스캔 NOT RUN |
| flow-verifier | 없음 | N/A — 정식 flow-diagrams/ 없음 | 기존 인계 개념도를 메인이 별도로 대조 |
| frontend-design / ui-ux-auditor | 없음 | N/A — UI·디자인 변경 없음 | 디자인 검사 대상 없음 |

## Phase 0 — 설계 추적성

N/A. 이번 spec.md는 사용자 요구와 기존 회상 규약을 모은 **사후 감리 기준**이다.
사전 CPS·섹션 계획·완료 장부를 작성했던 것처럼 주장하지 않는다.

## Phase 1 — 기능과 품질

| 요구 | 수정 후 판정 | 근거 |
|---|---|---|
| R1 조회·프로젝트 경계 | PASS | CLI 전후 파일 비교, external source file/directory alias 거부, 기존 루트 helper |
| R2 기존 태그·본문·기간·순위 | PASS | literal search·untagged·정제 기억 동률·오래된 대화 회귀 |
| R3 질문·응답·예제 경계 | PASS | 실제 Grok 선행 marker와 연속 응답, 복수 User, fence 마감 회귀. 미완료 fence의 복구 경계는 structure_unverified로 공개 |
| R4 기존 관계·근거 추적 | PASS | split/legacy·상태 접두사 링크, 바로 붙은 시각/행번호 선택자, 직접 ID 중복·외부·끊긴 근거 표시 |
| R5 예산·수집 상한·생략 | PASS | 파일별 3턴·순환·60개 상한·전체 본문 생략. Windows의 실제 stdout을 UTF-8로 복호화해 문자 예산 검사 |
| R6 비공개 구간 | PASS | 구조 분리 전 전체 원본 mask, 닫힌·미완료 private와 공개 후속 항목 |
| R7 현재성·적용 판단 | 출력·규약 PASS | CURRENT와 adjacent-unverified 표기, 현재 사용자 정정 우선 규약. 최종 답변 반영은 NOT RUN |
| R8 의존성과 composition | PASS | stdlib+기존 Node helper, 기존 bundleImprovement 재사용, 신규 임베딩·DB·LLM·등록 항목 없음 |
| R9 설치·닥터 회귀 | PASS | 네 격리 설치본 실제 조회, standalone 재번들, 닥터 포함 공통 검사 |
| R10 측정·문서 일치 | PASS | 고정 합성 fixture 재실행, hash와 실행 범위 공개, 잘못된 13/12를 12/12로 수정 |

기능 검증은 독립 읽기 전용 에이전트와 메인의 임시 fixture로 수행했다. 작업자는
보고서·소스·기억을 쓰지 않았다. 네이티브 일반 품질 리뷰도 아래에 병합했다.

### 확인한 결함과 자동 수정

| ID | 심각도 | 수정 전 재현 | 수정·최종 검증 |
|---|---|---|---|
| F1 | High | legacy 기억의 private 내부 제목이 별도 항목으로 분리되어 민감 본문이 반환됨 | mnemo_markdown.mask_private → iter_entry_blocks(exclude_private=True). 민감 조회 0개, 공개 후속·원문 줄 보존 |
| F2 | Medium | 프로젝트 안의 개별 symlink 파일을 통해 외부 본문이 직접 후보로 반환됨 | require_project_path로 본문 열기 전 거부. memory/conversations의 파일·폴더 alias 회귀 통과 |
| F3 | Medium | Grok의 다음 이벤트 선행 marker를 현재 응답의 종료로 해석해 질문이 빠짐 | 실제 종료 marker만 턴을 닫음. 설치된 Grok append-event.js가 저장한 User와 두 응답 동시 조회 |
| F4 | Medium | architecture.md의 001→002 wiki 링크에서 002 제목을 missing으로 판단 | 명시적 번호가 있는 legacy 제목을 이름 색인에 추가. 대체·의존 항목까지 조회 |
| F5 | Medium | fence 내부의 언어 문자열이 있는 줄을 마감으로 오인해 예제 User를 경계로 사용 | fence 마감 줄 전체를 검사. 원래 질문과 실제 응답 보존 |
| F6 | Medium | 같은 근거 파일을 네 번 인용하면 파일당 3턴 상한을 넘어 4턴을 반환 | 정규화 파일별 후보 합집합과 전체 조회의 seen 집합으로 상한 적용. 추가 근거 생략 표시 |
| F7 | Medium | `#L1`/`:1` 근거 선택자가 뒤의 설명에 있는 10:00으로 덮여 엉뚱한 턴을 반환 | 파일 바로 뒤 선택자만 해석하고 명시적 행번호를 우선. 설명 속 시각을 포함한 행·시각 선택자 회귀 통과 |
| F8 | Medium | 기존 닥터가 보존하는 `- ❌ SUPERSEDED` 접두사의 superseded-by 링크를 놓침 | FIELD에서 상태·기호 접두사를 수용. 구형 표기의 실제 대체 항목 조회 |
| F9 | Medium | User의 미완료 fence가 뒤 응답·다음 턴·시각 근거를 삼킴 | 실제 producer frame별 fence 범위와 메시지별 메타데이터 해석. 원문 위치·다음 턴 ID 보존, 복구 경계는 structure_unverified 표시 |
| F10 | Medium | Windows에서 LF→CRLF 변환으로 실제 stdout이 JSON 문자 예산을 넘음 | stdout newline을 LF로 설정. text 변환 없는 subprocess 캡처로 복호화 문자 수·CRLF 부재 확인 |
| F11 | Medium | 같은 예약 ID가 둘인데 limit 1 조회가 하나를 경고 없이 반환 | 직접 질의도 unresolved에 ambiguous와 두 후보 경로를 표시. 중복 ID·limit 1 회귀 통과 |
| D1 | Low | 12개 사례의 성공 수를 기억·인계에 13/12로 기록 | 실제 실행 12/12로 수정, 과거 215개 검사와 최종 231개 검사를 구분 |
| D2 | 데이터 경고 | 동시 작업의 Mnemo와 Recipe 기억이 모두 069를 사용 | F11로 조회 모호성은 공개함. 양쪽 기록과 기존 태그를 보존했으며 번호·연결 조정은 수동 확인 필요 |

F1·F3·F4·F5·F6의 동일 최소 fixture는 독립 검토자가 다시 실행해 모두 해결을 확인했다.
F2는 메인 재현과 두 회귀 검사에서 확인했다. 실행 결함은 각 1회 수정으로 해결했다.
F7~F11도 독립 검토자가 수정 후 재현을 다시 실행해 해결을 확인했다. F9는 Codex의
미완료 fence 뒤 실제 다음 턴과 Grok 선행 marker 형식을 각각 확인했다. F10의 별도
Windows 검사는 15,746자(UTF-8 18,882바이트)로 16,000자 예산을 지켰다. 예산은 바이트 수가 아니다.
Grok 통합 검사 추가 시 테스트에서 hook 설치 경로를 잘못 가정해 한 번 실패했으며,
실제 `GROK_HOME/hooks/grok-mnemo-append-event.js` 경로를 확인해 검사 하네스를 수정했다.
이 실패를 설치기 결함으로 집계하지 않았다.

주요 소스 위치는 `mnemo_markdown.py:9,14,41,95`와 `recall.py:23,94,136,225,306,338,401`이다.
회귀는 `test_recall.py:189,197,235,246,283,309,327,358,371,392`와 실제 Grok
저장기를 호출하는 `scripts/tests/mnemo-improvement-bundle.test.js:60`에 있다.

### 네이티브 일반 품질 리뷰

Codex CLI 0.159.3의 `codex review -`를 읽기 전용·notify 비활성·추가 위임 금지로
실행했다. 사용자 변경과 다른 기능을 제외하는 범위를 prompt에 명시했다. Windows의
통합 셸은 sandbox setup 오류로 한 번 실패했지만 리뷰가 MCP의 읽기 전용 경로로
소스·fixture를 확인해 완료됐다. 네이티브 리뷰의 P2 네 건은 F7~F10으로 병합했으며
중복 집계하지 않았다. 수정 뒤 메인 회귀와 독립 fixture 재검증을 수행했다.

## Phase 2 — 실제 실행

| 검사 | 실제 실행 | 결과 |
|---|---|---|
| 빌드/구문 | Python ast.parse(feature_version=(3,9)) 4개, Node --check 2개 | PASS. 캐시 파일을 만들지 않음. Python 3.9 런타임 자체 실행은 아님 |
| 공통 Python | `python -B -X utf8 -m unittest discover -s skills/mnemo/scripts/tests` | 231/231 PASS, 105.937초 |
| 회상 부분집합 | 동일 discover에 `-p test_recall.py` | 32/32 PASS |
| Node 회귀 | `node --test --test-reporter=spec scripts/tests/mnemo-improvement-bundle.test.js scripts/tests/mnemo-storage-install.test.js scripts/tests/skill-sync-policy.test.js` | 22/22 PASS |
| 보강된 Grok producer | 위 bundle test 파일 8개 및 최종 22개 전체 실행에 포함 | PASS, 실제 격리 설치 hook 출력 사용 |
| 고정 합성 사례 | `python -B -X utf8 skills/mnemo/evals/evaluate_recall.py` | 12/12, JSON 16,000자 이내, fixture 파일 무변경 |
| 실제 프로젝트 | arch:056, scope memory, limit 1, max-chars 32000 | 056 SUPERSEDED→069 CURRENT, 두 본문 조회. 508파일·3,067항목, 31,695자. 선택 10개·본문 생략 0·항목 생략 1 |
| 실제 번호 중복 | arch:069, scope memory, limit 1 | 직접 일치 2개, unresolved에 두 069 경로와 ambiguous 공개 |
| 문서·해시 대조 | 대상 문서 5개·로컬 링크 13개·소스 해시 3개 | PASS, 새 파일의 공백도 확인 |
| 인계 문서 | `python -B -X utf8 skills/mnemo/scripts/validate_handoff.py docs/handoffs/2026-10-05-150801-mnemo-nonvector-recall.md` | READY. 인계 형식·파일 참조 검사이며 전체 시크릿 감사나 기능 성능 점수가 아님 |
| diff 공백 검사 | 대상 소스·문서·테스트의 `git diff --check` | PASS |

실제 프로젝트 조회 1회는 약 2.006초였다. 성능 향상이나 p95 근거로 취급하지 않는다.
이는 문서 정리 전 프로젝트 스냅샷이며 동시 기록·기억 갱신에 따라 파일·항목 수와 출력은 달라진다.
테스트는 Windows의 격리 프로필에서 도구를 실행했으며 네 CLI의 실제 모델 세션을
시작하거나 macOS/Linux 훅 실행 parity를 새로 인증한 것이 아니다.

## Phase 3 / API, MCP

N/A. 이 변경은 로컬 Python 조회 CLI이며 HTTP route·MCP server/tool을 추가하지 않는다.
API 직접 요청 인증·인가 게이트는 대상 API가 없어 적용하지 않는다.

## Phase 4 / QA 및 Phase 4A / 완료 장부

정식 qa-scenarios.md·checklist.md·checklist-status.md는 없다. 해당 산출물 감리는 N/A이며
체크박스나 proved 장부를 사후에 만들지 않았다. 기존 JSON 사례와 새 회귀의 실제 실행은
Phase 2에 별도로 기록했다. 합성 연결 수집 제외 실험의 3/12→12/12는 기존 Mnemo
에이전트 전체 능력이나 최종 LLM 답변 정확도의 비교 수치가 아니다.

## Phase 5 / 도면 및 Phase 6 / 디자인

정식 flow-diagrams/와 UI·design-system.md가 없어 각 전용 Phase는 N/A다. 보조 대조로
기존 인계의 `입력→루트→Markdown→직접 후보/기존 링크→JSON 예산→현재 에이전트`
흐름을 실제 main/load_records/matching/Context.related/recall에 매핑했다. 오류는
CLI parser.error, 링크 미해결, 예산 생략으로 나뉜다. 마지막 조건 판단과 답변은 현재
에이전트 책임이며 도구 코드의 구현 노드로 세지 않았다.

## Phase 7 — 보안

- 범위: 이번 Mnemo 조회 경로·지원 파일·설치 경로. 전체 저장소의 다른 스킬·MCP·배포까지 안전하다고 인증하지 않는다.
- 진입점은 로컬 CLI의 프로젝트 경로·검색어와 Markdown 파일이다. 네트워크 전송·SQL·HTML 렌더링·권한 있는 원격 도구 호출이 없다.
- 외부 source alias는 본문을 열기 전에 거부한다. 외부 evidence·모호한 링크는 추정하지 않고 표시한다.
- private mask는 구조 분리 전에 적용하고 출력은 별도로 redact한다. 원본 파일 삭제·모든 개인정보 탐지는 보장하지 않는다.
- 검색어는 literal substring이며 shell을 실행하지 않는다. 기존 root helper도 subprocess 인자 배열을 사용한다.
- 입력 개수·길이·scope·직접 후보·문자 예산을 검증하고 연결·본문 생략을 공개한다. 전체 입력 파일 읽기의 대용량 p95는 미측정이다.
- STRIDE: 정보 노출의 F1/F2를 재현·수정했다. 읽기 전용이라 변조·쓰기 부인 방지의 신규 경로는 없고, 비용은 출력/연결 상한으로 제한한다. Markdown의 지시문은 근거 데이터이며 현재 사용자 지시를 대체하지 않는다.

### Coverage gaps

- NOT RUN: gitleaks/trufflehog 등 redacting scanner가 설치되지 않아 현재 파일 및 Git 이력의 전면 시크릿 검사는 실행하지 않았다. 비밀값 raw grep·git log -p도 실행하지 않았다.
- `.env`·`.env.*`의 파일명 대상 Git 이력 조회에는 결과가 없었다. 이것만으로 비밀 부재를 인증하지 않는다.
- N/A: Mnemo 자체의 신규 pip/npm 의존성·manifest·lock 변경이 없다. 다른 MCP 패키지의 공급망 감사는 범위 밖이며 CVE 0건으로 보고하지 않는다.
- NOT RUN: 다른 기능의 CI/CD·배포·운영 서버 보안. 이 변경은 해당 설정을 변경하지 않았다.

## Phase 8 — 도메인사전

N/A. 이 기능의 domain-dictionary.md와 새 업무 도메인 식별자는 없다.

## 재현 버전과 공식 근거

- recall.py SHA-256: `1128b2dfdf1e7fc700b88ce7dce678e500b1c99d442344abdea49446b1ee419c`.
- mnemo_markdown.py SHA-256: `d23ba97098dab44e32e40149670418fbc1764d7a81d348b33c66b02dcd5f59a0`.
- recall-cases.json SHA-256: `803aca50b32b064f2ced89cca22aa59e71cd9a272f4618ff36c1a50948afe020`.
- 마감 fence 뒤에 언어 문자열을 허용하지 않는 기준은 [CommonMark 0.31.2 §4.5](https://spec.commonmark.org/0.31.2/#fenced-code-blocks)로 확인했다.
- resolved 경로에 사용하는 is_relative_to의 Python 3.9 지원은 [Python 공식 pathlib 문서](https://docs.python.org/3.9/library/pathlib.html#pathlib.PurePath.is_relative_to)로 확인했다.

## 남은 범위

데이터 D2의 실제 대상은 `memory/architecture/069-mnemo-nonvector-context-recall.md`와
`memory/architecture/069-recipe-library-harvest-outside-repo.md`다. 한쪽 번호만 자동 변경하면
기존 `arch:069` 태그와 링크의 의미를 함께 옮길 수 없으므로 소유자 간 번호·근거 연결 조정이
필요하다. 이번 감리에서는 Recipe 원본을 변경하지 않고 조회 모호성을 명시했다.

최종 LLM 답변의 조건 반영·오래된 선호 오인율·독립 holdout·실사용 시간/토큰은 NOT RUN.
현재 사용자 홈의 전역 설치 갱신·릴리즈·commit/push도 실행하지 않았다. MEMORY.md의 기존
18KB 이상 크기는 외부 TermSnap 관리 블록과 관련된 별도 문제로 이번 소스 수정에서 건드리지 않았다.

#tags: argos mnemo 비벡터검색 맥락회상 회귀검증 arch:069
