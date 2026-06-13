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

**Claude Code**, **Codex CLI**, **Gemini CLI**를 위한 프로덕션 에이전트 하네스이자 **루프 엔지니어링 스택** ―
12명의 올림포스 신의 이름으로, 3개월간 매일 실전 프로덕트를 만들며 다듬어졌습니다.

```bash
/zeus "쇼핑몰 만들어줘. React + Spring Boot + PostgreSQL"
```

한 줄. 열두 신. 설계 → 구현 → 감리 → 테스트 → 출항.
**질문 없이. 청사진 없이. 인간의 손길 없이.**

> **루프 엔지니어링 시대의 설계.** 에이전트는 프롬프트 한 번이 아니라 act → observe → verify를
> **객관적으로 검증 가능한 완료 기준**까지 반복하는 루프로 움직입니다. 올림푸스는 처음부터 그렇게
> 지어졌습니다 — 크로노스(실제 테스트 실행 검증 게이트), 미노스(fix-until-pass), 아르고스(AC 대조),
> 클리오(GO/NO-GO). v4.7.0부터 이 루프들은 CLI 네이티브 기능(`/goal` Stop 게이트, `/code-review`,
> Agent Teams) 위에서 돕니다 — 하네스는 기반, 루프는 운영 모델.
> 그리고 v4.8.0부터 루프는 **계속 도는 법**을 압니다: 루프는 의지가 아니라 구조로 유지됩니다 —
> 심장박동은 기계에, 상태는 감사 로그에, 막힌 이슈는 결재 가능한 브리프와 함께 주차,
> 거짓 완료 선언은 훅 레벨에서 거부.

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

**96개 스킬 · 42개 에이전트 · 9개 훅 · 3개 CLI · 1개 신화**

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

끝입니다. **96개 스킬, 42개 에이전트, 9개 훅**이 Claude Code + Codex CLI + Gemini CLI에 설치됩니다.

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

- **code-reviewer v4 — 엔진 위임 + 정책 레이어** — 일반 리뷰는 네이티브 엔진(Claude `/code-review`, Codex `codex review --base`)에 위임하고, 스킬은 네이티브가 못 하는 것만 담당: Scope Drift 감지, 도메인 체크리스트(LLM 출력 신뢰 경계, Enum 완전성), Fix-First 분류, 통합 보고서. Gemini는 풀 경로(2-Pass + Specialist) 폴백. `/code-review ultra`(과금)는 호출·권유 모두 금지
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
| **메모리** | mnemo, memory-compact, project-gotchas, memory-distill | 3계층 메모리, 자동 학습, raw 정제(rebuild) |
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

**마지막 업데이트:** 2026-06-13
