---
name: long-term-memory
description: 세션 간 장기기억 관리. MEMORY.md 자동 업데이트 및 조회
triggers:
  - "장기기억"
  - "memory"
  - "기억해"
  - "remember"
  - "/memory"
auto_apply: false
---

# Long-Term Memory Management

세션 간 지속되는 장기기억을 관리합니다. MEMORY.md 파일을 통해 중요한 정보를 저장하고 조회합니다.

## 메모리 구조

```
MEMORY.md
├── 프로젝트 컨텍스트
├── 중요한 결정사항
├── 학습된 교훈
├── 작업 패턴
├── MCP 서버
└── 주의사항
```

## 자동 기록 규칙

다음 내용은 세션 중 자동으로 MEMORY.md에 요약하여 추가합니다:

| 카테고리 | 예시 |
|---------|------|
| **아키텍처/설계 결정** | "React Query 대신 SWR 선택" |
| **버그 원인과 해결** | "CORS 에러 → 프록시 설정으로 해결" |
| **기술 스택 선택 이유** | "Prisma 선택 (타입 안전성)" |
| **반복되는 패턴** | "API 엔드포인트 추가 시 3단계" |
| **주의 함정/이슈** | "Windows에서 symlink 권한 필요" |
| **성능 개선 방법** | "이미지 lazy loading으로 50% 개선" |

## 사용법

### 1. 정보 기억하기

```
"이거 기억해: Redis 캐시 TTL은 항상 1시간으로"
"/memory add Redis 캐시 TTL은 항상 1시간"
```

### 2. 기억 조회하기

```
"Redis 관련해서 뭘 기억하고 있어?"
"/memory search Redis"
```

### 3. 전체 기억 보기

```
"장기기억 전체 보여줘"
"/memory list"
```

## 기록 형식

MEMORY.md에 추가할 때 다음 형식을 따릅니다:

```markdown
### 제목 (YYYY-MM-DD)

설명 내용
- 핵심 포인트 1
- 핵심 포인트 2
```

## 중복 방지

- 새 정보 추가 전 기존 내용과 중복 확인
- 유사한 내용이 있으면 병합하거나 업데이트
- 날짜 기준으로 최신 정보 우선

## 컨텍스트 효율성

- MEMORY.md는 항상 로드됨 (CLAUDE.md에서 @MEMORY.md 참조)
- 핵심 정보만 압축하여 포함
- 상세 내용은 별도 문서로 분리 권장

## 에이전트 동작

이 스킬이 트리거되면:

1. **기억 추가 요청**: MEMORY.md의 적절한 섹션에 정보 추가
2. **기억 조회 요청**: MEMORY.md에서 관련 내용 검색하여 응답
3. **세션 종료 시**: 중요한 학습 내용이 있으면 자동 기록 제안

## 예시

### 입력
```
"이거 기억해: Spring Boot에서 @Transactional은 public 메서드에만 적용됨"
```

### 결과 (MEMORY.md에 추가)
```markdown
### Spring Boot @Transactional 주의점 (2026-02-02)

- @Transactional은 public 메서드에만 적용됨
- private/protected 메서드에는 AOP 프록시가 적용되지 않음
```
