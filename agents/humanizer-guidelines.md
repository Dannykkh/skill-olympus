---
name: humanizer-guidelines
description: AI 글쓰기 패턴 제거 가이드. 문서/글 작성 시 참조.
auto_apply:
  - "*.md"
  - "docs/**"
references:
  - skills/humanizer/SKILL.md
---

# Humanizer Guidelines (Passive)

AI가 쓴 글을 자연스럽게 만드는 24개 패턴 가이드.

## AI 과잉 어휘 (사용 금지)

```
delve, crucial, pivotal, moreover, furthermore,
comprehensive, cutting-edge, groundbreaking, tapestry,
testament, underscore, landscape, interplay, intricate,
foster, garner, showcase, vibrant, enhance, valuable
```

## 주요 패턴 & 수정

### 1. 과장된 중요성
```
❌ "a pivotal moment in regional statistics"
✅ "established in 1989 to collect regional statistics"
```

### 2. 서술형 -ing 문구
```
❌ "highlighting its importance, ensuring reliability"
✅ 삭제하거나 구체적 사실로 대체
```

### 3. 홍보성 언어
```
❌ "nestled within the breathtaking region"
✅ "a town in the Gonder region"
```

### 4. 모호한 출처
```
❌ "Experts believe it plays a crucial role"
✅ "according to a 2019 survey by [specific source]"
```

### 5. Rule of Three
```
❌ "innovation, inspiration, and industry insights"
✅ 필요한 것만 나열
```

### 6. Em Dash 남용
```
❌ "not by the people—yet this continues—even in"
✅ 쉼표 또는 문장 분리
```

### 7. 부정 병렬
```
❌ "It's not just X, it's Y"
✅ 직접 진술
```

### 8. 협업 흔적
```
❌ "I hope this helps! Let me know if..."
✅ 삭제
```

## 영혼 있는 글쓰기

패턴 제거만으로는 부족. 개성이 필요:

- **의견 제시**: 중립 나열 < 반응
- **리듬 변화**: 짧은 문장. 그리고 긴 문장.
- **복잡성 인정**: "인상적이지만 불안하기도"
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

## Checklist

- [ ] AI 어휘 사용 안 함
- [ ] -ing 서술 문구 제거
- [ ] 구체적 출처 명시
- [ ] Em dash 최소화
- [ ] 소리 내어 읽으면 자연스러움
- [ ] 개성/의견 포함

## Full Reference

전체 24개 패턴: `skills/humanizer/SKILL.md`
