# Context7 MCP

> 라이브러리 문서를 실시간으로 검색하는 선택 MCP 서버

기본 설치에는 포함되지 않습니다. 프로젝트 의존성 버전과 기존 코드를 확인하고 공식 문서를 직접 참고하는 것을 우선하며, 문서 조회를 보조할 때 선택적으로 설치합니다.

## 기본 정보

| 항목 | 내용 |
|------|------|
| **저장소** | [github.com/upstash/context7](https://github.com/upstash/context7) |
| **NPM** | [@upstash/context7-mcp](https://www.npmjs.com/package/@upstash/context7-mcp) |
| **제작자** | Upstash |
| **분류** | MCP 서버 |
| **API 키** | 불필요 (무료) |

---

## 개요

Context7은 라이브러리 공식 문서를 실시간으로 검색하여 Claude에게 제공하는 MCP 서버. 오래된 학습 데이터 문제를 해결하고 최신 API 정보를 제공.

**문제 해결:**
- Claude의 학습 데이터는 과거 시점
- 라이브러리 API는 자주 변경됨
- 공식 문서 최신 버전을 실시간 참조 필요

---

## 주요 기능

### 1. 문서 검색

라이브러리 이름으로 공식 문서 검색.

```
React 19의 use() 훅 사용법 알려줘 use:context7
```

### 2. 지원 라이브러리

| 분야 | 라이브러리 |
|------|-----------|
| **Frontend** | React, Vue, Svelte, Next.js |
| **Backend** | Express, Fastify, NestJS, Django |
| **Database** | Prisma, Drizzle, TypeORM |
| **AI/ML** | LangChain, OpenAI, Anthropic |
| **Infra** | Docker, Kubernetes, Terraform |

### 3. 자동 버전 감지

package.json 또는 요청에서 버전을 감지하여 해당 버전 문서 제공.

---

## 설치 방법

```bash
claude mcp add context7 -- npx -y @upstash/context7-mcp
```

---

## 사용 예시

### 기본 사용

```
Next.js 15 App Router에서 서버 액션 사용법 use:context7
```

### 특정 버전 지정

```
React 18.2의 useTransition 문서 보여줘 use:context7
```

### 마이그레이션 가이드

```
Prisma 4에서 5로 마이그레이션 가이드 use:context7
```

---

## 장단점

### 장점
- API 키 불필요 (완전 무료)
- 실시간 최신 문서 제공
- 버전별 문서 지원
- 빠른 응답 속도

### 단점/주의사항
- 모든 라이브러리 지원 안됨
- 일부 문서는 영어만 지원
- 네트워크 연결 필요

---

## 관련 리소스

- [Upstash](https://upstash.com/) - 제작사
- [Context7 웹사이트](https://context7.com/) - 지원 라이브러리 목록

---

**문서 작성일:** 2026-01-28
