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

⚠️ 규칙:
1. 위 파일만 생성/수정할 것
2. 다른 teammate의 파일은 절대 수정 금지
3. 구현 완료 후 반드시 TaskUpdate({ taskId: '#{taskId}', status: 'completed' }) 실행
4. 문제가 있으면 Lead에게 메시지로 보고

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
  1. TaskList 호출
  2. 각 Task 상태 확인:
     - in_progress: 정상, 대기
     - completed: 완료, 카운트 증가
     - 변화 없음 3분 이상: teammate 상태 확인
  3. 30초 대기 후 재확인
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
| teammate가 Task를 completed로 안 바꿈 | 5분 후 Lead가 직접 확인 → 리마인드 메시지 |
| teammate 에러 발생 | 에러 로그 확인 → Task를 새로 생성하여 재시도 1회 |
| 재시도도 실패 | 해당 섹션을 skip하고 사용자에게 보고 |
| 파일 충돌 감지 | Lead가 git diff로 확인 → merge 또는 사용자 판단 요청 |
| Wave 전체 실패 | 이후 Wave도 중단, 사용자에게 보고 |

## Delegate 모드 운용

Lead(나)가 Delegate 모드(Shift+Tab)에서 운용할 때:

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
