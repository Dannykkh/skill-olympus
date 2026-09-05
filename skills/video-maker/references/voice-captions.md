# Voice and Captions Contract

나레이션 음성 또는 자막이 필요한 영상에서만 읽습니다. 무음 영상, BGM만 있는 영상, 자막 없는 영상은
이 문서를 건너뜁니다. 엔진과 무관한 공급자 계약을 먼저 정하고, 엔진별 소비 방법은 마지막 절에서
갈라집니다.

## 1. 단계와 산출물

| 단계 | 입력 | 산출물 | 소유 |
|---|---|---|---|
| Script | brief, storyboard | `SCRIPT.md`의 spoken line | 이 스킬 Phase 3 |
| Voice | `SCRIPT.md` spoken line | `narration.wav` 또는 `.mp3`, 선택적 `narration.words.json`, provenance 행 | 이 문서 2~4절 |
| Captions | words.json 또는 SRT 또는 STT 전사, 음성이 없으면 storyboard scene timing | 엔진이 소비하는 caption 데이터 | 이 문서 5~6절 |

`narration.words.json`의 표준 shape는 HyperFrames 번들 `media-use`가 쓰는 것과 같은 평면 배열입니다.
Remotion을 선택해도 이 shape로 저장한 뒤 `Caption[]`으로 변환합니다.

```json
[
  { "id": "w0", "text": "안녕하세요", "start": 0.0, "end": 0.6 },
  { "id": "w1", "text": "여러분", "start": 0.7, "end": 1.1 }
]
```

## 2. 공급자 계약

공급자는 다음 계약만 만족하면 교체 가능합니다.

- 입력: spoken line 텍스트, 언어, voice 식별자, 속도·감정 설정
- 출력: 오디오 파일 1개, 가능하면 단어 단위 timestamps, 없으면 문자 단위 timestamps 또는 SRT
- 기록: 공급자, voice id, 모델, 생성일, 요금 유형, 사용 조건을 provenance 표에 남김

규칙:

- API 키는 환경 변수로만 읽고 파일·로그·provenance 표에 쓰지 않습니다.
- 요금이 발생하는 호출은 공급자·예상 분량·요금 유형을 먼저 제시하고 현재 작업 범위의 확인을
  받습니다. 무료 로컬 경로가 있어도 사용자가 고른 voice를 임의로 대체하지 않습니다.
- 한 영상에서 나레이터 voice는 하나로 고정하고, 바꾸면 이유를 `SCRIPT.md` 헤더에 적습니다.
- 생성한 음성도 생성형 미디어이므로 [video-qa.md](video-qa.md) 5절의 provenance 열을 모두 채웁니다.

## 3. 공급자 비교

아래는 2026-09-04 기준 공식 문서로 확인한 내용이며, 실제 사용 직전에 다시 확인합니다.

| 공급자 | 타임스탬프 | 제어 | 비용·조건 | 비고 |
|---|---|---|---|---|
| HeyGen | 단어 단위, 같은 응답에 포함 | voice id, 언어 | 계정과 CLI 인증 필요, OAuth 무료 사용량 | 번들 `media-use`의 `audio/scripts/heygen-tts.mjs`가 words.json까지 생성 |
| ElevenLabs | 문자 단위, `/v1/text-to-speech/{voice_id}/with-timestamps` | voice id, 모델, stability·similarity·style | 유료 API 키 | 단어 단위로 집계 필요. 공식 에이전트 스킬 번들이 있으나 이 스킬은 설치를 전제하지 않음 |
| Typecast | 타임스탬프 엔드포인트 문서 존재, 단위는 `[확인 필요]` | 감정 프리셋 7종, 감정 강도 0.0~2.0, 템포 0.5~2.0x | 유료 API 키 | 한국어 voice 500개 이상, 한국어 나레이션 1순위 후보 |
| Edge TTS | `--write-subtitles`로 SRT 출력 | rate, volume, pitch. SSML은 voice·prosody만 허용 | 무료, API 키 없음 | 비공식 경로라 서비스 약관과 안정성 리스크를 사용자에게 알린 뒤 사용 |
| Kokoro | 없음 | voice 54종, 영어 중심 | 무료 로컬 | HyperFrames 번들 `npx hyperframes tts`가 이 경로. 한국어 품질은 `[확인 필요]` |

선택 규칙은 순서대로 적용합니다.

1. 사용자가 공급자나 voice를 지정하면 그대로 씁니다.
2. 한국어 나레이션이면 Typecast를 먼저 제안하고, 비용을 쓸 수 없으면 Edge TTS를 제안합니다.
3. 영어이고 HeyGen 인증이 있으면 HeyGen이 단어 timestamps까지 한 번에 줍니다.
4. 이미 ElevenLabs 키와 voice가 정해진 프로젝트는 그 voice를 유지합니다.
5. 어느 것도 못 쓰면 Voice 단계를 `NOT RUN`으로 남기고 자막 없는 대안을 제시합니다.

공식 근거:

- ElevenLabs timestamps: https://elevenlabs.io/docs/api-reference/text-to-speech/convert-with-timestamps
- Typecast API: https://typecast.ai/developers/api/ , https://typecast.ai/docs/api-reference/text-to-speech/text-to-speech-with-timestamps
- Edge TTS: https://pypi.org/project/edge-tts/
- HeyGen 경로와 Kokoro: HyperFrames 번들 `media-use/audio/references/tts.md`

## 4. Script 형식

`SCRIPT.md`는 HyperFrames 번들 `hyperframes-core/references/script-format.md`의 shape를 두 엔진
공통으로 씁니다. 헤더에 voice·설정·전달 방향, 라인마다 storyboard frame 번호와 들여쓴 spoken
text를 둡니다. TTS에는 들여쓴 spoken text만 보냅니다. Remotion에는 이 파일을 읽는 파서가 없으므로
문서와 provenance 용도로만 두고 spoken text를 코드로 옮길 때 원문과 대조합니다.

## 5. 자막 정렬 분기

전사는 필요할 때만 합니다. 공급자가 준 시간 정보를 먼저 씁니다.

| 공급자 출력 | 처리 |
|---|---|
| 단어 timestamps | 전사 생략. words.json으로 저장 |
| 문자 timestamps | 공백·문장부호 경계로 단어를 묶어 words.json 생성. 한국어는 어절 단위 |
| SRT | 그대로 import. 단어 하이라이트가 필요하면 STT 전사로 보강 |
| 없음 | STT 전사. 아래 엔진별 명령 사용 |
| 음성 자체가 없음 | 전사 대상이 없으므로 `STORYBOARD.md`의 scene 시작·종료 시각을 기준으로 자막을 배치하고, 읽기 시간은 [video-qa.md](video-qa.md) 3절로 검사 |

STT 전사 규칙:

- HyperFrames: `npx hyperframes transcribe <audio> --model <name>`에서 `--model`을 항상 명시합니다.
  `.en` 모델은 비영어 음성을 영어로 번역하므로 한국어는 `--model small --language ko` 이상을 씁니다.
  근거는 번들 `media-use/audio/references/transcribe.md`입니다.
- Remotion: `@remotion/install-whisper-cpp`로 whisper.cpp를 설치하고 16kHz WAV로 변환한 뒤
  `tokenLevelTimestamps: true`로 전사하고 `toCaptions()`로 `Caption[]`을 만듭니다.
- 전사 결과는 원문 `SCRIPT.md`와 대조해 오인식 단어를 고칩니다. 시간은 유지하고 텍스트만 교정합니다.

## 6. 엔진별 자막 소비

### Remotion

- 패키지는 `@remotion/captions`이고 타입은 `Caption { text, startMs, endMs, timestampMs, confidence }`입니다.
- SRT는 `public/`에 두고 `staticFile()`로 읽은 뒤 `parseSrt({ input })`으로 `Caption[]`을 얻습니다.
- 단어 하이라이트는 `createTikTokStyleCaptions({ captions, combineTokensWithinMilliseconds })`로
  page를 만들고, page마다 `<Sequence>`를 두며, 현재 시간과 token의 `fromMs`·`toMs`를 비교해 활성
  단어에만 강조색을 적용합니다.
- words.json을 `Caption[]`으로 바꿀 때 초 단위를 밀리초로 변환하고 `text`에 뒤따르는 공백을
  포함합니다.
- 공식 근거: https://github.com/remotion-dev/skills/tree/main/skills/remotion-captions

### HyperFrames

- 번들 `media-use/audio/references/tts-to-captions.md`의 경로 A(단어 timestamps)와 경로 B(전사)를
  그대로 따릅니다.
- 자막 스타일·모션·전사 정리는 `media-use/audio/references/captions/{authoring,motion,transcript-handling}.md`를
  읽습니다. 번들이 없으면 자막 단계를 `NOT RUN`으로 남기고 SRT 오버레이 같은 대안을 제시합니다.
- 자막 clip도 `data-*` timing과 paused timeline 규칙을 따르며 wall-clock 로직을 쓰지 않습니다.

## 7. 한국어 자막 주의

- 자막 폰트는 한글 글리프가 있는 웹폰트를 실제 로드합니다. 라틴 전용 폰트만 지정하면 시스템
  폴백으로 조용히 바뀝니다.
- 한 화면 자막은 두 줄 이내, 줄당 20자 안팎을 기준으로 하고 읽기 시간을 [video-qa.md](video-qa.md)
  3절 기준으로 검사합니다.
- 어절 단위 하이라이트가 자연스럽습니다. 문자 단위 timestamps를 단어로 묶을 때 조사를 앞 어절에
  붙입니다.
- 숫자·고유명사는 TTS 발음이 원문과 다를 수 있으므로 전사 결과가 아니라 `SCRIPT.md` 원문을
  자막 텍스트로 씁니다.

## 8. 완료 증거

- 공급자, voice id, 모델, 생성일, 요금 유형이 적힌 provenance 행
- words.json 또는 SRT 또는 전사 JSON의 경로와 생성 방법
- 자막 timing 검사 결과: 오디오 duration과 마지막 단어 종료 시각의 차이
- 실행하지 못한 단계의 `NOT RUN`과 사유
