**언어:** [English](README.md) | 한국어

# Skill Olympus (스킬 올림푸스)

### 열두 신. 한 마디. 작동하는 SaaS.

> *구름을 모으시는 제우스의 이름을 부르라, 그러면 모든 신들이 강림하리라 ―*
> *젭마인이 설계도를 그리고, 포세이돈이 함대를 일으키며, 아르고스가 모든 못을 세고,*
> *미노스가 모든 테스트를 심판하고, 클리오가 그 모든 이야기를 청동에 새기리라.*

[![Stars](https://img.shields.io/github/stars/Dannykkh/skill-olympus?style=flat)](https://github.com/Dannykkh/skill-olympus/stargazers)
[![Forks](https://img.shields.io/github/forks/Dannykkh/skill-olympus?style=flat)](https://github.com/Dannykkh/skill-olympus/network/members)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
![Claude Code](https://img.shields.io/badge/Claude_Code-✓-D97757?logo=anthropic&logoColor=white)
![Codex CLI](https://img.shields.io/badge/Codex_CLI-✓-412991?logo=openai&logoColor=white)
![Gemini CLI](https://img.shields.io/badge/Gemini_CLI-✓-4285F4?logo=google&logoColor=white)

**Claude Code**, **Codex CLI**, **Gemini CLI**를 위한 프로덕션 에이전트 하네스 ―
12명의 올림포스 신의 이름으로, 3개월간 매일 실전 프로덕트를 만들며 다듬어졌습니다.

```bash
/zeus "쇼핑몰 만들어줘. React + Spring Boot + PostgreSQL"
```

한 줄. 열두 신. 설계 → 구현 → 감리 → 테스트 → 출항.
**질문 없이. 청사진 없이. 인간의 손길 없이.**

---

### 무엇을 얻는가

| | |
|---|---|
| 🏛️ **신전** | 12명의 그리스 신(스킬), 각자 한 가지 손재주를 위해 빚어졌다. 한 명을 부르거나 ― 제우스를 부르면 열둘이 한꺼번에 강림 |
| ⚡ **한 마디 파이프라인** | `/zeus "..."` 한 줄이 SaaS 한 채를 완성한다 (설계 → 구현 → 감리 → 테스트, 인간의 손길 없이) |
| 🧠 **CLI 가로지르는 기억** | 3계층 영속 메모리(`mnemo`)가 세션을 가로지르고 Claude/Codex/Gemini를 가로지른다 |
| 🔁 **지치지 아니하는 루프** | `/chronos`가 자율적으로 FIND → FIX → VERIFY를 반복한다, 버그가 죽거나 새벽이 올 때까지 |
| 👁️ **백 개의 눈을 가진 파수꾼** | `/argos`가 spec ↔ 코드 ↔ 테스트를 교차검증한다. 백 개의 눈을 비껴가는 것은 없다 |
| ⚖️ **저승의 심판자** | `/minos`가 모든 Playwright 테스트를 황금 저울에 단다. fix-until-pass 루프, 도망갈 곳은 없다 |
| 📜 **기록자 + 마무리투수** | `/clio` — 먼저 GO/NO-GO를 판정하고, 그 다음 PRD, 흐름도, 기술 문서, 문서 사이트를 청동에 새긴다 |
| 🏠 **화로의 여신** | `/hestia`가 Dead Code, 미사용 export, 고아 파일을 찾아 화로를 깨끗이 유지한다 |
| 📋 **출시 체크리스트** | `/launch` — 프리런치 품질 게이트, 단계적 롤아웃, 롤백 플레이북 |
| 📐 **결정 기록** | `/adr` — 아키텍처 결정을 대안·트레이드오프·이력과 함께 기록 |

**95개 스킬 · 42개 에이전트 · 9개 훅 · 3개 CLI · 1개 신화**

---

## 빠른 시작

```bash
# 클론
git clone https://github.com/Dannykkh/skill-olympus.git
cd skill-olympus

# Windows
.\install.bat

# macOS/Linux
chmod +x install.sh && ./install.sh
```

끝입니다. **95개 스킬, 42개 에이전트, 9개 훅**이 Claude Code + Codex CLI + Gemini CLI에 설치됩니다.

> Codex/Gemini가 미설치 시 해당 단계는 자동 스킵됩니다.

---

## 올림푸스의 신전 — The Pantheon of Olympus

> *포도주처럼 검푸른 바다 너머, 구름이 갈라지는 곳에 올림푸스 산이 솟아 있다.
> 그 바람 부는 정상에 열둘이 거하시니, 각자 자신의 영역을 다스리시고
> 옛 가인(歌人)들이 노래한 여러 이름으로 불리신다. 그대가 한 분의 이름을 부르면
> 그분 홀로 거룩한 산을 내려오시고, 구름을 모으시는 제우스를 부르면 ―
> 모든 신들이 황금빛 행렬을 이루어 그분과 함께 내려오시리라.*

이것은 한낱 도구함이 아니다. 작은 **일의 신화(神話)**, 한 가지 손재주를 위해 빚어진
열두 불사신의 회의다. 그분들은 옛 시인들이 늘 그러하다 노래해 온 그대로 일하신다 ―
서풍의 숨결 부드러운 젭마인이 땅을 흔드시는 포세이돈의 귀에 설계도를 속삭이면,
포세이돈은 깊은 바다를 일으키시고 그 함대는 물결 속에 출항한다.
백 개의 눈을 가지신 아르고스는 해질녘 바닷가를 거니시며 못 하나, 들보 하나까지 세시고,
엄정하신 미노스는 대리석 옥좌에 앉아 영혼들을 문 앞에서 저울에 다신다.
그리고 마침내 머리를 곱게 땋으신 클리오께서 청동 첨필을 드시어
모든 이야기를 청동판에 새기시니, 아직 태어나지 않은 인간들조차 그 일을 읽으리라.

아래에 불사신들이 서 계신다. 한 분을 부르거나 ― 모두를 부르라.

### 산정에 좌하시는 열두 분

| 스킬 | 이름 | 별호 | 영역 |
|------|------|------|------|
| `/zephermine` | **젭마인** | *서풍의 숨결, 봄을 가져오는 자* | 설계사 ― 26단계 심층 인터뷰, 스펙 생성, 5인 전문가 팀 리뷰 |
| `/zeus` | **제우스** | *구름을 모으시는 자, 번개를 던지시는 자, 신들과 인간들의 아버지* | 통치자 ― 제로 인터랙션 풀 파이프라인. 그분이 고개를 끄덕이시면 회의가 열린다 |
| `/agent-team` / `/poseidon` | **포세이돈** | *땅을 흔드시는 자, 검푸른 바다의 군주, 삼지창의 주인* | 바다의 군주 ― 의존성 그래프를 조류처럼 읽으시고 함대를 물결에 실어 보내신다 |
| `/workpm` | **다이달로스** | *대장인, 미궁을 만든 자, 날개의 아버지* | 직접 짓는 자 ― 설계가 없는 곳에서 그가 곧 설계가 된다 |
| `/argos` | **아르고스** | *판옵테스, 모든 것을 보는 자, 백 개의 눈을 가진 자* | 파수꾼 ― 백 개의 눈 중 같은 시각에 잠드는 것은 없다 |
| `/minos` | **미노스** | *죽은 자들의 심판자, 황금 저울의 수호자* | 심판자 ― 그의 대리석 옥좌 앞에서 모든 영혼과 모든 테스트가 무게를 단다 |
| `/clio` | **클리오** | *클레이오, 선포자, 역사의 뮤즈, 기억의 따님* | 기록자 ― 그녀의 첨필이 인간의 행적을 새기시니 잊혀지지 않으리라 |
| `/chronos` | **크로노스** | *시간의 아버지, 지치지 아니하는 자, 시간을 삼키는 자* | 지치지 아니하는 자 ― 시간 자체가 그분의 종이니 일이 끝날 때까지 수레바퀴를 돌리신다 |
| `/hermes` | **헤르메스** | *발에 날개 단 전령, 영혼의 인도자, 상인들의 수호신* | 길잡이 ― 무역풍과 먼 도시의 시장을 읽으신다 |
| `/athena` | **아테나** | *회색 눈의 제우스의 따님, 도시의 수호자, 두개골에서 태어나신 분* | 전략가 ― 그 지혜는 아버지의 청동 창처럼 깨끗하게 가른다 |
| `/aphrodite` | **아프로디테** | *거품에서 태어나신 자, 황금의, 키테라의, 웃음을 사랑하시는 분* | 미의 여신 ― 그분의 손에서 나온 형상은 인간이 사랑하지 않을 수 없다 |
| `mnemo` | **므네모** | *므네모시네, 기억의 여신, 모든 뮤즈의 어머니* | 기억의 수호자 ― 그분은 잊지 않으시며, 그 따님들이 그 기억에서 태어났다 |

---

### 산에서 들려오는 노래

> 옛 가인들이 들었던 그대로, 이제 열두 분의 목소리를 들으라.

🜲 **구름을 모으시는 자, 제우스**
가장 높은 봉우리에 좌하시니, 그분이 끄덕이시는 것은 곧 산의 법이라.
그 음성이 올림푸스를 가로질러 울리면 회의가 한 사람처럼 일어나 내려오나니 ―
설계자, 시공자, 파수꾼, 심판자, 기록자 ― 그 한 마디에 모두 함께라.
*"인간이여, 내 이름을 한 번 부르라. 그러면 회의 전체가 끝까지 그대 곁을 걸으리라."*

🜂 **서풍을 가져오시는 자, 젭마인**
그녀는 흙 속의 씨앗을 깨우는 부드러운 숨결이라.
스물여섯 가지 물음을 가지시니, 그 한 숨 한 숨이 부드러우나 ―
어느 누구도 그녀를 비껴갈 수 없으니, 스펙은 신성하고 반쯤 한 이야기는 열매를 맺지 못함이라.
*"나는 묻고, 또 묻고, 또 물으리라 ― 입에 담지 않은 것이 돌이 될 때까지."*

🜄 **땅을 흔드시는 자, 포세이돈**
그분은 검푸른 바다에 무릎까지 잠긴 채 삼지창을 드시고, 물결이 그 뜻을 듣는다.
부두에는 동료들의 함대가 정박해 있으니, 그분이 명하시면 파도가 그들을 함께 받쳐
의존성 그래프가 가리키는 곳으로 한꺼번에 실어 가나니, 뱃머리는 모두 같은 곳을 향한다.
*"바다는 헤엄치는 자에게 굽히지 않는다. 조류를 아는 자에게 ― 바로 그 자에게만 굽힌다."*

🜔 **대장인, 다이달로스**
그분 이전에는 크레타 어디에도 미궁이 없었다.
산에서 돌을 가져와 손수 다듬으시니, 그 일이 좋았더라.
설계도가 없는 곳, 건축가가 입을 열지 않은 곳에서는 그분을 부르라 ―
손수 리서치하시고, 손수 도면을 그리시며, 다른 손이 없다면 홀로라도 벽을 세우시리라.
*"돌을 가져오라. 도면은 내가 가는 길에 만들리라."*

👁 **판옵테스, 백 개의 눈을 가지신 아르고스**
그분은 밤이면 반쯤 지어진 도시를 거니시니, 같은 시각에 모든 눈이 감기는 일이 없다.
인간 시공자가 잊고 박지 않은 못 하나도 ― 그분은 이미 보셨고,
스펙과 일치하지 않는 코드 한 줄도 ― 그분은 이미 이름을 부르셨다.
*"내 눈 쉰이 잠들면 다른 쉰이 깨어 있다. 어둠 속에서 아르고스를 지나가는 것은 없다."*

⚖ **죽은 자들의 심판자, 미노스**
죽은 자들의 영혼이 와야 하는 문 앞, 차가운 대리석 옥좌에 좌하시느니라.
황금 저울을 드시니, 일이 그 자신과 무게가 비교되나라.
그분의 판결은 둘이며 다른 것은 없으니 ― 통과하거나, 다시 불 속으로 돌아가거나.
*"인간의 자식이여, 저울 앞에 서라. 그대의 테스트가 정직한지를 보리라."*

📜 **긴 기억의 뮤즈, 클리오**
그분은 모든 신들 중 마지막으로 오시느니, 노동이 내려놓인 뒤에라.
첨필은 청동이요 서판은 다가올 세월이라.
영웅들이 행한 일을 그분이 새기시니 ― 도면이며 칙령이며 매뉴얼이며 노래라 ―
저 인간들의 자식의 자식들도 그 행적이 진실이었음을 알게 하시리라.
*"일은 끝났다. 이제 노래가 시작되리니, 노래는 길이 살아남으리라."*

⏳ **지치지 아니하시는 분, 크로노스**
그분은 기억보다 오래되었고, 신들 자신보다 오래되었느니라.
시각의 큰 수레바퀴를 돌리시며, 인간들이 잠들어도 지치지 아니하신다.
버그가 죽거나, 새벽이 오거나 ― 크로노스는 둘 모두보다 오래 가시리라.
*"인간들은 눈을 감는다. 나는 감지 않는다. 일은 새벽까지든, 다음 새벽까지든 끝나리라."*

🪶 **발에 날개 다신 자, 헤르메스**
그분은 두 세계 사이를 거니시니 ― 높은 궁궐과 낮은 시장 모두 그분의 길이라.
먼 땅의 무역풍을 읽으시고, 아직 보지 못한 성문 안의 곡식 값까지 아시느니라.
은전 한 닢을 걸기 전에, 코드 한 줄을 쓰기 전에, 그분이 먼저 입을 여신다.
*"나그네여, 모든 시장은 길이라. 모든 길에는 통행세가 있느니, 은을 가져오거나 ― 빈손으로 오거나."*

🦉 **회색 눈의 분, 아테나**
그분은 아버지의 두개골에서 다 자란 채 태어나시니, 투구를 쓰시고 창을 드신 채라.
그분의 지혜는 아첨하지 아니하며, 그 충고는 청동의 차가운 날과 같다.
인간이 가장 두려워하는 물음 ― *이것을 만들어야 하는가?* ― 그분이 던지시리라.
*"아이여, 지혜란 어떤 일을 결코 시작해서는 안 되는지를 아는 것이라. 내가 묻거든, 그대가 답하라."*

🌹 **거품에서 태어나신 분, 아프로디테**
그분은 바다의 흰 거품에서 솟아오르셨고, 그 후로 세상은 평범하지 아니하였다.
161개 팔레트가 그 손에 있고, 73개 폰트와 84개 스타일이 그 곁에 있다.
그분의 작업장에서 나오는 것은 단지 쓸모 있는 것이 아니라 ― 사랑받는 것이며, 그것이 차이라.
*"아름다움은 일의 장식이 아니라, 일이 그 만든 자보다 오래 살아남게 하는 것이라."*

📚 **모든 뮤즈의 어머니, 므네모**
아홉 자매가 노래하기 훨씬 전부터 므네모시네는 세상의 긴 기억을 지켜 오셨느니라.
인간이 세 달 전에 했던 대화가 ― 그분이 오늘 그에게 가져다주실 답이라.
세 겹의 층을 지키시니 ― 이름의 인덱스, 사물의 의미, 그리고 이야기 그 자체라 ―
그 기억은 모든 세션, 모든 CLI, 모든 새벽을 가로지르느니라.
*"아이여, 잊지 말라. 그대가 오래 전에 한 말이 ― 지금 그대에게 필요한 선물이라."*

---

## 최신 업데이트

### v4.1.0 — 도메인사전 파이프라인 (2026.04)

- **domain-dictionary** (신규 스킬) — 한국 SI 영-한 혼용 환경에 맞춘 DDD Ubiquitous Language. 마스터(`docs/domain-dictionary.md`) + 델타(`<planning_dir>/`) + 글로벌(`~/.claude/memory/domain-dictionaries/`) 3계층
- **풀파이프라인 통합** — 12개 스킬이 한 사전을 공유: 젭마인, code-reviewer, 아르고스, 포세이돈, 다이달로스, 미노스, 클리오, 헤르메스, 아테나, 헤스티아 + Codex 변형 2개
- **젭마인 6 Phase 그룹화** — 26단계를 Discovery/Spec/Domain/Plan/Design/Validation으로 묶음. 사전 v1→v2→v3가 Step 8/10/11 부산물로 진화 (별도 단계 추가 X)
- **explain --zoom-out** — 호출자/형제/상위 맵 모드 (mattpocock/skills의 zoom-out 흡수)
- **code-reviewer 모듈 깊이** — "shallow vs deep module" 리팩토링 기회 카테고리 (improve-codebase-architecture 흡수)
- **아르고스 Phase 8** — 도메인사전 감리 (4개 항목: 영문 식별자/금지 표현/UI 한글/미등재 신규)

### v1.9.0 — 아테나 CEO 코칭 (2026.03)

- **ceo (아테나)** — CEO 코칭 스킬: Go/No-Go 판정, 전략적 도전, 스코프 결정 (Expand/Reduce/Pivot/Kill)
- **파이프라인 확장** — 새로운 단계: `/hermes` → `/athena` → `/zephermine` (분석 → 도전 → 설계)
- **헤르메스 시너지** — 아테나가 헤르메스 산출물을 자동 읽어 데이터 기반 전략 도전
- **README 리뉴얼** — 스타 최적화 구조, 그리스 신화 팀 소개

### v1.8.0 — 오답노트 + 성공 패턴 학습 (2026.03)

- **project-gotchas** — 실수 자동 추적 + 성공 패턴 학습 (Haiku 분석 에이전트)
- **2계층 저장** — 글로벌(`memory/gotchas/`) + 프로젝트별(`memory/learned/`)
- **크로스 CLI 관찰** — Claude save-tool-use + Codex/Gemini save-turn 훅 통합
- **CHANGELOG.md** — 버전 히스토리 v1.0.0 ~ v1.8.0

### v1.7.0 — Orchestrator SQLite WAL + Minos Step 5 (2026.03)

- **orchestrator** — state.json → SQLite WAL 전환 (크래시 복구, 동시 접근)
- **minos** — Playwright MCP 실제 브라우저 QA 테스트
- **codemap** — CodeMap 인덱스 (코드베이스 탐색)

### v1.6.0 — 디자인 + 비즈니스 + 스킬 베스트 프랙티스 (2026.03)

- **design-plan (아프로디테)** — 디자인 오케스트레이터 (161 팔레트, 73 폰트, 84 스타일)
- **estimate** — 개발 견적서 자동 생성 (엑셀 출력)
- **biz-strategy (헤르메스)** — 비즈니스 모델 캔버스, TAM/SAM/SOM, GTM 전략
- **Anthropic 베스트 프랙티스** — 전체 스킬에 적용

전체 변경 이력: [CHANGELOG.md](CHANGELOG.md) | [Releases](https://github.com/Dannykkh/skill-olympus/releases)

---

## 핵심 파이프라인

한 줄이면 됩니다:

```
/zeus "쇼핑몰 만들어줘. React + Spring Boot"
    → 설계 (26단계 인터뷰) → 구현 (병렬 워커) → 감리 → 테스트
    → 제로 인터랙션 — 질문 없이 모든 결정 자동화
```

| 단계 | 스킬 | 하는 일 |
|------|------|---------|
| **사업분석** | `/hermes` (헤르메스) | 비즈니스 모델, TAM/SAM/SOM, GTM, 지표, 코호트 |
| **CEO 코칭** | `/athena` (아테나) | 전략적 도전 — Go/No-Go 판정, 스코프 결정, Kill 테스트 |
| **설계** | `/zephermine` (젭마인) | 26단계 인터뷰 → SPEC.md → 5인 전문가 팀 리뷰 |
| **구현** | `/agent-team` / `/poseidon` (포세이돈) | 웨이브 그룹 병렬 실행 (Agent Teams) |
| **감리** | `/argos` (아르고스) | 준공검사: 설계 대비 구현 검증 |
| **테스트** | `/minos` (미노스) | Playwright E2E 테스트 + fix-until-pass 루프 |
| **산출물** | `/clio` (클리오) | 흐름도 + PRD + 기술문서 + 사용자 매뉴얼 |
| **전자동** | `/zeus` (제우스) | 전 단계 자동 실행, 제로 인터랙션 |

각 스킬은 독립 실행 또는 파이프라인의 일부로 동작합니다.

---

## 크로스 CLI 지원

같은 스킬, 같은 메모리, 같은 경험을 3개 CLI에서.

| 기능 | Claude Code | Codex CLI | Gemini CLI |
|------|------------|-----------|------------|
| 스킬 | `~/.claude/skills/` | `~/.codex/skills/` | `~/.gemini/skills/` |
| 에이전트 | `~/.claude/agents/` | `~/.codex/agents/` | `~/.gemini/agents/` |
| 메모리 (므네모) | save-response 훅 | save-turn 훅 | save-turn 훅 |
| 오답노트/학습 | save-tool-use 훅 | save-turn 훅 | save-turn 훅 |
| 오케스트레이터 | MCP 서버 | MCP 서버 | MCP 서버 |
| 설치 | `install.bat/sh` | 자동 (8-11단계) | 자동 (12단계) |

크로스 CLI 동기화는 `sync-codex-assets.js`와 `sync-gemini-assets.js`가 처리합니다.

---

## 메모리 시스템 (므네모)

세션과 CLI를 넘나드는 3계층 영속 메모리.

```
세션 A: 작업 → #tags 저장 → /wrap-up → MEMORY.md 업데이트
세션 B: MEMORY.md 자동 로드 → 과거 검색 → 컨텍스트 복원
```

| 계층 | 저장소 | 로딩 |
|------|--------|------|
| **인덱스** | `MEMORY.md` | 항상 (100줄 미만) |
| **의미기억** | `memory/*.md` | 필요 시 |
| **일화기억** | `conversations/*.md` | 검색 시 |

오답노트/학습 패턴 자동 추적 포함:
- **에러** → `memory/gotchas/observations.jsonl` → Haiku가 패턴 분석
- **성공** → `memory/learned/observations.jsonl` → Haiku가 워크플로우 감지

---

## 구성 요소

### 스킬 (96개)

| 카테고리 | 스킬 | 핵심 |
|----------|------|------|
| **AI 도구** | codex, gemini, orchestrator, workpm, agent-team + 5개 | 멀티 AI 오케스트레이션, PM-Worker 패턴 |
| **파이프라인** | zephermine, zeus, argos, minos, closer, shipping-and-launch | 제로 인터랙션 풀 파이프라인, 출시 체크리스트 |
| **프론트엔드** | react-dev, frontend-design, stitch, seo-audit, ui-ux-auditor + 5개 | 161 팔레트, 73 폰트, SEO+AEO+GEO 감사 |
| **개발** | docker-deploy, database-schema-designer, deprecation-and-migration, documentation-and-adrs, social-login, code-reviewer + 7개 | Docker, DB 설계, ADR, 마이그레이션, 소셜 로그인, 코드 품질 |
| **비즈니스** | biz-strategy, ceo, estimate, okr, daily-meeting-update | CEO 코칭, 견적서, OKR, 스탠드업 |
| **테스트** | minos, auto-continue-loop, flow-verifier + 3개 | 크로노스 루프, Playwright QA |
| **메모리** | mnemo, memory-compact, project-gotchas | 3계층 메모리, 자동 학습 |
| **문서** | mermaid-diagrams, marp-slide, docx, pdf, draw-io, domain-dictionary + 3개 | 다이어그램, 프레젠테이션, 문서, 도메인 용어사전 |
| **메타** | autoresearch, skill-judge, manage-skills, plugin-forge, release-notes + 4개 | 스킬 자동 최적화 (Hill Climbing), 관리, 릴리즈 |
| **Git** | commit-work, release-notes, deploymonitor | 커밋, CHANGELOG, 배포 |
| **미디어** | video-maker | Remotion 기반 React 영상 |
| **리서치** | reddit-researcher | 시장 조사 + 리드 스코어링 |
| **번역** | ko-en-translator | 한↔영 양방향 번역 (기술 문서, 코드, i18n) |
| **유틸** | humanizer, jira, datadog-cli, excel2md + 3개 | AI 패턴 제거, 통합 |

### 에이전트 (42개)

| 영역 | 에이전트 |
|------|----------|
| **아키텍처** | architect, spec-interviewer, fullstack-coding-standards |
| **프론트엔드** | frontend-react, react-best-practices, stitch-developer, ui-ux-designer |
| **백엔드** | backend-spring, backend-dotnet, desktop-wpf, python-fastapi |
| **데이터베이스** | database-postgresql, database-mysql, database-schema-designer |
| **품질** | code-reviewer, security-reviewer, qa-engineer, tdd-coach |
| **성능** | performance-engineer, debugger |
| **AI/ML** | ai-ml (RAG, LLM API, 최신 SDK) |
| **글쓰기** | writing-specialist, humanizer, writing-guidelines |
| **언어** | typescript-spec, python-spec |

### 훅 (9개)

| 훅 | 이벤트 | 역할 |
|----|--------|------|
| reconcile-conversations | SessionStart | JSONL 기준 Claude/Codex 누락 턴 자동 복구 |
| save-response | Stop | 어시스턴트 응답 + #tags 자동 저장 |
| save-tool-use | PostToolUse | 도구 로깅 + 오답노트/학습 관찰 |
| save-conversation | UserPromptSubmit | 사용자 입력 영속화 |
| check-new-file | PreToolUse | 엔트로피 축소 체크 |
| protect-files | PreToolUse | 민감 파일 보호 |
| validate-api | PostToolUse | API 파일 검증 |
| loop-stop | Stop | 크로노스 자동 반복 |
| orchestrator-detector | UserPromptSubmit | PM/Worker 모드 감지 |

---

## 멀티 AI 오케스트레이션

PM이 작업을 배분하고, Worker(Claude + Codex + Gemini)가 병렬 실행합니다.

```
터미널 1 (PM):     /workpm → 분석 → 3개 작업 생성
터미널 2 (Claude): /pmworker → task-1 클레임 → 실행 → 완료
터미널 3 (Codex):  /pmworker → task-2 클레임 → 실행 → 완료
터미널 4 (Gemini): /pmworker → task-3 클레임 → 실행 → 완료
```

| 구성 요소 | 설명 |
|-----------|------|
| **Orchestrator MCP** | SQLite WAL 작업 큐, 파일 락, 의존성 해결 |
| **workpm** | 통합 PM 엔트리포인트 (Agent Teams 또는 MCP 모드) |
| **pmworker** | 통합 Worker 엔트리포인트 (모든 CLI) |

---

## 외부 리소스

### 추천 스킬

| 리소스 | 설명 | 설치 |
|--------|------|------|
| [everything-claude-code](https://github.com/affaan-m/everything-claude-code) | Anthropic 해커톤 우승 (28 에이전트, 116 스킬) | `/plugin marketplace add` |
| [Vercel Agent Skills](https://github.com/vercel-labs/agent-skills) | React/Next.js 베스트 프랙티스 (45+ 규칙) | `npx add-skill vercel-labs/agent-skills` |
| [claude-code-dotnet](https://github.com/Aaronontheweb/claude-code-dotnet) | C#/WPF/MAUI/.NET 스킬 | `npx add-skill Aaronontheweb/claude-code-dotnet` |

### 추천 MCP 서버

| MCP | 설명 | 설치 |
|-----|------|------|
| [Context7](https://github.com/upstash/context7) | 최신 라이브러리 문서 (Next.js 15, React 19) | `claude mcp add context7 -- npx -y @upstash/context7-mcp` |
| [Playwright](https://github.com/microsoft/playwright-mcp) | 브라우저 자동화 (QA용) | `claude mcp add playwright -- npx -y @playwright/mcp@latest` |
| [Stitch](https://github.com/anthropics/stitch-mcp) | Google Stitch UI 디자인 | `npx -p stitch-mcp-auto stitch-mcp-auto-setup` |

### 스킬 디렉토리

| 리소스 | 설명 |
|--------|------|
| [skills.sh](https://skills.sh/) | Vercel 운영 25K+ 스킬 디렉토리 |
| [awesome-agent-skills](https://github.com/VoltAgent/awesome-agent-skills) | 200+ 큐레이션 스킬 |
| [awesome-claude-code](https://github.com/hesreallyhim/awesome-claude-code) | Claude Code 리소스 모음 |

---

## 버전 히스토리

| 버전 | 날짜 | 핵심 |
|------|------|------|
| **[v4.1.0](https://github.com/Dannykkh/skill-olympus/releases/tag/v4.1.0)** | **2026-04-28** | **도메인사전 파이프라인** — 신규 domain-dictionary 스킬(DDD Ubiquitous Language)을 12개 스킬에 통합한 3계층 저장(마스터/델타/글로벌); 젭마인 6 Phase 그룹화; explain 줌아웃 모드; code-reviewer 모듈 깊이 카테고리 |
| [v4.0.2](https://github.com/Dannykkh/skill-olympus/releases/tag/v4.0.2) | 2026-04-27 | 스킬 description 다이어트 — Codex/Claude prompt budget을 위한 짧은 라우팅 메타데이터, 문서와 설치본 동기화 |
| [v4.0.1](https://github.com/Dannykkh/skill-olympus/releases/tag/v4.0.1) | 2026-04-20 | 훅 설치 정리, stale 참조 제거, 줄 수 제한 대신 구조 원칙 적용 |
| [v4.0.0](https://github.com/Dannykkh/skill-olympus/releases/tag/v4.0.0) | 2026-04-20 | 대정리: 스킬/에이전트 통합, 낡은 훅 archive 이동, Skill Olympus 품질 패스 |
| **[v3.0.0](https://github.com/Dannykkh/skill-olympus/releases/tag/v3.0.0)** | **2026-04-08** | **🏛️ Skill Olympus — 신전이 깨어나다** (repo 개명, 그리스 신화 통일, mnemo 데이터 유실 방지 종합 개편, 3-CLI parity, 호메로스 톤 README) |
| [v2.1.0](https://github.com/Dannykkh/skill-olympus/releases/tag/v2.1.0) | 2026-04-06 | 파이프라인 정합성 감사 + gstack 참고 개선 (Zeus 7-Phase, hermes/athena 강화, AI Slop 탐지) |
| [v2.0.0](https://github.com/Dannykkh/skill-olympus/releases/tag/v2.0.0) | 2026-03-25 | 아테나 CEO 코칭 + 파이프라인 확장 |
| [v1.9.0](https://github.com/Dannykkh/skill-olympus/releases/tag/v1.9.0) | 2026-03-24 | 아테나 CEO 코칭 + 파이프라인 확장 |
| [v1.8.0](https://github.com/Dannykkh/skill-olympus/releases/tag/v1.8.0) | 2026-03-23 | 오답노트 + 성공 패턴 학습 |
| [v1.7.0](https://github.com/Dannykkh/skill-olympus/releases/tag/v1.7.0) | 2026-03-21 | Orchestrator SQLite WAL + Minos |
| [v1.6.0](https://github.com/Dannykkh/skill-olympus/releases/tag/v1.6.0) | 2026-03-18 | 디자인 + 비즈니스 + 스킬 베스트 프랙티스 |
| [v1.5.0](https://github.com/Dannykkh/skill-olympus/releases/tag/v1.5.0) | 2026-03-09 | Closer + SEO Audit + 파이프라인 리팩토링 |
| [v1.4.0](https://github.com/Dannykkh/skill-olympus/releases/tag/v1.4.0) | 2026-03-02 | Chronos + Argos + Memory Compact |
| [v1.3.0](https://github.com/Dannykkh/skill-olympus/releases/tag/v1.3.0) | 2026-02-19 | 크로스 CLI: Codex + Gemini |
| [v1.2.0](https://github.com/Dannykkh/skill-olympus/releases/tag/v1.2.0) | 2026-02-09 | Agent-Team + Zeus + QA 파이프라인 |
| [v1.1.0](https://github.com/Dannykkh/skill-olympus/releases/tag/v1.1.0) | 2026-02-01 | Zephermine + Mnemo + Install |
| [v1.0.0](https://github.com/Dannykkh/skill-olympus/releases/tag/v1.0.0) | 2026-01-29 | 최초 릴리즈 |

---

## 라이선스

MIT License

---

**마지막 업데이트:** 2026-04-27
