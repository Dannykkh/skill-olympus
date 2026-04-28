# Global Dictionary Sync

도메인사전 스킬이 글로벌 사전(사용자 자산)과 프로젝트 사전(진실의 원천) 사이를 동기화하는 절차.

## 글로벌 사전 폴더

위치: `~/.claude/memory/domain-dictionaries/`

```
~/.claude/memory/domain-dictionaries/
├── README.md          ← 사용 안내
├── ecommerce.md       ← 이커머스 공통 용어
├── healthcare.md      ← 의료 공통 용어
├── finance.md         ← 금융 공통 용어
├── education.md       ← 교육 공통 용어
├── logistics.md       ← 물류 공통 용어
├── manufacturing.md   ← 제조 공통 용어
├── realestate.md      ← 부동산 공통 용어
└── general.md         ← 도메인 무관 (인증, 세션, 감사 등 보편 개념)
```

### 폴더 자동 생성

스킬 첫 실행 시 폴더가 없으면 자동 생성하고 README 시드를 복사합니다.

```bash
# 스킬 시작 시 체크
GLOBAL_DICT_DIR="$HOME/.claude/memory/domain-dictionaries"
if [ ! -d "$GLOBAL_DICT_DIR" ]; then
  mkdir -p "$GLOBAL_DICT_DIR"
  # README 시드 복사 (스킬 references에서)
  cp "$HOME/.claude/skills/domain-dictionary/references/global-readme-template.md" \
     "$GLOBAL_DICT_DIR/README.md"
  echo "글로벌 도메인사전 폴더 생성: $GLOBAL_DICT_DIR"
fi
```

(Codex는 `~/.codex/skills/...`, Gemini는 `~/.gemini/skills/...` 경로로 변경)

## 도메인 자동 추정

zephermine 컨텍스트 모드에서는 인터뷰의 `[Industry: {산업군}]` 태그로 도메인을 자동 결정.

| Industry 태그 | 글로벌 사전 파일 |
|--------------|----------------|
| 의료/헬스케어 | healthcare.md |
| 금융/핀테크 | finance.md |
| 이커머스 | ecommerce.md |
| 교육/에듀테크 | education.md |
| 물류/SCM | logistics.md |
| 제조 | manufacturing.md |
| 부동산 | realestate.md |
| 범용 (불명확) | general.md |

코드베이스 모드(직접 호출)에서는 사용자에게 도메인을 묻습니다:

```
question: "이 프로젝트의 주 도메인은?"
options:
  - ecommerce
  - healthcare
  - finance
  - education
  - logistics
  - manufacturing
  - realestate
  - general (도메인 무관)
  - 기타 (직접 입력)
```

## Phase 2 시드 (Step 8 끝): 글로벌 → 프로젝트

zephermine Step 8 끝 부산물 동작:

1. 글로벌 사전 파일(`{도메인}.md`) 존재 확인
2. **있으면**: 후보 용어 multiSelect로 사용자에게 제시
3. **없으면**: 글로벌 시드 없이 spec/interview에서만 추출
4. 사용자가 ✅한 용어만 프로젝트 사전 v1 시드에 포함

```
question: "이 프로젝트에 가져올 ecommerce 도메인 공통 용어를 선택하세요.
글로벌 사전에서 12개 용어를 발견했습니다. 이 프로젝트에 필요한 것만 가져옵니다."
header: "Global Seed"
multiSelect: true
options:
  - label: "Cart (장바구니)"
    description: "결제 전 임시 상품 목록"
  - label: "Order (주문)"
    description: "고객의 구매 요청"
  - label: "SKU (상품 단위)"
    description: "Stock Keeping Unit"
  ...
```

Phase 2가 짧거나 단순한 프로젝트면 자동 건너뜀(spec.md에 핵심 용어가 5개 미만).

## Phase 3 끝 (Step 11 끝): 프로젝트 → 글로벌

사용자가 명시 선택한 항목만 글로벌에 반영. 자동 업그레이드 ❌.

### 반영 절차

1. 프로젝트 사전 v3에서 신규 추가된 용어 또는 글로벌과 다른 정의 추출
2. 사용자에게 multiSelect로 글로벌 반영 여부 확인 (Step 11 multiSelect 3번)
3. 선택된 항목을 글로벌 사전에 추가하면서 **출처 메타데이터** 포함

### 출처 메타데이터 형식

```markdown
## Wishlist
**정의**: 구매 의도 없는 관심 상품 목록
**영문 식별자**: `wishlist`
**한글 표기**: 찜
**금지 표현**: ~~bookmark~~, ~~favorite~~ (의도 차이)

### 메타데이터
- **출처**: 프로젝트 `<project-name>` (2026-04-28)
- **확신도**: 1 (첫 등장)
- **인용 횟수**: 1
```

### 동일 용어가 다시 등장하면

다음 프로젝트에서도 같은 용어가 반영되면 **확신도 +1, 인용 횟수 +1**:

```markdown
### 메타데이터
- **출처**: 프로젝트 `proj-A` (2026-04-28), `proj-B` (2026-05-15), `proj-C` (2026-06-20)
- **확신도**: 3 (3개 프로젝트에서 동일 정의 채택)
- **인용 횟수**: 3
```

확신도가 높을수록 글로벌 사전의 권위가 높아짐 = 다음 프로젝트에서 자동 채택 권장도 ↑.

### 정의 충돌 시

기존 글로벌 정의와 새 프로젝트의 정의가 **다르면**:

1. 자동 덮어쓰기 ❌
2. 사용자에게 선택지 제시:
   - **A) 글로벌은 그대로, 프로젝트 정의는 별칭으로 추가**: 글로벌 `Order = 주문`, 프로젝트 `Order = 명령서` → 글로벌에 "법무 도메인에선 명령서 의미" 별칭 표기
   - **B) 프로젝트 정의로 글로벌 업데이트**: 글로벌 정의 수정 + "이전 정의" 이력 보존
   - **C) 글로벌화 보류**: 프로젝트 정의는 프로젝트에만 남기고 글로벌은 손대지 않음

**기본 권장: C** (충돌은 보통 도메인 차이 때문이고, 강제 통일은 위험)

## 글로벌 사전 파일 형식

```markdown
# Global Domain Dictionary — Ecommerce

> 사용자 자산 — 여러 프로젝트에서 누적된 이커머스 도메인 용어
> 마지막 업데이트: 2026-04-28

## 목적
이 사전은 **참고용 씨앗**입니다. 새 프로젝트 시작 시 여기서 후보 용어를 가져오되, 프로젝트가 최종 결정권자입니다.

## 핵심 용어

### Cart
**정의**: 결제 전 임시로 모은 상품 목록
**영문 식별자**: `cart`
**한글 표기**: 장바구니
**금지 표현**: ~~basket~~, ~~bag~~

#### 메타데이터
- **출처**: proj-A (2026-01-15), proj-B (2026-03-02), proj-C (2026-04-28)
- **확신도**: 3
- **인용 횟수**: 3

### Order
...

### SKU
...

## 변경 이력

| 날짜 | 변경 | 출처 |
|------|------|------|
| 2026-04-28 | + Wishlist 추가 | proj-C |
| 2026-04-28 | Cart 인용 +1 | proj-C |
| 2026-03-02 | Cart 인용 +1 | proj-B |
| 2026-01-15 | 초안 (proj-A) | proj-A |
```

## 글로벌 사전이 비어있으면?

첫 사용 시 글로벌 사전은 비어있습니다. 처음 몇 프로젝트는 시드 없이 시작하고, 시간이 흐르면서 사용자의 도메인 지식이 누적됩니다.

이는 의도된 설계입니다 — 외부에서 가져온 일반론적 사전보다 사용자의 실제 작업에서 우러난 사전이 더 정확합니다.

## 다른 CLI 호환

이 글로벌 사전은 **Claude/Codex/Gemini 모두 공유**합니다 (mnemo 패턴과 동일):
- Claude: `~/.claude/memory/domain-dictionaries/`
- Codex: `~/.codex/memory/domain-dictionaries/` (sync 스크립트가 동기화)
- Gemini: `~/.gemini/memory/domain-dictionaries/` (sync 스크립트가 동기화)

또는 단일 위치 공유: `~/.claude/memory/domain-dictionaries/`를 모든 CLI가 참조하도록 심볼릭 링크 또는 환경 변수 설정 (구현은 install 스크립트에서 결정).
