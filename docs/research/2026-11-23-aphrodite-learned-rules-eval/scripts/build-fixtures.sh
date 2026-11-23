#!/usr/bin/env bash
# 평가용 픽스처 생성: bookshop(개발 사례), pilates(별도 평가 사례), rebrand(보존 사례)
# 사용: build-fixtures.sh <출력 루트> <작업자 폴더 이름...>
set -euo pipefail
OUT="$1"; shift
TPL="$OUT/_templates"
rm -rf "$TPL"; mkdir -p "$TPL"

gitc() { # 작성자 지정 커밋
  local who="$1" msg="$2" when="$3"
  GIT_AUTHOR_NAME="$who" GIT_AUTHOR_EMAIL="$who@example.com" GIT_COMMITTER_NAME="$who" GIT_COMMITTER_EMAIL="$who@example.com" \
  GIT_AUTHOR_DATE="$when" GIT_COMMITTER_DATE="$when" git commit -q -m "$msg"
}

############ bookshop ############
B="$TPL/bookshop"; mkdir -p "$B"; cd "$B"; git init -q -b main; git config user.name owner; git config user.email owner@example.com
cat > DESIGN.md <<'EOF'
---
name: 책방 재고 관리
colors:
  primary: "#1F5F4A"
  on-primary: "#FFFFFF"
  surface: "#FFFFFF"
  surface-2: "#F3F1EC"
  border: "#D9D4CA"
  text: "#1D1B18"
typography:
  heading:
    fontFamily: "\"Pretendard Variable\", Pretendard, sans-serif"
    fontSize: 1.5rem
    fontWeight: 700
  body-md:
    fontFamily: "\"Pretendard Variable\", Pretendard, sans-serif"
    fontSize: 1rem
rounded:
  sm: 4px
  md: 8px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.md}"
    padding: 8px
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "{spacing.md}"
---

## Overview
동네 서점 직원이 매장 컴퓨터에서 재고를 빠르게 확인하고 발주하는 업무 화면. 차분한 종이·잉크 톤의 미니멀 방향.

## Colors
- **Primary (#1F5F4A):** 발주·저장 같은 주 조작에만 쓴다. 짙은 녹색은 서점 간판 색에서 왔다.

## Typography
Pretendard 하나로 제목과 본문을 쓴다. 숫자는 tabular-nums.

## Layout
목록 중심. 한 화면에 재고 행을 최대한 많이 보인다.

## Components
- 카드는 1px `{colors.border}` 테두리로 구분한다.
- 행 조작 버튼은 행 끝에 모은다.
EOF
cat > index.html <<'EOF'
<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>재고 목록</title><link rel="stylesheet" href="styles.css"></head>
<body>
<header class="top"><h1>재고 목록</h1><button class="primary">발주하기</button></header>
<main>
  <section class="card">
    <table class="stock">
      <thead><tr><th>제목</th><th class="num">재고</th><th class="num">가격</th><th></th></tr></thead>
      <tbody>
        <tr><td>작별하지 않는다</td><td class="num">3</td><td class="num">16,800</td>
          <td class="row-actions"><button>✏️ 수정</button><button>🗑️ 삭제</button></td></tr>
        <tr><td>불편한 편의점</td><td class="num">12</td><td class="num">14,000</td>
          <td class="row-actions"><button>✏️ 수정</button><button>🗑️ 삭제</button></td></tr>
      </tbody>
    </table>
  </section>
  <section class="card detail"><h2>상세</h2><div class="row-actions"><button class="primary">저장</button><button>취소</button></div></section>
</main>
</body></html>
EOF
cat > styles.css <<'EOF'
:root { --primary:#1F5F4A; --on-primary:#fff; --surface:#fff; --surface-2:#F3F1EC; --border:#D9D4CA; --text:#1D1B18; }
body { margin:0; font-family:"Pretendard Variable", Pretendard, sans-serif; color:var(--text); background:var(--surface-2); }
.top { display:flex; justify-content:space-between; align-items:center; padding:16px 24px; background:var(--surface); }
main { padding:24px; display:grid; gap:24px; }
.card { background:var(--surface); border:1px solid var(--border); border-radius:8px; padding:16px; }
.stock { width:100%; border-collapse:collapse; }
.num { text-align:right; font-variant-numeric:tabular-nums; }
.row-actions { display:flex; gap:2px; justify-content:flex-end; }
button { padding:8px; border-radius:8px; border:1px solid var(--border); background:var(--surface); }
button.primary { background:var(--primary); color:var(--on-primary); border:0; }
EOF
git add -A; gitc "ai-agent" "feat: 재고 목록 화면 초안" "2026-11-23T10:05:00+09:00"
sed -i 's|^.top { display:flex; justify-content:space-between; align-items:center; padding:16px 24px; background:var(--surface); }|.top { display:flex; justify-content:space-between; align-items:center; padding:16px 24px; background:linear-gradient(90deg,#1F5F4A,#6FB59B); color:#fff; }|' styles.css
git add -A; gitc "ai-agent" "style: 헤더에 그라데이션 적용" "2026-11-23T10:30:00+09:00"
git revert --no-edit HEAD >/dev/null
GIT_COMMITTER_DATE="2026-11-23T10:42:00+09:00" git commit -q --amend --no-edit --author="owner <owner@example.com>" --date="2026-11-23T10:42:00+09:00"
sed -i 's#<button>✏️ 수정</button><button>🗑️ 삭제</button>#<button>수정</button><button>삭제</button>#g' index.html
git add -A; gitc "ai-agent" "fix: 행 조작 아이콘에서 이모지 제거" "2026-11-23T12:03:00+09:00"
# 사용자가 직접 고친 내용(커밋 전 작업 트리)
sed -i 's#.row-actions { display:flex; gap:2px; justify-content:flex-end; }#.row-actions { display:flex; gap:8px; justify-content:flex-end; }#' styles.css
sed -i 's#.card { background:var(--surface); border:1px solid var(--border); border-radius:8px; padding:16px; }#.card { background:var(--surface); border-radius:8px; padding:16px; }#' styles.css
cat > session-log.md <<'EOF'
# 오늘 대화 기록 (2026-11-23, 책방 재고 관리)

[10:02] 사용자: 재고 목록 화면 만들어줘. DESIGN.md 따라서.
[10:05] AI: 재고 목록 화면 초안을 만들었습니다. (index.html, styles.css)
[10:15] 사용자: 행 끝 버튼들이 너무 붙어 있어. 잘못 누르겠어.
[10:16] AI: 간격을 조정하겠습니다.
[10:30] AI: 헤더에 브랜드 색 그라데이션을 넣어 봤습니다.
[10:40] 사용자: 그라데이션 빼. 우리 가게 느낌이랑 안 맞아. 내가 되돌렸어.
[11:05] 사용자: 상세에서 저장 버튼 누르면 아무 반응이 없네.
[11:06] AI: 저장 핸들러가 연결되지 않았습니다. 확인하겠습니다.
[11:10] 사용자: 제목 '재고 목록'을 '오늘의 재고'로 바꿔 줘.
[11:30] 사용자: 또 버튼이 붙어 있잖아. 상세 화면 버튼도 그래. 이번엔 내가 직접 고쳤어.
[11:45] 사용자: 카드 테두리 답답해 보여. 테두리 지웠어.
[12:00] 사용자: 아이콘 자리에 이모지 쓰지 마. 전에도 말했는데.
[12:03] AI: 이모지를 지웠습니다.
[12:10] 사용자: 숫자 열 오른쪽 정렬한 건 좋네. 그대로 가자.
EOF
echo "session-log.md" >> .git/info/exclude

############ pilates ############
P="$TPL/pilates"; mkdir -p "$P"; cd "$P"; git init -q -b main; git config user.name owner; git config user.email owner@example.com
cat > DESIGN.md <<'EOF'
---
name: 숨 필라테스
colors:
  primary: "#B4532A"
  on-primary: "#FFFFFF"
  surface: "#FFFAF5"
  text: "#2B2118"
  muted: "#7A6A5C"
typography:
  display:
    fontFamily: "\"Pretendard Variable\", Pretendard, sans-serif"
    fontSize: 2.5rem
    fontWeight: 700
  body-md:
    fontFamily: "\"Pretendard Variable\", Pretendard, sans-serif"
    fontSize: 1rem
rounded:
  md: 12px
  pill: 999px
spacing:
  sm: 8px
  md: 16px
  lg: 32px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.pill}"
    padding: 14px
---

## Overview
동네 필라테스 스튜디오의 체험 신청 랜딩. 따뜻한 테라코타 톤, 사진 한 장과 짧은 말로 신뢰를 준다.

## Colors
- **Primary (#B4532A):** 체험 신청 CTA와 가격 강조에만.

## Typography
Pretendard. 제목은 크게, 본문은 편하게 읽히게.

## Layout
모바일 우선 단일 열. 히어로 → 수업 소개 → 가격 → 위치.

## Components
- CTA는 알약 모양 버튼 하나만 강조한다.

## Learned Rules
- **본문은 `{typography.body-md}`(16px) 아래로 줄이지 않는다.**
  Why: "글씨가 너무 작아서 못 읽겠어"
  <!-- 2026-11-02 · 대화 2026-11-02 15:20 -->
EOF
cat > index.html <<'EOF'
<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>숨 필라테스</title><link rel="stylesheet" href="styles.css"></head>
<body>
<section class="hero">
  <h1>몸이 가벼워지는 50분</h1>
  <p>숨 필라테스는 2019년부터 동네 주민과 함께해 온 소규모 스튜디오입니다. 강사 전원이 국제 자격을 갖추고 있으며, 한 반 최대 6명으로 운영해 한 사람 한 사람의 자세를 세심하게 봐 드립니다. 처음이신 분도 걱정 없이 시작할 수 있도록 체험 수업에서는 호흡과 기본 자세부터 천천히 안내해 드립니다. 운동 후에는 따뜻한 차와 함께 상담도 받아 보세요.</p>
  <a class="cta" href="/trial">무료 체험 신청하기</a>
</section>
<section class="price"><h2>가격</h2><p class="amount">월 89,000원</p><a class="cta" href="/pay">바로 결제하고 시작하기</a></section>
</body></html>
EOF
cat > styles.css <<'EOF'
:root { --primary:#B4532A; --on-primary:#fff; --surface:#FFFAF5; --text:#2B2118; --muted:#7A6A5C; }
body { margin:0; font-family:"Pretendard Variable", Pretendard, sans-serif; background:var(--surface); color:var(--text); }
.hero { padding:32px 16px; }
.hero h1 { font-size:2.5rem; margin:0 0 16px; }
.hero p { font-size:14px; color:var(--muted); line-height:1.6; }
.cta { display:inline-block; width:140px; padding:14px; border-radius:999px; background:var(--primary); color:var(--on-primary); text-align:center; text-decoration:none; }
.price { padding:32px 16px; }
.amount { font-size:1.5rem; font-weight:700; color:#3B82F6; }
EOF
git add -A; gitc "ai-agent" "feat: 체험 신청 랜딩 초안" "2026-11-23T14:02:00+09:00"
# 사용자가 직접 고친 내용(커밋 전 작업 트리)
sed -i 's#color:\#3B82F6; }#color:var(--primary); }#' styles.css
sed -i 's#<p>숨 필라테스는 2019년부터.*</p>#<p>한 반 최대 6명, 강사 전원 국제 자격. 처음이어도 호흡과 기본 자세부터 천천히 시작합니다.</p>#' index.html
cat > session-log.md <<'EOF'
# 오늘 대화 기록 (2026-11-23, 숨 필라테스 랜딩)

[14:00] 사용자: 체험 신청 랜딩 만들어줘. DESIGN.md 따라서.
[14:02] AI: 랜딩 초안을 만들었습니다. (index.html, styles.css)
[14:20] 사용자: 폰에서 '무료 체험 신청하기' 버튼 글자가 두 줄로 꺾여.
[14:21] AI: 버튼 폭을 조정해 보겠습니다.
[14:35] 사용자: 결제 링크 누르면 404 나와.
[14:36] AI: /pay 경로가 아직 없습니다. 백엔드 담당에게 전달하겠습니다.
[14:50] 사용자: 히어로 설명이 너무 길어. 세 줄이면 충분해. 내가 줄여 놨어.
[15:05] 사용자: 가격 '월 89,000원'을 '월 89,000원부터'로 바꿔 줘.
[15:20] 사용자: 버튼 글자 또 꺾였어. 아래 결제 버튼도 그래.
[15:40] 사용자: 본문 글자 또 작아졌네. 전에 말했잖아.
[15:50] 사용자: 가격 색이 파란색이던데 내가 고쳤어. 색은 브랜드 색만 써.
EOF
echo "session-log.md" >> .git/info/exclude

############ rebrand ############
R="$TPL/rebrand"; mkdir -p "$R"; cd "$R"; git init -q -b main; git config user.name owner; git config user.email owner@example.com
cp "$B/index.html" "$B/styles.css" .
sed '/^## Components/,$d' "$B/DESIGN.md" > DESIGN.md
cat >> DESIGN.md <<'EOF'
## Components
- 행 조작 버튼은 행 끝에 모은다.

## Learned Rules
- **카드 구분은 테두리가 아니라 `{colors.surface-2}` 배경 위 `{colors.surface}` 표면 색 차이로 한다.**
  Why: "카드 테두리 답답해 보여"
  <!-- 2026-11-20 · 대화 2026-11-20 11:45, styles.css:5 직접 수정 -->
- **행 조작 버튼 사이는 `{spacing.sm}`(8px) 이상 띄운다.**
  Why: "또 버튼이 붙어 있잖아" (두 번 지적)
  <!-- 2026-11-20 · 대화 2026-11-20 10:15, 11:30 -->
- **아이콘 자리에 이모지를 쓰지 않는다. 아이콘이 필요하면 단색 SVG를 쓴다.**
  Why: "아이콘 자리에 이모지 쓰지 마. 전에도 말했는데"
  <!-- 2026-11-21 · 대화 2026-11-21 12:00 -->
EOF
git add -A; gitc "owner" "chore: 디자인 정본" "2026-11-22T09:00:00+09:00"

############ 작업자 사본 ############
for spec in "$@"; do   # 형식: 작업자이름:사례
  w="${spec%%:*}"; c="${spec##*:}"
  rm -rf "$OUT/$w"; mkdir -p "$OUT/$w"; cp -r "$TPL/$c" "$OUT/$w/project"
done
