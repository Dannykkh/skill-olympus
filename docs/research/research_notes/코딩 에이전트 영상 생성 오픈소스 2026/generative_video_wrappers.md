# 생성형 영상 모델의 에이전트 연동 (스킬·MCP·CLI) — 2026-10-17 기준

> 측정·접근 기준: GitHub 수치는 모두 **2026-10-17 `gh api repos/OWNER/REPO`로 측정**(stars/created/pushed/license). 가격은 표기한 벤더 페이지를 **2026-10-17 접근**. 검색 스니펫만 있고 원문 fetch가 실패한 항목은 "(검색 스니펫, 원문 fetch 실패)"로 표시. 유료 API는 호출하지 않았고, Kling 공식 MCP는 무료 조회 도구 `who_am_i`만 호출해 모델·인자 스펙을 확인함(계정 식별 정보와 크레딧 잔액은 기록하지 않음).

## 1. 벤더별 공식 MCP 서버·에이전트 스킬과 가장 많이 쓰이는 커뮤니티 구현

### Takeaway
2026-10 현재 벤더 공식 "원격(호스티드) MCP + OAuth + 플랜 크레딧 과금" 형태가 주류가 됐다: Kling(`kling.ai/mcp`), Runway(`mcp.runwayml.com`), fal(`mcp.fal.ai`), Replicate(`mcp.replicate.com`). Google은 Vertex AI용 Go MCP 묶음(genmedia)을, MiniMax는 로컬 Python/JS MCP를 공식 제공한다. **OpenAI Sora는 2026-09-24에 API 자체가 제거돼 Sora MCP는 모두 대상이 사라졌고**, Seedance·Pika·Luma(현행)는 벤더 공식 MCP를 확인하지 못했다(Luma 공식 repo는 2025-04 이후 방치).

### Cited Findings

**벤더 공식 (확인된 것)**

- **Google Veo / Gemini Omni** — `GoogleCloudPlatform/vertex-ai-creative-studio` 1,223★, created 2024-08-15, pushed 2026-10-17, Apache-2.0. `experiments/mcp-genmedia/mcp-genmedia-go/` 아래 `mcp-veo-go`, `mcp-omni-go`, `mcp-imagen-go`, `mcp-nanobanana-go`, `mcp-lyria-go`, `mcp-chirp3-go`, `mcp-avtool-go`(ffmpeg) 서버와 `install-mcp-genmedia`·`build-mcp-genmedia` 스킬이 있음 — [GitHub](https://github.com/GoogleCloudPlatform/vertex-ai-creative-studio)
- `mcp-veo-go` README는 Version 3.7.0, 도구 `veo_t2v`, `veo_i2v`, `veo_extend_video`, `veo_first_last_to_video`, `veo_reference_to_video`, `veo_ingredients_to_video`를 노출. 출력은 항상 GCS에 쓰이고 선택적으로 로컬 다운로드, `GOOGLE_CLOUD_PROJECT` 필수. i2v 기본 모델 `veo-3.1-fast-generate-001`, 길이 5–8초(기본 5), 1요청 최대 4개. 연장은 입력 MP4 1–30초·24fps를 받아 **7초 연장분** 출력 — [mcp-veo-go README](https://github.com/GoogleCloudPlatform/vertex-ai-creative-studio/tree/main/experiments/mcp-genmedia/mcp-genmedia-go/mcp-veo-go)
- genmedia MCP 최근 커밋: 2026-10-12 `feat(avtool): add ffmpeg_extract_frame tool`, 2026-10-13~17 의존성 업데이트 연속 — 활발히 유지 중 — [commits](https://github.com/GoogleCloudPlatform/vertex-ai-creative-studio/commits/main/experiments/mcp-genmedia)
- `google-gemini/veo-3-gemini-api-quickstart` 335★, 2025-08-15, pushed 2026-06-22, Apache-2.0 (MCP가 아닌 퀵스타트 앱) — [GitHub](https://github.com/google-gemini/veo-3-gemini-api-quickstart)

- **Kling (공식 호스티드 MCP)** — 엔드포인트 `https://kling.ai/mcp`(비인증 접근 시 HTTP 401, OAuth). 공개 GitHub repo는 찾지 못함(`KlingAI/kling-mcp` 404). 2026-10-17 `who_am_i` 응답: `mcpVersion: "1.3.3"`, `authMode: "oauth"` — [kling.ai/mcp](https://kling.ai/mcp) (로컬 Claude Code 커넥터에서 확인)
- Kling MCP 도구 목록: `text_to_video`, `image_to_video`, `motion_control`, `motion_library_list`, `omni_ref_video`, `element_create/get/list/update/delete`, `file_upload`, `text_to_image`, `image_to_image`, `query_tasks`, `query_membership_and_credits`, `who_am_i`, `logout`, `feedback`. 모든 생성은 `generation_id`를 즉시 반환하고 `query_tasks`로 폴링하는 비동기 구조이며, 도구 설명에 "Every job is charged; do not submit trial jobs"가 명시됨 — [kling.ai/mcp](https://kling.ai/mcp)
- Kling MCP 노출 모델(2026-10-17): `kling-video-v2_5`, `v2_6`, `o1`, `v3_0`, `v3_0_omni`, `v3_0_turbo`, `v4_0`. **t2v·i2v·omni_ref의 기본 모델은 `kling-video-v4_0`**("Kling's latest flagship", 3–30초, 기본 720p, 멤버는 1080p, 4K 비활성, 21:9 지원). v3_0/v3_0_omni는 3–15초, 멤버 4K, `prefer_multi_shots`(멀티샷), `enable_audio`(네이티브 오디오). (OAuth 계정 1개로 2026-10-17 관측한 값이며, `who_am_i` 설명에 "Default values may vary between membership tiers"라고 명시돼 기본값·허용값은 멤버십 등급별로 다를 수 있음) — [kling.ai/mcp](https://kling.ai/mcp)
- Kling MCP 기능 세부: i2v는 first/tail 프레임, v4_0은 keyframe_1..10까지(이미지 합계 10장); `motion_control`(v2_6, v3_0)은 피사체 이미지 + 모션 영상 또는 모션 라이브러리 ID; `omni_ref_video`(v4_0)는 이미지 10·영상 5·오디오 3·Element 7개(합계 15)를 한 번에 받으며 "billed per second; input video duration is included"; Element는 이미지형(커버+보조 1–3장) 또는 영상형(3–60초) + 선택적 음성 mp3로 **캐릭터 일관성**을 유지 — [kling.ai/mcp](https://kling.ai/mcp)
- 관측: Kling 공식 MCP 도구 목록에 별도 `lip_sync` 도구는 없음(음성 Element/오디오 참조로 "voice-driven characters"를 지원한다고만 설명). 커뮤니티 `199-biotechnologies/mcp-kling`은 립싱크·가상 피팅 포함 13개 도구를 내세움 — [glama 목록](https://glama.ai/mcp/servers/@199-biotechnologies/mcp-kling/schema)

- **Runway** — 호스티드 MCP `https://mcp.runwayml.com/mcp`(Streamable HTTP, OAuth 2.1 PKCE, API 키 불필요, 기존 Runway 플랜 크레딧 소비). `runwayml/runway-mcp-plugin` 4★, created 2026-09-11, MIT: Cursor·Grok Bot·Grok Build용 플러그인, `/runway` 명령과 `runway-media`, `runway-workflows` 스킬 포함 — [runway-mcp-plugin README](https://github.com/runwayml/runway-mcp-plugin)
- 구 로컬 서버 `runwayml/runway-api-mcp-server` 23★, 2025-06-13, pushed 2026-09-30, MIT, **archived=true**. 개발자는 `dev.runwayml.com/agents`, 그 외는 `runway.com/mcp`로 안내. 구 도구: `runway_generateVideo`(이미지+텍스트), `runway_generateImage`, `runway_upscaleVideo`, `runway_editVideo`, `runway_generateAudio`, `runway_getTask`, `runway_cancelTask` 등 — [GitHub](https://github.com/runwayml/runway-api-mcp-server)

- **MiniMax (Hailuo / H3)** — `MiniMax-AI/MiniMax-MCP` 1,590★, 2025-04-10, pushed 2026-08-20, MIT: `generate_video`, `query_video_generation`(비동기), TTS·보이스 클론·이미지 도구. README는 Hailuo-02(6s/10s, 768P/1080P)까지 언급. 2026-08-20 커밋 "migrate to MCP Python SDK v2", "remove retired Music references" — [GitHub](https://github.com/MiniMax-AI/MiniMax-MCP)
- `MiniMax-AI/MiniMax-MCP-JS` 130★, 2025-04-15, pushed 2026-08-21, MIT — [GitHub](https://github.com/MiniMax-AI/MiniMax-MCP-JS)
- `MiniMax-AI/skills` 13,712★, 2026-03-17, pushed 2026-04-18, MIT — `minimax-multimodal-toolkit` 스킬 포함(내용 미확인) — [GitHub](https://github.com/MiniMax-AI/skills)

- **Luma** — `lumalabs/luma-mcp` 26★, 2025-04-15, **마지막 push 2025-04-18**, MIT ("Powered by Ray (video) and Photon (image)") — 사실상 방치 — [GitHub](https://github.com/lumalabs/luma-mcp). `lumalabs/lumaai-python` SDK 45★, pushed 2026-08-20, Apache-2.0 — [GitHub](https://github.com/lumalabs/lumaai-python). Luma 가격 문서(docs.agents.lumalabs.ai)에는 MCP·CLI 언급 없음 — [Luma pricing](https://docs.agents.lumalabs.ai/guides/pricing/)

- **OpenAI Sora** — 공식 MCP 없음. `openai/skills`(28,112★, 2025-11-25, pushed 2026-09-08) 트리에 `imagegen` 시스템 스킬만 있고 Sora/영상 스킬은 없음 — [GitHub](https://github.com/openai/skills)
- OpenAI 공식 deprecations: "On March 24th, 2026, we notified developers using the Videos API and Sora 2 video generation model aliases and snapshots of their deprecation and removal from the API on September 24, 2026." 대상: sora-2, sora-2-pro, 스냅샷 2025-10-06/2025-12-08, Videos API. **권장 대체 모델 없음** — [OpenAI Deprecations](https://developers.openai.com/api/docs/deprecations)
- OpenAI 가격 페이지(2026-10-17)에는 Sora 가격 항목이 더 이상 없음 — [OpenAI Pricing](https://developers.openai.com/api/docs/pricing)

- **ByteDance Seedance** — 벤더 공식 MCP repo/호스티드 MCP를 찾지 못함. BytePlus ModelArk API만 존재(모델 ID `dreamina-seedance-2-5-260628`) — [llm-stats](https://llm-stats.com/blog/research/seedance-2-5-launch) (검색 스니펫)

- **Pika** — 공식 MCP repo 없음. `Pika-Labs/Pika-Experiments` 7★, 2026-05-25, pushed 2026-06-25, Apache-2.0("agent prototypes") — [GitHub](https://github.com/Pika-Labs/Pika-Experiments). `dev.pika.art` 문서는 "image, video, audio, music, speech... through one API key", "no free tier for generation; a paid balance is required"라고 하며 카탈로그에 Seedance 2.5, Gemini Omni 1.1 Flash, Wan 3.0, MiniMax H3를 열거; MCP·CLI 언급은 해당 페이지에 없음 — [dev.pika.art](https://dev.pika.art/)

**애그리게이터 공식**

- **fal.ai** — 호스티드 MCP `https://mcp.fal.ai/mcp-relay`(Streamable HTTP, OAuth 브라우저 로그인, API 키 불필요). 도구 11개: `search_models`, `get_model_schema`, `get_pricing`, `search_docs`, `recommend_model`, `run_model`(기본 45초 대기), `submit_job`, `check_job`, `get_job_result`, `cancel_job`, `upload_file`. Claude Code·Codex CLI(`codex mcp login fal`)·Cursor·ChatGPT 지원. 별도로 docs MCP, platform MCP, 로컬 API 키용 genmedia CLI — [fal MCP docs](https://fal.ai/docs/documentation/setting-up/mcp.md); fal 블로그는 "9 tools"로 소개(시점 차이로 보임) — [fal blog](https://blog.fal.ai/connect-your-ai-to-1-000-models-with-the-fal-mcp-server) (검색 스니펫)
- `fal-ai-community/skills` 252★, 2026-01-22, pushed 2026-09-29, 라이선스 없음: `genmedia`, `genmedia-workflow`, `fal-models-catalog`(text-to-video/image-to-video/video-to-video 참조), `model-routing`, `cinematography`, `commercial`, `marketing`, `storytelling`, `ugc` 등 — [GitHub](https://github.com/fal-ai-community/skills)
- **Replicate** — 호스티드 `mcp.replicate.com` + 로컬 npm `replicate-mcp`(`npx -y replicate-mcp`, API 토큰). 실험적 "Code Mode"(`--tools=code`, Deno 샌드박스에서 TypeScript로 SDK 호출). Claude Code·Cursor·Copilot·Codex CLI·Gemini CLI 지원 — [Replicate MCP docs](https://replicate.com/docs/reference/mcp); 2026-02-10 `/.well-known/mcp/server.json`으로 공식 MCP Registry 자동 발견 지원 — [Replicate changelog](https://replicate.com/changelog/2026-02-10-mcp-server-auto-discovery)
- **inference.sh** — `inference-sh/skills` 769★, 2026-01-31, pushed 2026-10-15, 라이선스 없음. `tools/video/`: `google-veo`, `seedance`, `happyhorse`, `p-video`, `p-video-avatar`, `ai-video-generation`, `image-to-video`, `ai-avatar-video`, **`remotion-render`**; `guides/video/`: `explainer-video-guide`, `ai-marketing-videos`, `storyboard-creation`, `talking-head-production`, `video-ad-specs`; `guides/prompting/video-prompting-guide` — [GitHub](https://github.com/inference-sh/skills)
- **Pexo** — `pexoai/pexo-skills` 805★, 2026-03-04, pushed 2026-08-20, MIT. 20개 스킬(`pexo-agent`, `text-to-video`, `image-to-video`, `seedance-2.0-prompter`, `veo-3.2-prompter`, `explainer-video`, `product-video`, `saas-video`, `launch-video`, `videoagent-director` 등). "1 API key for all models", Seedance 2·Kling 3.0·HappyHorse 등 10+ 모델 자동 라우팅, "finished multi-shot video with music, subtitles, transitions"를 차별점으로 내세움 — [GitHub](https://github.com/pexoai/pexo-skills)
- pexo.ai 사이트 내비게이션에 "CLI/MCP", "Pexo Skills" 항목이 있고 Seedance 2.0/2.5, Kling 3.0, MiniMax H3, Hailuo, Pika, Runway, Luma 등을 통합한다고 표기; 운영사 표기 "EXTREMO LIMITED" — [pexo.ai](https://pexo.ai)

**커뮤니티 (스타 기준 상위, 2026-10-17 측정)**

| repo | ★ | created | last push | license | 비고 |
|---|---|---|---|---|---|
| [ATH-MaaS/Pixelle-MCP](https://github.com/ATH-MaaS/Pixelle-MCP) | 1,129 | 2025-07-28 | 2025-12-17 | MIT | ComfyUI + MCP AIGC |
| [artokun/comfyui-mcp](https://github.com/artokun/comfyui-mcp) | 830 | 2026-02-15 | 2026-10-14 | MIT | 로컬 ComfyUI 제어 + 사이드바 에이전트, VRAM 워치독 훅 |
| [joenorton/comfyui-mcp-server](https://github.com/joenorton/comfyui-mcp-server) | 410 | 2025-03-05 | 2026-02-17 | Apache-2.0 | 경량 Python |
| [Comfy-Org/comfy-mcp](https://github.com/Comfy-Org/comfy-mcp) (Comfy 공식) | 284 | 2026-07-01 | 2026-10-16 | AGPL-3.0-or-later OR Commercial(README 배지; API는 NOASSERTION) | comfy-cli 기반 |
| [Doriandarko/sora-mcp](https://github.com/Doriandarko/sora-mcp) | 208 | 2025-10-08 | 2025-10-08 | MIT | **Sora API 제거로 동작 불가** |
| [robonuggets/seedance-skill](https://github.com/robonuggets/seedance-skill) | 106 | 2026-04-14 | 2026-04-14 | 없음 | Seedance 2.0 모션그래픽 스킬, fal 연동 |
| [deepfates/mcp-replicate](https://github.com/deepfates/mcp-replicate) | 94 | 2025-01-08 | 2025-09-24 | MIT | |
| [luminarylane/fal-mcp-server](https://github.com/luminarylane/fal-mcp-server) (= raveenb/fal-mcp-server, 동일 repo 리다이렉트) | 61 | 2025-08-28 | 2026-05-04 | MIT | 이미지·영상·음악 |
| [PsychArch/minimax-mcp-tools](https://github.com/PsychArch/minimax-mcp-tools) | 50 | 2025-03-16 | 2026-01-29 | MIT | |
| [LeoYeAI/seedance-skills](https://github.com/LeoYeAI/seedance-skills) | 47 | 2026-07-08 | 2026-07-08 | MIT | 28개 스킬 |
| [199-biotechnologies/mcp-kling](https://github.com/199-biotechnologies/mcp-kling) | 44 | 2025-06-14 | 2025-06-14 | MIT | 단일 push 후 방치 |
| [alchaincyf/seedance-skill](https://github.com/alchaincyf/seedance-skill) | 40 | 2026-08-17 | 2026-10-13 | MIT | 화이트모델(3D) 참조 영상 구동 |
| [AceDataCloud/SeedanceMCP](https://github.com/AceDataCloud/SeedanceMCP) | 20 | 2026-03-08 | 2026-10-12 | MIT | 리셀러(Ace Data Cloud) |

- 리셀러형 단일 벤더 MCP(벤더 공식 아님): AceDataCloud `VeoMCP`(3★)·`KlingMCP`(1★)·`SoraMCP`(0★)·`LumaMCP`(0★)·`HailuoMCP`(1★)·`MinimaxMCP`(1★, "MiniMax H3")·`KlingCli`(0★), 모두 2026-10-08~12 push; runapi-ai `kling-mcp`/`runway-mcp`/`hailuo-mcp`/`seedance-mcp`(0★, Apache-2.0, 2026-06-23/24 생성) — [AceDataCloud](https://github.com/AceDataCloud), [runapi-ai](https://github.com/runapi-ai)
- `DanikVR/omniflow-veo-mcp` 0★, 2026-09-05, pushed 2026-10-11, MIT — "MCP server for Google Flow (Veo 3 / Omni 1.1)" 비공식 — [GitHub](https://github.com/DanikVR/omniflow-veo-mcp)
- 영상 제작 하네스(모델 래퍼 위 계층): `calesthio/OpenMontage` 68,970★, 2026-03-29, pushed 2026-10-16, **AGPL-3.0** — [GitHub](https://github.com/calesthio/OpenMontage); `heygen-com/hyperframes` 65,513★, 2026-03-10, Apache-2.0 — [GitHub](https://github.com/heygen-com/hyperframes); `remotion-dev/remotion` 64,642★ — [GitHub](https://github.com/remotion-dev/remotion); `GML-MMGroup/AdCraft` 422★(2026-07-02) — [GitHub](https://github.com/GML-MMGroup/AdCraft); `cclank/lanshu-awesome-ai-video-kit` 421★(2026-05-25, MIT, "7 Claude Skill · 15 模型") — [GitHub](https://github.com/cclank/lanshu-awesome-ai-video-kit)
- 검색 오탐(영상 생성과 무관, 집계에서 제외): `JochenYang/luma-mcp`(116★, 비전 이해 MCP), `rehan-remade/universal-modder`(8,122★, 게임 모딩 + fal MCP 번들), `CrowdStrike/falcon-mcp`, lu.ma 이벤트 MCP들 — [gh search](https://github.com/search?q=luma+mcp&type=repositories)

### Inferences
- "공식" 연동은 2026 하반기에 **호스티드 MCP + OAuth + 소비자 플랜 크레딧** 쪽으로 수렴했다(Kling, Runway, fal). API 키 배포가 필요 없고 플랜 과금이라 개인 사용엔 편하지만, CI/서버 자동화에는 여전히 API 키 기반(Replicate 로컬, MiniMax MCP, genmedia, fal genmedia CLI)이 맞다.
- 커뮤니티 스타는 단일 모델 MCP보다 **ComfyUI 계열(로컬 오픈웨이트)**과 **멀티모델 스킬 묶음(inference.sh, Pexo, fal skills)**에 몰린다. 단일 벤더 MCP는 대부분 0–20★ 리셀러이므로 채택 근거로 약하다.
- Sora 기반 워크플로·스킬(Sora MCP, OpenMontage의 HeyGen 게이트웨이 경유 Sora 등)은 2026-09-24 이후 재작성 대상이다.
- 공통 실행 패턴은 "작업 제출 → ID 반환 → 폴링 → URL/GCS 결과 다운로드"의 비동기 구조이며(Kling `query_tasks`, fal `submit_job/check_job`, MiniMax `query_video_generation`, Runway `getTask`), 코드 기반 렌더 파이프라인은 이 결과 파일을 로컬 에셋으로 고정하는 단계를 가져야 한다.

### Gaps
- Kling 공식 MCP의 출시일·공개 소스·문서 URL은 찾지 못함(엔드포인트가 OAuth 401). Kling 4.0(`kling-video-v4_0`)의 공식 출시일도 미확인.
- Luma의 현행(Ray 3.2) 공식 MCP 존재 여부 미확인 — 공식 repo는 2025-04 이후 갱신 없음.
- Pika MCP: 검색 결과에 `mcp.pika.art` 도메인이 나오나 `/pricing`은 404; 공식 MCP 실재 여부·도구 목록 미확인.
- Pexo의 MCP/CLI 엔드포인트와 가격은 사이트 내비게이션 표기만 확인, 상세 미확인. `veo-3.2-prompter` 스킬명이 있으나 Veo 3.2는 Gemini 가격·Veo 문서에서 확인되지 않음.
- Seedance 벤더 공식 MCP는 "찾지 못함"이지 "없음"이 확인된 것은 아님.
- `MiniMax-AI/skills`의 `minimax-multimodal-toolkit`이 영상 생성을 포함하는지 미확인.
- 연장/립싱크/모션 컨트롤/일관성 기능의 벤더별 매트릭스는 Kling(MCP 스펙)과 Veo(genmedia·Veo 문서)만 완결. Runway `act_two`, Luma reframe/edit, Wan2.2 S2V/Animate는 가격표·README에 존재만 확인했고 과제의 기능 분류에 대응시키지 못함.
- Replicate의 영상 모델별 가격은 수집하지 못했고, npm `replicate-mcp`의 소스 저장소도 찾지 못함(`replicate/replicate-mcp-code-mode` 4★만 확인).
- Kling 공식 CLI는 찾지 못함(yespress 스니펫은 존재를 주장하나 gh 검색에서는 리셀러 `AceDataCloud/KlingCli`만 확인).

## 2. 에이전트 친화적 도구가 있는 오픈웨이트 영상 모델과 필요 하드웨어

### Takeaway
에이전트에서 오픈웨이트 영상을 돌리는 실질 경로는 **ComfyUI + MCP**(Comfy 공식 `comfy-mcp`, artokun, joenorton)와 **저VRAM 런처 Wan2GP**, 그리고 모델별 공식 CLI다. 24GB(RTX 4090)가 로컬 영상의 현실적 하한이고(Wan2.2 TI2V-5B, HunyuanVideo-1.5 14GB+오프로드, CogVideoX-5B 저메모리), Wan2.2 A14B·LTX-2.5 풀 품질은 80GB급이다. 2026-08에는 **MiniMax H3(33B)가 오픈웨이트로 풀렸고**, 오픈 Wan은 여전히 2.2가 최신이다(Wan 3.0은 API 전용). 한국 사용자는 HunyuanVideo-1.5와 MiniMax H3 라이선스가 **대한민국을 적용 지역에서 제외**한다는 점이 결정적이다.

### Cited Findings

**ComfyUI·MCP 경로**
- `Comfy-Org/comfy-mcp` 284★, 2026-07-01, pushed 2026-10-16; comfy-cli 기반으로 Claude Code·Cursor 등에서 로컬 ComfyUI 구동; 릴리스 v0.7.0·v0.8.0(2026-08-07), v0.9.0(08-08), v0.10.0(08-10) — [GitHub](https://github.com/Comfy-Org/comfy-mcp)
- comfy-mcp의 하드웨어 라우팅 지침: "Discrete GPU, ≥ 24 GB VRAM — Local generation is a good default", "8 GB to under 24 GB — Images are fine...; video will be slow or infeasible", "< 8 GB VRAM ... Don't run local diffusion. Use partner nodes ... or the Comfy Cloud MCP", Apple Silicon 32GB 미만도 클라우드 권장. `server_info()`의 hardware 블록·`system_stats()`·`free_memory()`로 에이전트가 VRAM을 읽고 해제 — [comfy-mcp README](https://github.com/Comfy-Org/comfy-mcp)
- `artokun/comfyui-mcp` 830★: `clear_vram`, `get_system_stats`, PreToolUse "VRAM watchdog"(1GB 미만이면 경고), 모델별 VRAM 추정을 담은 troubleshooting 스킬 — [README](https://github.com/artokun/comfyui-mcp)
- `comfyanonymous/ComfyUI` 137,971★, GPL-3.0, pushed 2026-10-17 — [GitHub](https://github.com/comfyanonymous/ComfyUI)

**모델별**
- **Wan 2.2** — `Wan-Video/Wan2.2` 17,974★, 2025-07-28, pushed 2026-09-21, Apache-2.0. T2V/I2V-A14B(MoE) 단일 GPU 명령은 "can run on a GPU with at least 80GB VRAM"(오프로드 포함); **TI2V-5B는 720P@24fps, "at least 24GB VRAM (e.g, RTX 4090 GPU)"**; S2V-14B(오디오 구동, 2025-08-26), Animate-14B(캐릭터 애니메이션/교체, 2025-09-19); 2025-07-28 ComfyUI·Diffusers 통합 — [Wan2.2 README](https://github.com/Wan-Video/Wan2.2). (Wan2.1 17,228★ — [GitHub](https://github.com/Wan-Video/Wan2.1))
- `kijai/ComfyUI-WanVideoWrapper` 6,734★, Apache-2.0, pushed 2026-05-24 — [GitHub](https://github.com/kijai/ComfyUI-WanVideoWrapper)
- **Wan 3.0은 오픈웨이트 아님**: 2026-08-24 출시, 30초 1080p, "$0.20 per second", "there are no downloadable weights ... the open Wan line still stops at Wan 2.2" — [The Next Web](https://thenextweb.com/news/alibaba-wan3-video-model-after-share-sale), [DataNorth](https://datanorth.ai/news/alibaba-launches-wan3-0-video-model) (검색 스니펫)
- **LTX-2 / LTX-2.5** — `Lightricks/LTX-2` 9,770★, 2026-01-03, pushed 2026-10-13, 라이선스 NOASSERTION(LTX Community License). 동기화 오디오+비디오 DiT. 퀵스타트는 `Lightricks/LTX-2.5`의 22B distilled transformer + Gemma4-12B 텍스트 인코더, 다운로드 "roughly 66 GiB"; 메모리 제약 시 `--quantization fp8-cast --offload {cpu, disk}`; 고품질 DFR 파이프라인은 "slower, more VRAM" — [LTX-2 README](https://github.com/Lightricks/LTX-2)
- LTX-2 패키지 릴리스: v1.2.0(2026-08-11), v1.3.0(08-26), v1.4.0(09-29), v1.4.1(09-30), v1.4.2(10-02) — [releases](https://github.com/Lightricks/LTX-2/releases)
- LTX 생태계: `Lightricks/ComfyUI-LTXVideo` 4,203★(pushed 2026-10-14), `Lightricks/LTX-Desktop` 2,096★(2026-03-04, Apache-2.0, 데스크톱 앱), 구 `Lightricks/LTX-Video` 11,123★(Apache-2.0, pushed 2026-01-05), `james-see/ltx-video-mac` 437★(Apple Silicon, LTX-2.5·MiniMax H3) — [Lightricks](https://github.com/Lightricks), [ltx-video-mac](https://github.com/james-see/ltx-video-mac)
- HyperFrames `media-use` 스킬의 로컬 영상 생성 폴백은 **LTX 2.3 on MLX**(`dgrauet/ltx-2-mlx`, `ltx-2.3-mlx-q4` distilled/`q8` two-stage) — 로컬 설치본 `~/.claude/skills/media-use/scripts/lib/local-models.mjs`, `references/operations.md` (HyperFrames 스킬 번들, [heygen-com/hyperframes](https://github.com/heygen-com/hyperframes))
- **HunyuanVideo-1.5** — `Tencent-Hunyuan/HunyuanVideo-1.5` 4,571★, 2025-11-20, pushed 2026-04-10. 8.3B, "Minimum GPU Memory: 14 GB (with model offloading enabled)"; 480p I2V step-distilled(8–12 step) "up to 75% speedup on RTX 4090"; FP8 GEMM(2025-12-23); Wan2GP로 6GB까지 — [README](https://github.com/Tencent-Hunyuan/HunyuanVideo-1.5). 원조 HunyuanVideo 12,625★ — [GitHub](https://github.com/Tencent-Hunyuan/HunyuanVideo)
- **Mochi** — `genmoai/mochi` 3,749★, 2024-09-11, pushed 2026-10-06, Apache-2.0. 단일 GPU "approximately 60GB VRAM", ComfyUI 최적화 시 20GB 미만; 2024-11-05 ComfyUI 네이티브 소비자 GPU 지원 — [README](https://github.com/genmoai/mochi)
- **CogVideoX** — `zai-org/CogVideo` 13,085★, pushed 2025-11-04(사실상 정체). diffusers 기준 2B FP16 최소 4GB, 5B BF16 최소 5GB(오프로드), 1.5-5B BF16 10GB부터; 5초 영상 생성 시간 5B ≈ A100 180초/H100 90초, 1.5 ≈ A100 1000초/H100 550초 — [README](https://github.com/zai-org/CogVideo)
- **MiniMax H3 (오픈웨이트)** — 2026-08-03 Hugging Face `MiniMaxAI/MiniMax-H3` 공개(API는 07-31), 33B 옴니모달(텍스트·이미지·영상·오디오 → 스테레오 사운드 포함 영상), fl2va/ref2va 체크포인트 최소 21GB, 로컬 네이티브 768px(2K는 2차 패스), 같은 날 ComfyUI PR #15224로 네이티브 지원 — [comfyui-wiki](https://comfyui-wiki.com/en/news/2026-08-03-minimax-h3-open-weights-comfyui), [NYU Shanghai RITS](https://rits.shanghai.nyu.edu/ai/minimax-ships-h3-weights-with-the-us-and-eu-excluded/) (검색 스니펫)
- **Wan2GP** — `deepbeepmeep/Wan2GP` 10,592★, 2025-02-27, pushed 2026-10-17: Wan 2.1/2.2, MiniMax H3, LTX-2/2.3/2.5, Hunyuan 1.5 등 지원, "as little as 6 GB of VRAM". v17.17(2026-10-07): "15 seconds of H3 video at 1080p used to require 25 GB of VRAM, now you just need 11 GB", 480p는 5–6GB; H3 full 33B와 pruned 20B 모델 언급 — [README](https://github.com/deepbeepmeep/Wan2GP)
- 가속/추론 프레임워크: `hao-ai-lab/FastVideo` 4,612★(Apache-2.0), `ModelTC/LightX2V` 2,916★(Apache-2.0), `leejet/stable-diffusion.cpp` 7,709★(MIT, Wan 포함 C/C++ 추론) — [FastVideo](https://github.com/hao-ai-lab/FastVideo), [LightX2V](https://github.com/ModelTC/LightX2V), [sd.cpp](https://github.com/leejet/stable-diffusion.cpp)
- 하네스의 로컬 모델 스위치: OpenMontage `.env`의 `VIDEO_GEN_LOCAL_MODEL=wan2.2-ti2v-5b  # or wan2.1-1.3b, wan2.1-14b, hunyuan-1.5, ltx2-local, cogvideo-5b` — [OpenMontage README](https://github.com/calesthio/OpenMontage)
- 클라우드 GPU 대안: fal 서버리스 H100 $2.49/hr, H200 $2.99/hr, B300 $5.99/hr — [fal pricing](https://fal.ai/pricing) (2026-10-17 접근)

### Inferences
- 코딩 에이전트 + 로컬 영상의 현실적 조합은 "24GB GPU + ComfyUI + comfy-mcp(또는 artokun) + Wan2.2 TI2V-5B / HunyuanVideo-1.5 / LTX(양자화)"이며, 16GB 이하라면 Wan2GP류 저VRAM 런처나 클라우드(fal/Comfy Cloud)로 넘기는 것이 comfy-mcp 자체 지침과도 맞는다.
- Mac(Apple Silicon)에서는 LTX 2.3 MLX가 사실상 유일한 실용 경로로 HyperFrames가 채택했다.
- 오픈웨이트의 품질 최전선은 2026-08 이후 MiniMax H3·LTX-2.5로 이동했지만, 둘 다 라이선스 조건(지역·매출)이 붙어 "Apache-2.0 무조건 상업 사용"은 Wan 2.2·Mochi·CogVideoX-2B 정도만 해당한다.

### Gaps
- Wan2.2 README의 GPU별 시간/피크 메모리 표 수치는 추출하지 못함(표 존재만 확인).
- LTX-2.5의 최소 VRAM 공식 수치 미확인(66GiB 다운로드·fp8/오프로드 옵션만 확인).
- MiniMax H3 오픈웨이트 라이선스 원문(지역 제외·$20M·표기 의무)은 2차 출처로만 확인 — Hugging Face 라이선스 원문 미열람.
- ComfyUI MCP별 영상 워크플로(Wan/LTX/H3 템플릿) 실제 동작은 설치 금지 제약으로 검증하지 않음.

## 3. 2026-08 ~ 2026-10 변화 (신규 모델·MCP 릴리스·가격)

### Takeaway
이 기간의 가장 큰 사건은 **Sora 2 API 제거(09-24)**, **MiniMax H3 API(07-31)→오픈웨이트(08-03)**, **Wan 3.0(08-24, 폐쇄형)**, **Gemini Omni 1.1 Flash(08-27)**, **LTX-2.5 + 새 라이선스(08-11)**, 그리고 **Runway의 호스티드 MCP 플러그인(09-11)·구 MCP 아카이브**다. Kling MCP는 10-17 현재 `kling-video-v4_0`을 기본 모델로 노출한다(출시일 미확인).

### Cited Findings

**날짜순 타임라인**
- 2026-07-31 (윈도 직전): Seedance 2.5 공식 출시(ModelArk API는 당시 "coming soon") — [llm-stats](https://llm-stats.com/blog/research/seedance-2-5-launch) (검색 스니펫); MiniMax H3 API 출시 — [comfyui-wiki](https://comfyui-wiki.com/en/news/2026-08-03-minimax-h3-open-weights-comfyui)
- 2026-08-03: MiniMax H3 가중치 HF 공개 + ComfyUI 네이티브 지원(PR #15224, 노드 4종·공식 워크플로 6종) — [comfyui-wiki](https://comfyui-wiki.com/en/news/2026-08-03-minimax-h3-open-weights-comfyui)
- 2026-08-04~05: Pika "API Club"(월 $10, 70+ 모델 단일 키) 출시 보도 — [Las Vegas Sun 검색 결과](https://lasvegassun.com/news/2026/aug/04/pika-cuts-ais-3x-markup-to-nearly-zero-with-a-10-a/) (원문 402 페이월, 검색 스니펫만; dev.pika.art 문서는 "prepaid balance"로 설명 — **미해결 상충**)
- 2026-08-07~10: Comfy-Org/comfy-mcp v0.7.0 → v0.10.0 — [releases](https://github.com/Comfy-Org/comfy-mcp/releases)
- 2026-08-11: "LTX-2.x Community License Agreement ... Dated August 11, 2026. This license is applicable to all LTX-2.5 versions released since August 11, 2026"; LTX-2 패키지 v1.2.0 — [LTX-2 LICENSE](https://github.com/Lightricks/LTX-2/blob/main/LICENSE), [releases](https://github.com/Lightricks/LTX-2/releases)
- 2026-08-20/21: MiniMax-MCP가 MCP Python SDK v2로 이전, 은퇴한 Music 참조 제거; MiniMax-MCP-JS push — [commits](https://github.com/MiniMax-AI/MiniMax-MCP/commits/main)
- 2026-08-24: Alibaba Wan 3.0(30초 1080p, $0.20/s, API 전용) — [The Next Web](https://thenextweb.com/news/alibaba-wan3-video-model-after-share-sale) (검색 스니펫)
- 2026-08-26: LTX-2 v1.3.0 — [releases](https://github.com/Lightricks/LTX-2/releases)
- 2026-08-27: Gemini Omni 1.1 Flash — 장면 연장 최대 40초, 시작/끝 프레임 지정, 360p 저가 프리뷰, 4K 업스케일; AI Studio·Gemini Enterprise Agent Platform — [Google blog](https://blog.google/innovation-and-ai/technology/developers-tools/build-with-gemini-omni-1-1-flash/) (검색 스니펫), [ETV Bharat](https://www.etvbharat.com/en/technology/google-gemini-omni-1-dot-1-flash-google-flow-enn26082900548). (원 Omni Flash는 2026-05-19 I/O 발표, 최대 10초 — [DataNorth](https://datanorth.ai/news/google-releases-gemini-omni-1-1-flash))
- 2026-09-05: 비공식 `DanikVR/omniflow-veo-mcp`(Google Flow, Veo 3/Omni 1.1) 생성 — [GitHub](https://github.com/DanikVR/omniflow-veo-mcp)
- 2026-09-11: `runwayml/runway-mcp-plugin` 생성(호스티드 `mcp.runwayml.com/mcp`, OAuth, 플랜 크레딧) — [GitHub](https://github.com/runwayml/runway-mcp-plugin)
- 2026-09-24: Sora 2 / Sora 2 Pro / Videos API 제거, 대체 없음 — [OpenAI Deprecations](https://developers.openai.com/api/docs/deprecations); Make.com 등 연동 서비스도 같은 날짜로 OpenAI 영상 모듈 폐기 공지 — [Make Help](https://help.make.com/openai-sora-and-video-modules-deprecation-by-september-24-2026?hl=en-GB)
- 2026-09-29~10-02: LTX-2 v1.4.0 / v1.4.1 / v1.4.2 — [releases](https://github.com/Lightricks/LTX-2/releases)
- 2026-09-30: `runwayml/runway-api-mcp-server` 마지막 push, 현재 archived — [GitHub](https://github.com/runwayml/runway-api-mcp-server)
- 2026-10-07: Wan2GP v17.17 — H3 1080p 15초 VRAM 25GB→11GB — [Wan2GP README](https://github.com/deepbeepmeep/Wan2GP)
- 2026-10-12: genmedia `mcp-avtool-go`에 `ffmpeg_extract_frame` 추가 — [commits](https://github.com/GoogleCloudPlatform/vertex-ai-creative-studio/commits/main/experiments/mcp-genmedia)
- 2026-10-15: Wan2GP "TaoMate H3 FL2VA" 3-step 가속 프로필(10-15 릴리스용) — [Wan2GP README](https://github.com/deepbeepmeep/Wan2GP)
- 2026-10-16: Gemini API 가격 페이지 "Last updated 2026-10-16 UTC" (Veo 3.1 Standard/Fast/Lite, Omni Flash 가격 수록) — [Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing)
- 2026-10-17: Kling 공식 MCP `mcpVersion 1.3.3`, 기본 모델 `kling-video-v4_0`(3–30초) — [kling.ai/mcp](https://kling.ai/mcp) (`who_am_i` 응답)

**윈도 이전이지만 현재 상태를 설명하는 사실 (오래된 사실 표시)**
- [2026-03-31] Veo 3.1 Lite 프리뷰 출시, "less than 50% of Veo 3.1 Fast", 720p/1080p, 4/6/8초 — [Google blog](https://blog.google/innovation-and-ai/technology/ai/veo-3-1-lite/) (검색 스니펫)
- [2026-03-24] Sora 단계적 종료 발표, 앱은 2026-04-26 종료 — [Zilliz FAQ](https://zilliz.com/ai-faq/what-is-the-sora-shutdown-timeline) (검색 스니펫)
- [2026-06-17] Kling 3.0 Turbo·Omni 출시, "Open Platform, MCP and CLI support programmatic and agent-led workflows" — [yespress](https://yespress.io/products/kling-ai.md) (검색 스니펫, 원문 403)
- MiniMax 가격 문서: 구 Hailuo 계열을 "discontinued"로 표기, H3는 종량제만("Video packages support Hailuo video models. MiniMax H3 is not supported yet") — [MiniMax pricing](https://platform.minimax.io/docs/guides/pricing-paygo)

### Inferences
- 2026-10 기준 "에이전트가 부를 수 있는 고급 폐쇄형 영상 API"의 축은 Google(Veo 3.1·Omni 1.1), Kling(3.0/4.0), ByteDance(Seedance 2.5), MiniMax(H3), Runway(Gen-4.5/Aleph 2)이며 OpenAI는 빠졌다.
- 오픈웨이트와 폐쇄형의 경계가 흐려졌다(H3: API·오픈웨이트 동시, LTX: 오픈웨이트 + API). 반대로 Wan은 3.0부터 폐쇄로 갔다.
- MCP 측면에서는 "로컬 stdio 서버 → 벤더 호스티드 원격 MCP"(Runway 아카이브→호스티드, Kling 호스티드) 이동이 이 기간에 뚜렷하다.

### Gaps
- Kling 4.0 출시일·공식 발표문 미확인(MCP 응답에서만 확인).
- Runway Gen-4.5·Aleph 2의 출시일 미확인(가격표에 `gen4.5`, `aleph2` 존재만 확인).
- Luma Ray 3.2 출시일 미확인("rates are subject to change ahead of general availability" 문구로 보아 GA 전 단계일 가능성).
- 이 기간 각 벤더의 가격 인하/인상 전후 비교 데이터는 찾지 못함(현재가만 확보).
- Seedance 2.5의 ModelArk API 실제 GA 날짜 미확인(byteplus.com 제품 페이지 제목에 "API Now Fully Available"만 확인).

## 4. 실무 지침: 생성 클립 vs 코드 애니메이션, 클립당 비용·지연, 출력물 라이선스

### Takeaway
생성 클립은 코드 렌더 영상(Remotion/HyperFrames)의 **B-roll·히어로 샷 에셋**으로 들어가는 것이 현재 오픈소스 하네스들의 공통 패턴이다(OpenMontage: Veo/Kling 클립 → Remotion 합성, 스토리보드 승인 게이트에서 에셋별 비용 표시; HyperFrames: 생성 영상은 `media-use resolve`가 로컬 파일로 고정). 클립 1개(5–10초) 비용은 대략 **$0.15(H3 Max Turbo 6초, fal) ~ $4.80(Veo 3.1 Standard 4K 8초)**, 지연은 Veo 공식 기준 **11초~6분**이다. 출력물 상업 사용은 대부분 유료 플랜에서 허용되나 Veo는 SynthID 워터마크가 들어가고, 오픈웨이트는 라이선스(특히 **한국 제외 조항**)를 먼저 봐야 한다.

### Cited Findings

**코드 렌더 영상에 생성 클립을 끼우는 실제 패턴**
- OpenMontage 사례: "a cinematic sci-fi trailer ... Veo-generated motion clips, soundtrack, and Remotion composition"; "6 Kling v3-generated motion clips (via fal.ai), Google Chirp3-HD narration" — [OpenMontage README](https://github.com/calesthio/OpenMontage)
- OpenMontage는 제작 전 "What it will cost at your target duration, before asset generation starts"를 제시하고, "Asset generation pauses on a scene-by-scene contact sheet — takes, prompts, per-asset cost, quality scores — so you approve the visuals before the render" — [OpenMontage README](https://github.com/calesthio/OpenMontage)
- OpenMontage 렌더 런타임: Remotion("data-driven explainers", 차트·스탯 카드·자막) vs HyperFrames("kinetic typography, product promos, launch reels, website-to-video")를 제안 단계에서 고정; 생성 대신 "use real footage only" 다큐 몽타주(Pexels·Archive.org·NASA 등 CLIP 인덱싱 스톡) 경로도 제공 — [OpenMontage README](https://github.com/calesthio/OpenMontage)
- OpenMontage 공급자 키: `FAL_KEY`(Veo, Kling, MiniMax 영상), `ATLASCLOUD_API_KEY`(Kling/Seedance/Hailuo), `KLING_API_KEY`(공식 Kling: 영상·이미지·TTS·아바타·립싱크), `ARK_API_KEY`(Seedance 2.0), `HEYGEN_API_KEY`("VEO, Sora, Runway, Kling via single gateway"), `RUNWAY_API_KEY` — [OpenMontage README](https://github.com/calesthio/OpenMontage)
- HyperFrames `media-use`: "No video generation → `resolve --type video` — HeyGen avatar video first (free-usage path...), local LTX fallback (`videogen`)...; image-to-video, photo-avatar, dub/translate remain manual `heygen` CLI recipes" — 로컬 설치본 `~/.claude/skills/media-use/references/meta.md`, `setup-providers.md` ([heygen-com/hyperframes](https://github.com/heygen-com/hyperframes))
- inference.sh 스킬 묶음은 `google-veo`·`seedance` 생성 스킬과 `remotion-render` 스킬, `explainer-video-guide`·`storyboard-creation`을 한 저장소에 함께 둔다 — [inference-sh/skills](https://github.com/inference-sh/skills)
- Google genmedia MCP는 생성(Veo/Omni/Imagen/Lyria/Chirp)과 ffmpeg 편집(`mcp-avtool-go`, 프레임 추출 등)을 같은 MCP 묶음으로 제공 — [mcp-genmedia](https://github.com/GoogleCloudPlatform/vertex-ai-creative-studio/tree/main/experiments/mcp-genmedia)

**클립당 비용 근거 (벤더 페이지, 2026-10-17 접근)**
- Google Gemini API: Veo 3.1 Standard $0.40/s(720p·1080p), $0.60/s(4K); Veo 3.1 Fast $0.10/s(720p), $0.12/s(1080p), $0.30/s(4K); Veo 3.1 Lite $0.05/s(720p), $0.08/s(1080p), 4K 미지원; 오디오 기본 포함, "You will only be charged if your video is successfully generated"; Gemini Omni Flash 영상 출력 $17.50/1M tokens ≈ 720p $0.10/s — [Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing)
- Runway API: $0.01/credit; `gen4.5` 12 cr/s, `gen4_turbo` 5, `act_two` 5, `aleph2` 28(최소 56), `veo3.1` 40(오디오)/20(무음), `veo3.1_fast` 15/10; Magnific 업스케일 프레임당 $0.007–0.012, 프레임레이트 향상 2초당 1크레딧, SDR→HDR(`ruby`) 20–40 cr/s — [Runway API pricing](https://docs.dev.runwayml.com/guides/pricing/)
- MiniMax: H3 768P $0.08/s, 2K $0.13/s; H3-Max 480P $0.05/s, 768P $0.08/s; 구 Hailuo-2.3-Fast 768P 6s $0.19, Hailuo-2.3/02 768P 6s $0.28·10s $0.56·1080P 6s $0.49 — [MiniMax pricing](https://platform.minimax.io/docs/guides/pricing-paygo)
- Luma Ray 3.2: 1080p SDR $1.20/5s·$3.60/10s, 720p $0.30/5s·$0.90/10s, 1080p HDR $2.40/5s, reframe 1080p $0.36/s, edit 1080p $2.16–4.32; "subject to change ahead of general availability" — [Luma pricing](https://docs.agents.lumalabs.ai/guides/pricing/)
- fal: MiniMax H3 Max t2v/i2v/ref2v $0.05/s, H3 Max Turbo $0.025/s; Kling v2.5-turbo pro $0.07/s, Kling v3 pro $0.14/s; Seedance 2 $0.014/1000 tokens — [fal pricing](https://fal.ai/pricing)
- BytePlus Seedance 2.5: 480p·720p $10.70/1M tokens(영상 입력 없음)·$6.40(영상 입력), 1080p $11.7·$7.0; 토큰팩 Light $32/5M(3개월) 등 — [BytePlus Seedance](https://www.byteplus.com/en/product/seedance), [ModelArk pricing](https://ai.byteplus.com/ark/region:ap-southeast-1/docs/ModelArk/1544106) (검색 스니펫, 원문 fetch 실패/절단); 5초 16:9 예시 $0.514(480p)·$1.156(720p) — [CometAPI](https://www.cometapi.com/seedance-2-5-api-pricing/) (2차 출처)
- Kling 소비자 크레딧(2026-07 도입가): Standard $6.99/660, Pro $25.99/3,000, Premier $64.99/8,000, 매월 무료 66 — [yespress](https://yespress.io/products/kling-ai.md) (검색 스니펫, 원문 403). Kling MCP는 이 멤버십 크레딧을 소비(`query_membership_and_credits`가 kling.ai 멤버십 페이지로 안내) — [kling.ai/mcp](https://kling.ai/mcp)
- Wan 3.0 $0.20/s — [The Next Web](https://thenextweb.com/news/alibaba-wan3-video-model-after-share-sale) (검색 스니펫)

**파생 계산 (위 단가 × 길이, 출력만·재시도 미포함)**
- Veo 3.1 Lite 720p 8초 = $0.40, 1080p 8초 = $0.64 / Veo 3.1 Fast 1080p 8초 = $0.96 / Veo 3.1 Standard 1080p 8초 = $3.20, 4K 8초 = $4.80 — [Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing)에서 계산
- Gemini Omni Flash 720p 10초 ≈ $1.00 — 같은 출처에서 계산
- Runway gen4.5 5초 = 60cr = $0.60, 10초 = $1.20 / gen4_turbo 10초 = $0.50 / aleph2 5초 = 140cr = $1.40 / Runway 경유 veo3.1(오디오) 8초 = 320cr = $3.20 — [Runway API pricing](https://docs.dev.runwayml.com/guides/pricing/)에서 계산
- Kling v3 pro(fal) 5초 = $0.70, 10초 = $1.40 / v2.5-turbo pro 5초 = $0.35 / MiniMax H3 Max Turbo(fal) 6초 = $0.15 — [fal pricing](https://fal.ai/pricing)에서 계산
- MiniMax H3 768P 6초 = $0.48, 10초 = $0.80 — [MiniMax pricing](https://platform.minimax.io/docs/guides/pricing-paygo)에서 계산
- Luma Ray 3.2 720p 5초 = $0.30, 1080p 5초 = $1.20 — [Luma pricing](https://docs.agents.lumalabs.ai/guides/pricing/)
- Wan 3.0 10초 = $2.00 — 2차 출처 단가로 계산

**지연·운영 특성**
- Veo: "Request latency: Min: 11 seconds; Max: 6 minutes (during peak hours)", 생성 영상은 서버에 2일 보관 후 삭제, 1080p/4K는 8초 필수, 연장은 720p만, 참조 이미지 최대 3장, first/last 프레임 보간 — [Veo docs](https://ai.google.dev/gemini-api/docs/veo)
- fal MCP `run_model`은 기본 45초 대기, 장시간 작업은 `submit_job`/`check_job`/`get_job_result` — [fal MCP docs](https://fal.ai/docs/documentation/setting-up/mcp.md)
- 로컬 기준: CogVideoX-5B 5초 영상 A100 ~180초/H100 ~90초 — [CogVideo README](https://github.com/zai-org/CogVideo); HunyuanVideo-1.5 distilled 4090에서 최대 75% 단축 — [README](https://github.com/Tencent-Hunyuan/HunyuanVideo-1.5)
- 저가 초안 → 고해상도 최종 흐름을 벤더가 직접 지원: Omni 1.1 Flash "360p previews ... save money", 4K 업스케일 — [Google blog](https://blog.google/innovation-and-ai/technology/developers-tools/build-with-gemini-omni-1-1-flash/) (검색 스니펫); Veo 3.1 Lite는 "rapid iteration" 용도 — [Google blog](https://blog.google/innovation-and-ai/technology/ai/veo-3-1-lite/) (검색 스니펫)

**출력물 라이선스·상업 사용**
- Veo: "Videos created by Veo are watermarked using SynthID" — [Veo docs](https://ai.google.dev/gemini-api/docs/veo)
- Runway: 회사는 Inputs/Outputs 소유권을 주장하지 않고 "does not restrict your commercial use of your Outputs"; 단 Free 티어는 상업 사용 불가, Runway 출력으로 경쟁 제품을 훈련·개발 금지, Enterprise 외 플랜은 기본적으로 학습에 사용 — [conductatlas (Runway ToS 조항)](https://conductatlas.com/platform/runway/runway-terms-of-service/company-does-not-restrict-commercial-use-of-outputs/), [terms.law](https://terms.law/ai-output-rights/runway/) (2차 정리)
- Kling: 무료 티어는 워터마크 + 상업 사용 금지, Standard 이상 유료는 워터마크 제거·상업 사용 가능, 이용약관상 Kling에 광범위한 콘텐츠 라이선스 부여 — [Segmind blog](https://blog.segmind.com/kling-ai-pricing-complete-breakdown-and-comparison/), [CometAPI](https://www.cometapi.com/are-kling-videos-private/) (2차 출처)
- Wan 2.2·Wan 2.1·Mochi: Apache-2.0 — [Wan2.2](https://github.com/Wan-Video/Wan2.2), [mochi](https://github.com/genmoai/mochi). CogVideoX: 코드·2B Apache-2.0, 5B는 별도 "CogVideoX LICENSE" — [CogVideo README](https://github.com/zai-org/CogVideo)
- LTX-2.x: Community License, 연매출 $10,000,000 이상 기업은 유료 "Commercial Use Agreement" 필요 — [LTX-2 LICENSE-2_x](https://github.com/Lightricks/LTX-2/blob/main/LICENSE-2_x)
- **HunyuanVideo-1.5: "THIS LICENSE AGREEMENT DOES NOT APPLY IN THE EUROPEAN UNION, UNITED KINGDOM AND SOUTH KOREA"**, Territory 밖에서 Works·Output 사용 금지, MAU 1억 초과 시 별도 라이선스, Output으로 타 모델 개선 금지 — [HunyuanVideo-1.5 LICENSE](https://github.com/Tencent-Hunyuan/HunyuanVideo-1.5/blob/main/LICENSE)
- **MiniMax H3 오픈웨이트: 미국·EU·영국·대한민국에서 로컬 배포 금지**, 상업 사용은 무료이나 UI에 "MiniMax H3" 표기 의무, 연매출 $20M 초과 시 서면 승인 필요 — [NYU Shanghai RITS](https://rits.shanghai.nyu.edu/ai/minimax-ships-h3-weights-with-the-us-and-eu-excluded/), [dev.to](https://dev.to/routeai_official/minimax-h3-is-open-weight-now-heres-whats-actually-downloadable-vs-api-only-441k) (검색 스니펫)
- 도구 자체 라이선스: Comfy-Org/comfy-mcp AGPL-3.0-or-later OR Commercial — [README](https://github.com/Comfy-Org/comfy-mcp); OpenMontage AGPL-3.0 — [GitHub](https://github.com/calesthio/OpenMontage)

### Inferences
- **코드 애니메이션이 맞는 곳(추론)**: UI 화면·제품 스크린샷, 텍스트/키네틱 타이포, 수치·차트·다이어그램, 로고·브랜드 컬러처럼 픽셀 정확도와 재현성이 필요한 장면, 반복 수정이 잦은 구간. 결정적(deterministic) 렌더라 재생성 비용이 0이고 버전 관리가 된다. 위 하네스들도 차트·자막·타이포는 Remotion/HyperFrames에 맡긴다는 점이 근거다.
- **생성 클립이 이득인 곳(추론)**: 실사 인물·손·제품이 실제 환경에 놓인 장면, 분위기용 B-roll(도시·자연·작업 현장), 오프닝/클로징 히어로 샷, 장면 전환용 추상 모션. 촬영/스톡으로 대체 가능한지 먼저 보고(OpenMontage의 "real footage only" 경로), 없을 때 생성한다.
- **조합 규칙(추론)**: 생성 클립은 5–10초 단위로 짧게 만들어 코드 컴포지션의 한 트랙(배경/풀스크린 컷)으로 넣고, 그 위 텍스트·로고·CTA는 코드로 오버레이한다. 생성 영상 안에 텍스트를 그리게 하지 않는다(수정 불가·오탈자 위험). 여러 컷에서 같은 인물/제품이 나오면 Kling Element·Veo reference/ingredients 같은 일관성 기능을 쓰고, first/last 프레임 지정으로 코드 장면과 이어붙인다.
- **비용 관리(추론)**: 초안은 Veo 3.1 Lite·Omni 360p·H3 Max Turbo·Luma 720p처럼 $0.15–0.40/클립대로 돌리고, 확정 컷만 1080p/4K로 재생성한다. 60초 프로모에 생성 B-roll 4–6컷(각 5–8초)을 쓰면 초안+최종 포함 대략 $3–$25 범위(단가 × 재시도 2–3회 가정)로, OpenMontage처럼 스토리보드 단계에서 에셋별 비용을 승인받는 게이트가 합리적이다.
- **파이프라인 고정(추론)**: 벤더 결과 URL은 만료된다(Veo 서버 보관 2일). 생성 직후 로컬 에셋으로 다운로드·해시·원장 기록(HyperFrames `media-use`의 "frozen local file + ledger record" 방식)해야 코드 렌더가 재현 가능하다.
- **한국 사용자 관점(추론)**: 로컬 오픈웨이트를 상업 영상에 쓸 때 HunyuanVideo-1.5·MiniMax H3는 라이선스상 한국이 적용 지역에서 빠지므로 배제하고, Wan 2.2(Apache-2.0)·LTX-2.x(매출 $10M 미만)·Mochi가 안전한 기본값이다. 폐쇄형은 유료 플랜(상업 사용 허용) 여부와 Veo SynthID 워터마크 고지를 확인한다.

### Gaps
- Google Gemini API/Vertex의 생성물 소유권·상업 사용 조항 원문 미확인(SynthID 워터마크만 확인).
- MiniMax, Seedance(BytePlus), Luma의 출력물 상업 사용 조항 원문 미확인.
- Kling·Runway 약관은 2차 정리 사이트로만 확인 — 원문 미열람.
- Kling 공식 API(Open Platform) 가격표는 `kling.ai/dev/pricing`이 클라이언트 렌더링이라 추출 실패; Kling MCP의 클립당 크레딧 소비량도 미확인(유료 호출 금지 제약).
- Pika API 가격은 상충(월 $10 클럽 보도 vs 선불 잔액 문서) — 미해결.
- Runway·Kling·Seedance·MiniMax·Luma의 실측 생성 지연(초) 공식 수치는 Veo 외에는 찾지 못함.
- "생성 클립 vs 코드 애니메이션" 선택 기준을 정량 비교한 1차 자료(연구·벤더 가이드)는 찾지 못함 — 위 지침은 하네스 설계와 단가에서 도출한 추론이다.
