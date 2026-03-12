# SEO Patterns Reference

> SKILL.md에서 참조하는 상세 패턴 및 수정 코드 모음

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
