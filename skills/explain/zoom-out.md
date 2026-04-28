# Zoom-out 모드

## 언제 사용

코드를 보고 있는데 **이게 어디에 속하는지** 모를 때.

| 상황 | 예시 |
|------|------|
| 처음 보는 레포에서 한 파일을 열었음 | "이 파일이 시스템에서 무슨 역할이지?" |
| 함수 시그니처는 이해했지만 누가 부르는지 모름 | "이걸 누가 쓰는 거야?" |
| 디렉토리 전체 구조가 머리에 안 들어옴 | "auth/ 안에 뭐가 어떻게 나뉘어 있어?" |

`/explain @file`(상세 설명)과 다른 점:
- 상세 설명: **무엇을 하는가** (비유, 3단계)
- 줌아웃: **어디에 속하는가** (구조 맵)

## 워크플로우

### 1. 대상 파악

`@file` 경로 또는 모듈명을 받습니다. 모듈명이면 Grep으로 위치 추정.

### 2. 호출자(Callers) 찾기

대상 파일에서 export하는 심볼을 추출:

```bash
# 예: src/auth/middleware.ts에서 export 찾기
grep -E "^export (function|const|class|default)" src/auth/middleware.ts
```

각 export 심볼에 대해 코드베이스 전체에서 import/사용처 검색:

```bash
# import 찾기
grep -rn "from.*auth/middleware" --include="*.ts" --include="*.tsx"
grep -rn "import.*middleware.*from" src/
```

상위 5개 호출자만 보고. 너무 많으면 "총 N개 호출처, 대표 5개:"로 표시.

### 3. 형제(Siblings) 파악

대상 파일의 부모 디렉토리에서 다른 파일들을 나열:

```bash
# 예: src/auth/middleware.ts의 형제
ls src/auth/
# → middleware.ts, token.ts, refresh.ts, session.ts, types.ts
```

각 형제의 역할을 한 줄로 추정 (파일명 + 첫 export + 첫 주석에서):

| 형제 | 역할 (추정) |
|------|-------------|
| token.ts | JWT 발급/검증 |
| refresh.ts | 토큰 갱신 로직 |
| session.ts | 세션 저장소 인터페이스 |
| types.ts | auth 도메인 타입 정의 |

### 4. 상위 맵

부모 디렉토리(또는 기능 단위)의 구조를 트리로:

```
src/auth/                 ← 인증 도메인
├── middleware.ts         ← [현재 보고 있는 파일]
├── token.ts              ← JWT 발급/검증
├── refresh.ts            ← 토큰 갱신
├── session.ts            ← 세션 저장
└── types.ts              ← 타입 정의

호출 관계:
  routes/api/_middleware.ts
    → auth/middleware.ts   ← 여기
       → auth/token.ts
       → auth/session.ts
```

**중요**: 모든 파일을 다 보여주지 말고, **현재 파일과 직접 관련된 것**만. 형제가 20개면 "관련 5개 + 그 외 15개" 식으로.

### 5. 추천 다음 행동

이 코드를 이해하려면 어디부터 읽어야 하는지 안내:

```markdown
## 추천 읽기 순서

1. `auth/types.ts` — auth 도메인 타입부터
2. `auth/token.ts` — JWT 발급 로직 (middleware가 이걸 호출)
3. `auth/middleware.ts` — 현재 파일
4. `routes/api/_middleware.ts` — middleware가 어떻게 라우터에 연결되는지
```

## 출력 형식

`@file`과 같은 디렉토리에 `EXPLANATION-zoom-out.md`로 저장 (또는 stdout만).

```markdown
# 줌아웃: src/auth/middleware.ts

> 생성일: 2026-04-28
> 모드: zoom-out

## 호출자 (Callers)
- `routes/api/_middleware.ts:12` — `requireAuth` 사용
- `routes/api/admin.ts:5` — `requireAdmin` 사용
- (총 N개 호출처, 대표 N개)

## 형제 (Siblings)
| 파일 | 역할 |
|------|------|
| token.ts | JWT 발급/검증 |
| ... | ... |

## 상위 맵
{트리 다이어그램}

## 추천 읽기 순서
1. ...
2. ...
```

## 제약

- 상세 코드 설명 X (그건 일반 모드)
- 비유 X
- Mermaid 다이어그램은 호출 관계만 (간단히)
- 출력은 한국어
- 호출자/형제는 각각 5개 이하로 (많으면 요약)
