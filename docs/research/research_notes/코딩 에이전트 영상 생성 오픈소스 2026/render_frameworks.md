# 코드 기반 영상 렌더 프레임워크와 공식 코딩 에이전트 스킬 (2026-10-17 측정)

> 측정 방법 메모 (모든 섹션 공통): 저장소 스타·포크·생성일·마지막 push·라이선스는 2026-10-17에 `gh api repos/OWNER/REPO`로 직접 측정했다. 릴리스 수는 `gh api repos/OWNER/REPO/releases`에서 `published_at >= 2026-08-18`(최근 60일)로 셌다. 과거 스타 수는 GitHub stargazers API가 이 환경에서 404를 반환하고(REST `/stargazers`) GraphQL `stargazers.totalCount`가 0을 반환해 쓸 수 없었으므로, Wayback Machine에 보관된 GitHub 저장소 페이지의 `aria-label="N users starred this repository"` 값을 직접 추출했다. OSSInsight API는 응답 자체에 `"status":"degraded"`(2026-05-01부터 severely degraded) 표시가 있고 HyperFrames 2026-08-01 값이 3,416으로 Wayback 실측(2026-08-05 39,602)과 크게 어긋나 **사용하지 않았다**. npm 다운로드는 api.npmjs.org, PyPI는 pypistats.org에서 2026-10-17에 조회했다.

## 1. 공식 에이전트 스킬이 있는 프레임워크와 스킬 구조 (HyperFrames·Remotion 현재 스킬 목록 포함)

### Takeaway
공식 SKILL.md 번들을 운영하는 곳은 HyperFrames(heygen-com/hyperframes, 공개 스킬 21개)와 Remotion(remotion-dev/skills, 12개) 두 곳뿐이며, 둘 다 "라우터 1개 + 하위 모듈" 구조다. 차이는 HyperFrames가 입력 유형별 **완결 워크플로 스킬 10개**(product-launch-video, pr-to-video 등)를 두고 라우터가 필요할 때 설치하는 데 반해, Remotion은 **API 영역별 지식·작업 스킬**(markup/render/captions/maps 등)만 두고 워크플로 스킬은 없다는 점이다. Motion Canvas, Revideo, Manim(CE·3b1b)은 저장소(루트·README)에서 공식 스킬·플러그인이 확인되지 않는다.

### Cited Findings

#### 프레임워크 개요 (렌더 방식·에이전트 연동)
- **HyperFrames**: HTML·CSS·미디어·seek 가능한 애니메이션을 결정적(deterministic) MP4로 변환한다. 렌더러가 headless Chrome에서 프레임마다 seek하고 FFmpeg로 인코딩하며, `index.html`이 빌드 단계 없이 그대로 재생된다. 애니메이션은 어댑터 방식으로 GSAP·CSS·Lottie·Three.js·Anime.js·WAAPI를 지원한다 — [HyperFrames README](https://github.com/heygen-com/hyperframes/blob/main/README.md)
- HyperFrames `hyperframes-animation` 스킬은 런타임 어댑터 7종(GSAP 기본, Lottie, Three.js, Anime.js, CSS keyframes, Web Animations API, TypeGPU)을 다룬다 — [skills/hyperframes-animation/SKILL.md](https://github.com/heygen-com/hyperframes/blob/main/skills/hyperframes-animation/SKILL.md)
- HyperFrames 에이전트 연동 경로: Claude Code 플러그인(`claude plugin marketplace add heygen-com/hyperframes` → `claude plugin install hyperframes@hyperframes`), `npx skills add heygen-com/hyperframes`(대화형 picker, "Core Skills" 그룹), `npx hyperframes skills update`(에이전트·비대화형 실행용, 코어 세트만 설치), Codex 플러그인 ZIP(`bun run package:codex-plugin`) — [HyperFrames README](https://github.com/heygen-com/hyperframes/blob/main/README.md)
- 저장소 루트에 `.claude-plugin`, `.codex-plugin`, `.cursor-plugin`, `gemini-extension.json`, `plugin.json`(agent-plugins.org 스키마, `version: 0.8.167`, `license: Apache-2.0`)이 있다 — [heygen-com/hyperframes 루트](https://github.com/heygen-com/hyperframes), [plugin.json](https://github.com/heygen-com/hyperframes/blob/main/plugin.json)
- 설치 정책: 단독 설치는 코어 세트(라우터 + `hyperframes-*` 도메인 스킬 + `media-use`)가 기본이고, 생성 워크플로는 라우터가 진입 직전에 `npx hyperframes skills update <workflow>`로 온디맨드 설치한다. `skills add --all`은 공개 스킬 21개 전체를 설치한다. `.claude/skills`·`.agents/skills` 아래 저장소 내부 스킬 6개는 기본 제외된다 — [HyperFrames README](https://github.com/heygen-com/hyperframes/blob/main/README.md)
- `skills add`는 skills.sh 레지스트리 blob을 해석하므로 `main`보다 몇 시간 늦을 수 있고, 최신본이 필요하면 `npx hyperframes skills update`를 쓰라고 안내한다 — [HyperFrames README](https://github.com/heygen-com/hyperframes/blob/main/README.md)
- HyperFrames 렌더 경로: 로컬, HeyGen 호스팅 클라우드(`cloud render`), AWS Lambda(`lambda deploy / render / progress`) — [README 스킬 표](https://github.com/heygen-com/hyperframes/blob/main/README.md). Google Cloud Run 렌더 경로는 릴리스 노트에서 확인된다(v0.8.0 "Redeploy GCP Cloud Run services and workflows", v0.8.66 "A stalled remote asset download no longer hangs a Cloud Run render") — [v0.8.0](https://github.com/heygen-com/hyperframes/releases/tag/v0.8.0), [v0.8.66](https://github.com/heygen-com/hyperframes/releases/tag/v0.8.66)
- **Remotion**: React 컴포넌트로 영상을 작성하고, HyperFrames와 마찬가지로 headless Chrome + FFmpeg로 렌더한다(번들러 필요). 분산 렌더는 Remotion Lambda — [HyperFrames README의 비교표](https://github.com/heygen-com/hyperframes/blob/main/README.md), [remotion-dev/remotion](https://github.com/remotion-dev/remotion)
- Remotion 에이전트 연동 경로: `npx skills add remotion-dev/skills`, `bun create video` 시 스킬 추가 제안, `npx remotion skills add` — [Remotion Agent Skills 문서 소스](https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/ai/skills.mdx), [Remotion MCP 문서 소스](https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/ai/mcp.mdx)
- Remotion은 Codex(ChatGPT 데스크톱), Claude Code, Cursor(마켓플레이스), GitHub Copilot CLI, Kimi Code용 플러그인을 운영하며 각 플러그인에 Agent Skills가 포함된다 — [Remotion Plugins 문서 소스](https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/ai/plugins.mdx)
- Claude Code 플러그인 설치: `claude plugin marketplace add remotion-dev/claude-code-plugin` → `claude plugin install remotion@remotion`, Claude 데스크톱 앱 플러그인 디렉터리에도 등재 — [claude-code-plugin 문서 소스](https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/ai/claude-code-plugin.mdx). 저장소 remotion-dev/claude-code-plugin은 2026-07-16 생성, 스타 50(2026-10-17 측정) — [remotion-dev/claude-code-plugin](https://github.com/remotion-dev/claude-code-plugin)
- **Remotion MCP는 deprecated**: "Install Remotion Agent Skills and use `/remotion-docs` instead. The hosted MCP will shut down no earlier than August 31, 2026." 사유로 문서 최신성 부족, Remotion이 MCP 토큰 비용 부담, 에이전트가 MCP를 안정적으로 호출하지 않음, `/remotion-docs`와 중복을 든다 — [Remotion MCP 문서 소스](https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/ai/mcp.mdx)
- remotion-dev/skills README는 `packages/skills/scripts/sync-readme.ts`가 생성한 파일이며, 스킬 원본은 모노레포 `packages/skills`에 있다 — [remotion-dev/skills README](https://github.com/remotion-dev/skills/blob/main/README.md), [Agent Skills 문서 소스](https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/ai/skills.mdx)
- 각 Remotion SKILL.md frontmatter의 `version`은 코어 릴리스와 같은 `4.0.536`이다(2026-08-14 커밋 시점에는 `4.0.512`) — [skills/remotion-best-practices/SKILL.md](https://github.com/remotion-dev/skills/blob/main/skills/remotion-best-practices/SKILL.md)
- **Motion Canvas**: TypeScript 코드로 캔버스 애니메이션을 만드는 도구("Visualize Your Ideas With Code"). 저장소 루트·README에 에이전트(claude/codex/skills/mcp/llms.txt) 언급이 없다 — [motion-canvas/motion-canvas](https://github.com/motion-canvas/motion-canvas)
- **Revideo**: "You describe a scene in TypeScript — shapes, text, media, and animation — and Revideo renders it to a video file." headless 렌더 API와 React 플레이어를 제공하고, "A scene is plain TypeScript, so Claude or Codex can produce one from a prompt"라고 쓰지만 스킬 디렉터리나 플러그인은 없다. "It's the engine behind Midrender" — [midrender/revideo README](https://github.com/midrender/revideo/blob/main/README.md)
- **Manim(CE·3b1b)**: 파이썬 수학 애니메이션 엔진. 두 저장소 모두 README·루트에 에이전트 스킬·MCP·llms.txt 언급이 없다 — [ManimCommunity/manim](https://github.com/ManimCommunity/manim), [3b1b/manim](https://github.com/3b1b/manim)
- Manim용 스킬은 커뮤니티 저장소 adithya-s-k/manim_skill(스타 1,177, 2026-01-22 생성, 마지막 push 2026-01-23, MIT)뿐이다 — [adithya-s-k/manim_skill](https://github.com/adithya-s-k/manim_skill)

#### heygen-com/hyperframes/skills 현재 목록 (21개, 2026-10-17 `contents/skills` 측정)
출처: [skills 디렉터리](https://github.com/heygen-com/hyperframes/tree/main/skills), 각 `SKILL.md` frontmatter, [README 스킬 표](https://github.com/heygen-com/hyperframes/blob/main/README.md), [skills-manifest.json](https://github.com/heygen-com/hyperframes/blob/main/skills-manifest.json). 괄호 안은 `SKILL.md`가 처음 커밋된 날짜(커밋 API `path=` 기준, 2026-06-14 일괄 날짜는 구조 재편으로 보이므로 실제 최초 도입일은 더 이를 수 있음).

라우터
- `hyperframes` — 필수 진입점. 영상 제작·편집·렌더·검사 요청을 모두 먼저 받아 프로젝트 상태를 재개하고, 의도를 확인하고, 담당 워크플로를 골라 설치한 뒤 도메인 스킬로 라우팅한다. 사용자가 다른 프레임워크를 명시하지 않으면 HyperFrames를 기본 출력으로 삼는다.

생성 워크플로 (10)
- `product-launch-video` (2026-06-14) — 제품·마케팅 URL, 스크립트, 브리프 → 런칭·프로모 영상(SaaS 프로모, 기능 공개, 데모, 사이트 투어). 최대 약 3분.
- `faceless-explainer` (2026-06-14) — 글·노트·주제 → 얼굴 없는 설명 영상. 장면별 시각(타이포·추상 그래픽·다이어그램·데이터 시각화)을 새로 만든다.
- `pr-to-video` (2026-06-14) — GitHub PR(URL, `owner/repo#N`, "this PR") → diff·커밋·파일 기반 체인지로그/기능 공개/수정/리팩터 설명 영상(`gh` CLI로 읽음).
- `embedded-captions` (2026-06-14) — 기존 단일 화자 토킹헤드 영상에 원본 손대지 않고 자막 추가. 35개 스타일 카탈로그, 피사체 뒤 임베드 자막, 로컬 전사·매팅까지 수행.
- `talking-head-recut` (2026-06-25) — 토킹헤드·인터뷰·팟캐스트 영상에 전사와 동기화된 그래픽 오버레이(키네틱 타이틀, 하단 자막, 데이터 콜아웃, 인용, PiP)를 얹는다.
- `motion-graphics` (2026-06-14) — 내레이션 없는 짧은(대개 10초 미만, 최대 약 30초) 모션 그래픽: 키네틱 타이포, 수치 카운트업, 차트, 로고 스팅, 지도, 트윗/헤드라인 애니메이션. MP4 또는 투명 오버레이.
- `music-to-video` (2026-06-23) — 음악 트랙(파일, 영상에서 추출, 또는 무드 브리프로 생성) → 비트 동기 영상(가사, 슬라이드쇼, 키네틱 프로모).
- `slideshow` (2026-06-19) — 프레젠테이션·피치덱·인터랙티브 덱(프래그먼트, 분기, 핫스팟, 발표자 모드). 산출물은 렌더 MP4가 아니라 탐색 가능한 덱.
- `general-video` (2026-06-14) — 특화 워크플로가 맞지 않을 때의 범용 폴백(긴 다장면, 브랜드/시즐 릴, 몽타주, 타이틀 카드), companion 모드의 본거지.
- `remotion-to-hyperframes` (2026-04-27) — 기존 Remotion(React) 컴포지션 소스를 HyperFrames HTML로 포팅하는 단방향 마이그레이션. 명시적 포팅 요청에만 사용.

도메인 스킬 (온디맨드, 10)
- `hyperframes-core` — 컴포지션 계약: `data-*` 타이밍 속성, `class="clip"`, 트랙, 서브컴포지션, 변수, 결정적 렌더 규칙, 검증.
- `hyperframes-animation` — 모션 규칙, 장면 블루프린트, 전환, 7개 런타임 어댑터, 24개 텍스트 애니메이션 효과.
- `hyperframes-keyframes` (2026-07-02) — seek 안전 키프레임(GSAP/CSS/Anime.js/WAAPI/FLIP/경로/마스크/SVG morph/3D)과 `hyperframes keyframes` 진단.
- `hyperframes-creative` — 애니메이션 외 크리에이티브 디렉션: `frame.md`/`design.md`, 팔레트, 타이포, 내레이션, 비트 계획, 오디오 반응 비주얼.
- `media-use` (2026-06-25) — "Agent Media OS": BGM·SFX·이미지·아이콘·로고·음성·LUT를 고정 로컬 파일 + 장부 기록으로 해석(`resolve`), 카탈로그에 없으면 TTS/음악/이미지 모델로 생성, 보이스오버·전사·자막·배경 제거.
- `hyperframes-cli` — `init`/`lint`/`check`/`snapshot`/`preview`/`render`/`publish`/`doctor`, HeyGen 클라우드·AWS Lambda·Cloud Run 렌더, `transcribe`, `tts`, `remove-background`.
- `hyperframes-audio` (2026-08-13) — 배치된 오디오 믹싱: 페이드, 덕킹, 보이스오버 carve, EQ/컴프레서 등 이펙트 체인, 자동화 엔벨로프, `<hf-audio-group>` 서브믹스 버스.
- `hyperframes-registry` (2026-04-14) — `hyperframes catalog`/`add`로 레지스트리 블록·컴포넌트(CRT, 글리치, 차트, 지도, 컨페티 등) 검색·설치·연결, 업스트림 기여.
- `figma` (2026-07-03) — Figma 에셋·토큰·컴포넌트·스토리보드 → 모션 재구성(REST/CLI), 커넥터 경유 모션·셰이더.
- `hyperframes-studio` (**2026-09-19 신규**, README 표에는 아직 없음) — Studio에서 사람과 협업할 때: 메시지가 변경 요청인지 판별, 새 영상의 계획·스토리보드·빌드 순서, 타임라인 레이아웃(캡션 트랙 1개, 트랙당 요소 1종, 장면마다 서브컴포지션)과 세이프존.

저장소 내부 스킬 (공개 제외, `.claude/skills`): `captions-overlay`, `changelog-video`, `cut-the-curve`, `motion-doctrine`, `oversized-cursor`, `seam-craft` — [.claude/skills](https://github.com/heygen-com/hyperframes/tree/main/.claude/skills)

#### remotion-dev/skills 현재 목록 (12개, 2026-10-17 측정)
출처: [remotion-dev/skills README](https://github.com/remotion-dev/skills/blob/main/README.md), [skills 디렉터리](https://github.com/remotion-dev/skills/tree/main/skills). 괄호 안은 `SKILL.md` 최초 커밋일.
- `remotion-best-practices` (2026-01-19 저장소 첫 커밋) — "Router for all Remotion skills". 다른 스킬을 모두 포함하며(디렉터리 안에 나머지 11개 스킬 폴더가 중첩) 어떤 스킬을 쓸지 모를 때 사용.
- `remotion-create` (2026-07-11) — 새 Remotion 프로젝트·컴포지션 생성(`tailwind.md`, `video-layout.md` 포함).
- `remotion-markup` (2026-07-11) — Remotion React 마크업 모범 사례: 컴포지션, 애니메이션, 레이아웃, 타이포, 미디어, 이펙트, 오디오, 폰트, 타이밍.
- `remotion-studio` (2026-08-04) — Studio를 띄워 미리보기.
- `remotion-render` (2026-07-11) — 영상 또는 스틸 렌더 실행.
- `remotion-maps` (2026-07-24) — 지도 애니메이션(Mapbox, MapLibre, MapTiler, GeoJSON, CesiumJS 3D 플라이오버).
- `remotion-captions` (2026-07-11) — 자막 전사·표시·애니메이션(JSON `Caption` 타입, SRT 가져오기).
- `remotion-saas` (2026-07-11) — Remotion 기반 앱·제품 통합 아키텍처.
- `remotion-interactivity` (2026-07-11) — Studio에서 코드 요소를 선택·편집 가능하게 만들기.
- `remotion-docs` (2026-07-16) — Remotion 문서 검색과 페이지 Markdown 조회(deprecated MCP 대체).
- `remotion-upgrade` (2026-07-19) — Remotion·관련 패키지·Mediabunny·설치된 Agent Skills 업그레이드.
- `remotion-multimedia` (2026-07-27) — Mediabunny 기반 브라우저 멀티미디어(영상·오디오 길이·해상도 조회).
- 2026-08-14 커밋(`9f0faa5`)의 스킬 목록과 2026-10-16 현재 목록이 같은 12개다 → 최근 60일에 **추가·삭제된 스킬은 없고 내용만 갱신**됐다 — [remotion-dev/skills 커밋 이력](https://github.com/remotion-dev/skills/commits/main)
- 최근 60일 스킬 내용 변경(코어 릴리스 노트의 Skills 항목): Track·connected compositions 예시, 색 보정·LUT 가이드 추가, premount 권장 삭제, 타임라인 레이아웃 reveal 워크플로 추가, Canvas Capture 브라우저 설치 스킬 삭제 — [Remotion v4.0.536 릴리스](https://github.com/remotion-dev/remotion/releases/tag/v4.0.536)

### Inferences
- 두 번들 모두 "라우터 + 모듈" 구조지만 결이 다르다. HyperFrames는 **결과물 중심**(입력 유형 → 완결 워크플로 → 도메인 스킬)이고 라우터가 워크플로를 지연 설치해 시작 컨텍스트를 줄인다. Remotion은 **API 영역 중심**이고 라우터(`remotion-best-practices`)가 하위 스킬을 중첩 포함하는 형태라, "PR → 영상" 같은 완결 산출물 절차는 사용자나 서드파티 스킬(video-shotcraft 등)에 맡긴다.
- Remotion이 MCP를 접고 `/remotion-docs` 스킬로 옮긴 것과 HyperFrames가 처음부터 스킬·플러그인만 배포하는 것을 보면, 2026년 하반기 이 분야의 공식 에이전트 연동 표준은 MCP가 아니라 SKILL.md 번들 + CLI 플러그인으로 수렴했다.
- remotion-dev/skills는 독립 개발 저장소가 아니라 모노레포 `packages/skills`의 생성 미러이므로, 활동성은 이 저장소가 아니라 remotion-dev/remotion 기준으로 봐야 한다.

### Gaps
- HyperFrames 스킬의 "최초 커밋일"은 2026-06-14 일괄 재구성 커밋 때문에 실제 도입일보다 늦게 잡혔을 수 있다(이전 경로·이름 추적은 하지 않음).
- `remotion-dev/skills` 저장소에 LICENSE 파일이 없어 GitHub가 라이선스를 `null`로 반환한다. 스킬 텍스트 재배포 조건은 공식 문서에서 확인하지 못했다.
- Gemini CLI 확장(`gemini-extension.json`)과 Cursor 플러그인 디렉터리 내용은 열어 보지 않았다(존재만 확인).
- Motion Canvas·Revideo·Manim은 저장소만 확인했고 공식 문서 사이트(motion-canvas.io, midrender.com, manim.community)의 `llms.txt`·에이전트 안내 페이지 유무는 확인하지 않았다.

## 2. 실측 활동성: 스타, 마지막 push, 최근 60일 릴리스

### Takeaway
2026-10-17 기준 HyperFrames(65,513★)가 Remotion(64,642★)을 근소하게 앞질렀고, 최근 60일 릴리스는 HyperFrames 169회 대 Remotion 24회로 HyperFrames의 릴리스 빈도가 압도적이다. Manim CE는 60일에 1회, Motion Canvas·Revideo·3b1b/manim은 0회로, Motion Canvas는 사실상 유지보수가 멈췄다.

### Cited Findings

#### 저장소 현황 (2026-10-17 `gh api` 측정)
| 저장소 | 스타 | 포크 | 생성일 | 마지막 push | 라이선스(API) |
|---|---|---|---|---|---|
| [heygen-com/hyperframes](https://github.com/heygen-com/hyperframes) | 65,513 | 5,904 | 2026-03-10 (공개 약 2026-04-17) | 2026-10-17 | Apache-2.0 |
| [remotion-dev/remotion](https://github.com/remotion-dev/remotion) | 64,642 | 5,112 | 2020-06-23 | 2026-10-17 | NOASSERTION (자체 Remotion License) |
| [remotion-dev/skills](https://github.com/remotion-dev/skills) | 5,260 | 579 | 2026-01-19 | 2026-10-16 | 없음(null) |
| [motion-canvas/motion-canvas](https://github.com/motion-canvas/motion-canvas) | 19,362 | 842 | 2022-08-03 | 2026-07-02 | MIT |
| [midrender/revideo](https://github.com/midrender/revideo) (구 redotvideo/revideo) | 4,117 | 213 | 2024-03-11 | 2026-07-15 | MIT |
| [ManimCommunity/manim](https://github.com/ManimCommunity/manim) | 41,607 | 3,203 | 2020-05-19 | 2026-10-16 | MIT |
| [3b1b/manim](https://github.com/3b1b/manim) | 95,205 | 7,803 | 2015-03-22 | 2026-09-09 | MIT |

- HyperFrames 생성일과 공개일은 다르다: API 생성일은 2026-03-10이지만 Wayback 스냅숏 기준 2026-04-16에 23★, 2026-04-17에 2,107★이었다 — [Wayback 2026-04-16](https://web.archive.org/web/20260416175044/https://github.com/heygen-com/hyperframes), [Wayback 2026-04-17](https://web.archive.org/web/20260417151953/https://github.com/heygen-com/hyperframes). 기사도 "On April 17, 2026, HeyGen open-sourced HyperFrames"라고 쓴다 — [noqta.tn](https://noqta.tn/en/blog/heygen-hyperframes-html-to-mp4-ai-agent-video-2026)
- `redotvideo/revideo`는 API 조회 시 `full_name: midrender/revideo`로 응답한다(저장소 이전). README 홈페이지는 midrender.com/revideo — [midrender/revideo](https://github.com/midrender/revideo)

#### 최근 60일(2026-08-18 ~ 2026-10-17) 릴리스 수
- HyperFrames: **169회** (v0.8.0 2026-08-18 → v0.8.167 2026-10-17). 2026-10-16 하루에만 v0.8.163~v0.8.166 4회 — [HyperFrames releases](https://github.com/heygen-com/hyperframes/releases)
- Remotion: **24회** (최신 v4.0.536 2026-10-16, v4.0.535 10-12, v4.0.534 10-07, v4.0.533 10-05, v4.0.532 10-01) — 주 2~3회 — [Remotion releases](https://github.com/remotion-dev/remotion/releases)
- remotion-dev/skills: GitHub 릴리스 0회지만 2026-08-01 이후 커밋 33개("Update template", Remotion 릴리스 날짜와 같은 날 동기화). 비활성이 아니라 생성 미러라서 릴리스를 만들지 않는 것 — [remotion-dev/skills 커밋](https://github.com/remotion-dev/skills/commits/main)
- ManimCommunity/manim: **1회** (v0.22.0 2026-10-08). 직전 v0.21.0은 2026-08-10으로 창 직전. 그 전은 v0.20.1(2026-02-27) — [Manim CE releases](https://github.com/ManimCommunity/manim/releases)
- Motion Canvas: **0회**. 마지막 릴리스 v3.18.0-alpha.0(2025-02-16, prerelease), 마지막 정식 v3.17.2(2024-12-14). 2025-02-16 이후 커밋은 2026-07-02 "refactor(docs): update domain" 1건뿐 — [motion-canvas releases](https://github.com/motion-canvas/motion-canvas/releases), [커밋 이력](https://github.com/motion-canvas/motion-canvas/commits/main)
- Revideo: GitHub 릴리스 0회(태그만 운영, 최신 태그 v0.11.0). 마지막 커밋은 2026-07-15 "docs: add RELEASING.md", 그 전 2026-07-10 "chore: release 0.11.0" — [midrender/revideo 커밋](https://github.com/midrender/revideo/commits/main)
- 3b1b/manim: **0회**. 마지막 릴리스 v1.7.2(2024-12-13), 마지막 push 2026-09-09 — [3b1b/manim releases](https://github.com/3b1b/manim/releases)

#### 최근 변경 (2026-08 ~ 10)
HyperFrames ([releases](https://github.com/heygen-com/hyperframes/releases)):
- v0.8.0 (2026-08-18): GCP Cloud Run 서비스·워크플로 재배포 안내(Cloud Run 렌더 경로 존재) — [v0.8.0](https://github.com/heygen-com/hyperframes/releases/tag/v0.8.0)
- v0.8.17 (2026-08-28): Studio가 live 편집 상태를 agentic browser에 WebMCP로 노출, 네이티브 WebMCP가 없는 브라우저용 polyfill — [v0.8.17](https://github.com/heygen-com/hyperframes/releases/tag/v0.8.17)
- v0.8.70 (2026-09-24): 미디어 스킬에 Gemini TTS 모델·서비스 계정 인증 추가 — [v0.8.70](https://github.com/heygen-com/hyperframes/releases/tag/v0.8.70)
- v0.8.87 (2026-09-29): 카탈로그에 3D 오브젝트, 커서, 눈, 스타필드, 종이 전환 추가 — [v0.8.87](https://github.com/heygen-com/hyperframes/releases/tag/v0.8.87)
- v0.8.138~139 (2026-10-06~07): 데스크톱 앱 hand-off, Electron 안에서 내장 전사 동작 — [v0.8.138](https://github.com/heygen-com/hyperframes/releases/tag/v0.8.138), [v0.8.139](https://github.com/heygen-com/hyperframes/releases/tag/v0.8.139). README 상단 이미지 설명은 "native Mac and Linux app now available" — [README](https://github.com/heygen-com/hyperframes/blob/main/README.md)
- 창 안의 기타 변경: Whisper 언어 자동 감지, Parakeet 전사(opt-in), Kokoro TTS 속도 전달, `hyperframes/api`로 `transcribe`·`removeBackground` export, `@hyperframes/inspector` npm 배포, 오디오 FX·그룹·뮤트 전체 공개, Studio 오디오 미터·타임라인 개편 — [HyperFrames releases](https://github.com/heygen-com/hyperframes/releases)
- 스킬: `hyperframes-audio` 2026-08-13, `hyperframes-studio` 2026-09-19 추가 — [skills](https://github.com/heygen-com/hyperframes/tree/main/skills)

Remotion ([releases](https://github.com/remotion-dev/remotion/releases)):
- v4.0.517 (2026-08-25): `@remotion/gsap` 신규 패키지 — [v4.0.517](https://github.com/remotion-dev/remotion/releases/tag/v4.0.517)
- v4.0.518 (2026-08-26): `@remotion/whisper-webgpu` 신규 패키지, Studio WebMCP 도구 추가 — [v4.0.518](https://github.com/remotion-dev/remotion/releases/tag/v4.0.518)
- v4.0.524 (2026-09-13): web-renderer에서 `toneFrequency` 피치 시프트 지원 — [v4.0.524](https://github.com/remotion-dev/remotion/releases/tag/v4.0.524)
- v4.0.530 (2026-09-29): `<Sequence>` 등에 `loop`, Studio 컴포지션 탭·Pre-compose·좌측 트림, `durationInFrames`가 `playbackRate`보다 먼저 적용되는 소규모 breaking change — [v4.0.530](https://github.com/remotion-dev/remotion/releases/tag/v4.0.530)
- v4.0.533 (2026-10-05): Studio가 ChatGPT Codex annotation 시스템과 통합 — [v4.0.533](https://github.com/remotion-dev/remotion/releases/tag/v4.0.533)
- v4.0.534 (2026-10-07): Chromium 157, Chrome↔FFmpeg 공유 메모리 캡처, 병렬 인코딩 확대 — [v4.0.534](https://github.com/remotion-dev/remotion/releases/tag/v4.0.534)
- v4.0.535 (2026-10-12): `renderFramesOnLambda()`(이미지 시퀀스), Lambda `separateAudioTo`, Python `AsyncRemotionClient`, 캡션 레이어 표시 — [v4.0.535](https://github.com/remotion-dev/remotion/releases/tag/v4.0.535)
- v4.0.536 (2026-10-16): Studio "New timeline experience", `Interactive.create()`, rolling edit, Element 라이브러리 검색, canvas-capture-extension `setup_shot`(agentic framing), Company License 대상 판정에서 "total headcount" 명확화 문서 — [v4.0.536](https://github.com/remotion-dev/remotion/releases/tag/v4.0.536)

Manim CE:
- v0.21.0 (2026-08-10): Typst 텍스트·마크업 1급 지원(선택 의존성), Cairo 렌더러 애니메이션 위주 장면 2.2배 가속, partial movie 병렬 인코딩 — [v0.21.0](https://github.com/ManimCommunity/manim/releases/tag/v0.21.0)
- v0.22.0 (2026-10-08): 렌더 흐름을 조율하는 `Manager` 도입, 출력 선택 통합·영상 인코딩 설정, `--custom_folders` 제거 등 breaking change — [v0.22.0](https://github.com/ManimCommunity/manim/releases/tag/v0.22.0)

### Inferences
- HyperFrames의 v0.8.x 하루 다회 릴리스는 사실상 main 머지마다 배포하는 연속 배포로 보이며, 릴리스 횟수를 성숙도로 직접 비교하면 안 된다. Remotion의 주 2~3회 릴리스도 이 분야에서는 높은 빈도다.
- 2026-08 말 Remotion(`@remotion/gsap`, WebMCP 8-26)과 HyperFrames(WebMCP 8-28)가 이틀 차이로 같은 방향(GSAP 수용, 에이전트 브라우저용 WebMCP)의 기능을 냈다. 두 프로젝트가 서로를 직접 의식하며 기능 격차를 좁히는 중이다.
- Remotion의 최근 변경 무게중심은 Studio(타임라인·Interactive·편집 UX)와 Codex 연동으로, "코드로 만들고 사람이 Studio에서 다듬는" 하이브리드 편집기로 가고 있다.

### Gaps
- HyperFrames 169개 릴리스 노트(약 414KB)는 키워드로만 훑었다. Parakeet·inspector 같은 항목의 정확한 버전 번호는 확인하지 않았다.
- HyperFrames 데스크톱 앱의 정식 출시일과 배포 채널은 릴리스 노트에서 특정하지 못했다(README 이미지 문구와 v0.8.138 hand-off 항목만 확인).

## 3. 재배포·상업적 사용에서 중요한 라이선스 차이

### Takeaway
Remotion만 비 OSI 자체 라이선스다. 개인, 직원 3명 이하 영리 조직, 비영리, 평가 목적은 무료(상업적 사용 포함)지만 그 밖의 영리 조직은 유료 Company License가 필요하고, Remotion 코드를 고쳐 파생물로 판매·재라이선스하는 것은 금지된다. HyperFrames(Apache-2.0), Motion Canvas·Revideo·Manim(MIT)은 재배포·상업적 사용에 규모 제한이 없다. 신생 파이프라인 중 OpenMontage는 AGPL-3.0이라 서비스에 넣을 때 소스 공개 의무를 따져야 한다.

### Cited Findings
- Remotion Free License 대상: "an individual", "a for-profit organization with up to 3 employees", "a non-profit or not-for-profit organization", "evaluating whether Remotion is a good fit, and are not yet using it in a commercial way" — [Remotion LICENSE.md](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md)
- 허용: 대상자는 "non-commercially or commercially for the purpose of creating videos and images" 사용·수정 가능. 금지: "It is not allowed to copy or modify Remotion code for the purpose of selling, renting, licensing, relicensing, or sublicensing your own derivate of Remotion." — [Remotion LICENSE.md](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md)
- 대상이 아니면 Company License가 필요하며 가격은 remotion.pro에서 확인하라고 한다 — [Remotion LICENSE.md](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md)
- LICENSE.md 첫 줄: "In Remotion 5.0, the license will slightly change." 변경 PR #3750("Prepare Remotion 5.0", 2024-04-22 생성, **2026-10-17 현재 open**)의 실질 변경 두 가지: ① 계약자(contractors)도 팀 규모에 포함, ② Company License가 remotion.pro 이용약관에 구속 — [PR #3750](https://github.com/remotion-dev/remotion/pull/3750)
- v4.0.536(2026-10-16) 문서 변경: "Clarify total headcount for Company License eligibility" — [v4.0.536](https://github.com/remotion-dev/remotion/releases/tag/v4.0.536)
- GitHub API는 Remotion 라이선스를 `NOASSERTION`으로 표시(SPDX 표준 라이선스가 아님) — [remotion-dev/remotion](https://github.com/remotion-dev/remotion)
- HyperFrames: "Open source: Apache 2.0 license, with no per-render fees or commercial-use thresholds." 비교표에서 Remotion은 "Source-available Remotion License" — [HyperFrames README](https://github.com/heygen-com/hyperframes/blob/main/README.md). 플러그인 메타데이터도 `license: Apache-2.0` — [plugin.json](https://github.com/heygen-com/hyperframes/blob/main/plugin.json)
- Motion Canvas MIT, Revideo MIT, Manim CE MIT(루트에 `LICENSE`와 `LICENSE.community` 두 파일), 3b1b/manim MIT — [motion-canvas](https://github.com/motion-canvas/motion-canvas), [midrender/revideo](https://github.com/midrender/revideo), [ManimCommunity/manim](https://github.com/ManimCommunity/manim), [3b1b/manim](https://github.com/3b1b/manim)
- remotion-dev/skills: GitHub API 라이선스 `null`(LICENSE 파일 없음) — [remotion-dev/skills](https://github.com/remotion-dev/skills)
- 신생 저장소 라이선스: calesthio/OpenMontage AGPL-3.0, latent-spaces/brag MIT, Vincentwei1021/video-shotcraft Apache-2.0, academa-labs/manimgx MIT, nexu-io/html-video Apache-2.0, ZhouXiaolin/opencat 라이선스 없음(null) — 각 [OpenMontage](https://github.com/calesthio/OpenMontage), [brag](https://github.com/latent-spaces/brag), [video-shotcraft](https://github.com/Vincentwei1021/video-shotcraft), [manimgx](https://github.com/academa-labs/manimgx), [html-video](https://github.com/nexu-io/html-video), [opencat](https://github.com/ZhouXiaolin/opencat)

### Inferences
- 스킬 번들을 자체 배포물에 포함(번들링)하려면 HyperFrames 스킬은 Apache-2.0 고지만 지키면 되지만, Remotion 스킬은 저장소에 라이선스가 없어 별도 확인이 필요하다. Remotion을 쓰는 영상 **생성물**은 Free License 대상이면 상업적으로 써도 되지만, Remotion을 감싼 렌더러·편집기를 제품으로 파는 것은 금지 조항에 걸릴 수 있다.
- 직원 4명 이상 회사가 에이전트로 영상을 대량 생산하는 경우 Remotion은 라이선스 비용이 생기고 HyperFrames는 생기지 않는다. HyperFrames가 README 비교표 맨 아래에 라이선스 차이를 명시한 것은 이 점을 채택 논거로 쓰려는 것이다.
- Remotion 5.0이 나오면 계약자 포함 규정 때문에 "직원 3명 + 외주"로 무료 대상이던 팀이 유료 대상으로 바뀔 수 있다(5.0 출시 시점은 미정).
- opencat처럼 라이선스가 없는 저장소는 기본적으로 모든 권리가 유보돼 재배포할 수 없다.

### Gaps
- Remotion Company License 가격(remotion.pro)은 조회하지 않았다.
- Remotion 5.0 출시 일정은 공식 자료에서 찾지 못했다(PR은 2024-04부터 open).

## 4. 2026년 8~10월 에이전트 영상 제작에서 모멘텀을 얻는 프레임워크와 근거

### Takeaway
측정 수치상 모멘텀은 HyperFrames가 가장 크다. 2026-08-19 → 10-17 사이 스타가 +23,912(41,601 → 65,513)로 같은 기간 Remotion(+7,773)의 약 3배이며, 10월 중 스타 수에서 Remotion을 추월했다. 다만 npm 절대 다운로드와 생태계 크기는 여전히 Remotion이 크고(주간 `remotion` 226만 대 `hyperframes` 81만), Remotion도 1월 Agent Skills 출시 이후 꾸준히 성장 중이다. 최대 규모 에이전트 영상 파이프라인 OpenMontage는 둘 다 렌더 런타임으로 쓴다.

### Cited Findings

#### 스타 추이 (Wayback 보관 GitHub 페이지 실측, 마지막 값은 2026-10-17 API)
- HyperFrames: 2026-04-17 2,107 → 04-27 11,661 → 05-21 20,024 → 06-16 27,924 → 07-15 35,164 → 08-05 39,602 → **08-19 41,601** → 09-04 43,952 → 09-19 51,551 → 10-01 54,921 → **10-17 65,513** — [08-19](https://web.archive.org/web/20260819043507/https://github.com/heygen-com/hyperframes), [09-04](https://web.archive.org/web/20260904194322/https://github.com/heygen-com/hyperframes), [09-19](https://web.archive.org/web/20260919140119/https://github.com/heygen-com/hyperframes), [10-01](https://web.archive.org/web/20261001081810/https://github.com/heygen-com/hyperframes), [07-15](https://web.archive.org/web/20260715011605/https://github.com/heygen-com/hyperframes), [05-21](https://web.archive.org/web/20260521055522/https://github.com/heygen-com/hyperframes), [04-27](https://web.archive.org/web/20260427151140/https://github.com/heygen-com/hyperframes), [06-16](https://web.archive.org/web/20260616024236/https://github.com/heygen-com/hyperframes), [08-05](https://web.archive.org/web/20260805174824/https://github.com/heygen-com/hyperframes), [현재](https://github.com/heygen-com/hyperframes)
  - 계산: 08-19→10-17 **+23,912 (59일)**, 09-04→09-19 +7,599(15일), 10-01→10-17 **+10,592(16일)**.
- Remotion: 2026-01-20 25,421 → 02-28 38,141 → 04-22 44,250 → 06-18 50,484 → 07-21 53,780 → **08-20 56,869** → 09-04 58,297 → 09-24 60,270 → **10-17 64,642** — [01-20](https://web.archive.org/web/20260120160227/https://github.com/remotion-dev/remotion), [02-28](https://web.archive.org/web/20260228051511/https://github.com/remotion-dev/remotion), [04-22](https://web.archive.org/web/20260422055351/https://github.com/remotion-dev/remotion), [06-18](https://web.archive.org/web/20260618051131/https://github.com/remotion-dev/remotion), [07-21](https://web.archive.org/web/20260721035317/https://github.com/remotion-dev/remotion), [08-20](https://web.archive.org/web/20260820083236/https://github.com/remotion-dev/remotion), [09-04](https://web.archive.org/web/20260904160147/https://github.com/remotion-dev/remotion), [09-24](https://web.archive.org/web/20260924151712/https://github.com/remotion-dev/remotion), [현재](https://github.com/remotion-dev/remotion)
  - 계산: 08-20→10-17 **+7,773 (58일)**, 09-24→10-17 +4,372(23일). 01-20→02-28 +12,720(39일, Agent Skills 저장소 생성 2026-01-19 직후).
- 추월 시점: 2026-10-01 HyperFrames 54,921 < 2026-09-24 Remotion 60,270, 2026-10-17 HyperFrames 65,513 > Remotion 64,642 → 2026년 10월 중 추월(정확한 날짜는 미측정) — 위 Wayback 링크와 [hyperframes](https://github.com/heygen-com/hyperframes)·[remotion](https://github.com/remotion-dev/remotion) 현재값
- Remotion v4.0.536 커밋에 "Update GitHub star count to 64K"가 있다 — [v4.0.536](https://github.com/remotion-dev/remotion/releases/tag/v4.0.536)
- remotion-dev/skills: 07-15 3,960 → 07-23 4,052 → 10-17 5,260 — [Wayback 07-15](https://web.archive.org/web/20260715120453/https://github.com/remotion-dev/skills), [Wayback 07-23](https://web.archive.org/web/20260723021220/https://github.com/remotion-dev/skills), [현재](https://github.com/remotion-dev/skills)
- 비교군: Manim CE 08-19 40,264 → 10-17 41,607(+1,343), 3b1b/manim 08-19 91,686 → 95,205(+3,519), Motion Canvas 09-03 19,036 → 19,362(+326) — [Manim CE 08-19](https://web.archive.org/web/20260819211629/https://github.com/ManimCommunity/manim), [3b1b 08-19](https://web.archive.org/web/20260819105325/https://github.com/3b1b/manim), [Motion Canvas 09-03](https://web.archive.org/web/20260903093010/https://github.com/motion-canvas/motion-canvas)

#### npm 다운로드 (api.npmjs.org, 2026-10-17 조회. 10월은 1~16일 부분값)
- `hyperframes`(CLI 패키지) 월별: 4월 87,591 / 5월 544,822 / 6월 1,395,664 / 7월 975,793 / 8월 1,070,746 / **9월 1,654,537** / **10월 1~16일 1,389,680** — [npm range hyperframes](https://api.npmjs.org/downloads/range/2026-04-01:2026-10-16/hyperframes)
- `remotion`(코어 라이브러리) 월별: 4월 2,746,939 / 5월 3,584,871 / 6월 4,692,815 / 7월 5,826,420 / **8월 7,204,836** / **9월 6,994,725** / 10월 1~16일 3,761,269 — [npm range remotion](https://api.npmjs.org/downloads/range/2026-04-01:2026-10-16/remotion)
- 최근 1주(2026-10-06~10-12): `remotion` 2,261,910, `@remotion/cli` 1,574,254, `hyperframes` 811,570, `@hyperframes/core` 244,518, `@revideo/core` 42,671, `@motion-canvas/core` 6,090 — [remotion](https://api.npmjs.org/downloads/point/last-week/remotion), [@remotion/cli](https://api.npmjs.org/downloads/point/last-week/@remotion/cli), [hyperframes](https://api.npmjs.org/downloads/point/last-week/hyperframes), [@hyperframes/core](https://api.npmjs.org/downloads/point/last-week/@hyperframes/core), [@revideo/core](https://api.npmjs.org/downloads/point/last-week/@revideo/core), [@motion-canvas/core](https://api.npmjs.org/downloads/point/last-week/@motion-canvas/core)
- `@revideo/core` 월별: 4월 7,690 → 9월 58,876 → 10월 1~16일 66,541 — [npm range @revideo/core](https://api.npmjs.org/downloads/range/2026-04-01:2026-10-16/@revideo/core)
- PyPI 최근 1주: `manim` 50,511, `manimgl` 1,641, `manimgx` 5,675 — [pypistats manim](https://pypistats.org/api/packages/manim/recent), [manimgl](https://pypistats.org/api/packages/manimgl/recent), [manimgx](https://pypistats.org/api/packages/manimgx/recent)

#### 채택 사례·생태계
- HyperFrames ADOPTERS(Production 표): HeyGen(제품 전반의 AI 영상 합성·렌더), tldraw(GSAP 코드 diff 애니메이션 PR walkthrough 영상 자동 생성), TanStack(짧은 코드 데모·문서 영상 탐색 중), OptinMonster(탐색 중), reap.video, Typeframe, THU-MAIC(OpenMAIC MP4 내보내기), Mini Course Generator, PandaStudio, Skyflo(제품 런칭 영상을 AI 에이전트가 처음부터 끝까지 작성) — [ADOPTERS.md](https://github.com/heygen-com/hyperframes/blob/main/ADOPTERS.md)
- calesthio/OpenMontage(68,970★)는 프로젝트 제안 시점에 Remotion과 HyperFrames 중 하나를 `render_runtime`으로 고정한다. Remotion은 데이터 중심 설명 영상과 기존 React 장면 스택의 기본값, HyperFrames는 모션 그래픽 위주 브리프의 기본값 — [OpenMontage README](https://github.com/calesthio/OpenMontage/blob/main/README.md)
- HyperFrames 위에 얹은 스킬: latent-spaces/brag(16,385★, "powered by Hyperframes", Opus 5.5에서는 HyperFrames 없는 `/brag-slim`으로 자동 전환), geekjourneyx/hyperframes-motion-director(462★), blixvip/MotionClone(401★, 참조 영상을 편집 가능한 HyperFrames 프로젝트로 재구성) — [brag README](https://github.com/latent-spaces/brag/blob/main/README.md), [hyperframes-motion-director](https://github.com/geekjourneyx/hyperframes-motion-director), [MotionClone](https://github.com/blixvip/MotionClone)
- Remotion 위에 얹은 스킬·라이브러리: Vincentwei1021/video-shotcraft(12,232★, 2026-07-19 생성, "cinematic product videos with Remotion: 152 shot recipe"), Remocn/remocn(1,610★, Remotion용 애니메이션·전환·장면 컴포넌트), digitalsamba/claude-code-video-toolkit(2,261★) — [video-shotcraft](https://github.com/Vincentwei1021/video-shotcraft), [remocn](https://github.com/Remocn/remocn), [claude-code-video-toolkit](https://github.com/digitalsamba/claude-code-video-toolkit)
- 기사 주장(미검증): Remotion이 2026년 1월 Agent Skills를 출시했고 보라색 전환 데모 영상이 "a week에 600만 뷰"를 기록했다 — [heyuan110.com](https://www.heyuan110.com/posts/ai/2026-01-26-claude-code-remotion-video/). 조회수는 이 조사에서 직접 측정하지 않았다.
- 2026년 HyperFrames vs Remotion 비교 기사가 여럿 나왔다(예: wireflow.ai, cutback.video, yuv.ai) — [wireflow.ai](https://www.wireflow.ai/blog/hyperframes-vs-remotion), [cutback.video](https://cutback.video/blog/hyperframes-vs-remotion-vs-selects), [yuv.ai](https://yuv.ai/blog/heygen-hyperframes-html-video)

### Inferences
- 스타 증가 속도(최근 59일 약 3배)와 npm 추세(HyperFrames는 9월 165만에서 10월 16일 만에 139만으로 월 환산 약 269만, 즉 9월의 약 1.6배 페이스, Remotion은 8월 720만 → 9월 699만 → 10월 1~16일 376만으로 보합)를 함께 보면 8~10월 성장 가속은 HyperFrames 쪽이다. 단 `remotion`은 다른 패키지의 의존성으로 설치되는 라이브러리이고 `hyperframes`는 CLI라 다운로드 수를 1:1로 비교하면 안 되며, 두 수치 모두 CI·봇 설치를 포함한다.
- Remotion의 2026년 성장은 1~2월(Agent Skills 출시 직후 +12.7k/39일)에 크게 튀었고, 하반기에는 월 3~4k 수준으로 안정적이다. HyperFrames는 출시(4월) 직후 급증 → 여름 둔화(07-15→09-04 51일간 +8.8k, 월 환산 약 5k) → 9월 중순 이후 재가속 패턴이다.
- OpenMontage처럼 상위 파이프라인이 두 엔진을 함께 지원하는 흐름은, 에이전트 영상 시장에서 렌더 엔진이 "HTML/GSAP 모션 그래픽 = HyperFrames, React·데이터 기반 = Remotion"으로 역할 분담되는 방향을 시사한다.
- `@revideo/core` 다운로드가 4월 대비 약 8배로 늘었지만 저장소 커밋은 7월 이후 멈춰 있다. Midrender 호스팅 서비스 쪽 사용 증가일 가능성이 있다(추론, 미검증).
- 3b1b/manim이 59일에 +3.5k로 Manim CE(+1.3k)보다 빨리 늘었는데, 릴리스가 없는 상황이라 개발 활동보다는 인지도(교육 콘텐츠·에이전트 수학 영상 관심)에 따른 것으로 보인다(추론).

### Gaps
- HyperFrames의 9월 중순(09-04→09-19 +7.6k)과 10월(10-01→10-17 +10.6k) 급증의 원인(특정 발표·바이럴 게시물·데스크톱 앱 출시 등)은 날짜를 맞춘 근거를 찾지 못했다.
- Wayback 스냅숏 간격이 불규칙해 정확한 추월 날짜와 주 단위 증가량은 알 수 없다. GitHub stargazers API는 이 환경에서 404를 반환해 별 단위 타임스탬프를 얻지 못했다.
- Remotion 채택 기업 목록(공식 쇼케이스)은 조회하지 않았다.

## 5. 2026년에 생긴 주목할 신생 프레임워크 (수치 포함)

### Takeaway
"렌더러 자체"로 의미 있는 2026년 신생은 academa-labs/manimgx(2026-10-05 생성, 12일 만에 1,652★, Rust/wgpu 기반 Manim CE API 호환 엔진, MIT) 하나가 두드러진다. nexu-io/html-video(4,695★)는 6월 이후 멈췄고, 나머지 렌더러는 100★ 미만이다. 스타가 큰 2026년 신생(OpenMontage 68,970★, brag 16,385★, video-shotcraft 12,232★)은 **새 렌더러가 아니라 Remotion·HyperFrames 위에 얹은 스킬·파이프라인**이다.

### Cited Findings

#### 신생·주목 렌더러 (2026-10-17 측정)
- **academa-labs/manimgx**: 1,652★, 생성 2026-10-05, 마지막 push 2026-10-15, MIT, 최근 60일 릴리스 2회. "Blazingly fast 3D animation engine for agents, compatible with Manim CE's API. Powered by Rust and wgpu. Install with a prompt or pip. Run in the browser." 자체 벤치마크(Apple M4 Pro, 1080p60, 5개 장면 36.2초 영상)에서 3.08초 렌더, "90.6× faster than ManimCE, 11.5× faster than ManimGL". 에이전트용 `llms.txt`와 스토리보드·2D 레이아웃 점검용 `manimgx inspect` 제공. PyPI 최근 1주 5,675, npm 최근 1주 514 — [manimgx](https://github.com/academa-labs/manimgx), [README](https://github.com/academa-labs/manimgx/blob/main/README.md), [pypistats](https://pypistats.org/api/packages/manimgx/recent), [npm](https://api.npmjs.org/downloads/point/last-week/manimgx)
- **nexu-io/html-video**: 4,695★, 생성 2026-05-27, 마지막 push **2026-06-21**(약 4개월 정체), Apache-2.0, "Programmatic video for coding agents — HTML to video on your laptop", 토픽에 hyperframes 포함, 60일 릴리스 0 — [html-video](https://github.com/nexu-io/html-video)
- **dmtrKovalenko/fframes**(신생 아님): 2,809★, 생성 2021-11-22, 마지막 push 2026-10-17, MIT, 60일 릴리스 4회. Rust·Skia 기반 "programmatic video rendering framework that is actually fast", README에 `npx skills add https://fframes.studio` — [fframes](https://github.com/dmtrKovalenko/fframes)
- **ybouane/VideoFlow**: 165★, 생성 2026-03-30, 마지막 push 2026-09-16, Apache-2.0, fluent TypeScript API → 이식 가능한 JSON 포맷 — [VideoFlow](https://github.com/ybouane/VideoFlow)
- **ZhouXiaolin/opencat**: 71★, 생성 2026-04-07, 마지막 push 2026-10-17, 라이선스 없음, "Write JSONL/XML. Render video/image. Built for agents."(Rust·Skia·wasm·GSAP 언급) — [opencat](https://github.com/ZhouXiaolin/opencat)
- **LBEILC/Multiplane**: 55★, 생성 2026-10-11, Apache-2.0, 6일간 릴리스 11회. "Local headless HTML-to-video renderer for AI agents. Shots are plain web pages driven by render(t)" — [Multiplane](https://github.com/LBEILC/Multiplane)
- 그 밖의 소규모 2026 렌더러: skyblanket/swift-render(12★, SwiftUI·Metal → MP4), Vandit1604/vawe(7★, HTML→영상), bevyl-ai/rerender(3★, WebCodecs·mediabunny 기반 MIT Remotion 대안), ku2055/frameflow(0★, 2026-10-11) — [swift-render](https://github.com/skyblanket/swift-render), [vawe](https://github.com/Vandit1604/vawe), [rerender](https://github.com/bevyl-ai/rerender), [frameflow](https://github.com/ku2055/frameflow)

#### 2026년 신생 스킬·파이프라인 레이어 (렌더러 아님)
- **calesthio/OpenMontage**: 68,970★, 생성 2026-03-29, 마지막 push 2026-10-16, **AGPL-3.0**, 릴리스 0. "agentic video production system. 12 production pipelines, 100+ tools". 생성형 영상(Veo, Kling)·TTS(Piper, Google Chirp)와 Remotion/HyperFrames 컴포지션을 결합 — [OpenMontage](https://github.com/calesthio/OpenMontage), [README](https://github.com/calesthio/OpenMontage/blob/main/README.md)
- **latent-spaces/brag**: 16,385★, 생성 2026-06-16, 마지막 push 2026-10-13, MIT. 만든 프로젝트를 런칭 영상으로 바꾸는 `/brag` 스킬, HyperFrames 기반, `npx skills add https://github.com/latent-spaces/brag --skill brag` — [brag](https://github.com/latent-spaces/brag)
- **Vincentwei1021/video-shotcraft**: 12,232★, 생성 2026-07-19, Apache-2.0, 60일 릴리스 1회, Remotion 기반 — [video-shotcraft](https://github.com/Vincentwei1021/video-shotcraft)
- 같은 저자의 Vincentwei1021/anything2explainer(2,550★, 2026-09-08 생성)·video-talkcraft(1,618★, 2026-08-22 생성) — [anything2explainer](https://github.com/Vincentwei1021/anything2explainer), [video-talkcraft](https://github.com/Vincentwei1021/video-talkcraft)
- 편집 쪽(코드 렌더가 아닌 ffmpeg·타임라인 기반): veedstudio/open-edit(1,679★, 2026-07-22, Apache-2.0, VEED의 에이전트 편집 파이프라인), 0xsline/OpenChatCut(2,426★, AGPL-3.0), pireel/pireel(1,300★, AGPL-3.0, MCP 제어) — [open-edit](https://github.com/veedstudio/open-edit), [OpenChatCut](https://github.com/0xsline/OpenChatCut), [pireel](https://github.com/pireel/pireel)

### Inferences
- 2026년 신생 프로젝트의 스타는 거의 전부 "기존 엔진 위 스킬/파이프라인"에 몰렸다. 렌더러 경쟁은 사실상 HyperFrames vs Remotion 양강으로 굳었고, 신생 렌더러는 Rust 기반 성능(manimgx, fframes, opencat)이나 HTML `render(t)` 단순화(Multiplane, html-video)로 틈새를 노린다.
- manimgx는 기존 Manim CE 코드·에이전트 지식을 그대로 쓰면서 렌더 시간을 크게 줄여, 수학·과학 설명 영상 분야에서 에이전트 반복 루프(작성 → 렌더 → 점검)를 빠르게 만드는 쪽에 가치가 있다. 다만 생성 12일차이고 벤치마크는 자체 측정이다.
- OpenMontage가 AGPL-3.0이므로 이를 SaaS 백엔드로 쓰면 네트워크 사용자에게 소스를 공개할 의무가 생길 수 있다. 내부 렌더 엔진(Remotion/HyperFrames)의 라이선스와 별개로 따져야 한다.

### Gaps
- GitHub 검색(`gh search repos`, 키워드·토픽 약 24개)은 스타순 상위 결과만 봤으므로, 설명에 핵심어가 없는 신생 렌더러는 놓쳤을 수 있다.
- manimgx의 90.6배 벤치마크는 독립 검증을 찾지 못했다.
- anything2explainer, video-talkcraft가 어떤 렌더러를 쓰는지는 README를 열어 확인하지 않았다.
- 2026년 신생 저장소의 스타 증가 추이(일별)는 stargazers API를 쓸 수 없어 측정하지 못했다.
