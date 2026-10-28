# Final Report Format — Zeus Phase 6

`docs/zeus/zeus-report.md` 생성 형식과 결과 판정 기준.

---

## 리포트 마크다운 형식

```markdown
# Zeus Report
- 입력: "{원본 설명}"
- 총 소요: {duration}
- 결과: SUCCESS / PARTIAL / BLOCKED / FAILED
- 이전 실행 아카이브: {docs/zeus/archive/YYYYMMDD-HHMMSS 또는 "첫 실행"}

## Phase 0: Description Parsing — ✅
- 산업군: {industry}
- 기술스택: {techStack}
- 기능: {features.length}개

## Phase 1: Planning — ✅ / ❌
- 섹션: N개, 에러: N건

## Phase 2: Implementation (agent-team) — ✅ / ❌
- 섹션: N개, Wave: N개
- 마스터 체크리스트: M/N 통과 (XX%)
- 생성 파일: N개

## Phase 3: Verification (argos) — ✅ / ⚠️
- 최종 등급: PASS / CONDITIONAL / FAIL
- 검증 항목: N개, 통과: N, 미통과: N
- 미해결 이슈/AC·미실행 범위: {ID, 심각도, 상태, 보고서·수리 이력 경로}

## Phase 4: Docker Setup — ✅ / ⚠️ 폴백
- 모드: {Docker / Dev Server}

## Phase 5: Testing — ✅ / ⚠️ 폴백 실행 / ❌
- Minos 최종 등급: PASS / CONDITIONAL / FAIL
- 자동 테스트: 통과 N / 전체 N, 통과율 N% (미실행이면 NOT RUN)
- 탐색 QA: {P0/P1 및 P2/P3 미해결, 탐색 결과 경로}
- 미해결·미실행: {이슈/AC ID, 심각도, exhausted/blocked/NOT RUN/UNVERIFIED와 원인}
- 수리 이력: {기존 경로와 이슈별 할당/사용/남은 예산}; 확인 불가이면 UNVERIFIED

## 요구사항 → 증거
| Phase | 요구사항/AC | proved/weak/missing/contradicted | 실행 증거·미해결 범위 |
|-------|-------------|--------------------------------|-----------------------|
| ... | ... | ... | ... |

## Errors & Recovery
| Phase | Step | Error | Recovery |
|-------|------|-------|----------|
| ... | ... | ... | ... |

## Decision Ledger (Taste Decisions — 사후 결재)
> Zeus가 자동 결정했지만 사용자가 다르게 판단할 수 있는 항목들입니다.
> 질문을 사전에 하지 않는 대신 결재를 사후로 미룹니다 — 항목마다 되돌리는 법까지 기록해
> 모든 결정을 검토 가능하고 뒤집기 가능한 상태로 유지합니다.

| # | Phase | 결정 | 선택 | 근거 | 기각한 대안 | 되돌리는 법 |
|---|-------|------|------|------|-------------|-------------|
| 1 | ... | ... | ... | ... | ... | ... |

## Next Steps
- [ ] docs/zeus/zeus-report.md 검토
- [ ] Decision Ledger 검토 — 다르게 판단되는 항목은 "되돌리는 법"을 따라 변경
- [ ] 자동 생성 코드 리뷰
- [ ] git commit && push
- [ ] Phase 4 docker-deploy 내부 모듈 상태와 배포 산출물 검토
```

---

## 결과 판정 기준

> 판정은 자식 하네스의 **최종 등급과 현재 버전의 실행 증거**를 함께 보존한다.
> Phase를 계속 진행하거나 리포트를 작성해도 argos·minos의 실패·미검증은 남는다.

| 조건 | 결과 |
|------|------|
| Phase 1~5 증거 모두 proved + argos PASS + minos 최종 PASS + 필수 빌드·회귀검사 통과 | SUCCESS |
| 자식 CONDITIONAL/FAIL, 또는 일부 weak/missing/contradicted 증거가 남음 | PARTIAL — 최종 등급·실패와 미검증 범위를 각각 명기 |
| 상태 충돌·필수 접근/전제 부재로 남은 작업을 진행할 수 없음 | BLOCKED — 원인·보존한 상태·재개 조건 명기 |
| docker-deploy 카탈로그 행/경로/필수 reference 로드 실패 | PARTIAL 이하 — Phase 4 `weak`, dev-server 폴백과 `BLOCKED` 사유 명기 |
| FATAL 에러로 중단 | FAILED |

**Phase 5 증거 채점:** minos PASS이고 필수 범위의 현재 증거가 있으면 `proved`, CONDITIONAL이면
`weak`, 확인된 실패가 있으면 `contradicted`다. 필수 검증 미완료로 인한 FAIL은 `weak`와
`NOT RUN`/`UNVERIFIED` 원인을 기록한다. 실행 증거 자체가 없으면 `missing`이다. 확인된 실패와
미실행이 함께 있으면 둘 다 기록하고 `contradicted`를 유지한다. 이 채점은 minos의 최종 FAIL을
CONDITIONAL로 바꾸는 규칙이 아니다.

자동 테스트 100%도 탐색 QA 실패, 필수 미실행, 기존 fixme나 소진 이슈를 지우지 못한다.
통과율 임계치를 낮추거나 자식 등급을 자동 승인해 SUCCESS로 올리지 않는다. 통과/전체 수치는
실제로 실행한 결과에서만 가져온다. 완료 promise는 SUCCESS일 때만 출력한다.

---

## Phase 6 진입 조건 (필수 체크)

Phase 6 시작 전 아래를 확인한다. `없으면`의 후속 실행은 원래 자식 예산과 필수 전제가 남아 있는 경우에만 수행한다.

| # | 증거 | 없으면 |
|---|------|--------|
| 1 | `plan.md` 존재 | Phase 1 폴백 실행 |
| 2 | `zeus-log.md`에 agent-team 기록 | Phase 2 폴백 실행 |
| 3 | `zeus-log.md`에 argos 실행 기록 | Phase 3 실행 |
| 4 | `zeus-log.md`에 서버 실행 시도 기록 | Phase 4 실행 |
| 5 | minos 실행 시도와 Step 7 결과: 최종 등급·자동 테스트 수치 또는 NOT RUN·탐색 QA·미해결/미실행 범위 | 남은 예산 안에서 Phase 5 재개; 실행 불가이면 그 결과를 기록 |

**누락 증거를 채울 수 있는 독립 작업과 원래 예산이 남아 있으면 먼저 실행한다.** 더 진행할 수
없으면 초기 상태 충돌이나 필수 접근 부재처럼 Phase 0~5가 시작되지 않았어도
`PARTIAL`/`BLOCKED`/`FAILED` 종결 보고를 허용한다. 실행한 범위와 `NOT RUN`/`UNVERIFIED` 범위,
실제 소진/차단 사유, 이슈/AC ID와 할당·사용 예산의 기존 출처, 재개 조건을 적는다. 예산을
확인할 수 없으면 `UNVERIFIED`로 남기며 보고 근거를 만들려고 수리를 재시작하지 않는다.

미실행 Phase의 체크 표시·완료 상태·테스트 수치·자식 최종 등급을 만들어내지 않는다.
Minos Step 7이 실제 최종 FAIL을 반환했으면 그대로 보존하고, Minos 자체가 실행되지 않았으면
등급도 `NOT RUN`이다. 실행 증거 없는 Phase는 `missing`이며 종결 보고가 SUCCESS의 근거가 되지 않는다.
상태 충돌 시 두 원본을 보존하고, 기존 보고서도 안전하게 갱신할 수 없거나 쓰기 권한이 없으면
파일 덮어쓰기 대신 최종 응답으로 동일한 미완료 보고를 전달한다.

자동 재개 해제는 [SKILL.md의 비성공 종료 규칙](../SKILL.md#비성공-종료와-자동-재개-해제)을 따른다.
컨텍스트 부족만으로는 종결하지 않는다. 안전하게 쓸 수 있는 `zeus-state.json`에 실제 다음 누락
Phase를 저장하고 핸드오프하며, 기존 증거·자식 예산을 유지한다.
