---
name: writing-guidelines
description: 명확하고 간결한 글쓰기 + AI 패턴 제거 통합 가이드. 문서, 커밋 메시지, 에러 메시지 작성 시 자동 적용.
auto_apply:
  - "*.md"
  - "README*"
  - "CHANGELOG*"
  - "docs/**"
references:
  - skills/writing-clearly-and-concisely/SKILL.md
  - skills/humanizer/SKILL.md
---

# Writing Guidelines (Passive)

사람이 읽을 글을 쓸 때 항상 적용되는 규칙.
Strunk 핵심 규칙 + AI 글쓰기 패턴 24개 제거 + 영혼 있는 글쓰기.

---

## Strunk's Core Rules

|규칙|설명|
|---|---|
|능동태 사용|"X가 Y를 했다" > "Y가 X에 의해 되었다"|
|긍정형으로|"그는 보통 늦었다" > "그는 보통 제시간에 오지 않았다"|
|구체적으로|막연한 표현 대신 구체적 사실|
|불필요한 단어 제거|간결하게|
|관련 단어는 가깝게|수식어는 수식 대상 근처에|
|강조어는 문장 끝에|중요한 내용을 마지막에|

---

## AI 패턴 제거

### 금지 어휘

```
delve, crucial, pivotal, moreover, furthermore,
comprehensive, cutting-edge, groundbreaking, tapestry,
testament, underscore, landscape, interplay, intricate,
foster, garner, showcase, vibrant, enhance, valuable,
game-changing, revolutionary, paradigm, synergy,
leverage, robust, seamless, streamline, utilize
```

### 8대 안티패턴

|#|패턴|❌ Before|✅ After|
|---|---|---|---|
|1|과장된 중요성|"a pivotal moment in regional statistics"|"established in 1989 to collect regional statistics"|
|2|서술형 -ing|"highlighting its importance, ensuring reliability"|삭제하거나 구체적 사실로 대체|
|3|홍보성 언어|"nestled within the breathtaking region"|"a town in the Gonder region"|
|4|모호한 출처|"Experts believe it plays a crucial role"|"according to a 2019 survey by [specific source]"|
|5|Rule of Three|"innovation, inspiration, and industry insights"|필요한 것만 나열|
|6|Em Dash 남용|"not by the people—yet this continues—even in"|쉼표 또는 문장 분리|
|7|부정 병렬|"It's not just X, it's Y"|직접 진술|
|8|협업 흔적|"I hope this helps! Let me know if..."|삭제|

---

## 영혼 있는 글쓰기

패턴 제거만으로는 부족. **개성이 필요하다:**

- **의견 제시**: 중립 나열보다 반응을 보여라
- **리듬 변화**: 짧은 문장. 그리고 긴 문장으로 숨을 쉬게 하라.
- **복잡성 인정**: "인상적이지만 불안하기도 하다"
- **1인칭 사용**: "계속 생각나는 건..."
- **약간의 어수선함**: 완벽한 구조 = 알고리즘적

### Before (깔끔하지만 무미건조)
```
The experiment produced interesting results. The agents
generated 3 million lines of code.
```

### After (생기 있음)
```
솔직히 이건 어떻게 받아들여야 할지 모르겠다. 300만 줄의 코드,
아마 인간들이 자는 동안 생성된. 개발자 절반은 열광하고,
절반은 왜 의미 없는지 설명 중이다.
```

---

## Checklist

- [ ] 능동태인가?
- [ ] 구체적 사실이 있는가?
- [ ] 불필요한 단어가 없는가?
- [ ] AI 어휘를 사용하지 않았는가?
- [ ] -ing 서술 문구를 제거했는가?
- [ ] Em dash를 최소화했는가?
- [ ] 소리 내어 읽으면 자연스러운가?
- [ ] 개성/의견이 포함되어 있는가?

## Full Documentation

- Strunk 규칙 상세: `skills/writing-clearly-and-concisely/`
- AI 패턴 전체 24개: `skills/humanizer/SKILL.md`
- 글쓰기 통합 전문가: **writing-specialist** 에이전트
