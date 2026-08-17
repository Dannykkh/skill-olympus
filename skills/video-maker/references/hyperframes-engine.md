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
