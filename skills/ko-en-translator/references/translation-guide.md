# 번역 품질 가이드

## 한→영 번역 원칙

### 1. 주어 복원

한국어는 주어를 자주 생략하지만, 영어는 주어가 필수입니다.

| 한국어 | Bad | Good |
|--------|-----|------|
| 설치가 완료되었습니다 | Installation has been completed | Installation is complete |
| 실행하면 결과가 나옵니다 | If execute, results come out | When you run it, the results appear |
| 수정이 필요합니다 | Modification is needed | You need to modify this / This needs modification |

### 2. 피동 → 능동

한국어의 피동 표현을 영어 능동태로 전환합니다.

| 한국어 | Bad (Passive) | Good (Active) |
|--------|---------------|---------------|
| 파일이 생성됩니다 | A file is created | This creates a file |
| 에러가 발생되었습니다 | An error was occurred | An error occurred |
| 설정이 변경되어야 합니다 | The setting should be changed | Change the setting |

### 3. 명사화 풀기

한국어의 명사형 종결을 영어의 동사 중심 문장으로 전환합니다.

| 한국어 | Bad | Good |
|--------|-----|------|
| 데이터 처리 후 저장 | After data processing, storage | Process the data, then save it |
| 인증 실패 시 재시도 필요 | When authentication failure, retry necessity | Retry if authentication fails |

### 4. 번역투 제거

영어로 번역할 때 한국어 어순이 남지 않도록 합니다.

| 한국어 | 번역투 | 자연스러운 영어 |
|--------|--------|----------------|
| 이 기능은 사용자에게 알림을 보내는 기능입니다 | This feature is a feature that sends notifications to users | This feature sends notifications to users |
| ~에 대한 정보를 제공합니다 | Provides information about ~ | Describes ~ / Explains ~ |
| ~를 수행하는 역할을 합니다 | Plays a role of performing ~ | Performs ~ |

---

## 영→한 번역 원칙

### 1. 영어식 수식 구조 해체

영어의 긴 관계절/수식을 한국어의 짧은 문장으로 분리합니다.

| 영어 | Bad | Good |
|------|-----|------|
| The function that processes user input and validates it against the schema | 사용자 입력을 처리하고 스키마에 대해 검증하는 함수 | 이 함수는 사용자 입력을 처리합니다. 그런 다음 스키마 기준으로 검증합니다. |
| A lightweight, fast, and easy-to-use library | 가볍고, 빠르고, 사용하기 쉬운 라이브러리 | 가볍고 빠른 라이브러리입니다. 사용법도 간단합니다. |

### 2. 번역하면 안 되는 것

아래 항목은 원어 그대로 유지합니다:

- **고유명사**: React, TypeScript, Docker, Kubernetes, GitHub
- **CLI 명령어**: `npm install`, `git commit`, `docker build`
- **파일 경로**: `src/components/Button.tsx`
- **환경 변수**: `NODE_ENV`, `API_KEY`
- **HTTP 메서드**: GET, POST, PUT, DELETE
- **상태 코드**: 200 OK, 404 Not Found, 500 Internal Server Error
- **약어**: API, SDK, CLI, URL, JSON, YAML, SQL, HTML, CSS
- **라이선스**: MIT, Apache 2.0, GPL

### 3. 처음 등장 시 병기

기술 용어가 처음 등장할 때 한국어 번역과 영어 원어를 병기합니다.

```
의존성 주입(Dependency Injection, DI)은 객체 간 결합도를 낮추는 설계 패턴입니다.
이후 문장에서는 DI라고 줄여 쓸 수 있습니다.
```

두 번째 이후 등장 시에는 한국어만 또는 약어만 사용합니다.

### 4. 과잉 존대 제거

기술 문서에서 과도한 존칭은 가독성을 떨어뜨립니다.

| Bad | Good |
|-----|------|
| 설치하시겠습니까? 설치해 주시기 바랍니다 | 설치하려면 아래 명령을 실행합니다 |
| ~해주셔야 합니다 | ~해야 합니다 / ~합니다 |
| ~하실 수 있으십니다 | ~할 수 있습니다 |

### 5. "~의" 남용 방지

영어의 "of", "'s"를 모두 "~의"로 번역하지 않습니다.

| 영어 | Bad | Good |
|------|-----|------|
| the name of the function | 함수의 이름 | 함수 이름 |
| the result of the test | 테스트의 결과 | 테스트 결과 |
| the configuration of the server | 서버의 설정 | 서버 설정 |

---

## 톤 매칭 가이드

### 격식 수준 판단 기준

| 신호 | 격식 수준 | 번역 화체 |
|------|----------|----------|
| 계약서, 약관, 공지사항 | Very Formal | 합쇼체/하십시오체 |
| 기술 문서, API 문서, README | Professional | 해요체/합쇼체 |
| 블로그, 튜토리얼 | Semi-casual | 해요체 |
| 채팅, 커밋 메시지, 코드 주석 | Casual | 해체/명사형 종결 |
| 에러 메시지, UI 라벨 | Neutral | 명사형/해요체 |

### UI 텍스트 번역 규칙

UI 요소는 간결함이 최우선입니다.

| 영어 | Bad | Good |
|------|-----|------|
| Save Changes | 변경 사항을 저장합니다 | 변경사항 저장 |
| Are you sure you want to delete? | 정말로 삭제하시겠습니까? | 삭제하시겠습니까? |
| Loading... | 로딩 중입니다... | 불러오는 중... |
| No results found | 검색 결과가 없습니다 | 결과 없음 |
| Sign in with Google | 구글과 함께 로그인하세요 | Google로 로그인 |

---

## 자주 혼동하는 표현

| 영어 | 흔한 오역 | 올바른 번역 |
|------|----------|------------|
| deploy | 배치하다 | 배포하다 |
| deprecate | 사용 중지 | 지원 중단 (예정) |
| fetch | 가져오다 (모호) | (데이터를) 조회하다 / 불러오다 |
| handle | 핸들하다 | 처리하다 |
| implement | 실행하다 | 구현하다 |
| initialize | 초기화하다 (O) | 초기화하다 |
| invoke | 호출하다 (O) | 호출하다 |
| iterate | 반복하다 | 순회하다 (컬렉션) / 반복하다 (프로세스) |
| maintain | 관리하다 | 유지보수하다 (코드) / 관리하다 (상태) |
| override | 오버라이드하다 | 재정의하다 |
| parse | 파싱하다 | 파싱하다 / 구문 분석하다 |
| persist | 지속하다 | 영속화하다 / 저장하다 |
| provision | 프로비저닝하다 | 프로비저닝하다 / (리소스를) 할당하다 |
| refactor | 리팩토링하다 (O) | 리팩토링하다 |
| render | 렌더링하다 (O) | 렌더링하다 |
| resolve | 해결하다 | 해석하다 (DNS) / 해결하다 (이슈) |
| sanitize | 세정하다 | 정제하다 / 이스케이프 처리하다 |
| scaffold | 비계 | 스캐폴드 / 기본 구조 생성 |
| serialize | 직렬화하다 (O) | 직렬화하다 |
| spawn | 산란하다 | (프로세스를) 생성하다 |
| throw | 던지다 | (예외를) 발생시키다 |
| trigger | 트리거하다 | 트리거하다 / 실행하다 |
