# Privacy Notice (Draft — European Union / GDPR)

> **Basis**: Regulation (EU) 2016/679 (GDPR), structured around the Article 13/14 transparency requirements.
> **Method**: Grounded ONLY in the {{audit date}} full-code audit. Missing items are `[FILL IN: ...]`, legal judgments `[VERIFY]`.
> **Note**: This is a draft, not legal advice. Have counsel review before publishing.

---

**{{PROGRAM NAME}}** ("the Program") <!-- 서비스 유형 분기 문장 -->

## 0. Preliminary point: who is the controller?

<!-- 로컬 도구라면 controller 해당 여부 자체가 쟁점 (Art. 4, 가계 예외 Art. 2(2)(c)) — 이 판단이
     문서 전체의 법적 성격을 결정하므로 맨 앞에 [VERIFY]로 명시. 서버형이면 controller 정보 기술 -->
- Controller (if applicable): [FILL IN: name/entity, address, contact email]
- Data Protection Officer: {{선임 여부 실태}} `[VERIFY: Art. 37 필요 여부]`

## 1. What data is processed, and where

| Data | Details | Location |
|---|---|---|
| {{data}} | {{details}} | {{location}} |

**Not processed** (verified by full-code audit): {{미수집 항목}}. Art. 9 special categories: {{실태}}.

<!-- 자유 입력 필드가 있으면: 사용자가 입력한 텍스트에 개인정보가 우발적으로 포함될 수 있음 + 마스킹 수단과 그 커버리지 한계 명시 -->

## 2. Purposes and legal bases (Art. 6)

| Purpose | Legal basis (if GDPR applies) |
|---|---|
| {{purpose}} | [FILL IN: consent Art. 6(1)(a) or legitimate interest Art. 6(1)(f)] |

<!-- 동의를 근거로 쓰려면: 자유롭게 철회 가능해야 함. opt-out 수단이 없으면 구현 선행.
     기본값이 수집 ON(opt-out 방식)이면 opt-in 요건 미충족 소지 — [VERIFY]로 명시 -->

## 3. Recipients and international transfers (Arts. 13(1)(e)-(f), Chapter V)

| Recipient | What is sent | When | Transfer safeguard |
|---|---|---|---|
| {{vendor (country)}} | {{data}} | {{trigger}} | [FILL IN: EU-US DPF certification / SCCs] |

## 4. Retention (Art. 5(1)(e))

- {{실제 보존 동작 — 무기한이면 저장 제한 원칙과의 충돌 소지를 [VERIFY]로}}
- [FILL IN: chosen retention statement]

## 5. Your rights (Arts. 15-21)

- **Access / Portability**: {{방법}}
- **Rectification**: {{방법}}
- **Erasure**: {{방법 — 탈퇴/언인스톨이 데이터를 안 지우면 그 사실 명시}}
- **Objection / Restriction**: {{방법}}
- **Withdraw consent**: {{방법}}
- **Complaint**: you may lodge a complaint with your national supervisory authority (Art. 77). List: https://edpb.europa.eu/about-edpb/about-edpb/members_en
- Requests: [FILL IN: contact channel]

## 6. Automated decision-making (Art. 22)

- {{실태 — 법적 효과를 내는 자동화 결정이 없으면 없다고 기술}} `[VERIFY]`

## 7. Security (Art. 32)

- {{저장 형태와 코드로 확인된 보호 장치만}}

## 8. Changes to this notice

- Effective date: [FILL IN]
- Material changes announced via [FILL IN].

---

## 부록: 확정 전 채워야 할 항목 (한국어 체크리스트)

<!-- GDPR 적용 대상 여부(로컬 도구의 controller 쟁점 포함)는 항상 1번 항목으로 -->

| # | 항목 | 상태 |
|---|---|---|
| 1 | GDPR 적용 대상 여부 (controller 해당성, 가계 예외) | [확인 필요: 법률 검토] |
| 2 | {{...}} | {{...}} |
