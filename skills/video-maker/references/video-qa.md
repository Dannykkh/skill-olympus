# Video QA Contract

엔진이 렌더 명령을 성공했다는 사실만으로 영상을 완료 처리하지 않습니다. 정적 계약, 대표 프레임,
시간축, 미디어 stream과 권리 정보를 각각 검증합니다.

## 1. Source Validation

| 공통 | Remotion | HyperFrames |
|---|---|---|
| manifest·lockfile 존재 | typecheck, Composition 목록 | `lint --json`, composition schema |
| 고정 version | entry와 ID 중복 확인 | timeline 등록과 `data-duration` 확인 |
| 로컬 자산 경로 | frame 기반 결정론 | paused timeline과 seek 결정론 |
| 권리·출처 manifest | 미디어 준비 상태 | 외부 URL·wall-clock 로직 금지 |

lint warning을 성공으로 숨기지 않습니다. 허용하는 warning은 이유와 영향 범위를 기록합니다.

## 2. Visual Acceptance Frames

각 장면에서 최소한 다음 세 프레임을 정합니다.

- entrance 이후 첫 안정 프레임
- 핵심 메시지 또는 데모가 완전히 읽히는 프레임
- transition 직전 마지막 안정 프레임

still을 실제 이미지로 열어 다음을 관찰합니다.

- 잘림·겹침·폰트 fallback·빈 media
- 안전 여백과 플랫폼 overlay 충돌
- 자막 대비와 한 화면 읽기량
- 브랜드 토큰과 자산 비율
- 장면 사이 visual continuity

## 3. Timeline and Audio

- scene 시작·종료와 전체 duration을 storyboard와 대조합니다.
- 자막 timing을 음성 또는 의미 단위와 대조합니다. 타이밍 출처가 공급자 timestamps인지 STT 전사인지
  기록하고, 마지막 단어 종료 시각과 오디오 duration의 차이를 확인합니다.
- 자막 텍스트는 전사 결과가 아니라 `SCRIPT.md` 원문과 대조합니다. 한글 자막은 한글 웹폰트가 실제
  로드됐는지 still에서 확인합니다.
- BGM과 SFX는 명시적으로 필요할 때만 포함합니다.
- 무음 재생에서도 메시지가 전달되어야 합니다.
- audio peak, clipping, 채널, sample rate를 확인합니다.
- 지속적인 깜빡임, 빠른 점멸, 읽기 전에 사라지는 텍스트를 실패로 처리합니다.

## 4. Media Inspection

가능하면 `ffprobe`로 다음을 기계적으로 확인합니다.

- 출력 파일 존재와 0보다 큰 크기
- video stream과 codec
- width·height·fps·duration
- 요청된 경우 audio stream과 duration
- 최종 프레임이 잘리지 않았는지

긴 최종 렌더 전에 짧은 draft 또는 제한 구간으로 media sync를 검증합니다. draft 성공을 최종 품질
성공으로 승격하지 않습니다.

## 5. Provenance and Delivery

납품 전에 asset별로 다음을 남깁니다.

| Asset | Local path | Source | License/permission | Attribution | Modification | Status |
|---|---|---|---|---|---|---|

근거를 찾지 못한 로고·음원·효과음·영상·이미지는 임의로 상업 이용 가능하다고 판단하지 않습니다.
생성형 미디어도 생성 도구, 생성일, 사용 조건을 기록합니다. TTS 나레이션은 Source 열에 공급자,
voice id, 모델을 적고 API 키는 어디에도 적지 않습니다.

완료 보고에는 출력 경로, engine/version, 렌더 명령, 검증한 acceptance frame, media probe 결과,
남은 권리·품질 이슈를 포함합니다.
