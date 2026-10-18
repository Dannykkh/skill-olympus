# HyperFrames Engine Adapter

HyperFrames를 선택한 경우에만 읽습니다. HTML이 영상의 정본이고 `data-*` 속성이 clip timing을,
등록된 paused timeline이 프레임별 시각 상태를 표현합니다.

## 공식 근거와 요구사항

- Documentation: https://hyperframes.heygen.com
- Repository: https://github.com/heygen-com/hyperframes
- License: Apache-2.0
- Runtime: 공식 quickstart 기준 Node.js 22 이상과 FFmpeg 필요

버전과 요구사항은 변경될 수 있으므로 실제 사용 직전에 공식 문서와 package metadata를 다시
확인합니다.

## 설치 경계

- `npx skills add heygen-com/hyperframes`를 실행하지 않습니다.
- HyperFrames upstream의 여러 agent skill을 전역 스킬 디렉터리로 복사하지 않습니다.
- 기존 설치가 없으면 프로젝트 package manager에 검증한 정확한 버전을 추가하는 안을 먼저
  제시합니다.
- 일회성 `npx`가 필요해도 unpinned `npx hyperframes`나 `@latest`를 사용하지 않습니다.
- HyperFrames CLI를 실행할 때는 환경 변수 `HYPERFRAMES_SKIP_SKILLS=1`을 붙입니다. `init`은
  `--skip-skills`를 무시하고 GitHub 기준으로 전역 스킬을 확인·설치하며, 이 변수가 `init`·백그라운드
  갱신 알림·스킬 설치 명령을 모두 멈춥니다. upstream은 이 변수를 "스킬을 한 커밋에 고정해 외부에서
  관리하는 경우"로 정의합니다(번들 `hyperframes-cli/references/init-and-scaffold.md`, CLI
  `commands/skills.ts`). 프로젝트 manifest의 video script에도 같은 값을 넣습니다.
- HyperFrames를 Aphrodite 또는 일반 웹페이지의 모션 런타임으로 추가하지 않습니다.

## 전역 번들 모듈 (설치되어 있을 때만)

사용자가 HeyGen 번들을 전역 스킬 디렉터리에 이미 설치해 두었으면 아래 모듈만 직접 읽습니다.
경로는 현재 CLI의 활성 스킬 루트 기준이며, Claude는 `~/.claude/skills/`입니다. 번들이 없으면 이
문서만으로 진행하고 TTS·전사·자막 단계는 `NOT RUN`으로 남깁니다.

아래 경로는 2026-10-17 갱신본(HyperFrames v0.8.168, upstream `main` `b18b3e9`)에서 존재를
확인했습니다. 표의 파일이 없으면 다른 이름으로 추측해 읽지 않고 해당 단계를 `NOT RUN`으로 남긴 뒤
번들 갱신 절차(아래)로 경로를 다시 맞춥니다.

| 모듈 | 읽을 파일 | 읽는 시점 |
|---|---|---|
| `hyperframes-core` | `hyperframes-core/SKILL.md`, `references/data-attributes.md`, `references/determinism-rules.md` | 컴포지션 HTML을 쓰기 전 |
| `hyperframes` | `hyperframes/references/storyboard-format.md`, `hyperframes/references/script-format.md` (라우터 `SKILL.md`는 읽지 않음) | `STORYBOARD.md`, `SCRIPT.md`를 쓰기 전 |
| `hyperframes-cli` | `hyperframes-cli/SKILL.md`, `references/lint-validate-inspect.md`, `references/preview-render.md` | lint·preview·render 명령을 정할 때 |
| `hyperframes-cli` | `references/init-and-scaffold.md`의 `capture` 절 | 앱 홍보영상에서 URL을 캡처할 때([app-promo.md](app-promo.md)) |
| `media-use` | `media-use/audio/references/tts.md`, `tts-to-captions.md`, `transcribe.md`, `captions/*.md` | 나레이션 또는 자막이 필요할 때 |

읽지 않는 것:

- `hyperframes` 라우터 `SKILL.md`와 intent interview. 진입점과 brief는 `video-maker`가 소유합니다.
  라우터는 HyperFrames를 기본 출력으로 삼고 워크플로를 트리거 시점에 설치하므로 엔진 중립·버전
  고정 규칙과 맞지 않습니다.
- `general-video`, `faceless-explainer`, `product-launch-video`, `motion-graphics`, `pr-to-video`,
  `music-to-video`, `embedded-captions`, `talking-head-recut`, `remotion-to-hyperframes`, `slideshow` 같은
  워크플로우 스킬. 일부(`general-video`)가 설치되어 있어도 진입점이나 워크플로로 쓰지 않고,
  설치되지 않은 것을 설치하지도 않습니다. 앱 홍보·모션 단편에 필요한 단계 구성은
  [app-promo.md](app-promo.md)와 `SKILL.md`의 brief 유형이 자체적으로 소유합니다.
- `figma`, `hyperframes-registry`, `hyperframes-animation`, `hyperframes-keyframes`, `hyperframes-audio`,
  `hyperframes-creative`, `hyperframes-studio`는 선택 모듈입니다. 해당 기능이 brief에 명시될 때만 그
  `SKILL.md`를 읽습니다. `hyperframes-studio`는 Studio 타임라인 배치·자막 safe zone 규칙이 필요할 때만
  읽습니다.

번들 규칙과 충돌하면 이 스킬이 우선합니다. 번들의 `npx hyperframes@latest upgrade` 안내는 따르지
않고 프로젝트 pin을 유지하며, 번들의 HeyGen 로그인 preflight는 "요금·계정이 필요한 공급자는 확인
후 사용"이라는 이 스킬의 규칙으로 대체합니다. 번들의 `skills update <workflow>` 같은 온디맨드
설치 안내와 오래된 스킬 알림도 따르지 않습니다.

### 번들 갱신 (사용자가 결정하는 유지보수)

영상 작업 중에는 번들을 갱신하지 않습니다. 갱신은 사용자가 요청할 때 별도로 하며 다음 순서를
따릅니다.

1. 다섯 스킬 루트(`~/.claude/skills`, `~/.agents/skills`, `~/.codex/skills`, `~/.gemini/skills`,
   `~/.gemini/antigravity-cli/skills`)의 번들 폴더와 `~/.agents/.skill-lock.json`을 백업합니다.
2. 고정한 `skills` CLI로 설치된 이름만 갱신합니다. 예:
   `npx skills@<버전> add heygen-com/hyperframes --skill <설치된 이름들> --global --agent claude-code universal --copy --full-depth --yes`.
   ref를 고정하는 옵션이 없으므로 실행 직전 upstream `main` 커밋과 CLI 버전을 기록합니다.
3. `skills` CLI는 Codex·Gemini·Antigravity를 `~/.agents/skills` 공용 저장소를 읽는 CLI로 보고 각자의
   폴더에 쓰지 않습니다. 기존 사본이 있던 폴더는 `~/.claude/skills` 사본으로 교체해 다섯 루트를
   같게 맞추고, Codex 중복 정리(`scripts/codex-skill-dedup.js`)를 다시 실행합니다.
4. `npx hyperframes@<버전> skills check --json`으로 설치본이 `current`이고 `coreMissing`이 0인지 읽기
   전용으로 확인합니다. upstream이 핵심 세트(`hyperframes`, `hyperframes-*`, `media-use`)에 새 스킬을
   넣었으면 함께 설치하고 위 선택 모듈 목록에 올립니다.
5. 위 모듈 표의 모든 경로가 존재하는지 확인하고, 옮겨진 경로는 이 문서와
   `scripts/tests/source-only-module-routing.test.js`를 함께 고칩니다.

## 기본 구조

```text
video/
├─ index.html
├─ compositions/
├─ assets/
├─ SCRIPT.md
├─ STORYBOARD.md
└─ meta.json
```

```html
<div
  id="stage"
  data-composition-id="intro"
  data-start="0"
  data-duration="5"
  data-width="1920"
  data-height="1080"
>
  <img
    class="clip"
    data-start="0"
    data-duration="5"
    data-track-index="0"
    src="./assets/product.png"
    alt=""
  />
</div>
```

정확한 schema는 현재 설치 버전의 공식 core 문서를 따릅니다. primitive clip의 mount·unmount와
media seek를 임의 JavaScript로 다시 구현하지 않습니다.

## Timeline Contract

- GSAP timeline은 `paused: true`로 생성합니다.
- composition ID와 같은 key로 `window.__timelines`에 등록합니다.
- duration은 timeline 길이가 아니라 composition의 `data-duration`에서 가져옵니다.
- `requestAnimationFrame`, `setTimeout`, `Date.now()`, 무작위 wall-clock 로직을 사용하지 않습니다.
- `<video>`는 `muted playsinline`으로 두고 오디오는 별도 `<audio>` clip으로 관리합니다.
- 네트워크 자산 대신 검증된 로컬 자산을 사용합니다.

```js
const timeline = gsap.timeline({ paused: true });
timeline.from(".title", { opacity: 0, y: 32, duration: 0.7 });

window.__timelines = window.__timelines || {};
window.__timelines.intro = timeline;
```

## Commands

정확한 버전이 프로젝트에 고정된 뒤 manifest의 script가 lockfile의 로컬 binary를 호출하도록 하고
그 script runner를 사용합니다.

```bash
npm run video:lint
npm run video:check
npm run video:preview
npm run video:draft
npm run video:render
```

위 script는 각각 `hyperframes lint ./video --json`, `hyperframes check`(lint를 다시 돌린 뒤 브라우저
검사, `--snapshots`로 개요 프레임), `hyperframes preview`, draft render, final render를 가리키게 하고
모두 `HYPERFRAMES_SKIP_SKILLS=1`을 붙입니다. `validate`·`inspect`·`layout`은 v0.8.168에서 `check`의
deprecated alias입니다. 장면 대표 프레임과 contact sheet는 `hyperframes snapshot --at <t1>,<t2>` 또는
`--range <a>:<b> --frames <n>`으로 얻습니다. 프로젝트가 pnpm·yarn·bun을 쓰면 기존 package manager의
script runner를 사용합니다.

## HyperFrames를 선택하지 않을 조건

- 기존 React/Remotion 컴포넌트와 타입을 재사용해야 함
- 검증된 Remotion Lambda 파이프라인을 유지해야 함
- Node.js 22 또는 FFmpeg를 제공할 수 없음
- 요청이 영상이 아니라 웹페이지의 ScrollTrigger·Flip·SplitText 인터랙션임
