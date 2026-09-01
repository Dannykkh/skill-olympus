**언어:** [English](README.md) | 한국어 | [日本語](README-ja.md) | [简体中文](README-zh-CN.md)

# Skill Olympus (스킬 올림푸스)

### 코딩 에이전트에 붙이는, 계속 일하는 제품 팀.

계획하고, 구현하고, 감리하고, 테스트하고, 문서화하고, 다음 세션에서도 기억합니다.
각 CLI가 이미 가진 네이티브 작업자는 그대로 활용합니다.

[![Stars](https://img.shields.io/github/stars/Dannykkh/skill-olympus?style=flat)](https://github.com/Dannykkh/skill-olympus/stargazers)
[![Forks](https://img.shields.io/github/forks/Dannykkh/skill-olympus?style=flat)](https://github.com/Dannykkh/skill-olympus/network/members)
[![Latest release](https://img.shields.io/github/v/release/Dannykkh/skill-olympus?display_name=tag)](https://github.com/Dannykkh/skill-olympus/releases/latest)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Website](https://img.shields.io/badge/website-live-E4B700)](https://dannykkh.github.io/skill-olympus/)
![Claude Code](https://img.shields.io/badge/Claude_Code-✓-D97757?logo=anthropic&logoColor=white)
![Codex CLI](https://img.shields.io/badge/Codex_CLI-✓-412991?logo=openai&logoColor=white)
![Antigravity CLI](https://img.shields.io/badge/Antigravity_CLI-supported-4285F4?logo=google&logoColor=white)
![Grok Build](https://img.shields.io/badge/Grok_Build-supported-000000)
![OpenClaw](https://img.shields.io/badge/OpenClaw-skills--only-5B4B8A)
![Hermes Agent](https://img.shields.io/badge/Hermes_Agent-skills--only-8A5A44)

Skill Olympus는 **Claude Code**, **Codex CLI**, **Antigravity CLI**, **Grok Build**를 쓰는 개인
개발자를 위한 프로덕션 지향 하네스입니다. 여러 CLI에 같은 워크플로우를 설치하고, 필요한
전문가 하나만 부르거나 제우스에게 전체 전달 루프를 맡길 수 있습니다.

```bash
/zeus "쇼핑몰 만들어줘. React + Spring Boot + PostgreSQL"
```

한 문장이 저장되는 설계 산출물, 구현, 감리, 실제 테스트, 근거 보고서로 이어집니다.
턴이 다 떨어진 것은 완료가 아니라 미완료로 판정합니다.

[빠른 시작](#빠른-시작) · [상황에 맞는 워크플로우](#상황에-맞는-워크플로우) · [CLI 지원](#크로스-cli-지원) · [전체 스킬](#구성-요소)

> Olympus는 프롬프트 100개를 한꺼번에 싣는 모음집이 아닙니다. 기본 탐색에는 집중된 진입점
> 18개만 두고, 저수준 모듈은 필요할 때 source 카탈로그에서 읽습니다. 통합 CLI의 네이티브
> 에이전트, 리뷰 엔진, 태스크 기능은 그대로 사용합니다.

---

## 왜 Skill Olympus인가

| 필요한 것 | Olympus가 더하는 것 |
|---|---|
| **한 문장으로 제품 만들기** | `/zeus`가 설계, 구현, 감리, 런타임 준비, 테스트, 근거 보고서를 한 흐름으로 연결 |
| **완료를 꾸며내지 않는 루프** | `/chronos`가 FIND → FIX → VERIFY를 실행하고, 소진과 막힘을 성공으로 포장하지 않음 |
| **의도대로 구현됐다는 증거** | `/argos`가 명세, 코드, API, 시나리오, 다이어그램, 보안 경계를 대조 |
| **실제로 실행되는 브라우저 테스트** | `/minos`가 Playwright 시나리오를 만들고 실행하며 제한된 반복 안에서 실패를 수정 |
| **세션을 넘어가는 기억** | `mnemo`가 인덱스, 의미기억, 검색 가능한 대화, 재개 가능한 핸드오프를 유지 |
| **작은 시작 컨텍스트** | 소수의 활성 진입점이 필요할 때만 source-only 모듈 76개로 라우팅 |

**공개 추적 스킬 소스 100개(기본 allowlist 합집합 24개 = 사용자 진입점 18개 + 런타임 어댑터 6개, 통합 표면별 활성 20개 또는 21개, skills-only 호스트 활성 18개, source-only 내부·선택 모듈 76개) · 에이전트 참고 소스 42개(최상위 40개 + 스킬 소유 2개, 기본 등록 0개) · 훅 9개 · 통합 CLI 4개 + skills-only 호스트 2개 · 신화 1개**

---

## 빠른 시작

Git과 Node.js LTS가 필요합니다. 대상 AI CLI는 Olympus 전후 어느 때 설치해도 됩니다.
CLI를 나중에 설치했다면 설치기를 다시 실행해 CLI 의존 등록을 마치면 됩니다.

### 통합 런타임 네 개 설치

```bash
# 클론
git clone https://github.com/Dannykkh/skill-olympus.git
cd skill-olympus

# Windows
.\install.bat

# macOS/Linux
chmod +x install.sh && ./install.sh
```

인수 없이 실행하는 것이 기본 전체 설치입니다. 이 기본값은 Claude, Codex, Antigravity, Grok
전체를 대상으로 합니다. `--all`은
같은 동작을 명시적으로 적는 선택 옵션입니다. 선택된 CLI 실행 파일이 `PATH`에 없어도
해당 홈의 스킬·카탈로그·source-only 라이브러리·훅·설정 파일은 준비하고, MCP 등록처럼
실행 파일이 필요한 명령만 건너뜁니다. 나중에 CLI를 설치한 뒤 같은 설치기를 다시 실행하면 됩니다.

### 먼저 써볼 워크플로우

```text
/zeus "React, Spring Boot, PostgreSQL로 작은 재고관리 SaaS 만들어줘"
/chronos "결제 흐름 테스트가 통과할 때까지 고쳐줘"
/aphrodite "운영자의 하루 업무를 중심으로 이 대시보드 다시 설계해줘"
/argos docs/plan/checkout
/mnemo "인증 방식은 어떻게 결정했었지?"
```

자연어 요청이 설명과 일치하면 스킬이 자동 선택될 수도 있습니다. Slash 이름을 사용하면
원하는 워크플로우를 명확하게 지정할 수 있습니다.

### OpenClaw·Hermes Agent skills-only 설치

아래 진입점은 사용자용 공통 스킬 18개와 source-only 모듈 76개를 설치합니다. 플러그인,
훅, Mnemo, MCP, 사용자 정의 에이전트, 기존 네 CLI용 런타임 어댑터는 설치하지 않습니다.

```powershell
# Windows: 호스트별 설치
.\install-openclaw.bat
.\install-hermes.bat

# 또는 TermSnap용 통합 설치기에서 두 호스트만 명시 선택
.\install.bat --llm openclaw,hermes
```

```bash
# macOS/Linux
bash ./install-openclaw.sh
bash ./install-hermes.sh
```

호스트별 설치기에 `--uninstall`을 붙이면 그 호스트의 Olympus 관리 스킬만 제거합니다.

<details>
<summary><strong>업데이트, 제거, source-only 모듈 안내</strong></summary>

### 기존 설치 업데이트

일반 업데이트에는 먼저 언인스톨할 필요가 없습니다. 설치기를 다시 실행하면 기존
Olympus 관리 항목만 현재 정책에 맞춰 갱신·정리하고, 이름이 다른 외부 스킬은 유지합니다.

```powershell
git pull
.\install.bat
```

macOS/Linux에서는 `./install.sh`를 사용합니다. `--uninstall` 후 재설치는 설치 상태가
깨졌거나 Olympus 훅·MCP까지 처음부터 다시 구성하려는 경우에만 사용하세요.

```powershell
.\install.bat --uninstall
.\install.bat
```

### source-only란?

source-only는 기존 스킬을 삭제하거나 예전 버전으로 보관한다는 뜻이 아닙니다. **현재
Olympus 버전의 `SKILL.md`와 부속 파일을 그대로 보존하되, CLI의 자동 탐색 디렉터리에는
등록하지 않는 상태**입니다.

- 현재 원본은 각 CLI의 `.olympus/source-skills/`에 복사되고 `SKILLS-CATALOG.md`에 경로가 기록됩니다.
- 필요한 작업에서는 활성 Olympus 하네스나 LLM이 카탈로그의 원본을 읽어 사용할 수 있습니다.
- 모든 source-only 스킬을 slash 메뉴와 자동 매칭 대상에 다시 올리려면 `--include-source-only-skills`를 사용합니다.
- 이 옵션은 현재 Olympus 원본을 활성화합니다. `_olympus-preserved`에 백업된 과거 수정본을 복구하는 옵션은 아닙니다.

```powershell
.\install.bat --include-source-only-skills
```

끝입니다. 공개 추적 스킬 소스 100개는 기본 allowlist 합집합 24개(사용자 진입점 18개 + 런타임 어댑터 6개)와 source-only 내부·선택 모듈 76개로 나뉩니다. 런타임별로 호환되지 않는 어댑터를 다시 제외하므로 Codex와 Antigravity는 호환 항목 96개(활성 20 + source-only 76), Claude는 97개(활성 21 + source-only 76)를 노출합니다. Grok의 독립 정책도 96개(20 + 76)이지만 실제 설치 표면은 Claude 공유 디렉터리를 읽으므로 Claude와 같은 활성 21개를 봅니다. OpenClaw과 Hermes Agent는 런타임 어댑터 여섯 개를 모두 제외해 호환 항목 94개(활성 18 + source-only 76)를 설치합니다. 내부 전용 `deploymonitor`는 로컬에만 있어 공개 배포 수에 포함하지 않습니다. 활성 하네스는 필요한 source-only 모듈을 카탈로그에서 직접 읽으므로 별도 등록이 필요하지 않습니다. **Olympus 사용자 정의 에이전트는 기본으로 하나도 등록하지 않으며**, 참고 소스 42개는 모두 source-only입니다. 새 스킬과 에이전트도 allowlist 승인 전에는 자동 활성화되지 않습니다.

> CLI가 없어도 자산 준비는 건너뛰지 않습니다. 실행 파일이 필요한 등록 명령만 `skipped`로
> 보고하며, 설치된 자산은 해당 CLI를 처음 실행할 때 그대로 사용됩니다.

> 기존 설치를 업데이트하는 경우 이름이 다른 외부 스킬은 유지되고, Olympus와 이름이
> 겹치는 수정본은 삭제 대신 `_olympus-preserved`로 이동합니다. 기본 구성·source-only 전체
> 활성화·충돌본 복구 절차는 [스킬 레지스트리 마이그레이션 가이드](docs/skill-registry-migration.md)를
> 먼저 확인하세요.
> 충돌본 복구는 수동입니다. 보존본의 디렉터리명과 `SKILL.md` frontmatter `name`을 함께
> 고유하게 바꾼 뒤 복사해야 다음 동기화에서 다시 이동되지 않습니다. `--uninstall`은 보존본을 자동 복구하지 않습니다.

</details>

---

## 어떻게 작동하는가

제우스는 한 요청을 살아 있게 유지하고, 설계로 분해하고, 구현하고, 감리하고, 런타임을
준비하고, 테스트하고, 증거 보고서를 작성하는 하네스 계층입니다. 크로노스 지속성을 먼저
준비하고, 젭마인 설계와 현재 CLI의 네이티브 작업자 구현을 거친 뒤 아르고스, Docker,
미노스의 근거가 모두 있어야 SUCCESS를 허용합니다.

<p align="center">
  <img src="docs/assets/skill-olympus-system-overview.svg" alt="통합 CLI 4개, skills-only 호스트 2개, Zeus 6단계 전달 하네스, Chronos 지속성 레일, Mnemo 기억 레일을 보여주는 Skill Olympus v6 전체 구조" width="1100">
</p>

크로노스는 그 아래의 루프 계층입니다. 네이티브 `/goal`을 우선하고, 필요할 때 런타임별
재진입 방식을 사용하며 READ → FIND → FIX → VERIFY → LOG로 돌아갑니다. 소진은 미완료이며,
막힌 작업은 성공으로 포장하지 않고 Owner Decision Brief와 함께 주차합니다.

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
| `/zephermine` | **젭마인** | *서풍의 숨결, 봄을 가져오는 자* | 설계사 ― 26단계 심층 인터뷰, 스펙 생성, 6인 전문가 팀 리뷰 |
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

<details>
<summary><strong>올림푸스 신화 읽기</strong></summary>

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
9개 팔레트가 그 손에 있고, 47개 폰트 페어링과 84개 스타일이 그 곁에 있다.
그분의 작업장에서 나오는 것은 단지 쓸모 있는 것이 아니라 ― 사랑받는 것이며, 그것이 차이라.
*"아름다움은 일의 장식이 아니라, 일이 그 만든 자보다 오래 살아남게 하는 것이라."*

📚 **모든 뮤즈의 어머니, 므네모**
아홉 자매가 노래하기 훨씬 전부터 므네모시네는 세상의 긴 기억을 지켜 오셨느니라.
인간이 세 달 전에 했던 대화가 ― 그분이 오늘 그에게 가져다주실 답이라.
세 겹의 층을 지키시니 ― 이름의 인덱스, 사물의 의미, 그리고 이야기 그 자체라 ―
그 기억은 모든 세션, 모든 CLI, 모든 새벽을 가로지르느니라.
*"아이여, 잊지 말라. 그대가 오래 전에 한 말이 ― 지금 그대에게 필요한 선물이라."*

</details>

---

## 최근 변경

- **Antigravity 전환:** 로그인 종료된 개인용 Gemini CLI 대상을 Google Antigravity CLI로 교체하고 스킬, 훅, Mnemo, MCP, native-first 라우팅을 맞췄습니다.
- **OpenClaw·Hermes Agent:** 전용 skills-only 설치기가 활성 진입점 18개와 source 카탈로그를 설치하며 플러그인·훅 parity는 주장하지 않습니다.
- **가벼운 레지스트리:** 공통 사용자 진입점 18개만 활성화하고 저수준 모듈 76개는 필요할 때 source 카탈로그에서 읽습니다.

전체 이력은 [CHANGELOG.md](CHANGELOG.md)와 [GitHub Releases](https://github.com/Dannykkh/skill-olympus/releases)에서 확인할 수 있습니다.

---

## 상황에 맞는 워크플로우

원하는 결과에 맞는 행에서 시작하세요. 각 워크플로우는 독립적으로 동작하며, 제우스는
사업성·CEO 코칭·최종 문서화 같은 선택 단계를 몰래 끼워 넣지 않습니다.

| 하고 싶은 일 | 시작점 | 결과 |
|---|---|---|
| 한 문장으로 제품 만들기 | `/zeus` | 설계, 구현, 감리, 테스트를 마친 프로젝트와 근거 보고서 |
| 만들 가치가 있는지 먼저 판단하기 | `/hermes` → `/athena` | 사업성 분석과 Go/No-Go·스코프 판정 |
| 모호한 기능을 구현 가능한 설계로 바꾸기 | `/zephermine` | 명세, 계획, 스키마, API 계약, 흐름도, QA 시나리오 |
| 기존 계획을 의존성 순서대로 병렬 구현하기 | `/agent-team` 또는 `/poseidon` | 네이티브 작업자 구현과 통합 게이트 |
| 설계 없이 바로 구현 시작하기 | `/workpm` 또는 `/daedalus` | 조사한 제안안, 구현, 검증 로그 |
| 실제 화면을 설계하거나 다시 만들기 | `/aphrodite` | Experience Contract, `DESIGN.md`, 렌더 방향, 구현 |
| 코드가 설계와 맞는지 검사하기 | `/argos` | 근거가 연결된 준공검사 보고서 |
| 브라우저·API 테스트를 통과시키기 | `/minos` | Playwright 테스트와 제한된 수정 반복 |
| 측정 가능한 조건까지 계속 고치기 | `/chronos` | 재개 가능한 감사 로그, 검증된 수정 또는 정직한 막힘 브리프 |
| 프로젝트를 닫고 문서 남기기 | `/clio` | GO/NO-GO, 흐름도, PRD, 기술문서, 사용자 매뉴얼 |

---

<details>
<summary><strong>주요 워크플로우별 입력·처리·결과 상세 보기</strong></summary>

## 신들의 실무 가이드 — 무엇을·어떻게·결과는

> 위의 신화는 분위기이고, 여기는 실무 버전입니다. 각 신이 **어떤 업무절차를 처리하려고** 만들어졌는지, **어떻게 호출**하는지, **어떤 파일이 결과로 나오는지**. 모든 신은 단독으로도, 순서대로 엮으면 파이프라인으로도 동작합니다.

### 전략·검증 — 코드 한 줄 쓰기 전

**`/hermes` — 사업성 (헤르메스)**
- **언제:** 만들 가치가 있는 아이디어인지 검증할 때 — 수요·시장·수익.
- **사용:** `/hermes` (별칭: 헤르메스, 사업성)
- **처리:** 수요 검증 → BMC → TAM/SAM/SOM → 수익·가격 → GTM → 북극성 지표 → 코호트. 서로 다른 비즈니스 모델 후보 2~3개를 채점해 선택.
- **결과물:** `docs/hermes/{project}.md` (분석 + Mermaid) + 젭마인이 재사용하는 도메인 용어 시드.
- **다음:** `/athena`(검증) 또는 `/zephermine`(설계).

**`/athena` — CEO 도전 (아테나)**
- **언제:** 자원 투입 전 *"이걸 만들긴 해야 하나?"* 를 결정할 때.
- **사용:** `/athena` (별칭: 아테나, ceo) — `docs/hermes/*.md` 있으면 자동 참조.
- **처리:** 수요 확신도 → 해자 → 스코프 모드 → ROI → 최종 판정.
- **결과물:** `docs/athena/{project}.md` — GO / CONDITIONAL GO / NO-GO + 스코프 권고(Reduce / Expand / Pivot / Kill).
- **다음:** GO면 `/zephermine`.

### 설계 — 의도를 구현 가능한 스펙으로

**`/zephermine` — 심층 설계 (젭마인)**
- **언제:** 구현 전 기능/제품에 충실한 설계 산출물이 필요할 때.
- **사용:** `/zephermine [spec경로]` (별칭: 젭마인, 제퍼마인)
- **처리:** 리서치 → 26단계 인터뷰 → 스펙 합성 → 6전문가 팀 리뷰 → 전략 후보 채점(ToT) → plan → DB 스키마 / API 명세 / 공정 도면 → 섹션 분할 → 운영·QA 시나리오.
- **결과물:** `docs/plan/<feature>/` → `spec.md`, `plan.md`, `db-schema.md`, `api-spec.md`, `flow-diagrams/`, `sections/`, `operation-scenarios.md`, `qa-scenarios.md`.
- **다음:** `/agent-team`(구현) 또는 `/argos`(감리).

**`/aphrodite` — 디자인 시스템 (아프로디테)**
- **언제:** UI 프로젝트에서 프론트 구현 전 의도된 경험, 벤치마크 해석, 일관된 구현 기준이 필요할 때.
- **사용:** `/aphrodite` (별칭: 아프로디테)
- **처리:** 소스 모드 판별 → exact Codex Product Design marketplace selector 확인(설치 가능이 검증된 경우만 1회 추천, 확인 불가는 UNKNOWN+로컬 진행) → 사이트 벤치마크 증거 수집 → Product Facts·Content Integrity·Asset Provenance → Adopt/Adapt/Avoid → 실제 렌더 방향 3안 → Experience Contract → 구현 또는 동일 계약 adapter 대조 → 렌더 UX·접근성·성능 게이트 → 학습 환류.
- **결과물:** `DESIGN.md`(비주얼 토큰) + Experience Contract(위계·행동·반응형·품질 결정) + 레이아웃 청사진 + 벤치마크 증거 + 프론트 구현.
- **경계:** 아프로디테는 경험 구조, 시각적 행동, 반응형 변환, 상태, 품질 게이트를 담당합니다. API 연결, 영속 상태, 비즈니스 로직은 `/agent-team` 또는 `/workpm`이 담당합니다.
- **다음:** 아프로디테가 source-only `frontend-design`·감사 모듈을 직접 읽습니다. 설치된 Codex 프로토타입 어댑터를 우선하려면 `--product-design`, Stitch가 필요하면 `--stitch`를 지정하고, 이후 `/agent-team` / `/workpm`으로 애플리케이션 로직을 구현합니다.

### 구현 — 코드 작성

**`/agent-team` (`/poseidon`) — 병렬 구현 (포세이돈)**
- **언제:** `sections/`가 있는 스펙이 있고 병렬로 구현하고 싶을 때.
- **사용:** `/agent-team <planning_dir>` (별칭: 포세이돈)
- **처리:** 의존성 그래프 → 웨이브 그룹핑 → 팀원이 웨이브 단위로 구현 → 병합 후 필수 통합 게이트(빌드 + 전체 테스트 + E2E 1회).
- **결과물:** 구현 코드 + 검증 보고. 통합 게이트가 유일한 완료 권한(코드 존재 확인은 사전점검일 뿐).
- **다음:** `/argos`, `/minos`.

**`/workpm` (`/daedalus`) — 설계 없이 구현 (다이달로스)**
- **언제:** 설계가 없고 PM이 바로 구현으로 들어가길 원할 때.
- **사용:** `/workpm` (별칭: 다이달로스)
- **처리:** 리서치 → 제안 3개를 적합성/리스크/노력으로 채점 → 공정 도면 → 구현 → 검증(테스트/린트, 제한 재시도). activity log를 외부화해 재개 가능.
- **결과물:** 동작 코드 + 결정/활동 로그.
- **다음:** `/argos`, `/minos`.

### 검증 — 실제로 되는지 증명

**`/argos` — 준공검사 (아르고스)**
- **언제:** 구현 후 — 코드가 설계 산출물과 일치하는지 확인.
- **사용:** `/argos [planning_dir]` (별칭: 아르고스, 감리)
- **처리:** 정적 분석 → 런타임 검증 → API 명세 일치 → QA 시나리오 체크 → 도면 대 코드 대조 → 보안 (Phase 0~7).
- **결과물:** `<planning_dir>/verify-report.md`.
- **다음:** 발견 사항 수정 후 `/minos`.

**`/minos` — E2E 테스트 루프 (미노스)**
- **언제:** "다 된 것 같다"가 아니라 실제로 통과하는 브라우저/E2E 테스트가 필요할 때.
- **사용:** `/minos` (별칭: 미노스)
- **처리:** 시나리오(`qa-scenarios.md` 또는 자동 생성) → Playwright 코드 → 실행 → fix-until-pass → 브라우저 탐색 QA.
- **결과물:** `tests/e2e/{feature}.spec.ts` + `tests/api/{feature}-api.spec.ts` + 통과 결과.
- **다음:** `/clio`.

### 마무리 — 기록으로 남기기

**`/clio` — 마무리투수 + 문서 (클리오)**
- **언제:** 작업이 끝나 GO/NO-GO 판정과 산출 문서가 필요할 때.
- **사용:** `/clio` (별칭: 클리오; 레거시 `/closer`)
- **처리:** 파이프라인 GO/NO-GO(argos/minos 읽고 빌드/테스트 실행) → 소스 기반 흐름 추출 → PRD/기술/매뉴얼 생성 → 문서 사실 검증 게이트.
- **결과물:** `docs/clio/latest/` → `CHECKLIST.md`, `flow-diagrams/`, `PRD.md`, `TECHNICAL.md`, `USER-MANUAL.md`, `FINAL-REPORT.md`.
- **다음:** 배포.

### 상시 동작 — 오케스트레이션·루프·메모리

**`/zeus` — 한 마디로 신전 전체 (제우스)**
- **언제:** 한 문장으로 SaaS 전체를, 질문 없이 받고 싶을 때.
- **사용:** `/zeus "쇼핑몰 만들어줘. React + Spring Boot"` (별칭: 제우스)
- **처리:** 설명 파싱 → zephermine → agent-team/workpm → argos → source-only docker-deploy → minos → 최종 증거 보고의 7단계. Hermes, Athena, Clio는 제우스의 암묵 단계가 아닙니다. 모든 결정은 자동화하고 되돌리기 가능한 Decision Ledger에 기록합니다.
- **결과물:** 동작하는 앱 + `docs/zeus/zeus-report.md` (설계·구현·감리·실행 환경·테스트 증거가 모두 `proved`일 때만 SUCCESS).
- **다음:** Decision Ledger 검토.

**`/chronos` — 지치지 않는 수정 루프 (크로노스)**
- **언제:** "X 안의 버그를 테스트 통과할 때까지 다 고쳐줘" — 자율·재개 가능.
- **사용:** `/chronos [scope] --completion-promise '...'` (별칭: 크로노스)
- **처리:** 사이클마다 FIND → FIX → VERIFY(자기판단 아닌 실제 테스트 실행), 우선순위 순, 한 사이클 한 이슈; 막힌 이슈는 Owner Decision Brief로 주차하되 주차 전 능력 1회 상향(에스컬레이션 사다리).
- **결과물:** 수정 + `docs/chronos/chronos-log.md` 감사 로그(루프는 기억이 아니라 로그에서 재개).
- **다음:** —

**`mnemo` — 크로스-CLI 메모리 (므네모)**
- **언제:** 항상 — 그리고 "이전에 뭐 했더라?" 물을 때마다.
- **사용:** `mnemo` (별칭: 므네모); 매 턴 훅이 자동 저장. opt-out: `MNEMO_DISABLE=1` (버전 체크는 `OLYMPUS_UPDATE_CHECK_DISABLE=1`).
- **처리:** 세션과 Claude/Codex/Antigravity/Grok을 가로지르는 3계층 메모리; 과거 대화 검색; 컨텍스트 한도 근처에서 자동 핸드오프.
- **결과물:** `MEMORY.md`(인덱스) + `memory/*.md`(의미) + `conversations/*.md`(일화).
- **다음:** —

</details>

---

## 크로스 CLI 지원

하나의 원본 라이브러리와 같은 사용자 워크플로우를 유지하되, 기본 설치는 각 CLI 네이티브 능력에 맞춥니다.
아래 네 열은 단순히 `SKILL.md`를 읽는다는 뜻이 아니라 설치 대상과 런타임별 정책·어댑터를
갖춘 Olympus 네이티브 지원 등급입니다.

| 기능 | Claude Code | Codex CLI | Antigravity CLI | Grok Build |
|------|------------|-----------|------------|------------|
| 스킬 | `~/.claude/skills/`에 21개 | `~/.codex/skills/`에 20개 | `~/.gemini/antigravity-cli/skills/`에 20개 | Claude 호환 계층의 같은 21개 |
| 사용자 정의 에이전트 | 기본 없음(source opt-in 시 `~/.claude/agents/`) | 기본 없음; 활성 정의는 `.toml`만 | 기본 없음(source opt-in 시 `~/.gemini/config/agents/`) | Olympus 기본 등록 없음 |
| 메모리 (므네모) | save-response 훅 | save-turn 훅 | native `Stop` 훅 | grok-mnemo 훅 |
| 오답노트/학습 | save-tool-use 훅 | save-turn 훅 | turn 단위 `Stop` 훅 | grok-mnemo 훅 |
| 오케스트레이션 | 네이티브 작업자; 선택 MCP | 네이티브 작업자; 선택 MCP | 네이티브 작업자; 선택 MCP | 네이티브 작업자; MCP PM host만 |
| 설치 | 인수 없는 설치기가 자산 준비, `claude`가 있을 때 CLI 명령 실행 | 같은 설치기가 자산 준비, `codex`가 있을 때 MCP 명령 실행 | 같은 설치기가 스킬·훅·`mcp_config.json`을 직접 구성; Antigravity 실행에만 `agy` 필요 | Claude 공유 자산, Grok 홈 존재 시 grok-mnemo 실행 |

### Agent Skills 이식 가능 호스트

아래 호스트도 Agent Skills를 구현하지만, Olympus는 아직 이들에 대해 종단 간 런타임 지원을
주장하지 않습니다. 스킬이 탐색된다는 사실만으로 스크립트, slash 별칭, 훅, 권한,
서브에이전트 위임, 완료 루프가 같은 방식으로 동작한다고 볼 수는 없습니다.

| 호스트 | 지금 이식 가능한 범위 | Olympus 동등 지원에 빠진 것 |
|--------|----------------------|-----------------------------|
| [OpenCode](https://opencode.ai/docs/skills) | `~/.claude/skills`와 `.agents/skills`의 표준 스킬을 읽음 | 전용 설치 정책, 별칭, 훅/Mnemo, MCP, 네이티브 작업자 검증 |
| [Cursor](https://prod.cursor.com/docs/skills) | 로컬 Claude·Codex 스킬 디렉터리를 호환 소스로 읽음 | 전용 설치 정책, 별칭, 훅/Mnemo, MCP, Cursor 내장 기능과의 중복 감사 |
| [GitHub Copilot](https://docs.github.com/en/copilot/concepts/agents/about-agent-skills) | 표준 프로젝트·개인 Agent Skills 지원 | 현재 전역 Claude 설치 경로는 Copilot 개인 경로가 아님; 설치기·별칭·훅/Mnemo·오케스트레이션 어댑터 없음 |
| [Pi](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/skills.md) | Agent Skills 구현, Claude·Codex 경로를 설정으로 추가 가능 | 기본 설치 대상·런타임 어댑터 없음; 명시 호출 형식은 Pi의 `/skill:<name>` |
| [Hermes Agent](https://github.com/NousResearch/hermes-agent/blob/main/website/docs/guides/work-with-skills.md) | `install-hermes.*`가 `~/.hermes`에 활성 스킬 18개와 source 카탈로그 설치 | Olympus 별칭·플러그인/훅/Mnemo·MCP·오케스트레이션 매핑 없음 |
| [OpenClaw](https://github.com/openclaw/openclaw/blob/main/docs/tools/skills.md) | `install-openclaw.*`가 `~/.openclaw`에 활성 스킬 18개와 source 카탈로그 설치 | 플러그인 패키징·Olympus 별칭·훅/Mnemo·MCP·네이티브 서브에이전트 검증 없음 |

따라서 정확한 짧은 문구는 **Claude Code, Codex CLI, Antigravity CLI, Grok Build에서 통합 지원;
OpenClaw과 Hermes Agent에서 skills-only 설치 지원; 그 밖의 Agent Skills 호스트에는 스킬 본문 이식 가능**입니다. [Paperthin](https://github.com/LilMGenius/paperthin)의 "on any agent"는
가벼운 스킬 형식 표면을 설명하는 문구라서, 훅과 상태를 가진 Olympus에 그대로 쓰면 과장입니다.

크로스 CLI 동기화는 `sync-claude-skills.js`, `sync-codex-assets.js`, `sync-antigravity-assets.js`와
skills-only `sync-portable-skills.js`가 처리합니다.
Codex 스킬은 기본적으로 전역에만 설치해 이 저장소의 `.agents/skills`와 중복 탐색되지
않습니다. 격리된 프로젝트 미러 테스트가 필요할 때만
`node scripts/sync-codex-assets.js --include-project-skills`를 사용합니다. 모든 런타임은
기본 거부 allowlist를 사용합니다. 런타임 전체 합집합은 사용자 진입점 18개와
`agent-team`·`mnemo` 어댑터 6개를 합친 24개입니다. 각 런타임은 호환되지 않는 어댑터
3개 또는 4개를 제외해 Claude 21개, Codex/Antigravity/독립 Grok 20개를 활성화하며,
실제 Grok 설치 표면은 Claude의 공유 21개를 읽습니다. allowlist 밖의 같은 76개 공개 소스는 스캔되지 않는 `.olympus/source-skills`에 복사하고
`SKILLS-CATALOG.md`에 source-only와 정확한 경로로 기록합니다. source-only `orchestrator`는 MCP 실행용 비탐색 미러를 `.olympus/runtime-modules/orchestrator`에도 두며, 등록 경로와 의존성 캐시는 그곳에서 유지합니다. source-only 전체 활성화는
`--include-source-only-skills`, 기존 코딩 가이드 8개만 추가 활성화는 `--include-broad-coding-skills`를 사용합니다. source-only는 자연어 요청으로 카탈로그에서 읽을 수 있고, 일부 CLI가 미등록 slash를 모델 전달 전에 거부하므로 네이티브 `/스킬명` 메뉴가 필요할 때는 전체 opt-in을 사용합니다.
이 저장소의 스킬 소스와 이름이 같은 설치 디렉터리는 설치기가 관리하므로 동기화 때 교체·제거될 수 있고, 이름이 다른 로컬 스킬은 보존됩니다. 설치 사본을 직접 수정하지 말고 저장소 원본을 수정하거나 별도 이름을 사용하세요.
네 CLI 런타임 표면 모두 사용자 정의 에이전트 참고 소스 42종을 기본 source-only로 유지합니다. `--include-source-only-agents`는 의도적인 호환성 테스트를 위해 레거시 프롬프트를 복사할 뿐, Markdown을 Codex 활성 에이전트로 만들지는 않습니다. 기존 `--include-passive-agents`와 `--include-broad-coding-agents`는 호환 별칭으로 유지합니다. Codex의 `.agents/agents` 미러는 프로젝트 미러와 source-only opt-in을 함께 지정할 때만 내용이 생깁니다.

에이전트를 쓰던 스킬의 오케스트레이션 절차는 유지하고, 의미 역할만 각 CLI 내장 작업자에 매핑합니다.

| 의미 역할 | Claude | Codex | Antigravity | Grok |
|-----------|--------|-------|--------|------|
| 읽기 전용 탐색 | `Explore` | `explorer` | `research` | `explore` |
| 파일 수정·명령 실행 | `general-purpose` / 이름 있는 teammate | `worker` | Main 또는 명시적으로 정의한 쓰기 에이전트 | `general-purpose` |

공유 상태와 완료 판정은 메인 컨텍스트가 소유합니다. 작업자는 고유 파일 또는 반환값만 담당하며, 위임 도구가 없거나 병렬 이득이 없으면 같은 절차를 메인 컨텍스트에서 순차 실행합니다.

---

## 메모리 시스템 (므네모)

세션과 CLI를 넘나드는 3계층 영속 메모리.

```
세션 A: 작업 → #tags 저장 → 자동 또는 명시적 핸드오프 → MEMORY.md 업데이트
세션 B: MEMORY.md 자동 로드 → 과거 검색 → 컨텍스트 복원
```

| 계층 | 저장소 | 로딩 |
|------|--------|------|
| **인덱스** | `MEMORY.md` | 항상 (100줄 미만) |
| **의미기억** | `memory/*.md` | 필요 시 |
| **일화기억** | `conversations/*.md` | 검색 시 |

오답노트/학습 패턴 결정론적 수집 포함:
- **에러** → 훅이 민감값을 제거한 이벤트를 `memory/gotchas/observations.jsonl`에 추가
- **성공** → 훅이 민감값을 제거한 이벤트를 `memory/learned/observations.jsonl`에 추가
- **정제** → 활성 mnemo 어댑터가 카탈로그의 source-only `memory-distill` 모듈을 직접 읽거나 세션 핸드오프가 같은 계약으로 신규 관찰을 정제하며, 상시 분석 에이전트는 없음
- **백로그 진단** → 관찰 로그는 append-only로 절대 비워지지 않으므로, 백로그 판정은 누적 줄 수가 아니라 `.mnemo-distill-offset` 마커 대비 증분(delta)으로 (훅이 `.mnemo-status.md`로 대행)

---

## 구성 요소

### 스킬 소스 (100개, 기본 합집합 24개, 설치 표면별 활성 20개 또는 21개)

아래 표는 시작 시 레지스트리가 아니라 소스 목록입니다. 저빈도 문서 형식 도구, 서비스 통합, 프레임워크 레시피, 생성기는 명시 호출하거나 opt-in 설치하기 전까지 source-only로 남습니다.

| 카테고리 | 스킬 | 핵심 |
|----------|------|------|
| **AI 도구** | codex, antigravity, orchestrator, workpm, agent-team + 5개 | 멀티 AI 오케스트레이션, PM-Worker 패턴 |
| **파이프라인** | zephermine, zeus, argos, minos, closer, shipping-and-launch | 제로 인터랙션 풀 파이프라인, 출시 체크리스트 |
| **프론트엔드** | react-dev, frontend-design, theme-factory, stitch, seo-audit, ui-ux-auditor, data-visualization + 5개 | 9 팔레트, 47 폰트 페어링, 84 스타일, 테마 14종(한글 4종), SEO+AEO+GEO 2축 점수 감사(검색/AI 가시성), 차트 선택 가이드 |
| **개발** | docker-deploy, database-schema-designer, deprecation-and-migration, documentation-and-adrs, social-login, code-reviewer + 7개 | Docker, DB 설계, ADR, 마이그레이션, 소셜 로그인, 코드 품질 |
| **비즈니스** | biz-strategy, ceo, estimate, okr, daily-meeting-update | CEO 코칭, 견적서, OKR, 스탠드업 |
| **테스트** | minos, auto-continue-loop, flow-verifier, themis + 3개 | 크로노스 루프, Playwright QA, 개인정보처리방침 생성(테미스) |
| **메모리** | mnemo, memory-compact, project-gotchas, memory-distill | 3계층 메모리, 자동 학습, raw 정제(rebuild) |
| **문서** | mermaid-diagrams, diagram-design, marp-slide, docx, pdf, draw-io, domain-dictionary + 3개 | 다이어그램, 에디토리얼 다이어그램 렌더링(.mmd → 브랜드 HTML+SVG, cathrynlavery/diagram-design MIT 벤더링), 프레젠테이션, 문서, 도메인 용어사전 |
| **메타** | autoresearch, skill-judge, manage-skills, plugin-forge, release-notes + 4개 | 스킬 자동 최적화 (Hill Climbing), 관리, 릴리즈 |
| **Git** | commit-work, release-notes, deploymonitor | 커밋, CHANGELOG, 배포 |
| **미디어** | video-maker | Remotion(React/TSX) 또는 HyperFrames(HTML/CSS/GSAP), 프로젝트당 엔진 하나 |
| **리서치** | reddit-researcher | 시장 조사 + 리드 스코어링 |
| **번역** | ko-en-translator | 한↔영 양방향 번역 (기술 문서, 코드, i18n) |
| **유틸** | humanizer, jira, datadog-cli, excel2md + 3개 | AI 패턴 제거, 통합 |

### 에이전트 참고 소스 (42개: 최상위 40개 + 스킬 소유 2개, 기본 등록 0개)

이 파일들은 항상 켜진 런타임 페르소나가 아니라 호환성·참고용 소스입니다. 일반 분업은 각 CLI의 네이티브 서브에이전트가, 절차는 스킬이 담당합니다. 42개 모두 기본 거부 정책 아래 source-only이며 `--include-source-only-agents`로 명시 복사할 수 있습니다.

| 영역 | 에이전트 |
|------|----------|
| **스킬 소유 호환 프롬프트** | chronos-worker, gotcha-analyzer |
| **선택형 소스 에이전트** | architect, documentation, mermaid-diagram-specialist, typescript-spec, python-spec, ui-ux-designer, frontend-react, backend-spring, database-mysql, database-postgresql, react-best-practices, python-fastapi-guidelines, fullstack-coding-standards, dotnet-coding-standards, wpf-coding-standards, naming-conventions, writing-guidelines, bilingual-dev, web-preview-guide, codebase-pattern-finder, explore-agent, debugger, feature-tracker, tdd-coach, migration-helper, spec-interviewer, api-comparator, api-tester, ascii-ui-mockup-generator, backend-dotnet, database-schema-designer, desktop-wpf, performance-engineer, stitch-developer, writing-specialist, ai-ml, qa-engineer, qa-writer, code-reviewer, security-reviewer |

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

## 네이티브·멀티 AI 오케스트레이션

기본 `workpm`은 현재 CLI의 네이티브 작업자에게 일을 배분합니다. hard file lock, 외부 태스크 보드, Claude + Codex + Antigravity 혼합 실행이 필요할 때만 MCP 정책 레이어를 사용합니다.

```
기본:              /workpm → 분석 → 네이티브 작업자 → 검증

선택 MCP 모드:
터미널 1 (PM):     /daedalus --mcp → provider-aware 작업 생성
터미널 2 (Claude): /pmworker → Claude/공용 작업 클레임 → 완료
터미널 3 (Codex):  /pmworker → Codex/공용 작업 클레임 → 완료
터미널 4 (Antigravity): /pmworker → Antigravity/공용 작업 클레임 → 완료
```

| 구성 요소 | 설명 |
|-----------|------|
| **workpm** | 현재 CLI의 네이티브 작업자를 쓰는 기본 PM 엔트리포인트 |
| **Orchestrator MCP** | 선택형 SQLite WAL 작업 큐, provider 라우팅, 파일 락, 의존성 해결 |
| **pmworker** | 명시적 MCP 모드 Worker 엔트리포인트 (Claude/Codex/Antigravity) |

---

## 생태계와 출처

Olympus는 개방형 `SKILL.md` 모델을 사용하며 더 넓은 Agent Skills 생태계에서 배웁니다.

- [Agent Skills 명세](https://agentskills.io/specification) — 이식 가능한 스킬 구조
- [Anthropic Skills](https://github.com/anthropics/skills) — 공식 예제와 복합 문서 워크플로우
- [Vercel skills CLI](https://github.com/vercel-labs/skills) — 여러 에이전트의 스킬 탐색·설치 생태계
- [Superpowers](https://github.com/obra/superpowers) — 방법론 중심 에이전트 워크플로우
- [Paperthin](https://github.com/LilMGenius/paperthin) — 저수준 크로스 에이전트 설계 패턴

벤더링한 구성 요소의 업스트림 라이선스는 해당 스킬 디렉터리 안에 보존합니다.

---

## 문서

- [설치와 옵션](SETUP.md)
- [워크플로우 가이드](docs/workflow-guide.md)
- [스킬 레지스트리와 충돌 복구](docs/skill-registry-migration.md)
- [변경 기록](CHANGELOG.md)

## 기여하기

이슈와 Pull Request를 환영합니다. PR을 열기 전에 [AGENTS.md](AGENTS.md)를 읽고, 정본 스킬
소스는 `skills/` 아래 하나로 유지하며, 저장소 테스트를 실행해 주세요.

```powershell
$tests = (Get-ChildItem scripts/tests -Filter '*.test.js').FullName
node --test $tests
```

```bash
node --test scripts/tests/*.test.js
```

Olympus가 설계 반복, 끊긴 핸드오프, 디버깅 루프 하나라도 줄여줬다면 Star로 표시해 주세요.
다른 개인 개발자가 이 프로젝트를 찾는 데 도움이 됩니다.

---

## 라이선스

[MIT](LICENSE)

---

**마지막 업데이트:** 2026-09-01
