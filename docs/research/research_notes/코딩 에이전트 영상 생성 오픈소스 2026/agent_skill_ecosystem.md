# 코딩 에이전트용 영상 스킬·툴킷·MCP 생태계 (2026-10-17 기준)

> 범위: Claude Code / Codex / Gemini CLI 등 코딩 에이전트에 영상 제작 워크플로를 묶어 주는 큐레이션 목록, 스킬 번들, 툴킷, 오케스트레이터, MCP 서버. 순수 생성형 모델 API 래퍼와 순수 TTS/FFmpeg 유틸리티는 경계 사례로만 짧게 다룬다.

## 1. 어떤 카테고리가 있고, 카테고리별 대표 저장소는 무엇인가

### Takeaway
생태계는 두 렌더러(HeyGen HyperFrames, Remotion)를 중심으로 ① 렌더러·공식 스킬, ② 모션그래픽 스킬 팩, ③ 엔드투엔드 영상 에이전트·로컬 스튜디오, ④ 설명(explainer)·페이스리스 파이프라인, ⑤ Manim 수학 설명, ⑥ 쇼츠·클리핑·편집, ⑦ NLE(Premiere/Resolve/AE/CapCut 대체) MCP 서버, ⑧ 멀티에이전트 스튜디오, ⑨ 아바타로 나뉩니다. 가장 큰 큐레이션 목록(awesome-claude-video-skills, 304개)도 2026-07 이후 생긴 1만 스타급 저장소 여러 개를 빠뜨리고 있어, 목록만으로는 지형이 불완전합니다.

### Cited Findings

#### 측정 방법 (이 노트의 모든 현재 수치에 적용)
- 현재 스타·생성일·최근 push·라이선스·릴리스는 2026-10-17 08:00–08:30 UTC에 인증된 `gh api graphql`(repository 필드)로 직접 측정했습니다. 아래 표에서 저장소 이름 링크가 각 수치의 출처입니다. — [GitHub GraphQL repository object](https://docs.github.com/graphql/reference/objects#repository)
- 라이선스 표기: `None`은 GitHub가 라이선스 파일을 감지하지 못한 경우, `NOASSERTION`은 라이선스 파일은 있으나 표준 SPDX로 판별되지 않은(커스텀·혼합) 경우입니다. — [GitHub licenses API 문서](https://docs.github.com/rest/licenses/licenses)

#### 큐레이션 목록 자체
- [zhuyansen/awesome-claude-video-skills](https://github.com/zhuyansen/awesome-claude-video-skills): ★680, 생성 2026-09-27, push 2026-10-16, 라이선스 NOASSERTION (gh 측정). 저장소 설명은 아직 "180 repos"라고 쓰지만 README와 `data/skills.json`(생성일 2026-10-16)은 **304개**를 싣고 있습니다(설명이 낡음). 첫 커밋 메시지는 "168 open-source video skills"였습니다. — [README](https://github.com/zhuyansen/awesome-claude-video-skills), [data/skills.json](https://github.com/zhuyansen/awesome-claude-video-skills/blob/main/data/skills.json), [첫 커밋 61c2e73](https://github.com/zhuyansen/awesome-claude-video-skills/commit/61c2e73d3dad76afc30dddb2eb7359e36d5fa24a)
- 이 목록의 10개 분류와 개수(skills.json 기준): Promo & demos 61, Frameworks & toolkits 51, Explainers 49, Editing 41, Shorts & social 37, Motion graphics 20, Stories & animation 17, Scripts & learning 10, Music videos 10, Avatars 8. — [data/skills.json](https://github.com/zhuyansen/awesome-claude-video-skills/blob/main/data/skills.json)
- 수록 기준: 영상/모션그래픽을 만들거나 편집할 것, 에이전트가 조작할 것(스킬·플러그인·MCP·에이전트용 툴킷), README가 있을 것, 50★ 이상이면 주제만으로 수록, 50★ 미만은 README 품질 기준 + 5★(Claude Opus 5.5를 명시하면 예외). 판정은 "README를 읽는 decision model"이 하며 수작업이 아니라고 밝힙니다. — [README "How a repo gets on the list"](https://github.com/zhuyansen/awesome-claude-video-skills#how-a-repo-gets-on-the-list)
- 이 목록은 2026-10-11에 16개 스킬로 같은 15초 프로모(1920×1080, 30fps, 영상·이미지·음성 모델 API 키 없음)를 Claude Code(Opus 5.5)로 만들게 한 결과, 16개 모두와 "스킬 없는 Claude Code"(4.4분)까지 4개 검사를 전부 통과했고, 차이는 소요 시간(2.0–23.5분), 사운드(16개 중 9개), 룩뿐이었다고 보고합니다. 최단은 explainroo 2.0분, 최장은 hyperframes 23.5분. "단순 프로모에는 스킬이 필요 없을 수도 있다"는 결론을 직접 적습니다. — [README "Tested end to end"](https://github.com/zhuyansen/awesome-claude-video-skills#tested), [RESULTS.md](https://github.com/zhuyansen/agent-skills-hub/blob/main/ops/video-runs/RESULTS.md)
- [wilwaldon/Claude-Code-Video-Toolkit](https://github.com/wilwaldon/Claude-Code-Video-Toolkit): ★93, 생성·마지막 push 모두 2026-02-26, 라이선스 None. "February 2026" 시점의 정적 가이드로 Remotion, Manim, 화면 녹화(Playwright MCP), YouTube 클리핑, FFmpeg 5개 섹션과 추천 스택을 정리합니다. 이후 갱신이 없습니다. — [README](https://github.com/wilwaldon/Claude-Code-Video-Toolkit)
- 작품(도구 아님) 목록도 별도로 있습니다: [yihui-dev/awesome-opus5-5-videos](https://github.com/yihui-dev/awesome-opus5-5-videos) ★5,570(생성 2026-09-27), [opusvideo/awesome-claude-video](https://github.com/opusvideo/awesome-claude-video) ★205(2026-09-25), [zhuyansen/awesome-opus-5.5-video](https://github.com/zhuyansen/awesome-opus-5.5-video) ★201(2026-09-27). (gh 측정)

#### 카테고리별 대표 저장소 (★는 gh 2026-10-17 측정)
| 카테고리 | 대표 저장소 |
|---|---|
| ① 렌더러·공식 스킬 | [heygen-com/hyperframes](https://github.com/heygen-com/hyperframes) ★65,513 · [remotion-dev/skills](https://github.com/remotion-dev/skills) ★5,260 · [heygen-com/hyperframes-community-skills](https://github.com/heygen-com/hyperframes-community-skills) ★212 · [nexu-io/html-video](https://github.com/nexu-io/html-video) ★4,695 · [diffusionstudio/lottie](https://github.com/diffusionstudio/lottie) ★5,591 |
| ② 모션그래픽 스킬 팩 | [latent-spaces/brag](https://github.com/latent-spaces/brag) ★16,385 · [Vincentwei1021/video-shotcraft](https://github.com/Vincentwei1021/video-shotcraft) ★12,232 · [alchaincyf/huashu-art-motion](https://github.com/alchaincyf/huashu-art-motion) ★4,176 · [lemomo-ai/lemo-opuscar](https://github.com/lemomo-ai/lemo-opuscar) ★2,773 · [feitangyuan/onetake](https://github.com/feitangyuan/onetake) ★2,557 · [vibe-motion/skills](https://github.com/vibe-motion/skills) ★1,367 · [echris6/motion-video-kit](https://github.com/echris6/motion-video-kit) ★1,127 · [iart-ai/motion-skills](https://github.com/iart-ai/motion-skills) ★855 · [Barty-Bart/motion-graphics](https://github.com/Barty-Bart/motion-graphics) ★711 · [whaleyxbt/claude-motion](https://github.com/whaleyxbt/claude-motion) ★449 · [charlie947/motion-graphics-skills](https://github.com/charlie947/motion-graphics-skills) ★309 |
| ③ 엔드투엔드 영상 에이전트·로컬 스튜디오 | [calesthio/OpenMontage](https://github.com/calesthio/OpenMontage) ★68,970 · [hypit-ai/hypit](https://github.com/hypit-ai/hypit) ★22,908 · [edenfunf/reelmimic](https://github.com/edenfunf/reelmimic) ★3,387 · [digitalsamba/claude-code-video-toolkit](https://github.com/digitalsamba/claude-code-video-toolkit) ★2,261 · [openfilm/openfilm](https://github.com/openfilm/openfilm) ★671 · [GTKottman/mortiflix-oss](https://github.com/GTKottman/mortiflix-oss) ★639 · [Orkas-AI/Orkas-VideoStudio](https://github.com/Orkas-AI/Orkas-VideoStudio) ★330 · [FavioVazquez/showtime](https://github.com/FavioVazquez/showtime) ★261 |
| ④ 설명·페이스리스 파이프라인 | [Vincentwei1021/anything2explainer](https://github.com/Vincentwei1021/anything2explainer) ★2,551 · [Alisa0808/vox-director](https://github.com/Alisa0808/vox-director) ★2,309 · [kaomei/stickman-video-director](https://github.com/kaomei/stickman-video-director) ★2,197 · [Vincentwei1021/video-talkcraft](https://github.com/Vincentwei1021/video-talkcraft) ★1,618 · [vincentsch/explainroo](https://github.com/vincentsch/explainroo) ★581 · [haidrrrry/claude-remotion-skill](https://github.com/haidrrrry/claude-remotion-skill) ★487 · [hassancs91/claude-faceless-shorts-creator](https://github.com/hassancs91/claude-faceless-shorts-creator) ★273 |
| ⑤ Manim 수학 설명 | [HarleyCoops/Math-To-Manim](https://github.com/HarleyCoops/Math-To-Manim) ★2,779 · [academa-labs/manimgx](https://github.com/academa-labs/manimgx) ★1,652 · [adithya-s-k/manim_skill](https://github.com/adithya-s-k/manim_skill) ★1,177 · [abhiemj/manim-mcp-server](https://github.com/abhiemj/manim-mcp-server) ★652 · [shuyicc/MathLens](https://github.com/shuyicc/MathLens) ★359 · [Yusuke710/manim-skill](https://github.com/Yusuke710/manim-skill) ★173 |
| ⑥ 쇼츠·클리핑·편집 | [Agentchengfeng/chengfeng-videocut-skills](https://github.com/Agentchengfeng/chengfeng-videocut-skills) ★3,087 · [0xsline/OpenChatCut](https://github.com/0xsline/OpenChatCut) ★2,427 · [op7418/Youtube-clipper-skill](https://github.com/op7418/Youtube-clipper-skill) ★2,244 · [nateherkai/herk-edit-kit](https://github.com/nateherkai/herk-edit-kit) ★1,690 · [Jakeschincariol/youtube-agent-skill](https://github.com/Jakeschincariol/youtube-agent-skill) ★1,569 · [hassancs91/claude-youtube-editor](https://github.com/hassancs91/claude-youtube-editor) ★334 · [AgriciDaniel/claude-shorts](https://github.com/AgriciDaniel/claude-shorts) ★230 |
| ⑦ NLE·편집기 MCP 서버 | [jub0t/Concat](https://github.com/jub0t/Concat) ★7,879 · [samuelgursky/davinci-resolve-mcp](https://github.com/samuelgursky/davinci-resolve-mcp) ★3,582 · [pireel/pireel](https://github.com/pireel/pireel) ★1,300 · [Dakkshin/after-effects-mcp](https://github.com/Dakkshin/after-effects-mcp) ★757 · [ronak-create/FableCut](https://github.com/ronak-create/FableCut) ★732 · [hetpatel-11/Adobe_Premiere_Pro_MCP](https://github.com/hetpatel-11/Adobe_Premiere_Pro_MCP) ★711 · [leancoderkavy/premiere-pro-mcp](https://github.com/leancoderkavy/premiere-pro-mcp) ★398 · [KyaniteLabs/kinocut](https://github.com/KyaniteLabs/kinocut) ★206 · [mcp-use/remotion-mcp-app](https://github.com/mcp-use/remotion-mcp-app) ★57 |
| ⑧ 멀티에이전트 스튜디오 | [EverMind-AI/Raven](https://github.com/EverMind-AI/Raven) ★5,488(목록은 `skills/git-story-film` 하위 경로로 수록) · [ChrisChen667788/wind-comic](https://github.com/ChrisChen667788/wind-comic) ★707 · [ledbetterljoshua/functional-emotions-video](https://github.com/ledbetterljoshua/functional-emotions-video) ★70 · [vumichien/manim-skill](https://github.com/vumichien/manim-skill) ★7 |
| ⑨ 아바타 | [cclank/lanshu-create-ai-presenter-video](https://github.com/cclank/lanshu-create-ai-presenter-video) ★2,735 · [heygen-com/skills](https://github.com/heygen-com/skills) ★489 |

- 멀티에이전트 성격의 근거: wind-comic은 "Multi-agent AI studio … One sentence in. A finished short-form drama out"이라고 소개하고, functional-emotions-video는 "7 parallel chapter agents", vumichien/manim-skill은 "4-role Claude Code agent pipeline", echris6/motion-video-kit은 "builder ≠ judge, fresh critics on the actual render"(Gauntlet 루프)를 내세웁니다. — [wind-comic README](https://github.com/ChrisChen667788/wind-comic), [awesome 목록의 functional-emotions-video 항목](https://github.com/zhuyansen/awesome-claude-video-skills#made-with-opus-55), [vumichien/manim-skill](https://github.com/vumichien/manim-skill), [motion-video-kit README](https://github.com/echris6/motion-video-kit)

#### 큐레이션 목록이 빠뜨린 대형 저장소 (gh search로 발견, skills.json에 없음)
- `latent-spaces/brag` ★16,385, `Vincentwei1021/video-shotcraft` ★12,232, `jub0t/Concat` ★7,879, `storytold/effectcraft` ★7,058(Rust 모션그래픽·합성 도구, 에이전트 전용은 아님), `nexu-io/html-video` ★4,695, `alchaincyf/huashu-art-motion` ★4,176, `Vincentwei1021/anything2explainer` ★2,551, `kaomei/stickman-video-director` ★2,197, `kajisho5/ffmpeg-skill` ★1,981, `nateherkai/herk-edit-kit` ★1,690, `academa-labs/manimgx` ★1,652, `Jakeschincariol/youtube-agent-skill` ★1,569, `Vincentwei1021/video-talkcraft` ★1,618, `HarleyCoops/Math-To-Manim` ★2,779, `op7418/Youtube-clipper-skill` ★2,244, `samuelgursky/davinci-resolve-mcp` ★3,582. — [skills.json](https://github.com/zhuyansen/awesome-claude-video-skills/blob/main/data/skills.json)와 대조, 수치는 각 저장소 gh 측정([brag](https://github.com/latent-spaces/brag), [video-shotcraft](https://github.com/Vincentwei1021/video-shotcraft), [Concat](https://github.com/jub0t/Concat), [effectcraft](https://github.com/storytold/effectcraft), [html-video](https://github.com/nexu-io/html-video), [huashu-art-motion](https://github.com/alchaincyf/huashu-art-motion))
- 특이점: 목록은 원본 `Vincentwei1021/video-shotcraft`는 싣지 않으면서 이름을 딴 파생 저장소 4개(`JohnChow90/video-shotcraft`, `syklayou-glitch/video-shotcraft`, `kingselyjoe/video-shotcraft-dsh`, `ChenShuo2004/cs-shotcraft-skill`)는 싣고 있습니다. — [awesome README](https://github.com/zhuyansen/awesome-claude-video-skills)

#### 경계 사례 메모 (범위 밖, 간단 기록)
- FFmpeg 유틸리티지만 범위에 가까운 것: [kajisho5/ffmpeg-skill](https://github.com/kajisho5/ffmpeg-skill) ★1,981, 2026-09-03 생성, 릴리스 110개, 42개 FFmpeg 도구 + MCP 서버 + "probe → lossless edit → self-check" 워크플로. — [README](https://github.com/kajisho5/ffmpeg-skill)
- 생성형 모델 래퍼 계열(다른 연구자 담당): [scenario-labs/skills](https://github.com/scenario-labs/skills) ★1,035(2026-08-12), Runway `runway-api` 플러그인, [vericontext/vibeframe](https://github.com/vericontext/vibeframe) ★178, [GTAI-1/flow-mcp](https://github.com/GTAI-1/flow-mcp) ★186. — 각 저장소 gh 측정, [marketplace.json](https://github.com/anthropics/claude-plugins-official/blob/main/.claude-plugin/marketplace.json)
- 독립 앱형 쇼츠 생성기: [Anil-matcha/AI-Youtube-Shorts-Generator](https://github.com/Anil-matcha/AI-Youtube-Shorts-Generator) ★5,432(2024-06 생성, 2026-10 push), 에이전트 스킬이 아니라 OpenAI/Gemini 키를 쓰는 파이썬 앱. — [README](https://github.com/Anil-matcha/AI-Youtube-Shorts-Generator)

### Inferences
- 카테고리 구분은 렌더링 엔진보다 "입력(주제/참조 영상/원본 푸티지/프로젝트 저장소) → 산출물(프로모/설명/쇼츠/뮤직비디오)" 축으로 갈립니다. 렌더러는 사실상 HyperFrames·Remotion·자체 HTML(frame(t)) 셋으로 수렴했습니다.
- 목록의 자체 실험(스킬 없는 Claude Code도 통과)은 스킬의 가치가 "렌더링 가능 여부"가 아니라 룩·워크플로·푸티지 편집 능력에 있음을 시사합니다.
- awesome 목록은 "README를 읽는 모델"로 판정하므로 수록 누락·오분류가 구조적으로 생깁니다. 최종 보고서는 이 목록을 "가장 큰 단일 색인"으로 쓰되 완전한 모집단으로 다루지 않는 것이 안전합니다.

### Gaps
- awesome 목록이 원본 video-shotcraft를 왜 제외했는지(정책·실수·이름 충돌)는 확인하지 못했습니다.
- skills.sh 외의 레지스트리(mcpmarket.com, ClawHub)는 호출 예산 때문에 조사하지 않았습니다.

## 2. 주요 저장소별 스타·생성일·최근 push·라이선스·설치 방법·지원 에이전트·실제 기능

### Takeaway
설치 경로는 `npx skills add <owner/repo>`(Vercel skills CLI)와 Claude Code 플러그인 마켓플레이스(`/plugin marketplace add`)가 주류이고, 편집기 계열은 `claude mcp add`로 MCP 서버를 붙입니다. 대부분 README에서 Claude Code와 Codex를 함께 지원한다고 밝히며, Gemini CLI를 명시하는 곳은 HyperFrames, brag, showtime, bang-motion, heygen/skills 등 소수입니다.

### Cited Findings

#### 표 A. 렌더러·엔드투엔드·스튜디오 (★·생성·push·라이선스는 gh 2026-10-17 측정, 설치·에이전트·기능은 각 README)
| 저장소 | ★ | 생성 | 최근 push | 라이선스 | 설치 | README에 명시한 에이전트 | 하는 일 |
|---|---:|---|---|---|---|---|---|
| [heygen-com/hyperframes](https://github.com/heygen-com/hyperframes) | 65,513 | 2026-03-10 | 2026-10-17 | Apache-2.0 | `claude plugin marketplace add heygen-com/hyperframes` → `claude plugin install hyperframes@hyperframes`, 또는 `npx skills add heygen-com/hyperframes`; 릴리스 518개(최신 v0.8.167) | Claude Code, Codex, Gemini CLI, Cursor, OpenCode, Copilot | HTML·CSS·미디어·seek 가능한 애니메이션을 결정론적 MP4로 렌더링하는 에이전트용 프레임워크 |
| [remotion-dev/skills](https://github.com/remotion-dev/skills) | 5,260 | 2026-01-19 | 2026-10-16 | None | `npx skills add remotion-dev/skills` (또는 `bun create video` 시 선택) | Claude Code, Codex, Kimi Code, Cursor | Remotion 공식 Agent Skills(`/remotion-best-practices`, `/remotion-create`, `/remotion-markup` 등) |
| [calesthio/OpenMontage](https://github.com/calesthio/OpenMontage) | 68,970 | 2026-03-29 | 2026-10-16 | AGPL-3.0 | `git clone` + `pip install -r requirements.txt` + Remotion composer `npm install` | Claude Code, Codex, Cursor, OpenClaw, Copilot, Windsurf | "agentic video production system": 리서치·대본·에셋 생성·편집·합성, 무료 스톡 푸티지로 실제 영상 편집까지(목록 설명: 12 파이프라인, 100+ 도구, 700+ 스킬 파일) |
| [hypit-ai/hypit](https://github.com/hypit-ai/hypit) | 22,908 | 2026-07-29 | 2026-10-15 | NOASSERTION | `npx skills add hypit-ai/hypit -g`; 릴리스 27개(v0.3.1) | Claude Code, Codex, OpenClaw, Hermes | 바이럴 영상을 넣으면 푸티지·자막·B-roll·이펙트를 단어 단위로 앵커링한 워크플로(SVML)로 복제, 생성 모델은 선택 |
| [digitalsamba/claude-code-video-toolkit](https://github.com/digitalsamba/claude-code-video-toolkit) | 2,261 | 2025-12-09 | 2026-10-12 | MIT | `git clone` + `uv sync`; Codex용 실험적 `uv run scripts/migrate_to_codex.py --force`; 릴리스 31개(v0.21.0) | Claude Code(주), Codex(실험) | Remotion 프로젝트 템플릿 + `/video`·`/record-demo`·`/brand` 명령, ElevenLabs/Qwen3-TTS, FLUX.2·LTX-2 등을 Modal/RunPod GPU로 실행 |
| [openfilm/openfilm](https://github.com/openfilm/openfilm) | 671 | 2026-10-04 | 2026-10-17 | MIT | `npx skills add openfilm/openfilm`, `npx -y openfilm@latest`; 릴리스 5개 | Claude Code, Codex | `film.html` 하나 + 샷마다 `frame(t)` 함수 + 브라우저 로컬 편집기(Studio). "Remotion·HyperFrames 같은 프레임워크 없음"을 표방 |
| [FavioVazquez/showtime](https://github.com/FavioVazquez/showtime) | 261 | 2026-09-28 | 2026-10-17 | MIT | `npx skills add FavioVazquez/showtime` 또는 `/plugin marketplace add FavioVazquez/showtime`; 릴리스 20개(v0.4.6) | Claude Code, Codex, Cursor, Devin, OpenCode 등 | 로컬 영상 스튜디오: 모션그래픽·보이스오버·음악·자막·푸티지 편집, "no cloud AI services, no API keys" |
| [Orkas-AI/Orkas-VideoStudio](https://github.com/Orkas-AI/Orkas-VideoStudio) | 330 | 2026-06-30 | 2026-10-13 | MIT | `claude mcp add ovs -- npx -y @orkas/video-studio-mcp` | Claude Code, Codex, Cursor | 영상을 편집 가능한 `plan.json` IR로 표현, hyperframes·ffmpeg·whisper.cpp 래퍼(MCP) |
| [edenfunf/reelmimic](https://github.com/edenfunf/reelmimic) | 3,387 | 2026-09-28 | 2026-10-16 | MIT | `git clone` | Claude Code, Codex | 참조 영상(파일·YouTube 링크)의 편집 리듬·샷 길이·전환·색을 분석해 같은 스타일의 새 영상을 "AI crew"가 제작 |
| [GTKottman/mortiflix-oss](https://github.com/GTKottman/mortiflix-oss) | 639 | 2026-10-05 | 2026-10-08 | AGPL-3.0 | `/plugin marketplace add GTKottman/mortiflix-oss` | Claude Code | 브리프→대본→스타일 프레임→애니매틱→최종의 단계 게이트형 모션 디자인 스튜디오, 사용자의 Claude Code 로그인 또는 Anthropic API 키로 동작 |
| [nexu-io/html-video](https://github.com/nexu-io/html-video) | 4,695 | 2026-05-27 | 2026-06-21 | Apache-2.0 | (README에 표준 한 줄 설치 없음) | Claude Code, Codex, Gemini, Cursor, Hermes, OpenCode, Copilot, Windsurf 등 | 글 링크·GitHub 저장소를 넣으면 다중 프레임 HTML 영상 → 로컬 MP4, Open Design 팀 공식 |

#### 표 B. 모션그래픽·설명 스킬 팩
| 저장소 | ★ | 생성 | 최근 push | 라이선스 | 설치 | 에이전트 | 하는 일 |
|---|---:|---|---|---|---|---|---|
| [latent-spaces/brag](https://github.com/latent-spaces/brag) | 16,385 | 2026-06-16 | 2026-10-13 | MIT | `npx skills add https://github.com/latent-spaces/brag --skill brag`, `/plugin marketplace add latent-spaces/brag` | Claude Code, Codex, Gemini CLI, Cursor, Antigravity, OpenCode, Copilot | 방금 만든 프로젝트를 음악·모션·공유 문구가 포함된 짧은 런치 영상으로(HyperFrames 기반), Opus 5.5용 경량판 `/brag-slim` |
| [Vincentwei1021/video-shotcraft](https://github.com/Vincentwei1021/video-shotcraft) | 12,232 | 2026-07-19 | 2026-10-16 | Apache-2.0 | `npx skills add Vincentwei1021/video-shotcraft` | Claude Code, Codex | 실제 페이지 캡처 → 150개 샷 레시피에서 선택 → 스토리보드 → Remotion 애니메이션 → 비트 컷·사운드 디자인 → 프레임 검사 후 MP4 |
| [alchaincyf/huashu-art-motion](https://github.com/alchaincyf/huashu-art-motion) | 4,176 | 2026-10-06 | 2026-10-16 | MIT | `npx skills add alchaincyf/huashu-art-motion` | Claude Code | 36개 예술 스타일·9개 해설 문법으로 "그림을 움직이게" 하는 중국어권 스킬, nexu-io/open-design이 적응판을 수록 |
| [lemomo-ai/lemo-opuscar](https://github.com/lemomo-ai/lemo-opuscar) | 2,773 | 2026-09-26 | 2026-10-17 | MIT | `git clone` | Claude Code, Cursor | 51개 영화 스타일(스타일 프롬프트 + 코드로만 만든 데모 단편), 영상 생성 모델 없음 |
| [feitangyuan/onetake](https://github.com/feitangyuan/onetake) | 2,557 | 2026-09-26 | 2026-10-13 | NOASSERTION | `git clone … ~/.claude/skills/onetake` 또는 `~/.agents/skills/onetake` | Claude Code, Codex, Cursor | 컷 없는 원테이크 프로덕트 런치 필름, 유료 Pro 버전 별도(onetakemotion.com) |
| [Vincentwei1021/anything2explainer](https://github.com/Vincentwei1021/anything2explainer) | 2,551 | 2026-09-08 | 2026-09-18 | NOASSERTION | `git clone` + `pip install edge-tts …` | Claude Code, Codex | 주제 → 검은 캔버스 모션그래픽 설명 영상(TTS·자막·챕터 진행바), Remotion |
| [Vincentwei1021/video-talkcraft](https://github.com/Vincentwei1021/video-talkcraft) | 1,618 | 2026-08-22 | 2026-10-12 | NOASSERTION | `npx skills add Vincentwei1021/video-talkcraft` | Claude Code, Codex | 보이스오버 주도 설명 영상용 모션 디자인 스튜디오 |
| [echris6/motion-video-kit](https://github.com/echris6/motion-video-kit) | 1,127 | 2026-09-27 | 2026-10-14 | MIT | `git clone` | Claude Code | 실제 비즈니스용 프리미엄 광고: AI 푸티지 + HTML/GSAP + 선택적 Three.js + 독립 비평가 루프 |
| [vibe-motion/skills](https://github.com/vibe-motion/skills) | 1,367 | 2026-03-17 | 2026-10-05 | None | `npx skills add vibe-motion/skills` | Claude Code | "agent skills for vibe motion" |
| [iart-ai/motion-skills](https://github.com/iart-ai/motion-skills) | 855 | 2026-06-22 | 2026-10-14 | MIT | 형제 저장소별 `npx skills add iart-ai/…` / `/plugin marketplace add iart-ai/…` | Claude Code, Codex, Cursor | 키네틱 타이포·데이터 시각화·설명·TikTok용 50개 스킬 |
| [Barty-Bart/motion-graphics](https://github.com/Barty-Bart/motion-graphics) | 711 | 2026-09-25 | 2026-10-13 | NOASSERTION | `npx skills add Barty-Bart/motion-graphics` | Claude Code(설명에 Codex) | 토킹헤드 푸티지용 모션그래픽 스킬 |
| [whaleyxbt/claude-motion](https://github.com/whaleyxbt/claude-motion) | 449 | 2026-09-29 | 2026-10-09 | MIT | `git clone` (`.claude/skills/`, `AGENTS.md`) | Claude Code, Cursor, Codex·OpenCode(AGENTS.md) | "Remotion 스킬은 API를, 이것은 취향을": 프레임 자가 검사·사운드 엔진, 웹 시뮬레이션을 60fps 영상으로 |
| [charlie947/motion-graphics-skills](https://github.com/charlie947/motion-graphics-skills) | 309 | 2026-09-26 | 2026-10-11 | MIT | `npx skills add charlie947/motion-graphics-skills` (+ `npx skills add heygen-com/hyperframes`) | Claude Code, Codex | 13개 런치급 모션그래픽 스킬, "Nothing here needs an API key" |
| [vincentsch/explainroo](https://github.com/vincentsch/explainroo) | 581 | 2026-09-25 | 2026-10-15 | MIT | `git clone`; 릴리스 5개 | Claude Code, Codex | 설명·프로덕트 데모, 로컬 음성(Kokoro)·단어 타이밍 |
| [Alisa0808/vox-director](https://github.com/Alisa0808/vox-director) | 2,309 | 2026-07-10 | 2026-10-05 | MIT | `git clone … ~/.claude/skills/vox-director` | Claude Code, Codex | Vox 스타일 종이 콜라주 설명·광고 영상, Atlas Cloud 위에서 자동화(ATLASCLOUD_API_KEY) |
| [haidrrrry/claude-remotion-skill](https://github.com/haidrrrry/claude-remotion-skill) | 487 | 2026-06-13 | 2026-08-12 | MIT | `git clone` | Claude Code, Claude Desktop | Remotion으로 모션그래픽·B-roll·자막·사운드 디자인 |

#### 표 C. Manim·쇼츠/클리핑·편집기 MCP
| 저장소 | ★ | 생성 | 최근 push | 라이선스 | 설치 | 에이전트 | 하는 일 |
|---|---:|---|---|---|---|---|---|
| [HarleyCoops/Math-To-Manim](https://github.com/HarleyCoops/Math-To-Manim) | 2,779 | 2025-01-20 | 2026-10-16 | MIT | `pip install "math-to-manim[…]"`; 릴리스 v2.0.0 | (Codex 언급) | 자연어 수학 프롬프트 → Manim 애니메이션 파이프라인 |
| [academa-labs/manimgx](https://github.com/academa-labs/manimgx) | 1,652 | 2026-10-05 | 2026-10-15 | MIT | 에이전트에 "Follow https://manimgx.academa.ai/llms.txt" 붙여넣기 또는 `pip install manimgx` | Claude Code, Codex, Cursor | Manim CE API 호환 Rust/wgpu 엔진, 자체 벤치마크로 "ManimCE 대비 90.6× 빠름" 주장 |
| [adithya-s-k/manim_skill](https://github.com/adithya-s-k/manim_skill) | 1,177 | 2026-01-22 | 2026-01-23 | MIT | `npx skills add adithya-s-k/manim_skill` | (Cursor, Copilot 언급) | 3Blue1Brown 스타일 Manim 스킬(ManimCE·ManimGL) |
| [abhiemj/manim-mcp-server](https://github.com/abhiemj/manim-mcp-server) | 652 | 2025-03-31 | 2025-05-19 | MIT | `git clone` + `pip install manim mcp` | MCP 클라이언트 | Manim 렌더 MCP 서버(2025-05 이후 갱신 없음) |
| [op7418/Youtube-clipper-skill](https://github.com/op7418/Youtube-clipper-skill) | 2,244 | 2026-01-22 | 2026-01-22 | MIT | `npx skills add https://github.com/op7418/Youtube-clipper-skill` | Claude Code | yt-dlp 기반 YouTube 다운로드·챕터·클립·자막 |
| [nateherkai/herk-edit-kit](https://github.com/nateherkai/herk-edit-kit) | 1,690 | 2026-04-18 | 2026-10-14 | NOASSERTION | `git clone` | Codex, Claude Code | HyperFrames 기반 편집 키트(구 HyperFrames Student Kit): 데드에어 컷·실수 검토·스토리 계획·모션그래픽 |
| [Jakeschincariol/youtube-agent-skill](https://github.com/Jakeschincariol/youtube-agent-skill) | 1,569 | 2026-09-16 | 2026-09-16 | MIT | `/plugin marketplace add Jakeschincariol/youtube-agent-skill` | Claude Code | 채널 운영용 11개 스킬(21개 훅 공식 대본, 제목·썸네일 린트, 리텐션 분석, EDL, Shorts 찾기), 렌더링은 하지 않음·API 키 없음 |
| [0xsline/OpenChatCut](https://github.com/0xsline/OpenChatCut) | 2,427 | 2026-07-15 | 2026-10-15 | AGPL-3.0 | `npx skills add 0xsline/OpenChatCut` + `claude mcp add --transport http openchatcut …`; 릴리스 28개 | Claude Code, Codex | 로컬 우선 대화형 영상 편집기(멀티트랙 타임라인) |
| [jub0t/Concat](https://github.com/jub0t/Concat) | 7,879 | 2026-08-25 | 2026-10-16 | AGPL-3.0 | 앱 설치(설명: "Supports MCPs & API") | — | 오픈소스 크로스플랫폼 CapCut 대체 편집기 |
| [samuelgursky/davinci-resolve-mcp](https://github.com/samuelgursky/davinci-resolve-mcp) | 3,582 | 2025-03-18 | 2026-10-17 | MIT | `git clone`; 릴리스 473개(v4.13.7) | Claude Code, Codex, Cursor, OpenCode, Copilot, Claude Desktop, Windsurf | DaVinci Resolve Studio MCP |
| [hetpatel-11/Adobe_Premiere_Pro_MCP](https://github.com/hetpatel-11/Adobe_Premiere_Pro_MCP) | 711 | 2025-07-07 | 2026-10-13 | MIT | `npx skills add … --skill premiere-pro-mcp`, 플러그인, `npm install -g adobe-premiere-pro-mcp` | Claude Code, Codex, Copilot, Claude Desktop | Premiere Pro MCP |
| [ronak-create/FableCut](https://github.com/ronak-create/FableCut) | 732 | 2026-07-06 | 2026-10-17 | MIT | `/plugin marketplace add ronak-create/FableCut`, `claude mcp add -s user fablecut -- npx -y fablecut mcp` | Claude Code, Cursor, OpenCode, Claude Desktop | 에이전트가 JSON 타임라인으로 조작하는 무의존 브라우저 편집기 |

- skills.sh(Vercel skills 레지스트리, 제3자 집계) 표시 누적 설치 수: `remotion-dev/skills` 합계 "2.3M total installs"(remotion-best-practices 630.9K 등), `heygen-com/hyperframes` 52개 스킬 합계 14.0M(hyperframes-cli 1.1M, hyperframes 1.0M 등). gh 측정치가 아니라 레지스트리 표시값입니다. — [skills.sh/remotion-dev/skills](https://skills.sh/remotion-dev/skills), [skills.sh/heygen-com/hyperframes](https://skills.sh/heygen-com/hyperframes)
- HyperFrames는 Anthropic의 공식 플러그인 마켓플레이스 `anthropics/claude-plugins-official`의 `marketplace.json`에 HeyGen 저장소를 가리키는 항목으로 등재되어 있습니다(315개 플러그인 중). 같은 파일에 Remotion 항목은 없고, 영상 관련으로는 `runway-api`(runwayml/skills), `togetherai-skills`가 있습니다. — [claude-plugins-official marketplace.json](https://github.com/anthropics/claude-plugins-official/blob/main/.claude-plugin/marketplace.json)

### Inferences
- 설치 표면은 세 갈래로 정착했습니다: (a) `npx skills add`(에이전트 중립, Codex `.agents/skills`까지 배포), (b) Claude Code 플러그인 마켓플레이스(버전 고정·자동 업데이트), (c) `claude mcp add`(편집기·렌더 서버). Gemini CLI 전용 경로를 문서화한 저장소는 드뭅니다.
- "README에 Codex를 언급"이 곧 동등한 동작을 뜻하지는 않습니다. digitalsamba처럼 Codex 지원을 "실험적 마이그레이션 스크립트"로 명시하는 사례가 있습니다.

### Gaps
- 표의 "에이전트" 열은 README 문자열 검색 결과로, 실제 동작 검증이 아닙니다(설치·실행은 읽기 전용 제약으로 NOT RUN).
- Jub0t/Concat, kaomei/stickman-video-director, nexu-io/html-video는 README에서 표준 한 줄 설치 명령을 추출하지 못했습니다.

## 3. 2026-08~10에 새로 생겼거나 급성장한 저장소와 그 근거

### Takeaway
요청된 스타 타임스탬프 방식은 2026-10-17 현재 GitHub에서 막혀 있어(REST 404, GraphQL 빈 결과) 실행하지 못했고, 대신 (a) 생성일, (b) awesome 목록 git 이력의 스냅샷 대비 증가분, (c) Events API의 최근 WatchEvent 속도로 판단했습니다. 2026-09-22~28에 Opus 5.5 관련 "코드로 만든 영상" 스킬이 몰려 생겼고, 기존 대형 저장소 중에서는 HyperFrames(09-27 이후 +12,048), OpenMontage(+7,501), hypit(+6,391)이 가장 크게 늘었습니다.

### Cited Findings

#### 방법상 제약 (NOT RUN)
- `gh api repos/OWNER/REPO/stargazers -H "Accept: application/vnd.github.star+json"`가 대상 저장소뿐 아니라 `cli/cli`, `remotion-dev/remotion`에서도 `404 Not Found`를 반환했고, GraphQL `stargazers(orderBy:{field:STARRED_AT})`도 `edges: []`, `totalCount: 0`을 반환했습니다(2026-10-17 직접 실행). 따라서 스타 시계열 샘플링은 수행할 수 없었습니다. — [List stargazers 문서](https://docs.github.com/rest/activity/starring#list-stargazers)
- 대체 지표 ①: awesome 목록의 `data/skills.json` 커밋 이력(09-27 → 10-03 → 10-16)에 저장된 스타 값. **이 과거값은 agentskillshub 크롤 값이며 gh 측정이 아닙니다**(현재값만 gh 측정). — [09-27 스냅샷 335c12a](https://github.com/zhuyansen/awesome-claude-video-skills/blob/335c12a78f7c8352086950f267a156b726b0b499/data/skills.json), [10-03 스냅샷 7059ad6](https://github.com/zhuyansen/awesome-claude-video-skills/blob/7059ad65ed8358181682b2c42501a96953154c8f/data/skills.json)
- 대체 지표 ②: Events API의 최근 최대 300개 이벤트 중 WatchEvent 수. 인기 저장소는 0.9~2일, 조용한 저장소는 30~46일만 덮으므로 **현재 속도**이지 8~10월 추세가 아닙니다. — [GitHub Events API 문서](https://docs.github.com/rest/activity/events)

#### 생성 시기 분포 (awesome 목록 304개, gh 측정 created_at)
- 월별 생성 수: 2025-12 3, 2026-01 9, 02 4, 03 16, 04 15, 05 17, 06 34, 07 51, **08 34, 09 75, 10(1–16일) 43**. 즉 304개 중 152개(50%)가 2026-08-01 이후 생성. — [skills.json](https://github.com/zhuyansen/awesome-claude-video-skills/blob/main/data/skills.json) 저장소 목록을 gh GraphQL로 조회
- 목록 규모 자체도 168개(09-27 첫 커밋) → 180(09-27) → 204(09-30) → 230(10-03) → 304(10-16)로 19일 만에 약 1.8배가 됐습니다. — [skills.json 커밋 이력](https://github.com/zhuyansen/awesome-claude-video-skills/commits/main/data/skills.json)

#### 2026-08~10 신규 생성 + 현재 규모가 큰 저장소 (gh 측정)
| 저장소 | 생성 | ★(10-17) | 비고 |
|---|---|---:|---|
| [alchaincyf/huashu-art-motion](https://github.com/alchaincyf/huashu-art-motion) | 2026-10-06 | 4,176 | 11일 만에 4천 |
| [edenfunf/reelmimic](https://github.com/edenfunf/reelmimic) | 2026-09-28 | 3,387 | 10-03 목록값 988 → 현재 3,387 |
| [lemomo-ai/lemo-opuscar](https://github.com/lemomo-ai/lemo-opuscar) | 2026-09-26 | 2,773 | 09-27 목록값 240 → 2,773 |
| [cclank/lanshu-create-ai-presenter-video](https://github.com/cclank/lanshu-create-ai-presenter-video) | 2026-08-20 | 2,735 | 10-03 목록값 2,064 |
| [feitangyuan/onetake](https://github.com/feitangyuan/onetake) | 2026-09-26 | 2,557 | 10-03 목록값 1,368 |
| [Vincentwei1021/anything2explainer](https://github.com/Vincentwei1021/anything2explainer) | 2026-09-08 | 2,551 | 목록 미수록 |
| [kaomei/stickman-video-director](https://github.com/kaomei/stickman-video-director) | 2026-08-03 | 2,197 | 목록 미수록 |
| [JohnHeibel/PDoomVideo](https://github.com/JohnHeibel/PDoomVideo) | 2026-09-22 | 2,166 | Opus 5.5 뮤직비디오 소스, 09-27 목록값 1,110 |
| [kajisho5/ffmpeg-skill](https://github.com/kajisho5/ffmpeg-skill) | 2026-09-03 | 1,981 | 릴리스 110개 |
| [jtydhr88/screenwriting-skills](https://github.com/jtydhr88/screenwriting-skills) | 2026-09-06 | 1,687 | 영상 전 단계(대본) |
| [academa-labs/manimgx](https://github.com/academa-labs/manimgx) | 2026-10-05 | 1,652 | Manim 계열 신규 최대 |
| [Vincentwei1021/video-talkcraft](https://github.com/Vincentwei1021/video-talkcraft) | 2026-08-22 | 1,618 | 목록 미수록 |
| [Jakeschincariol/youtube-agent-skill](https://github.com/Jakeschincariol/youtube-agent-skill) | 2026-09-16 | 1,569 | 목록 미수록 |
| [JohnHeibel/ClaudeAnimationBase](https://github.com/JohnHeibel/ClaudeAnimationBase) | 2026-09-23 | 1,217 | 09-27 목록값 423 |
| [echris6/motion-video-kit](https://github.com/echris6/motion-video-kit) | 2026-09-27 | 1,127 | |
| [Vincentwei1021/mg-styles-15](https://github.com/Vincentwei1021/mg-styles-15) | 2026-10-02 | 970 | |
| [alexgreensh/anidoodle](https://github.com/alexgreensh/anidoodle) | 2026-09-22 | 970 | 릴리스 20개 |
| [Tejashmakwana/motionmaxxing](https://github.com/Tejashmakwana/motionmaxxing) | 2026-10-06 | 805 | |
| [ythx-101/live-panel-skill](https://github.com/ythx-101/live-panel-skill) | 2026-10-03 | 761 | |
| [Barty-Bart/motion-graphics](https://github.com/Barty-Bart/motion-graphics) | 2026-09-25 | 711 | |
| [openfilm/openfilm](https://github.com/openfilm/openfilm) | 2026-10-04 | 671 | 현재 속도 최고 수준(아래) |
| [bangtutorial/bang-motion](https://github.com/bangtutorial/bang-motion) | 2026-09-05 | 644 | |
| [GTKottman/mortiflix-oss](https://github.com/GTKottman/mortiflix-oss) | 2026-10-05 | 639 | |
| [jub0t/Concat](https://github.com/jub0t/Concat) | 2026-08-25 | 7,879 | 편집기(MCP 지원) |
| [heygen-com/hyperframes-community-skills](https://github.com/heygen-com/hyperframes-community-skills) | 2026-08-25 | 212 | HeyGen 공식 커뮤니티 저장소 |

#### 스냅샷 대비 증가분 (현재 gh 측정 − awesome 목록 과거값)
| 저장소 | 현재 ★ | 09-27 목록값 | 10-03 목록값 | 09-27 이후 증가 |
|---|---:|---:|---:|---:|
| [heygen-com/hyperframes](https://github.com/heygen-com/hyperframes) | 65,513 | 53,465 | 56,001 | +12,048 |
| [calesthio/OpenMontage](https://github.com/calesthio/OpenMontage) | 68,970 | 61,469 | 62,516 | +7,501 |
| [hypit-ai/hypit](https://github.com/hypit-ai/hypit) | 22,907 | 16,516 | 18,953 | +6,391 |
| [lemomo-ai/lemo-opuscar](https://github.com/lemomo-ai/lemo-opuscar) | 2,772 | 240 | 849 | +2,532 |
| [EverMind-AI/Raven](https://github.com/EverMind-AI/Raven) | 5,488 | 4,114 | 5,087 | +1,374 |
| [JohnHeibel/PDoomVideo](https://github.com/JohnHeibel/PDoomVideo) | 2,166 | 1,110 | 1,720 | +1,056 |
| [JohnHeibel/ClaudeAnimationBase](https://github.com/JohnHeibel/ClaudeAnimationBase) | 1,217 | 423 | 724 | +794 |
| [remotion-dev/skills](https://github.com/remotion-dev/skills) | 5,260 | 4,733 | 4,817 | +527 |
| [alexgreensh/anidoodle](https://github.com/alexgreensh/anidoodle) | 970 | 517 | 764 | +453 |
| [0xsline/OpenChatCut](https://github.com/0xsline/OpenChatCut) | 2,426 | 2,017 | 2,086 | +409 |
| [digitalsamba/claude-code-video-toolkit](https://github.com/digitalsamba/claude-code-video-toolkit) | 2,260 | 2,134 | 2,160 | +126 |
- 10-03 이후에만 등장한 저장소의 10-03→현재 증가: reelmimic +2,399, onetake +1,188, lanshu +671, baocut +513, howseen-ai/claude-motion-design +345, charlie947 +249, showtime +252(9 → 261). — 출처는 위 [10-03 스냅샷](https://github.com/zhuyansen/awesome-claude-video-skills/blob/7059ad65ed8358181682b2c42501a96953154c8f/data/skills.json)과 각 저장소 gh 측정값
- 목록 README의 2026-10-11 테스트 표 스타 값(예: hyperframes 60,291, OpenMontage 64,239, hypit 20,799)과 비교해도 6일 사이 각각 약 +5.2k, +4.7k, +2.1k입니다(과거값은 목록 표시값). — [README tested 표](https://github.com/zhuyansen/awesome-claude-video-skills#tested)

#### 현재 스타 속도 (Events API WatchEvent, 2026-10-17 측정)
| 저장소 | 관측 구간 | WatchEvent | 대략 ★/일 |
|---|---|---:|---:|
| [calesthio/OpenMontage](https://github.com/calesthio/OpenMontage) | 0.91일 | 242 | ~265 |
| [openfilm/openfilm](https://github.com/openfilm/openfilm) | 1.25일 | 256 | ~205 |
| [jub0t/Concat](https://github.com/jub0t/Concat) | 1.55일 | 213 | ~138 |
| [Vincentwei1021/video-shotcraft](https://github.com/Vincentwei1021/video-shotcraft) | 2.03일 | 260 | ~128 |
| [hypit-ai/hypit](https://github.com/hypit-ai/hypit) | 1.99일 | 230 | ~116 |
| [nateherkai/herk-edit-kit](https://github.com/nateherkai/herk-edit-kit) | 2.84일 | 258 | ~91 |
| [heygen-com/hyperframes](https://github.com/heygen-com/hyperframes) | 1.68일 | 149 | ~89 |
| [Vincentwei1021/mg-styles-15](https://github.com/Vincentwei1021/mg-styles-15) | 4.51일 | 260 | ~58 |
| [remotion-dev/skills](https://github.com/remotion-dev/skills) | 6.71일 | 273 | ~41 |
| [kaomei/stickman-video-director](https://github.com/kaomei/stickman-video-director) | 4.20일 | 173 | ~41 |
| [whaleyxbt/claude-motion](https://github.com/whaleyxbt/claude-motion) | 7.53일 | 263 | ~35 |
| [Vincentwei1021/anything2explainer](https://github.com/Vincentwei1021/anything2explainer) | 9.95일 | 266 | ~27 |
| [samuelgursky/davinci-resolve-mcp](https://github.com/samuelgursky/davinci-resolve-mcp) | 8.89일 | 171 | ~19 |
| [kajisho5/ffmpeg-skill](https://github.com/kajisho5/ffmpeg-skill) | 14.2일 | 81 | ~6 |
| [digitalsamba/claude-code-video-toolkit](https://github.com/digitalsamba/claude-code-video-toolkit) | 35.9일 | 153 | ~4 |
| [op7418/Youtube-clipper-skill](https://github.com/op7418/Youtube-clipper-skill) | 29.6일 | 49 | ~2 |
| [adithya-s-k/manim_skill](https://github.com/adithya-s-k/manim_skill) | 29.3일 | 69 | ~2 |

#### Opus 5.5와의 연결 근거
- awesome 목록은 "Made with Claude Opus 5.5" 섹션을 따로 두고 lemo-opuscar, PDoomVideo, ClaudeAnimationBase, functional-emotions-video를 싣습니다. 수록 기준에도 "Claude Opus 5.5를 명시하면 5★ 기준 면제"가 있습니다. — [README Made with Opus 5.5](https://github.com/zhuyansen/awesome-claude-video-skills#made-with-opus-55)
- brag는 "/brag-slim … rebuilt lean for Opus 5.5", lemo-opuscar는 "demo film made entirely in code by Claude Opus 5.5", mg-styles-15는 "each made by Claude Opus 5.5 writing code from one prompt"라고 밝힙니다. — [brag](https://github.com/latent-spaces/brag), [lemo-opuscar](https://github.com/lemomo-ai/lemo-opuscar), [mg-styles-15](https://github.com/Vincentwei1021/mg-styles-15)

### Inferences
- 2026-09-22~28 주간에 PDoomVideo·ClaudeAnimationBase·lemo-opuscar·onetake·reelmimic·charlie947·Barty-Bart·explainroo·howseen·motion-video-kit·showtime·anidoodle이 연달아 생성된 점, 그리고 여러 저장소가 Opus 5.5를 직접 내세우는 점으로 보아, "영상 모델 없이 코드로 렌더링한 Opus 5.5 영상"의 화제성이 이 버스트를 촉발한 것으로 추정됩니다(인과는 미검증).
- 성장의 대부분은 렌더러(HyperFrames)와 대형 오케스트레이터(OpenMontage, hypit)에 집중되고, 개별 스킬 팩은 생성 직후 1~2주 급등 뒤 감속하는 패턴(예: anything2explainer ~27★/일, video-shotcraft는 생성 3개월 후에도 ~128★/일로 예외)을 보입니다.
- openfilm(10-04 생성, 현재 ~205★/일)과 Concat(~138★/일)은 10월 중순 기준 가장 가파른 신규 성장 후보입니다.

### Gaps
- 스타 타임스탬프 API가 닫혀 있어 8월·9월·10월 월별 스타 증가를 직접 계산하지 못했습니다(NOT RUN). 8월 이전 생성 저장소의 8~9월 증가분은 awesome 목록 스냅샷이 09-27부터라 공백입니다.
- 스타 조작(구매·캠페인) 여부는 평가하지 않았습니다. hypit README의 "Star this repo!" 호소처럼 프로모션 요소가 있는 저장소가 있으나 이상 여부는 판단 근거가 없습니다.
- 목록 과거값은 제3자 크롤 시각이 커밋 시각과 정확히 같다고 보장할 수 없습니다.

## 4. awesome-claude-video-skills의 보안 등급과 실제 보안 우려

### Takeaway
304개 중 298개가 SAFE, 6개가 CAUTION이지만, 이 등급은 README와 설치 단계 텍스트에 대한 규칙 기반 1차 스캔일 뿐 코드 동작·API 키 노출·원격 실행 위험을 보장하지 않습니다. 실제로 `curl | bash` 설치를 안내하는 저장소와 8개 공급자 키를 요구하는 저장소도 SAFE로 표시되어 있어, 등급은 참고용으로만 써야 합니다.

### Cited Findings
- 등급 분포: `security_grade` safe 298, caution 6(skills.json 기준). CAUTION 6개는 `argus-metis/hermes-video-editing`, `howseen-ai/claude-motion-design`, `Karnaf0katom/taskfilm`, `wshuyi/remotion-video-skill`, `ops120/video-recap-skills-plus`, `Dancan254/shenghua`. — [data/skills.json](https://github.com/zhuyansen/awesome-claude-video-skills/blob/main/data/skills.json)
- 등급의 범위: README 각주에 "**Security** is the grade of the repo's README and install steps on Agent Skills Hub"라고 명시합니다. — [README 각주](https://github.com/zhuyansen/awesome-claude-video-skills)
- 방법론: "a rule-based scan built on the SlowMist agent-security taxonomy, covering 11 red-flag categories including credential harvesting, data exfiltration, and curl | sh installers"이며 "It is a first-layer scan, not a manual audit"라고 스스로 밝힙니다. — [agentskillshub howseen-ai/claude-motion-design 페이지](https://agentskillshub.top/skill/howseen-ai/claude-motion-design/)
- CAUTION 사유 예: howseen-ai/claude-motion-design은 "installs at runtime"(`pip install playwright imageio-ffmpeg numpy pillow`), 품질 점수 69/100. wshuyi/remotion-video-skill은 "sudo usage", 70/100. — [howseen 페이지](https://agentskillshub.top/skill/howseen-ai/claude-motion-design/), [wshuyi 페이지](https://agentskillshub.top/skill/wshuyi/remotion-video-skill/)
- 같은 페이지는 Liu et al.(2026)을 인용해 31,132개 에이전트 스킬 중 "26.1% contain security vulnerabilities"라고 적습니다(2차 인용, 원 논문은 미확인). — [agentskillshub](https://agentskillshub.top/skill/howseen-ai/claude-motion-design/)
- **등급 불일치 1**: `EverMind-AI/Raven`은 skills.json에서 safe(하위 경로 `skills/git-story-film`로 수록)인데, 저장소 README는 `curl -fsSL https://raven.evermind.ai/install.sh | bash`와 `irm https://raven.evermind.ai/install.ps1 | iex`를 안내합니다. 방법론이 잡겠다고 한 "curl | sh installers" 범주 그대로입니다. — [skills.json](https://github.com/zhuyansen/awesome-claude-video-skills/blob/main/data/skills.json), [Raven README](https://github.com/EverMind-AI/Raven)
- **등급 불일치 2**: `calesthio/OpenMontage`는 safe이지만 README에 `ARK_API_KEY`, `ATLASCLOUD_API_KEY`, `ELEVENLABS_API_KEY`, `FAL_KEY`, `GOOGLE_API_KEY`, `HEYGEN_API_KEY`, `KLING_API_KEY`, `OPENAI_API_KEY` 등 공급자 키 8종이 등장합니다. — [OpenMontage README](https://github.com/calesthio/OpenMontage)
- 그 밖의 파이프-투-셸 설치 안내: showtime(uv·fnm 설치기), digitalsamba(uv 설치기), heygen-com/skills(`curl -fsSL https://static.heygen.ai/cli/install.sh | bash`), Math-To-Manim(TinyTeX 설치 스크립트). 대부분 잘 알려진 공식 설치기지만 패턴상 같은 범주입니다. — [showtime](https://github.com/FavioVazquez/showtime), [digitalsamba](https://github.com/digitalsamba/claude-code-video-toolkit), [heygen-com/skills](https://github.com/heygen-com/skills), [Math-To-Manim](https://github.com/HarleyCoops/Math-To-Manim)
- API 키 표면(README 문자열 기준): wind-comic 8종 이상(ELEVENLABS, FAL, GEMINI, GROK, HAILUO, KELING, LTX 등), frametell 5종(ANTHROPIC, OPENAI, GEMINI, ELEVENLABS, VOLCENGINE), Orkas-VideoStudio 4종(MUAPI·OVS_*), reelmimic 4종(FREESOUND, PIXABAY, UPLOAD_POST, YATING), vox-director(ATLASCLOUD), video-db/skills(VIDEO_DB), heygen-com/skills(HEYGEN), lanshu(MINIMAX), wshuyi(MINIMAX). — [wind-comic](https://github.com/ChrisChen667788/wind-comic), [frametell](https://github.com/sitor-ai/frametell), [Orkas](https://github.com/Orkas-AI/Orkas-VideoStudio), [reelmimic](https://github.com/edenfunf/reelmimic), [vox-director](https://github.com/Alisa0808/vox-director), [video-db/skills](https://github.com/video-db/skills), [heygen-com/skills](https://github.com/heygen-com/skills), [lanshu](https://github.com/cclank/lanshu-create-ai-presenter-video), [wshuyi](https://github.com/wshuyi/remotion-video-skill)
- 반대로 "API 키 불필요"를 명시하는 스택: showtime("no cloud AI services, no API keys and no uploads"), kajisho5/ffmpeg-skill("No cloud · No API keys · Python standard library"), charlie947("Nothing here needs an API key"), Jakeschincariol/youtube-agent-skill("no API key, nothing to connect"), hypit(생성 모델 선택적), explainroo(로컬 Kokoro 음성). — [showtime](https://github.com/FavioVazquez/showtime), [ffmpeg-skill](https://github.com/kajisho5/ffmpeg-skill), [charlie947](https://github.com/charlie947/motion-graphics-skills), [youtube-agent-skill](https://github.com/Jakeschincariol/youtube-agent-skill), [hypit](https://github.com/hypit-ai/hypit), [explainroo](https://github.com/vincentsch/explainroo)
- HeyGen 스스로 커뮤니티 스킬 저장소에 "[!CAUTION] Community skills are not part of the curated HyperFrames distribution. A skill can instruct an agent to run commands, read files, call network services, or spend money. … Repository review and automated checks reduce risk, but they are not a security guarantee."라고 경고합니다. — [hyperframes-community-skills README](https://github.com/heygen-com/hyperframes-community-skills)
- 정책성 우려: digitalsamba 툴킷 README에 `uv run tools/dewatermark.py --input video.mp4 --preset sora --output clean.mp4 --cloud modal` 예시가 있어, 생성 영상 워터마크 제거 도구를 포함합니다. — [digitalsamba README](https://github.com/digitalsamba/claude-code-video-toolkit)
- 원격 서비스·로그인 의존: mortiflix는 "your own Claude Code login or your own Anthropic API key"로 동작하고, `npx -y <패키지>@latest`(openfilm, FableCut, Orkas MCP)는 실행 시점의 최신 npm 패키지를 받아 실행합니다. — [mortiflix](https://github.com/GTKottman/mortiflix-oss), [openfilm](https://github.com/openfilm/openfilm), [FableCut](https://github.com/ronak-create/FableCut), [Orkas](https://github.com/Orkas-AI/Orkas-VideoStudio)

### Inferences
- agentskillshub 등급은 "README·설치 문구에 위험 패턴이 보이는가"를 재는 지표라서, 런타임 `pip install` 같은 비교적 흔한 패턴은 잡고 하위 경로로 수록된 저장소의 루트 설치 스크립트나 키 요구는 놓칠 수 있습니다. 실제 보안 판단에는 SKILL.md·스크립트·의존성을 직접 검토해야 합니다.
- 위험 표면은 저장소 유형별로 다릅니다: 순수 스킬 팩(마크다운 + 로컬 렌더)은 낮고, 엔드투엔드 오케스트레이터는 다수 공급자 키·원격 GPU(Modal/RunPod)·`npx -y` 실행이 겹쳐 높습니다.

### Gaps
- agentskillshub의 11개 범주 전체 목록과 6개 CAUTION 중 4개의 구체 사유는 확인하지 못했습니다.
- 어떤 저장소의 코드도 실행·정적 분석하지 않았습니다(읽기 전용 제약). README 키 문자열은 "선택적 공급자"일 수 있어 필수 여부는 미확인입니다.
- leancoderkavy/premiere-pro-mcp README에 `POSTHOG_API_KEY`가 등장하나 텔레메트리 여부·기본값은 확인하지 않았습니다. — [premiere-pro-mcp](https://github.com/leancoderkavy/premiere-pro-mcp)

## 5. 공식 Anthropic 산출물(Claude Motion 등)에 Claude Code에서 쓸 수 있는 GitHub·스킬·API 대응물이 있는가

### Takeaway
Claude Motion은 2026-10-08 claude.ai Team/Enterprise 베타로 출시된 "Motion 템플릿 기반 아티팩트"이며, 공식 문서에 Claude Code·API·스킬·MCP 대응물에 대한 언급은 없습니다. Anthropic GitHub(anthropics/skills, claude-plugins-official, anthropics 조직 저장소)에서도 2026-10-17 현재 Motion에 대응하는 공식 스킬·플러그인을 찾지 못했습니다. Claude Code에서 가장 가까운 "공식 경로"는 Anthropic 공식 마켓플레이스에 등재된 제3자(HeyGen) HyperFrames 플러그인입니다.

### Cited Findings
- 공식 도움말: Claude Motion은 "turns your content into short animations, like an explainer for an all-hands, an animated chart for a board deck, or a product walkthrough", Team·Enterprise 베타(Team은 기본 켜짐, Enterprise는 조직 설정 > Artifacts에서 소유자가 켜야 함), "An animation is an artifact made from the Motion template. Claude builds it from your prompt as code", 영상 생성 모델을 쓰지 않아 실사 푸티지·사람은 만들지 않음, MP4로 내보내기, 채팅·Output 선택기·Artifacts 탭에서 생성, 플랜 사용량에 포함. Claude Code·API·스킬·GitHub·MCP·CLI 언급 없음. — [Get started with Claude Motion (support.claude.com)](https://support.claude.com/en/articles/17454997-get-started-with-claude-motion)
- 출시일 2026-10-08과 Dashboards 동시 발표는 2차 자료에서 확인됩니다. — [eesel.ai 블로그](https://eesel.ai/blog/claude-motion), [ud.hk 가이드](https://ud.hk/en/blogs/insight/article/claude-motion-explainer-guide-2026-10-14), [ecosistemastartup](https://ecosistemastartup.com/anthropic-lanza-claude-dashboards-y-motion-todo-lo-nuevo/)
- `anthropics/skills`의 스킬 목록(2026-10-17)은 academy-guide, algorithmic-art, brand-guidelines, canvas-design, claude-api, discernment-nudge, doc-coauthoring, docx, frontend-design, internal-comms, mcp-builder, pdf, pptx, skill-creator, slack-gif-creator, theme-factory, web-artifacts-builder, webapp-testing, xlsx로, 영상·모션 전용 스킬은 없습니다(가장 가까운 것은 GIF용 slack-gif-creator). — [anthropics/skills](https://github.com/anthropics/skills/tree/main/skills)
- `anthropics/claude-plugins-official`의 Anthropic 소유 `plugins/` 디렉터리에도 영상·모션 플러그인은 없고, 마켓플레이스의 영상 관련 항목은 제3자 소스(heygen-com/hyperframes, runwayml/skills의 `runway-api`, togethercomputer/skills)를 가리킵니다. — [plugins 디렉터리](https://github.com/anthropics/claude-plugins-official/tree/main/plugins), [marketplace.json](https://github.com/anthropics/claude-plugins-official/blob/main/.claude-plugin/marketplace.json)
- anthropics 조직 저장소 이름·설명에서 video|motion|anim|remotion을 검색한 결과 해당 저장소가 없었습니다(gh api, 2026-10-17). — [github.com/anthropics](https://github.com/anthropics)
- 이 조사 세션(Claude Code)의 Artifact 도구에서 계정이 쓸 수 있는 아티팩트 타입을 조회하면 Dashboard, Design, Design System, Docs, Slides 5종만 나오고 "motion animation video" 질의는 결과가 없었습니다. 단 이 계정이 Team/Enterprise인지 알 수 없어 약한 근거입니다. — [Get started with Claude Motion](https://support.claude.com/en/articles/17454997-get-started-with-claude-motion)(플랜 조건 출처)
- 이름 혼동 주의: `whaleyxbt/claude-motion`(2026-09-29 생성, 공식 Motion 출시 전), `howseen-ai/claude-motion-design`, `Hype-yolo/claude-motion-skill`은 모두 비공식 커뮤니티 저장소입니다. — [whaleyxbt/claude-motion](https://github.com/whaleyxbt/claude-motion), [howseen-ai/claude-motion-design](https://github.com/howseen-ai/claude-motion-design), [awesome 목록 항목](https://github.com/zhuyansen/awesome-claude-video-skills)

### Inferences
- Claude Motion은 "Motion 템플릿 아티팩트"라는 claude.ai 내부 기능이며, 코드 기반 애니메이션 + MP4 내보내기라는 접근은 커뮤니티의 HyperFrames/Remotion 스킬과 같은 방향입니다. Claude Code에서 같은 결과를 원하면 현재로선 HyperFrames 플러그인(공식 마켓플레이스 등재)이나 remotion-dev/skills 같은 제3자 스킬이 현실적인 대체입니다.

### Gaps
- Team/Enterprise 계정에서 Claude Code의 Artifact 타입 목록에 Motion 템플릿이 노출되는지는 확인하지 못했습니다(이 계정의 플랜 미확인).
- Anthropic의 공식 발표문(anthropic.com/news 또는 claude.com 블로그) 원문은 직접 열람하지 못했고, 출시일은 도움말 문서와 2차 자료로만 확인했습니다.
