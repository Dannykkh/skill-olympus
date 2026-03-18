---
name: seo-audit
description: "웹 프로젝트 SEO + AEO + GEO 종합 감사. robots.txt, sitemap, 메타태그, 구조화 데이터, 성능, AI 크롤러, 답변 엔진, 생성형 AI 최적화 등 10개 영역 자동 점검. /seo-audit로 실행."
license: MIT
metadata:
  version: "2.0.0"
---

# SEO + AEO + GEO Audit — 웹 프로젝트 검색 종합 감사

웹 프로젝트의 검색 최적화 상태를 **10개 영역**에 걸쳐 자동 점검합니다.
전통적인 SEO(영역 1~7)에 더해, AI 시대의 **AEO**(Answer Engine Optimization)와 **GEO**(Generative Engine Optimization)까지 포괄합니다.

Next.js, Nuxt, Astro, Remix, SvelteKit, 정적 HTML 등 **모든 웹 프레임워크**에 대응합니다.

### SEO vs AEO vs GEO

| 구분 | SEO (영역 1~7) | AEO (영역 9) | GEO (영역 10) |
|------|---------------|-------------|--------------|
| **대상** | Google/Bing 검색 결과 | Featured Snippet, 음성 비서, AI 답변 | ChatGPT, Perplexity, Gemini, Claude 등 생성형 AI |
| **목표** | 검색 순위 상위 노출 | "하나의 답변"으로 선택됨 | AI가 출처로 인용/추천 |
| **핵심 전략** | 키워드, 백링크, 기술적 최적화 | FAQ 스키마, 간결한 답변 블록, Q&A 형식 | 팩트 밀도, 인용 가능한 콘텐츠, 권위 신호 |

## 적용 시점

- `/seo-audit` 명시적 실행
- 웹 프로젝트 배포 전 점검
- "SEO 점검해줘", "검색 최적화 확인" 요청 시
- "AI 검색 최적화", "AEO 점검", "GEO 점검" 요청 시

---

## Step 1: 프로젝트 정찰

먼저 기술 스택과 구조를 파악합니다.

**필수 확인:**
```
- package.json → 프레임워크 종류, SEO 관련 패키지
- 프레임워크 설정 파일 (next.config.*, nuxt.config.*, astro.config.*, vite.config.* 등)
- 라우팅 디렉토리 구조 (src/app/, src/pages/, src/routes/ 등)
- public/ 또는 static/ 디렉토리 내 정적 파일
- middleware 파일 존재 여부
```

**프레임워크 자동 감지:**

| 감지 패턴 | 프레임워크 | 메타데이터 방식 |
|-----------|-----------|---------------|
| `next` in package.json | Next.js | `metadata` export / `<Head>` |
| `nuxt` in package.json | Nuxt | `useHead()` / `nuxt.config` SEO |
| `astro` in package.json | Astro | frontmatter / `<BaseHead>` |
| `@remix-run` in package.json | Remix | `meta()` function |
| `@sveltejs/kit` in package.json | SvelteKit | `<svelte:head>` |
| `gatsby` in package.json | Gatsby | `gatsby-plugin-react-helmet` |
| `*.html` in root/public | 정적 HTML | `<meta>` 태그 직접 확인 |

---

## Step 2: 10개 영역 감사

각 영역을 순차적으로 점검하고 P0~P3 등급으로 분류합니다.
[등급 판정 기준 → references/severity-guide.md](references/severity-guide.md)

### 영역 구성

| 카테고리 | 영역 | 한 줄 설명 |
|---------|------|-----------|
| **SEO** | 1. robots.txt | 크롤러 접근 정책 및 sitemap 참조 |
| **SEO** | 2. Sitemap | 모든 공개 라우트 등록 및 유효성 |
| **SEO** | 3. 메타태그 | title, description, OG, canonical, viewport |
| **SEO** | 4. 구조화 데이터 | JSON-LD @type 적절성 및 필수 필드 |
| **SEO** | 5. 이미지 | alt 속성, 최적화 컴포넌트, lazy loading |
| **SEO** | 6. 링크 & 내비게이션 | 404, rel, 앵커 텍스트 |
| **SEO** | 7. 성능 | Core Web Vitals 관련, SSR/SSG 여부 |
| **AEO/GEO** | 8. AI 크롤러 접근성 | GPTBot/ClaudeBot 허용, llms.txt |
| **AEO/GEO** | 9. AEO (답변 엔진) | FAQPage 스키마, 질문형 헤딩, 40단어 규칙 |
| **AEO/GEO** | 10. GEO (생성형 AI) | 팩트 밀도, E-E-A-T, 인용 가능한 콘텐츠 |

[영역별 상세 체크리스트 및 탐색 방법 → references/10-areas-checklist.md](references/10-areas-checklist.md)

[구현 코드 예시 → references/seo-patterns.md](references/seo-patterns.md)

---

## Step 3: 감사 리포트 생성

모든 영역 점검 후 아래 형식으로 리포트를 출력합니다.

```
# SEO 감사 리포트

프로젝트: {프로젝트명}  |  프레임워크: {감지된 프레임워크}  |  점검일: {날짜}
전체: P0 {n}건 / P1 {n}건 / P2 {n}건 / P3 {n}건
```

- **P0** (즉시 수정): 현재 상태 → 영향 → 수정 코드
- **P1** (빠른 수정): 현재 상태 → 영향 → 수정 방법
- **P2** (개선 권장): 항목 설명
- **P3** (최적화 제안): 항목 설명
- **통과 항목**: 체크리스트
- **권장 액션 플랜**: 우선순위별 작업 테이블

[전체 리포트 형식 → references/severity-guide.md](references/severity-guide.md)

---

## 다음 단계 안내

```
✅ SEO + AEO + GEO 감사 완료!
   SEO  (영역 1~7):  P0: {n}건, P1: {n}건, P2: {n}건, P3: {n}건
   AEO/GEO (영역 8~10): P0: {n}건, P1: {n}건, P2: {n}건, P3: {n}건

다음 단계 (선택):
  security-reviewer    → 보안 점검
  /qpassenger          → Playwright 자동 테스트
  /commit              → 변경사항 커밋
```
