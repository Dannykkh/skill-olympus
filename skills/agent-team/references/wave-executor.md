# Wave Executor

Wave별 teammate 조율 및 실행 프로토콜.

## Wave 실행 사이클

```
Wave 1: [section-01, section-02, section-03] ──→ 병렬 실행
                                                    │
                                              모든 Task completed
                                                    │
Wave 2: [section-04, section-05] ──────────────→ 병렬 실행
                                                    │
                                              모든 Task completed
                                                    │
Wave 3: [section-06] ─────────────────────────→ 순차 실행
```

## 실행 절차

### 1. Wave 시작 전 검증

```
for each task in wave:
  - blockedBy 목록의 모든 Task가 completed인지 확인
  - 하나라도 미완료 → 해당 Task 스킵 (다음 폴링에서 재확인)
```

### 2. Teammate 생성 및 지시

각 Task에 대해 teammate에게 자연어로 지시:

```
"Section NN: {name}을 구현해줘.

먼저 Task #{taskId}를 TaskGet으로 읽어서 상세 내용을 확인해.
description에 구현해야 할 전체 내용이 있어.

담당 파일:
- src/core/foundation.ts
- src/core/types.ts

📐 프로세스 도면: {diagram_path} (노드: {node_ids})
  - 해당 .mmd 파일을 Read로 읽고, 담당 노드의 로직을 구현해.
  - 분기(decision) 노드는 모든 경로(Yes/No/에러)를 빠짐없이 구현해.
  (도면이 없는 섹션이면 이 블록 생략)

⚠️ 규칙:
1. 위 파일만 생성/수정할 것
2. 다른 teammate의 파일은 절대 수정 금지
3. 구현 완료 후 반드시 TaskUpdate({ taskId: '#{taskId}', status: 'completed' }) 실행
4. 문제가 있으면 Lead에게 메시지로 보고 (SendMessage 사용 시 반드시 summary 파라미터 포함)
5. 완료 시 Lead에게 다음만 반환할 것
   - 변경 파일
   - 실행한 테스트와 결과
   - 계획 이탈과 이유
   - 남은 위험

Lead만 conversations/{YYYY-MM-DD}-team-poseidon.md에 activity log를 기록한다.
여러 작업자가 같은 로그 파일을 동시에 수정하지 않는다.

선행 섹션 결과:
{선행 섹션에서 생성된 파일 목록 + 주요 인터페이스/타입 요약}
"
```

### 3. Teammate 수 관리

| Wave 내 섹션 수 | 전략 |
|-----------------|------|
| 1~5개 | 전부 동시 실행 |
| 6~10개 | 5개씩 sub-wave로 분할 |
| 11개 이상 | 5개씩 분할 + 사용자에게 경고 (비용 주의) |

### 4. 모니터링 루프

```
while (wave의 모든 Task가 completed가 아님):
  1. 현재 런타임의 task/agent 상태 확인
  2. 각 Task 상태 확인:
     - in_progress: 새 출력이나 상태 전이가 있으면 계속 대기
     - completed: 반환 보고와 실제 파일·테스트 결과를 대조
     - 장시간 상태 변화 없음:
       a. 담당 파일과 실행 로그에서 부분 진행 여부 확인
       b. 작업자에게 상태 요청 또는 현재 interrupt 기능으로 중단
       c. 범위를 줄여 새 작업자에게 1회 재위임
  3. permission mode나 sandbox를 자동 완화하지 않음
```

### 5. Wave 완료 처리

모든 Task가 completed되면:

1. **결과 수집**: 각 섹션에서 생성/수정된 파일 목록 확인
2. **선행 컨텍스트 준비**: 다음 Wave의 teammate에게 전달할 정보 구성
   - 이번 Wave에서 생성된 파일 경로
   - 주요 export/interface/type 정보 (파일 헤드 읽기)
3. **로그 출력**:
   ```
   Wave {N} 완료: {M}개 섹션 성공
   생성된 파일: {file_count}개
   다음 Wave: {next_wave_sections}
   ```
4. **컨텍스트 체크 (Wave 전환 시 필수)**:
   - 남은 Wave 수 대비 현재 대화 길이를 판단
   - 대화가 매우 길어졌다면 (응답이 느려지거나, compact가 이미 실행되었거나):
     - 현재까지 결과를 `conversations/{YYYY-MM-DD}-team-poseidon.md`에 저장
     - 실행 중 작업자를 현재 런타임의 정상 종료/interrupt 절차로 중단
     - `zeus-state.json` 또는 핸드오프 파일에 "Wave {N+1}부터 재개" 기록
     - 사용자에게 "새 세션에서 `/agent-team`을 다시 실행하면 Wave {N+1}부터 재개됩니다" 안내
   - 여유가 있으면 다음 Wave로 즉시 진행

## 선행 섹션 컨텍스트 전달

Wave 2+ 실행 시, 선행 섹션의 결과를 teammate에게 전달:

```markdown
## 선행 섹션 결과

### section-01-foundation (완료)
생성된 파일:
- src/core/foundation.ts — BaseModule class, init() function
- src/core/types.ts — AppConfig interface, ModuleStatus enum

### section-02-config (완료)
생성된 파일:
- src/config/index.ts — loadConfig(), validateConfig()
- src/config/defaults.ts — DEFAULT_CONFIG object
```

**핵심**: 전체 파일 내용이 아닌 **파일 경로 + 주요 export 요약**만 전달 (컨텍스트 효율)

## 실패 처리

| 상황 | 대응 |
|------|------|
| teammate가 Task를 completed로 안 바꿈 | 담당 파일·테스트·상태 전이 확인 → interrupt → 범위를 줄여 1회 재위임 |
| teammate 에러 발생 | 에러와 부분 변경 확인 → 새 작업자에게 같은 소유 범위로 1회 재위임 |
| 재시도 후에도 실패 | 해당 섹션을 메인 컨텍스트에서 순차 실행하거나 사용자에게 보고 |
| 파일 충돌 감지 | Lead가 git diff로 확인 → merge 또는 사용자 판단 요청 |
| Wave 전체 실패 | 이후 Wave도 중단, 실행 중 작업자를 정상 종료한 뒤 사용자에게 보고 |
| 작업 완료 또는 중단 | 실행 중 작업자만 정상 종료/interrupt하고 런타임 상태 디렉터리는 수동 삭제하지 않음 |

## CLI별 실행 형식

위 사이클은 Claude(Agent Teams) 기준. 다른 CLI는 같은 사이클을 아래 도구로 수행한다:

| CLI | 읽기 전용 역할 | 구현 역할 | 모니터링·정리 |
|-----|----------------|-----------|----------------|
| **Claude** | `Explore` | `general-purpose`; Agent Teams 활성 시 named background `Agent` | shared task list/`SendMessage`; 실행 중 teammate만 shutdown, implicit team은 자동 정리 |
| **Codex** | `explorer` | `worker` (`default` 폴백) | 현재 `wait_agent`·`send_message`·`interrupt_agent` 계열 도구 |
| **Gemini** | `codebase_investigator` | `generalist` | 호출 반환을 검증; 별도 팀 정리 없음 |
| **Grok** | `explore` | `general-purpose` | 호출 반환을 검증; 별도 팀 정리 없음 |

**Gemini/Grok 공통 주의:**
- 중간 개입 채널이 없다 (fire-and-return). 지시 프롬프트에 완료 기준·담당 파일·소유권 규칙을 빠짐없이 담을 것.
- 반환 요약을 그대로 믿지 말 것 — 담당 파일 실존(Glob/Read)과 Acceptance Criteria 대조로 교차 검증.
- 실패 시 재위임 1회 → 그래도 실패면 Lead가 직접 서브태스크 분해 또는 사용자 보고.

## Lead 전용 조율

Lead는 다음 경계를 지킵니다.

```
Lead 역할:
  ✅ Task 생성/관리
  ✅ teammate 지시/모니터링
  ✅ Wave 전환 결정
  ✅ 결과 검증
  ❌ 직접 코드 작성 (teammate에게 위임)

Teammate 역할:
  ✅ 코드 작성
  ✅ 파일 생성/수정
  ✅ Task 상태 업데이트
  ❌ 다른 teammate 파일 수정
```
