# motion-web 조사와 아프로디테 적용

- 날짜: 2026-10-06
- 범위: README·SKILL·참조·계측/검증 코드의 정적 조사. upstream 예제 7종은 직접 실행하지 않음.
- 정본: `skills/design-plan/`과 기존 `frontend-design` 모듈. 새 활성 스킬·설계 하네스를 추가하지 않음.

## 현재 기능과 차이

아프로디테는 이미 Web Motion Contract(CSS·GSAP·fallback·cleanup), Motion-first Prompt Playbook,
URL·영상·HTML 캡처, Three.js/WebGL 선택 지침과 기본 spring 안내를 갖고 있었다. 실제 부족한 부분은
물리 조작감의 선택 기준, 원본과 구현에 같은 입력을 주는 계측, 장면별 반응·중간 상태·수렴 검사였다.

motion-web의 실제 SKILL은 README의 vanilla Three.js/Canvas 소개보다 범위가 넓다. 페이지 구조·카피·
토큰·컴포넌트 상태·완성도까지 다루므로 전체를 추가하면 아프로디테 하네스와 중복된다.

## 채택·변환·기각

| 조사에서 얻은 관점 | 아프로디테 적용 |
|---|---|
| 움직임을 콘텐츠와 조작의 주재료로 설계 | Adopt: 대표 입력→반응을 Phase 3에서 작은 프로토타입으로 확인 |
| 물리 조작감·프레임 시간·보조 반응 | Adapt: 기존 엔진 재사용, 추종과 탄성 분리, 장면별 반동·오차·수렴 예산 |
| 원본을 실제 입력으로 계측 | Adopt: viewport/document 좌표 구분, 원본 관찰값과 제품 채택값 분리 |
| 장면별 숫자 검사와 상태 관찰 | Adapt: 독립 작성한 Playwright recorder와 사용자가 정한 range/final/visits/settled 기준 |
| 정지 화면과 움직임을 함께 평가 | Adopt: 기존 미학 비평에 실제 조작·중간 상태 근거 연결 |
| 모든 동작에 반동·novelty·높은 변화율 강제 | Avoid: 기능형 UI·읽기 구간·안정적인 과업 패턴에 부적합 |
| 타이포 비율·섹션 다양성 등 예제 기준의 보편화 | Avoid: 이 프로젝트의 계약에서 정의한 장면만 수치 판정 |
| 자체 전체 사이트 워크플로우·scene audio | Avoid: 기존 아프로디테/영상 파이프라인 책임과 중복 |
| 원문·스크립트·HTML 사례·에셋 편입 | Avoid: 저장소 LICENSE의 비상업 조건; 일반 원리와 공식 API를 바탕으로 독립 작성 |

## 검증의 한계

upstream의 verify_case.py는 단순 파일 존재 확인을 넘어서 실제 입력과 예제별 상태·geometry를 검사한다.
그러나 이것이 모든 새 사이트의 미학을 보장하지는 않는다. verification-harness.md도 일반 품질 점수의
실패와 구체적인 문제만 수치화해야 한다는 한계를 명시한다. 우리 도구는 조건 없이 PASS를 만들지 않으며,
Canvas box 변화·idle counter를 렌더나 입력 성공의 증거로 승격하지 않는다. 수치·시각·과업 검증을 함께 보고한다.

## 구현 위치

- 하네스: `skills/design-plan/SKILL.md`의 Phase 3·4·6와 Completion Evidence
- 계약: `skills/design-plan/references/web-motion-contract.md`
- 구현·계측·검증: `skills/design-plan/references/web-motion-engineering.md`
- 원본 캡처: `skills/design-plan/references/reference-capture-guide.md`
- 도구와 정상/고장 대조군: `skills/design-plan/scripts/{measure_web_motion,test_measure_web_motion}.py`
- 일반 spring 설정의 과잉 적용 제거: `skills/frontend-design/SKILL.md`

## 실행 검증

2026-10-06, Windows·Python 3.12.4·설치된 Chrome 154의 headless 실행에서 확인했다.
Python Playwright 패키지는 이미 있었고 bundled Chromium 실행 파일은 없어 `--channel chrome`을 사용했다.

- Python 18개 통과: 새 도구의 브라우저 대조군 8개·계약 오류 검사 4개, 기존 Experience Contract 6개.
- 정상 클릭→연속 전환→수렴은 PASS. 무반응은 반응 기준 FAIL. 즉시 점프는 도착 기준을
  통과해도 중간 구간 기준에서 FAIL. 실제 trusted click/wheel 이벤트가 같은 시간축에 기록됨.
- 일반 스크롤의 viewport 이동과 document 좌표를 구분. Canvas 상태 변화와 고정 DOM box를 별도 관찰.
- 작은 viewport(390×844)의 reduced-motion에서 콘텐츠와 최종 조작 상태 확인. 실제 터치 기기 검증은 NOT RUN.
- 누락 상태 reader·NaN·짧은 수렴 관찰은 FAIL. 검사 기준 없는 계측은 UNVERIFIED.
- portable frontmatter·source-only routing·installer·skill sync policy 검사 44개 통과.
- 두 수정 스킬의 skill-creator quick validation 통과. upstream 예제·실제 제품 사이트·전체 CLI별
  디자인 실행은 NOT RUN이며 위 검증과 구분한다.
- Claude/Grok 공유 표면·Codex·Antigravity의 기존 활성/소스 설치본에서 별도 수정 여부를 확인한 뒤
  해당 파일 39개만 반영하고 원본과 SHA-256을 대조했다. 세 설치 경로의 측정 도구를 CLI로 직접
  실행해 정상 장면 PASS를 확인했고, Codex 설치 경로의 즉시 점프 대조군은 FAIL·exit 1을 확인했다.
  `skills/design-plan.zip`, `skills/frontend-design.zip`을 생성하고 ZIP 무결성과 필수 파일을 확인했다.
- 후속 배포 요청에서 `install.bat --all`로 전체 설치를 동기화했다. Claude·Codex·Antigravity·Grok의
  규칙·훅 등록·설치된 훅 실행 검증 12개가 PASS였고, 변경 파일 39개의 SHA-256 일치를 다시 확인했다.
  Codex 설치본에서 Python 테스트 18개를 실행해 모두 통과했다. ZIP 두 개도 포함된 모든 파일을
  현재 소스와 대조했으며 GitHub 릴리즈 첨부용으로 준비했다.
- 버전 동기화를 포함한 전체 Node 검사 208개가 통과했다. 최초 검사에서 WSL Bash가 Windows 경로를
  해석하지 못했고 GNU grep도 검색되지 않아, 검사 프로세스의 PATH 앞에 Git Bash의 bin·usr/bin을
  두고 다시 실행했다. 최종 실행의 실패·skip은 모두 0개였다.

재현:

```bash
# 실행 가능한 bundled Chromium이 있으면 환경 변수 없이 실행한다.
# 설치된 Chrome을 쓰는 Windows PowerShell: $env:APHRODITE_BROWSER_CHANNEL = 'chrome'
python -m unittest discover -s skills/design-plan/scripts -p 'test_*.py' -v
node --test scripts/tests/source-only-module-routing.test.js scripts/tests/skill-sync-policy.test.js scripts/tests/installers.test.js
```

## 근거

- [motion-web README](https://github.com/feitangyuan/motion-web)
- [SKILL](https://github.com/feitangyuan/motion-web/blob/main/SKILL.md)
- [검증 코드](https://github.com/feitangyuan/motion-web/blob/main/scripts/verify_case.py)
- [계측의 한계와 검증 원칙](https://github.com/feitangyuan/motion-web/blob/main/references/verification-harness.md)
- [LICENSE](https://github.com/feitangyuan/motion-web/blob/main/LICENSE)
- [MDN requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame)
- [Fix Your Timestep](https://gafferongames.com/post/fix_your_timestep/)
- [Motion animate](https://motion.dev/docs/animate)
- [Playwright input](https://playwright.dev/python/docs/input), [emulation](https://playwright.dev/python/docs/emulation)
