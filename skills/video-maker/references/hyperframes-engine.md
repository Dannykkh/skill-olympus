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
- HyperFrames를 Aphrodite 또는 일반 웹페이지의 모션 런타임으로 추가하지 않습니다.

## 전역 번들 모듈 (설치되어 있을 때만)

사용자가 HeyGen 번들을 전역 스킬 디렉터리에 이미 설치해 두었으면 아래 모듈만 직접 읽습니다.
경로는 현재 CLI의 활성 스킬 루트 기준이며, Claude는 `~/.claude/skills/`입니다. 번들이 없으면 이
문서만으로 진행하고 TTS·전사·자막 단계는 `NOT RUN`으로 남깁니다.

| 모듈 | 읽을 파일 | 읽는 시점 |
|---|---|---|
| `hyperframes-core` | `hyperframes-core/SKILL.md`, `references/data-attributes.md`, `references/determinism-rules.md` | 컴포지션 HTML을 쓰기 전 |
| `hyperframes-core` | `references/storyboard-format.md`, `references/script-format.md` | `STORYBOARD.md`, `SCRIPT.md`를 쓰기 전 |
| `hyperframes-cli` | `hyperframes-cli/SKILL.md`, `references/lint-validate-inspect.md`, `references/preview-render.md` | lint·preview·render 명령을 정할 때 |
| `media-use` | `media-use/audio/references/tts.md`, `tts-to-captions.md`, `transcribe.md`, `captions/*.md` | 나레이션 또는 자막이 필요할 때 |

읽지 않는 것:

- `hyperframes` 라우터와 intent interview. 진입점과 brief는 `video-maker`가 소유합니다.
- `general-video`, `faceless-explainer`, `product-launch-video` 같은 워크플로우 스킬. 설치되어 있지
  않고, 설치하지도 않습니다.
- `figma`, `hyperframes-registry`, `hyperframes-animation`, `hyperframes-keyframes`, `hyperframes-audio`,
  `hyperframes-creative`는 선택 모듈입니다. 해당 기능이 brief에 명시될 때만 그 `SKILL.md`를 읽습니다.

번들 규칙과 충돌하면 이 스킬이 우선합니다. 번들의 `npx hyperframes@latest upgrade` 안내는 따르지
않고 프로젝트 pin을 유지하며, 번들의 HeyGen 로그인 preflight는 "요금·계정이 필요한 공급자는 확인
후 사용"이라는 이 스킬의 규칙으로 대체합니다.

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
npm run video:preview
npm run video:draft
npm run video:render
```

위 script는 각각 `hyperframes lint ./video --json`, `hyperframes preview`, draft render, final render를
가리키게 합니다. 프로젝트가 pnpm·yarn·bun을 쓰면 기존 package manager의 script runner를 사용합니다.

## HyperFrames를 선택하지 않을 조건

- 기존 React/Remotion 컴포넌트와 타입을 재사용해야 함
- 검증된 Remotion Lambda 파이프라인을 유지해야 함
- Node.js 22 또는 FFmpeg를 제공할 수 없음
- 요청이 영상이 아니라 웹페이지의 ScrollTrigger·Flip·SplitText 인터랙션임
