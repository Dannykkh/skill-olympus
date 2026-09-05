# Remotion Engine Adapter

Remotion을 선택한 경우에만 읽습니다. React/TypeScript 컴포넌트가 영상의 정본이며 frame 값으로
모든 시각 상태를 계산합니다.

## 공식 근거와 라이선스

- Documentation: https://www.remotion.dev/docs
- Repository: https://github.com/remotion-dev/remotion
- License: https://github.com/remotion-dev/remotion/blob/main/LICENSE.md

Remotion은 단순 MIT 패키지로 가정하지 않습니다. 공식 라이선스는 개인·비영리·일정 규모 이하
조직과 그 밖의 영리 조직을 구분합니다. 이 스킬은 법률 판정을 대신하지 않으며 적용 여부가 불명확하면
`LICENSE REVIEW REQUIRED`로 남깁니다.

## Preflight

1. 기존 package manager와 lockfile을 사용합니다.
2. 설치된 `remotion`, `@remotion/cli`, 관련 `@remotion/*` 버전을 확인합니다.
3. 기존 `remotion.config.*`, entry point와 Composition ID를 먼저 읽습니다.
4. 새 의존성이 필요하면 공식 문서에서 호환 버전을 확인하고 정확한 버전을 제시합니다.
5. 기존 프로젝트가 없을 때만 새 Remotion 구조를 만듭니다.

## 기본 구조

```text
src/remotion/
├─ index.ts
├─ Root.tsx
├─ compositions/
└─ assets/
```

```tsx
import { Composition } from "remotion";
import { IntroVideo } from "./compositions/IntroVideo";

export const Root = () => (
  <Composition
    id="IntroVideo"
    component={IntroVideo}
    durationInFrames={150}
    fps={30}
    width={1920}
    height={1080}
  />
);
```

프로젝트 entry에서 `registerRoot(Root)`가 한 번 호출되는지 확인합니다.

## Frame Contract

- `useCurrentFrame()`과 `useVideoConfig()`를 시간의 정본으로 사용합니다.
- `interpolate()`에는 양쪽 extrapolation clamp를 명시합니다.
- 반복 가능한 자연스러운 값에는 `spring()`을 사용합니다.
- 시간 구간은 `<Sequence>` 또는 `<Series>`로 표현합니다.
- 미디어는 `staticFile()`과 Remotion 미디어 컴포넌트를 사용하고 준비 상태를 기다립니다.
- 10초 이상이거나 독립 변경되는 장면만 scene 컴포넌트로 분리합니다.
- 변이는 Remotion의 seeded `random()`을 사용합니다.

```tsx
const opacity = interpolate(frame, [0, 30], [0, 1], {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
});
```

## Commands

실제 package version과 프로젝트 script를 우선합니다. manifest의 script가 lockfile에 고정된 로컬
binary를 호출하도록 한 뒤 사용합니다.

```bash
npm run video:studio
npm run video:compositions
npm run video:still -- <CompositionId> out/acceptance.png --frame=45
npm run video:render -- <CompositionId> out/video.mp4
```

위 script는 각각 `remotion studio`, `remotion compositions`, `remotion still`, `remotion render`를
가리키게 하며 프로젝트가 pnpm·yarn·bun을 쓰면 기존 package manager의 script runner를 사용합니다.

CI나 자동화에서는 대화형 Studio 대신 typecheck, compositions, still, 제한 구간 draft render를
사용합니다. 최종 옵션은 현재 설치 버전의 공식 CLI 문서로 확인합니다.

## 나레이션과 자막

- 음성 생성과 자막 정렬 분기는 [voice-captions.md](voice-captions.md)를 따릅니다.
- 자막 렌더는 `@remotion/captions`의 `Caption` 타입, `parseSrt`, `createTikTokStyleCaptions`를
  사용하고 page마다 `<Sequence>`를 둡니다. 자막 타이밍을 컴포넌트 안에서 손으로 계산하지 않습니다.
- 전사가 필요하면 `@remotion/install-whisper-cpp`를 정확한 버전으로 추가하고 16kHz WAV로 변환한 뒤
  `tokenLevelTimestamps: true`로 실행합니다.
- remotion-dev/skills 번들은 참고 문서일 뿐이며 설치를 전제하지 않습니다. 공식 근거는
  https://github.com/remotion-dev/skills/tree/main/skills/remotion-captions 입니다.

## Remotion을 선택하지 않을 조건

- 결과 원본을 순수 HTML/CSS/GSAP로 유지해야 함
- React build 단계와 JSX 변환을 원하지 않음
- 프로젝트의 배포 정책이 Remotion 라이선스와 맞는지 확인되지 않음
- 기존 HyperFrames 컴포지션을 단순 수정하는 요청
