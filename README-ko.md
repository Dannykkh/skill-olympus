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
![Grok Build](https://img.shields.io/badge/Grok_Build-supported-000000)

**Claude Code**, **Codex CLI**, **Gemini CLI**, **Grok Build**를 위한 프로덕션 에이전트 하네스 ― **하네스 엔지니어링**·**루프 엔지니어링** 스택,
12명의 올림포스 신의 이름으로, 3개월간 매일 실전 프로덕트를 만들며 다듬어졌습니다.

```bash
/zeus "쇼핑몰 만들어줘. React + Spring Boot + PostgreSQL"
```

한 줄. 열두 신. 설계 → 구현 → 감리 → 테스트 → 출항.
**질문 없이. 청사진 없이. 인간의 손길 없이.**

> **루프 엔지니어링 시대의 설계.** 에이전트는 프롬프트 한 번이 아니라 act → observe → verify를
> **객관적으로 검증 가능한 완료 기준**까지 반복하는 루프로 움직입니다. 올림푸스는 처음부터 그렇게
> 지어졌습니다 — 크로노스(실제 테스트 실행 검증 게이트), 미노스(fix-until-pass), 아르고스(AC 대조),
> 클리오(GO/NO-GO). v4.7.0부터 이 루프들은 CLI 네이티브 기능(`/goal` Stop 게이트, 리뷰 엔진,
> 내장 서브에이전트) 위에서 돕니다 — 하네스는 기반, 루프는 운영 모델.
> 그리고 v4.8.0부터 루프는 **계속 도는 법**을 압니다: 루프는 의지가 아니라 구조로 유지됩니다 —
> 심장박동은 기계에, 상태는 감사 로그에, 막힌 이슈는 결재 가능한 브리프와 함께 주차,
> 거짓 완료 선언은 훅 레벨에서 거부.

---

### 무엇을 얻는가

| | |
|---|---|
| 🏛️ **신전** | 12명의 그리스 신(스킬), 각자 한 가지 손재주를 위해 빚어졌다. 한 명을 부르거나 ― 제우스를 부르면 열둘이 한꺼번에 강림 |
| ⚡ **한 마디 파이프라인** | `/zeus "..."` 한 줄이 SaaS 한 채를 완성한다 (설계 → 구현 → 감리 → 테스트, 인간의 손길 없이) |
| 🧠 **CLI 가로지르는 기억** | 3계층 영속 메모리(`mnemo`)가 세션을 가로지르고 Claude/Codex/Gemini/Grok을 가로지른다 |
| 🔁 **지치지 아니하는 루프** | `/chronos`가 자율적으로 FIND → FIX → VERIFY를 반복한다, 버그가 죽거나 새벽이 올 때까지 |
| 👁️ **백 개의 눈을 가진 파수꾼** | `/argos`가 spec ↔ 코드 ↔ 테스트를 교차검증한다. 백 개의 눈을 비껴가는 것은 없다 |
| ⚖️ **저승의 심판자** | `/minos`가 모든 Playwright 테스트를 황금 저울에 단다. fix-until-pass 루프, 도망갈 곳은 없다 |
| 📜 **기록자 + 마무리투수** | `/clio` — 먼저 GO/NO-GO를 판정하고, 그 다음 PRD, 흐름도, 기술 문서, 문서 사이트를 청동에 새긴다 |
| 🏠 **화로의 여신(선택)** | source-only `hestia` 워크플로우가 Dead Code, 미사용 export, 고아 파일을 찾는다. 카탈로그 경로로 요청하거나 source-only opt-in 후 `/hestia`를 사용한다 |
| 📋 **출시 체크리스트(선택)** | source-only `shipping-and-launch` 워크플로우가 프리런치 게이트, 단계적 롤아웃, 롤백 계획을 다룬다 |
| 📐 **결정 기록(선택)** | source-only `documentation-and-adrs` 워크플로우가 대안·트레이드오프·대체 이력을 기록한다 |

**공개 추적 스킬 소스 99개(기본 allowlist 합집합 17개 = 사용자 진입점 하네스 11개 + 런타임 어댑터 6개, 설치 표면별 활성 13개 또는 14개, source-only 내부·선택 모듈 82개) · 에이전트 참고 소스 42개(최상위 40개 + 스킬 소유 2개, 기본 등록 0개) · 훅 9개 · CLI 4개 · 신화 1개**

---

## 하네스 엔지니어링과 루프 엔지니어링

제우스는 하네스 계층입니다. 한 줄의 비대화형 요청을 살아 있게 유지하고, 설계로 분해하고, 구현하고, 감리하고, 배포하고, 테스트하고, 증거 리포트까지 마친 뒤에야 SUCCESS를 허용합니다. 이 레포에서는 `skills/zeus/SKILL.md`가 Chronos 지속성 가드를 부트스트랩하고, Zephermine 설계, Poseidon(`agent-team-codex`) 구현, Argos 감리, Docker, Minos, 최종 증거 리포트를 순서대로 묶습니다.

<p align="center">
  <img src="docs/assets/zeus-harness-engineering-codex-imagegen.png" alt="Chronos 가드에서 Zephermine, Poseidon, Argos, Docker, Minos, 증거 리포트로 이어지는 Zeus 하네스 엔지니어링 파이프라인" width="1100">
</p>

크로노스는 그 하네스 아래의 루프 계층입니다. 우선 네이티브 `/goal`을 쓰고, 필요하면 Codex notify 체인(`save-turn -> continue-loop -> codex exec --skip-git-repo-check resume --last -`)으로 폴백합니다. 종료는 `Chronos Complete` 또는 정확히 일치하는 `<promise>`만 인정하고, 소진은 미완으로 보고하며, 막힌 이슈는 Owner Decision Brief로 주차하고, 각 사이클은 READ -> FIND -> FIX -> VERIFY -> LOG로 돌아갑니다.

<p align="center">
  <img src="docs/assets/chronos-loop-engineering-codex-imagegen.png" alt="네이티브 goal, Codex notify 폴백, resume 체인, 검증 사이클, 완료 계약, PARK, EXHAUSTED를 포함한 Chronos 루프 엔지니어링" width="1100">
</p>

---

## 빠른 시작

### 처음 설치

```bash
# 클론
git clone https://github.com/Dannykkh/skill-olympus.git
cd skill-olympus

# Windows
.\install.bat

# macOS/Linux
chmod +x install.sh && ./install.sh
```

인수 없이 실행하는 것이 기본 전체 설치입니다. 이 기본값은 Claude, Codex, Gemini, Grok
전체를 대상으로 합니다. `--all`은
같은 동작을 명시적으로 적는 선택 옵션입니다. 선택된 CLI 실행 파일이 `PATH`에 없어도
해당 홈의 스킬·카탈로그·source-only 라이브러리·훅·설정 파일은 준비하고, MCP 등록처럼
실행 파일이 필요한 명령만 건너뜁니다. 나중에 CLI를 설치한 뒤 같은 설치기를 다시 실행하면 됩니다.

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

끝입니다. 공개 추적 스킬 소스 99개는 기본 allowlist 합집합 17개(사용자 진입점 하네스 11개 + 런타임 어댑터 6개)와 source-only 내부·선택 모듈 82개로 나뉩니다. 런타임별로 호환되지 않는 어댑터를 다시 제외하므로 Codex와 Gemini는 호환 항목 95개(활성 13 + source-only 82), Claude는 96개(활성 14 + source-only 82)를 노출합니다. Grok의 독립 정책도 95개(13 + 82)이지만 실제 설치 표면은 Claude 공유 디렉터리를 읽으므로 Claude와 같은 활성 14개를 봅니다. 내부 전용 `deploymonitor`는 로컬에만 있어 공개 배포 수에 포함하지 않습니다. 활성 하네스는 필요한 source-only 모듈을 카탈로그에서 직접 읽으므로 별도 등록이 필요하지 않습니다. **Olympus 사용자 정의 에이전트는 기본으로 하나도 등록하지 않으며**, 참고 소스 42개는 모두 source-only입니다. 새 스킬과 에이전트도 allowlist 승인 전에는 자동 활성화되지 않습니다.

> CLI가 없어도 자산 준비는 건너뛰지 않습니다. 실행 파일이 필요한 등록 명령만 `skipped`로
> 보고하며, 설치된 자산은 해당 CLI를 처음 실행할 때 그대로 사용됩니다.

> 기존 설치를 업데이트하는 경우 이름이 다른 외부 스킬은 유지되고, Olympus와 이름이
> 겹치는 수정본은 삭제 대신 `_olympus-preserved`로 이동합니다. 기본 구성·source-only 전체
> 활성화·충돌본 복구 절차는 [스킬 레지스트리 마이그레이션 가이드](docs/skill-registry-migration.md)를
> 먼저 확인하세요.
> 충돌본 복구는 수동입니다. 보존본의 디렉터리명과 `SKILL.md` frontmatter `name`을 함께
> 고유하게 바꾼 뒤 복사해야 다음 동기화에서 다시 이동되지 않습니다. `--uninstall`은 보존본을 자동 복구하지 않습니다.

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

---

## 최신 업데이트

### v5.1.0 — 아프로디테 근거 게이트 · 브라우저 모션 · 영상 엔진 분리 (2026.08)

아프로디테는 이제 Codex Product Design을 exact marketplace selector가 확인된 경우에만 한 번 추천하는 선택 실행 어댑터로 취급합니다. marketplace가 비어 있거나 selector가 검증되지 않으면 `UNKNOWN`으로 남기고, 플러그인 결과를 꾸며내거나 설치를 압박하지 않은 채 로컬 디자인을 계속합니다. 로컬과 준비된 adapter는 같은 brief, Experience Contract, `DESIGN.md`, 콘텐츠, 데이터, 상태, viewport, theme로 대조합니다. 계약에는 Product Facts, Content Integrity, Asset Provenance를 추가했고, 실시간 웹 UI 모션은 CSS·View Transitions·Scroll-driven Animations를 우선한 뒤 필요가 입증될 때만 GSAP Timeline·ScrollTrigger·Flip·SplitText·SVG 플러그인으로 올라갑니다. 별도 기능인 `video-maker`는 영상 프로젝트마다 Remotion(React/TSX) 또는 HyperFrames(HTML/CSS/GSAP) 중 엔진 하나만 선택하며, 엔진별 런타임·라이선스 게이트와 공통 렌더 QA를 적용합니다. HyperFrames는 아프로디테 런타임이 아니며 영상 엔진을 전역 설치하거나 다른 CLI로 동기화하지 않습니다.

### v5.0.0 — 진입점 전용 레지스트리 · 네이티브 에이전트 · 공급자 안전 라우팅 (2026.08)

Olympus는 이제 사용자 진입점 하네스와 현재 CLI용 런타임 어댑터만 자동 탐색 레지스트리에 둡니다. 공개 추적 스킬 소스 99개는 allowlist 합집합 17개(공통 진입점 11개 + 런타임 어댑터 6개)와 source-only 모듈 82개로 분리됩니다. Claude와 Claude 디렉터리를 공유하는 Grok은 활성 14개, Codex와 Gemini는 활성 13개이며, 세 CLI 홈 모두 정확한 카탈로그 경로로 같은 82개 source-only 라이브러리를 유지합니다. 내부 전용 `deploymonitor`는 로컬에만 있어 공개 릴리스 수에서 제외됩니다. source-only는 현재 코드를 삭제한 상태가 아니라 slash 메뉴와 시작 description 예산을 쓰지 않고 필요할 때 직접 읽는 상태이며, 전체 레지스트리가 필요할 때만 `--include-source-only-skills`로 명시 활성화합니다. Olympus 사용자 정의 에이전트는 기본 0개입니다. 오케스트레이션은 CLI별 읽기 전용·쓰기 가능 네이티브 의미 역할을 사용하고, Main이 공유 상태를 소유하며 위임할 수 없으면 같은 계약으로 순차 실행합니다. 공급자별로 호환되는 어댑터만 선택해 Claude/Grok·Codex·Gemini가 서로의 mnemo나 agent-team 어댑터를 잘못 로드하지 않습니다. 설치기는 인수 없음도 네 CLI 전체 설치로 처리하고, CLI 실행 파일이 없어도 자산은 준비하되 실행 파일이 필요한 등록만 건너뜁니다. 이름이 다른 외부 스킬은 유지하고, 같은 이름의 수정본은 `_olympus-preserved`로 옮겨 수동 복구할 수 있게 보존합니다.

### v4.21.0 — 아프로디테 경험 주도 재설계 · Stitch 실행 어댑터화 · 제우스 스코프 게이트 (2026.08)

아프로디테는 더 이상 색 토큰에서 시작하지 않습니다. 파이프라인이 소스 라우팅 → 사이트 벤치마크 해부(헤더·메시지·섹션 순서·CTA·신뢰·모바일 변환에 대한 근거 있는 Adopt/Adapt/Avoid 판정) → 실제 렌더 3안 → 사용자 과업·메시지·CTA·신뢰·반응형 동작을 담는 **Experience Contract** → 구현 → 렌더 UX/접근성/성능 게이트 → 학습 핸드오프로 개편됐고, 계약 형식은 검증 스크립트가 강제합니다. Stitch는 실행 어댑터로 재정의됐습니다: 아프로디테의 결정(`DESIGN.md`, design-refs)을 Stitch MCP 작업으로 컴파일하며 — 작업 계약·상태 관리·파일 전송 패턴은 google-labs-code/stitch-skills에서 선별 반영 — 스스로 시각 방향을 발명하지 않습니다. 제우스에는 **스코프 게이트**가 생겼습니다: zero-interaction 실행에는 스코프 확장을 승인해줄 사용자가 없으므로, 계획에 없던 태스크·기능·의존성은 자문 3개(한 줄 목표에 기여하는가? 지금 필요하게 만든 관찰된 근거는? 더 작은 대안은?)를 통과하고 pass/reduce/hold 판정을 결정 장부에 남겨야 하며, hold 항목은 Deferred로 표시돼 사용자가 사후 승격합니다 (hosioobo/track 원칙 흡수).

### v4.20.2 — 테미스: 공식 지침 핀 · 런타임 신선도 체크 (2026.08)

(v4.20.1~v4.20.2) 한국판 경로가 개인정보보호위원회 공식 **「개인정보 처리방침 작성지침(2025.4.)」**에 고정됐습니다: 스킬에 지침 기준판을 핀해 두고, 생성 시점에 공식 게시판을 확인해 더 새 개정판이 있으면 그 판을 따르며 사용자에게 고지합니다(웹 도구 없는 환경은 기준판 + "최신 확인 권장" 표기로 폴백). ko 템플릿에는 2025.4. 구체화 항목 — 보호책임자와 분리된 고충 처리 부서 연락처, 행태정보 수집·거부 조항, 아동 개인정보 조항(제22조의2) — 이 들어갔습니다. 조문 인용은 law.go.kr 직접 조회로 검증하며, 잠시 넣었던 법령 MCP 선택 연동은 불필요한 의존이라 제거했습니다 — "지침이 계속 갱신된다" 문제는 인프라 소유가 아니라 런타임 확인으로 푸는 것이 맞습니다.

### v4.20.0 — 테미스: 개인정보처리방침 생성 · mnemo Opt-Out (2026.08)

법과 질서의 티타니스 테미스가 100번째 스킬로 합류합니다. 코드베이스에서 개인정보를 받고·저장하고·내보내고·지우는 모든 지점을 감사하고(5문항 + grep 힌트 + soft delete·append-only 로그·언인스톨 범위·마스킹 커버리지·자동 아웃바운드·`git ls-files` 실측까지 잡는 함정 체크리스트), 코드로 알 수 없는 14가지(보호책임자·보유기간·아동 대상·서버 리전·마케팅 활용…)는 운영자 인터뷰로 수집한 뒤, 감사 사실만으로 국가별 초안(한국 개인정보보호법 제30조 / 미국 CCPA·CPRA / EU GDPR Art.13)을 생성합니다 — 확인 안 된 것은 날조 대신 [빈칸], 법적 판단은 [확인 필요], 모든 초안에 법률 자문 아님 고지가 붙습니다. 이 레포 자체로 도그푸딩했고 그 초안 3종이 `docs/privacy-policy-draft-*`로 동봉됩니다. 그 감사가 우리 자신의 갭 — 끌 수 없는 저장 훅 — 을 드러냈고, 그래서 mnemo에 `MNEMO_DISABLE`(4-CLI 훅 15개 진입점 즉시 종료, 기존 저장분 유지), 세션 시작 버전 체크에 `OLYMPUS_UPDATE_CHECK_DISABLE`이 생겼습니다. 둘 다 켬·끔 대조 실행으로 검증했습니다.

### v4.19.0 — Native-First 대전환: 4-CLI 네이티브 멀티에이전트 · impeccable 검출 훅 (2026.08)

아프로디테 간섭 실험(실질 결함: 네이티브 단독 1건 ≪ 커스텀 20건 ≈ 혼합 25건)이 실증한 native-first 원칙 — **"엔진은 상류에, 확장은 로컬에"** — 을 스킬군 전체에 적용했습니다. 디자인 축: frontend-design 포크가 공식 플러그인에 자동호출을 양보하고(v2.9.1 코어 이식), 금지 규칙은 프롬프트가 아니라 린터로 — impeccable 59 결정론 규칙을 PostToolUse 훅으로 배선했습니다. 이 과정에서 PostToolUse의 exit 0 평문 stdout이 모델에 전달되지 않는 결함을 발견해 `additionalContext` JSON으로 고쳤습니다(수정 전엔 훅이 영원히 조용히 돌 뻔했습니다). 멀티에이전트 축: 4-CLI 전부가 네이티브 멀티에이전트를 보유하게 된 현실을 반영해, 포세이돈·다이달로스의 실행 엔진을 CLI별 네이티브(Claude Agent Teams / Codex spawn_agent / Gemini 서브에이전트 / Grok spawn_subagent)로 위임하고 orchestrator MCP는 hard file lock·외부 태스크 보드 정책 레이어 + 구버전 폴백으로 재포지셔닝했습니다. 제우스는 ultracode 세션 한정 Workflow 검증 fan-out 분기를, 크로노스는 Gemini AfterAgent 배선 정정(+ 폐기된 /loop 도움말 잔재 제거)을, 아르고스는 Phase 1 일반 품질 층의 네이티브 리뷰 위임(spec 감리는 고유 영역 유지)을 얻었습니다. humanizer도 두 업스트림(blader v2.9.1 + im-not-ai v2.3)을 재흡수했습니다. Gemini 경로는 공식 문서 근거 설계이며 실스폰은 미실측입니다 — 실측 체크리스트를 기록해 두었습니다.

### v4.15.0 — Grok Build 지원: grok-mnemo 어댑터 (2026.07)

Grok Build(xAI CLI)가 거의 제로 비용으로 합류했습니다. `grok inspect --json` 실측으로 Grok이 `[compat.claude]` 기본값을 통해 `~/.claude/`를 직접 읽는 것을 확인 — 스킬 99개, 에이전트 41개, MCP 서버, 글로벌 CLAUDE.md 규칙이 sync 스크립트 없이 전부 로드됩니다. 유일한 parity 갭은 mnemo 자동 저장이었습니다: Grok의 훅 envelope는 camelCase(`transcript_path` 없음)라 Claude Stop 훅이 조용히 no-op 되어 Grok 대화가 기록되지 않았습니다. **grok-mnemo**가 이 갭을 닫습니다 — 한 스크립트가 두 이벤트를 분기(UserPromptSubmit은 Grok의 `<user_query>` 래퍼를 스트립, Stop은 `reason == "end_turn"`만 필터해 세션 종료 재발화를 제외하고 `lastAssistantMessage`를 transcript 파싱 없이 직접 저장)하며 `conversations/YYYY-MM-DD-grok.md`에 기록합니다. Grok이 `~/.claude/settings.json` 훅도 함께 로드하므로, Claude mnemo 훅 5쌍에 `GROK_HOOK_EVENT` 가드를 넣어 이중/오분류 저장(Grok 프롬프트가 `-claude.md`에 오저장)을 차단했습니다. 배포 과정에서 환경 함정 2건도 기록으로 남겼습니다 — 한글 주석 `.ps1`은 UTF-8 **BOM 필수**(PS 5.1이 BOM 없는 파일을 CP949로 읽으면서 오해석된 주석이 개행을 삼켜 다음 코드 줄을 흡수 — `<user_query>` 스트립이 조용히 실행되지 않았음), 그리고 installer 테스트가 `NoDefaultCurrentDirectoryInExePath=1` 머신에서 상대 이름 호출 때문에 실패하던 문제. 실제 `grok -p` headless 세션으로 끝까지 검증했습니다.

### v4.14.0 — 레이아웃 블록 해부 · 질감 레시피 · 프롬프트 소비 게이트 (2026.07)

한 바퀴 완주: 아프로디테로 실제 페이지를 만들어보고, 여전히 뻔하다는 걸 발견하고, 파이프라인을 고치고, 다시 만들고, 반복 — 이 프로젝트 자체의 랜딩 페이지(`dannykkh.github.io/skill-olympus`)로 끝까지 검증했습니다. **레이아웃 블록 해부:** bag-ui(MIT)의 블록 와이어프레임 카탈로그를 구조 문법으로 번역 — 30개 블록 해부 계약(Marketing/App/Ecommerce, 잉크 위계 3단계·강조 블록당 1개·CTA 문법·지속 비대칭)을 design-plan Phase 2.5로 배선해 구현 전에 구조부터 고정합니다. **프롬프트 소비 게이트:** DESIGN.md의 산문 계약과 `docs/design-refs/` 슈퍼프롬프트가 생산되고도 구현 시점에 강제로 읽히지 않던 문제 — Phase 3에 필수 Read 게이트를 넣고, 방향 카드는 대화가 아니라 파일로 저장하도록 했습니다. **질감/텍스처 레시피:** SKILL.md가 "그레인/메시/노이즈로 atmosphere를 만들라"고 지시만 하고 검증된 CSS 값이 없어 구현에서 증발하던 것을, `technique-recipes.md` §11(그레인 오버레이·절제된 메시 그라데이션·반복 요소 강조 이탈·지속 비대칭·지루함 테스트)로 채웠습니다. 재구현 과정에서 실제로 배포하지 않으면 안 보이는 버그 2건도 잡았습니다 — 한글 서브셋 웹폰트의 `document.fonts` API false-negative(네트워크 로드는 성공했는데 API는 "unloaded"로 보고), 모바일 CSS 셀렉터 버그(`.pipeline-grid > div`가 빈 gutter뿐 아니라 타임라인 전체를 삭제) — 둘 다 스크린샷 관찰로만 발견됐습니다.

### v4.13.0 — 데이터 시각화 스킬 (2026.07)

Anthropic 공식 `data-visualization` 스킬 벤더링(`anthropics/knowledge-work-plugins`, Apache-2.0, 본문 무수정) — 데이터 관계별 차트 선택 가이드(추세/비교/순위/분포/상관/흐름), 차트 안티패턴(파이 6개 초과, 3D, 이중축 주의), Python(matplotlib/seaborn/plotly) 코드 패턴, 디자인 원칙, 접근성 체크리스트.

### v4.12.0 — 스타일 레시피 · 레퍼런스 자산화 · 크로노스 심장박동 (2026.07)

아프로디테가 MengTo/Skills(MIT) 정독 후 좋은 것만 흡수했습니다. **스타일 레시피 12종:** 하나의 미학을 "경계 선언 + hex 토큰 + 한·영 폰트 스택 + Tuning Knobs + Avoid"로 캡슐화 — 원본의 값 없는 산문 한계를 CSV DB 바인딩으로 보완했고, 전 색 쌍을 WCAG 계산으로 검증했습니다(4.5:1 미달 3건 사전 수정). **테크닉 레시피 9종:** 그림자·progressive blur·보더 그라데이션·텍스트 리빌·GSAP+Lenis의 복붙 가능한 검증 값. **레퍼런스 자산화(Phase 2 개편):** 스크린샷/URL/영상/HTML을 섹션 해부 슈퍼프롬프트(`docs/design-refs/`)로 변환해 버전 관리되는 파일 자산으로. **크로노스 heartbeat:** `/goal` 설정을 건너뛰면 엔진 없이 돌다 멈추던 갭을 네이티브 `/loop` 인터벌 재진입(`--heartbeat`)으로 해소, 점수형 완료 조건(90점 게이트)은 `--completion-promise` 3요소(임계값·측정 방법·대화 출력)로 명문화. editorial-tech 레시피로 샘플 페이지를 만들어 파이프라인 전체(한글 폴백 렌더·모션·반응형·대비)를 실측 검증했습니다(gotcha 045: `document.fonts.check()` 서브셋 false-negative 발견·보정).

### v4.11.0 — Unknowns-first 계획 · 가벼워진 젭마인 흐름 · 구현 학습 루프 (2026.07)

젭마인이 넓은 선호 질문으로 멈추는 대신, 무엇을 모르는지부터 좁혀 계획합니다. **Unknowns-first 탐색:** Step 4가 스펙과 위험도에 따라 코드베이스/웹/GitHub/논문/경쟁사 리서치를 자동 선택하고 `research-decision.md`를 남긴 뒤, Step 5A가 `unknowns.md`에 known knowns, known unknowns, unknown knowns, unknown unknowns, 아키텍처를 바꿀 질문을 정리합니다. **가벼운 인터뷰:** Step 6은 아키텍처, 데이터 모델, 보안 경계, UX 흐름, 롤아웃, 컴플라이언스를 바꿀 critical blocker만 묻고, 나머지는 추론한 전제로 기록한 뒤 계속 진행합니다. **멈추지 않는 도메인사전:** `domain-dictionary`는 명확한 글로벌 용어를 자동 시드하고 ADD/REFINE/MERGE를 자동 병합하며, 산출물을 크게 바꾸는 충돌에서만 질문합니다. **구현 학습 루프:** workpm과 agent-team 프롬프트는 `implementation-notes.md`의 Deviations를 남기고, Clio는 `CHANGE-QUIZ.md`를 만들 수 있으며, frontend-design은 구현 전에 여러 정적 프로토타입으로 "보면 아는" 선호를 끌어낼 수 있습니다.

### v4.10.0 — DESIGN.md 정본 · 한글 폰트 실제 로드 가드레일 · 훅 타임아웃/스키마 수정 (2026.07)

실제 한글 UI로 `/aphrodite`를 끝까지 돌려 검증하며 나온 개선. **DESIGN.md 정본:** 구글 `@google/design.md` 포맷(YAML 토큰 + 산문 2층)을 아프로디테 디자인 정본으로 채택하고 에이전트 배선·단일소스·검증을 더함(`design-md-guide.md` 신규, CSV 팔레트를 DESIGN.md에 고정해 재호출 드리프트 방지, mnemo 3-CLI 가드레일에 "DESIGN.md 먼저 읽기" 주입, stitch 스키마 통일). **한글 폰트 실제 로드:** 라틴 페어링만 픽하면 한글이 시스템 폰트로 조용히 폴백(Space Grotesk/DM Sans엔 한글 글리프 없음) → 폰트 실제 로드(@import/link + `document.fonts.check`) + 한글 UI는 한글 전용 페어링(Hahmlet/Noto Serif KR + Pretendard/Noto Sans KR) 우선으로 폴백 함정(gotcha 041) 구조적 회피, 라틴+Pretendard 스택은 폴백 경로로 유지. **다크/라이트 규칙:** 흔히 놓치는 3곳(컨테이너 `div` 배경 · 텍스트 반전 · `<select>` option `color-scheme`)을 mnemo 가드레일 + ui-ux-auditor 검증에 반영. **수정:** 훅 30초 타임아웃 방지(생성기 4곳 timeout 60초 + `powershell -NoProfile`, "hook timed out after 30s" 해소), AskUserQuestion 스키마 위반(옵션 4개 · header 12자) — 아프로디테 프리셋 + zephermine 템플릿.

### v4.9.0 — Always-on 디자인 가드레일 · 구현 전 조회 · 핸드오프 Feature Map (2026.06)

세 가지 always-on 역량 + 호환성 감사. **디자인 가드레일 주입:** frontend-design의 안티-슬롭 지침은 스킬을 명시 호출할 때만 작동했다(`auto_apply`는 어떤 훅도 안 읽는 no-op) — 그래서 일반 디자인 요청은 "인터넷 평균"으로 수렴했다. 이제 압축 가드레일이 3-CLI always-on(CLAUDE.md/AGENTS.md)에 주입되고 2026 웹 플랫폼으로 갱신됐다 — 네이티브 스크롤 타임라인 우선(핀·스냅·WebGL만 GSAP·Lenis), View Transitions, 컨테이너 쿼리, `:has()`, OKLCH — 여기에 한·영 글꼴 페어링 원칙(Pretendard + 눈누, 무게/대비 DNA로 한 시스템). 압축 ~24%, 3종 방향(도파민/에디토리얼/브루탈)으로 브라우저 검증. **구현 전 조회 가드:** "X 구현" 요청에 기존을 먼저 조회(codemap → README/핸드오프 → grep)해 신규/개선/중복 분류하고, 인접 파이프라인(zeus·zephermine·agent-team)과도 대조 — "이미 있는 걸 또 구현"하는 루프를 닫는다. **핸드오프 Feature Map:** 모든 핸드오프가 Feature/Flow/Decision Snapshot + Menu/Screen Map(화면별 기능 + done/partial/planned 상태)을 남기며, 다이어그램은 기능 세션에만 필수. **agent-team·chronos**에 정적 경계면 정합성 교차비교("빌드 통과 ≠ 정상" — TS 제네릭이 API↔훅 계약 불일치를 숨김)와 chronos FIND의 도구 신호 근거화를 추가. **호환성 감사:** Pydantic v2, Next.js 15 async params, MySQL 8.4, docker compose v2, MUI v7, OpenAPI 3.1, Tailwind v4, stale 도구/모델 라벨.

### v4.8.7 — 루프 정직성: 완료 계약·독립 검증·소진 표면화 (2026.06)

Loop Library 028/034 패턴을 루프 전반에 적용했습니다. **완료 계약**(각 요구사항을 재현 가능한 증거에 매핑하고 `proved/weak/missing/contradicted`로 채점, **소진을 success로 보고 금지**)이 크로노스·제우스·minos·autoresearch·argos·agent-team·workpm의 종료 판정을 규율합니다. 한 행위자가 자기 산출물을 스스로 채점하던 자리에는 **교차모델 독립 검증**을 더했습니다 — autoresearch는 최종 챔피언을 다른 모델 패밀리로 재채점하고, 제우스 argos 게이트는 위험 트리거에서만 교차모델을 돌립니다(결정론적 빌드/테스트/정적 게이트가 먼저, 다른 모델은 백그라운드 — 구현 경로는 빠르게 유지). **훅 레벨**에서는 loop-stop·continue-loop가 max-iter/stale 소진 시 `EXHAUSTED`를 표면화하고 마지막 허용 턴에 정직 보고 경고를 주입합니다(dry-run 검증 ps1 5/5, sh 문법 검사). 헤르메스에는 grounding 가드를 추가 — TAM/SAM/SOM 수치에 출처 또는 `[확인 필요]` 명시를 요구합니다.

### v4.8.1 — mnemo 루트 결정 수정 (2026.06)

자동저장 훅이 *마지막* cwd를 기준으로 삼던 탓에, 비-git 프로젝트에서 하위 폴더(`reference/1week` 등)로 `cd`하면 `conversations/`·`memory/`가 그 하위 폴더에 흩어졌습니다. 이제 루트 결정을 2-pass 후보 평가로 바꿔, Pass 1은 git 루트가 잡히는 첫 후보(git repo는 어느 하위 폴더에서도 정규화), Pass 2는 비-git이면 **세션 시작 cwd**를 앵커로 써서 전역 `cd`가 유지돼도 루트가 흔들리지 않습니다. HOME 자체가 git 저장소인 환경도 방어합니다(HOME은 후보 제외, git 루트가 HOME이면 dotfiles repo로 보고 건너뜀). 8개 훅(save-response/save-conversation/save-tool-use/reconcile-conversations × ps1·sh)에 적용하고 설치본을 동기화했습니다. PS 7/7 · SH 7/7 시나리오 테스트 통과.

### v4.8.0 — 루프 프로그래밍: 주차, 브리프, 재진입 (2026.06)

> 루프는 모델이 계속하겠다고 마음먹어서 도는 게 아닙니다. 멈추기 어려운 구조가 있어야 돕니다.
> 기계가 박동을 만들고, 상태는 컨텍스트 밖 감사 로그에 남깁니다.
> 막힌 이슈는 루프를 세우지 않고 주차하며, 사람에게는 결재 가능한 브리프만 넘깁니다.

<p align="center">
  <img src="docs/assets/chronos-loop-programming.svg" alt="크로노스 루프 프로그래밍 사이클" width="860">
</p>

루프 상태는 컨텍스트 윈도우가 아니라 감사 로그에 남습니다. 매 사이클은 READ에서 다시 시작해 실제 검증을 돌립니다. 막힌 이슈는 결재 가능한 브리프로 주차하고, 훅은 거짓 완료 선언을 그대로 통과시키지 않습니다.

- **크로노스 주차(PARK) 규칙** — 막힌 이슈 하나가 루프 전체를 멈추지 못합니다. 주차 사유는 검증 3회 실패, 권한 경계, 외부 접근 부재, 제품 결정 네 가지뿐입니다. 사유 없이 "막힘"이라고만 하면 회피로 봅니다. 주차하기 전에는 재현, 원인 분석, 권한 안의 수정까지 갈 수 있는 데까지 가야 합니다.
- **PARK 전 에스컬레이션 사다리** — 검증 실패는 사람에게 주차하기 전에 모델이 능력을 한 칸 올려 다시 시도해야 합니다(추론 effort 상향, 더 강한 모델, 둘 다 불가하면 focused review pass). 같은 방식 재시도만으로는 주차할 수 없고, 에스컬레이션은 이슈당 1회만 돌며 그 결과는 Owner Decision Brief 증거란에 남깁니다.
- **Owner Decision Brief** — 주차된 이슈는 날것의 질문으로 던지지 않습니다. 무엇이 막혔는지, 왜 지금 결정해야 하는지, 증거와 트레이드오프, 추천안과 선택지를 함께 적어 결재 가능한 상태로 넘깁니다. 사용자는 추천 승인, 반려, 접근 권한 하나 부여, 문서화된 대안 선택 중 하나만 고르면 됩니다.
- **재진입 규약(READ 단계)** — 매 사이클은 FIND 전에 `docs/chronos/chronos-log.md`를 다시 읽습니다. 모델의 기억과 로그가 다르면 **로그가 이깁니다**. 새 세션도 감사 로그만 보고 루프를 이어받습니다. 루프의 상태는 컨텍스트 윈도우가 아니라 파일에 있습니다.
- **데드락 가드** — goal 목표문에 주차 조항을 넣었습니다. 주차된 이슈만 남으면 Brief를 담은 `Chronos Complete` 보고로 끝냅니다. 거짓 `<promise>`를 출력해도 끝난 것으로 처리하지 않습니다. loop-stop/continue-loop에서 "`<promise>` 태그만 있으면 완료" 분기를 제거했고, 불일치 promise는 종료 대신 재투입합니다. 여러 줄 promise 매칭을 보강하고 재투입 메시지에도 주차 규칙을 넣었습니다. loop-stop.ps1은 4가지 케이스(불일치 거부 / 정확 일치 / 주차만 남은 완료 / 마커 없음 재투입)를 모두 통과했고, .sh도 같은 로직으로 문법 검증을 마쳤습니다.
- **제우스 결정 장부(Decision Ledger)** — `[ZEUS-AUTO:taste]` 결정에 근거, 기각한 대안, **되돌리는 법**을 함께 남깁니다. zero-interaction은 유지하되 결재는 사전 승인 대신 사후 검토로 옮겼고, 되돌리기 쉬운 기본값을 우선합니다.
- **codex-mnemo 설치기 수정** — notify 래퍼 판정 순서를 고쳤습니다. save-turn을 체인하는 래퍼는 IDE 알림 제거 휴리스틱보다 먼저 보존하고 갱신합니다. 그래서 Codex의 단일 notify 슬롯을 공유하는 외부 도구가 재설치 때문에 조용히 끊기지 않습니다.

### v4.7.1 — 아프로디테 시각 검증 + 클리오 게이트 강화 (2026.06)

- **ui-ux-auditor 시각 검증** — Grep 정적 스캔(1차 신호) 후 dev server를 띄워 스크린샷(데스크톱 1440×900/모바일 390×844 × 라이트/다크)을 찍고 **렌더링된 화면을 직접 관찰해 채점**. 관찰과 코드 추정이 충돌하면 관찰이 이김. 서버 구동 불가 시에만 정적 폴백 + 등급 `*` 표기. 결함 4종(다크모드 대비 붕괴·보라 그라데이션·3열 대칭·고정폭 오버플로)을 심은 스모크 테스트로 4/4 관찰 검출 실증
- **clio v2.1.1 — GO/NO-GO 판정식 보완** — minos 결과를 판정식에 반영(PASS/CONDITIONAL/FAIL), 테스트 0개의 공허한 GO 차단(최대 CONDITIONAL GO), `--force`/`--docs-only` 우회 시 산출물에 미통과 표기 의무화
- **아프로디테 경계 명시** — Phase 3 구현 범위를 "외관 한정"으로: 토큰·마크업·스타일·비주얼 인터랙션은 담당, 상태·API·비즈니스 로직은 포세이돈/다이달로스 몫 (파이프라인 모드 로직 변경 금지)

### v4.7.0 — 네이티브 하니스 결합 (2026.06)

> 루프 엔지니어링의 기반 공사 — 루프의 부품(Stop 게이트, 리뷰 엔진, 팀 도구)을 CLI 네이티브 기능과 정렬.

- **code-reviewer v4.1 — 엔진 위임 + 정책 레이어** — 일반 리뷰는 사용 가능한 런타임 엔진(Claude 내장 review, Codex `codex review --base`, Grok bundled review)에 위임하고, 없는 런타임은 풀 경로로 폴백. Scope Drift·도메인 체크·기본 읽기 전용 Action Triage와 안전한 명시형 저장소 보안 감사를 추가하며, 원격·과금형 ultra review는 호출·권유하지 않음
- **크로노스 구 별칭 `/loop` 폐기** — 네이티브 `/loop`(주기 반복 실행기)와 이름 충돌로 Claude에서 가로채기 발생. 전 CLI에서 별칭 제거 + goal(Stop 게이트) / loop(반복 실행기) / chronos(루프 규율) 3종 비교표
- **네이티브 결합 감사 후속 (병렬 Explore 5개)** — zeus /goal 관계 명시(zero-interaction이라 훅 자동 재개가 기본, goal 기설정 시 이중 Stop 게이트 방지), agent-team experimental env var 구버전 강등, 메모리 경계 4파일(프로젝트 루트 3계층 ≠ 네이티브 auto-memory), orchestrator 네이티브/MCP 선택 기준표, 크로노스 `--flow-verify` 수신 정의, 젭마인 vs 네이티브 plan mode 구분
- **clio v2.1.0 — humanizer 한국어 윤문 연동** — 문서 생성 시 번역투/AI 문체 금지 제약 주입 + 생성 후 S1 윤문 패스 (USER-MANUAL > PRD > TECHNICAL 우선순위)
- **Codex 네이티브 `/review` 문서화** — TUI `/review`, `codex review --base/--uncommitted`, `codex exec review`를 `docs/resources/codex-cli.md`에 정리

### v4.6.0 — Humanizer 한국어 윤문 모듈 (2026.06)

- **한국어 번역투 모듈 (10분류 67패턴)** — 연결어미 뒤 쉼표(인간 글의 4.84배, 단일 최강 신호), ~성/~적/~화 명사화, 진행형 과다, 대명사 직역 등 한국어 고유 AI 신호. 정량 1차 스캔 + 장르별 가드레일(에세이/논문/블로그/대본/격식체)
- **심각도 등급 + 과잉편집 가드** — 영어 24 + 한국어 67 패턴에 S1(항상 제거)/S2(군집만)/S3(중첩만) 부여. 변경률 30% 경고 / 50% 중단으로 의미 훼손 방지
- **윤문 절차 노하우** — do-not 사전 마스킹(고유명사·숫자·인용 보호), 위험도순 수정, 변경률 실시간 추적 + 롤백 (im-not-ai v2.0 분류 참고)

### v4.5.0 — 크로노스 × 네이티브 /goal 통합 (2026.06)

- **/goal 래퍼로 재정의** — 네이티브 `/goal`("Set a goal Claude checks before stopping")이 Claude Code와 Codex에 추가됨. 크로노스는 이제 루프를 직접 돌리는 대신 `/goal`(지속성 엔진) 위에 규율을 얹음: 검증 게이트, 우선순위 사이클, 감사 로그
- **목표문 생성 모델 (자동 호출 없음)** — 크로노스는 `/goal`을 프로그램적으로 호출할 수 없음(슬래시 커맨드 도구 부재). 대신 규율을 녹인 goal 목표문을 생성·제시하고, 사용자가 `/goal`로 한 번 설정. 초안의 "자동 위임" 표현은 실현 불가능한 환상이라 제거
- **3계층 지속성 폴백** — `/goal`(1순위) → Stop 훅·notify(2순위) → 직접 루프(3순위). 훅을 보존해 Gemini·구버전에서도 크로노스가 작동(parity)
- **훅 충돌 하드 가드** — `setup-loop --goal-mode`가 `.claude/.codex/.chronos`의 기존 `loop-state.md`를 모두 제거해 Stop 훅이 재투입할 대상을 없앰. 규율이 아니라 코드 레벨에서 충돌 불가. `.ps1`/`.sh` 격리 테스트로 검증
- **Codex vs Claude /goal 차이 문서화** — 진입 문법은 같으나 완료 판정이 다름(Codex는 직접 명령 실행, Claude 평가자는 대화 출력만 봄). 목표문에 "검증 결과를 대화에 출력" + turn 상한을 넣어 양쪽 호환

### v4.4.2 — Chronos 강화 + 크로스-CLI parity (2026.05)

- **done-pattern 오탐 제거** — Stop 훅의 느슨한 서술형 정규식(`모든.*작업.*완료`, `더 이상.*고칠.*없` 등)이 사이클 중간의 진행 보고를 완료로 오인해 루프를 죽이고 있었음. `Chronos Complete` 마커와 `<promise>` 태그만 종료 신호로 인정하도록 정리 (문서화된 종료 계약과 일치)
- **tail-500 가드 제거** — 마지막 500자만 검사하는 가드 때문에 마커가 메시지 상단에 있고 뒤에 긴 설명이 붙으면 종료 신호가 놓쳐졌음. 명시적 마커만 보는 새 로직에선 가드의 본래 목적(오탐 방지)이 사라져 미탐만 남았기에 제거
- **Gemini state-path 버그 수정** — `loop-stop.ps1/.sh`가 `.claude/loop-state.md`만 보고 있어서 Gemini의 `.chronos/loop-state.md`를 못 찾아 Chronos가 Gemini에서 전혀 작동하지 않던 버그. 이제 `.claude/`, `.codex/`, `.chronos/` 3개 경로를 순서대로 탐색
- **알림 fanout 제거** — Mnemo 인스톨러와 save-turn 훅에서 데스크톱/IDE 알림 체인 제거. save-turn, Chronos, hook-bridge 흐름은 유지
- **Codex 호환성 감사 갱신** — `notify → ide-response-notify-wrapper → save-turn → continue-loop → codex exec resume --last` 체인 처음부터 끝까지 검증
- **메모리 정제** — memory-distill 정기 운용 결과 gotchas/learned 항목 정리
- **스트레스 테스트** — Claude에서 5회 반복 카운터 루프로 재투입 메커니즘(block + reason 재투입) 끝단까지 검증

### v4.4.1 — mnemo 점검 패치 (2026.05)

- **mnemo-status notify 훅 (LLM 호출 X)** — Stop/save-turn 훅이 raw jsonl 누적량 + 마지막 핸드오프 일수 체크 → 임계값(500건/14일) 도달 시 `memory/.mnemo-status.md` 작성 + stderr 한 줄. 텍스트 출력만, LLM 호출 0건
- **설계 ↔ 문서 일치** — v4.4.0의 "임계값 50 자동분석"은 실제 구현 코드가 없는 문서 표현이었음(자동 분석기는 LLM 비용 절감 위해 의도적으로 제외). config.json / SKILL.md를 실제 설계와 일치시킴: 정제는 `/memory-distill` 또는 핸드오프에서만
- **`list_handoffs.py` 버그 수정** — `YYYY-MM-DD-{slug}.md` (HHMMSS 없음) 파일이 "Date Unknown"으로 표시되던 문제 해결
- **`check_staleness.py --all`** — 일괄 모드 추가, 이전에는 인자당 1개씩만 점검 가능했음
- **Codex sync EXCLUDE** — `gemini-mnemo`가 Codex 설치본에 잘못 들어가던 문제 해결

### v4.4.0 — /memory-distill + Dreaming 동등 자기개선 (2026.05)

- **`/memory-distill` 스킬 (신규)** — raw `observations.jsonl`을 정제 `.md`로 변환하는 사용자 트리거. 모드: `--scan` / `--apply` / `--rebuild`. `--rebuild`는 중복 병합, 모순 처리(SUPERSEDED 패턴), 기존 .md를 `.archive/`로 백업하며 통째 재구성 — Anthropic Dreaming이 클라우드에서 하는 작업과 동일 로직
- **gotcha-analyzer 모델 격상** — `cleanup-low`(Haiku/mini/flash-lite) → 호출자 메인 세션 모델 상속. Claude Opus 4.7 / GPT-5.5 / Gemini 3.1 Pro 분석 품질 (Dreaming `model: claude-opus-4-7` 동등)
- **임계값 20 → 50 격하** — 자동 분석은 안전망으로 격하, 주 정제는 핸드오프 + `/memory-distill`로 이관
- **다층 트리거** — Stop 훅(수집) → 임계값 50(안전망) → `/memory-distill`(사용자 트리거) → 핸드오프(세션 경계)

### v4.3.0 — 므네모 메모리 정합성 점검 (2026.05)

- **핸드오프 경로 마이그레이션** — `.claude/handoffs/` → **`docs/handoffs/`** (gitignore 때문에 핸드오프가 팀원과 공유 안 되던 문제 해결)
- **gotcha/learned 자동 추출** — 핸드오프 시 jsonl 신규 라인을 정제 `.md`로 자동 저장 (검토 없음, secret 자동 마스킹)
- **메모리 항목 형식 강화** — 3 mnemo 템플릿에 명시적 가드: `source:` 한 단어만, `tags:` 최소 3개, 일반 단어 제목 금지, 본문 3줄 이내
- **메모리 위생** — 4개 `memory/*.md` 파일에서 누락된 `source:` 필드 48개 일괄 백필; MEMORY.md 정리 (118→54줄)

### v4.2.0 — Markdown → 출판품질 PDF (2026.05)

- **pdf 스킬** — Markdown → PDF 변환기 (playwright + Chromium), 한국 기본값 (A4 + 25mm + Pretendard)
- **Clio 통합** — Phase 3-4에서 PRD/TECHNICAL/USER-MANUAL.md를 PDF로도 자동 출력
- **표지/TOC/워터마크** — `--cover --toc --title --author --org --watermark "초안" --confidential`

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

- **project-gotchas** — 실수 자동 추적 + 성공 패턴 학습 (분석 에이전트가 메인 세션 모델 상속 — Opus/Sonnet급 품질, Dreaming 동등)
- **2계층 저장** — 글로벌(`memory/gotchas/`) + 프로젝트별(`memory/learned/`)
- **크로스 CLI 관찰** — Claude save-tool-use + Codex/Gemini save-turn 훅 통합
- **CHANGELOG.md** — 버전 히스토리 v1.0.0 ~ v1.8.0

### v1.7.0 — Orchestrator SQLite WAL + Minos Step 5 (2026.03)

- **orchestrator** — state.json → SQLite WAL 전환 (크래시 복구, 동시 접근)
- **minos** — Playwright MCP 실제 브라우저 QA 테스트
- **codemap** — CodeMap 인덱스 (코드베이스 탐색)

### v1.6.0 — 디자인 + 비즈니스 + 스킬 베스트 프랙티스 (2026.03)

- **design-plan (아프로디테)** — 디자인 오케스트레이터 (9 팔레트, 47 폰트 페어링, 84 스타일)
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
| **설계** | `/zephermine` (젭마인) | 26단계 인터뷰 → SPEC.md → 역할 기반 네이티브 검토 |
| **구현** | `/agent-team` / `/poseidon` (포세이돈) | 현재 CLI의 네이티브 작업자로 웨이브 실행 |
| **감리** | `/argos` (아르고스) | 준공검사: 설계 대비 구현 검증 |
| **테스트** | `/minos` (미노스) | Playwright E2E 테스트 + fix-until-pass 루프 |
| **산출물** | `/clio` (클리오) | 흐름도 + PRD + 기술문서 + 사용자 매뉴얼 |
| **전자동** | `/zeus` (제우스) | 7단계: 파싱 → 젭마인 → agent-team/workpm → 아르고스 → Docker → 미노스 → 증거 보고 |

각 스킬은 독립 실행 또는 파이프라인의 일부로 동작합니다. 헤르메스·아테나·클리오는
독립적으로 선택하는 단계이며 제우스의 Phase 0~6 계약에는 포함되지 않습니다.

---

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
- **처리:** 세션과 Claude/Codex/Gemini/Grok을 가로지르는 3계층 메모리; 과거 대화 검색; 컨텍스트 한도 근처에서 자동 핸드오프.
- **결과물:** `MEMORY.md`(인덱스) + `memory/*.md`(의미) + `conversations/*.md`(일화).
- **다음:** —

---

## 크로스 CLI 지원

하나의 원본 라이브러리와 같은 사용자 워크플로우를 유지하되, 기본 설치는 각 CLI 네이티브 능력에 맞춥니다.

| 기능 | Claude Code | Codex CLI | Gemini CLI | Grok Build |
|------|------------|-----------|------------|------------|
| 스킬 | `~/.claude/skills/`에 14개 | `~/.codex/skills/`에 13개 | `~/.gemini/skills/`에 13개 | Claude 호환 계층의 같은 14개 |
| 사용자 정의 에이전트 | 기본 없음(source opt-in 시 `~/.claude/agents/`) | 기본 없음; 활성 정의는 `.toml`만 | 기본 없음(source opt-in 시 `~/.gemini/agents/`) | Olympus 기본 등록 없음 |
| 메모리 (므네모) | save-response 훅 | save-turn 훅 | save-turn 훅 | grok-mnemo 훅 |
| 오답노트/학습 | save-tool-use 훅 | save-turn 훅 | save-turn 훅 | grok-mnemo 훅 |
| 오케스트레이션 | 네이티브 작업자; 선택 MCP | 네이티브 작업자; 선택 MCP | 네이티브 작업자; 선택 MCP | 네이티브 작업자; MCP PM host만 |
| 설치 | 인수 없는 설치기가 자산 준비, `claude`가 있을 때 CLI 명령 실행 | 같은 설치기가 자산 준비, `codex`가 있을 때 MCP 명령 실행 | 같은 설치기가 자산 준비, `gemini`가 있을 때 MCP 명령 실행 | Claude 공유 자산, Grok 홈 존재 시 grok-mnemo 실행 |

크로스 CLI 동기화는 `sync-claude-skills.js`, `sync-codex-assets.js`, `sync-gemini-assets.js`가 처리합니다.
Codex 스킬은 기본적으로 전역에만 설치해 이 저장소의 `.agents/skills`와 중복 탐색되지
않습니다. 격리된 프로젝트 미러 테스트가 필요할 때만
`node scripts/sync-codex-assets.js --include-project-skills`를 사용합니다. 모든 런타임은
기본 거부 allowlist를 사용합니다. 런타임 전체 합집합은 사용자 진입점 하네스 11개와
`agent-team`·`mnemo` 어댑터 6개를 합친 17개입니다. 각 런타임은 호환되지 않는 어댑터
3개 또는 4개를 제외해 Claude 14개, Codex/Gemini/독립 Grok 13개를 활성화하며,
실제 Grok 설치 표면은 Claude의 공유 14개를 읽습니다. allowlist 밖의 같은 82개 공개 소스는 스캔되지 않는 `.olympus/source-skills`에 복사하고
`SKILLS-CATALOG.md`에 source-only와 정확한 경로로 기록합니다. source-only `orchestrator`는 MCP 실행용 비탐색 미러를 `.olympus/runtime-modules/orchestrator`에도 두며, 등록 경로와 의존성 캐시는 그곳에서 유지합니다. source-only 전체 활성화는
`--include-source-only-skills`, 기존 코딩 가이드 8개만 추가 활성화는 `--include-broad-coding-skills`를 사용합니다. source-only는 자연어 요청으로 카탈로그에서 읽을 수 있고, 일부 CLI가 미등록 slash를 모델 전달 전에 거부하므로 네이티브 `/스킬명` 메뉴가 필요할 때는 전체 opt-in을 사용합니다.
이 저장소의 스킬 소스와 이름이 같은 설치 디렉터리는 설치기가 관리하므로 동기화 때 교체·제거될 수 있고, 이름이 다른 로컬 스킬은 보존됩니다. 설치 사본을 직접 수정하지 말고 저장소 원본을 수정하거나 별도 이름을 사용하세요.
네 CLI 런타임 표면 모두 사용자 정의 에이전트 참고 소스 42종을 기본 source-only로 유지합니다. `--include-source-only-agents`는 의도적인 호환성 테스트를 위해 레거시 프롬프트를 복사할 뿐, Markdown을 Codex 활성 에이전트로 만들지는 않습니다. 기존 `--include-passive-agents`와 `--include-broad-coding-agents`는 호환 별칭으로 유지합니다. Codex의 `.agents/agents` 미러는 프로젝트 미러와 source-only opt-in을 함께 지정할 때만 내용이 생깁니다.

에이전트를 쓰던 스킬의 오케스트레이션 절차는 유지하고, 의미 역할만 각 CLI 내장 작업자에 매핑합니다.

| 의미 역할 | Claude | Codex | Gemini | Grok |
|-----------|--------|-------|--------|------|
| 읽기 전용 탐색 | `Explore` | `explorer` | `codebase_investigator` | `explore` |
| 파일 수정·명령 실행 | `general-purpose` / 이름 있는 teammate | `worker` | `generalist` | `general-purpose` |

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

### 스킬 소스 (101개, 기본 합집합 17개, 설치 표면별 활성 13개 또는 14개)

아래 표는 시작 시 레지스트리가 아니라 소스 목록입니다. 저빈도 문서 형식 도구, 서비스 통합, 프레임워크 레시피, 생성기는 명시 호출하거나 opt-in 설치하기 전까지 source-only로 남습니다.

| 카테고리 | 스킬 | 핵심 |
|----------|------|------|
| **AI 도구** | codex, gemini, orchestrator, workpm, agent-team + 5개 | 멀티 AI 오케스트레이션, PM-Worker 패턴 |
| **파이프라인** | zephermine, zeus, argos, minos, closer, shipping-and-launch | 제로 인터랙션 풀 파이프라인, 출시 체크리스트 |
| **프론트엔드** | react-dev, frontend-design, theme-factory, stitch, seo-audit, ui-ux-auditor, data-visualization + 5개 | 9 팔레트, 47 폰트 페어링, 84 스타일, 테마 14종(한글 4종), SEO+AEO+GEO 감사, 차트 선택 가이드 |
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

기본 `workpm`은 현재 CLI의 네이티브 작업자에게 일을 배분합니다. hard file lock, 외부 태스크 보드, Claude + Codex + Gemini 혼합 실행이 필요할 때만 MCP 정책 레이어를 사용합니다.

```
기본:              /workpm → 분석 → 네이티브 작업자 → 검증

선택 MCP 모드:
터미널 1 (PM):     /daedalus --mcp → provider-aware 작업 생성
터미널 2 (Claude): /pmworker → Claude/공용 작업 클레임 → 완료
터미널 3 (Codex):  /pmworker → Codex/공용 작업 클레임 → 완료
터미널 4 (Gemini): /pmworker → Gemini/공용 작업 클레임 → 완료
```

| 구성 요소 | 설명 |
|-----------|------|
| **workpm** | 현재 CLI의 네이티브 작업자를 쓰는 기본 PM 엔트리포인트 |
| **Orchestrator MCP** | 선택형 SQLite WAL 작업 큐, provider 라우팅, 파일 락, 의존성 해결 |
| **pmworker** | 명시적 MCP 모드 Worker 엔트리포인트 (Claude/Codex/Gemini) |

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
| **[v5.1.0](https://github.com/Dannykkh/skill-olympus/releases/tag/v5.1.0)** | **2026-08-17** | **아프로디테 근거 게이트 + 브라우저 모션 계약 + 영상 엔진 분리** — exact selector 기반 Product Design 1회 추천과 `UNKNOWN` 로컬 폴백; 동일 계약 adapter 대조; 사실·콘텐츠·자산 출처 기록; 실시간 웹 UI의 CSS 우선 GSAP 승격; 별도 `video-maker`에서 Remotion 또는 HyperFrames 엔진 하나 선택 + 런타임·라이선스·렌더 QA 게이트 |
| **[v5.0.0](https://github.com/Dannykkh/skill-olympus/releases/tag/v5.0.0)** | **2026-08-13** | **진입점 전용 레지스트리 + 네이티브 에이전트 기본값 + 공급자 안전 라우팅** — 공개 추적 스킬 소스 99개를 allowlist 진입점·어댑터 17개와 직접 읽는 source-only 모듈 82개로 분리(`deploymonitor`는 내부 전용); 활성 표면은 Claude/공유 Grok 14개, Codex/Gemini 13개; Olympus 사용자 정의 에이전트 등록은 기본 0개이며 의미 기반 네이티브 역할·Main 소유 상태·순차 폴백으로 분업; 공급자별 비호환 런타임 어댑터 제외; 인수 없는 설치는 네 CLI 전체를 대상으로 실행 파일 없이도 자산을 준비하고 CLI 전용 명령만 건너뛰며, 같은 이름의 수정본은 수동 충돌 복구용으로 보존 |
| **[v4.21.0](https://github.com/Dannykkh/skill-olympus/releases/tag/v4.21.0)** | **2026-08-10** | **아프로디테 경험 주도 재설계 + Stitch 실행 어댑터화 + 제우스 스코프 게이트** — design-plan 파이프라인: 소스 라우팅 → 벤치마크 해부(Adopt/Adapt/Avoid) → 실제 렌더 3안 → Experience Contract(과업·메시지·CTA·신뢰·모바일 변환, 검증 스크립트 강제) → 구현 → 렌더 UX/접근성/성능 게이트 → 학습 핸드오프; Stitch는 방향을 발명하지 않고 아프로디테 결정을 Stitch MCP 작업으로 컴파일(작업 계약·상태·전송 패턴은 google-labs-code/stitch-skills 선별 반영); 제우스는 계획 외 태스크·기능·의존성 추가 전 pass/reduce/hold 판정을 결정 장부에 기록, hold는 Deferred로 표시 (hosioobo/track 흡수) |
| **[v4.20.2](https://github.com/Dannykkh/skill-olympus/releases/tag/v4.20.2)** | **2026-08-08** | **테미스 지침 핀 + 런타임 신선도 체크** (v4.20.1~v4.20.2) — 한국판 초안을 개인정보위 작성지침(2025.4.)에 고정하고 생성 시 게시판 확인으로 개정판 감지·채택(사용자 고지, 웹 도구 없으면 기준판 폴백); ko 템플릿 2025.4. 정렬(고충 처리 부서·행태정보·아동 제22조의2); 조문 인용은 law.go.kr 직접 조회 검증 — 법령 MCP 의존은 불필요해 제거 |
| **[v4.20.0](https://github.com/Dannykkh/skill-olympus/releases/tag/v4.20.0)** | **2026-08-08** | **테미스 개인정보처리방침 생성 + mnemo opt-out** — 100번째 스킬 테미스: 개인정보 수집/저장/외부전송/삭제 전수 감사(함정 체크리스트: soft delete·append-only 로그·마스킹 커버리지·자동 아웃바운드·`git ls-files` 실측) + 코드로 알 수 없는 14문항 운영자 인터뷰(보호책임자·보유기간·아동·서버 리전…) + 국가별 초안(개인정보보호법 제30조/CCPA·CPRA/GDPR Art.13)을 file:line 근거만으로 생성 — 빈칸은 날조하지 않음. 이 레포 도그푸딩(초안 3종 동봉). 감사가 드러낸 "끌 수 없는 저장 훅" 갭 → `MNEMO_DISABLE`(4-CLI 훅 15개 진입점) + `OLYMPUS_UPDATE_CHECK_DISABLE`, 켬·끔 대조 실행 검증 |
| **[v4.19.0](https://github.com/Dannykkh/skill-olympus/releases/tag/v4.19.0)** | **2026-08-05** | **Native-First 대전환** — 아프로디테 간섭 실험(실질 결함 B1≪C20≈A25)으로 실증된 "엔진은 상류에, 확장은 로컬에" 원칙 전면 적용: frontend-design 포크 자동호출 양보 + impeccable 59 결정론 규칙 PostToolUse 검출 훅(exit 0 평문 stdout이 모델에 전달되지 않는 결함 발견 — `additionalContext` JSON으로 수정); 포세이돈·다이달로스를 4-CLI 네이티브 멀티에이전트(Claude Agent Teams / Codex spawn_agent / Gemini 서브에이전트 / Grok spawn_subagent)로 위임하고 orchestrator MCP는 hard lock 정책 레이어 + 구버전 폴백으로 재포지셔닝; zeus ultracode 한정 Workflow fan-out 분기; chronos Gemini AfterAgent 배선 정정 + 폐기 /loop 도움말 잔재 제거; argos Phase 1 일반 품질 층 네이티브 리뷰 위임(spec 감리는 고유 영역); humanizer 업스트림 재동기화(blader v2.9.1 + im-not-ai v2.3); Gemini 경로는 문서 근거 설계·실측 대기 |
| **[v4.15.0](https://github.com/Dannykkh/skill-olympus/releases/tag/v4.15.0)** | **2026-07-25** | **Grok Build 지원: grok-mnemo 어댑터** — `grok inspect --json` 실측으로 Grok이 `[compat.claude]` 기본값으로 `~/.claude/` skills/agents/MCP/rules를 직접 읽음을 확인(sync 스크립트 불필요); 유일한 parity 갭인 mnemo 자동 저장을 UserPromptSubmit+Stop 어댑터로 해소(`<user_query>` 래퍼 스트립, `end_turn`만 저장, `lastAssistantMessage` 직접 저장, `conversations/*-grok.md`); Claude mnemo 훅 5쌍에 `GROK_HOOK_EVENT` 가드로 이중/오분류 저장 차단; installer 테스트의 `NoDefaultCurrentDirectoryInExePath=1` 환경 실패 수정(절대경로 + `windowsVerbatimArguments`); 신규 gotcha: 한글 주석 `.ps1`은 UTF-8 BOM 필수(PS 5.1 CP949 오해석이 코드 줄을 주석에 병합); 실제 `grok -p` headless 세션으로 검증 |
| **[v4.14.0](https://github.com/Dannykkh/skill-olympus/releases/tag/v4.14.0)** | **2026-07-22** | **레이아웃 블록 해부 · 질감 레시피 · 프롬프트 소비 게이트** — bag-ui(MIT) 블록 와이어프레임 카탈로그를 구조 계약 30종으로 번역해 design-plan Phase 2.5로 배선; Phase 3에 DESIGN.md 산문 계약 + `docs/design-refs/` 슈퍼프롬프트 필수 Read 게이트 신설(생산은 됐지만 강제 소비가 안 되던 문제); `technique-recipes.md` §11로 그레인/메시/강조 이탈/지속 비대칭의 검증된 값 제공(기존엔 "atmosphere 만들라"는 지시만 있고 구현 값이 없어 증발); 이 프로젝트 자체 랜딩 페이지를 끝까지 배포해 세 갭을 전부 발견·수정(한글 웹폰트 `document.fonts` false-negative, 모바일 CSS 셀렉터 버그 포함) |
| **[v4.13.0](https://github.com/Dannykkh/skill-olympus/releases/tag/v4.13.0)** | **2026-07-10** | **데이터 시각화 스킬 (Anthropic 공식 벤더링)** — 데이터 관계별 차트 선택 가이드(추세/비교/순위/분포/상관/흐름), 차트 안티패턴(파이 6개 초과 금지, 3D 금지, 이중축 주의), Python(matplotlib/seaborn/plotly) 코드 패턴, 디자인 원칙, 접근성 체크리스트; Apache-2.0 출처 명기, `/data-visualization` 호출 가능, design-plan/mermaid-diagrams와 역할 분담 문서화; 96 → 97개 스킬 3-CLI 배포 |
| [v4.12.2](https://github.com/Dannykkh/skill-olympus/releases/tag/v4.12.2) | 2026-07-10 | **비-git 프로젝트 루트 가드** — git 루트가 없으면 상위로 걸어 올라가며 기존 mnemo 마커(`MEMORY.md`/`conversations/`, HOME 제외)를 찾고, 없으면 빌드 출력 세그먼트(bin/obj/dist 등) 앞에서 절단; `bin\Debug`·앱 데이터 폴더로 대화/메모리가 흩어지던 문제 차단; 12개 파일(Claude 훅 4종 + codex/gemini save-turn, ps1+sh) |
| [v4.12.1](https://github.com/Dannykkh/skill-olympus/releases/tag/v4.12.1) | 2026-07-10 | **훅 stdin 워치독 fail-open** — "UserPromptSubmit hook timed out after 60s"(활성 턴 중 제출 시 stdin 기아) 수정: 15초 bounded read + 조용한 종료, PS 5.1 `[Console]::In` 동기 블로킹 우회(OpenStandardInput+StreamReader), 워치독 초과 시 즉시 종료 규칙(미완료 read + native 스폰 = 행, 실측 재현), chronos continue-loop payload argv 우선 재정렬, codex/gemini save-turn HOME git-root 가드 |
| **[v4.12.0](https://github.com/Dannykkh/skill-olympus/releases/tag/v4.12.0)** | **2026-07-09** | **스타일 레시피 · 레퍼런스 자산화 · 크로노스 심장박동** — 스타일 레시피 12종(hex+한·영 폰트 스택 바인딩, WCAG 계산 검증) + 테크닉 레시피 9종(그림자/blur/보더/리빌/GSAP+Lenis) + Phase 2 레퍼런스 자산화(섹션 해부 슈퍼프롬프트); 크로노스 1.5순위 heartbeat 엔진(`--heartbeat`, 네이티브 /loop 인터벌 재진입) + 점수형 완료 조건 명문화; editorial-tech 샘플 실측 검증 + gotcha 045(fonts.check 서브셋 false-negative) 보정 |
| **[v4.11.0](https://github.com/Dannykkh/skill-olympus/releases/tag/v4.11.0)** | **2026-07-05** | **Unknowns-first 계획 · 가벼워진 젭마인 흐름 · 구현 학습 루프** — 젭마인이 리서치를 자동 선택해 `research-decision.md`를 남기고, 인터뷰 전에 `unknowns.md`를 작성하며, 아키텍처를 바꾸는 blocker만 질문하고 나머지는 추론 전제로 진행; domain-dictionary는 저위험 용어를 자동 시드/병합하고 핵심 충돌에서만 질문; workpm/agent-team은 `implementation-notes.md` Deviations를 남기고, Clio는 `CHANGE-QUIZ.md`, frontend-design은 분기 프로토타입으로 unknown knowns를 구현 전에 드러냄 |
| **[v4.10.0](https://github.com/Dannykkh/skill-olympus/releases/tag/v4.10.0)** | **2026-07-01** | **DESIGN.md 정본 · 한글 폰트 실제 로드 가드레일 · 훅 타임아웃/스키마 수정** — 구글 `@google/design.md` 포맷을 아프로디테 정본으로 채택(design-md-guide 신규, 팔레트 고정으로 드리프트 방지, 3-CLI always-on "DESIGN.md 먼저 읽기"); 한글 폰트 실제 로드(@import + `document.fonts.check`, 한글 전용 페어링 우선으로 시스템 폴백 회피, gotcha 041); 다크/라이트 규칙(컨테이너 `div` 배경 · 텍스트 반전 · `<select>` `color-scheme`); 훅 30초 타임아웃 방지(생성기 4곳 60초 + `-NoProfile`); AskUserQuestion 스키마 수정(옵션 4개 · header 12자) |
| **[v4.9.0](https://github.com/Dannykkh/skill-olympus/releases/tag/v4.9.0)** | **2026-06-25** | **Always-on 디자인 가드레일 · 구현 전 조회 · 핸드오프 Feature Map** — 안티-슬롭 디자인 지침을 3-CLI always-on에 주입(frontend-design `auto_apply`는 no-op이었음), 2026 웹 플랫폼 갱신(네이티브 `animation-timeline` 우선, View Transitions, 컨테이너 쿼리, `:has()`, OKLCH) + 한·영 글꼴 페어링, 압축 ~24%, 3방향 브라우저 검증; 구현 전 조회 가드(codemap 먼저 → 핸드오프 → grep → 분류, 인접 파이프라인 대조); 핸드오프 Feature/Flow/Decision Snapshot + Menu/Screen Map; **harness-engineering** 경계면 정합성 교차비교(agent-team·chronos, build-pass≠correct) + **loop-engineering** 도구 근거 FIND(chronos); 호환성 감사(Pydantic v2, Next.js 15, MySQL 8.4, docker compose v2, MUI v7, OpenAPI 3.1, Tailwind v4) |
| **[v4.8.7](https://github.com/Dannykkh/skill-olympus/releases/tag/v4.8.7)** | **2026-06-23** | **루프 정직성 (028/034)** — 완료 계약(요구사항→증거 4상태 채점, 소진≠성공)을 크로노스·제우스·minos·autoresearch·argos·agent-team·workpm에 적용; 교차모델 독립 검증(autoresearch 챔피언 재채점, 제우스 argos 위험 트리거 한정 — 결정론적 게이트 우선, 다른 모델은 백그라운드); 훅 레벨 `EXHAUSTED` 표면화 + 마지막 턴 정직 보고 경고(loop-stop·continue-loop ps1/sh, dry-run ps1 5/5); 헤르메스 TAM/SAM/SOM 출처 병기 grounding 가드 |
| **[v4.8.1](https://github.com/Dannykkh/skill-olympus/releases/tag/v4.8.1)** | **2026-06-14** | **mnemo 루트 결정 수정** — 비-git 프로젝트에서 하위 폴더로 `cd` 해도 `conversations/`·`memory/`가 하위 폴더가 아닌 프로젝트 루트에 저장; 2-pass 루트 결정(git 루트 우선, 없으면 세션 시작 cwd) + HOME-git 가드; 8개 훅(ps1·sh)·설치본 적용, PS 7/7 · SH 7/7 |
| **[v4.8.0](https://github.com/Dannykkh/skill-olympus/releases/tag/v4.8.0)** | **2026-06-13** | **루프 프로그래밍: 주차, 브리프, 재진입** — 크로노스 주차 규칙(사유 없는 막힘 선언은 회피로 처리) + Owner Decision Brief(추천안과 선택지를 함께 넘기는 결재 브리프) + 재진입 규약(로그가 기억보다 우선, 새 세션도 감사 로그로 재개) + 주차만 남은 큐의 데드락 가드(거짓 `<promise>` 종료 차단, ps1 4/4 테스트, 여러 줄 매칭 보강) + 제우스 결정 장부(근거, 기각한 대안, 되돌리는 법) + codex-mnemo notify 판정 순서 수정(save-turn 체인 래퍼 보존) |
| **[v4.7.1](https://github.com/Dannykkh/skill-olympus/releases/tag/v4.7.1)** | **2026-06-11** | **아프로디테 시각 검증 + 클리오 게이트 강화** — ui-ux-auditor가 스크린샷을 직접 관찰해 채점(관찰>Grep, 결함 4종 스모크 테스트 4/4 검출 실증); clio v2.1.1 판정식 보완(minos 반영, 공허한 GO 차단, 우회 표기); 아프로디테 구현 범위 외관 한정 명시 |
| **[v4.7.0](https://github.com/Dannykkh/skill-olympus/releases/tag/v4.7.0)** | **2026-06-11** | **네이티브 하니스 결합** — code-reviewer v4 (엔진 위임: Claude /code-review · Codex `codex review --base`, 정책 레이어 P1~P5 — Scope Drift/Fix-First/도메인 체크리스트, Gemini 풀 경로 폴백); 크로노스 구 별칭 `/loop` 폐기(네이티브 /loop 이름 충돌) + goal/loop/chronos 비교표; 감사 후속(제우스 /goal 관계 + 이중 Stop 게이트 가드, agent-team env var 구버전 강등, 프로젝트 루트 메모리 vs 네이티브 auto-memory 경계 4파일, orchestrator 네이티브/MCP 선택 기준표, 크로노스 `--flow-verify` 수신 정의); clio v2.1.0 humanizer 한국어 윤문 연동; 젭마인 vs 네이티브 plan mode 구분 |
| **[v4.6.0](https://github.com/Dannykkh/skill-olympus/releases/tag/v4.6.0)** | **2026-06-10** | **휴머나이저 한국어 윤문 모듈** — 10분류(A~J) 67 번역투 패턴, 정량 1차 스캔(연결어미 뒤 쉼표 4.84배 신호), 장르 가드레일, S1/S2/S3 심각도, 절차적 과잉편집 가드(do-not 마스킹, 변경률 롤백); im-not-ai v2.0 분류 흡수; 3-CLI 배포 |
| **[v4.5.0](https://github.com/Dannykkh/skill-olympus/releases/tag/v4.5.0)** | **2026-06-05** | **크로노스 × 네이티브 /goal 통합** — /goal 래퍼로 재정의(goal=지속성, 크로노스=검증 게이트/우선순위/로그); 목표문 생성 모델(자동 호출 없음 — 목표문 생성, 사용자가 /goal 한 번 설정); 3계층 폴백(goal → 훅/notify → 직접)으로 Gemini parity; 하드 가드 `setup-loop --goal-mode`가 loop-state 제거해 훅 충돌을 코드 레벨에서 차단(.ps1/.sh 테스트); Codex vs Claude 판정 차이 문서화 |
| **[v4.4.2](https://github.com/Dannykkh/skill-olympus/releases/tag/v4.4.2)** | **2026-05-30** | **Chronos 강화 + 크로스-CLI parity** — done-pattern 오탐 제거(`Chronos Complete` + `<promise>`만 종료); tail-500 가드 제거(전체 출력 마커 검사); Gemini state-path 버그 수정(3-경로 탐색 `.claude/.codex/.chronos`); Mnemo/save-turn 알림 fanout 제거; Claude에서 5회 재투입 스트레스 테스트 |
| [v4.4.1](https://github.com/Dannykkh/skill-olympus/releases/tag/v4.4.1) | 2026-05-11 | **mnemo 점검 패치** — Stop/save-turn `notify_mnemo_status` 훅 (`memory/.mnemo-status.md` + stderr, LLM 호출 X로 사용자 인지); SKILL.md/config.json을 실제 설계와 일치(자동분석기 없음); `list_handoffs.py`가 `YYYY-MM-DD-{slug}` 파일명 파싱; `check_staleness.py --all` 일괄 모드; Codex EXCLUDE에 `gemini-mnemo` 추가 |
| [v4.4.0](https://github.com/Dannykkh/skill-olympus/releases/tag/v4.4.0) | 2026-05-08 | **/memory-distill + Dreaming 동등 자기개선** — 신규 사용자 트리거 스킬 (`--scan`/`--apply`/`--rebuild` 모드, 중복 병합, SUPERSEDED 모순 처리, 아카이브 백업); gotcha-analyzer cleanup-low → 메인 세션 모델 상속 (Opus/GPT-5.5/3.1-Pro 분석 품질); 임계값 20→50 (안전망 격하); 다층 정제 트리거 |
| [v4.3.0](https://github.com/Dannykkh/skill-olympus/releases/tag/v4.3.0) | 2026-05-05 | **므네모 메모리 정합성 점검** — 핸드오프 docs/handoffs/로 이전(크로스 CLI 공유); 핸드오프 시 gotcha/learned 자동 추출(검토 없음, secret 마스킹); 항목 형식 강화(source/tags/제목/길이); source 필드 48개 백필; 3 CLI parity 검증 |
| [v4.2.0](https://github.com/Dannykkh/skill-olympus/releases/tag/v4.2.0) | 2026-05-04 | Markdown → 출판품질 PDF — pdf 스킬에 변환기 추가(playwright + Pretendard), 한국 기본값(A4 + 25mm), Clio Phase 3-4 자동 통합 |
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

**마지막 업데이트:** 2026-08-13
