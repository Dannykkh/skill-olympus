# Privacy Policy (Draft — United States)

> **Basis**: CCPA/CPRA (California Consumer Privacy Act, as amended) disclosure conventions + FTC fair-practice norms. The U.S. has no single federal privacy statute; state laws (California, Virginia, Colorado, Connecticut, Utah, etc.) may apply depending on your reach.
> **Method**: Grounded ONLY in the 2026-08-08 full-code audit of this repository. Nothing invented; missing items are marked `[FILL IN: ...]`.
> **Note**: This is a draft, not legal advice. Have counsel review before publishing.

---

**Skill Olympus** ("the Program") is a CLI extension toolkit that runs entirely on your local machine. **The developer does not operate servers that collect, receive, or store your data.** All storage described below happens on your own device.

## 1. Information We Collect

The Program's hooks automatically record the following **to your local disk only**:

| Category | Details | Where it is stored (on your device) |
|---|---|---|
| Conversation content | Your full prompts and full AI responses, every turn | `<project>/conversations/*.md` |
| Tool usage logs | First 80 characters of shell commands, file paths, fetched URLs, web search queries, tool inputs/outputs (up to 3,000 chars each), session IDs, timestamps | `<project>/conversations/*-toollog.md`, `<project>/memory/{gotchas,learned}/observations.jsonl` |
| Workspace metadata | Git branch, recent commits, modified file lists, absolute project paths | `<project>/docs/handoffs/*.md` |
| Orchestration records | Task prompts, activity logs, worker IDs | `<project>/.orchestrator/orchestrator.db` |
| Integration settings | GitHub username, Jira project key, Slack channel name (entered by you) | skill-local `config.json` |

**We do NOT collect** (verified by full-code audit): your name, email address, phone number, photos, precise geolocation, government identifiers, payment information, biometric data, or device/hardware identifiers. There is **no telemetry or analytics** of any kind.

### CCPA category mapping

| CCPA category (Cal. Civ. Code § 1798.140(v)) | Collected? |
|---|---|
| Identifiers (name, email, IP, etc.) | No — except that your IP is incidentally visible to GitHub during the automatic version check (see §3) |
| Internet or other electronic network activity | Yes, locally only — fetched URLs and search queries entered during agent sessions |
| Geolocation data | No |
| Commercial information / payment | No |
| Biometric / audio / visual | No |
| Professional or employment information | No |
| Inferences drawn to build a profile | [VERIFY: the gotcha/learned pattern extraction builds work-habit observations locally; counsel should judge whether this constitutes "inferences" — it never leaves your device] |

## 2. How We Use Information

- Long-term memory: searching past conversations, restoring context across sessions
- Automatic extraction of mistake patterns (gotchas) and success patterns (learned)
- Session handoff documents for continuing work
- Multi-agent task coordination

All processing is local. The developer never sees this data.

## 3. When Information Leaves Your Device

| Recipient | What is sent | When |
|---|---|---|
| Anthropic / OpenAI / Google | Prompts, task instructions, and target code you are working on | Only when you invoke the corresponding AI CLI features |
| GitHub (raw.githubusercontent.com) | No user data in the request body; your IP address is inherently visible to the server | **Automatically at every session start** (version check; disable with `OLYMPUS_UPDATE_CHECK_DISABLE=1`) |
| Reddit | Search keywords only | Only when you explicitly run the reddit-researcher skill |
| YouTube | Video URL requests | Only when you explicitly run the youtube-transcript skill |

Each AI vendor processes what it receives under its own privacy policy. [FILL IN: link each vendor's privacy policy — Anthropic, OpenAI, Google, GitHub.]

## 4. Sale and Sharing of Personal Information

- We do **not sell** personal information.
- We do **not share** personal information for cross-context behavioral advertising.
- Accordingly, no "Do Not Sell or Share My Personal Information" link is required. [VERIFY with counsel once distribution model is final.]

## 5. Your Privacy Rights

Because all data resides on your own device in plain text (Markdown/JSONL/SQLite), you can exercise access, correction, and deletion directly:

- **Access/Know**: open the files listed in §1.
- **Correct**: edit those files.
- **Delete**: remove `conversations/`, `memory/`, `docs/handoffs/`, `docs/chronos/`, `.orchestrator/` (or run the `orchestrator_reset` tool for the task database). Note: uninstalling (`install.bat --uninstall`) removes the recording hooks but does **not** delete already-saved data.
- **Stop collection (opt-out)**: set the environment variable `MNEMO_DISABLE=1` — all automatic recording (conversations, tool logs, backfill) stops immediately; already-saved files remain until you delete them.
- California residents may also have rights to opt out of sale/sharing (not applicable — see §4) and to limit use of sensitive personal information (none is collected).
- We will not discriminate against you for exercising any privacy right.
- [FILL IN: a contact channel for rights requests if the Program is ever distributed as a service.]

## 6. Data Retention

- There is currently **no automatic retention limit**. Files persist until you delete them; observation logs over 10 MB are moved to an `archive/` folder, not deleted.
- [FILL IN: a retention policy statement, e.g., "retained until the user deletes it" or a fixed period with automatic purge — the latter requires implementing the purge.]

## 7. Children's Privacy

The Program is a developer tool not directed to children under 13, and it collects no identifiers that could recognize a child. [VERIFY: confirm COPPA position with counsel if distribution broadens.]

## 8. Security

- Data is stored **unencrypted** in plain text on your device; protection relies on your OS account security and disk encryption.
- Built-in safeguards (verified in code): `<private>...</private>` tags are replaced with `[PRIVATE]` in conversation logs (note: this masking does **not** apply to tool-usage observation logs); a secret-pattern regex masks API keys/tokens/passwords in observation logs; handoff documents can be scanned against 13 secret patterns; recorded directories are git-ignored so they are never pushed to remotes.
- [FILL IN: any additional security commitments you choose to make.]

## 9. Changes to This Policy

- Effective date: [FILL IN]
- Material changes will be announced via [FILL IN: README / release notes / in-app notice] before taking effect.

## 10. Contact

- [FILL IN: name/entity and contact email for privacy inquiries.]

---

## 부록: 확정 전 채워야 할 항목 (한국어 체크리스트)

| # | 항목 | 상태 |
|---|---|---|
| 1 | 프로그램 정식 명칭·운영 주체·연락처 | 명칭 확정: **Skill Olympus** (GitHub: Dannykkh/skill-olympus, MIT). 연락처는 미정 — GitHub Issues 권장 |
| 2 | **CCPA 적용 대상 여부** — CCPA는 연매출 $25M 초과 등 문턱을 넘는 "business"에만 의무 적용. 개인 개발 무료 도구면 법적 의무가 없을 수 있으나, 공개 관행상 작성 권장 | [확인 필요: 법률 검토] |
| 3 | 캘리포니아 외 주법(버지니아 VCDPA, 콜로라도 CPA, 코네티컷 CTDPA, 유타 UCPA 등) 해당 여부 | [확인 필요] |
| 4 | 각 AI 벤더 프라이버시 정책 링크 | 미기입 |
| 5 | 보존 기간 정책 (현재 코드상 무기한) | 정책 결정 필요 |
| 6 | 열람·삭제 요구 접수 창구 (배포형 전환 시) | 미정 |
| 7 | "inferences" 해당 여부 (gotcha/learned 패턴 추출) | [확인 필요: 법률 검토] |
| 8 | COPPA 입장 확정 | [확인 필요] |
| 9 | 시행일·변경 고지 방법 | 미정 |

**한국판과의 공통 전제**: 두 초안 모두 동일한 코드 감사 결과(로컬 저장 전용, 텔레메트리 없음, 세션 시작 시 GitHub 버전 체크, AI CLI 호출 시 벤더 전송)를 근거로 하며, 코드가 바뀌면 두 문서를 함께 갱신해야 합니다.
