# 코딩 에이전트용 앱 홍보영상(앱/제품 프로모·런치·데모) 오픈소스 도구 조사 — 2026-10-17 기준

> 측정 기준: GitHub 수치(★, 생성일, 마지막 push, 라이선스, 저장소 크기)는 모두 **2026-10-17 08:25–08:45 UTC에 `gh api repos/OWNER/REPO`로 직접 측정**했다. 표에서 출처 링크는 각 저장소 URL이다. `NOASSERTION`은 GitHub가 SPDX로 판정하지 못한 **커스텀 라이선스**이므로 LICENSE 원문을 확인해야 한다는 뜻이다.
> 발굴 방법: `gh search repos`(검색 API는 병렬 에이전트와 공유돼 시간당 30회 한도를 두 번 소진), 큐레이션 목록 [zhuyansen/awesome-claude-video-skills](https://github.com/zhuyansen/awesome-claude-video-skills)의 "Promo & demos"(61개) 섹션, 각 저장소 README·루트 디렉터리 목록, 웹 기사 몇 건.
> 범위: 앱·웹사이트·URL·PR·화면 녹화를 홍보/런치/데모/스토어 미리보기 영상으로 바꾸는 도구만. 해설 영상·쇼츠·뮤직비디오·아바타는 인접 조사 범위라 한 줄 언급만 한다.

## Q1. 어떤 프로젝트가 있고, 입력·출력은 무엇이며, 에이전트는 어떻게 구동하는가 (SKILL.md / MCP / CLI)

### Takeaway
2026-10 현재 생태계는 (1) 렌더 엔진 HyperFrames(HTML→MP4, Apache-2.0)와 Remotion(React→MP4, 커스텀 라이선스) 위에 얹은 **"URL/저장소 → 런치 필름" 스킬**, (2) Playwright로 **실제 앱을 조작·촬영해 줌·커서·자막을 입히는 데모 영상 파이프라인**(대부분 스킬+MCP+CLI 3중 제공), (3) **Screen Studio 대체 녹화기**(대부분 GUI라 에이전트 구동 불가, 예외적으로 헤드리스 스킬 존재), (4) 소수의 **App Store/Play 미리보기**·**PR/릴리스→영상** 도구로 나뉜다. 에이전트 구동 방식은 SKILL.md(`npx skills add`, Claude Code/Codex 플러그인 마켓플레이스)가 압도적 다수이고, 데모 녹화 계열은 MCP 서버를 함께 제공하는 경향이 강하다.

### Cited Findings

**A. 렌더 엔진·메타 툴킷 (코드 렌더 기반)**
- HyperFrames: "Write HTML. Render video. Built for agents." 21개 스킬을 제공하고 `/hyperframes` 라우터가 요청을 워크플로로 분기한다. `/product-launch-video`는 "Any website — marketing / launching / promoting a product (from its URL, a brief, or a script)… Up to ~3 min" — [heygen-com/hyperframes README](https://github.com/heygen-com/hyperframes)
- HyperFrames 스킬 디렉터리에는 embedded-captions, faceless-explainer, figma, general-video, hyperframes-animation/audio/cli/core/creative/keyframes/registry/studio, hyperframes, media-use, motion-graphics, music-to-video, pr-to-video, product-launch-video, remotion-to-hyperframes, slideshow, talking-head-recut이 있다(측정 2026-10-17) — [heygen-com/hyperframes skills/](https://github.com/heygen-com/hyperframes/tree/main/skills)
- HyperFrames는 CLI·Docker·AWS Lambda·HeyGen 호스팅 클라우드 렌더·Google Cloud Run을, Remotion은 CLI·Node/Bun·Remotion Lambda를 렌더 경로로 제공한다 — [Wireflow: HyperFrames vs Remotion](https://www.wireflow.ai/blog/hyperframes-vs-remotion)
- Remotion 라이선스: 개인과 "직원 3명 이하 영리 조직"은 상업적 용도까지 무료이고, 그 외 회사는 Company License가 필요하다 — [remotion LICENSE.md](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md). 유료 플랜은 Creators 좌석당 월 $25, Automators 렌더당 $0.01(월 최소 $100), Enterprise 월 $500부터 — [Wireflow](https://www.wireflow.ai/blog/hyperframes-vs-remotion)
- Remotion 공식 Agent Skills(`npx skills add remotion-dev/skills`, `/remotion-best-practices`, `/remotion-create` 등) — [remotion-dev/skills](https://github.com/remotion-dev/skills)
- heygen-com/hyperframes-launches: HeyGen 자체 런치 영상의 HyperFrames 소스 20편(HeyGen×Stripe, PR-to-video launch, Website → HyperFrames demo, Figma launch, Kimi K3 promo 등)을 공개하고, 그중 17편에 공개 영상 링크가 있다(hyperframes.dev 뷰어 15편, 저장소 내 MP4 2편). 자산은 Git LFS로 관리한다 — [heygen-com/hyperframes-launches](https://github.com/heygen-com/hyperframes-launches)
- 메타 툴킷: OpenMontage("12 production pipelines, 100+ tools, 700+ agent skill… files", AGPL-3.0) — [calesthio/OpenMontage](https://github.com/calesthio/OpenMontage); digitalsamba/claude-code-video-toolkit("AI-native video production toolkit for Claude Code", MIT) — [repo](https://github.com/digitalsamba/claude-code-video-toolkit); nexu-io/open-design(101,741★)의 skills/에 `video-hyperframes`, `remotion`, `motion-design` 등 영상 스킬이 포함돼 있다 — [nexu-io/open-design skills/](https://github.com/nexu-io/open-design/tree/main/skills)

**B. URL·저장소·브리프 → 런치/프로모 필름 스킬**
- latent-spaces/brag: "turns the project you created into a short, shareable launch video — music, motion, and share copy included. One command." 내부적으로 HyperFrames에 브리프를 넘긴다. Opus 5.5에서는 HyperFrames 없이 단일 파일로 동작하는 `/brag-slim`으로 자동 전환되고(`/brag --full`로 고전 모드 유지), 출력은 `brag-output/`(plan, composition brief, share copy, `brag.mp4`)이다. 내레이션은 기본 꺼짐이며 `--voice`로 켜면 Kokoro를 쓴다. 설치는 Claude Code `/plugin marketplace add latent-spaces/brag`, Codex 플러그인, `npx skills add`이고 `.agents/.claude/.opencode` 심볼릭 링크를 제공한다. 웹 대행 서비스 letsbrag.app도 있다 — [latent-spaces/brag](https://github.com/latent-spaces/brag)
- Vincentwei1021/video-shotcraft: "make a promo for my product"라고 하면 에이전트가 실제 페이지를 캡처하고, 튜닝된 모션 레시피 라이브러리에서 샷을 고르고, 스토리보드를 짜고, Remotion으로 애니메이션을 만들고, 비트에 맞춰 컷하고, 사운드 디자인을 넣고, 모든 프레임을 점검해 MP4를 넘긴다. 2026-10 샷 라이브러리 갱신(124 cards / 150 shots), 2026-09 Motion Workbench(CapCut형 브라우저 편집기), 2026-08 JianYing(CapCut CN) 드래프트 내보내기를 지원한다 — [Vincentwei1021/video-shotcraft](https://github.com/Vincentwei1021/video-shotcraft)
- feitangyuan/onetake: 컷 없이 "every beat grows out of the one before"하는 원테이크 런치/티저/기능 데모 필름을 만든다. 실제 UI는 스크린샷을 보고 HTML로 재구성하며("No screen recording") 약 38개의 측정된 모션을 쓴다. `probe.py` 오라클이 프레임마다 화면 내용을 기록해 컷 경계의 연속성(carry score)을 채점한다(예: v1 0.00 반려 → onetake 런치 필름 0.83 채택) — [feitangyuan/onetake](https://github.com/feitangyuan/onetake)
- AbubakrChan/product-launch-motion: "Paste your website URL. Get a product launch video." v2는 GSAP/HyperFrames 대신 순수 HTML과 closed-form spring, "music-first timing instead of voiceover", Playwright 서브프레임과 ffmpeg 모션 블러로 다시 만들었다(v1은 legacy/에 보존). 설치는 `npx skills add` — [AbubakrChan/product-launch-motion](https://github.com/AbubakrChan/product-launch-motion)
- op7418/guizang-product-video-skill: 코드베이스와 "최근 커밋·버전 노트"를 받아 업데이트 홍보영상을 만든다. 원래 제품 컴포넌트를 우선 재사용하고, 배경음악을 코드로 작곡하고, 조작마다 효과음을 넣고, 덕킹까지 처리한다. 스타일 모드는 `repo`/`default`/`hybrid`이고 Claude Code와 Codex를 지원한다 — [op7418/guizang-product-video-skill](https://github.com/op7418/guizang-product-video-skill). 6단계 워크플로(범위 확인 → 실제 내용 검증 → 스토리보드·카피 → 모션 → 사운드 → 검증)와 CodePilot 쇼케이스 — [OrcaRouter 기사](https://www.orcarouter.ai/blog/claude-opus-5-5-product-video-skill)
- tugrawork-creator/saas-motion-kit: HyperFrames+Claude Code용 SaaS 프로모 킷. "no two films should feel like the same film" 원칙 아래 101개 테마, 24개 전환 아틀라스, 스토리보드 반복을 잡는 variety audit, 레퍼런스 영상을 샷 단위로 쪼개는 `tools/breakdown.py`를 제공한다 — [tugrawork-creator/saas-motion-kit](https://github.com/tugrawork-creator/saas-motion-kit)
- echris6/motion-video-kit: 실제 비즈니스용 프리미엄 런치형 광고 킷. 28편의 SaaS 런치 필름에서 추린 모션 문법, 빌더와 심사자를 분리한 "Gauntlet" 비평 루프, 정지 프레임·라우드니스 측정 스크립트, Three.js 패턴을 담았다 — [echris6/motion-video-kit](https://github.com/echris6/motion-video-kit)
- diggerhq/shipvideo(launchvideo.io): "Paste a URL or a prompt, get a 20 to 40 second launch video." Opus 5.5가 단일 HTML 필름을 쓰고, OpenComputer 서버리스 에이전트가 헤드리스 Chromium으로 프레임을 렌더해 ffmpeg로 인코딩한다 — [diggerhq/shipvideo](https://github.com/diggerhq/shipvideo). 편당 약 4분, 토큰 약 100k, 2026-09-24 공개 — [ai-tldr](https://ai-tldr.dev/releases/diggerhq-launchvideo/)
- chacha95/demo-video-creator: 제품 URL을 받아 16:9 런치 필름(영어/한국어)을 만든다. 실제 UI 캡처, 하나로 이어지는 VO, 비트에 고정한 모션, 마스터링한 믹스를 거쳐 1920×1080/30fps H.264+AAC로 출력한다. 레퍼런스 영상("make it feel like this video")도 입력으로 받는다 — [chacha95/demo-video-creator](https://github.com/chacha95/demo-video-creator)
- 그 밖의 URL→런치 스킬(awesome list 설명 기준): norahe0304-art/30x-video("One URL in, an agency-grade launch video out", Remotion), smit-vanani/claude-promo-video(URL → beat-locked Remotion 프로모), timscheuerai/launch-video-kit(URL → 브랜드 킷 → Apple 스타일 런치), per-simmons/launch-video-clone(HyperFrames, 레퍼런스 복제), AmirSbss/spotlight(웹사이트·폰 클립·CSV → 쇼트), hamen/app-promo-reel(HyperFrames, 9:16 비트 동기 앱 프로모 릴) — [awesome-claude-video-skills](https://github.com/zhuyansen/awesome-claude-video-skills)

**C. 에이전트가 실제 앱을 조작·촬영하는 데모 영상 파이프라인 (Playwright/Chrome)**
- Avijit07x/cursorcam: "Ask your AI agent for a demo video. It clicks through your web app and hands back a polished MP4 that zooms in on each click." Claude Code/Codex/Copilot/Gemini CLI 플러그인, Cursor용 MCP, Claude Desktop `.mcpb`, `npx -y cursorcam mcp`, CLI(`npx cursorcam run steps.json`)를 모두 제공한다. 출력은 1080p 60fps `video.mp4`와 `poster.jpg`. 에이전트가 앱을 탐색해 단계를 쓰고, 숨긴 브라우저로 녹화한 뒤 스틸을 확인해 고친다 — [Avijit07x/cursorcam](https://github.com/Avijit07x/cursorcam)
- tandryukha/aidemo: 에이전트가 `storyboard.json` 하나를 쓰면 헤드리스 엔진이 실제 Chrome을 구동해 deterministic replay를 녹화하고 음성·자막을 붙이고 dead time을 자른다. 재현 가능하므로 "re-renders itself in CI"(GitHub Action `tandryukha/aidemo@stable`)가 된다. Claude Code 플러그인, `npx skills add`, MCP Registry, npm, Homebrew로 배포한다 — [tandryukha/aidemo](https://github.com/tandryukha/aidemo)
- new-xp/ultrademo: flow 파일(샷 리스트)이 Playwright로 앱을 구동해 `storyboard.json`(스크린샷, 실제 녹화 클립, 커서 트랙, 내레이션)을 만들고, TTS(ElevenLabs → Piper → macOS say 순으로 폴백) 후 Remotion으로 렌더한다. 로그인 세션도 로컬에서 처리한다 — [new-xp/ultrademo](https://github.com/new-xp/ultrademo)
- AnayDhawan/openvidstudio: "Remotion and Playwright, driven end to end by an AI coding agent through MCP… every frame is a capture of it, not a generated mockup" — [AnayDhawan/openvidstudio](https://github.com/AnayDhawan/openvidstudio)
- Co-Messi/supercut: `npx @co-messi/supercut generate --url …`. 단계는 analyze(소스 읽기 + 크롤링으로 "money moments" 선정, LLM) → script(스키마 검증된 촬영 레시피, LLM) → record → render이고, 단계마다 JSON 산출물을 넘긴다. `.claude/skills/supercut/SKILL.md`로 에이전트가 감독을 맡을 수 있다 — [Co-Messi/supercut](https://github.com/Co-Messi/supercut)
- greentfrapp/testreel: JSON으로 상호작용을 정의하면 애니메이션 커서·macOS 창 크롬·배경 스타일을 입힌 녹화(WebM/MP4/GIF)를 만든다. "point your agent at this repo" 방식이다 — [greentfrapp/testreel](https://github.com/greentfrapp/testreel)
- ThePatriczek/playwright-recast: Playwright trace.zip을 받아 idle 구간 가속, SRT 자막, ElevenLabs 보이스오버를 거쳐 1080p MP4로 만드는 플루언트 파이프라인. `.claude-plugin`과 `.mcp.json`을 포함한다 — [ThePatriczek/playwright-recast](https://github.com/ThePatriczek/playwright-recast)
- surajshetty3416/demo-video-skill: Playwright가 한 프레임에 한 단계씩 앱을 조작하며 스크린샷을 찍고, Pillow 컴포지터의 가상 카메라(프레임별 초점 + 줌)가 그라디언트 배경·둥근 패널·벡터 커서·클릭 펄스·eased zoom/pan을 입혀 완벽한 60fps를 만든다. 수동 녹화용 Chrome 확장도 있다 — [surajshetty3416/demo-video-skill](https://github.com/surajshetty3416/demo-video-skill)
- Kminer2053/demo-video-skill(한국어): "데모 영상 만들어줘" 한마디로 실제 앱을 조작하는 시연 mp4를 만든다. 자막바·기능 라벨·가짜 커서·줌을 코드로 굽고, "AI 분석중" 같은 대기 구간을 자동으로 압축한다 — [Kminer2053/demo-video-skill](https://github.com/Kminer2053/demo-video-skill)
- crimeacs/product-demo-director: `./pdd install-skill`로 Claude Code·Codex에 연결하고 ElevenLabs(음성·음악·효과음) 키를 쓴다. "Only use claims you can verify" 같은 근거 고정형 런치 필름과 모션그래픽 트랙을 제공한다 — [crimeacs/product-demo-director](https://github.com/crimeacs/product-demo-director)
- 기타: mcpware/pagecast(MCP로 브라우저 페이지를 GIF/영상으로 녹화) — [repo](https://github.com/mcpware/pagecast); shreyaskarnik/argo(Playwright 스크립트 → AI 보이스오버 데모) — [repo](https://github.com/shreyaskarnik/argo); 45ck/demo-machine(YAML → 부드러운 커서·자연스러운 타이핑 데모) — [repo](https://github.com/45ck/demo-machine); simonw/shot-scraper(스크린샷·데모 영상 녹화 CLI) — [repo](https://github.com/simonw/shot-scraper)

**D. 화면 녹화 → 자동 줌 편집 (Screen Studio 대체)**
- siddharthvaddem/openscreen: 커서를 따라가는 자동 줌(깊이·지속시간·이징 조정), 커서 크기·스무딩·클릭 효과, 기기 내 자동 자막, 배경(월페이퍼/그라디언트), 모션 블러, 텍스트/화살표 주석, MP4/GIF 다중 비율 내보내기를 제공한다. macOS/Windows/Linux Electron 앱 — [siddharthvaddem/openscreen](https://github.com/siddharthvaddem/openscreen). README에 "agent", "mcp", "claude"가 한 번도 나오지 않는다(grep 0건, 2026-10-17) → GUI 전용.
- CapSoftware/Cap: "Open source Loom alternative". Studio Mode에서 배경·줌·트리밍·자막을 편집한다 — [CapSoftware/Cap](https://github.com/CapSoftware/Cap)
- connerkward/screenstudio-alt-skill: "headless, open-source Screen Studio alternative… from the command line (or your coding agent)". 클릭·타이핑에 자동 줌, idle 가속, 키스트로크 칩, 스무딩 커서와 클릭 리플·클릭 사운드, 배경에 따라 명암이 자동 전환되는 콜아웃, 동작을 따라가는 9:16, FCPXML 내보내기, BPM 지정 시 음악 그리드에 맞춘 beat-cut을 지원한다. Claude Code 플러그인 형태 — [connerkward/screenstudio-alt-skill](https://github.com/connerkward/screenstudio-alt-skill)
- syi0808/screenize: macOS 자동 줌 녹화기, "Development… currently paused" — [syi0808/screenize](https://github.com/syi0808/screenize). 신규 소형 녹화기: btahir/reelbird(macOS, 2026-10-13 생성) — [repo](https://github.com/btahir/reelbird); prashantGit24/ZoomArc(Windows, zoom-on-click, 2,000Hz 커서 추적) — [repo](https://github.com/prashantGit24/ZoomArc); tonhaoln/retake — [repo](https://github.com/tonhaoln/retake)

**E. App Store / Google Play 미리보기 영상**
- trunghaiy/appshot: "primitives library + AI skill"이 코드베이스를 스캔해 앱 이름·브랜드 색·아이콘·기능·스토어 메타데이터를 뽑고, 몇 가지 크리에이티브 질문을 거쳐 Remotion `.tsx` 씬을 직접 생성한다. 15–30초 스토어 미리보기를 iPhone/Pixel 기기 프레임과 스토어 배지만 바꿔 두 스토어용으로 동시에 만들고, 웹용 1920×1080 데모(크롬 브라우저 목업)와 스토어 스크린샷도 만든다. React Native/Expo, Flutter, Swift, Kotlin과 Next.js 등을 지원하고 `--quick` 모드가 있다. 실제 사용 사례로 App Store 앱 BookStreak이 있다 — [trunghaiy/appshot](https://github.com/trunghaiy/appshot)
- imamhossain94/promo-app: Google Play 리스팅을 가리키면 Reels/TikTok/Shorts용 MP4를 만드는 브라우저 앱 — [repo](https://github.com/imamhossain94/promo-app); yusuftuhh/mockup-studio: Tauri 기반 3D 기기 목업 GUI — [repo](https://github.com/yusuftuhh/mockup-studio); betyourluck/AppPromoVideo: 코드베이스와 UI 스냅샷을 Veo/Sora 등 생성형 영상 모델용 프롬프트로 바꾼다(코드 렌더 방식 아님) — [repo](https://github.com/betyourluck/AppPromoVideo)

**F. PR / 변경 로그 / 릴리스 → 영상**
- HyperFrames `pr-to-video`: PR URL, `owner/repo#N`, "this PR"을 입력받아 changelog / feature-reveal / fix-explainer / refactor-walkthrough 아키타입의 코드 변경 해설 영상을 만든다(아래 Q5에서 자세히) — [pr-to-video SKILL.md](https://github.com/heygen-com/hyperframes/blob/main/skills/pr-to-video/SKILL.md)
- AlemTuzlak/skills: 모든 스킬이 "PR URL, a git ref range (`v1.0...v2.0`)… or freeform text"를 받는다. `video-script`, `remotion-video`(mp4+poster), `hyperframes-video`(mp4+poster), `changelog`, `social-copy`, `marketing-pipeline` 등이 있다 — [AlemTuzlak/skills](https://github.com/AlemTuzlak/skills)
- sunmer/cliphouse: "Your coding agent turns every release into a video for your socials." 무료 스킬(`npx skills add sunmer/cliphouse`)과 호스티드 MCP(`https://cliphou.se/mcp`)를 제공하지만, MP4 다운로드와 3개를 넘는 템플릿 편집에는 Google 로그인이 필요하고 데모의 "Some steps… are coming soon"이다 — [sunmer/cliphouse](https://github.com/sunmer/cliphouse)
- guizang-product-video-skill(커밋·버전 노트 → 업데이트 홍보영상, 위 B 참조), joeseesun/qiaomu-product-video("turns a real repo into a launch-ready product film") — [repo](https://github.com/joeseesun/qiaomu-product-video)

**F2. Figma 입력 / 템플릿 기반 생성기**
- Figma: HyperFrames에는 전용 `figma` 스킬이 있고(skills/ 목록에서 확인), product-launch-video·motion-graphics·slideshow 모두 figma.com URL이면 `/figma`를 먼저 실행하라고 지시한다. 이유는 "Don't drive Figma via raw MCP tools directly: that skips SVG sanitization… and brand-token `var()` binding" — [product-launch-video SKILL.md](https://github.com/heygen-com/hyperframes/blob/main/skills/product-launch-video/SKILL.md). 쇼케이스로 `figma-launch`가 있다 — [hyperframes-launches](https://github.com/heygen-com/hyperframes-launches)
- 템플릿 기반: hyperframes-launches의 `heygen-apple-motion`("Re-brandable launch templates (×4)") — [repo](https://github.com/heygen-com/hyperframes-launches); lumian2015/opus-5-5-video-templates(템플릿 30종을 리브랜딩해 HyperFrames로 렌더) — [repo](https://github.com/lumian2015/opus-5-5-video-templates); opus-pro/opusclip-video-tools("editable launch video templates") — [repo](https://github.com/opus-pro/opusclip-video-tools); cliphouse 갤러리 템플릿 — [repo](https://github.com/sunmer/cliphouse); remotion-dev/template-prompt-to-video(프롬프트 → 이미지+보이스오버 스토리, 156★) — [repo](https://github.com/remotion-dev/template-prompt-to-video); iart-ai/ad-video-skills(템플릿 하나로 A/B용 광고 배치 생성) — [awesome list](https://github.com/zhuyansen/awesome-claude-video-skills)

**G. 영상 관련 MCP 서버·에이전트 편집기 (프로모 제작 보조)**
- KyaniteLabs/kinocut("Guardrailed video editing MCP server… FFmpeg, Hyperframes") — [repo](https://github.com/KyaniteLabs/kinocut); pireel/pireel("Drivable by any AI agent over MCP", AGPL-3.0) — [repo](https://github.com/pireel/pireel); 0xsline/OpenChatCut(Agent Skills + MCP + Remotion 기반 대화형 편집기) — [repo](https://github.com/0xsline/OpenChatCut); stephengpope/remotion-media-mcp(Remotion 프로젝트용 이미지·음악·SFX·음성·자막 생성 MCP) — [repo](https://github.com/stephengpope/remotion-media-mcp); DojoCodingLabs/remotion-superpowers(Claude Code 플러그인) — [repo](https://github.com/DojoCodingLabs/remotion-superpowers); moritzkremb/framejam(렌더된 프레임을 가리켜 수정 지시, HyperFrames/Remotion 대응) — [repo](https://github.com/moritzkremb/framejam); clueso-ai/clueso-mcp(상용 Clueso의 원격 MCP) — [repo](https://github.com/clueso-ai/clueso-mcp)

### Inferences
- "앱 홍보영상"이라는 요청은 실질적으로 두 갈래다. ① **모션그래픽 런치 필름**(UI를 HTML로 재구성하거나 스크린샷을 씬에 배치, 음악 비트 중심)은 B군, ② **실제 앱 조작 데모**(실제 픽셀, 줌·커서·VO)는 C군이 맡는다. chacha95, video-shotcraft, ultrademo처럼 둘을 섞어 "실제 캡처 + 모션 패키징"을 하는 도구가 늘고 있다.
- 에이전트 구동 표준은 사실상 **Agent Skills(SKILL.md) + `npx skills add` + Claude Code/Codex 플러그인 마켓플레이스**로 수렴했다. MCP는 브라우저 녹화처럼 상태가 있는 도구(cursorcam, aidemo, openvidstudio, pagecast)나 호스티드 서비스(cliphouse, clueso)에서 주로 쓰인다.
- 가장 인기 있는 녹화기(openscreen 39.9k★, Cap 23.4k★)는 GUI 전용이라 에이전트가 끝까지 구동할 수 없다. 에이전트가 "녹화 → 자동 줌 편집"을 맡기려면 screenstudio-alt-skill(헤드리스)이나 surajshetty·cursorcam·aidemo 같은 프레임 단위 합성 방식이 현실적인 대안이다.

### Gaps
- 검색 API 한도 때문에 `gh search repos --topic remotion --sort updated` 같은 토픽 정렬 검색은 실행하지 못했다. 발굴은 awesome list와 제한된 키워드 검색에 의존했다.
- B군 소형 스킬 다수(30x-video, launch-video-kit, spotlight 등)는 README를 직접 열지 않고 awesome list 설명만 인용했다.
- clueso-mcp, opus-pro/opusclip-video-tools 같은 상용 연동형 도구의 무료 범위는 확인하지 못했다.

## Q2. 저장소별 측정 수치 (★, 생성일, 마지막 push, 라이선스) — 2026-10-17 `gh api` 측정

### Takeaway
★ 기준 상위는 OpenMontage(68,970), HyperFrames(65,513), Remotion(64,642), openscreen(39,925), Cap(23,379), hypit(22,907), brag(16,385), video-shotcraft(12,231) 순이다. 앱 홍보영상에 **직접 특화된** 도구 가운데 최대는 brag와 video-shotcraft이고, 데모 녹화 계열은 대부분 수십~수백 ★ 수준이다.

### Cited Findings
아래 수치는 모두 2026-10-17에 `gh api repos/OWNER/REPO`로 측정했고, 출처는 각 행의 저장소 링크다.

**렌더 엔진·툴킷·쇼케이스**

| 저장소 | ★ | 생성 | 마지막 push | 라이선스 | 비고 |
|---|---:|---|---|---|---|
| [calesthio/OpenMontage](https://github.com/calesthio/OpenMontage) | 68,970 | 2026-03-29 | 2026-10-16 | AGPL-3.0 | 에이전트형 영상 제작 시스템 |
| [heygen-com/hyperframes](https://github.com/heygen-com/hyperframes) | 65,513 | 2026-03-10 | 2026-10-17 | Apache-2.0 | 포크 5,904 |
| [remotion-dev/remotion](https://github.com/remotion-dev/remotion) | 64,642 | 2020-06-23 | 2026-10-17 | 커스텀(NOASSERTION, Company License) | |
| [hypit-ai/hypit](https://github.com/hypit-ai/hypit) | 22,907 | 2026-07-29 | 2026-10-15 | 커스텀(NOASSERTION) | 바이럴 영상 복제(인접 범위) |
| [remotion-dev/skills](https://github.com/remotion-dev/skills) | 5,260 | 2026-01-19 | 2026-10-16 | 없음 | Remotion 공식 스킬 |
| [digitalsamba/claude-code-video-toolkit](https://github.com/digitalsamba/claude-code-video-toolkit) | 2,260 | 2025-12-09 | 2026-10-12 | MIT | |
| [vibe-motion/skills](https://github.com/vibe-motion/skills) | 1,367 | 2026-03-17 | 2026-10-05 | 없음 | |
| [remotion-dev/github-unwrapped](https://github.com/remotion-dev/github-unwrapped) | 1,329 | 2023-09-14 | 2026-07-06 | 없음 | 연말 결산 영상(코드→영상 선례) |
| [heygen-com/hyperframes-launches](https://github.com/heygen-com/hyperframes-launches) | 607 | 2026-04-22 | 2026-10-04 | Apache-2.0 | HeyGen 런치 영상 소스 |
| [remotion-dev/template-prompt-to-video](https://github.com/remotion-dev/template-prompt-to-video) | 156 | 2025-11-02 | 2026-10-16 | 없음 | Remotion 공식 템플릿 |
| [FavioVazquez/showtime](https://github.com/FavioVazquez/showtime) | 261 | 2026-09-28 | 2026-10-17 | MIT | 로컬 영상 스튜디오 |

**URL·저장소 → 런치/프로모 필름**

| 저장소 | ★ | 생성 | 마지막 push | 라이선스 | 엔진 |
|---|---:|---|---|---|---|
| [latent-spaces/brag](https://github.com/latent-spaces/brag) | 16,385 | 2026-06-16 | 2026-10-13 | MIT | HyperFrames / brag-slim(단일 HTML) |
| [Vincentwei1021/video-shotcraft](https://github.com/Vincentwei1021/video-shotcraft) | 12,231 | 2026-07-19 | 2026-10-16 | Apache-2.0 | Remotion |
| [lemomo-ai/lemo-opuscar](https://github.com/lemomo-ai/lemo-opuscar) | 2,772 | 2026-09-26 | 2026-10-17 | MIT | 코드 렌더 단편(인접) |
| [feitangyuan/onetake](https://github.com/feitangyuan/onetake) | 2,556 | 2026-09-26 | 2026-10-13 | 커스텀(NOASSERTION; 무료판 비상업) | HTML 측정 모션 |
| [echris6/motion-video-kit](https://github.com/echris6/motion-video-kit) | 1,127 | 2026-09-27 | 2026-10-14 | MIT | HTML/GSAP/Three.js |
| [iart-ai/motion-skills](https://github.com/iart-ai/motion-skills) | 855 | 2026-06-22 | 2026-10-14 | MIT | 모션그래픽 50종 |
| [op7418/guizang-product-video-skill](https://github.com/op7418/guizang-product-video-skill) | 820 | 2026-09-18 | 2026-10-09 | AGPL-3.0(별도 상용 라이선스) | 코드 렌더 |
| [Tejashmakwana/motionmaxxing](https://github.com/Tejashmakwana/motionmaxxing) | 805 | 2026-10-06 | 2026-10-06 | Apache-2.0 | 품질 개선 스킬 |
| [Barty-Bart/motion-graphics](https://github.com/Barty-Bart/motion-graphics) | 711 | 2026-09-25 | 2026-10-13 | 커스텀(NOASSERTION) | |
| [vincentsch/explainroo](https://github.com/vincentsch/explainroo) | 581 | 2026-09-25 | 2026-10-15 | MIT | 해설·제품 데모, Kokoro+Whisper |
| [howseen-ai/claude-motion-design](https://github.com/howseen-ai/claude-motion-design) | 557 | 2026-09-27 | 2026-10-04 | MIT | HTML+Playwright+ffmpeg |
| [geekjourneyx/hyperframes-motion-director](https://github.com/geekjourneyx/hyperframes-motion-director) | 462 | 2026-06-02 | 2026-07-26 | AGPL-3.0 | HyperFrames(중국어 우선) |
| [diggerhq/shipvideo](https://github.com/diggerhq/shipvideo) | 350 | 2026-09-24 | 2026-10-01 | 없음 | Opus 5.5 HTML + 서버리스 |
| [charlie947/motion-graphics-skills](https://github.com/charlie947/motion-graphics-skills) | 309 | 2026-09-26 | 2026-10-11 | MIT | |
| [AbubakrChan/product-launch-motion](https://github.com/AbubakrChan/product-launch-motion) | 300 | 2026-07-27 | 2026-10-15 | MIT | HTML spring + Playwright |
| [tugrawork-creator/saas-motion-kit](https://github.com/tugrawork-creator/saas-motion-kit) | 238 | 2026-09-25 | 2026-10-04 | 커스텀(NOASSERTION) | HyperFrames |
| [Finderchangchang/brewreel](https://github.com/Finderchangchang/brewreel) (구 promo-video-skill) | 170 | 2026-09-26 | 2026-10-12 | Apache-2.0 | 세로 프로모, 저가 모델 대상 |
| [Sunwood-ai-labs/hyperframes-motion-reel-skill](https://github.com/Sunwood-ai-labs/hyperframes-motion-reel-skill) | 137 | 2026-09-29 | 2026-09-29 | MIT | HyperFrames, 120BPM 비트 동기 |
| [bestagentkits/motion-video-skill](https://github.com/bestagentkits/motion-video-skill) | 121 | 2026-09-25 | 2026-09-28 | MIT | HyperFrames, VO+가라오케 자막 |
| [leosssvip-dot/remotion-ad-video-skill](https://github.com/leosssvip-dot/remotion-ad-video-skill) | 110 | 2026-05-19 | 2026-06-10 | MIT | URL → Remotion 광고 |
| [kangarooking/promo-creator-skills](https://github.com/kangarooking/promo-creator-skills) | 109 | 2026-05-11 | 2026-05-12 | MIT | HyperFrames(중국어) |
| [norahe0304-art/30x-video](https://github.com/norahe0304-art/30x-video) | 63 | 2026-05-07 | 2026-07-09 | MIT | Remotion |
| [EveryInc/product-launch-video](https://github.com/EveryInc/product-launch-video) | 62 | 2026-04-20 | 2026-04-20 | MIT | Remotion |
| [revfactory/showreel](https://github.com/revfactory/showreel) | 38 | 2026-10-08 | 2026-10-11 | MIT | 한국어 모션그래픽, ElevenLabs |
| [mattivilola/brag-codex](https://github.com/mattivilola/brag-codex) | 34 | 2026-06-23 | 2026-06-23 | MIT | brag 복제(Codex) |
| [AmazingAng/ccvideo](https://github.com/AmazingAng/ccvideo) | 20 | 2026-07-31 | 2026-07-31 | MIT | Remotion |
| [chacha95/demo-video-creator](https://github.com/chacha95/demo-video-creator) | 16 | 2026-10-07 | 2026-10-07 | MIT | 영/한 런치 필름 |
| [smit-vanani/claude-promo-video](https://github.com/smit-vanani/claude-promo-video) | 16 | 2026-07-15 | 2026-07-16 | MIT | Remotion |
| [per-simmons/launch-video-clone](https://github.com/per-simmons/launch-video-clone) | 15 | 2026-09-29 | 2026-09-29 | MIT | HyperFrames |
| [every-app/video-skills](https://github.com/every-app/video-skills) | 14 | 2026-10-15 | 2026-10-15 | MIT | |
| [AmirSbss/spotlight](https://github.com/AmirSbss/spotlight) | 12 | 2026-10-03 | 2026-10-12 | MIT | |
| [opus-pro/opusclip-video-tools](https://github.com/opus-pro/opusclip-video-tools) | 12 | 2026-09-10 | 2026-10-12 | 없음 | 상용 연동 |
| [timscheuerai/launch-video-kit](https://github.com/timscheuerai/launch-video-kit) | 7 | 2026-09-27 | 2026-09-27 | MIT | |
| [jammaru/launch-video-craft](https://github.com/jammaru/launch-video-craft) | 7 | 2026-10-10 | 2026-10-13 | MIT | Remotion |
| [hamen/app-promo-reel](https://github.com/hamen/app-promo-reel) | 6 | 2026-09-26 | 2026-10-16 | MIT | HyperFrames 9:16 |
| [farming-labs/product-film-skill](https://github.com/farming-labs/product-film-skill) | 6 | 2026-09-30 | 2026-10-07 | MIT | 단일 HTML → MP4 |
| [joeseesun/qiaomu-product-video](https://github.com/joeseesun/qiaomu-product-video) | 2 | 2026-09-27 | 2026-09-27 | MIT | 저장소 → 필름 |
| [shuxueshuxue/promo-skills](https://github.com/shuxueshuxue/promo-skills) | 2 | 2026-07-10 | 2026-10-15 | MIT | Remotion + Playwright/CDP |
| [samuelstroschein/opus-video-generator](https://github.com/samuelstroschein/opus-video-generator) | 2 | 2026-10-02 | 2026-10-02 | MIT | |
| [Mason-Levyy/product-launch-video](https://github.com/Mason-Levyy/product-launch-video) | 1 | 2026-09-29 | 2026-10-06 | MIT | 비트 동기 |
| [lumian2015/opus-5-5-video-templates](https://github.com/lumian2015/opus-5-5-video-templates) | 1 | 2026-10-01 | 2026-10-01 | MIT | 템플릿 30종 + HyperFrames |
| [IskakovDamir/apple-motion](https://github.com/IskakovDamir/apple-motion) | 14 | 2026-09-28 | 2026-09-29 | MIT | Remotion, Apple 스타일 키네틱 타이포 |
| [diko0071/remotion-video-skills](https://github.com/diko0071/remotion-video-skills) | 9 | 2026-09-06 | 2026-10-06 | MIT | Remotion 제품 영상 팩토리 |

**앱 조작·촬영 데모 / 녹화기 / 스토어 / PR / MCP**

| 저장소 | ★ | 생성 | 마지막 push | 라이선스 | 구동 |
|---|---:|---|---|---|---|
| [siddharthvaddem/openscreen](https://github.com/siddharthvaddem/openscreen) | 39,925 | 2025-10-10 | 2026-10-17 | MIT | GUI 전용 |
| [CapSoftware/Cap](https://github.com/CapSoftware/Cap) | 23,379 | 2023-11-17 | 2026-10-17 | 커스텀(NOASSERTION) | GUI |
| [simonw/shot-scraper](https://github.com/simonw/shot-scraper) | 2,596 | 2022-03-08 | 2026-10-14 | Apache-2.0 | CLI |
| [0xsline/OpenChatCut](https://github.com/0xsline/OpenChatCut) | 2,426 | 2026-07-15 | 2026-10-15 | AGPL-3.0 | Skills+MCP |
| [pireel/pireel](https://github.com/pireel/pireel) | 1,300 | 2026-07-20 | 2026-09-18 | AGPL-3.0 | MCP |
| [syi0808/screenize](https://github.com/syi0808/screenize) | 617 | 2026-01-21 | 2026-05-22 | Apache-2.0 | GUI(개발 중단) |
| [KyaniteLabs/kinocut](https://github.com/KyaniteLabs/kinocut) | 206 | 2026-03-21 | 2026-10-15 | Apache-2.0 | MCP+CLI |
| [DojoCodingLabs/remotion-superpowers](https://github.com/DojoCodingLabs/remotion-superpowers) | 136 | 2026-02-09 | 2026-10-03 | MIT | 플러그인 |
| [greentfrapp/testreel](https://github.com/greentfrapp/testreel) | 97 | 2026-03-15 | 2026-04-07 | MIT | CLI/라이브러리 |
| [ThePatriczek/playwright-recast](https://github.com/ThePatriczek/playwright-recast) | 65 | 2026-03-25 | 2026-10-04 | MIT | 라이브러리+플러그인+MCP |
| [Avijit07x/cursorcam](https://github.com/Avijit07x/cursorcam) | 57 | 2026-10-09 | 2026-10-16 | Apache-2.0 | 플러그인+MCP+CLI |
| [trunghaiy/appshot](https://github.com/trunghaiy/appshot) | 48 | 2026-05-19 | 2026-06-06 | MIT | 스킬(Remotion) |
| [mcpware/pagecast](https://github.com/mcpware/pagecast) | 48 | 2026-03-20 | 2026-03-27 | MIT | MCP |
| [moritzkremb/framejam](https://github.com/moritzkremb/framejam) | 47 | 2026-10-01 | 2026-10-16 | MIT | |
| [shreyaskarnik/argo](https://github.com/shreyaskarnik/argo) | 46 | 2026-03-13 | 2026-09-15 | MIT | CLI |
| [AlemTuzlak/skills](https://github.com/AlemTuzlak/skills) | 42 | 2026-04-11 | 2026-09-22 | 없음 | 스킬(PR → 영상) |
| [crimeacs/product-demo-director](https://github.com/crimeacs/product-demo-director) | 35 | 2026-07-23 | 2026-09-27 | MIT | 스킬+CLI |
| [new-xp/ultrademo](https://github.com/new-xp/ultrademo) | 34 | 2026-07-08 | 2026-07-10 | Apache-2.0 | 스킬 |
| [stephengpope/remotion-media-mcp](https://github.com/stephengpope/remotion-media-mcp) | 34 | 2026-01-24 | 2026-02-25 | 없음 | MCP |
| [btahir/reelbird](https://github.com/btahir/reelbird) | 31 | 2026-10-13 | 2026-10-13 | MIT | GUI |
| [gorkem-bwl/onboarding-video-generator](https://github.com/gorkem-bwl/onboarding-video-generator) | 31 | 2026-05-10 | 2026-05-10 | MIT | 스킬(Remotion) |
| [AnayDhawan/openvidstudio](https://github.com/AnayDhawan/openvidstudio) | 29 | 2026-09-02 | 2026-10-17 | Apache-2.0 | MCP |
| [Kminer2053/demo-video-skill](https://github.com/Kminer2053/demo-video-skill) | 23 | 2026-07-06 | 2026-07-30 | MIT | 스킬(한국어) |
| [Co-Messi/supercut](https://github.com/Co-Messi/supercut) | 22 | 2026-06-11 | 2026-10-10 | MIT | CLI+스킬 |
| [derrickgong87/demo-video-creation-skill](https://github.com/derrickgong87/demo-video-creation-skill) | 20 | 2026-07-01 | 2026-07-01 | MIT | Codex 스킬 |
| [tandryukha/aidemo](https://github.com/tandryukha/aidemo) | 16 | 2026-07-06 | 2026-10-17 | MIT | 플러그인+MCP+CLI+Action |
| [45ck/demo-machine](https://github.com/45ck/demo-machine) | 13 | 2026-02-14 | 2026-07-16 | MIT | YAML CLI |
| [clueso-ai/clueso-mcp](https://github.com/clueso-ai/clueso-mcp) | 13 | 2026-06-27 | 2026-08-21 | MIT | 원격 MCP |
| [connerkward/screenstudio-alt-skill](https://github.com/connerkward/screenstudio-alt-skill) | 11 | 2026-06-11 | 2026-06-23 | MIT | 헤드리스 스킬 |
| [tonhaoln/retake](https://github.com/tonhaoln/retake) | 9 | 2026-08-06 | 2026-09-04 | MIT | GUI |
| [mrieck/demoday-claude-plugin](https://github.com/mrieck/demoday-claude-plugin) | 7 | 2026-08-04 | 2026-09-15 | MIT | 플러그인 |
| [hub-ki/video-generation](https://github.com/hub-ki/video-generation) | 6 | 2026-08-23 | 2026-08-23 | MIT | 스킬 |
| [Anshgrover23/product-demo-playbook](https://github.com/Anshgrover23/product-demo-playbook) | 6 | 2026-08-19 | 2026-10-08 | 없음 | 스킬 |
| [surajshetty3416/demo-video-skill](https://github.com/surajshetty3416/demo-video-skill) | 5 | 2026-07-15 | 2026-08-21 | MIT | 스킬(Python) |
| [Karnaf0katom/taskfilm](https://github.com/Karnaf0katom/taskfilm) | 5 | 2026-10-07 | 2026-10-16 | MIT | CLI+스킬 |
| [yusuftuhh/mockup-studio](https://github.com/yusuftuhh/mockup-studio) | 5 | 2026-04-02 | 2026-05-24 | MIT | GUI(3D 목업) |
| [Fran-cois/demodsl](https://github.com/Fran-cois/demodsl) | 3 | 2026-03-27 | 2026-10-09 | 커스텀(NOASSERTION) | YAML DSL |
| [prashantGit24/ZoomArc](https://github.com/prashantGit24/ZoomArc) | 2 | 2026-09-19 | 2026-10-16 | 커스텀(NOASSERTION) | GUI(Windows) |
| [betyourluck/AppPromoVideo](https://github.com/betyourluck/AppPromoVideo) | 2 | 2026-09-07 | 2026-10-15 | MIT | 프롬프트 생성 |
| [sunmer/cliphouse](https://github.com/sunmer/cliphouse) | 1 | 2026-10-14 | 2026-10-16 | MIT-0 | 스킬+호스티드 MCP |
| [imamhossain94/promo-app](https://github.com/imamhossain94/promo-app) | 1 | 2026-09-02 | 2026-09-29 | 커스텀(NOASSERTION) | 브라우저 앱 |
| [Eddiegah/truedemo](https://github.com/Eddiegah/truedemo) | 1 | 2026-08-20 | 2026-08-23 | MIT | |

- **복제 클러스터 (하나의 원본으로 묶어야 함)**: "152 shot recipe cards" 계열은 원본 Vincentwei1021/video-shotcraft(12,231★)에서 나왔다. JohnChow90/video-shotcraft는 설명에 "(originally by Vincentwei1021)"라고 명시하고, syklayou-glitch/video-shotcraft(8★), kiki-lgtm-dot/cinematic-product-promo-skill(14★), dlazy-ai/ai-product-video(21★), kingselyjoe/video-shotcraft-dsh, ChenShuo2004/cs-shotcraft-skill도 같은 "152 shot recipe cards"를 내세운다 — 측정치와 [awesome-claude-video-skills](https://github.com/zhuyansen/awesome-claude-video-skills). 또한 brag → mattivilola/brag-codex("Codex-compatible clone of latent-spaces/brag"), AbubakrChan/product-launch-motion → Clairvoyant-fenestration570/product-launch-motion(3★, 같은 이름)도 복제 관계다.
- **제외**: bytebear3955-gndzk/changelog-to-video는 52★이지만 저장소 크기 4KB에 설명이 없고 생성일과 push일이 같다(2026-07-30). 내용 없는 저장소에 별만 있는 패턴이라 목록에서 뺐다 — [repo](https://github.com/bytebear3955-gndzk/changelog-to-video)

### Inferences
- 라이선스 측면에서 상업적 앱 홍보에 바로 쓰기 쉬운 것은 HyperFrames(Apache-2.0)와 MIT/Apache 스킬 대부분이다. Remotion 기반 스킬(video-shotcraft, appshot, ultrademo, openvidstudio 등)은 **직원 4명 이상 회사라면 Remotion Company License가 필요**하다. onetake(무료판 비상업), guizang(AGPL + 상용 별도), OpenMontage(AGPL)도 회사가 쓸 때 주의해야 한다.

### Gaps
- `NOASSERTION` 저장소(Cap, hypit, saas-motion-kit, Barty-Bart, demodsl, ZoomArc, promo-app)의 LICENSE 원문은 열어보지 않았다. onetake만 사이트에서 무료판이 비상업 조건임을 확인했다.
- kingselyjoe, ChenShuo2004, JohnChow90 클론의 ★는 이번에 측정하지 않았다(awesome list 표기만 있음).

## Q3. 2026-08~10에 새로 나왔거나 빠르게 성장한 것, 쇼케이스가 설득력 있는 것

### Takeaway
2026-09-18~10-15 사이에 생성된 영상 스킬이 폭발적으로 늘었고, 특히 **09-24~09-30 주간**에 onetake·motion-video-kit·explainroo·charlie947·saas-motion-kit·lemo-opuscar·shipvideo 등이 한꺼번에 등장했다. 6일 증가폭(10-11 → 10-17)은 HyperFrames +5,222, OpenMontage +4,731, hypit +2,108, onetake +476, remotion-dev/skills +255, iart-ai +245 순이다. 쇼케이스가 확실히 확인되는 것은 hyperframes-launches(20편 중 17편에 공개 영상), brag(재생 가능한 20초 예시 6편), product-launch-motion(1080p60 MP4 릴리스), chacha95(영/한 데모 mp4), aidemo(51초 실제 출력), appshot(App Store 실제 사용)이다.

### Cited Findings
- **6일 증가 측정**: awesome list의 "Tested end to end" 표(2026-10-11 실행)에 적힌 ★와 오늘(10-17) 측정치를 비교했다. 기준값은 이 표만 사용했다(같은 README의 다른 섹션은 시점이 섞여 있어 제외).

  | 저장소 | 10-11 표기 | 10-17 측정 | 증가 |
  |---|---:|---:|---:|
  | heygen-com/hyperframes | 60,291 | 65,513 | +5,222 |
  | calesthio/OpenMontage | 64,239 | 68,970 | +4,731 |
  | hypit-ai/hypit | 20,799 | 22,907 | +2,108 |
  | feitangyuan/onetake | 2,080 | 2,556 | +476 |
  | remotion-dev/skills | 5,005 | 5,260 | +255 |
  | iart-ai/motion-skills | 610 | 855 | +245 |
  | howseen-ai/claude-motion-design | 408 | 557 | +149 |
  | charlie947/motion-graphics-skills | 174 | 309 | +135 |
  | Barty-Bart/motion-graphics | 580 | 711 | +131 |
  | digitalsamba/claude-code-video-toolkit | 2,198 | 2,260 | +62 |
  | vincentsch/explainroo | 523 | 581 | +58 |
  | op7418/guizang-product-video-skill | 762 | 820 | +58 |
  | echris6/motion-video-kit | 1,080 | 1,127 | +47 |
  | vibe-motion/skills | 1,315 | 1,367 | +52 |
  | wshuyi/remotion-video-skill | 394 | 416 | +22 |

  출처: 10-11 값 — [awesome-claude-video-skills "Tested end to end"](https://github.com/zhuyansen/awesome-claude-video-skills), 10-17 값 — 각 저장소 `gh api` 측정. 주의: README에는 ★ 열을 언제 찍었는지 적혀 있지 않다(10-11은 테스트 실행일). 다만 Wireflow의 10-14 HyperFrames 수치(62,751)가 60,291과 65,513 사이에 거의 선형으로 놓여 있어 시점이 대략 맞음을 뒷받침한다.
- 추가 시점 데이터: 2026-10-14 기준 HyperFrames 62,751★, Remotion 63,869★ — [Wireflow](https://www.wireflow.ai/blog/hyperframes-vs-remotion). 오늘 측정치(65,513 / 64,642)와 비교하면 3일간 HyperFrames는 +2,762, Remotion은 +773이다.
- guizang-product-video-skill은 기사 작성 시점(2026-09-24 무렵) 261★, 포크 23개였다 — [OrcaRouter](https://www.orcarouter.ai/blog/claude-opus-5-5-product-video-skill). 오늘은 820★이다.
- **2026-08~10 생성 + 높은 ★** (생성일·★ 측정): lemo-opuscar 2,772(09-26), onetake 2,556(09-26), motion-video-kit 1,127(09-27), guizang 820(09-18), motionmaxxing 805(10-06), Barty-Bart 711(09-25), explainroo 581(09-25), claude-motion-design 557(09-27), shipvideo 350(09-24), charlie947 309(09-26), showtime 261(09-28), saas-motion-kit 238(09-25), brewreel 170(09-26), Sunwood 137(09-29), bestagentkits 121(09-25), cursorcam 57(10-09), framejam 47(10-01), revfactory/showreel 38(10-08), reelbird 31(10-13). 07월 생성이지만 이 기간에 대형화한 것: video-shotcraft 12,231(07-19), hypit 22,907(07-29), OpenChatCut 2,426(07-15), pireel 1,300(07-20). brag 16,385는 06-16 생성 — 각 저장소 측정
- 같은 시기에 생성되거나 갱신된 저장소들이 Opus 5.5를 명시한다: brag-slim은 "rebuilt lean for Opus 5.5" — [brag](https://github.com/latent-spaces/brag); product-launch-motion v2는 "Use it with Claude Opus 5.5 to get results like these films" — [product-launch-motion](https://github.com/AbubakrChan/product-launch-motion); lemo-opuscar(09-26 생성)는 "a demo film made entirely in code by Claude Opus 5.5" — [lemo-opuscar](https://github.com/lemomo-ai/lemo-opuscar); shipvideo(09-24 생성)는 "Opus 5.5 writes HTML, an OpenComputer serverless agent renders it" — [shipvideo](https://github.com/diggerhq/shipvideo)
- **에이전트가 이미 잘한다는 근거(블라인드 실측)**: 2026-10-11에 16개 스킬과 "스킬 없는 Claude Code"가 같은 15초 가상 앱 프로모(1920×1080, 30fps, 고정 카피 5줄, 영상·이미지·음성 모델 API 키 없음)를 만들었다. 16개 전부와 스킬 없는 Claude Code(4.4분)가 4개 검사(재생, 길이·크기, 카피 5줄 판독, 움직임)를 통과했다. 소요 시간은 2.0분(explainroo)부터 23.5분(hyperframes)까지였고, 16개 중 9개가 사운드를 넣었으며, 눈으로 볼 때 10개는 고유한 룩, 6개는 스킬 없는 영상과 비슷한 룩이었다 — [awesome-claude-video-skills](https://github.com/zhuyansen/awesome-claude-video-skills)
- 같은 목록의 권고: 빠른 완성은 explainroo, 하나의 아이디어로 이어지는 필름은 onetake, Remotion에서 직접 디자인하려면 remotion-dev/skills. 단 "you may not need one for a simple promo" — [awesome-claude-video-skills](https://github.com/zhuyansen/awesome-claude-video-skills)
- **쇼케이스 확인 결과**
  - heygen-com/hyperframes-launches: README 표 20편 중 17편에 공개 영상 링크가 있다(hyperframes.dev 뷰어 15편, 저장소 내 MP4 2편, 링크 없음 3편). PR-to-video launch와 Website → HyperFrames demo가 포함된다 — [README](https://github.com/heygen-com/hyperframes-launches)
  - brag 사이트: 재생 가능한 20초 예시 6편(가상 제품 3개 × brag-slim/--full 버전). 사이트 우상단 루프 영상도 `/brag`로 만들었다 — [latent-spaces.github.io/brag](https://latent-spaces.github.io/brag/)
  - onetake 사이트: 재생 가능한 예시는 15초 "Clearing"(캘린더 앱) 1편이 확인된다. 무료판은 비상업 전용이고 Pro는 $79(소스 파일·스타터 5종·상업 라이선스 포함) — [onetakemotion.com](https://onetakemotion.com)
  - product-launch-motion: cheerful.ai용 30초 1080p60 필름 MP4와 WebGL glass 버전을 GitHub Release로 배포한다 — [README](https://github.com/AbubakrChan/product-launch-motion)
  - chacha95/demo-video-creator: Evals용 영어 40초·한국어 45초 데모 mp4가 저장소에 있다 — [README](https://github.com/chacha95/demo-video-creator)
  - aidemo: 위키백과 투어 51초 실제 출력 MP4(v0.3.0 릴리스) — [README](https://github.com/tandryukha/aidemo); ultrademo: 90초 Notion 튜토리얼 — [README](https://github.com/new-xp/ultrademo); playwright-recast: Neo4j 쇼케이스 YouTube — [README](https://github.com/ThePatriczek/playwright-recast)
  - appshot: App Store 앱 BookStreak의 미리보기 영상과 스크린샷을 "generated entirely with Appshot" — [README](https://github.com/trunghaiy/appshot)
  - video-shotcraft: README는 150샷 갤러리를 내세우지만, 커뮤니티 쇼케이스 페이지에는 "No submissions yet"으로 나온다(2026-10-17) — [showcase.html](https://vincentwei1021.github.io/video-shotcraft/showcase.html)
  - guizang: README의 영상 자리에 아직 플레이스홀더 주석만 있다("在这里粘贴…视频附件地址") — [README](https://github.com/op7418/guizang-product-video-skill)
  - cliphouse: 31초 데모가 있지만 "Some steps in it are coming soon" — [README](https://github.com/sunmer/cliphouse)

### Inferences
- 09-24~09-30에 생성이 몰린 시기는 README·설명에서 Opus 5.5를 명시한 저장소들(shipvideo, lemo-opuscar, brag-slim, product-launch-motion v2)이 나온 시기와 겹친다. shipvideo README도 "Opus 5.5 is incredible at instructional video generation" 데모를 언급한다. "모델이 HTML/코드로 필름을 쓰고 headless 브라우저 + ffmpeg로 렌더한다"는 방식이 이때 확산된 것으로 보이지만 인과는 추정이다.
- ★ 성장의 절대량은 프레임워크(HyperFrames, OpenMontage, hypit)에 몰려 있다. 앱 홍보에 특화된 스킬 중에서는 onetake가 가장 가파르다(6일 +476).
- 쇼케이스 품질은 "릴리스로 내려받을 수 있는 1080p 영상"(product-launch-motion, chacha95, aidemo)이 README GIF보다 신뢰도가 높다. 사이트에 있다는 갤러리는 직접 열어보면 비어 있기도 하다(video-shotcraft 커뮤니티 쇼케이스).

### Gaps
- Opus 5.5의 정확한 출시일은 [확인 필요]다. 웹 검색 요약에 "September 22, 2026"이 나왔지만 이를 뒷받침하는 단일 원문 URL은 확인하지 못했다(OrcaRouter 기사의 09-22는 guizang의 마지막 커밋 날짜였다).
- **스타 히스토리 측정 불가**: `gh api -H "Accept: application/vnd.github.star+json" repos/OWNER/REPO/stargazers`가 2026-10-17에 모든 저장소에서 HTTP 404를 반환했다(rate limit 문제 아님, core 잔여 약 4,000). 그래서 08-01 이후 증가량은 직접 잴 수 없었고, 10-11 표와 10-14 기사 수치로만 단기 증가를 계산했다.
- 쇼케이스 영상은 실제로 재생해 품질을 평가하지 않았다. 존재 여부만 확인했다.
- X/Twitter의 "Claude Code로 앱 홍보영상 만들었다" 류 바이럴 포스트는 검색으로 확보하지 못했다.

## Q4. 최고 도구들의 엔드투엔드 워크플로와 자동화된 품질 기법

### Takeaway
상위 도구들의 공통 파이프라인은 **캡처(실제 페이지·앱·PR) → 브랜드 토큰·디자인 시스템 → 스토리보드/스크립트(사람 승인 게이트) → TTS·BGM·SFX → 씬/프레임 단위 빌드(서브에이전트 병렬) → 자막 → 전환 주입 → 린트·스냅샷 contact sheet로 자가 검수 → 렌더**다. 품질 기법은 자동 줌·커서 스무딩·클릭 리플·idle 압축(녹화형), 기기·브라우저 프레임(스토어/웹), 비트·음악 우선 타이밍, 모션 블러, 연속성·라우드니스·정지 프레임을 기계로 측정하는 오라클(런치 필름형)로 나뉜다.

### Cited Findings
- **HyperFrames product-launch-video**: Step 0 설정(`hyperframes.json`, `BRIEF.md`) → Step 1 `npx hyperframes capture "<URL>" -o ./capture --json`(스크린샷·DOM·토큰·자산, 비전 키가 있으면 자산 자동 캡션) → Step 2 프리셋을 브랜드 토큰에 리믹스해 `frame.md`와 캡션 스킨 생성 → Step 3 `STORYBOARD.md`/`SCRIPT.md`(승인 게이트) → Step 3.1 TTS/BGM/SFX(HeyGen 또는 오프라인 Kokoro) → Step 4 시간 코드가 붙은 샷 시퀀스와 프레임 간 `handoff_out/in` 수치 → Step 5 프레임당 서브에이전트 1개로 `compositions/frames/NN-*.html` 생성, 캡션, `assemble-index` → Step 6 전환 주입·검증, 음성 아래 BGM 스펙트럼 카브(`carve.mjs`), `lint`/`check`/`snapshot`(컷 전후 프레임 비교) → 사용자 승인 → `render --quality high` — [product-launch-video SKILL.md](https://github.com/heygen-com/hyperframes/blob/main/skills/product-launch-video/SKILL.md)
- **cursorcam**: 에이전트가 앱 탐색 → 단계(JSON) 작성 → 숨긴 브라우저로 녹화(클릭마다 줌) → 스틸 확인 → 수정. 로그인·2FA는 사용자에게 묻고 저장하지 않는다 — [cursorcam](https://github.com/Avijit07x/cursorcam)
- **aidemo**: `storyboard.json` → 실제 Chrome deterministic replay → 보이스오버 → 동기 자막 → 자동 줌 → dead time 트림. 결정적이라서 CI에서 다시 렌더할 수 있고 "about $0 a render"라고 한다 — [aidemo](https://github.com/tandryukha/aidemo)
- **supercut**: analyze(money moments) → script(recipe, "no invented selectors") → record → render. 단계마다 JSON 산출물이 있어 중간에 손으로 고치고 재개할 수 있다. 에이전트 모드에서는 결과 contact sheet를 보고 보고한다 — [supercut](https://github.com/Co-Messi/supercut)
- **playwright-recast**: trace → `.speedUp({ duringIdle: 3.0, duringUserAction: 1.0 })` → SRT 자막 → ElevenLabs 보이스오버(normalize) → 1080p MP4 — [playwright-recast](https://github.com/ThePatriczek/playwright-recast)
- **surajshetty demo-video-skill**: 실시간 녹화 대신 프레임 단위 스텝 캡처 → 컴포지터의 가상 카메라(초점+줌) → "ScreenStudio look"(그라디언트 배경, 둥근 패널+그림자, 벡터 커서, 클릭 펄스 링, eased zoom/pan), `HD=1` 레티나 재렌더 — [demo-video-skill](https://github.com/surajshetty3416/demo-video-skill)
- **screenstudio-alt-skill**: 원본 녹화를 받아 클릭·타이핑 자동 줌(원본 프레임을 재샘플링해 선명도 유지), idle 가속(재생 중인 애니메이션은 가속하지 않음), 키스트로크 칩, 스무딩 커서·클릭 리플·클릭 사운드, 명암 자동 전환 콜아웃, 동작을 따라가는 9:16, FCPXML, BPM beat-cut — [screenstudio-alt-skill](https://github.com/connerkward/screenstudio-alt-skill)
- **openscreen(GUI)**: 커서 추적 자동 줌, 커서 경로 스무딩, 기기 내 자동 자막, 모션 블러, 주석 텍스트 애니메이션 프리셋, 다중 비율 내보내기 — [openscreen](https://github.com/siddharthvaddem/openscreen)
- **testreel**: 애니메이션 커서(클릭 리플), macOS 창 크롬, 패딩·둥근 모서리·그라디언트 배경, 다양한 인증 방식(Supabase 포함) — [testreel](https://github.com/greentfrapp/testreel)
- **product-launch-motion v2**: "One shape, never cut"(하나의 요소가 11개 UI 상태로 모핑), 커서가 모든 클릭·드래그 수행, 음악 우선 타이밍("every click, whoosh and number roll lands on a drum hit"), Playwright 서브프레임 + ffmpeg 모션 블러, 마지막 프레임 = 첫 프레임 루프 — [product-launch-motion](https://github.com/AbubakrChan/product-launch-motion)
- **onetake**: 경계마다 무언가가 살아남아 다음 비트가 되는 "carry", 핸드헬드형 단일 카메라, `probe.py` 오라클이 연속성 점수 외에 균일한 컷 리듬·정지 없음·클리핑 오디오·모션 블러 없는 빠른 움직임·프레임 이탈 피사체를 불합격 처리 — [onetake](https://github.com/feitangyuan/onetake)
- **motion-video-kit**: 빌더 ≠ 심사자인 독립 비평 루프, 정지 시간·라우드니스·대비·브랜드 색 측정, 실제 음악의 끝이 엔드 카드에 맞도록 역산하는 타이밍, 결정적 누적 모션 블러 — [motion-video-kit](https://github.com/echris6/motion-video-kit)
- **chacha95**: 하나로 이어지는 VO, 비트 고정 모션, 임팩트 FX, −14 LUFS 마스터링 — [demo-video-creator](https://github.com/chacha95/demo-video-creator)
- **saas-motion-kit**: variety audit(스토리보드 반복 탐지, GitHub Action), 레퍼런스 영상의 하드컷·리듬 측정(`breakdown.py`), 레퍼런스 출처 표기 강제 — [saas-motion-kit](https://github.com/tugrawork-creator/saas-motion-kit)
- **video-shotcraft**: 실제 페이지 캡처 → 샷 레시피 선택 → 스토리보드 → Remotion 애니메이션 → 비트 컷 → 사운드 디자인 → 전 프레임 점검 → MP4. 납품 뒤 브라우저 편집기와 JianYing 드래프트(샷별 클립, 네이티브 자막 트랙, SFX/BGM 분리)로 이어서 편집할 수 있다 — [video-shotcraft](https://github.com/Vincentwei1021/video-shotcraft)
- **guizang**: 원래 제품 컴포넌트와 데모 상태를 우선 재사용하고, 배경음악을 코드로 작곡하고, 조작별 효과음을 넣고, 핵심 효과음이 날 때 음악을 덕킹한다. 커밋 로그를 그대로 읽지 않고 시청자가 이해할 수 있는 셀링 포인트로 다시 쓴다 — [guizang](https://github.com/op7418/guizang-product-video-skill)
- **appshot(스토어)**: 코드베이스에서 브랜드·아이콘·스토어 메타데이터 자동 추출, iPhone/Pixel 기기 프레임과 스토어 배지 교체, 웹은 Chrome형 브라우저 목업 + 애니메이션 커서 — [appshot](https://github.com/trunghaiy/appshot)
- **Kminer2053(한국어)**: 자막바·기능 라벨·가짜 커서·줌을 코드로 굽고, AI 응답 대기 구간을 자동 압축 — [demo-video-skill](https://github.com/Kminer2053/demo-video-skill)

### Inferences
- 품질 기법 → 대표 도구 대응표(위 인용 종합):

  | 기법 | 자동화한 도구 |
  |---|---|
  | 클릭/커서 자동 줌 | cursorcam, aidemo, screenstudio-alt-skill, surajshetty, openscreen(GUI), playwright-recast |
  | 커서 스무딩·클릭 리플/사운드 | screenstudio-alt-skill, testreel, surajshetty, openscreen |
  | idle/대기 압축 | aidemo, playwright-recast, screenstudio-alt-skill, Kminer2053 |
  | 기기·창·브라우저 프레임 | appshot(iPhone/Pixel), testreel(macOS 크롬), surajshetty(둥근 패널), appshot 웹(Chrome 목업) |
  | 키네틱 타이포·모션 문법 | HyperFrames motion-graphics/블루프린트, onetake, product-launch-motion, saas-motion-kit, IskakovDamir/apple-motion |
  | 비트·음악 동기 | product-launch-motion(music-first), chacha95, video-shotcraft, Sunwood(120BPM), screenstudio-alt(BPM beat-cut), hamen/app-promo-reel |
  | 모션 블러 | product-launch-motion(ffmpeg), motion-video-kit(누적), openscreen, supercut |
  | 음성 아래 BGM 덕킹/카브 | HyperFrames carve.mjs, guizang |
  | 자가 검수(스틸/contact sheet/오라클) | HyperFrames snapshot, cursorcam, supercut, onetake probe.py, motion-video-kit 비평 루프 |
  | CI 재렌더(제품 변경 시 자동 갱신) | aidemo(Action), playwright-recast(테스트 trace) |
- 데모 녹화형에서 품질을 가르는 차이는 "실시간 녹화"가 아니라 **결정적 재생 + 사후 가상 카메라**라는 점이다(surajshetty, aidemo, cursorcam). 이렇게 하면 수정할 때 다시 녹화하지 않고 JSON만 고쳐 재렌더하면 된다.
- 런치 필름형 상위 도구는 미감을 프롬프트에 맡기지 않고 **측정 가능한 규칙과 오라클**(연속성 점수, LUFS, 정지 프레임, 반복 감사)로 강제한다. 이것이 "AI 티 나는 슬라이드쇼"를 피하는 핵심 장치로 보인다.

### Gaps
- 각 도구가 주장하는 품질 지표(예: onetake carry 0.83)를 독립적으로 재현·검증한 자료는 없다.
- 렌더 시간·비용은 awesome list 실측(15초 프로모 기준)과 shipvideo(약 4분, 약 100k 토큰) 외에는 확인하지 못했다.

## Q5. heygen-com/hyperframes 스킬 4종(product-launch-video, pr-to-video, motion-graphics, slideshow)의 입력·단계·출력

### Takeaway
4종 모두 `/hyperframes` 라우터를 정문으로 쓰고 `BRIEF.md`(의도 계층)를 전제로 한다. **product-launch-video**는 URL/스크립트/브리프를 받아 캡처 → 디자인 시스템 → 스토리보드·VO → 프레임별 서브에이전트 빌드 → `renders/video.mp4`를 만드는 정식 앱 홍보영상 워크플로다. **pr-to-video**는 캡처 없이 `gh`로 PR diff를 읽어 code-editorial 스타일 해설 영상을 만든다. **motion-graphics**는 10초 안팎의 무내레이션 단편(웹페이지/UI 애니메이션 카테고리 포함)을 자율적으로 만든다. **slideshow**는 MP4가 아니라 탐색 가능한 덱을 만들며, SKILL.md가 MP4 렌더를 명시적으로 금지하므로 프로모 영상 도구가 아니다.

### Cited Findings
(2026-10-17 기본 브랜치 `main`에서 `gh api repos/heygen-com/hyperframes/contents/skills/<name>/SKILL.md`로 가져옴. SKILL.md 마지막 수정 커밋: product-launch-video와 pr-to-video 2026-10-14, motion-graphics 2026-10-13, slideshow 2026-10-04)

**product-launch-video** — [SKILL.md](https://github.com/heygen-com/hyperframes/blob/main/skills/product-launch-video/SKILL.md)
- 입력: "product or marketing URL, pasted script, or brief" — SaaS 프로모, 기능 공개, 제품 데모, 앱·회사 런치. "the default for any commercial URL"이고 사이트 투어도 여기로 온다. figma.com URL이면 `/figma`를 먼저 실행한다.
- 단계와 산출물: Step 0 설정(`npx hyperframes init … --skill=product-launch-video`, `BRIEF.md`, `auth status`로 HeyGen/로컬 엔진 표시) → Step 1 캡처(`npx hyperframes capture`; 실패하거나 `BLOCKED.md`가 생기면 즉시 중단하고 합성 대체물을 만들지 않음; 사이트 투어는 실제 스크린샷이 시각적 정본이며 스크롤 샷은 `full-page.png` 위로 뷰포트를 이동) → Step 2 `build-frame.mjs --preset`(프리셋을 브랜드 색·폰트로 리믹스해 `frame.md`와 캡션 스킨 생성) → Step 3 `STORYBOARD.md`/`SCRIPT.md`(협업 모드는 승인 게이트, 자율 모드는 알림 후 진행) → Step 3.1 `audio.mjs`(TTS 기본 HeyGen Marcia / 오프라인 Kokoro `am_michael`, 단어 타이밍, HeyGen 음악 라이브러리 BGM, `music: none`이면 무음) → Step 4 시간 코드 샷 시퀀스, `## Video direction`, `npx hyperframes catalog --query`로 약 400개 레지스트리 블록 검색 후 재사용, 프레임 간 handoff 수치 → Step 5 듀레이션 동기화·SFX, 블록 사전 설치, `frame-packets.mjs`, 프레임당 서브에이전트 병렬 빌드, `captions.mjs`, `assemble-index.mjs` → Step 6 `transitions.mjs inject/verify`, 음성 아래 BGM 카브(`carve.mjs`), `lint`·`check`·`snapshot`(컷 −0.1s/+0.2s 비교) → 프리뷰 승인 → `npx hyperframes render --quality high --output renders/video.mp4`.
- 출력: `renders/video.mp4`(가로 1920×1080, 세로 1080×1920, 정사각 1080×1080 중 목적지에 맞춰 선택), contact sheet, 프레임 ID. 최종 응답에 MP4 경로와 길이를 적는다.

**pr-to-video** — [SKILL.md](https://github.com/heygen-com/hyperframes/blob/main/skills/pr-to-video/SKILL.md)
- 입력: "a PR URL, owner/repo#N, or 'this PR' in a checked-out repo". 제품 프로모(→ product-launch-video)나 PR 없는 주제 해설(→ faceless-explainer)과 구분한다. "there is no capture step and no real assets beyond the contributors' avatars."
- 단계: Step 0 외부 캐시 `PROJECT_DIR`을 확정한다(호출 저장소에 `videos/`를 만들지 않음, `preflight.mjs`). Step 1 `fetch-pr.mjs`(gh, 100개 넘는 파일도 페이지네이션, MERGED PR이면 `shipped_version` 추정) → `ingest.mjs`(tokens/visible-text/people.json) → `fetch-people-avatars.mjs`. Step 2 스타일은 **code-editorial 고정**(묻지 않음). Step 3 아키타입(changelog / feature-reveal / fix-explainer / refactor-walkthrough), 실제 diff hunk 2–4개, diff 파일 순서가 아니라 서사 순서로 구성하고 마지막은 credits. Step 4 코드 비트마다 `code-*` 블록(diff → `code-diff`, 리팩터 → `code-morph`, 새 코드 → `code-typing`)을 focal로 두고 12줄 이하 `### Source excerpt`를 첨부한다(워커는 전체 diff를 다시 열 수 없음). Step 5–6은 product-launch-video와 같다(프레임 워커, 자막, 전환, lint/check/snapshot, 승인, 렌더).
- 출력: `renders/video.mp4`. 최종 응답에 경로와 길이를 적는다. 런치 쇼케이스로 "PR-to-video launch" 영상이 있다 — [hyperframes-launches](https://github.com/heygen-com/hyperframes-launches)

**motion-graphics** — [SKILL.md](https://github.com/heygen-com/hyperframes/blob/main/skills/motion-graphics/SKILL.md)
- 입력: 짧고 디자인 중심인 모션그래픽("Usually under 10s (up to ~30s), no narration"). 카테고리는 두 갈래다. 폼형(검색 없음): `kinetic-type`, `stat`, `charts`, `logo-reveal`, `lower-thirds`, `maps`. 검색형: `webpage`(웹페이지/UI 애니메이션 — 스크롤, 리빌, 커서, 콜아웃), `news`, `tweet`, `asset-fusion`.
- 단계: "autonomous by design"이며 질문은 최대 1회다. init → plan(director 서브에이전트: 검색 여부·카테고리·자산 전략 → `shot-plan.json`) → source(필요할 때만 media-use) → design(블록·레이아웃·모션·위치) → build(builder 서브에이전트, 재사용 우선 `compositions/index.html`) → verify(lint/check/proof 스냅샷, 실패 시 repair) → approve(프리뷰 후 "render now, or what changes?") → render.
- 출력: `renders/video.mp4` 또는 투명 오버레이(`--format webm`/`mov`). 더 길거나 내레이션이 있거나 여러 씬이면 `/general-video`로 넘긴다.

**slideshow** — [SKILL.md](https://github.com/heygen-com/hyperframes/blob/main/skills/slideshow/SKILL.md)
- 입력: 프레젠테이션·피치덱·인터랙티브 덱, 또는 기존 페이지를 덱으로 변환하는 요청. 사용자가 슬라이드쇼를 명시하지 않았다면 "Do you want this as a HyperFrames slideshow?"로 확인하고, 이 확인은 자율 모드에서도 생략하지 않는다.
- 구조: 일반 HyperFrames 씬(`data-composition-id`, `data-start`, `data-duration`, `data-label`)에 `<script type="application/hyperframes-slideshow+json">` JSON island 하나를 더한다(slides, slideSequences, fragment hold-point, 핫스팟 분기, 발표자 노트).
- 출력: `hyperframes present <project-dir>`로 띄우는 **탐색 가능한 덱**과 슬라이드별 `snapshot` 스틸. "Do not `hyperframes render` a slideshow into a single MP4" — 첫 컴포지션만 해석돼 잘린 MP4가 나오기 때문이고, 선형 MP4 내보내기는 "deferred"다.

### Inferences
- "앱 홍보영상"에 직접 해당하는 HyperFrames 경로는 **product-launch-video**(URL → 런치/프로모, 최대 약 3분)다. 기능 하나를 짧게 보여주는 소셜 클립은 **motion-graphics의 `webpage` 카테고리**가 대안이고, 릴리스 노트 영상은 **pr-to-video**가 맡는다. slideshow는 영상 산출물이 아니므로 프로모 파이프라인에서 빼야 한다.
- product-launch-video는 승인 게이트, 캡처 실패 시 중단, 프레임별 서브에이전트, 오디오 카브, contact sheet 검수까지 갖춰 품질 통제는 가장 강하다. 그 대가로 awesome list 실측에서 15초 브리프에 23.5분이 걸렸다(16개 중 가장 느림) — [awesome-claude-video-skills](https://github.com/zhuyansen/awesome-claude-video-skills). 빠른 반복이 필요하면 brag-slim이나 product-launch-motion v2처럼 HyperFrames를 거치지 않는 단일 HTML 방식을 함께 검토할 만하다.

### Gaps
- 각 스킬의 `references/`(story-design.md, visual-design.md, code-vocabulary.md 등)와 `sub-agents/frame-worker.md`는 열어보지 않았다. 블루프린트 개수와 프리셋 목록 같은 세부는 미확인이다.
- `hyperframes capture`의 실제 동작(스크롤 캡처 해상도, 차단 사이트 처리)은 실행하지 않았다(읽기 전용 제약).
