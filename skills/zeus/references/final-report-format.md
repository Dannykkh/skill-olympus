# Final Report Format — Zeus Phase 6

`docs/zeus/zeus-report.md` 생성 형식과 결과 판정 기준.

---

## 리포트 마크다운 형식

```markdown
# Zeus Report
- 입력: "{원본 설명}"
- 총 소요: {duration}
- 결과: SUCCESS / PARTIAL / FAILED
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
- 검증 항목: N개, 통과: N, 미통과: N

## Phase 4: Docker Setup — ✅ / ⚠️ 폴백
- 모드: {Docker / Dev Server}

## Phase 5: Testing — ✅ / ⚠️ 폴백 실행 / ❌
- 통과: N, 실패: N, 통과율: N%

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

> 판정은 "도구가 돌았다"가 아니라 **외부 통과 신호**에 묶는다. minos 통과율과 빌드 green이 SUCCESS의 필수 조건이다.
> Phase 3(argos)·Phase 5(minos)를 사후 결재로 자동 승인하더라도, "실행됨"이 아니라 **통과 수치**를 기록한다.

| 조건 | 결과 |
|------|------|
| Phase 1~4 성공 + minos 통과율 100%(또는 합의된 임계치) + 빌드 green | SUCCESS |
| 일부 미달 (테스트 일부 실패, argos 미통과 항목 존재 등) | PARTIAL — 미달 수치 명기 |
| docker-deploy 카탈로그 행/경로/필수 reference 로드 실패 | PARTIAL 이하 — Phase 4 `weak`, dev-server 폴백과 `BLOCKED` 사유 명기 |
| FATAL 에러로 중단 | FAILED |

**금지:** 테스트가 실패 상태인데 SUCCESS로 판정. 자동 승인은 통과율·미통과 항목 수치를 리포트에 남길 때만 유효하다(수치 없는 "실행됨" 승인 금지).

---

## Phase 6 진입 조건 (필수 체크)

Phase 6 시작 전 반드시 확인:

| # | 증거 | 없으면 |
|---|------|--------|
| 1 | `plan.md` 존재 | Phase 1 폴백 실행 |
| 2 | `zeus-log.md`에 agent-team 기록 | Phase 2 폴백 실행 |
| 3 | `zeus-log.md`에 argos 실행 기록 | Phase 3 실행 |
| 4 | `zeus-log.md`에 서버 실행 시도 기록 | Phase 4 실행 |
| 5 | minos 실행 기록 + **통과율 수치** (QA 결과 파일 또는 로그) | Phase 5 실행 |

**하나라도 없는 상태에서 리포트를 작성하는 것은 금지.**
**5번은 "실행됨"만으로 부족 — 통과율 수치가 기록돼야 SUCCESS 판정이 가능하다(실행 여부 ≠ 통과 여부).**
컨텍스트가 부족하면 `zeus-state.json`에 `currentPhase: "testing"`을 저장하고 핸드오프.
