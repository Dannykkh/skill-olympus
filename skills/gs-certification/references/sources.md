# 기준 출처와 재확인

확인일: 2026-09-14. 아래는 시작점이며 실제 실행 시 현행성·신청기관·등급·제품 유형·적용 시점을 다시 확인한다.
구판이 보이면 현행 본문과 경과조치를 확인한다. 원문이 없으면 조항을 추측하지 않는다.

| ID | 공식 자료 | 확인 용도 |
|---|---|---|
| LAW | [소프트웨어 품질인증 운영에 관한 지침, 고시 제2024-41호](https://www.law.go.kr/LSW/admRulLsInfoP.do?admRulSeq=2100000248750) | 제품·문서, 기관의 등급별/분야별 시험평가기준, 등급 기준. 조회 시 최신 개정 여부 재확인 |
| TTA-1 | [TTA GS시험인증 1등급](https://cs.tta.or.kr/tta/introduce/introCont.do?tabMode=cont&tnc_cls_no=T000127&tnc_lab=T000003&up_tnc_cls_no=T000020) | ISO/IEC 25023·25041·25051 기반, 제품 유형별 시험, 결함 보완·회귀 및 심의 절차 |
| TTA-LIST | [TTA SW시험·인증 서비스](https://cs.tta.or.kr/tta/introduce/introListR.do?labCode=T000003&menuId=700&up_tnc_cls_no=T000020) | 1·2등급 서비스 구분. 2등급 상세 배점표를 대신하지 않음 |
| MSS | [중소벤처기업부 기술개발제품 안내](https://m.mss.go.kr/common/board/Download.do?bcIdx=1042734&cbIdx=253&streFileNm=f98c33be-2dbd-4be8-9268-9f6819b84e7d.pdf) | 1등급 품질평가 80점 기준 교차 확인. 기관 세부 평가표는 별도 필요 |

ISO 번호만으로 모든 조항을 열람했다고 주장하지 않는다. 사용자가 적법하게 제공한 표준·기관 기준에서
필요한 항목과 위치만 기록하며 저작권 있는 표준 전문을 스킬에 복제하지 않는다.

## GitHub 후보 검토 결과

- [govcheck](https://github.com/sumin220/govcheck): MIT, Java/Spring/JSP 중심의 공공 웹 검사.
  선택적 정적 검사 후보이며 GS 전체/등급별 판정 엔진이 아니다. 자동 설치·상시 의존하지 않는다.
  사용 시 실제 코드·규칙·라이선스와 대상 스택을 검토하고 기존 검사와 중복을 제거한다.
- [GsTestGuide](https://github.com/gnghl7556/GsTestGuide): 시험 절차와 결함 사례를 가진 웹앱.
  확인 시 라이선스 표시 없음. 코드·문서 복제 없이 탐색 참고만 했으며 공식 기준으로 채택하지 않는다.
- [cert-eligibility](https://github.com/sminju98/business-copilot/blob/HEAD/skills/cert-eligibility/SKILL.md):
  기업 인증 추천·신청 지원이며 제품 시험 역할과 다르다.

외부 후보의 고정 심각도·횟수·보안 헤더 처방을 그대로 공식 필수 기준으로 옮기지 않는다.
이 스킬의 절차·양식은 기존 Olympus 모듈과 위 공식 근거를 연결해 작성했다.

## ISO 공식 공개 설명 (2026-09-14 확인)

- [ISO/IEC 25023:2016](https://www.iso.org/standard/35747.html): 제품 품질의 정량 측정과 적용 방법.
- [ISO/IEC 25041:2012](https://www.iso.org/standard/35766.html): 25040 평가 과정 적용을 위한 개발자·획득자·독립 평가자 지침.
- [ISO/IEC 25051:2014](https://www.iso.org/standard/61579.html): 제품 및 시험 문서 요구와 시험 지침.

공개 초록과 기관 안내를 확인했으며 표준 전문 전 조항 적합성을 검증한 것은 아니다.
