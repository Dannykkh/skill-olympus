# 코딩 에이전트 영상 제작용 음성·자막·편집 파이프라인 도구 (2026-10-17 기준)

> 측정 기준: 아래 모든 GitHub 수치(★, 최근 push, 생성일, 라이선스, archived 여부, 릴리스 날짜)는 **2026-10-17에 인증된 `gh api` / `gh search repos`로 직접 측정**했다. "최근 push"는 `pushed_at`, 라이선스는 GitHub 감지값이며 `NOASSERTION`으로 나온 것은 LICENSE/README 원문을 따로 읽어 보정했다. 읽기 전용 조사였고 설치나 유료 API 호출은 하지 않았다. 단, 무료 공개 엔드포인트인 Edge 음성 목록은 GET으로 한 번 조회했다.
> 저장소 이동: `FunAudioLLM/CosyVoice`·`FunAudioLLM/SenseVoice` → `QwenAudio/*`, `NVIDIA/NeMo` → `NVIDIA-NeMo/Speech`, `supertone-inc/supertonic` → `supertone-oss-archive/supertonic`(archived), `rhasspy/piper`(archived) → `OHF-Voice/piper1-gpl`, `argmaxinc/WhisperKit` → `argmaxinc/argmax-oss-swift`, `SamurAIGPT/AI-Youtube-Shorts-Generator` → `Anil-matcha/AI-Youtube-Shorts-Generator`, `heygen-com/heygen-mcp`는 404다. 인용할 때 옛 경로를 쓰지 말 것.
> 로컬 경로 인용 해석: 본문의 "로컬 `media-use/...`·`hyperframes-cli/...`"는 이 PC에 설치된 HyperFrames 스킬 사본(`~/.claude/skills/`)을 읽은 것이다. 상위 원본은 아래 URL이며, upstream main과 내용이 다를 수 있다(경로 존재는 2026-10-17 `gh api`로 확인).
> - `media-use/audio/references/{tts,tts-to-captions,transcribe,bgm,requirements}.md` → https://github.com/heygen-com/hyperframes/tree/main/skills/media-use/audio/references
> - `media-use/audio/references/captions/{authoring,motion,transcript-handling}.md` → https://github.com/heygen-com/hyperframes/tree/main/skills/media-use/audio/references/captions
> - `media-use/references/operations.md` → https://github.com/heygen-com/hyperframes/blob/main/skills/media-use/references/operations.md
> - `media-use/scripts/lib/cutlist.mjs`, `media-use/audio/assets/sfx/` → https://github.com/heygen-com/hyperframes/tree/main/skills/media-use
> - `hyperframes-cli/references/beats.md` → https://github.com/heygen-com/hyperframes/blob/main/skills/hyperframes-cli/references/beats.md
> - `video-maker/references/{voice-captions,remotion-engine}.md`는 이 저장소의 `skills/video-maker/references/` 파일이다(HyperFrames와 무관한 자체 스킬).
> 표의 "—" 표기: 해당 항목을 찾지 못했다는 뜻이며 "존재하지 않음"을 뜻하지 않는다. MCP/스킬 열의 "—"는 `gh search repos "tts mcp"` 상위 15개와 공식 org에서 찾지 못했다는 의미로, 전수 조사가 아니다.

## 1. TTS/보이스오버: 저장소·★·최근 push·라이선스·한국어·타임스탬프·MCP/스킬

### Takeaway
에이전트가 한국어 음성과 **타임스탬프를 한 번에** 얻을 수 있는 공급자는 Typecast(단어+문자 단위, 공식 MCP·Claude 스킬·CLI 제공)와 HeyGen Starfish(단어 단위, 단 한국어 음성 존재 여부는 미확인)다. ElevenLabs는 한국어를 지원하지만 문자 단위 정렬만 주고, 로컬 MCP는 2026-08에 폐기되어 OAuth 호스티드 MCP로 바뀌었다. 오픈소스에서 한국어를 공식 지원하는 것은 Qwen3-TTS, Fun-CosyVoice3, Chatterbox Multilingual V3, GPT-SoVITS, MeloTTS, Supertonic 3(아카이브됨), Piper(`ko_KR` 1종), edge-tts(비공식 클라우드)다. Kokoro, Dia, Sesame CSM, Zonos, IndexTTS-2.5는 한국어를 지원하지 않는다.

### Cited Findings

**오픈소스/로컬 TTS (2026-10-17 측정)**

| 도구 | 저장소 · ★ · 최근 push | 라이선스 | 한국어 | 타임스탬프 | MCP/스킬 |
|---|---|---|---|---|---|
| Kokoro (원본 라이브러리) | [hexgrad/kokoro](https://github.com/hexgrad/kokoro) · 9,393 · **2025-08-06(14개월 정체, 옛 정보)** | Apache-2.0 | **없음.** HF `VOICES.md`의 언어는 미국·영국 영어, 일본어, 중국어, 스페인어, 프랑스어, 힌디어, 이탈리아어, 브라질 포르투갈어뿐이다 — [Kokoro-82M VOICES.md](https://huggingface.co/hexgrad/Kokoro-82M/raw/main/VOICES.md) | 라이브러리 자체는 확인하지 못함 | [mberg/kokoro-tts-mcp](https://github.com/mberg/kokoro-tts-mcp) 82★, push 2025-09-12 |
| Kokoro-FastAPI | [remsky/Kokoro-FastAPI](https://github.com/remsky/Kokoro-FastAPI) · 5,555 · 2026-10-14 (v0.8.0 2026-08-15 → v0.9.0 2026-09-10) | Apache-2.0 | Kokoro와 같다(없음) | "Per-word, or per-chunk timestamped caption generation"(`/dev/captioned_speech`) — [README](https://github.com/remsky/Kokoro-FastAPI) | OpenAI 호환 `/v1/audio/speech` |
| edge-tts | [rany2/edge-tts](https://github.com/rany2/edge-tts) · 12,304 · 2026-10-14 (7.3.0·7.3.1 2026-10-13) | **LGPLv3**(`srt_composer.py`만 MIT, gh 표기는 NOASSERTION) — [LICENSE](https://github.com/rany2/edge-tts/blob/master/LICENSE) | `ko-KR-SunHiNeural`, `ko-KR-InJoonNeural`, `ko-KR-HyunsuMultilingualNeural` (2026-10-17 Edge 공개 voices list 엔드포인트 조회 — [voices list](https://speech.platform.bing.com/consumer/speech/synthesize/readaloud/voices/list?trustedclienttoken=6A5AA1D4EAFF4E9FB37E23D68491D6F4)) | `Communicate(boundary=...)`의 기본값은 `"SentenceBoundary"`이고 `"WordBoundary"`를 고를 수 있다. `--write-subtitles`로 SRT를 만든다 — [communicate.py](https://github.com/rany2/edge-tts/blob/master/src/edge_tts/communicate.py), [README](https://github.com/rany2/edge-tts) | 커뮤니티 MCP는 소형뿐이다: [yuiseki/edge_tts_mcp_server](https://github.com/yuiseki/edge_tts_mcp_server) 8★ 등 |
| Piper | [rhasspy/piper](https://github.com/rhasspy/piper) 11,302 **archived** → [OHF-Voice/piper1-gpl](https://github.com/OHF-Voice/piper1-gpl) · 5,902 · 2026-10-16 (v1.6.1 2026-08-13, v1.7.0 2026-08-15, v1.8.0 2026-09-04) | **MIT → GPL-3.0로 변경** | `ko_KR-kss-medium` 1종 — [piper-voices voices.json](https://huggingface.co/rhasspy/piper-voices/raw/main/voices.json) | 확인 못 함 | — |
| F5-TTS | [SWivid/F5-TTS](https://github.com/SWivid/F5-TTS) · 15,415 · 2026-10-14 (1.1.22 2026-07-23) | 코드는 MIT, **사전학습 가중치는 CC-BY-NC**(Emilia 데이터) — [README](https://github.com/SWivid/F5-TTS) | 공식 README에서 한국어를 찾지 못함 | 없음(확인 못 함) | — |
| CosyVoice | [QwenAudio/CosyVoice](https://github.com/QwenAudio/CosyVoice) · 24,014 · 2026-05-25 | Apache-2.0 | Fun-CosyVoice 3.0은 9개 언어를 지원하며 한국어가 포함된다 — [README](https://github.com/QwenAudio/CosyVoice) | — | — |
| Chatterbox | [resemble-ai/chatterbox](https://github.com/resemble-ai/chatterbox) · 27,020 · 2026-07-21 | MIT | Multilingual V3(0.5B)의 23개 언어에 Korean(ko)이 포함된다. Single Language Pack 6종(zh, es-mx, pt-br, es-es, pt-pt 등)에는 한국어가 없고, Turbo(350M)는 저지연 영어용이다 — [README](https://github.com/resemble-ai/chatterbox) | — | — |
| Dia / Dia2 | [nari-labs/dia](https://github.com/nari-labs/dia) 19,407 · 2025-11-19 / [nari-labs/dia2](https://github.com/nari-labs/dia2) 1,183 · 2025-11-29 (**옛 정보**) | Apache-2.0 | "only supports English generation" — [README](https://github.com/nari-labs/dia) | — | — |
| Sesame CSM | [SesameAILabs/csm](https://github.com/SesameAILabs/csm) · 14,728 · **2025-05-27** | Apache-2.0 | 비영어는 "likely won't do well" — [README](https://github.com/SesameAILabs/csm) | — | — |
| Zonos | [Zyphra/Zonos](https://github.com/Zyphra/Zonos) · 7,236 · **2025-03-05** | Apache-2.0 | 영어·일본어·중국어·프랑스어·독일어만 지원하고 한국어는 없다 — [README](https://github.com/Zyphra/Zonos) | — | [PhialsBasement/Zonos-TTS-MCP](https://github.com/PhialsBasement/Zonos-TTS-MCP) 14★ (2025-05) |
| Fish Speech | [fishaudio/fish-speech](https://github.com/fishaudio/fish-speech) · 33,224 · 2026-10-14. **v3.0.0-beta "Fish Audio Drama 3 — Pre-Release" 2026-10-13** | **FISH AUDIO COMMUNITY LICENSE v1.0(2026-10-13 갱신)**. S2-Pro 가중치는 Fish Audio Research License — [LICENSE](https://github.com/fishaudio/fish-speech/blob/main/LICENSE) | S2는 "about a hundred languages"이고 한국어 README가 있다. Drama 3(35B-A3B MoE)는 다국어 클로닝 SOTA를 주장한다 — [README](https://github.com/fishaudio/fish-speech), [README.ko](https://github.com/fishaudio/fish-speech/blob/main/docs/README.ko.md). 한국어를 명시한 언어 목록은 확인하지 못함 | — | — |
| Qwen3-TTS | [QwenLM/Qwen3-TTS](https://github.com/QwenLM/Qwen3-TTS) · 13,829 · 2026-03-17 | Apache-2.0 | 10개 언어에 Korean이 포함되고, 한국어 프리셋 음성 "Sohee"가 있다 — [README](https://github.com/QwenLM/Qwen3-TTS) | — | — |
| IndexTTS-2.5 | [index-tts/index-tts](https://github.com/index-tts/index-tts) · 24,530 · 2026-09-29 (2.5 발표 2026-08-10, 태그 2026-08-13) | 자체 라이선스(gh 표기 NOASSERTION) | 중국어·영어·일본어·스페인어·아랍어만 지원하고 **한국어는 없다** — [README](https://github.com/index-tts/index-tts) | — | — |
| Supertonic | [supertone-oss-archive/supertonic](https://github.com/supertone-oss-archive/supertonic) · 13,769 · **archived**(최근 push 2026-09-09) | 코드 MIT | Supertonic 3(2026-04-29)은 31개 언어를 지원하며 한국어가 포함된다. 2026-05-20부터 Supertone Play/API에서 관리형으로 제공되고, README에 "Development and support have ended"라고 적혀 있다 — [README](https://github.com/supertone-oss-archive/supertonic) | — | — |
| GPT-SoVITS | [RVC-Boss/GPT-SoVITS](https://github.com/RVC-Boss/GPT-SoVITS) · 62,953 · 2026-10-08 | MIT | 교차언어 추론으로 영어·일본어·한국어·광둥어·중국어를 지원한다 — [README](https://github.com/RVC-Boss/GPT-SoVITS) | — | — |
| MeloTTS | [myshell-ai/MeloTTS](https://github.com/myshell-ai/MeloTTS) · 7,675 · **2024-12-24(옛 정보)** | MIT | Korean 샘플을 제공한다 — [README](https://github.com/myshell-ai/MeloTTS) | — | — |
| VibeVoice | [microsoft/VibeVoice](https://github.com/microsoft/VibeVoice) · 54,857 · 2026-10-08 | MIT | README가 이제 ASR 중심이다(2절 참고). TTS의 한국어 지원은 확인하지 못함 | — | — |
| Coqui XTTS v2 | [coqui-ai/TTS](https://github.com/coqui-ai/TTS) 46,127 · **2024-08-16 정체** / 포크 [idiap/coqui-ai-TTS](https://github.com/idiap/coqui-ai-TTS) 2,337 · 2026-10-16 | MPL-2.0(코드) | XTTSv2는 "17 languages"를 지원한다 — [idiap README](https://github.com/idiap/coqui-ai-TTS). 한국어 포함 여부는 이번에 확인하지 못함 | — | — |

**API 공급자와 MCP/스킬**

- **ElevenLabs 모델**: `eleven_v4`·`eleven_v4_turbo`는 "90+ languages", `eleven_v3`는 "70+", `eleven_multilingual_v2`는 29개 언어(한국어 포함)를 지원한다. STT는 `scribe_v2`·`scribe_v2_realtime`가 "Precise word-level timestamps"와 90개 이상 언어를 제공하고, 음악은 `music_v2_5`·`music_v2`다 — [ElevenLabs Models](https://elevenlabs.io/docs/overview/models). (주의: 모델 페이지를 요약 모델로 읽은 결과다. v3/v4의 한국어 포함은 요약이 "Yes"로 표기했을 뿐이며 원문 언어 목록과 줄 단위로 대조하지는 않았다.)
- **ElevenLabs 타임스탬프**: "Convert with timestamps"(`with-timestamps`) 엔드포인트(정확한 경로 문자열은 `[확인 필요]`)는 **문자 단위** 정렬만 반환한다(`alignment`, `normalized_alignment`, `characters`, `character_start_times_seconds`, `character_end_times_seconds`). 기본 모델은 `eleven_multilingual_v2`다 — [Convert with timestamps](https://elevenlabs.io/docs/api-reference/text-to-speech/convert-with-timestamps)
- **ElevenLabs MCP**: 공식 로컬 서버 [elevenlabs/elevenlabs-mcp](https://github.com/elevenlabs/elevenlabs-mcp)(1,535★, MIT)는 **archived** 상태이고 최근 push는 2026-08-20이다. README에는 "This local MCP server is deprecated in favor of the ElevenLabs hosted MCP server … `https://api.elevenlabs.io/v1/mcp` … authenticates with OAuth"와 "no longer actively maintained"라고 적혀 있다 — [README](https://github.com/elevenlabs/elevenlabs-mcp). 호스티드 MCP 문서가 다루는 범위는 에이전트 생성·설정, 대화·트랜스크립트 검색, 음성·프롬프트, 테스트, TTS(다운로드 링크 반환), 도구·지식베이스 관리다. **STT·효과음·음악은 언급되지 않으며** EU·인도·싱가포르 리전 URL이 있다 — [Hosted MCP](https://elevenlabs.io/docs/agents-platform/operate/hosted-mcp)
- **ElevenLabs 스킬**: [elevenlabs/skills](https://github.com/elevenlabs/skills)(493★, MIT, 생성 2026-01-24, push 2026-10-17)는 `text-to-speech`, `speech-to-text`, `sound-effects`, `music`, `dubbing`, `voice-changer`, `voice-isolator`, `agents`, `setup-api-key`, `mcp.json` 폴더로 구성된다(gh contents). 커뮤니티 서버 [mamertofabian/elevenlabs-mcp-server](https://github.com/mamertofabian/elevenlabs-mcp-server)는 119★, push 2026-09-28이다.
- **Typecast 타임스탬프**: `POST /v1/text-to-speech/with-timestamps`. 모델은 `ssfm-v30`(권장)과 `ssfm-v21`이고 텍스트는 1~2000자다. 응답에 **단어(`words`)와 문자(`characters`) 배열**이 함께 오며 각 원소는 `text`, `start`, `end`(초 단위)다. `granularity=word|char` 쿼리로 한쪽만 받을 수 있다. 공백이 없는 언어(일본어·중국어)는 단어 정렬이 문장 전체로 뭉치므로 `char`를 쓰라고 명시되어 있다 — [Typecast TTS with timestamps](https://typecast.ai/docs/api-reference/text-to-speech/text-to-speech-with-timestamps)
- **Typecast MCP·스킬·CLI**: [neosapience/typecast-api-mcp-server](https://github.com/neosapience/typecast-api-mcp-server)(3★, push 2026-10-15)는 `uvx`로 설치하며 `text_to_speech`, `text_to_speech_stream`, `text_to_speech_with_timestamps` 도구를 제공한다. [neosapience/typecast-skills](https://github.com/neosapience/typecast-skills)는 "The official Typecast Claude Skils"(MIT, 생성 2026-02-02, push 2026-10-14)로, `/plugin marketplace add neosapience/typecast-skills` 또는 `npx skills add`로 설치한다. 35개 이상 언어에 한국어가 포함되고 "Timestamp-aligned SRT/VTT output with shared rule across 11 SDKs + cast CLI"를 내세운다. 함께 [neosapience/cast](https://github.com/neosapience/cast) CLI(생성 2026-03-15)와 [neosapience/typecast-sdk](https://github.com/neosapience/typecast-sdk)(9★)가 있다.
- **HeyGen Starfish**: `POST /v3/voices/speech`가 `word_timestamps`(`word`/`start`/`end`)를 반환하고 `language`·`locale`(BCP-47) 파라미터가 있다. 해당 문서 페이지에 **한국어는 명시되어 있지 않다** — [HeyGen speech docs](https://developers.heygen.com/docs/voices/speech.md). 검색 요약은 `GET /v3/voices?engine=starfish`로 언어별 음성을 거를 수 있다고 하지만 원문으로 확인하지는 않았다 — [HeyGen generate-speech](https://developers.heygen.com/reference/generate-speech.md)
- **HeyGen MCP·CLI**: 공식 원격 MCP는 `https://mcp.heygen.com/mcp/v1/`이다("Official HeyGen MCP server. OAuth on first connection — runs against the user's existing HeyGen plan credits", `claude mcp add --transport http heygen …`) — [heygen-com/skills mcp.json](https://github.com/heygen-com/skills)(489★, MIT). [heygen-com/heygen-cli](https://github.com/heygen-com/heygen-cli)(154★, Apache-2.0, 생성 2026-03-30)의 `voice` 명령은 "List voices, design voices, generate speech"를 지원한다.
- **로컬 HyperFrames의 TTS 우선순위**: 1) HeyGen Starfish(단어 타임스탬프 있음) 2) ElevenLabs(표에 "No"로 기재) 3) Kokoro-82M(로컬 폴백, 54 voices) 순이다. `npx hyperframes tts`는 Kokoro 전용이다 — 로컬 `~/.claude/skills/media-use/audio/references/tts.md`. Kokoro 음성 프리픽스 표에는 a/b/e/f/h/i/j/p/z만 있고 **한국어가 없다**(같은 파일).
- **OpenAI TTS**: `gpt-4o-mini-tts`, `tts-1`, `tts-1-hd`와 내장 음성 13종이 있다. 언어 지원은 "generally follows the Whisper model"이지만 "voices are currently optimized for English"라고 되어 있고, TTS 응답의 타임스탬프나 정렬은 문서에 언급이 없다 — [OpenAI TTS guide](https://developers.openai.com/api/docs/guides/text-to-speech)
- **기타 MCP**: [MiniMax-AI/MiniMax-MCP](https://github.com/MiniMax-AI/MiniMax-MCP) 1,590★(MIT, push 2026-08-20). OpenAI TTS 기반 커뮤니티 MCP로 [JosefGold/tts-mcp](https://github.com/JosefGold/tts-mcp) 3★이 있다.
- **충돌 1 (Kokoro 한국어)**: 2026 비교 기사 검색 요약은 "Kokoro supports Korean"이라고 했다 — [codesota TTS guide](https://codesota.com/guides/tts-models), [SiliconFlow](https://www.siliconflow.com/articles/best-open-source-text-to-speech-models). 그러나 1차 출처인 [Kokoro-82M VOICES.md](https://huggingface.co/hexgrad/Kokoro-82M/raw/main/VOICES.md)와 로컬 HyperFrames 프리픽스 표에는 한국어가 없다. **1차 출처를 따른다.**
- **충돌 2 (ElevenLabs 타임스탬프)**: 로컬 HyperFrames `tts.md`는 ElevenLabs "Word timestamps: No"로 적는다. 단어 단위로는 맞지만, 실제로는 `/with-timestamps`가 문자 단위 정렬을 제공한다 — [ElevenLabs docs](https://elevenlabs.io/docs/api-reference/text-to-speech/convert-with-timestamps). HyperFrames는 이 정렬 대신 Whisper 재전사(Path B)를 쓴다 — 로컬 `media-use/audio/references/tts-to-captions.md`.

### Inferences
- 한국어는 띄어쓰기가 있으므로 Typecast `granularity=word`의 "단어"는 어절 단위가 될 가능성이 높다. 일본어·중국어처럼 문장 전체로 뭉치지는 않을 것으로 보이며, 로컬 `video-maker/references/voice-captions.md`의 "한국어는 어절 단위" 규칙과도 맞는다. 다만 실측하지는 않았다.
- 이 저장소의 `video-maker/references/voice-captions.md`에 남아 있는 `[확인 필요]` 두 건은 이번 조사로 해소된다. Typecast 타임스탬프는 초 단위이고 단어+문자를 모두 지원하며, Kokoro는 한국어를 지원하지 않는다.
- HyperFrames 기본 TTS 경로를 무키(no key)로 쓰면 Kokoro로 떨어지므로 **한국어 나레이션이 불가능하다.** 한국어 영상에서는 별도 TTS 경로가 필수다.
- 원본 저장소 기준으로 Dia/Dia2, Sesame CSM, Zonos, Kokoro, MeloTTS, coqui-ai/TTS는 8개월 이상 정체되어 있다. 새 파이프라인의 기본값으로는 부적합하다.
- 라이선스 위험이 있는 항목은 F5-TTS 가중치(비상업), Fish Speech(커뮤니티 라이선스, 2026-10-13 개정), edge-tts(LGPLv3이며 Microsoft의 비공식 Edge 읽어주기 엔드포인트를 사용), piper1-gpl(GPL-3.0)이다. 상업용 앱 홍보 영상에서는 Apache-2.0/MIT 계열(Qwen3-TTS, CosyVoice, Chatterbox)이 안전하다.

### Gaps
- HeyGen Starfish에 한국어 음성이 있는지 확인하지 못했다. 공개 문서에 명시가 없고, `GET /v3/voices?engine=starfish`는 자격증명이 필요해 읽기 전용 원칙상 호출하지 않았다.
- Typecast, ElevenLabs, 오픈 모델 간 **한국어 자연스러움(MOS) 직접 비교**의 신뢰할 만한 2026 자료는 찾지 못했다. 검색에 걸린 Podonos의 "OpenAI TTS for Korean" 글은 읽지 않았다.
- Eleven v4의 출시일과 한국어 포함 여부는 요약에만 근거하므로 원문 언어 목록으로 재확인이 필요하다.
- Chatterbox·Qwen3-TTS·CosyVoice3·Supertonic 3의 한국어 품질 실측, Supertonic 3 가중치 라이선스, Fish S2·Drama 3의 한국어 명시 여부, XTTS v2의 한국어 포함 여부는 확인하지 못했다.
- edge-tts `WordBoundary`가 한국어를 어절 단위로 경계 짓는지는 설치 금지 원칙 때문에 실행 검증하지 못했다.

## 2. 전사·정렬과 자막 도구: 신뢰할 수 있는 단어 타임스탬프와 한국어 주의점

### Takeaway
한국어 단어 타임스탬프의 무료 경로는 **WhisperX**(한국어 wav2vec2 정렬 모델 `kresnik/wav2vec2-large-xlsr-korean`을 기본 내장)와 **Qwen3-ForcedAligner-0.6B**(한국어 포함 11개 언어, 5분 이하 강제 정렬)가 가장 강하다. whisper.cpp와 faster-whisper도 다국어 모델과 `--language ko`를 쓰면 단어 단위를 낸다. 함정은 두 가지다. `.en` 모델은 비영어를 영어로 바꿔 버리며 HyperFrames `transcribe`의 기본값이 `small.en`이다. Parakeet v3에는 한국어가 없다. 유료 API 중 단어 타임스탬프는 OpenAI는 `whisper-1`에서만, ElevenLabs는 Scribe v2에서 제공된다.

### Cited Findings

**ASR/정렬 (2026-10-17 측정)**

| 도구 | 저장소 · ★ · 최근 push | 라이선스 | 단어 타임스탬프 | 한국어 |
|---|---|---|---|---|
| whisper.cpp | [ggml-org/whisper.cpp](https://github.com/ggml-org/whisper.cpp) · 54,442 · 2026-10-12 (v1.9.3 2026-08-20, v1.9.4 2026-09-11, v1.9.5 2026-10-06) | MIT | HyperFrames `transcribe`가 whisper.cpp JSON을 단어 단위로 사용한다 — 로컬 `media-use/audio/references/captions/transcript-handling.md` | 다국어 모델 + `--language ko` |
| faster-whisper | [SYSTRAN/faster-whisper](https://github.com/SYSTRAN/faster-whisper) · 25,906 · 2026-10-16 (기간 내 GitHub 릴리스 없음) | MIT | pycaps가 faster-whisper로 "word-level timestamps"를 생성한다 — [pycaps README](https://github.com/francozanardi/pycaps) | 다국어 |
| WhisperX | [m-bain/whisperX](https://github.com/m-bain/whisperX) · 24,624 · 2026-09-26 | BSD-2-Clause | wav2vec2 강제 정렬 | `DEFAULT_ALIGN_MODELS_HF`에 `"ko": "kresnik/wav2vec2-large-xlsr-korean"`이 있다 — [alignment.py L58](https://github.com/m-bain/whisperX/blob/main/whisperx/alignment.py) |
| stable-ts | [jianfch/stable-ts](https://github.com/jianfch/stable-ts) · 2,281 · **archived**(최근 push 2026-05-30) | MIT | — | — |
| openai/whisper | [openai/whisper](https://github.com/openai/whisper) · 110,722 · 2026-08-31 | MIT | — | 다국어 |
| Parakeet TDT 0.6B v3 | [HF 모델 카드](https://huggingface.co/nvidia/parakeet-tdt-0.6b-v3), NeMo는 [NVIDIA-NeMo/Speech](https://github.com/NVIDIA-NeMo/Speech) 18,593★ (**NeMo Speech 3.0 2026-08-07**) | CC-BY-4.0 | 단어·세그먼트·문자 단위 | **없음.** 유럽 25개 언어만 지원 |
| Qwen3-ASR / Qwen3-ForcedAligner | [QwenLM/Qwen3-ASR](https://github.com/QwenLM/Qwen3-ASR) · 3,714 · 2026-06-26 (공개 2026-01-29) | Apache-2.0 | ForcedAligner-0.6B: "timestamp prediction for arbitrary units within up to 5 minutes of speech in 11 languages" | ASR은 30개 언어+22개 방언에 Korean(ko) 포함. Aligner 11개 언어에도 Korean 포함 — [README](https://github.com/QwenLM/Qwen3-ASR) |
| SenseVoiceSmall | [QwenAudio/SenseVoice](https://github.com/QwenAudio/SenseVoice) · 9,520 · 2026-09-30 | MIT | — | 공개 체크포인트는 중국어·광둥어·영어·일본어·한국어 — [README](https://github.com/QwenAudio/SenseVoice) |
| VibeVoice-ASR | [microsoft/VibeVoice](https://github.com/microsoft/VibeVoice) · 54,857 · 2026-10-08 | MIT | "Who (Speaker), When (Timestamps), and What" 구조화 출력(세그먼트 수준으로 보임). **ASR-Streaming 2026-09-03**, BitNet CPU 엔진 2026-07-23 | 50개 이상 언어. MLC-Challenge 표에 Korean 행이 있다 — [vibevoice-asr.md](https://github.com/microsoft/VibeVoice/blob/main/docs/vibevoice-asr.md) |
| sherpa-onnx | [k2-fsa/sherpa-onnx](https://github.com/k2-fsa/sherpa-onnx) · 15,328 · 2026-10-17 (v1.13.5 2026-08-11 → v1.13.8 2026-09-10) | Apache-2.0 | — | — |
| insanely-fast-whisper | [Vaibhavs10/insanely-fast-whisper](https://github.com/Vaibhavs10/insanely-fast-whisper) · 13,054 · 2025-10-25 | Apache-2.0 | — | — |

- **HyperFrames 전사 규칙**: "**Always specify `--model` explicitly** — the CLI default is `small.en`, which silently translates non-English audio into English." 비영어는 `--model small --language <iso>`를 쓰고, 다국어는 `medium` 또는 `large-v3`(3.1 GB)를 권장한다 — 로컬 `~/.claude/skills/media-use/audio/references/transcribe.md`
- **OpenAI 전사 API**: 모델은 `gpt-transcribe`(권장), `gpt-4o-transcribe`, `gpt-4o-mini-transcribe`, `gpt-4o-transcribe-diarize`, `whisper-1`(legacy)이다. 문서에는 "The `timestamp_granularities[]` parameter is only supported for `whisper-1`"라고 되어 있다 — [OpenAI STT guide](https://developers.openai.com/api/docs/guides/speech-to-text)
- **ElevenLabs Scribe v2 / v2 Realtime**: "Precise word-level timestamps", 90개 이상 언어 — [ElevenLabs Models](https://elevenlabs.io/docs/overview/models)
- **FFmpeg 8.0 "Huffman"(2025-08-22, 옛 정보)**: whisper 필터가 병합되었다. whisper.cpp가 필요하고 `--enable-whisper`로 빌드해야 하며, SRT나 JSON(HTTP 전송)으로 출력할 수 있다 — [Phoronix](https://www.phoronix.com/news/FFmpeg-Lands-Whisper), [heise](https://www.heise.de/en/news/FFmpeg-8-0-integrates-Whisper-Local-audio-transcription-without-the-cloud-10522091.html?view=print)
- **한국어 CER (2차 자료, 원문 미확인)**: WebSearch 요약에 FLEURS+Common Voice 합산 기준 Whisper-large-v3 CER 5.72%, 한국어 특화 BuzzASR 4.61%가 등장한다. FLEURS 기준 Qwen3-ASR-1.7B 4.60%(3.62~5.65), whisper-large-v3 4.89%(3.93~5.90)라는 수치도 있다. **어느 페이지의 수치인지는 요약이 밝히지 않았고 원문 페이지를 열어 확인하지 않았다.** 출처 후보는 검색 결과의 [BuzzASR/korean 모델 카드](https://huggingface.co/BuzzASR/korean)와 [handy.computer 언어별 모델](https://models.handy.computer/languages/ko)이다. 수치는 참고로만 쓰고 인용 전에 원문을 확인해야 한다.

**자막 스타일링·번인(애니메이션/가라오케)**

- **Remotion**: [remotion-dev/remotion](https://github.com/remotion-dev/remotion)은 64,642★, push 2026-10-17이며 v4.0.531(2026-09-30)부터 v4.0.536(2026-10-16)까지 릴리스됐다. 라이선스는 이원 구조로, 개인과 소규모 회사는 상업 용도까지 무료지만 "a company license is required for for-profit organizations of a certain size"다 — [LICENSE.md](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md). 자막은 `@remotion/captions`의 `Caption { text, startMs, endMs, timestampMs, confidence }`, `parseSrt`, `createTikTokStyleCaptions`를 쓰고, 전사는 `@remotion/install-whisper-cpp`(16kHz WAV)로 한다 — 이 저장소의 `~/.claude/skills/video-maker/references/voice-captions.md`, `remotion-engine.md` (remotion.dev 원문과 다시 대조하지는 않음). 템플릿 [remotion-dev/template-tiktok](https://github.com/remotion-dev/template-tiktok)은 289★, push 2026-10-16이며 라이선스는 감지되지 않았다.
- **HyperFrames**: [heygen-com/hyperframes](https://github.com/heygen-com/hyperframes)는 65,513★, Apache-2.0, **생성 2026-03-10**이며 v0.8.162(2026-10-15)부터 v0.8.167(2026-10-17)까지 거의 매일 릴리스된다. 상위 저장소에 `skills/embedded-captions`가 **실제로 있다**(첫 커밋 2026-06-14, 최근 커밋 2026-10-12). 이 스킬은 단일 화자 토킹헤드 영상용이며 "35-style catalog", 기본은 `rail`(하단 자막)이고 피크 단어를 피사체 뒤로 합성하는 `embed`(매팅)를 쓴다. 전사와 매팅까지 로컬에서 수행한다 — [embedded-captions/SKILL.md](https://github.com/heygen-com/hyperframes/blob/main/skills/embedded-captions/SKILL.md). 로컬 설치본에는 이 스킬이 없고, 자막 규칙은 `media-use/audio/references/captions/`에 있다. 이곳의 규칙은 "All energy levels use karaoke highlight as the baseline"과 `caption-pill-karaoke` 등이다 — 로컬 `captions/motion.md`, `captions/authoring.md`.
- **pycaps**: [francozanardi/pycaps](https://github.com/francozanardi/pycaps)는 228★, MIT, **v0.3.0 2026-09-30**이다. CSS로 자막을 렌더링하며 `.word-being-narrated` 상태 선택자, 템플릿, 정규식/AI 단어 태깅, Whisper/faster-whisper 단어 타임스탬프를 지원한다. 단일 HTTP 호출로 번인하는 tscaps API도 있다 — [README](https://github.com/francozanardi/pycaps)
- **정체된 자막 저장소(옛 정보)**: [m1guelpf/auto-subtitle](https://github.com/m1guelpf/auto-subtitle) 2,291★(push 2024-07-12), [unconv/captacity](https://github.com/unconv/captacity) 139★(push 2024-06-07)
- **Kinocut 자막 번인**: `video.ai_transcribe(...)` → `video.subtitles(..., subtitle_file="captions.srt")` — [KyaniteLabs/kinocut README](https://github.com/KyaniteLabs/kinocut)

### Inferences
- TTS로 만든 나레이션은 **대본을 이미 알고 있으므로** 자유 ASR보다 강제 정렬(WhisperX align, Qwen3-ForcedAligner)이 낫다. 브랜드명·앱 이름 오인식을 원천적으로 피할 수 있다. 다만 Qwen3-ForcedAligner는 5분 제한이 있어 긴 영상은 분할해야 한다.
- 한국어 정렬 품질은 WhisperX의 경우 `kresnik/wav2vec2-large-xlsr-korean` 모델에 좌우된다. Whisper 토큰 타임스탬프(whisper.cpp/faster-whisper)는 별도 정렬 모델이 없어 단어 경계 오차가 더 클 수 있으나 실측 비교 자료는 없다.
- 유료 경로에서 단어 단위 자막이 필요하면 OpenAI는 `whisper-1`로 강제되며, 최신 `gpt-transcribe` 계열은 타임스탬프용으로 쓸 수 없다.
- 상위 HyperFrames의 `embedded-captions`는 실사 토킹헤드 영상용이다. 앱 홍보 영상(UI 화면과 모션 그래픽 위주)에는 `media-use` 자막 규칙이나 Remotion `createTikTokStyleCaptions`가 더 맞는다.
- stable-ts가 아카이브되었으므로 이를 기반으로 한 자막 파이프라인은 대체가 필요하다.

### Gaps
- 한국어 단어 타임스탬프 정확도(경계 오차 ms)를 whisper.cpp, faster-whisper, WhisperX, Qwen3-ForcedAligner 사이에서 직접 비교한 자료는 찾지 못했다.
- `@remotion/captions`의 최신 API를 remotion.dev 원문으로 재확인하지 못했다(로컬 스킬 문서에 근거).
- ASS `\k` 가라오케 태그를 FFmpeg libass로 번인할 때 한국어 폰트 처리 문제는 이번 범위에서 조사하지 못했다.
- VibeVoice-ASR 표의 Korean 행 수치(4.52 / 15.35 / 16.07 / 9.65)가 어느 지표(CER/WER)와 어느 모델에 해당하는지 원문에서 확인하지 못했다.

## 3. 편집·후처리: FFmpeg MCP, auto-editor, 무음 컷, 9:16 리프레이밍, 비트 싱크, 음악/SFX

### Takeaway
"FFmpeg MCP" 생태계는 파편화되어 있다. 최상위가 153★이고 대부분 정체 상태다. 유지보수가 활발하고 에이전트 친화적인 범용 편집 MCP로는 **KyaniteLabs/kinocut**(Apache-2.0, 203개 도구, FFmpeg+HyperFrames, 2026-10 릴리스)이 거의 유일하다. 무음 컷은 **auto-editor**(31.x, 2026-10 릴리스)가 표준이다. 리프레이밍, 비트 검출, 음악/SFX는 MCP보다 CLI·라이브러리(HyperFrames `beats`, librosa, beat_this, ElevenLabs music/SFX 스킬)를 조합하는 편이 현실적이다.

### Cited Findings

**FFmpeg/영상 편집 MCP (`gh search repos` 2026-10-17, ★순)**
- [video-creator/ffmpeg-mcp](https://github.com/video-creator/ffmpeg-mcp) 153★, MIT, push 2026-05-20 / [egoist/ffmpeg-mcp](https://github.com/egoist/ffmpeg-mcp) 120★, push 2025-03-29 / [kevinwatt/ffmpeg-mcp-lite](https://github.com/kevinwatt/ffmpeg-mcp-lite) 28★, MIT, push 2026-05-08 / [dubnium0/ffmpeg-mcp](https://github.com/dubnium0/ffmpeg-mcp) 21★ / [AmolDerickSoans/ffmpeg-mcp](https://github.com/AmolDerickSoans/ffmpeg-mcp) 14★ (2025-03). 나머지는 모두 11★ 이하다.
- [KyaniteLabs/kinocut](https://github.com/KyaniteLabs/kinocut): 206★, Apache-2.0, 생성 2026-03-21. 릴리스는 **v1.15.0(2026-08-19, "first-class Windows support")**, v1.16.0(2026-10-03), v1.16.1(2026-10-06)이다. README에 따르면 "guardrailed local video-editing surface"이고 "203 MCP tools on development tip"을 갖췄으며, FFmpeg·HyperFrames·Shorts/Reels 리퍼포징·품질 게이트·"Video Receipts"와 Python 클라이언트·`kino` CLI를 제공한다. 예시 프롬프트는 "Trim … add burned captions, make it vertical, and quality-check it"이다.
- [burningion/video-editing-mcp](https://github.com/burningion/video-editing-mcp): 294★, 라이선스 없음, push 2025-10-09. "MCP Interface for Video Jungle"(외부 서비스 연동)이다.
- 신규 소형 프로젝트: [cueframe-ai/cueframe-mcp](https://github.com/cueframe-ai/cueframe-mcp)(0★, Apache-2.0, **생성 2026-10-10**, Claude Code·Codex·Cursor·ChatGPT용 편집 MCP와 스킬), [dr-ashraf-s-MCP-LABS/video-editor-mcp](https://github.com/dr-ashraf-s-MCP-LABS/video-editor-mcp)(0★, **생성 2026-08-19**, ffmpeg·Whisper 자막·beat-sync), [IslePrince/video-editor-mcp](https://github.com/IslePrince/video-editor-mcp)(0★, push 2026-10-06, Go/FFmpeg)
- NLE 연동: [samuelgursky/davinci-resolve-mcp](https://github.com/samuelgursky/davinci-resolve-mcp)는 3,582★, MIT이며 2026-10-17 하루에 v4.13.3~v4.13.7을 연속 릴리스했다. [sun-guannan/VectCutAPI](https://github.com/sun-guannan/VectCutAPI)는 2,309★, Apache-2.0, push 2026-10-16이다.
- 범용 라이브러리: [Zulko/moviepy](https://github.com/Zulko/moviepy) 14,994★, MIT, push 2026-08-26 / [mifi/editly](https://github.com/mifi/editly) 5,526★, push 2025-05-12(정체) / [mifi/lossless-cut](https://github.com/mifi/lossless-cut) 44,638★, GPL-2.0(GUI 앱)
- **FFmpeg 9.0**: 태그 `n9.0`의 커밋 날짜는 2026-08-03이다. Changelog에는 "ONNX Runtime DNN backend with GPU execution provider support", `v360_vulkan`, `transpose_cuda`, Animated WebP decoder/demuxer, CELT 디코딩 제거 등이 있다. 발췌한 부분에서 새 ASR 항목은 보이지 않았다 — [FFmpeg Changelog @ n9.0](https://github.com/FFmpeg/FFmpeg/blob/n9.0/Changelog). 최신 태그는 n9.0.2다.

**무음 컷**
- [WyattBlue/auto-editor](https://github.com/WyattBlue/auto-editor): 5,536★, Unlicense, push 2026-10-17. 릴리스는 31.4.0(2026-07-28), 31.5.0(2026-08-13), 31.6.0(2026-09-06), 31.7.0(2026-10-02), **31.7.2(2026-10-03)**다.
- 로컬 HyperFrames `media-use`는 `auto-editor in.mp4 --edit audio:threshold=4% -o tight.mp4`를 권장하고, 별도로 전사 기반 `transcript-cut.mjs --cut-silence <초>`(단어 간 공백 기준, 양쪽 패딩 0.15초)를 제공한다 — 로컬 `media-use/references/operations.md`, `media-use/scripts/lib/cutlist.mjs`

**9:16 리프레이밍**
- [Anil-matcha/AI-Youtube-Shorts-Generator](https://github.com/Anil-matcha/AI-Youtube-Shorts-Generator): 5,432★, MIT, push 2026-10-11 / [fralapo/clippyme](https://github.com/fralapo/clippyme): 60★, MIT, 생성 2026-04-01, "self-hosted Opus Clip alternative" / [KazKozDev/auto-vertical-reframe](https://github.com/KazKozDev/auto-vertical-reframe): 24★, MIT, 생성 2026-04-19, "YOLO tracking" / [ClipsAI/clipsai](https://github.com/ClipsAI/clipsai): 552★, **push 2024-01-17(정체)**
- 로컬 HyperFrames의 `hyperframes-keyframes` 스킬은 punch-in, zoom, **reframe**, Ken Burns 같은 시크 안전 키프레임을 다룬다. `media-use/references/operations.md`에는 "Reframe / crop: change aspect ratio" 절차가 있다(로컬 스킬 설명·파일).

**비트 검출**
- 로컬 `hyperframes-cli/references/beats.md`: "Use `hyperframes beats` when an existing HyperFrames project needs the Studio-compatible beat file for its music track."
- [librosa/librosa](https://github.com/librosa/librosa) 8,686★, ISC, push 2026-10-06 / [CPJKU/beat_this](https://github.com/CPJKU/beat_this) 425★, MIT, push 2026-05-28 / [CPJKU/madmom](https://github.com/CPJKU/madmom) 1,727★, push 2026-03-20

**음악/SFX**
- ElevenLabs `music_v2_5`·`music_v2` — [Models](https://elevenlabs.io/docs/overview/models). `sound-effects`·`music` 스킬 폴더 — [elevenlabs/skills](https://github.com/elevenlabs/skills)
- 로컬 HyperFrames: BGM은 "HeyGen retrieval — the default when credentialed. Search HeyGen's music catalog by mood"(`media-use/audio/references/bgm.md`). 번들 SFX로 `chime`, `glitch-2/3`, `impact-bass-1/2`, `riser`, `whoosh-cinematic` mp3가 들어 있다(`media-use/audio/assets/sfx/`). 덕킹과 보이스오버 카브(carve)는 `hyperframes-audio` 스킬이 담당한다.
- 오픈 모델: [ace-step/ACE-Step](https://github.com/ace-step/ACE-Step) 4,945★, Apache-2.0, push 2026-02-15 / [facebookresearch/audiocraft](https://github.com/facebookresearch/audiocraft) 23,737★, MIT, push 2026-03-03 / [hkchengrex/MMAudio](https://github.com/hkchengrex/MMAudio) 2,287★, MIT, push 2026-02-23(영상→오디오)

### Inferences
- FFmpeg MCP 서버들은 셸 명령을 감싼 얇은 래퍼여서 별 수가 적고 대부분 2025~2026 상반기에 정체되었다. 코딩 에이전트는 이미 Bash로 `ffmpeg`를 직접 실행할 수 있으므로, MCP를 따로 붙이는 실익은 Kinocut처럼 **가드레일(검증된 플래그, 품질 게이트, 영수증)**을 줄 때 생긴다.
- davinci-resolve-mcp는 활발하지만 DaVinci Resolve 설치와 GUI 세션이 필요해 헤드리스 에이전트 렌더 파이프라인에는 맞지 않는다.
- 앱 홍보 영상은 이미 촬영된 가로 영상을 자르는 작업이 아니라 처음부터 합성하는 작업이다. 따라서 9:16은 YOLO 리프레이밍보다 컴포지션 해상도(1080×1920)를 직접 지정하는 편이 맞다. 리프레이밍 도구는 실사 롱폼을 숏폼으로 바꿀 때만 필요하다.
- FFmpeg 9.0의 ONNX Runtime DNN 백엔드는 장래에 FFmpeg 내부 ML 필터(배경 제거, 업스케일 등) 확장의 기반이 될 수 있다. 다만 이번에 확인한 범위에서 자막·음성과 직접 관련된 변화는 없다.

### Gaps
- VectCutAPI의 기능(CapCut/剪映 드래프트 API 및 MCP 여부)은 README를 읽지 않아 확인하지 못했다.
- FFmpeg 9.0의 공식 발표일(태그 커밋 날짜로 대체했다)과 whisper 필터의 9.0 빌드 기본 포함 여부는 확인하지 못했다.
- 음악 생성 모델(ACE-Step 1.5 등 후속판)의 2026-08~10 신규 릴리스는 조사하지 못했다.
- 한국어 자막 번인 시 폰트(Pretendard, Noto Sans KR) 로딩 이슈를 다룬 비교 자료는 찾지 못했다.

## 4. 2026-08~10에 바뀐 것 (새 릴리스, 새 MCP 서버)

### Takeaway
이 기간의 핵심 변화는 세 가지다. 첫째, ElevenLabs가 로컬 MCP를 폐기하고 OAuth 호스티드 MCP와 스킬 저장소로 이동했다. 둘째, Supertone의 Supertonic(한국어 지원 온디바이스 TTS)이 아카이브되어 관리형 API로 넘어갔다. 셋째, HyperFrames, Typecast, Kinocut, Remotion, auto-editor, whisper.cpp가 거의 매주 릴리스를 냈다. Fish Audio Drama 3(2026-10-13)와 IndexTTS-2.5(2026-08)는 새로 나왔지만, IndexTTS-2.5는 한국어를 지원하지 않는다.

### Cited Findings
- 2026-08-03: FFmpeg `n9.0` 태그 — [Changelog](https://github.com/FFmpeg/FFmpeg/blob/n9.0/Changelog)
- 2026-08-07: NVIDIA NeMo Speech 3.0(저장소가 `NVIDIA-NeMo/Speech`로 이동) — [releases](https://github.com/NVIDIA-NeMo/Speech/releases)
- 2026-08-10(발표)·08-13(태그): IndexTTS-2.5. 중국어·영어·일본어·스페인어·아랍어를 지원하고 vLLM 배포를 지원한다 — [index-tts](https://github.com/index-tts/index-tts)
- 2026-08-13 ~ 10-03: auto-editor 31.5.0 → 31.7.2 — [releases](https://github.com/WyattBlue/auto-editor/releases)
- 2026-08-13 ~ 09-04: piper1-gpl v1.6.1 → v1.8.0 — [releases](https://github.com/OHF-Voice/piper1-gpl/releases)
- 2026-08-15 ~ 09-10: Kokoro-FastAPI v0.8.0 → v0.9.0 — [releases](https://github.com/remsky/Kokoro-FastAPI/releases)
- 2026-08-19: Kinocut 1.15.0(Windows 정식 지원) → 10-03 1.16.0 → 10-06 1.16.1 — [releases](https://github.com/KyaniteLabs/kinocut/releases). 같은 날 신규 `dr-ashraf-s-MCP-LABS/video-editor-mcp`가 생성됐다 — [repo](https://github.com/dr-ashraf-s-MCP-LABS/video-editor-mcp)
- 2026-08-20: `elevenlabs/elevenlabs-mcp`의 마지막 push(현재 archived)와 호스티드 MCP `https://api.elevenlabs.io/v1/mcp`로의 전환 안내 — [README](https://github.com/elevenlabs/elevenlabs-mcp). 같은 날 `elevenlabs-mcp-player`도 마지막으로 push됐다 — [repo](https://github.com/elevenlabs/elevenlabs-mcp-player)
- 2026-08-20 / 09-11 / 10-06: whisper.cpp v1.9.3 / v1.9.4 / v1.9.5 — [releases](https://github.com/ggml-org/whisper.cpp/releases)
- 2026-08-25: `heygen-com/hyperframes-community-skills` 생성(212★, Apache-2.0) — [repo](https://github.com/heygen-com/hyperframes-community-skills)
- 2026-09-03: VibeVoice-ASR-Streaming — [README](https://github.com/microsoft/VibeVoice)
- 2026-09-09: Supertonic 마지막 push 후 archived. "Development and support have ended"이며 가중치는 `supertone-oss-archive` HF 네임스페이스로 옮겨졌다 — [README](https://github.com/supertone-oss-archive/supertonic)
- 2026-09-30: pycaps v0.3.0 — [releases](https://github.com/francozanardi/pycaps/releases)
- 2026-09-30 ~ 10-16: Remotion v4.0.531 → v4.0.536 — [releases](https://github.com/remotion-dev/remotion/releases)
- 2026-10-10: `cueframe-ai/cueframe-mcp` 생성 — [repo](https://github.com/cueframe-ai/cueframe-mcp)
- 2026-10-12: HyperFrames `embedded-captions` 스킬 최근 커밋 — [commits](https://github.com/heygen-com/hyperframes/commits/main/skills/embedded-captions)
- 2026-10-13: edge-tts 7.3.0·7.3.1 — [releases](https://github.com/rany2/edge-tts/releases). 같은 날 Fish Speech v3.0.0-beta "Fish Audio Drama 3 — Pre-Release"와 FISH AUDIO COMMUNITY LICENSE v1.0 개정이 나왔다 — [releases](https://github.com/fishaudio/fish-speech/releases), [LICENSE](https://github.com/fishaudio/fish-speech/blob/main/LICENSE)
- 2026-10-14 ~ 15: Typecast `typecast-skills`, `typecast-api-mcp-server`, `cast`, `n8n-nodes-typecast`, `pipecat-typecast` 일제 업데이트 — [neosapience org](https://github.com/neosapience)
- 2026-10-15 ~ 17: HyperFrames v0.8.162 → v0.8.167 — [releases](https://github.com/heygen-com/hyperframes/releases). davinci-resolve-mcp v4.13.2 → v4.13.7 — [releases](https://github.com/samuelgursky/davinci-resolve-mcp/releases)

### Inferences
- MCP 배포 형태가 "로컬 uvx/npx 서버"에서 "**OAuth 원격 HTTP MCP + 에이전트 스킬 저장소**"로 옮겨가고 있다. ElevenLabs(`api.elevenlabs.io/v1/mcp` + `elevenlabs/skills`), HeyGen(`mcp.heygen.com/mcp/v1/` + `heygen-com/skills`), Typecast(MCP + `typecast-skills` Claude 플러그인 마켓)가 같은 방향이다. 단 ElevenLabs 호스티드 MCP 문서는 에이전트 플랫폼 중심이어서 영상 파이프라인의 STT·SFX·음악은 스킬이나 직접 API로 써야 할 것으로 보인다.
- 한국어 사용자 입장에서 한국어를 지원하던 경량 온디바이스 TTS(Supertonic)가 사라졌다. 따라서 무료·로컬 한국어 TTS 선택지는 Qwen3-TTS, CosyVoice3, Chatterbox ML V3(GPU 필요 쪽)와 Piper `ko_KR-kss-medium`(CPU), edge-tts(클라우드)로 좁혀졌다.

### Gaps
- OpenAI `gpt-transcribe` 모델과 ElevenLabs `eleven_v4`가 언제 출시됐는지는 확인하지 못했다(2026-08~10 해당 여부 미상).
- 기간 내 릴리스가 없는 faster-whisper·WhisperX·Chatterbox·CosyVoice에 태그 없는 커밋 단위 변화가 있는지는 조사하지 않았다.

## 5. 추천 조합: 한국어 앱 홍보 영상(보이스오버+자막)의 기본 파이프라인과 무료/로컬 폴백

### Takeaway
**기본(유료)**: Typecast `ssfm-v30` 한국어 음성으로 `with-timestamps`(granularity=word)를 호출해 음성과 어절 타이밍을 한 번에 받는다. 이를 HyperFrames `media-use` 가라오케 자막(또는 Remotion `createTikTokStyleCaptions`)에 넣고, BGM/SFX는 HeyGen 검색이나 ElevenLabs music/SFX와 번들 SFX로 덕킹 믹스한 뒤 FFmpeg로 마무리한다. **무료·로컬 폴백**: edge-tts `ko-KR-SunHiNeural`/`InJoonNeural`(인터넷 필요, 비공식) 또는 완전 오프라인 Qwen3-TTS·CosyVoice3로 음성을 만들고, 대본 기반 강제 정렬(WhisperX `ko` 또는 Qwen3-ForcedAligner)로 단어 타이밍을 뽑는다. 마지막으로 whisper `--language ko`(`.en` 금지)로 발음을 QA한다.

### Cited Findings
- Typecast는 단어와 문자 타임스탬프를 초 단위로 함께 반환하고 `ssfm-v30`을 권장한다 — [Typecast docs](https://typecast.ai/docs/api-reference/text-to-speech/text-to-speech-with-timestamps). 공식 MCP(`text_to_speech_with_timestamps`)와 Claude 플러그인 스킬(SRT/VTT 규칙)이 있다 — [typecast-api-mcp-server](https://github.com/neosapience/typecast-api-mcp-server), [typecast-skills](https://github.com/neosapience/typecast-skills)
- HeyGen Starfish는 `word_timestamps`를 한 번의 호출로 주지만 한국어 명시는 없다 — [HeyGen docs](https://developers.heygen.com/docs/voices/speech.md). HyperFrames는 이를 1순위로 둔다 — 로컬 `media-use/audio/references/tts.md`
- ElevenLabs는 한국어를 지원하는 모델(`eleven_multilingual_v2` 29개 언어, v3/v4)과 문자 단위 `with-timestamps`가 있다 — [Models](https://elevenlabs.io/docs/overview/models), [with-timestamps](https://elevenlabs.io/docs/api-reference/text-to-speech/convert-with-timestamps)
- edge-tts에는 한국어 음성 3종과 `WordBoundary` 옵션이 있고 LGPLv3다 — [voices list](https://speech.platform.bing.com/consumer/speech/synthesize/readaloud/voices/list?trustedclienttoken=6A5AA1D4EAFF4E9FB37E23D68491D6F4), [communicate.py](https://github.com/rany2/edge-tts/blob/master/src/edge_tts/communicate.py), [LICENSE](https://github.com/rany2/edge-tts/blob/master/LICENSE)
- 오프라인 한국어 TTS로는 Qwen3-TTS(Apache-2.0, 한국어, "Sohee") — [README](https://github.com/QwenLM/Qwen3-TTS), Fun-CosyVoice3(Apache-2.0, 한국어) — [README](https://github.com/QwenAudio/CosyVoice), Chatterbox Multilingual V3(MIT, ko) — [README](https://github.com/resemble-ai/chatterbox), Piper `ko_KR-kss-medium`(GPL-3.0) — [voices.json](https://huggingface.co/rhasspy/piper-voices/raw/main/voices.json)이 있다.
- 정렬은 WhisperX `ko` 기본 정렬 모델 — [alignment.py](https://github.com/m-bain/whisperX/blob/main/whisperx/alignment.py), Qwen3-ForcedAligner 한국어(5분 이하) — [Qwen3-ASR](https://github.com/QwenLM/Qwen3-ASR)를 쓴다.
- QA 전사 규칙은 `.en` 금지와 `--model small|medium|large-v3 --language ko`다 — 로컬 `media-use/audio/references/transcribe.md`
- 피해야 할 것: HyperFrames 무키 기본 TTS(Kokoro, 한국어 없음) — [VOICES.md](https://huggingface.co/hexgrad/Kokoro-82M/raw/main/VOICES.md), Parakeet v3(한국어 없음) — [HF](https://huggingface.co/nvidia/parakeet-tdt-0.6b-v3), OpenAI `gpt-*-transcribe`(단어 타임스탬프 없음) — [OpenAI STT](https://developers.openai.com/api/docs/guides/speech-to-text), Dia·CSM·Zonos·IndexTTS-2.5(한국어 없음, 1절 출처)

### Inferences
- **기본 파이프라인 (유료, 품질 우선)**
  1. 대본 작성 후 Typecast `ssfm-v30` 한국어 음성으로 `POST /v1/text-to-speech/with-timestamps?granularity=word`를 호출해 `audio`와 어절 단위 `words.json`을 얻는다. 에이전트 연결은 `typecast-skills` 플러그인이나 `typecast-api-mcp-server`(uvx), 또는 `cast` CLI로 한다.
  2. 자막은 HyperFrames 엔진이면 `media-use` 자막 규칙(가라오케 기본, `caption-pill-karaoke`), Remotion 엔진이면 `Caption[]` 변환 후 `createTikTokStyleCaptions`를 쓴다. 한국어 웹폰트가 실제로 로드되는지 렌더에서 확인한다.
  3. 오디오는 BGM의 경우 HeyGen 카탈로그 검색(HyperFrames 자격증명이 있을 때)이나 ElevenLabs `music_v2_5`를 쓴다. SFX는 번들 whoosh·riser·impact 또는 ElevenLabs `sound-effects`를 쓰고, 보이스오버 덕킹은 `hyperframes-audio`로 처리한다.
  4. 마무리는 FFmpeg 직접 호출로 한다. 9:16은 컴포지션 해상도로 처음부터 지정하고, 실사 클립이 섞이면 auto-editor로 무음을 컷한다. MCP 가드레일이 필요하면 Kinocut을 쓴다.
  5. QA로 whisper.cpp/faster-whisper `--language ko`(small 이상)로 재전사해 대본과 대조하고, 발음 오류나 고유명사 오독을 검출한다.
  - 대안 A: ElevenLabs v3/v4 한국어 음성과 문자 단위 정렬을 쓰고, 공백·문장부호 기준으로 어절을 묶는다(이 저장소 `video-maker`의 "문자 timestamps → 어절" 규칙).
  - 대안 B: HeyGen Starfish에 한국어 음성이 있다면 HyperFrames 기본 경로를 그대로 쓸 수 있다. **현재는 미확인이므로 기본값으로 두지 않는다.**
- **무료·로컬 폴백**
  1. 음성은 인터넷이 되면 edge-tts `ko-KR-SunHiNeural`(여) / `ko-KR-InJoonNeural`(남)에 `boundary="WordBoundary"`, `--write-subtitles`를 쓴다. 단 Microsoft Edge 읽어주기 엔드포인트를 비공식으로 쓰는 것이므로 약관과 서비스 안정성 위험이 있고, LGPLv3다. 완전 오프라인이 필요하면 GPU가 있을 때 Qwen3-TTS(0.6B/1.7B, Apache-2.0) 또는 Fun-CosyVoice3-0.5B(Apache-2.0)를 쓴다. CPU만 있으면 Piper `ko_KR-kss-medium`(GPL-3.0, 품질 미검증)을 쓴다.
  2. 타이밍은 대본을 알고 있으므로 WhisperX 정렬(`--language ko`, `kresnik/wav2vec2-large-xlsr-korean`)이나 Qwen3-ForcedAligner-0.6B(5분 단위로 분할)를 쓴다. edge-tts `WordBoundary`가 어절 경계를 제대로 주면 그대로 사용한다.
  3. 자막은 HyperFrames `media-use` 규칙이나 pycaps(MIT, CSS 템플릿), Remotion(소규모 조직이면 무료)으로 만든다.
  4. 편집은 ffmpeg와 auto-editor(Unlicense)로 하고, 비트 싱크는 `hyperframes beats`나 librosa로 한다.
- 상업적 앱 홍보 영상이라면 F5-TTS 가중치(CC-BY-NC)와 Fish Speech(커뮤니티 라이선스)는 기본 후보에서 빼는 것이 안전하다. Remotion은 회사 규모에 따라 유료 라이선스가 필요할 수 있다.

### Gaps
- 기본 파이프라인의 핵심 가정인 "Typecast 한국어 음성 품질이 ElevenLabs·HeyGen보다 낫거나 동등하다"는 정량 근거(MOS/CER)를 찾지 못했다. 로컬 `video-maker` 스킬의 기존 권고와 공급자 성격(한국어 포함 35개 이상 언어 명시)에 근거한 추론이다.
- Typecast 요금, 무료 한도, 한국어 음성 수를 확인하지 못했다.
- HeyGen Starfish 한국어 음성 유무는 자격증명이 필요해 확인하지 못했다. 확인되면 HyperFrames 사용자에게는 HeyGen이 1회 호출로 끝나는 가장 단순한 경로가 될 수 있다.
- edge-tts `WordBoundary`의 한국어 경계 단위와 무료 오프라인 모델(Qwen3-TTS, CosyVoice3, Chatterbox)의 한국어 자연스러움은 설치 금지 원칙 때문에 실측하지 못했다.
