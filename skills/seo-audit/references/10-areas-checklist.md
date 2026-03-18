# 10개 영역 상세 체크리스트

> SKILL.md에서 이동된 영역별 상세 점검 항목, 탐색 방법, 프레임워크별 설정 모음

---

## 영역 1: robots.txt

**파일 탐색:**
```
Glob: **/robots.{txt,ts,js}
Grep: "robots" in 프레임워크 설정 파일
```

**점검 항목:**

| # | 점검 | 미달 시 등급 |
|---|------|------------|
| 1 | 파일 존재 여부 | P0 — 크롤러가 기본 정책 사용, 의도와 다를 수 있음 |
| 2 | `Disallow: /` (전체 차단) | P0 — 검색 결과에 아예 안 나옴 |
| 3 | admin, api, dashboard 등 민감 경로 차단 여부 | P2 |
| 4 | `Sitemap:` 지시자 포함 여부 | P1 |
| 5 | 동적 생성 시 올바른 export 형식 | P1 |

**프레임워크별 올바른 위치:**

| 프레임워크 | 정적 | 동적 |
|-----------|------|------|
| Next.js | `public/robots.txt` | `app/robots.ts` |
| Nuxt | `public/robots.txt` | `server/routes/robots.txt.ts` |
| Astro | `public/robots.txt` | `src/pages/robots.txt.ts` |
| SvelteKit | `static/robots.txt` | `src/routes/robots.txt/+server.ts` |
| 정적 HTML | 루트 `robots.txt` | — |

**구현 예시:** [references/seo-patterns.md — robots.txt](seo-patterns.md#robotstxt-올바른-예시)

---

## 영역 2: Sitemap

**파일 탐색:**
```
Glob: **/sitemap.{xml,ts,js,tsx,jsx}
Grep: "sitemap" in 프레임워크 설정 파일
```

**점검 항목:**

| # | 점검 | 미달 시 등급 |
|---|------|------------|
| 1 | 파일 존재 여부 | P0 — 크롤러가 페이지를 누락할 수 있음 |
| 2 | 모든 공개 라우트가 포함되어 있는지 (라우트 디렉토리와 비교) | P1 |
| 3 | `lastmod` 값의 존재 및 적절성 | P2 |
| 4 | sitemap index 사용 시 하위 sitemap 참조 유효성 | P1 |
| 5 | robots.txt에서 sitemap URL 참조 여부 | P1 |
| 6 | 다국어 사이트: `xhtml:link` hreflang alternate | P1 |

**라우트 vs sitemap 비교 방법:**
```
1. Glob으로 페이지 라우트 수집: **/page.{tsx,ts,jsx,js} 또는 **/*.{html,astro,svelte}
2. sitemap에 포함된 URL 목록 추출
3. 라우트에는 있지만 sitemap에 없는 페이지 = 누락 (P1)
4. 동적 라우트 ([slug], [id] 등)는 동적 sitemap 생성 확인
```

**구현 예시:** [references/seo-patterns.md — Sitemap](seo-patterns.md#sitemap-올바른-예시)

---

## 영역 3: 메타태그

**파일 탐색:**
```
Grep: "title", "description", "og:", "twitter:" in 페이지 파일
Grep: "metadata", "useHead", "meta()" in 페이지 파일 (프레임워크별)
```

**점검 항목:**

| # | 점검 | 미달 시 등급 |
|---|------|------------|
| 1 | `<title>` 또는 metadata title 존재 | P0 |
| 2 | title이 페이지마다 고유한지 (전부 같은 제목이면 문제) | P1 |
| 3 | `<meta name="description">` 존재 (120~160자 권장) | P1 |
| 4 | `og:title`, `og:description`, `og:image` 존재 | P1 — SNS 공유 미리보기 |
| 5 | `twitter:card` 존재 | P2 |
| 6 | `canonical` URL 설정 여부 | P1 — 중복 콘텐츠 방지 |
| 7 | `viewport` 메타태그 존재 | P0 — 모바일 검색 순위 |
| 8 | `lang` 속성이 `<html>` 태그에 있는지 | P1 |

**탐지 패턴 (프레임워크별):**

```typescript
// Next.js App Router
export const metadata: Metadata = {
  title: "...",
  description: "...",
  openGraph: { ... }
}

// Next.js Pages Router
<Head><title>...</title></Head>

// Nuxt
useHead({ title: "...", meta: [...] })

// Astro
<head><title>{title}</title></head>

// 정적 HTML
<meta name="description" content="...">
```

**구현 예시:** [references/seo-patterns.md — 메타태그](seo-patterns.md#메타태그-올바른-예시)

---

## 영역 4: 구조화 데이터 (JSON-LD)

**파일 탐색:**
```
Grep: "application/ld\\+json" in 페이지 파일
Grep: "schema\\.org" in 페이지 파일
Grep: "@type" in 페이지 파일
```

**점검 항목:**

| # | 점검 | 미달 시 등급 |
|---|------|------------|
| 1 | JSON-LD 스크립트 존재 여부 | P2 — 없어도 검색은 되지만, 리치 스니펫 못 받음 |
| 2 | `@type` 적절성 (페이지 유형에 맞는지) | P2 |
| 3 | 필수 필드 포함 여부 (type별) | P2 |
| 4 | JSON 문법 오류 없는지 | P1 |

**페이지 유형별 권장 `@type`:**

| 페이지 | @type | 필수 필드 |
|--------|-------|----------|
| 홈페이지 | `Organization`, `WebSite` | name, url, logo |
| 블로그 글 | `Article`, `BlogPosting` | headline, datePublished, author |
| 상품/가격 | `Product`, `Offer` | name, price, priceCurrency |
| FAQ | `FAQPage`, `Question` | name, acceptedAnswer |
| About | `Person` 또는 `Organization` | name, description |
| 이벤트 | `Event` | name, startDate, location |

**구현 예시:** [references/seo-patterns.md — JSON-LD](seo-patterns.md#json-ld-올바른-예시)

---

## 영역 5: 이미지 SEO

**파일 탐색:**
```
Grep: "<img" in 페이지/컴포넌트 파일
Grep: "Image" import in 페이지 파일 (next/image, @astrojs/image 등)
Glob: public/**/*.{jpg,jpeg,png,gif,webp,svg}
```

**점검 항목:**

| # | 점검 | 미달 시 등급 |
|---|------|------------|
| 1 | `alt` 속성 누락된 이미지 | P1 — 접근성 + SEO 둘 다 영향 |
| 2 | 프레임워크 이미지 컴포넌트 사용 여부 (자동 최적화) | P2 |
| 3 | `width`/`height` 명시 여부 (CLS 방지) | P2 |
| 4 | 큰 이미지 파일 (500KB 초과) | P2 — 로딩 속도 저하 |
| 5 | WebP/AVIF 미사용 (PNG/JPG만 사용) | P3 |
| 6 | `loading="lazy"` 적용 여부 (폴드 아래 이미지) | P2 |

**이미지 컴포넌트 확인:**

| 프레임워크 | 최적화 컴포넌트 |
|-----------|---------------|
| Next.js | `next/image` (`<Image>`) |
| Nuxt | `<NuxtImg>`, `<NuxtPicture>` |
| Astro | `astro:assets` (`<Image>`) |
| Gatsby | `gatsby-plugin-image` |
| 기타 | `<img>` + 수동 최적화 확인 |

**탐지 패턴:** [references/seo-patterns.md — 이미지 문제 탐지](seo-patterns.md#이미지-문제-탐지)

---

## 영역 6: 링크 & 내비게이션

**파일 탐색:**
```
Grep: "<a " in 페이지/컴포넌트 파일
Grep: "Link" import in 페이지 파일 (next/link, @remix-run 등)
Grep: "redirect", "301", "302" in 설정 파일
```

**점검 항목:**

| # | 점검 | 미달 시 등급 |
|---|------|------------|
| 1 | 외부 링크에 `rel="noopener noreferrer"` 적용 | P2 |
| 2 | 내부 링크에 프레임워크 Link 컴포넌트 사용 | P2 — SPA 네비게이션 보장 |
| 3 | 404 페이지 존재 여부 | P1 |
| 4 | 리다이렉트 설정 확인 (301 vs 302 적절성) | P2 |
| 5 | 앵커 텍스트가 의미 있는지 ("여기를 클릭하세요" 대신 구체적 텍스트) | P3 |
| 6 | `nofollow` 적절한 사용 (광고, 사용자 생성 링크) | P3 |

---

## 영역 7: 성능 SEO (Core Web Vitals 관련)

**파일 탐색:**
```
Grep: "font", "@font-face", "google.*fonts" in CSS/레이아웃 파일
Grep: "<script" in 레이아웃/페이지 파일
Grep: "preload", "prefetch", "preconnect" in 레이아웃 파일
```

**점검 항목:**

| # | 점검 | 미달 시 등급 |
|---|------|------------|
| 1 | 웹폰트에 `display: swap` 적용 | P1 — FOIT(폰트 로딩 전 텍스트 안 보임) 방지 |
| 2 | 서드파티 스크립트 로딩 방식 (`async`/`defer`/`afterInteractive`) | P2 |
| 3 | CSS/JS 번들 크기 (불필요한 대형 라이브러리 포함) | P2 |
| 4 | `preconnect` / `dns-prefetch` 외부 도메인 설정 | P3 |
| 5 | SSR/SSG 여부 (CSR 전용이면 SEO 불리) | P1 |
| 6 | 동적 `import()` 사용 여부 (코드 분할) | P3 |

**SSR/SSG 확인 방법:**
```
- Next.js: getServerSideProps, getStaticProps, 또는 App Router 기본 SSR
- Nuxt: ssr: true (기본값)
- Astro: 기본 SSG, output: 'server'면 SSR
- SvelteKit: +page.server.ts 존재 시 SSR
- 정적 HTML: SSG (OK)
- React SPA (CRA): CSR 전용 → P1 경고
```

**탐지 패턴:** [references/seo-patterns.md — 성능 관련 탐지 / CSR vs SSR 판별](seo-patterns.md#성능-관련-탐지)

---

## 영역 8: AI 크롤러 접근성

AI 답변 엔진과 생성형 AI가 사이트에 접근할 수 있는지 확인합니다. AEO/GEO의 **전제 조건**입니다.

**파일 탐색:**
```
Glob: **/robots.{txt,ts,js}
Grep: "GPTBot|ClaudeBot|PerplexityBot|Google-Extended|Amazonbot|Bytespider|CCBot" in robots 파일
Glob: **/llms.txt
Glob: **/llms-full.txt
Grep: "x-robots-tag" in middleware/서버 설정 파일
```

**점검 항목:**

| # | 점검 | 미달 시 등급 |
|---|------|------------|
| 1 | robots.txt에서 AI 봇 차단 여부 (`Disallow` for GPTBot, ClaudeBot 등) | P0 — AI 검색에서 완전 제외 |
| 2 | `llms.txt` 파일 존재 여부 (AI가 사이트 구조를 이해하는 표준) | P2 |
| 3 | SSR/SSG 렌더링 여부 (CSR 전용이면 AI 크롤러가 콘텐츠 수집 불가) | P1 |
| 4 | `x-robots-tag: noai` / `noindex` 헤더 과다 사용 | P1 — 의도적 차단이 아니면 제거 |
| 5 | 주요 콘텐츠가 JavaScript 렌더링 뒤에 숨겨져 있는지 | P1 |
| 6 | `data-nosnippet` 속성 과다 사용 | P2 — AI 발췌 차단 |

**주요 AI 봇 목록:**

| 봇 | 운영사 | 용도 |
|----|--------|------|
| `GPTBot` | OpenAI | ChatGPT 검색, 학습 |
| `ChatGPT-User` | OpenAI | ChatGPT 브라우징 |
| `ClaudeBot` | Anthropic | Claude 학습 |
| `PerplexityBot` | Perplexity | AI 검색 |
| `Google-Extended` | Google | Gemini 학습 (검색 크롤링과 별도) |
| `Amazonbot` | Amazon | Alexa 답변 |
| `CCBot` | Common Crawl | 오픈 데이터셋 (다수 AI가 활용) |

**llms.txt 표준 형식:**
```
# 사이트명

> 사이트 한 줄 설명

## Docs
- [문서 제목](https://example.com/docs/page): 페이지 설명

## Blog
- [글 제목](https://example.com/blog/post): 글 설명

## API
- [API 문서](https://example.com/api): API 설명
```

**구현 예시:** [references/seo-patterns.md — AI 크롤러 접근 설정](seo-patterns.md#ai-크롤러-접근-설정-영역-8)

---

## 영역 9: AEO — 답변 엔진 최적화 (Answer Engine Optimization)

Google Featured Snippet, 음성 비서(Alexa, Google Assistant), AI Overview에서 **"하나의 답변"**으로 선택되기 위한 최적화입니다.

**파일 탐색:**
```
Grep: "FAQPage|HowTo|Question|acceptedAnswer" in 페이지 파일 (JSON-LD)
Grep: "<h[2-4].*\\?" in 페이지/콘텐츠 파일 (질문형 헤딩)
Grep: "speakable" in JSON-LD 파일
```

**점검 항목:**

| # | 점검 | 미달 시 등급 |
|---|------|------------|
| 1 | FAQ 콘텐츠에 `FAQPage` JSON-LD 스키마 적용 여부 | P1 — Featured Snippet 선점 기회 상실 |
| 2 | 질문형 헤딩(`<h2>`, `<h3>`) 사용 여부 | P1 — AI가 Q&A 패턴을 인식 못함 |
| 3 | 간결한 답변 블록 존재 (헤딩 바로 아래 40단어 이내 요약) | P2 — AI 발췌율 2.7배 차이 |
| 4 | `HowTo` 스키마 적용 여부 (가이드/튜토리얼 페이지) | P2 |
| 5 | `Speakable` 스키마 적용 여부 (음성 검색용) | P3 |
| 6 | 정의형 콘텐츠 패턴: "X는 ~이다" 형식의 첫 문장 | P2 — AI가 정의를 발췌하기 쉬움 |
| 7 | 목록/표 형식 활용 (순서 목록, 비교 표) | P3 — Featured Snippet 선호 형식 |

**질문형 헤딩 패턴:**

```html
<!-- ✅ 좋은 예 — AI가 인식하기 쉬움 -->
<h2>Next.js에서 SEO를 최적화하는 방법은?</h2>
<p>Next.js SEO 최적화는 메타태그 설정, 구조화 데이터 추가, sitemap 생성의 3단계로 진행합니다.</p>

<!-- ❌ 나쁜 예 — AI가 질문-답변 매핑을 못함 -->
<h2>SEO 개요</h2>
<p>이 섹션에서는 SEO에 대해 다루겠습니다. SEO란 검색 엔진 최적화의 약자로서...</p>
```

**40단어 규칙:**
```
✅ 헤딩 바로 아래 첫 1~2문장이 핵심 답변을 담음 → AI 발췌율 2.7× 높음
❌ 헤딩 아래에 배경 설명이 먼저 나오고 답변이 본문 중간에 묻힘
```

**FAQ 스키마 점검:**
```
1. FAQ 섹션 존재 확인 (Grep: "FAQ|자주.*질문|Q&A" in 콘텐츠)
2. FAQPage JSON-LD 존재 확인
3. 스키마의 질문이 실제 사용자 검색 쿼리와 매칭되는지 (구체적 질문 vs 너무 일반적)
4. 답변이 간결한지 (300자 이내 권장)
```

**구현 예시:** [references/seo-patterns.md — AEO 패턴](seo-patterns.md#aeo-패턴-영역-9)

---

## 영역 10: GEO — 생성형 AI 최적화 (Generative Engine Optimization)

ChatGPT, Perplexity, Gemini, Claude 등 생성형 AI가 콘텐츠를 **출처로 인용**하도록 최적화합니다.

**파일 탐색:**
```
Grep: "statistics|data|research|study|survey" in 콘텐츠 파일 (팩트 밀도)
Grep: "cite|source|reference|according" in 콘텐츠 파일 (출처 표기)
Grep: "author|expert|credential" in JSON-LD/메타태그
Grep: '"(Person|Organization)".*"(author|name)"' in JSON-LD (저자 권위)
Glob: **/llms.txt
```

**점검 항목:**

| # | 점검 | 미달 시 등급 |
|---|------|------------|
| 1 | 콘텐츠에 구체적 수치/통계가 포함되어 있는지 | P1 — AI는 "주장+근거"가 있는 콘텐츠를 인용 |
| 2 | 출처/참조 표기 여부 (링크, 인용문) | P1 — AI가 신뢰할 수 있는 소스로 판단 |
| 3 | 저자 정보와 전문성 신호 (Author JSON-LD, 약력) | P2 — E-E-A-T 신호 |
| 4 | 콘텐츠 첫 200단어가 핵심 질문에 직접 답변하는지 | P1 — AI가 페이지 상단 우선 평가 |
| 5 | `llms.txt` 파일 제공 여부 | P2 — AI가 사이트 구조를 빠르게 파악 |
| 6 | 고유한 데이터/프레임워크/연구 포함 여부 | P2 — 독점 콘텐츠가 인용 확률 극대화 |
| 7 | 콘텐츠 최신성 신호 (`dateModified`, `lastmod`, 발행일) | P1 — AI는 최신 콘텐츠 선호 |
| 8 | 인용 가능한 핵심 문장 ("X는 Y이다" 형식) | P2 — 명확한 주장이 인용됨 |
| 9 | 표/목록/비교 형식 활용 | P2 — 구조화된 정보가 AI 가시성 30~40% 향상 |

**팩트 밀도 점검 기준:**

```
높은 팩트 밀도 (✅):
- "React 18의 Concurrent Mode는 렌더링 시간을 평균 35% 단축시킵니다 (Meta, 2024)."
- "2025년 기준 글로벌 모바일 트래픽 점유율은 62.3%입니다."

낮은 팩트 밀도 (❌):
- "React는 매우 빠른 프레임워크입니다."
- "모바일 트래픽이 많이 늘어났습니다."
```

**E-E-A-T 신호 점검:**

| 신호 | 확인 방법 | 중요도 |
|------|----------|--------|
| Experience (경험) | 사례 연구, 스크린샷, 실제 데이터 포함 | 높음 |
| Expertise (전문성) | 저자 약력, 자격증, JSON-LD Person 스키마 | 높음 |
| Authoritativeness (권위) | 외부 인용, 업계 인정, sameAs 링크 | 중간 |
| Trustworthiness (신뢰) | HTTPS, 개인정보처리방침, 출처 명시 | 높음 |

**인용 가능한 콘텐츠 패턴:**

```html
<!-- ✅ AI가 인용하기 좋은 구조 -->
<h2>Next.js 15에서 달라진 캐싱 전략은?</h2>
<p>Next.js 15는 fetch() 기본 캐싱을 opt-in 방식으로 변경했습니다.
이전 버전에서는 모든 fetch가 자동 캐시되었으나, 15부터는 명시적으로
cache: 'force-cache'를 지정해야 합니다.</p>

<!-- ❌ AI가 인용하기 어려운 구조 -->
<h2>캐싱에 대하여</h2>
<p>캐싱은 웹 개발에서 중요한 개념입니다. 다양한 방법이 있는데요,
이번 글에서는 몇 가지를 살펴보도록 하겠습니다...</p>
```

**구현 예시:** [references/seo-patterns.md — GEO 패턴](seo-patterns.md#geo-패턴-영역-10)
