# App Promo Contract

brief 유형이 `app-promo`(앱·웹 서비스 홍보영상, 기능 데모)일 때만 읽습니다. 엔진과 무관한 흐름을
정하고 엔진별 캡처 도구만 갈라집니다. upstream 워크플로 스킬을 실행하지 않고, 검증된 단계 구성과
패턴만 이 문서가 소유합니다.

## 1. 두 갈래

| 갈래 | 맞는 요청 | 화면의 정본 | 흔한 길이 |
|---|---|---|---|
| 런치 필름 | 제품 URL이나 브랜드를 모션으로 보여 주는 SNS·랜딩·스토어 영상 | 캡처한 스크린샷·DOM·브랜드 토큰을 장면으로 재구성 | 15~60초 |
| 실제 앱 데모 | 기능을 실제로 조작하는 흐름을 보여 주는 소개·튜토리얼 | 결정적으로 재생해 찍은 실제 화면에 사후 가상 카메라를 입힘 | 30초~3분 |

요청만으로 갈래를 정할 수 없으면 한 번 묻습니다. 기능 하나를 10초 안팎으로 보여 주는 무내레이션
클립은 `SKILL.md`의 `motion-short` 유형이 더 맞습니다.

## 2. Capture 단계

Script 단계 앞에 둡니다. 런치 필름은 캡처한 화면을 보고 스토리보드를 쓰고, 실제 앱 데모는 이 단계
안에서 `demo-steps.json`을 쓰고 재생합니다. 산출물은 `capture/` 폴더와 provenance 행입니다.

| 입력 | 런치 필름 산출물 | 실제 앱 데모 산출물 |
|---|---|---|
| 공개 URL, 로컬에서 띄운 앱, 사용자가 준 스크린샷·녹화 | 뷰포트·전체 페이지 스크린샷, 색·폰트 토큰, 로고·이미지 자산 | `demo-steps.json`, 단계별 프레임 또는 녹화, 클릭 좌표 |

규칙:

- 캡처가 실패하면 멈춥니다. 가짜 UI, 생성 이미지, 손으로 그린 모형으로 대체하지 않고 실패 원인과
  필요한 입력(접근 가능한 URL, 테스트 계정, 로컬 실행 방법)을 보고합니다.
- 로그인·2FA는 사용자에게 진행을 맡기고 자격 증명을 파일·로그·스크립트에 저장하지 않습니다. 화면에는
  테스트 계정과 더미 데이터를 쓰고, 실제 사용자 정보·토큰·이메일이 보이면 가리거나 다시 찍습니다.
- 실제 제품 수치·후기·로고를 추측하지 않습니다. 캡처에 없는 수치는 `hypothesis`로 표시하고 최종
  영상에 남기지 않습니다.
- provenance 행에 URL 또는 앱 버전·커밋, 캡처 시각, 사용 도구를 적습니다.

엔진별 캡처 도구:

| 엔진 | 도구 | 판정 |
|---|---|---|
| HyperFrames | `HYPERFRAMES_SKIP_SKILLS=1 npx hyperframes@<pin> capture <URL> -o ./capture --json`. 근거는 번들 `hyperframes-cli/references/init-and-scaffold.md`의 `capture` 절 | 0이 아닌 종료 코드, JSON `ok: false`, `BLOCKED.md` 중 하나라도 있으면 실패입니다. 재시도는 새 출력 폴더에서 하고 막힌 시도의 부분 파일을 쓰지 않습니다. `--skip-vision`은 선택적 AI 이미지 설명만 끕니다 |
| Remotion | 프로젝트의 Playwright로 단계별 스크린샷·녹화·trace를 얻습니다. 이 저장소의 `minos` 스킬이 만든 Playwright 흐름이 있으면 촬영 레시피로 재사용합니다 | 단계마다 기대 화면이 나왔는지 스크린샷으로 확인합니다. Playwright가 없으면 의존성 추가는 `SKILL.md` Phase 2 게이트를 따릅니다 |

실제 앱 데모는 HyperFrames를 골라도 Playwright로 찍는 편이 맞습니다. `capture`는 URL 한 장면의
정적 구조를 가져오는 도구이고 조작 흐름을 재생하지 않습니다.

## 3. 런치 필름 흐름

캡처 → 브랜드 토큰 → 스토리보드 승인 → 오디오 → 장면별 빌드 → contact sheet 검수 → 렌더.

1. 브랜드 토큰은 `DESIGN.md`가 있으면 그것을 쓰고, 없으면 캡처한 색·폰트를 `STORYBOARD.md` 머리에
   적습니다.
2. 스토리는 hook(문제 또는 결과) → 실제 화면으로 기능 2~3개 → 검증된 증거 → CTA입니다.
3. `STORYBOARD.md`를 보여 주고 승인을 받은 뒤 빌드합니다. 사용자가 자율 진행을 명시하면 알리고
   진행합니다.
4. 장면 사이에 다음 장면으로 이어지는 요소(같은 카드, 같은 색 면, 커서)를 하나 두면 슬라이드처럼
   끊기는 느낌을 줄입니다.
5. 장면은 독립적으로 수정·검증할 필요가 있을 때만 나누고, 나눠 만든 장면의 조립과 검수는 메인
   컨텍스트가 맡습니다.

## 4. 실제 앱 데모 흐름

JSON 스토리보드 → 결정적 재생 → 사후 가상 카메라·idle 압축 → 음성·자막 → 렌더.

- `demo-steps.json`의 각 step에는 `id`, `action`(navigate·click·type·scroll·wait), 실제로 존재를 확인한
  `selector`, 입력 텍스트, 기대 화면, 머무는 시간을 둡니다. selector를 추측하지 않습니다.
- 재생은 고정 viewport·고정 데이터·고정 시드로 하고, 애니메이션과 네트워크 응답이 끝난 뒤 찍습니다.
  고칠 때는 다시 녹화하지 않고 JSON만 고쳐 재생합니다.
- 줌·팬은 녹화 중이 아니라 컴포지션에서 엔진의 frame·timeline 키프레임으로 입힙니다. 클릭 좌표를
  초점으로 쓰고, 확대해도 선명하도록 2배 해상도로 찍습니다.
- 로딩·대기 구간은 빨리 감거나 자릅니다. 화면 안에서 재생 중인 애니메이션은 가속하지 않습니다.
- 커서, 클릭 리플, 키 입력 칩, 브라우저·기기 프레임은 녹화 위의 컴포지션 레이어로 그립니다.

## 5. 오디오

- 홍보영상은 Phase 3 Audio 행에서 BGM·SFX 여부를 한 번 묻습니다. 묻지 않고 기본 포함하지는 않습니다.
- 음악을 쓰면 비트를 타이밍의 정본으로 삼아 컷·숫자 롤·클릭을 비트에 맞추고, 나레이션이 있으면
  음성 아래로 음악을 낮춥니다.
- 나레이션은 [voice-captions.md](voice-captions.md), 음원 권리는 [video-qa.md](video-qa.md) 5절을 따릅니다.

## 6. 추가 검수

[video-qa.md](video-qa.md)에 더해 다음을 확인합니다.

- 모든 제품 화면이 캡처에서 왔고 placeholder가 남지 않았음
- contact sheet에서 같은 레이아웃·같은 전환이 세 장면 이상 연달아 반복되지 않음
- 개인정보·토큰·내부 URL이 화면에 보이지 않음
- 데모는 각 step의 기대 화면과 실제 프레임이 일치함

## 7. 완료 증거

- 갈래(런치 필름·실제 앱 데모)와 선택 근거
- Capture 상태와 `capture/` 경로, 사용 도구, 실패했다면 중단 사유
- 승인받은 `STORYBOARD.md`(또는 자율 진행 고지)와 `demo-steps.json`
- contact sheet와 추가 검수 결과

## 패턴 출처

의존성으로 두지 않고 2026-10-17에 단계 구성만 확인했습니다.

- HyperFrames `product-launch-video`: 캡처 → 디자인 토큰 → 승인 게이트 → 오디오 → 프레임별 빌드 → snapshot
  검수, 캡처 실패 시 중단 — https://github.com/heygen-com/hyperframes/blob/main/skills/product-launch-video/SKILL.md
- aidemo, cursorcam, demo-video-skill(surajshetty3416): JSON 스토리보드 → 결정적 재생 → 사후 가상 카메라 —
  https://github.com/tandryukha/aidemo , https://github.com/Avijit07x/cursorcam ,
  https://github.com/surajshetty3416/demo-video-skill
- 비교 조사: `docs/research/reports/코딩 에이전트 영상 생성 오픈소스 2026.md`
