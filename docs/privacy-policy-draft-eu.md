# Privacy Notice (Draft — European Union / GDPR)

> **Basis**: Regulation (EU) 2016/679 (GDPR), structured around the Article 13/14 transparency requirements.
> **Method**: Grounded ONLY in the 2026-08-08 full-code audit of this repository. Nothing invented; missing items are marked `[FILL IN: ...]`, legal judgments are marked `[VERIFY]`.
> **Note**: This is a draft, not legal advice. Have counsel review before publishing.

---

**Skill Olympus** ("the Program") is a CLI extension toolkit that runs entirely on your local machine. **The developer operates no servers and never receives, accesses, or stores your data.** All recording described below happens on your own device.

## 0. Preliminary point: who is the controller?

Because the Program processes data only on your device and the developer never receives it, it is arguable that **the developer is not a "controller" or "processor" under Art. 4 GDPR at all**, and that your own local use falls outside GDPR scope or under the household exemption (Art. 2(2)(c)). `[VERIFY: this threshold question determines whether a GDPR notice is legally required; this draft is written as a good-practice transparency notice either way.]`

- Controller (if applicable): [FILL IN: name/entity, address, contact email]
- Data Protection Officer: likely not required under Art. 37 for a local developer tool `[VERIFY]`. Contact if appointed: [FILL IN]

## 1. What data is processed, and where

The Program's hooks automatically record the following **to your local disk only**:

| Data | Details | Location (on your device) |
|---|---|---|
| Conversation content | Your full prompts and full AI responses, every turn | `<project>/conversations/*.md` |
| Tool usage logs | First 80 characters of shell commands, file paths, fetched URLs, web search queries, tool inputs/outputs (up to 3,000 chars each), session IDs, timestamps | `<project>/conversations/*-toollog.md`, `<project>/memory/{gotchas,learned}/observations.jsonl` |
| Workspace metadata | Git branch, recent commits, modified file lists, absolute project paths | `<project>/docs/handoffs/*.md` |
| Orchestration records | Task prompts, activity logs, worker IDs | `<project>/.orchestrator/orchestrator.db` |
| Integration settings | GitHub username, Jira project key, Slack channel name (entered by you) | skill-local `config.json` |

**Not processed** (verified by full-code audit): name, email address, phone number, photos, precise geolocation, government identifiers, payment data, biometric data, special categories of data under Art. 9, device/hardware identifiers. There is **no telemetry or analytics**.

Note: free-text conversation content *may incidentally contain* personal data you choose to type. The `<private>...</private>` tag masks such passages in conversation logs (replaced with `[PRIVATE]`), but this masking does **not** extend to the tool-usage observation logs.

## 2. Purposes and legal bases (Art. 6)

| Purpose | Legal basis (if GDPR applies) |
|---|---|
| Long-term memory: searching past conversations, restoring context across sessions | [FILL IN: consent Art. 6(1)(a) or legitimate interest Art. 6(1)(f) — see caveat below] |
| Extraction of mistake patterns (gotchas) and success patterns (learned) | same as above |
| Session handoff documents | same as above |
| Automatic version check at session start | [FILL IN: legitimate interest Art. 6(1)(f) — keeping software up to date] `[VERIFY]` |

**Caveat on consent**: recording hooks are installed unconditionally (`MANDATORY_HOOKS` ignores component selection), but a disable flag now exists (implemented 2026-08-08): setting `MNEMO_DISABLE=1` stops all automatic recording, satisfying the withdrawability requirement. Note, however, that recording is still **enabled by default (opt-out)**, which typically does not satisfy GDPR consent's opt-in requirement — `[VERIFY: counsel should assess whether legitimate interest (Art. 6(1)(f)) is the sounder basis, or whether an install-time opt-in prompt is needed for consent.]`

## 3. Recipients and international transfers (Arts. 13(1)(e)-(f), Chapter V)

Data leaves your device only in these cases:

| Recipient | What is sent | When | Transfer safeguard |
|---|---|---|---|
| Anthropic (US) | Prompts, task instructions, target code | Only when you invoke Claude CLI features | [FILL IN: EU-US Data Privacy Framework certification status / SCCs — check vendor] |
| OpenAI (US) | Prompts, task instructions, target code; chronos auto-resume re-sends your original task text | Only when you invoke Codex features | [FILL IN: same] |
| Google (US) | Prompts, task instructions, target code | Only when you invoke Gemini features | [FILL IN: same] |
| GitHub (US) | No user data in the request body; your IP address is inherently visible | **Automatically at every session start** (version check; disable with `OLYMPUS_UPDATE_CHECK_DISABLE=1`) | [FILL IN] |
| Reddit / YouTube (US) | Search keywords / video URL requests | Only when you explicitly run those skills | [FILL IN] |

No other recipients exist. The developer receives nothing.

## 4. Retention (Art. 5(1)(e), Art. 13(2)(a))

- There is currently **no automatic retention limit**: files persist until you delete them, and observation logs over 10 MB are moved to an `archive/` folder rather than deleted.
- `[VERIFY: indefinite default retention sits uneasily with the storage-limitation principle if GDPR applies; either state "retained until the user deletes it" as the policy, or implement automatic purge.]`
- [FILL IN: chosen retention statement]

## 5. Your rights (Arts. 15-21)

If GDPR applies, you have the rights of access, rectification, erasure, restriction, data portability, and objection. Because all data resides on your own device in open formats (Markdown/JSONL/SQLite), you can exercise them directly and immediately:

- **Access / Portability**: open or copy the files listed in §1 (already in machine-readable formats).
- **Rectification**: edit those files.
- **Erasure**: delete `conversations/`, `memory/`, `docs/handoffs/`, `docs/chronos/`, `.orchestrator/` (or run `orchestrator_reset` for the task database). Uninstalling (`install.bat --uninstall`) stops future recording but does **not** delete already-saved data.
- **Objection / Restriction**: set the environment variable `MNEMO_DISABLE=1` — all automatic recording stops immediately (or uninstall the hooks entirely).
- **Withdraw consent**: set `MNEMO_DISABLE=1`; already-saved files remain until you delete them (see Erasure above).
- **Complaint**: you may lodge a complaint with your national supervisory authority (Art. 77). List: https://edpb.europa.eu/about-edpb/about-edpb/members_en
- Requests to the developer: [FILL IN: contact channel]

## 6. Automated decision-making (Art. 22)

The Program performs no automated decision-making producing legal or similarly significant effects. Pattern extraction (gotchas/learned) influences only local tool behavior. `[VERIFY: counsel sign-off on this characterization]`

## 7. Security (Art. 32)

- Data is stored **unencrypted** in plain text on your device; protection relies on your OS account security and disk encryption.
- Built-in safeguards (verified in code): `<private>` masking in conversation logs; secret-pattern regex masking (API keys, tokens, passwords) in observation logs; 13-pattern secret scan for handoff documents; all recorded directories are git-ignored and verifiably absent from the remote repository.

## 8. Changes to this notice

- Effective date: [FILL IN]
- Material changes will be announced via [FILL IN: README / release notes] before taking effect.

---

## 부록: 확정 전 채워야 할 항목 (한국어 체크리스트)

| # | 항목 | 상태 |
|---|---|---|
| 1 | **GDPR 적용 대상 여부** — 개발자가 데이터를 전혀 수신하지 않는 로컬 도구라서 개발자가 controller/processor에 해당하는지 자체가 쟁점. 가계 예외(Art. 2(2)(c)) 가능성 포함 | [확인 필요: 법률 검토 — 이 판단이 문서 전체의 법적 성격을 결정] |
| 2 | Controller 정보(명칭·주소·이메일), DPO 선임 여부 | 프로그램 명칭 확정: **Skill Olympus**. 운영 주체(개인 개발자) 표기 방식·연락처는 미정 — GitHub Issues 권장 |
| 3 | 각 처리 목적의 법적 근거 선택 (동의 vs 정당한 이익) | 미정 — opt-out 플래그(`MNEMO_DISABLE`)는 구현 완료(2026-08-08). 단 기본값이 저장 ON(opt-out 방식)이라 GDPR 동의(opt-in) 요건 충족은 별도 검토 필요 |
| 4 | 국외 이전 안전장치 — Anthropic/OpenAI/Google/GitHub의 EU-US DPF 인증 여부 확인 후 기재 | 각 벤더 확인 필요 |
| 5 | 보존 기간 정책 (현재 무기한 — 저장 제한 원칙과 충돌 소지) | 정책 결정 또는 자동 파기 구현 |
| 6 | 권리 행사 접수 창구 | 미정 |
| 7 | 자동화된 의사결정 해당 없음 판단 확정 | [확인 필요] |
| 8 | 시행일·변경 고지 방법 | 미정 |

**3개국 판 공통 전제**: ko/us/eu 세 초안 모두 동일한 코드 감사 결과(로컬 저장 전용, 텔레메트리 없음, 세션 시작 시 GitHub 버전 체크, AI CLI 호출 시 벤더 전송, 자동 파기 없음)를 근거로 하며, 코드가 바뀌면 세 문서를 함께 갱신해야 합니다. 저장 opt-out(`MNEMO_DISABLE`)과 버전 체크 opt-out(`OLYMPUS_UPDATE_CHECK_DISABLE`)은 2026-08-08 구현 완료.
