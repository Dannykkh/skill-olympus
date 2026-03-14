# SEO + AEO + GEO Patterns Reference

> SKILL.md에서 참조하는 상세 패턴 및 수정 코드 모음 (SEO 영역 1~7 + AEO/GEO 영역 8~10)

---

## robots.txt 올바른 예시

### Next.js (동적 생성)

```typescript
// app/robots.ts
import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/admin/', '/dashboard/', '/_next/'],
    },
    sitemap: 'https://example.com/sitemap.xml',
  }
}
```

### Nuxt (동적 생성)

```typescript
// server/routes/robots.txt.ts
export default defineEventHandler(() => {
  return `User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin/
Sitemap: https://example.com/sitemap.xml`
})
```

### 정적 파일

```txt
User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin/
Disallow: /dashboard/

Sitemap: https://example.com/sitemap.xml
```

---

## Sitemap 올바른 예시

### Next.js (동적 생성)

```typescript
// app/sitemap.ts
import { MetadataRoute } from 'next'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // DB에서 동적 페이지 목록 가져오기
  const posts = await getPosts()

  const staticRoutes = [
    { url: 'https://example.com', lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 1 },
    { url: 'https://example.com/about', lastModified: new Date(), changeFrequency: 'yearly' as const, priority: 0.5 },
  ]

  const dynamicRoutes = posts.map((post) => ({
    url: `https://example.com/blog/${post.slug}`,
    lastModified: post.updatedAt,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  return [...staticRoutes, ...dynamicRoutes]
}
```

### Astro

```typescript
// src/pages/sitemap.xml.ts
import type { APIRoute } from 'astro'

export const GET: APIRoute = async () => {
  const pages = await getCollection('blog')
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${pages.map(page => `<url>
    <loc>https://example.com/blog/${page.slug}</loc>
    <lastmod>${page.data.date.toISOString()}</lastmod>
  </url>`).join('')}
</urlset>`
  return new Response(xml, { headers: { 'Content-Type': 'application/xml' } })
}
```

---

## 메타태그 올바른 예시

### Next.js App Router

```typescript
// app/blog/[slug]/page.tsx
import { Metadata } from 'next'

export async function generateMetadata({ params }): Promise<Metadata> {
  const post = await getPost(params.slug)
  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      images: [{ url: post.ogImage, width: 1200, height: 630 }],
      type: 'article',
      publishedTime: post.publishedAt,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt,
      images: [post.ogImage],
    },
    alternates: {
      canonical: `https://example.com/blog/${params.slug}`,
    },
  }
}
```

### 정적 HTML

```html
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>페이지 제목 — 사이트명</title>
  <meta name="description" content="120~160자 이내의 페이지 설명">
  <link rel="canonical" href="https://example.com/page">

  <!-- Open Graph -->
  <meta property="og:title" content="페이지 제목">
  <meta property="og:description" content="페이지 설명">
  <meta property="og:image" content="https://example.com/og-image.jpg">
  <meta property="og:url" content="https://example.com/page">
  <meta property="og:type" content="website">

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="페이지 제목">
  <meta name="twitter:description" content="페이지 설명">
  <meta name="twitter:image" content="https://example.com/og-image.jpg">
</head>
```

---

## JSON-LD 올바른 예시

### Organization (홈페이지)

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "회사명",
  "url": "https://example.com",
  "logo": "https://example.com/logo.png",
  "sameAs": [
    "https://twitter.com/example",
    "https://github.com/example"
  ]
}
</script>
```

### BlogPosting (블로그 글)

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": "글 제목",
  "datePublished": "2026-01-15",
  "dateModified": "2026-03-01",
  "author": {
    "@type": "Person",
    "name": "작성자"
  },
  "image": "https://example.com/blog/image.jpg",
  "description": "글 요약"
}
</script>
```

### FAQPage

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "질문 1?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "답변 1"
      }
    }
  ]
}
</script>
```

### Product (상품)

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "상품명",
  "image": "https://example.com/product.jpg",
  "description": "상품 설명",
  "offers": {
    "@type": "Offer",
    "price": "29.99",
    "priceCurrency": "USD",
    "availability": "https://schema.org/InStock"
  }
}
</script>
```

---

## Grep 탐지 패턴 모음

### 메타태그 누락 탐지

```
# title 존재 확인
Grep: "title" in **/page.{tsx,ts,jsx,js}
Grep: "<title" in **/*.html
Grep: "useHead" in **/pages/**/*.vue

# description 누락 탐지
Grep: "description" in **/page.{tsx,ts,jsx,js}
Grep: "meta.*description" in **/*.html

# Open Graph 누락 탐지
Grep: "openGraph|og:" in 페이지 파일
Grep: 'property="og:' in **/*.html

# viewport 확인
Grep: "viewport" in 레이아웃/HTML 파일
```

### 이미지 문제 탐지

```
# alt 속성 누락
Grep: '<img(?![^>]*alt=)' in **/*.{tsx,jsx,html,vue,svelte,astro}
Grep: '<Image(?![^>]*alt=)' in **/*.{tsx,jsx}

# 네이티브 img 사용 (프레임워크 Image 컴포넌트 대신)
Grep: '<img ' in **/*.{tsx,jsx} (next/image 미사용 후보)
```

### 성능 관련 탐지

```
# 동기 스크립트 (렌더링 차단)
Grep: '<script(?![^>]*(async|defer))' in **/*.html
Grep: 'Script(?![^>]*strategy)' in **/*.tsx (next/script)

# 웹폰트 display: swap 누락
Grep: '@font-face' in **/*.css
Grep: 'font-display' in **/*.css
Grep: 'fonts.googleapis.com' in 레이아웃 파일
```

---

## CSR vs SSR 판별

| 신호 | 의미 |
|------|------|
| `"output": "export"` (Next.js) | SSG (정적) — SEO OK |
| `getServerSideProps` | SSR — SEO OK |
| `getStaticProps` | SSG — SEO OK |
| `"use client"` only + no server components | CSR 의존 — P1 경고 |
| `createBrowserRouter` (React Router) | CSR SPA — P1 경고 |
| `ssr: false` (Nuxt) | CSR — P1 경고 |
| `output: 'server'` (Astro) | SSR — SEO OK |

---

## AI 크롤러 접근 설정 (영역 8)

### robots.txt — AI 봇 허용 예시

```txt
# 전통 검색 엔진
User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin/

# AI 크롤러 — 허용 (기본 권장)
User-agent: GPTBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Google-Extended
Allow: /

Sitemap: https://example.com/sitemap.xml
```

### robots.txt — AI 봇 선택적 차단 예시

```txt
# AI 학습은 차단하되, AI 검색 브라우징은 허용
User-agent: GPTBot
Disallow: /

User-agent: ChatGPT-User
Allow: /

User-agent: ClaudeBot
Disallow: /

User-agent: Google-Extended
Disallow: /
```

### Next.js 동적 robots.ts — AI 봇 포함

```typescript
// app/robots.ts
import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/admin/', '/dashboard/'],
      },
      {
        userAgent: 'GPTBot',
        allow: '/',
      },
      {
        userAgent: 'ClaudeBot',
        allow: '/',
      },
      {
        userAgent: 'PerplexityBot',
        allow: '/',
      },
    ],
    sitemap: 'https://example.com/sitemap.xml',
  }
}
```

### llms.txt 예시

```txt
# Example Corp

> Example Corp는 개발자를 위한 API 플랫폼입니다.

## Docs
- [시작하기](https://example.com/docs/getting-started): 5분 만에 API 연동하기
- [인증](https://example.com/docs/auth): OAuth 2.0 및 API 키 인증 방법
- [Rate Limits](https://example.com/docs/rate-limits): 요청 제한 및 모범 사례

## API Reference
- [REST API](https://example.com/api/rest): RESTful 엔드포인트 전체 문서
- [GraphQL API](https://example.com/api/graphql): GraphQL 스키마 및 쿼리 가이드

## Blog
- [v2.0 출시](https://example.com/blog/v2-release): 주요 변경사항 및 마이그레이션 가이드
```

### llms.txt Next.js 라우트로 제공

```typescript
// app/llms.txt/route.ts
export async function GET() {
  const content = `# 사이트명

> 사이트 한 줄 설명

## Docs
- [가이드](https://example.com/docs): 사용법 안내

## Blog
- [최신 글](https://example.com/blog): 기술 블로그
`
  return new Response(content, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
```

---

## AEO 패턴 (영역 9)

### FAQPage JSON-LD — 프롬프트 매칭 질문

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Next.js에서 SEO를 최적화하는 방법은?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Next.js SEO 최적화는 1) metadata export로 메타태그 설정, 2) generateStaticParams로 정적 생성, 3) JSON-LD로 구조화 데이터 추가의 3단계로 진행합니다."
      }
    },
    {
      "@type": "Question",
      "name": "Next.js sitemap을 자동 생성하려면?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "app/sitemap.ts 파일을 생성하고 MetadataRoute.Sitemap 타입의 배열을 반환하면 Next.js가 빌드 시 sitemap.xml을 자동 생성합니다."
      }
    }
  ]
}
</script>
```

### HowTo JSON-LD — 가이드/튜토리얼

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "HowTo",
  "name": "Next.js 프로젝트에 SEO 설정하기",
  "description": "Next.js App Router에서 메타태그, sitemap, JSON-LD를 설정하는 단계별 가이드",
  "step": [
    {
      "@type": "HowToStep",
      "name": "메타데이터 설정",
      "text": "layout.tsx에 metadata 객체를 export하여 기본 메타태그를 설정합니다."
    },
    {
      "@type": "HowToStep",
      "name": "Sitemap 생성",
      "text": "app/sitemap.ts 파일을 생성하여 동적 sitemap을 구성합니다."
    },
    {
      "@type": "HowToStep",
      "name": "JSON-LD 추가",
      "text": "각 페이지에 적절한 @type의 JSON-LD 스크립트를 추가합니다."
    }
  ]
}
</script>
```

### Speakable JSON-LD — 음성 검색 최적화

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "Next.js 15 SEO 완벽 가이드",
  "speakable": {
    "@type": "SpeakableSpecification",
    "cssSelector": [".article-summary", ".key-takeaway"]
  }
}
</script>
```

### 질문형 헤딩 + 간결 답변 패턴

```html
<!-- ✅ AEO 최적화 — AI 발췌율 2.7× 향상 -->
<h2>React Server Components란 무엇인가요?</h2>
<p><strong>React Server Components(RSC)는 서버에서만 실행되는 React 컴포넌트로,
클라이언트 번들 크기를 줄이면서 데이터베이스에 직접 접근할 수 있게 합니다.</strong></p>
<p>기존 React 컴포넌트는 모두 클라이언트에서 실행되었지만, RSC는 서버에서 렌더링 후
HTML만 클라이언트로 전송합니다. 이를 통해...</p>

<!-- ❌ AEO 미최적화 — AI가 핵심을 못 찾음 -->
<h2>서버 컴포넌트 소개</h2>
<p>React 생태계는 지난 몇 년간 많은 변화를 겪어왔습니다.
특히 Next.js의 등장 이후로 서버사이드 렌더링이 주목받기 시작했는데요...</p>
```

---

## GEO 패턴 (영역 10)

### 높은 팩트 밀도 콘텐츠

```html
<!-- ✅ AI가 인용할 가능성 높음 -->
<h2>2025년 프론트엔드 프레임워크 시장 점유율</h2>
<p>2025년 Stack Overflow 설문 기준, React는 39.5%의 시장 점유율로 1위를 유지하고 있으며,
Next.js는 React 프로젝트의 67%에서 사용됩니다.
Vue.js(18.2%)와 Angular(17.1%)가 그 뒤를 잇습니다.</p>

<table>
  <thead>
    <tr><th>프레임워크</th><th>점유율</th><th>전년 대비</th></tr>
  </thead>
  <tbody>
    <tr><td>React</td><td>39.5%</td><td>+2.1%</td></tr>
    <tr><td>Vue.js</td><td>18.2%</td><td>-0.8%</td></tr>
    <tr><td>Angular</td><td>17.1%</td><td>-1.5%</td></tr>
    <tr><td>Svelte</td><td>8.3%</td><td>+1.9%</td></tr>
  </tbody>
</table>
```

### E-E-A-T 저자 신호 JSON-LD

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "프로덕션 Next.js 성능 최적화 가이드",
  "datePublished": "2026-01-15",
  "dateModified": "2026-03-01",
  "author": {
    "@type": "Person",
    "name": "홍길동",
    "url": "https://example.com/about/hong",
    "jobTitle": "Senior Frontend Engineer",
    "worksFor": {
      "@type": "Organization",
      "name": "Example Corp"
    },
    "sameAs": [
      "https://github.com/hong",
      "https://linkedin.com/in/hong"
    ]
  },
  "publisher": {
    "@type": "Organization",
    "name": "Example Corp",
    "logo": {
      "@type": "ImageObject",
      "url": "https://example.com/logo.png"
    }
  }
}
</script>
```

### 콘텐츠 최신성 신호

```typescript
// Next.js — 마지막 수정일 자동 표시
// app/blog/[slug]/page.tsx
export async function generateMetadata({ params }): Promise<Metadata> {
  const post = await getPost(params.slug)
  return {
    other: {
      'article:published_time': post.publishedAt,
      'article:modified_time': post.updatedAt,  // AI가 최신성 판단에 사용
    },
  }
}

// 페이지 내 표시
function BlogPost({ post }) {
  return (
    <article>
      <h1>{post.title}</h1>
      <time dateTime={post.updatedAt}>
        최종 업데이트: {formatDate(post.updatedAt)}
      </time>
      {/* ... */}
    </article>
  )
}
```

### Grep 탐지 패턴 — AEO/GEO

```
# AI 봇 차단 탐지
Grep: "GPTBot|ClaudeBot|PerplexityBot|Google-Extended" in **/robots.{txt,ts,js}
Grep: "Disallow.*GPTBot|Disallow.*ClaudeBot" in **/robots.{txt,ts,js}

# llms.txt 존재 확인
Glob: **/llms.txt
Glob: **/llms-full.txt

# FAQ 스키마 존재 확인
Grep: "FAQPage" in **/*.{tsx,jsx,html,vue,svelte,astro}
Grep: "HowTo" in **/*.{tsx,jsx,html,vue,svelte,astro}

# 질문형 헤딩 탐지
Grep: "<h[2-4][^>]*>.*\?" in **/*.{tsx,jsx,html,vue,svelte,astro,md,mdx}

# 팩트 밀도 신호 (수치/통계 포함 여부)
Grep: "\d+(\.\d+)?%" in 콘텐츠 파일
Grep: "according to|based on|study|research|survey" in 콘텐츠 파일

# 저자 권위 신호
Grep: '"author"' in **/*.{tsx,jsx,html}
Grep: "Person.*author|author.*Person" in JSON-LD 파일

# 콘텐츠 최신성
Grep: "dateModified|datePublished|modified_time|published_time" in 페이지 파일

# noai/nosnippet 탐지
Grep: "noai|noimageai" in **/*.{tsx,jsx,html,vue}
Grep: "data-nosnippet" in **/*.{tsx,jsx,html,vue}
Grep: "x-robots-tag" in middleware/서버 설정 파일
```
