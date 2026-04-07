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

## Taste Decisions (검토 필요)
> Zeus가 자동 결정했지만 사용자가 다르게 판단할 수 있는 항목들입니다.

| # | Phase | 결정 | 선택 | 대안 | 이유 |
|---|-------|------|------|------|------|
| 1 | ... | ... | ... | ... | ... |

## Next Steps
- [ ] docs/zeus/zeus-report.md 검토
- [ ] 자동 생성 코드 리뷰
- [ ] git commit && push
- [ ] /docker-deploy (배포 시)
```

---

## 결과 판정 기준

| 조건 | 결과 |
|------|------|
| Phase 1~5 모두 성공 | SUCCESS |
| Phase 2 또는 5 일부 실패 | PARTIAL |
| FATAL 에러로 중단 | FAILED |

---

## Phase 6 진입 조건 (필수 체크)

Phase 6 시작 전 반드시 확인:

| # | 증거 | 없으면 |
|---|------|--------|
| 1 | `plan.md` 존재 | Phase 1 폴백 실행 |
| 2 | `zeus-log.md`에 agent-team 기록 | Phase 2 폴백 실행 |
| 3 | `zeus-log.md`에 argos 실행 기록 | Phase 3 실행 |
| 4 | `zeus-log.md`에 서버 실행 시도 기록 | Phase 4 실행 |
| 5 | minos 실행 기록 (QA 결과 파일 또는 로그) | Phase 5 실행 |

**하나라도 없는 상태에서 리포트를 작성하는 것은 금지.**
컨텍스트가 부족하면 `zeus-state.json`에 `currentPhase: "testing"`을 저장하고 핸드오프.
