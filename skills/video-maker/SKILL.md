---
name: video-maker
description: "Remotion 기반 React 코드로 영상 제작. 프로젝트 셋업, 영상 컴포넌트 생성, 애니메이션, 렌더링. /video-maker로 실행."
---

# Video Maker — Remotion 코드 기반 영상 제작

React 컴포넌트를 작성하면 영상으로 렌더링해주는 Remotion 프레임워크 기반 스킬입니다.
제품 소개 영상, 데모 비디오, SNS 콘텐츠, 데이터 시각화 영상 등을 코드로 생성합니다.

## 적용 시점

- `/video-maker` 명시적 실행
- "영상 만들어줘", "소개 비디오", "데모 영상", "Remotion" 요청 시

---

## Step 1: 모드 파악

사용자 메시지에서 모드를 판별합니다:

| 모드 | 트리거 키워드 | 동작 |
|------|-------------|------|
| **init** | "셋업", "설치", "초기화", "프로젝트 생성" | Remotion 프로젝트 구조 생성 |
| **create** | "만들어", "생성", "영상", "비디오" | 영상 컴포넌트 작성 |
| **edit** | "수정", "변경", "바꿔", "고쳐" | 기존 영상 컴포넌트 수정 |
| **render** | "렌더링", "출력", "내보내기", "MP4" | 영상 렌더링 실행 |

---

## Step 2: 모드별 워크플로우

### 2-A. init — 프로젝트 셋업

**설치:**
```bash
npm i remotion @remotion/cli @remotion/player
```

**디렉토리 구조:**
```
src/remotion/
├── index.ts              # registerRoot(Root)
├── Root.tsx              # <Composition> 등록
├── compositions/
│   ├── IntroVideo.tsx    # 영상 컴포넌트
│   └── DemoVideo.tsx
└── assets/               # 이미지, 폰트 등
```

**Root.tsx 기본 구조:**
```tsx
import { Composition } from 'remotion';
import { IntroVideo } from './compositions/IntroVideo';

export const Root = () => {
  return (
    <>
      <Composition
        id="IntroVideo"
        component={IntroVideo}
        durationInFrames={150}  // 5초 (30fps)
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
```

### 2-B. create — 영상 컴포넌트 생성

#### 핵심 API

| API | 용도 | 예시 |
|-----|------|------|
| `useCurrentFrame()` | 현재 프레임 번호 | 애니메이션 기준값 |
| `useVideoConfig()` | fps, 크기, 길이 정보 | 반응형 레이아웃 |
| `interpolate()` | 프레임 → 값 매핑 | 위치, 투명도, 크기 변화 |
| `spring()` | 물리 기반 애니메이션 | 자연스러운 바운스 효과 |
| `<AbsoluteFill>` | 전체 화면 레이어 | 배경, 오버레이 |
| `<Sequence>` | 시간축 배치 | from={30} → 1초 후 시작 |
| `<Series>` | 순차 배치 | 씬 자동 연결 |

#### 애니메이션 기본 패턴

```tsx
import { useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';
import { AbsoluteFill } from 'remotion';

export const IntroVideo = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // 페이드 인 (0~30프레임 = 0~1초)
  const opacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateRight: 'clamp',
  });

  // 스프링 애니메이션 (바운스 효과)
  const scale = spring({ frame, fps, config: { damping: 10 } });

  // 슬라이드 인 (왼쪽에서 등장)
  const translateX = interpolate(frame, [0, 20], [-100, 0], {
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ backgroundColor: '#0f172a' }}>
      <h1
        style={{
          color: 'white',
          fontSize: 72,
          opacity,
          transform: `scale(${scale}) translateX(${translateX}%)`,
        }}
      >
        제품 소개
      </h1>
    </AbsoluteFill>
  );
};
```

#### 씬 구성 (Sequence)

```tsx
import { Sequence, Series } from 'remotion';

export const DemoVideo = () => {
  return (
    <AbsoluteFill>
      {/* 0~2초: 타이틀 */}
      <Sequence from={0} durationInFrames={60}>
        <TitleScene />
      </Sequence>

      {/* 2~5초: 기능 소개 */}
      <Sequence from={60} durationInFrames={90}>
        <FeatureScene />
      </Sequence>

      {/* 5~7초: CTA */}
      <Sequence from={150} durationInFrames={60}>
        <CtaScene />
      </Sequence>
    </AbsoluteFill>
  );
};
```

#### 미디어 사용

```tsx
import { Video, Audio, Img, staticFile } from 'remotion';

// 이미지
<Img src={staticFile('logo.png')} style={{ width: 200 }} />

// 비디오 삽입
<Video src={staticFile('demo.mp4')} startFrom={0} />

// 배경 음악
<Audio src={staticFile('bgm.mp3')} volume={0.3} />
```

### 2-C. render — 렌더링

```bash
# 실시간 프리뷰 (브라우저에서 확인)
npx remotion studio

# MP4 렌더링
npx remotion render <CompositionId> out/video.mp4

# 특정 프레임을 이미지로 (썸네일)
npx remotion still <CompositionId> out/thumbnail.png --frame=45

# GIF 렌더링
npx remotion render <CompositionId> out/video.gif --image-format=png
```

---

## Step 3: 영상 유형별 템플릿

### 제품 소개 영상 (30초)

| 씬 | 시간 | 내용 |
|----|------|------|
| 1. Hook | 0~3초 | 문제 제기 (큰 텍스트 + 페이드 인) |
| 2. Solution | 3~8초 | 제품 이름 + 핵심 가치 (스프링 애니메이션) |
| 3. Features | 8~20초 | 기능 3개 순차 등장 (슬라이드 인) |
| 4. Demo | 20~25초 | 스크린샷/GIF (확대 효과) |
| 5. CTA | 25~30초 | "지금 시작하세요" + URL |

### 데이터 시각화 영상

| 씬 | 시간 | 내용 |
|----|------|------|
| 1. Title | 0~2초 | 차트 제목 |
| 2. Chart | 2~8초 | 막대/선 그래프 애니메이션 (interpolate로 높이 변화) |
| 3. Highlight | 8~10초 | 핵심 수치 강조 |

### SNS 숏폼 (15초)

| 씬 | 시간 | 내용 |
|----|------|------|
| 1. Attention | 0~2초 | 강렬한 텍스트 (스케일 업) |
| 2. Content | 2~12초 | 핵심 내용 3컷 |
| 3. CTA | 12~15초 | 팔로우/링크 안내 |

---

## 작성 규칙

| 규칙 | 설명 |
|------|------|
| TypeScript 필수 | 모든 컴포넌트 `.tsx`로 작성 |
| 결정론적 코드 | `Math.random()` 금지 → `random('seed-string')` 사용 |
| clamp 필수 | `interpolate()`에 `extrapolateLeft/Right: 'clamp'` 항상 설정 |
| 시간 = 프레임 | 30fps 기준: 1초 = 30프레임, 5초 = 150프레임 |
| Composition 등록 | 새 영상은 반드시 `Root.tsx`에 `<Composition>` 추가 |
| 씬 분할 | 10초 이상 영상은 씬 단위로 컴포넌트 분리 |
| 해상도 | 기본 1920×1080 (16:9), 세로형은 1080×1920 (9:16) |

---

## Context7 연계

Remotion API가 업데이트될 수 있으므로, 구현 전 Context7 MCP로 최신 문서를 확인합니다:

```
Context7: remotion 최신 API 확인
- useCurrentFrame, interpolate, spring 사용법
- Composition 등록 방식
- 렌더링 CLI 옵션
```

---

## 연관 리소스

| 리소스 | 역할 |
|--------|------|
| `nano-banana` (스킬) | Gemini 기반 이미지/썸네일 생성 → 영상 소스로 활용 |
| `design-system-starter` (스킬) | 디자인 토큰 → 영상 컬러/타이포 일관성 |
| `stitch-*` (스킬) | UI 디자인 → 영상 속 화면 목업 소스 |
