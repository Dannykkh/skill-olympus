# Privacy Policy (Draft — United States)

> **Basis**: CCPA/CPRA (California Consumer Privacy Act, as amended) disclosure conventions + FTC fair-practice norms. The U.S. has no single federal privacy statute; state laws (California, Virginia, Colorado, Connecticut, Utah, etc.) may apply depending on reach.
> **Method**: Grounded ONLY in the {{audit date}} full-code audit. Nothing invented; missing items are marked `[FILL IN: ...]`, legal judgments `[VERIFY]`.
> **Note**: This is a draft, not legal advice. Have counsel review before publishing.

---

**{{PROGRAM NAME}}** ("the Program") <!-- 서비스 유형 분기: 로컬 도구면 "runs entirely on your device; the developer operates no servers" 명시, 서버형이면 수집 주체 기술 -->

## 1. Information We Collect

<!-- 감사 표 매핑: category / details / storage location -->

| Category | Details | Where it is stored |
|---|---|---|
| {{category}} | {{details}} | {{location}} |

**We do NOT collect** (verified by full-code audit): {{미수집 항목 — 감사에서 부재 확인된 것만}}

### CCPA category mapping (Cal. Civ. Code § 1798.140(v))

<!-- 각 법정 카테고리에 Yes/No + 근거. 애매한 것(예: 패턴 추출이 inferences인지)은 [VERIFY] -->

| CCPA category | Collected? |
|---|---|
| Identifiers (name, email, IP, etc.) | {{Yes/No + 근거}} |
| Internet or other electronic network activity | {{...}} |
| Geolocation data | {{...}} |
| Commercial information / payment | {{...}} |
| Biometric / audio / visual | {{...}} |
| Inferences drawn to build a profile | {{... 또는 [VERIFY]}} |

## 2. How We Use Information

- {{감사에서 확인된 목적만 나열}}

## 3. When Information Leaves Your Device / Our Systems

| Recipient | What is sent | When |
|---|---|---|
| {{vendor}} | {{data}} | {{trigger — 자동이면 "Automatically"를 명시}} |

[FILL IN: link each vendor's privacy policy.]

## 4. Sale and Sharing of Personal Information

<!-- 감사에서 판매/광고 공유 코드가 없으면 아래 유지, 있으면 "Do Not Sell or Share" 링크 의무 검토 -->
- We do **not sell** personal information. We do **not share** it for cross-context behavioral advertising. `[VERIFY with counsel once the distribution model is final.]`

## 5. Your Privacy Rights

- **Access/Know**: {{방법}}
- **Correct**: {{방법}}
- **Delete**: {{방법 — 탈퇴가 soft delete면 그 사실 명시}}
- **Stop collection (opt-out)**: {{실존하는 opt-out 수단, 없으면 구현 선행 과제로}}
- We will not discriminate against you for exercising any privacy right.
- [FILL IN: contact channel for rights requests.]

## 6. Data Retention

- {{실제 보존 동작}}
- [FILL IN: retention policy statement.]

## 7. Children's Privacy

- {{대상 연령 실태}} `[VERIFY: COPPA position with counsel.]`

## 8. Security

- {{저장 형태(암호화 여부), 코드로 확인된 보호 장치만 나열}}

## 9. Changes to This Policy

- Effective date: [FILL IN]
- Material changes announced via [FILL IN] before taking effect.

## 10. Contact

- [FILL IN: entity/name and contact for privacy inquiries.]

---

## 부록: 확정 전 채워야 할 항목 (한국어 체크리스트)

<!-- CCPA 적용 문턱(연매출 $25M 등) 해당 여부는 항상 [확인 필요]로 포함 -->

| # | 항목 | 상태 |
|---|---|---|
| 1 | CCPA 적용 대상 여부 (연매출 $25M 등 문턱) | [확인 필요: 법률 검토] |
| 2 | {{...}} | {{...}} |
