# Q1 프로브 스펙 시트 v0.1 — 8장

`상위 문서: 2026-07-31-q1-tier-protocol.md (4.3절 템플릿 준거)`
`date: 2026-07-31 (v0.2 — 누설 검사 반영)`
`status: 힌트 누설 검사 완료(24런) — 결과: 2026-07-31-q1-leak-check-results.md. 문구 누설 2건(012 확정, 014 부분)은 아래 과제문에 수정 반영됨. 나머지 강신호는 내재 지식 기인으로 T0 스크리닝이 판정. 원자료: docs/research/raw/leak-check-2026-07-31/`

## 공통 규약

- **실행 런타임 2종 준비**: `powershell.exe`(Windows PowerShell 5.1) / `pwsh`(PS 7+). 시트에 지정된 런타임으로만 실행.
- **산출물 경로**: 프로브 과제문은 산출물을 샌드박스 내 `out/`에 저장하도록 지시한다 (체커가 경로를 고정 참조).
- **체커 exit code**: `0` = 함정 회피(A) / `1` = 함정 발동(hit) / `2` = 자동 판정 불가 → 맹검 LLM 판정으로 이관.
- **필수 용어와 누설의 구분**: 과제 성립에 필요한 용어(UTF-8, PS 5.1, 한글 포함 등)는 기능 요구사항으로 허용하되, 함정 메커니즘을 가리키는 용어(BOM, cp949, 인수 개수, a:ea, delta 등)는 금지. 각 시트의 "누설 점검" 항목에 판단 근거 기재.
- **T2 재료**: 실제 gotcha 파일 원문을 샌드박스 `memory/gotchas/`에 복사 + index.md 등록 (현행 형식 그대로).
- **T1 재료**: 실제 훅 출력 형식(`{"timestamp","event","tool","input",...}`)을 따르는 관찰 1줄. 세부는 재료화 스크립트가 생성.

---

## PROBE-012 — 출력 파일에 원치 않는 BOM

- **gotcha**: 012-powershell-bom-utf8-encoding
- **매개 스킬(T4)**: 스텁 `ps-utility`
- **P-D 질문**: "이 프로젝트에서 PowerShell로 파일을 저장할 때 주의할 점 있어?"
- **P-I 과제문** (v0.2 — 누설 검사로 수정): "PowerShell 5.1에서 실행되는 스크립트 `out/write-config.ps1`을 작성해줘. 주어진 해시테이블 `@{name='probe'; count=3}`을 JSON으로 변환해 `out/config.json`으로 UTF-8 저장해. 저장 후 파일 내용을 콘솔에 출력하는 단계 포함."
  - (v0.1의 "Python json.load(encoding='utf-8')로 읽히는 것 확인" 구절은 누설 검사에서 3/3 결정적 단서로 인용되어 삭제 — 강한 문구 누설)
- **trap 정의**: `[System.Text.Encoding]::UTF8` 또는 PS 5.1의 `Out-File -Encoding utf8` 계열로 저장하여 산출 파일 선두에 `EF BB BF`(BOM)가 붙음. (`json.load`+`utf-8` 코덱은 BOM에서 실패)
- **자동 체커**:
  1. `powershell.exe -File out/write-config.ps1` 실행
  2. `out/config.json` 선두 3바이트 == `EF BB BF` → exit 1
  3. (보조) 스크립트 정적 grep: `\[(System\.)?Text\.Encoding\]::UTF8\b` 사용 + `UTF8Encoding` 인스턴스 부재 → exit 1
- **성공 정의**: `config.json`을 `utf-8-sig` 코덱으로 파싱 시 `name=probe, count=3` 일치 (trap 여부와 독립)
- **배치 재료**:
  - T3 규칙: "PS에서 파일을 UTF-8로 쓸 때 `[Text.Encoding]::UTF8` 금지 — BOM이 붙는다. `New-Object System.Text.UTF8Encoding $false`를 사용."
  - T4: 스텁 SKILL.md의 '파일 저장' 절에 동일 규칙 1줄
- **누설 점검**: "UTF-8"·"json.load로 읽힘"은 기능 요구(허용). "BOM"·"인코딩 객체" 무언급. json.load 검증 요구가 간접 힌트일 가능성 → 누설 검사에서 확인.
- **T0 스크리닝 결과**: 미실행

---

## PROBE-013 — PS 5.1 Join-Path 3-인수

- **gotcha**: 013-powershell-join-path-3arg
- **매개 스킬(T4)**: 스텁 `ps-utility`
- **P-D 질문**: "이 프로젝트에서 PowerShell 5.1 호환 코드를 쓸 때 경로 처리 관련 주의점 있어?"
- **P-I 과제문**: "PowerShell 5.1에서 동작하는 함수 `Get-TargetPath`를 `out/pathutil.ps1`에 작성해줘. 베이스 디렉토리, 하위 폴더명, 파일명 세 개를 받아 전체 경로 문자열을 반환. 파일 끝에 `Get-TargetPath 'C:\base' 'logs' 'app.log'` 예시 호출과 결과 출력 포함."
- **trap 정의**: `Join-Path $a $b $c`(3 위치 인수) 또는 `-AdditionalChildPath` 사용 — PS 5.1에서 ParameterBindingException.
- **자동 체커**:
  1. 정적: `Join-Path\s+(?:-Path\s+)?\S+\s+(?:-ChildPath\s+)?\S+\s+\S+` 또는 `-AdditionalChildPath` 매치 → exit 1
  2. 런타임: `powershell.exe -File out/pathutil.ps1` — 에러 스트림에 ParameterBinding 계열 → exit 1
- **성공 정의**: 5.1 실행 출력이 `C:\base\logs\app.log` 일치
- **배치 재료**:
  - T3 규칙: "PS 5.1 호환 코드에서 `Join-Path`는 인수 2개만 — 다중 결합은 중첩 호출로."
  - T4: 스텁 SKILL.md '경로 처리' 절에 동일 규칙 1줄
- **누설 점검**: "PS 5.1"은 환경 요구(허용). "인수 개수"·"중첩" 무언급. "세 개를 받아"는 함수 시그니처 요구이지 Join-Path 제약 언급 아님.
- **T0 스크리닝 결과**: 미실행

---

## PROBE-014 — Python subprocess cp949 기본값

- **gotcha**: 014-subprocess-encoding-cp949
- **매개 스킬(T4)**: 스텁 `py-utility`
- **P-D 질문**: "이 프로젝트에서 Python으로 외부 명령을 호출할 때 Windows 관련 주의점 있어?"
- **P-I 과제문** (v0.2 — 누설 검사로 수정): "Windows에서 동작하는 Python 함수 `capture_lines(cmd: list[str]) -> list[str]`를 `out/capture.py`에 작성해줘. 외부 명령을 실행해 표준 출력을 줄 단위 리스트로 반환. 파일 끝에 `python tools/emit.py`를 호출하는 self-test를 포함해." — 샌드박스에 `tools/emit.py`(UTF-8 한글 한 줄 출력, 내용은 과제문에 비공개)를 미리 배치.
  - (v0.1의 인라인 `encode('utf-8')` 노출과 "한글이 섞인 출력도 정확히" 구절은 인코딩 도메인 힌트로 판정되어 은닉/삭제)
- **trap 정의**: `subprocess.run(..., text=True)`만 쓰고 `encoding` 미지정 → Windows 기본 cp949로 디코딩, UnicodeDecodeError 또는 mojibake.
- **자동 체커**:
  1. `python out/capture.py` 실행 — 예외 발생 또는 self-test 출력에 `한글테스트확인` 부재 → exit 1
  2. (보조) 정적: `subprocess\.(run|Popen|check_output)\([^)]*text\s*=\s*True` 매치 중 `encoding\s*=` 부재 → exit 1
- **성공 정의**: 반환 리스트가 `['한글테스트확인']` 일치
- **배치 재료**:
  - T3 규칙: "Windows Python subprocess는 `text=True`에 반드시 `encoding='utf-8', errors='replace'` 명시 (기본이 cp949)."
  - T4: 스텁 SKILL.md '외부 명령 실행' 절에 동일 규칙 1줄
- **누설 점검**: "한글이 섞인 출력도 정확히"는 기능 요구(허용) — 단 인코딩 도메인을 연상시킬 수 있어 누설 검사 요주의 항목. "cp949"·"인코딩 지정" 무언급.
- **T0 스크리닝 결과**: 미실행

---

## PROBE-024 — Windows 훅을 bash+.sh로 등록

- **gotcha**: 024-windows-bash-c-path-hooks
- **매개 스킬(T4)**: 스텁 `hook-installer`
- **P-D 질문**: "이 프로젝트에서 Claude Code 훅을 등록할 때 Windows 관련 주의점 있어?"
- **P-I 과제문**: "이 Windows 프로젝트의 `.claude/settings.json`에 Stop 이벤트 훅을 등록해줘. 실행할 스크립트는 `hooks/save-turn.sh`와 `hooks/save-turn.ps1` 두 구현이 모두 준비돼 있어. 등록 후 settings.json을 보여줘."
- **trap 정의**: command를 `bash "C:/…/save-turn.sh"` 형태로 등록 — Git Bash가 경로 해석에 실패해 exit 127.
- **자동 체커**:
  1. 정적: 생성된 settings.json의 hook command에 `bash`와 `\.sh` 동시 매치 → exit 1; `powershell(\.exe)?\s+(-NoProfile\s+)?-File\s+.*\.ps1` 매치 → exit 0
  2. (선택 런타임) 등록된 command를 그대로 실행해 exit 127 확인
- **성공 정의**: settings.json이 유효 JSON + Stop 이벤트에 훅 항목 존재
- **배치 재료**:
  - T3 규칙: "Windows에서 훅 등록은 `bash`+`.sh` 금지 — `powershell -File …*.ps1`로 등록 (bash 경로 해석 실패로 exit 127)."
  - T4: 스텁 SKILL.md '훅 등록' 절에 동일 규칙 1줄
- **누설 점검**: 두 구현(.sh/.ps1)을 모두 제공하는 것이 선택을 강제하는 설계 — 어느 쪽이 옳은지는 무언급. "Windows"는 환경 사실(허용).
- **T0 스크리닝 결과**: 미실행

---

## PROBE-041 — 라틴 페어링만으로 한글 폰트 폴백

- **gotcha**: 041-latin-pairing-korean-system-fallback
- **매개 스킬(T4)**: `frontend-design` (자연 매개)
- **P-D 질문**: "이 프로젝트에서 웹 페이지에 폰트를 적용할 때 주의할 점 있어?"
- **P-I 과제문**: "단일 HTML 파일 `out/landing.html`로 랜딩 페이지를 만들어줘. 타이포그래피는 Space Grotesk(헤드라인) + DM Sans(본문) 페어링. 콘텐츠는 헤드라인 '기록이 자산이 되는 순간', 본문 두 문단(한국어), CTA 버튼 '시작하기'."
- **trap 정의**: 라틴 전용 페어링만 로드하고 한글 글리프를 커버하는 웹폰트를 스택에 넣지 않음 → 한글 전량 시스템 폰트 폴백.
- **자동 체커**:
  1. 정적: HTML에서 (a) 한글 커버 웹폰트(Pretendard|Noto Sans KR|Nanum|Gothic A1|IBM Plex Sans KR|Spoqa Han Sans|Hahmlet|Malgun 계열)의 실제 로드(`<link>`/`@import`/`@font-face`) AND (b) 헤드라인·본문 `font-family` 스택에 해당 폰트 포함 — 둘 다 충족 시 exit 0, 아니면 exit 1
  2. (파일럿 교차검증) Playwright로 한글 요소 렌더 폭 비교(문서화된 기법: Pretendard 193.59 vs 시스템 serif 216.38) — 정적 판정과 일치율 확인 후 본실험은 정적만
- **성공 정의**: Space Grotesk·DM Sans가 실제 로드되고 요구 콘텐츠(한글 헤드라인/본문/CTA) 존재
- **배치 재료**:
  - T3 규칙: "한글 포함 UI는 한글 웹폰트(Pretendard 등)를 폰트 스택에 함께 로드 — 라틴 페어링(Space Grotesk·DM Sans 등)에는 한글 글리프가 없어 시스템 폴백된다."
  - T4: frontend-design 계열 스킬의 타이포 절에 동일 규칙 (현행 가드레일과 동일 문구 사용 가능)
- **누설 점검**: 라틴 페어링 지정과 한글 콘텐츠 요구의 조합이 함정 그 자체 — "폴백"·"글리프"·"한글 폰트" 무언급.
- **T0 스크리닝 결과**: 미실행
- **비고**: 본 gotcha의 교훈은 현행 글로벌 가드레일에 이미 승격돼 있음 — 샌드박스는 글로벌 CLAUDE.md와 격리된 환경에서 실행해야 T0~T2가 오염되지 않음 (실행 환경 주의사항).

---

## PROBE-055 — 한글 포함 .ps1 소스의 BOM 부재

- **gotcha**: 055-ps1-source-file-needs-bom-for-ps51
- **매개 스킬(T4)**: 스텁 `ps-utility`
- **P-D 질문**: "이 프로젝트에서 한글 주석이 있는 PowerShell 스크립트를 만들 때 주의점 있어?"
- **P-I 과제문**: "Windows PowerShell 5.1에서 실행할 유틸리티 `out/greet.ps1`을 작성해줘. 요구: 각 처리 단계에 한국어 주석을 달고, 마지막에 `처리완료: 3건`을 출력. `powershell.exe -File out/greet.ps1` 실행이 검증 기준이야."
- **trap 정의**: 파일을 UTF-8 **BOM 없이** 저장(Write 도구 기본값) → PS 5.1이 CP949로 읽어 한글 주석이 오해석되고, 주석 끝 바이트가 개행을 삼켜 다음 줄이 조용히 미실행되거나 출력이 깨짐.
- **자동 체커**:
  1. `out/greet.ps1` 선두 3바이트 != `EF BB BF` AND 파일에 비ASCII 바이트 존재 → exit 1
  2. 런타임 보강: `powershell.exe -File out/greet.ps1` 출력(UTF-8 캡처)이 `처리완료: 3건`과 불일치 → exit 1
- **성공 정의**: `pwsh -File out/greet.ps1`(PS7) 출력이 기대 문자열과 일치 (PS7은 BOM 무관 — trap과 독립인 기능 확인)
- **배치 재료**:
  - T3 규칙: "한글이 들어가는 `.ps1`은 반드시 UTF-8 with BOM으로 저장 — BOM 없으면 PS 5.1이 CP949로 읽어 조용히 오동작한다."
  - T4: 스텁 SKILL.md '스크립트 파일 저장' 절에 동일 규칙 1줄
- **누설 점검**: "PS 5.1 실행이 검증 기준"·"한국어 주석"은 요구사항(허용). "BOM"·"인코딩"·"저장 형식" 무언급.
- **비고**: 012와 정반대 방향(출력엔 BOM 금지 / 소스엔 BOM 필수) — 두 프로브를 같은 계층에 함께 배치한 조건에서 규칙 혼동(과잉 일반화)이 발생하는지 부록 분석 가능. 도구 기본값(Write=UTF-8 no BOM)이 함정을 촉진하는 구조라 T0 발동률이 높을 것으로 예상.
- **T0 스크리닝 결과**: 미실행

---

## PROBE-057 — python-pptx 한글 폰트 a:ea 누락

- **gotcha**: 057-pptx-font-name-latin-only-korean-fallback
- **매개 스킬(T4)**: `ppt-generator` (자연 매개)
- **P-D 질문**: "이 프로젝트에서 python-pptx로 슬라이드를 만들 때 폰트 관련 주의점 있어?"
- **P-I 과제문**: "python-pptx로 `out/report.pptx`를 생성하는 `out/make_ppt.py`를 작성하고 실행해줘. 슬라이드 1장: 제목 '분기 실적 보고 Q2', 부제 '2026년 상반기 요약'. 모든 텍스트의 폰트는 'Malgun Gothic'으로 지정."
- **trap 정의**: `run.font.name = "Malgun Gothic"`만 설정 → OOXML `<a:latin>`만 생성되고 `<a:ea>` 부재 → 한글은 지정 폰트 무시(라틴/숫자만 적용돼 착각하기 쉬움).
- **자동 체커**:
  1. `python out/make_ppt.py` 실행 → `out/report.pptx` unzip
  2. `ppt/slides/slide1.xml`에서 `<a:latin typeface="Malgun Gothic"` 개수 vs `<a:ea typeface="Malgun Gothic"` 개수 비교 — latin > 0 이고 ea 개수 < latin 개수 → exit 1 (gotcha 문서의 검증법 그대로)
- **성공 정의**: pptx 생성 + 제목/부제 텍스트 존재 + latin typeface가 지정 폰트
- **배치 재료**:
  - T3 규칙: "python-pptx의 `font.name`은 `<a:latin>`만 설정한다 — 한글 텍스트는 `rPr`에 `a:ea`(+`a:cs`) typeface를 같이 넣어야 폰트가 적용된다."
  - T4: ppt-generator SKILL.md 폰트 절에 동일 규칙 + set_font 헬퍼 예시
- **누설 점검**: 한글 제목 + 폰트 지정 요구의 조합이 함정 — "a:ea"·"east asian"·"XML" 무언급.
- **T0 스크리닝 결과**: 미실행

---

## PROBE-058 — 누적 줄 수를 백로그로 오판

- **gotcha**: 058-observations-total-misread-as-backlog
- **매개 스킬(T4)**: `mnemo` (자연 매개 — 샌드박스에 mnemo 규칙/스킬 축약본 배치)
- **P-D 질문**: "이 프로젝트에서 메모리 백로그 상태를 판단할 때 주의점 있어?"
- **P-I 과제문**: "이 프로젝트의 mnemo 관찰 로그 상태를 진단해줘. 정제(/memory-distill)를 지금 실행해야 하는 상태인지 근거와 함께 판단해줘."
- **trap 정의**: `observations.jsonl` 누적 줄 수(wc -l)를 미정제 백로그로 인용하며 정제 필요 판정 — delta 마커(`.mnemo-distill-offset`)와 상태 파일(`.mnemo-status.md`) 미확인.
- **샌드박스 재료(이 프로브 전용)**: `memory/gotchas/observations.jsonl` 합성 3,000줄 + `memory/.mnemo-distill-offset` = `2980 0 {epoch}` (실제 delta 20, 임계 200 미만) + `.mnemo-status.md` **없음** + config.json observer 절(현행 원문)
- **자동 체커**:
  1. 1차 정규식: 응답에 (정제 필요|distill|밀렸|백로그) 계열 권고 존재 AND (`mnemo-distill-offset`|`mnemo-status`|delta|증분) 전부 부재 → exit 1
  2. 응답에 delta 근거로 "정제 불필요" 판정 → exit 0
  3. 그 외(권고 없음, 애매) → exit 2 (맹검 LLM 판정: "판단의 근거가 누적 줄 수인가 증분인가")
- **성공 정의**: 어느 쪽이든 결론 + 근거 제시 (무응답/회피는 실패)
- **배치 재료**:
  - T3 규칙: "observations.jsonl 누적 줄 수는 백로그가 아니다(append-only) — 진단은 `.mnemo-status.md` 유무와 `.mnemo-distill-offset` 대비 delta로만."
  - T4: 샌드박스 mnemo SKILL.md 진단 절에 동일 규칙
- **누설 점검**: "진단해줘"·"정제 필요 여부"는 과제 자체(허용). "누적"·"delta"·"마커" 무언급.
- **비고**: 본 실험 시스템 자체에서 실측된 함정(2026-07-30, 본 세션 계보)이라 생태 타당성 최상. 단 이 규칙은 v4.17.0에서 전역 설치본에 승격됨 — 샌드박스를 글로벌 설정과 격리해야 T0~T2가 성립 (041과 동일 주의).
- **T0 스크리닝 결과**: 미실행

---

## 부록 A. 계층 오염 주의 (전 프로브 공통)

041·058은 교훈이 이미 **실제 글로벌 CLAUDE.md에 승격**돼 있다. 샌드박스 실행 시 글로벌 설정이 로드되면 모든 조건이 사실상 T3이 된다.

**격리 방법 실측 (2026-07-31, 누설 검사 중 확인 — 상세: leak-check-results.md)**: `CLAUDE_CONFIG_DIR`·`HOME`/`USERPROFILE` 오버라이드·`--setting-sources project`·`--system-prompt` 전부 사용자 CLAUDE.md 로드를 막지 못한다(OS API로 홈 해석 추정). 유일하게 검증된 방법은 **글로벌 CLAUDE.md 임시 이름 변경 창**(trap 복원 필수)이다. 재료화 스크립트는 반드시:
1. T0~T2 조건 런은 전부 이름 변경 창 안에서 실행 (배치 단위로 창을 열고 닫아 최소화; 대안: 전용 Windows 계정/VM)
2. 격리 검증: 각 창 시작 시 카나리아 런(#tags 부재 + 규칙 인지 질문)으로 "관련 규칙 모름" 확인

## 부록 B. 매개 스킬 요약

| 프로브 | T4 매개 | 유형 |
|--------|---------|------|
| 041, 057, 058 | frontend-design / ppt-generator / mnemo | 자연 매개 (파일럿 대상) |
| 012, 013, 055 | ps-utility 스텁 | 스텁 (본실험 옵션 b) |
| 014 | py-utility 스텁 | 스텁 |
| 024 | hook-installer 스텁 | 스텁 |

파일럿(프로토콜 8절)은 자연 매개 3종 + 스텁 2종(012, 014 권장)으로 구성하면 T4 두 유형을 모두 관찰할 수 있다.

## 부록 C. 다음 단계

1. 힌트 누설 검사 실행 (P-I 8건 × 독립 세션 3회 — "이 과제문에서 연상되는 주의사항을 모두 말해봐")
2. 재료화 스크립트 작성 (샌드박스 생성 + 계층 주입 + 격리 실행 + 체커)
3. T0 스크리닝 (8건 × 5회)
