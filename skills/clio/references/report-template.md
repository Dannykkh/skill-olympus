# 최종 보고서 마크다운 템플릿

```markdown
# Clio — 최종 보고서 (마무리투수 + 역사의 뮤즈)

## 요약

- 달라진 동작과 이유: {작업 과정을 보지 않은 독자가 이해할 수 있는 결과부터 쉬운 말로 설명}
- 실제 검증: {현재 버전에서 실행한 검사와 결과; 정적 확인·미실행은 구분}
- 남은 문제: {미해결·차단·미검증 범위와 다음 행동; 없으면 없음}

| 항목 | 결과 |
|------|------|
| 점검 일시 | {YYYY-MM-DD HH:MM} |
| 프로젝트 | {project-name} |
| 기술 스택 | {tech-stack} |
| **최종 판정** | **{GO / CONDITIONAL GO / NO-GO}** |

## Module Coverage
| 모듈 | 해석 경로 | 적용 상태 | 미실행·fallback 범위 |
|------|-----------|-----------|----------------------|
| flow-verifier | {absolute path 또는 없음} | {module/native-fallback/NOT RUN} | {coverage gap} |
| mermaid-diagrams | {absolute path 또는 없음} | {module/native-fallback/NOT RUN} | {coverage gap} |
| humanizer | {absolute path 또는 없음} | {module/native-fallback/NOT RUN} | {coverage gap} |
| pdf | {absolute path 또는 없음} | {module/NOT RUN} | {coverage gap} |

## Phase 1: 마무리투수 점검

### 파이프라인 결과
| 단계 | 스킬 | 결과 |
|------|------|------|
| 설계 | /zephermine | {spec 위치 또는 "없음"} |
| 구현 | /agent-team | {구현 완료} |
| 감리 | /argos | {PASS/CONDITIONAL/FAIL 또는 "미실행"} |
| QA | /minos | {통과율 N% 또는 "미실행"} |
| 마무리 | /clio | 본 보고서 |

### 공개 사이트 출시 준비 (적용 시)

- 구현 점검: {기존 Phase 1 판정}
- 출시 준비: {GO / CONDITIONAL GO / NO-GO / NOT REQUESTED}
- 점검 대상: {버전·URL/환경·확인 시각}

| 항목/AC | 요구 출처·필수 여부 | 담당 | 대상·증거 | 상태 | 남은 조치 |
|---------|-------------------|------|-----------|------|-----------|
| {디자인/전환 QA/검색/개인정보/운영/출시 행동 중 적용 항목} | {명세·요청} | {담당} | {증거와 검증 범위} | {PASS/FAIL/NOT RUN/UNVERIFIED/NOT APPLICABLE} | {다음 행동} |

출시 점검이 요청되지 않은 실행은 이 표를 생략하고 기존 판정을 유지합니다. CI 감사 결과는
QA PASS에 합산하지 않으며 개인정보 초안·검색 점수·preview 성공을 운영 출시 완료로 표시하지 않습니다.

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
- PDF: {생성·열기 검증 완료 / NOT RUN + 이유}

## 산출물 체크리스트
- [x] 최종 점검 (CHECKLIST.md)
- [{x 또는 공백}] 프로세스 흐름도 (Mermaid) — {문법 검증 상태}
- [x] PRD (제품 요구사항 문서)
- [x] 기술 문서
- [x] 사용자 매뉴얼
- [x] 최종 보고서 (본 문서)

`NOT RUN` 또는 `UNVERIFIED`인 모듈 의존 작업은 체크된 완료 항목으로 표시하지 않습니다.

## 후속 조치
| 조치 | 명령 |
|------|------|
| 커밋 | /commit |
| 버전 태그 + CHANGELOG | /release |
| 배포 전 체크리스트 | /launch |
```
