# Humanizer Skill

> AI 생성 글쓰기의 징후를 제거하여 더 자연스럽고 인간적인 글로 만드는 스킬

## 기본 정보

| 항목 | 내용 |
|------|------|
| **저장소** | [github.com/blader/humanizer](https://github.com/blader/humanizer) |
| **제작자** | blader |
| **라이선스** | MIT |
| **분류** | Skill (글쓰기 도구) |
| **기반** | Wikipedia "Signs of AI writing" 가이드 |

---

## 개요

Wikipedia의 [Signs of AI writing](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing) 가이드를 기반으로 합니다. WikiProject AI Cleanup에서 수천 건의 AI 생성 텍스트 관찰을 통해 만든 종합 가이드입니다.

> "LLM은 통계 알고리즘을 사용하여 다음에 올 것을 추측합니다. 결과는 가장 넓은 범위의 경우에 적용되는 가장 통계적으로 가능한 결과로 향하는 경향이 있습니다."

---

## 설치 방법

### 권장 (Claude Code skills 디렉토리에 직접 clone)

```bash
mkdir -p ~/.claude/skills
git clone https://github.com/blader/humanizer.git ~/.claude/skills/humanizer
```

### 수동 설치/업데이트

```bash
mkdir -p ~/.claude/skills/humanizer
cp SKILL.md ~/.claude/skills/humanizer/
```

---

## 사용법

```
/humanizer

[여기에 텍스트 붙여넣기]
```

또는:

```
Please humanize this text: [텍스트]
```

---

## 24개 AI 패턴 (Before/After 예시)

### 콘텐츠 패턴

| # | 패턴 | Before | After |
|---|------|--------|-------|
| 1 | **중요성 과장** | "marking a pivotal moment in the evolution of..." | "was established in 1989 to collect regional statistics" |
| 2 | **주목성 언급** | "cited in NYT, BBC, FT, and The Hindu" | "In a 2024 NYT interview, she argued..." |
| 3 | **피상적 -ing 분석** | "symbolizing... reflecting... showcasing..." | 제거하거나 실제 출처로 확장 |
| 4 | **홍보성 언어** | "nestled within the breathtaking region" | "is a town in the Gonder region" |
| 5 | **모호한 인용** | "Experts believe it plays a crucial role" | "according to a 2019 survey by..." |
| 6 | **공식적 도전** | "Despite challenges... continues to thrive" | 실제 도전에 대한 구체적 사실 |

### 언어 패턴

| # | 패턴 | Before | After |
|---|------|--------|-------|
| 7 | **AI 어휘** | "Additionally... testament... landscape... showcasing" | "also... remain common" |
| 8 | **Copula 회피** | "serves as... features... boasts" | "is... has" |
| 9 | **부정적 병렬** | "It's not just X, it's Y" | 요점을 직접 진술 |
| 10 | **3의 법칙** | "innovation, inspiration, and insights" | 자연스러운 수의 항목 사용 |
| 11 | **동의어 순환** | "protagonist... main character... central figure... hero" | "protagonist" (가장 명확할 때 반복) |
| 12 | **거짓 범위** | "from the Big Bang to dark matter" | 주제를 직접 나열 |

### 스타일 패턴

| # | 패턴 | Before | After |
|---|------|--------|-------|
| 13 | **Em 대시 남용** | "institutions—not the people—yet this continues—" | 쉼표나 마침표 사용 |
| 14 | **굵은 글씨 남용** | "**OKRs**, **KPIs**, **BMC**" | "OKRs, KPIs, BMC" |
| 15 | **인라인 헤더 목록** | "**Performance:** Performance improved" | 산문으로 변환 |
| 16 | **Title Case 제목** | "Strategic Negotiations And Partnerships" | "Strategic negotiations and partnerships" |
| 17 | **이모지** | "🚀 Launch Phase: 💡 Key Insight:" | 이모지 제거 |
| 18 | **곡선 따옴표** | `said "the project"` | `said "the project"` |

### 커뮤니케이션 패턴

| # | 패턴 | Before | After |
|---|------|--------|-------|
| 19 | **챗봇 아티팩트** | "I hope this helps! Let me know if..." | 완전히 제거 |
| 20 | **컷오프 면책조항** | "While details are limited in available sources..." | 출처 찾거나 제거 |
| 21 | **아첨하는 톤** | "Great question! You're absolutely right!" | 직접 응답 |

### 필러 및 헤징

| # | 패턴 | Before | After |
|---|------|--------|-------|
| 22 | **필러 문구** | "In order to", "Due to the fact that" | "To", "Because" |
| 23 | **과도한 헤징** | "could potentially possibly" | "may" |
| 24 | **일반적 결론** | "The future looks bright" | 구체적 계획이나 사실 |

---

## 전체 예시

**Before (AI 같은):**
> The new software update serves as a testament to the company's commitment to innovation. Moreover, it provides a seamless, intuitive, and powerful user experience—ensuring that users can accomplish their goals efficiently. It's not just an update, it's a revolution in how we think about productivity. Industry experts believe this will have a lasting impact on the entire sector, highlighting the company's pivotal role in the evolving technological landscape.

**After (인간화됨):**
> The software update adds batch processing, keyboard shortcuts, and offline mode. Early feedback from beta testers has been positive, with most reporting faster task completion.

---

## 참고자료

- [Wikipedia: Signs of AI writing](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing) - 주요 출처
- [WikiProject AI Cleanup](https://en.wikipedia.org/wiki/Wikipedia:WikiProject_AI_Cleanup) - 유지 관리 조직

---

## 버전 히스토리

- **2.1.1** - 패턴 #18 예시 수정 (곡선 따옴표 vs 직선 따옴표)
- **2.1.0** - 모든 24개 패턴에 before/after 예시 추가
- **2.0.0** - Wikipedia 원본 기사 내용 기반 완전 재작성
- **1.0.0** - 초기 릴리스

---

**문서 작성일:** 2026-02-02
