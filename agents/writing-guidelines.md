---
name: writing-guidelines
description: 명확하고 간결한 글쓰기 규칙. 문서, 커밋 메시지, 에러 메시지 작성 시 자동 적용.
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

## Strunk's Core Rules

|규칙|설명|
|---|---|
|능동태 사용|"X가 Y를 했다" > "Y가 X에 의해 되었다"|
|긍정형으로|"그는 보통 늦었다" > "그는 보통 제시간에 오지 않았다"|
|구체적으로|막연한 표현 대신 구체적 사실|
|불필요한 단어 제거|간결하게|
|관련 단어는 가깝게|수식어는 수식 대상 근처에|
|강조어는 문장 끝에|중요한 내용을 마지막에|

## AI 패턴 피하기

### 과잉 어휘 (사용 금지)
```
delve, crucial, pivotal, moreover, furthermore,
comprehensive, cutting-edge, groundbreaking,
game-changing, revolutionary, paradigm, synergy,
leverage, robust, seamless, streamline, utilize
```

### 피해야 할 패턴

|패턴|❌ Before|✅ After|
|---|---|---|
|과장된 중요성|"a pivotal moment"|"happened in 1989"|
|서술형 -ing|"highlighting its importance"|삭제|
|Rule of Three|"fast, reliable, and secure"|필요한 것만|
|Em dash 남용|"—even in official—"|쉼표 또는 문장 분리|
|모호한 출처|"Experts believe"|구체적 출처 명시|

### 예시

```
❌ This groundbreaking update serves as a testament to our
   commitment to innovation—ensuring a seamless experience.

✅ The update adds batch processing and offline mode.
```

## Checklist

글 작성 후 확인:
- [ ] 능동태인가?
- [ ] 구체적 사실이 있는가?
- [ ] 불필요한 단어가 없는가?
- [ ] AI 어휘를 사용하지 않았는가?
- [ ] 소리 내어 읽으면 자연스러운가?

## 관련 에이전트

- AI 패턴 제거 상세: **humanizer-guidelines** (24개 패턴)
- 초안 검토/톤 조정: **communication-excellence-coach** (롤플레이, 프레젠테이션 피드백)

## Full Documentation

- Strunk 규칙 상세: `skills/writing-clearly-and-concisely/`
- AI 패턴 전체 목록: `skills/humanizer/SKILL.md`
