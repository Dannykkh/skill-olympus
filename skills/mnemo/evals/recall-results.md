# 비벡터 회상 근거 수집 검증 — 2026-10-05

일반 대화의 선호·약속·이유·조건 변경을 기존 태그·항목·근거 연결로 조회한다.
추가 LLM·임베딩·DB를 사용하지 않았다. 합성 회귀 사례이며 독립 holdout은 아니다.

## 실제 실행

```bash
python -B -X utf8 skills/mnemo/evals/evaluate_recall.py
python -B -X utf8 -m unittest discover -s skills/mnemo/scripts/tests
python -B -X utf8 -m unittest discover -s skills/mnemo/scripts/tests -p 'test_recall.py'
node --test --test-reporter=dot scripts/tests/mnemo-improvement-bundle.test.js scripts/tests/mnemo-storage-install.test.js scripts/tests/skill-sync-policy.test.js
```

- 고정 사례: `recall-cases.json`, SHA-256 `803aca50b32b064f2ced89cca22aa59e71cd9a272f4618ff36c1a50948afe020`.
- Argos 최종 수정 후 평가한 `recall.py`: SHA-256 `1128b2dfdf1e7fc700b88ce7dce678e500b1c99d442344abdea49446b1ee419c`.
- 같은 실행의 `mnemo_markdown.py`: SHA-256 `d23ba97098dab44e32e40149670418fbc1764d7a81d348b33c66b02dcd5f59a0`.
- 개발 중 전체 Python 215개 통과. 이후 같은 턴의 여러 태그 줄 보존 및
  정제 기억 우선·최신 날짜 동률 검사 3개를 추가하고 회상 검사 19개를 다시 실행해 통과했다.
- 후속 Argos에서 private 구조 분리·외부 source alias·실제 Grok marker·legacy 링크·
  fence 마감·근거 파일 상한·근거 선택자·상태 접두사 링크·미완료 fence·Windows 출력 예산·
  직접 ID 중복 표시의 소스 결함 **11개**를 수정했다. 추가 경계 회귀를 포함한
  전체 Python **231개**, 그 안의 회상 **32개**, Node **22개**가 최종 소스로 통과했다.
  Node 묶음에는 설치된 Grok producer의 실제 출력 검사가 포함된다.
  [감리 보고서](../../../docs/plan/2026-10-05-mnemo-context-recall-audit/verify-report.md)에 재현과 범위를 남겼다.
- 네 어댑터의 격리 설치본에서 실제 Python 회상 명령 실행과 질문·응답 보존을 확인했다.
  공통 지원 파일을 동기화한 패키지의 핸드오프·닥터 실행과 스킬 설치 정책 검사도 통과했다.

## 결과와 해석

| 측정 대상 | 결과 |
|---|---:|
| 필요한 근거가 결과에 포함된 사례 | 12/12 |
| 연결 수집을 제거하고 동일 직접 후보만 남긴 사례 | 3/12 |
| 예산 상한 | 모든 사례 JSON 16,000자 이내 |
| 평가 프로젝트의 파일 변경 | 없음 |
| 최종 LLM 답변 정확도 | NOT RUN |

여행 이동수단 변경, 동행 조건이 있는 예산 변경, 채팅/문서 말투 구분, 오래된 이사 이유,
태그 없는 생일 선물 대화, 분류별 예약 ID, 의존 조건, 끊긴 근거 링크,
`supersedes:#slug`, 시각으로 지정한 약속, 비공개 구간을 검증했다.

직접 후보만 남기는 비교는 **연결 자동 수집의 효과를 분리하는 실험**이다.
기존 Mnemo 에이전트가 태그를 해석하고 수동으로 항목·원문 링크를 읽는 전체 흐름을 제외한다.
따라서 3/12→12/12를 기존 Mnemo의 답변 정확도가 상승한 수치로 해석할 수 없다.
도구가 올바른 판단을 보장하지도 않는다. 현재 에이전트가 근거·상태·적용 조건을 읽어야 한다.

## 남은 측정

실제 사용자 대화의 별도 평가 질문, 최종 답변의 조건 누락/오래된 선호 오인율,
질의부터 답변까지의 시간·토큰 비용, 다른 언어와 큰 대화 저장소에서의 누락률은 미측정이다.
현재 사용자 홈의 전역 설치본 갱신도 이 검증에 포함하지 않는다.
