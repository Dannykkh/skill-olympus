---
name: seo-audit
description: "웹 프로젝트 SEO 종합 감사. robots.txt, sitemap, 메타태그, 구조화 데이터, 성능 등 7개 영역 자동 점검. /seo-audit로 실행."
license: MIT
metadata:
  version: "1.0.0"
---

# SEO Audit — 웹 프로젝트 SEO 종합 감사

웹 프로젝트의 검색 엔진 최적화 상태를 7개 영역에 걸쳐 자동 점검합니다.
Next.js, Nuxt, Astro, Remix, SvelteKit, 정적 HTML 등 **모든 웹 프레임워크**에 대응합니다.

## 적용 시점

- `/seo-audit` 명시적 실행
- 웹 프로젝트 배포 전 점검
- "SEO 점검해줘", "검색 최적화 확인" 요청 시

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

## Step 2: 7개 영역 감사

각 영역을 순차적으로 점검하고 P0~P3 등급으로 분류합니다.

---

### 영역 1: robots.txt

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

---

### 영역 2: Sitemap

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

---

### 영역 3: 메타태그

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

---

### 영역 4: 구조화 데이터 (JSON-LD)

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

---

### 영역 5: 이미지 SEO

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

---

### 영역 6: 링크 & 내비게이션

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

### 영역 7: 성능 SEO (Core Web Vitals 관련)

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

---

## Step 3: 감사 리포트 생성

모든 영역 점검 후 아래 형식으로 리포트를 출력합니다.

```markdown
# SEO 감사 리포트

**프로젝트**: {프로젝트명}
**프레임워크**: {감지된 프레임워크}
**점검일**: {날짜}
**전체 점수**: {P0 0건, P1 N건, P2 N건, P3 N건}

---

## 🔴 P0 — 즉시 수정 필요

### [영역] 이슈 제목
- **현재 상태**: {문제 설명}
- **영향**: {SEO에 미치는 영향}
- **수정 방법**:
```코드
// 수정 코드
```

---

## 🟠 P1 — 빠른 수정 권장

...

## 🟡 P2 — 개선 권장

...

## 🟢 P3 — 최적화 제안

...

---

## ✅ 통과 항목
- [x] {통과한 점검 항목}
- [x] ...

---

## 권장 액션 플랜

| 우선순위 | 작업 | 예상 효과 |
|---------|------|----------|
| 1 | {P0 이슈 수정} | 검색 결과 노출 |
| 2 | {P1 이슈 수정} | 클릭률 향상 |
| ... | ... | ... |
```

---

## 심각도 기준

| 등급 | 의미 | 영향 |
|------|------|------|
| **P0** | 즉시 수정 | 검색 결과에 아예 안 나오거나, 모바일 검색 불가 |
| **P1** | 빠른 수정 | 검색 순위 하락, SNS 공유 미리보기 깨짐 |
| **P2** | 개선 권장 | 최적화 기회 누락, 사용자 경험 저하 |
| **P3** | 최적화 제안 | 미세한 개선, 경쟁사 대비 우위 확보 |

---

## 다음 단계 안내

```
✅ SEO 감사 완료! (P0: {n}건, P1: {n}건, P2: {n}건, P3: {n}건)

다음 단계 (선택):
  security-reviewer    → 보안 점검
  /qpassenger          → Playwright 자동 테스트
  /commit              → 변경사항 커밋
```

---

> 상세 레퍼런스: [references/seo-patterns.md](references/seo-patterns.md)
