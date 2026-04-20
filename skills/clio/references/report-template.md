# 최종 보고서 마크다운 템플릿

```markdown
# Clio — 최종 보고서 (마무리투수 + 역사의 뮤즈)

## 요약
| 항목 | 결과 |
|------|------|
| 점검 일시 | {YYYY-MM-DD HH:MM} |
| 프로젝트 | {project-name} |
| 기술 스택 | {tech-stack} |
| **최종 판정** | **{GO / CONDITIONAL GO / NO-GO}** |

## Phase 1: 마무리투수 점검

### 파이프라인 결과
| 단계 | 스킬 | 결과 |
|------|------|------|
| 설계 | /zephermine | {spec 위치 또는 "없음"} |
| 구현 | /agent-team | {구현 완료} |
| 감리 | /argos | {PASS/CONDITIONAL/FAIL 또는 "미실행"} |
| QA | /minos | {통과율 N% 또는 "미실행"} |
| 마무리 | /clio | 본 보고서 |

### 코드 품질
| 항목 | 결과 |
|------|------|
| 테스트 | {PASS (N/N) / FAIL (N/M)} |
| 린트 | {CLEAN / WARN N개 / ERROR N개} |
| 타입 체크 | {PASS / FAIL N개} |
| 커버리지 | {N% / 미측정} |

### 구현 누락
| # | 기능/AC | spec 위치 | 상태 |
|---|--------|----------|------|
| 1 | {기능명} | spec.md L{N} | {구현됨/누락} |

### 블로커 (NO-GO 사유)
- {없음 / 블로커 목록}

## Phase 2: 프로세스 흐름도
- 생성: {N}개 다이어그램
- 설계 대비 차이: {있음/없음}
- [다이어그램 목록](flow-diagrams/)

## Phase 3: 문서 산출물
- [PRD.md](PRD.md)
- [TECHNICAL.md](TECHNICAL.md)
- [USER-MANUAL.md](USER-MANUAL.md)

## 산출물 체크리스트
- [x] 최종 점검 (CHECKLIST.md)
- [x] 프로세스 흐름도 (Mermaid)
- [x] PRD (제품 요구사항 문서)
- [x] 기술 문서
- [x] 사용자 매뉴얼
- [x] 최종 보고서 (본 문서)

## 후속 조치
| 조치 | 명령 |
|------|------|
| 커밋 | /commit |
| 버전 태그 + CHANGELOG | /release |
| 배포 전 체크리스트 | /launch |
```
