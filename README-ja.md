**言語:** [English](README.md) | [한국어](README-ko.md) | 日本語 | [简体中文](README-zh-CN.md)

# Skill Olympus

### コーディングエージェントに、動き続けるプロダクトチームを。

設計、実装、監査、テスト、文書化、そして次のセッションへの引き継ぎまで。
CLIが備えるネイティブエージェントは、そのまま活用します。

[![Stars](https://img.shields.io/github/stars/Dannykkh/skill-olympus?style=flat)](https://github.com/Dannykkh/skill-olympus/stargazers)
[![Forks](https://img.shields.io/github/forks/Dannykkh/skill-olympus?style=flat)](https://github.com/Dannykkh/skill-olympus/network/members)
[![Latest release](https://img.shields.io/github/v/release/Dannykkh/skill-olympus?display_name=tag)](https://github.com/Dannykkh/skill-olympus/releases/latest)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Website](https://img.shields.io/badge/website-live-E4B700)](https://dannykkh.github.io/skill-olympus/ja/)
![Claude Code](https://img.shields.io/badge/Claude_Code-supported-D97757?logo=anthropic&logoColor=white)
![Codex CLI](https://img.shields.io/badge/Codex_CLI-supported-412991?logo=openai&logoColor=white)
![Antigravity CLI](https://img.shields.io/badge/Antigravity_CLI-supported-4285F4?logo=google&logoColor=white)
![Grok Build](https://img.shields.io/badge/Grok_Build-supported-000000)
![Devin CLI](https://img.shields.io/badge/Devin_CLI-Claude_skills%2BMnemo-6A5ACD)
![OpenClaw](https://img.shields.io/badge/OpenClaw-skills--only-5B4B8A)
![Hermes Agent](https://img.shields.io/badge/Hermes_Agent-skills--only-8A5A44)

Skill Olympusは、**Claude Code**、**Codex CLI**、**Antigravity CLI**、**Grok Build**を使う
個人開発者向けの実践的なハーネスです。Devin CLIはClaudeのスキルを読み込み、専用の
Mnemoフックで会話を保存できます。必要な専門機能やZeusの一括ワークフローを利用できます。

```text
/zeus "React、Spring Boot、PostgreSQLで小規模な在庫管理SaaSを作って"
```

一つの依頼から、保存可能な設計資料、実装、監査、実行テスト、根拠付きレポートまでを
つなげます。ターンを使い切っただけでは、完了と判定しません。

[クイックスタート](#クイックスタート) · [ワークフローを選ぶ](#ワークフローを選ぶ) · [CLI対応](#cli対応) · [Englishの詳細版](README.md)

> Olympusは、大量のプロンプトを常時読み込む仕組みではありません。普段は18個の
> 入口だけを公開し、下位モジュール78個は必要になった時点でカタログから読み込みます。

---

## Olympusを使う理由

| やりたいこと | Olympusが加えるもの |
|---|---|
| **一文からプロダクトを作る** | `/zeus`が設計、実装、監査、実行環境、テスト、最終レポートを一つにつなぐ |
| **途中で止まらない修正ループ** | `/chronos`が FIND → FIX → VERIFY を繰り返し、失敗やブロッカーも正直に記録する |
| **仕様どおりに作れたか確かめる** | `/argos`が仕様、コード、API、QAシナリオ、図、セキュリティ境界を照合する |
| **ブラウザテストを実際に動かす** | `/minos`がPlaywrightシナリオを生成・実行し、上限付きのループで失敗を直す |
| **セッションをまたいで記憶する** | `mnemo`がタグと根拠から会話の文脈を探し、既存の記憶を整備し、ハンドオフで作業をつなぐ |
| **開始時のコンテキストを軽くする** | 少数の入口から、必要なsource-onlyモジュールだけを読む |

公開スキルソースは102個です。標準のallowlistは24個の和集合で、統合CLIでは20個または
21個、skills-onlyホストでは18個が有効になります。残り78個はsource-onlyです。

---

## インストール前に変わるものを確認する

統合インストーラーはグローバル環境を更新するため、ルールは他のプロジェクトにも適用されます。スキルだけでなく、カタログ、フック、MCP設定も対象です。OpenClawとHermes Agentはskills-onlyです。

| CLI | 更新するグローバルルール |
|---|---|
| Claude Code | `~/.claude/CLAUDE.md` の `MNEMO` ブロック |
| Codex | `${CODEX_HOME:-~/.codex}/AGENTS.md` の `CODEX-MNEMO` ブロック |
| Antigravity CLI | `~/.gemini/GEMINI.md` の `ANTIGRAVITY-MNEMO` ブロック |
| Grok Build | `~/.grok/rules/grok-mnemo.md` とClaudeの共有ルール |
| Devin CLI | Windowsでは`%APPDATA%/devin/AGENTS.md`、macOS/Linuxでは`~/.config/devin/AGENTS.md`の`DEVIN-MNEMO`ブロック。フックは`config.json`に登録 |

v6.1.2では、依頼と同じ言語での応答、`codemap/index.md`を先に確認するコード探索、記憶→会話リンク・タグ→本文→範囲を絞った元セッションの確認を共通化しました。読み取り専用の依頼ではファイルを書きません。カタログ、文書、引き継ぎ、検証は各CLIの仕組みに合わせます。

**再インストール時は管理ブロック内の編集も置き換わります。** Claude・Codex・Antigravityではマーカー外の個人ルールを残し、Grokの管理ファイルは全体を置き換えます。統合インストーラーは変更前に対象ルールとCodex設定・通知wrapperを`~/.olympus/install-backups/`へ保存します。個別アダプターのインストールには、このバックアップ処理は適用されません。

インストールの最後にルール・登録・インストール済みフックを検証し、結果を`verification.json`へ保存します。未実行の検査は`NOT RUN`と表示します。`node scripts/install-state.js restore "<manifest.json>"`で復元対象を確認し、`--apply`で適用します。Codex設定全体を含むファイル単位の復元で、インストール後の編集があれば停止します。[バックアップ範囲と検証の限界](docs/global-agent-rules.md)を確認してください。

- 個人設定はマーカー外、Grokでは別の個人ルールファイルに書きます。次回のインストールにも変更を反映したい場合は、管理しているチェックアウトの[正本テンプレート](docs/global-agent-rules.md)を編集します。
- Mnemoはプロジェクトの`conversations/`に会話のコピーを保存します。CLI起動時の環境変数`MNEMO_DISABLE=1`で保存フックを停止できますが、明示的なファイル作成やCLI本来のセッション保存は別です。
- ルールだけを外す場合は管理ブロック、またはGrokの管理ファイルを削除します。フックは残り、次回インストールでルールは復元されます。アダプター全体の[削除手順](docs/global-agent-rules.md#customize-disable-remove)では既存の会話・記憶・引き継ぎ文書を残します。
- Codexの既存インストーラーは`config.toml`の`notify`を設定し、`tui.notifications=false`, `tui.animations=true`, `tui.whimsy=false`にします。通知チェーンの保持条件と削除後の復旧は[詳細ガイド](docs/global-agent-rules.md)で確認してください。

### Codex Astraの星のエフェクトを切り替える

Codex CLIでAstraモデルを使うと、入力欄の背景に星がきらめくことがあります。以下は有効な状態のスクリーンショットです（静止画）。

![Codex Astraの入力欄に表示される星](docs/images/codex-astra-composer-stars.png)

`install.bat`または`install.sh`のCodexインストール処理は、**スピナーなどの通常のアニメーションを有効にし、星などの装飾を全プロジェクトで無効にします**。設定先はWindowsでは`%USERPROFILE%\.codex\config.toml`、macOS/Linuxでは`~/.codex/config.toml`です。`CODEX_HOME`を指定した場合は、そのフォルダーの`config.toml`を編集します。

```toml
# 最初の [テーブル] より前にある既存の値を編集
tui.animations = true
tui.whimsy = false
```

`animations`は通常のアニメーション、`whimsy`はAstraの星などの装飾を制御します。すでに`[tui]`があれば、その中の`animations`と`whimsy`を編集し、上のキーを重複して追加しないでください。

**星を再び表示するには、`animations=true`のまま`whimsy=true`に変更し、Codexを再起動します。** インストール・再インストール時には`animations=true`、`whimsy=false`を適用します。以前のインストールで`animations=false`になっていた場合も`true`に更新します。Olympusを削除しても設定は残ります。[公式設定スキーマ](https://developers.openai.com/codex/config-schema.json) · [設定の詳細](docs/global-agent-rules.md)

このルール変更のためにモデル・推論強度・権限の値を追加する必要はありません。更新後は新しいセッションを開始してください。詳しい設定条件と復旧ツールの制限は[グローバルルールガイド（韓国語）](docs/global-agent-rules.md)にあります。

---

## クイックスタート

GitとNode.js LTSが必要です。対象のAI CLIはOlympusの前後どちらでインストールしても
かまいません。CLIを後から入れた場合は、同じインストーラーをもう一度実行してください。

### 四つの統合ランタイムをインストール

```bash
git clone https://github.com/Dannykkh/skill-olympus.git
cd skill-olympus

# Windows
.\install.bat

# macOS/Linux
chmod +x install.sh && ./install.sh
```

引数なしが標準のフルインストールです。Claude、Codex、Antigravity、Grokの四つを対象に
します。CLIの実行ファイルが`PATH`になくてもファイルは配置され、MCP登録など実行
ファイルを必要とする処理だけがスキップされます。

Devin CLIが検出されると、[Devin-Mnemo](skills/devin-mnemo/SKILL.md)もインストールされます。
DevinはClaudeのスキル（`/mnemo`を含む）を読み、専用の`UserPromptSubmit`・`Stop`・
`SessionEnd`フックで`conversations/*-devin.md`に会話を保存します。単独で導入・確認するには
`node skills/devin-mnemo/install.js`と`node skills/devin-mnemo/install.js --check`を使います。
応答本文の取得にはPython 3とローカルセッションDBが必要です。Windowsの実際のDevinターンで
動作を確認済みで、macOS・Linuxでの実行検証は未実施です。

Claude、Codex、Antigravityで標準登録されるMCPは`context7`と`playwright`です。
Chrome DevTools MCPは必要な場合だけ、Claudeでは`node install-mcp.js chrome-devtools`、
Codexでは`node install-mcp-codex.js chrome-devtools`、Antigravityでは
`node install-mcp-antigravity.js chrome-devtools`で追加できます。
[MCP設定ガイド](mcp-configs/README.md)も参照してください。通常の再インストールでは既存のChrome DevTools登録は削除されません。

### 最初に試すワークフロー

```text
/zeus "React、Spring Boot、PostgreSQLで小規模な在庫管理SaaSを作って"
/chronos "決済フローのテストが通るまで直して"
/aphrodite "運用担当者の一日の仕事を軸に、このダッシュボードを設計し直して"
/argos docs/plan/checkout
/mnemo "認証方式について何を決めた？"
```

説明に合う自然言語の依頼からも起動できます。slash名を使うと、意図したワークフローを
明確に指定できます。

### OpenClawとHermes Agentはskills-only

専用インストーラーは、共通のユーザー向けスキル18個とsource-onlyモジュール78個を
導入します。プラグイン、フック、Mnemo、MCP、カスタムエージェント、四つの統合CLI専用
アダプターは導入しません。

```powershell
# Windows
.\install-openclaw.bat
.\install-hermes.bat

# TermSnap向けインストーラーから明示的に選ぶ場合
.\install.bat --llm openclaw,hermes
```

```bash
# macOS/Linux
bash ./install-openclaw.sh
bash ./install-hermes.sh
```

ホスト別インストーラーに`--uninstall`を付けると、そのホストでOlympusが管理するスキル
だけを削除します。通常の更新では、先にアンインストールする必要はありません。

<details>
<summary><strong>更新とsource-onlyモジュール</strong></summary>

```powershell
git pull
.\install.bat
```

インストーラーを再実行すると、Olympusが管理する名前だけを現在のポリシーに合わせて
更新します。名前の異なる外部スキルは残ります。同名の変更済みスキルは削除せず、
`_olympus-preserved`へ移します。

source-onlyとは、現在の`SKILL.md`と関連ファイルを保持したまま、CLIの自動検出
ディレクトリには登録しない状態です。全モジュールをslashメニューと自動マッチングへ
戻す場合は、次のオプションを使います。

```powershell
.\install.bat --include-source-only-skills
```

詳しくは[スキルレジストリ移行ガイド](docs/skill-registry-migration.md)を参照してください。

</details>

---

## 仕組み

Zeusは、依頼を設計へ分解し、実装、監査、実行環境の準備、テスト、根拠レポートまで
進めるハーネス層です。Chronosで継続状態を持ち、Zephermineで設計し、現在のCLIが
備えるネイティブワーカーで実装します。Argos、Docker、Minosの証拠がそろうまで、
SUCCESSを返しません。

<p align="center">
  <img src="docs/assets/skill-olympus-system-overview.svg" alt="4つの統合CLI、2つのskills-onlyホスト、Zeusの6段階デリバリーハーネス、Chronosの継続性レール、Mnemoの記憶レールを示すSkill Olympus v6の全体図" width="1100">
</p>

```text
依頼
  → Chronos: 継続状態と完了条件
  → Zephermine: 調査と設計資料
  → Native workers: 実装と局所テスト
  → Argos: 仕様との照合
  → Docker: 再現可能な実行環境
  → Minos: Playwrightによる実行検証
  → 根拠付き最終レポート
```

---

## ワークフローを選ぶ

| 状況 | 呼び出し | 主な成果物 |
|---|---|---|
| 一文から最後まで作る | `/zeus` | 設計、実装、監査、実行環境、テスト、レポート |
| 実装前に要件を固める | `/zephermine` | 要求仕様、API、QAシナリオ、フロー図 |
| 複数ワーカーで実装する | `/agent-team` | 所有権を分けた並列実装と統合結果 |
| 設計なしで実装を進める | `workpm` / `/daedalus` | 調査、タスク分割、実装、検証 |
| UIを再設計する | `/aphrodite` | 視覚表現より先にワイヤーフレームを描画・検証し、Experience Contract、デザイン方針、実装へ進む |
| 実装を仕様と照合する | `/argos` | 根拠付きの適合・不適合判定 |
| QAが通るまで直す | `/minos` | Playwrightテストと修正ログ |
| 一件ずつ修正を続ける | `/chronos` | 監査ログ、検証結果、再開可能な状態 |
| 過去の決定を探す | `/mnemo` | 会話検索、意味記憶、ハンドオフ |

全スキル、エージェント参考資料、フックの一覧は[英語版README](README.md#whats-inside)に
まとめています。

---

## Mnemo — 会話の文脈と既存の記憶

Mnemoは、普段の会話にある好み、約束、理由、条件の変化も扱います。埋め込みやベクトルDBを使わず、タグ・見出し・本文を検索します。コードマップは開発作業で任意に利用するものです。読み取り専用の [`recall.py`](skills/mnemo/scripts/recall.py) は質問と応答を組にして返し、置き換えられた決定・依存関係・根拠リンクを出力上限の範囲でたどります。検索語や同義語は現在のエージェントが指定し、根拠が今も当てはまるかを判断します。

既存のDoctorに `--upgrade-memory` を追加しました。確認できる一意の参照を既存ファイル内で修正し、明示的な会話リンクを `evidence:` に整えます。元のバイト列をバックアップし、項目番号・日付・作成者・状態の決定を保ちます。未確認の参照はレビュー対象として残します。従来の `--fix` の修正範囲は変わらず、更新は別の明示的なコマンドです。

Python 3とNode.jsがある環境で、リポジトリのルートから実行します。

```bash
# 読み取り専用の検索と診断
python -B -X utf8 skills/mnemo/scripts/recall.py --project-root . --term "好み" --term "約束" --max-chars 12000
python -B -X utf8 skills/mnemo/scripts/mnemo_doctor.py --project-root .

# 元のファイルをバックアップして既存の記憶を更新
python -B -X utf8 skills/mnemo/scripts/mnemo_doctor.py --project-root . --upgrade-memory
```

Claude Code・Codex・Antigravity・Grokの各アダプターに共通の検索・Doctorを同梱しています。DevinはClaudeの `mnemo` を共有し、会話の保存にはDevin専用フックを使います。Windowsは `install.bat`、macOS/Linuxは `bash install.sh` で更新します。

[検索の契約](skills/mnemo/references/recall.md) · [更新の契約](skills/mnemo/docs/memory-hygiene.md) · [2026-10-05の検証](docs/plan/2026-10-05-mnemo-context-recall-audit/doctor-upgrade-results.md)に範囲と根拠を記録しています。Python 243件・Node 25件のテスト、インストール済みパッケージの確認、セッションDBのfixtureを使ったDevin保存フックの統合テストが通りました。最終的なLLMの回答精度は未測定で、この変更後のDevinモデルによる新たな実会話ターンも未実施です。

---

## CLI対応

| ホスト | 対応レベル | 主な統合 |
|---|---|---|
| Claude Code | 統合 | skills、hooks、Mnemo、MCP、ネイティブサブエージェント |
| Codex CLI | 統合 | skills、notifyベースMnemo、MCP、ネイティブサブエージェント |
| Antigravity CLI | 統合 | skills、native hooks、Mnemo、MCP、ネイティブワークフロー |
| Grok Build | 統合 | Claude共有skill表面、hooks、Mnemo、ネイティブワーカー |
| Devin CLI | Claudeスキル互換＋Mnemo | Claudeスキル共有、Devinネイティブフックによる会話保存。MCP・エージェントの統合サポートは未検証 |
| OpenClaw | skills-only | 移植可能なスキルとsource-onlyカタログ |
| Hermes Agent | skills-only | 移植可能なスキルとsource-onlyカタログ |

OpenClawとHermesでskills-onlyとしているのは、未対応という意味ではありません。共通の
`SKILL.md`ワークフローは利用できますが、ホスト固有のフック、メモリ、MCP、エージェント
登録まではOlympusが所有しない、という境界を示しています。

---

## ドキュメント

- [詳細な英語版README](README.md)
- [セットアップとインストーラーのオプション](SETUP.md)
- [ワークフローガイド](docs/workflow-guide.md)
- [スキルレジストリと競合の復旧](docs/skill-registry-migration.md)
- [変更履歴](CHANGELOG.md)

## コントリビューション

IssueとPull Requestを歓迎します。PRを送る前に[AGENTS.md](AGENTS.md)を読み、次のテストを
実行してください。

```powershell
$tests = (Get-ChildItem scripts/tests -Filter '*.test.js').FullName
node --test $tests
```

```bash
node --test scripts/tests/*.test.js
```

Olympusが設計のやり直し、途切れた引き継ぎ、デバッグループのどれか一つでも減らせたら、
GitHubでStarを付けてもらえると、ほかの個人開発者にも見つけてもらいやすくなります。

---

## ライセンス

[MIT](LICENSE)

---

**最終更新:** 2026-10-03

[한국 GS 인증 / Korean GS certification — installation, ISO basis, grades, and validation limits](README.md#korean-gs-certification-preflight)

## v6.17.0 — 完了基準を ID 付きの約束に

設計と実装が名前の付いた約束を共有するようになりました。zephermine は各セクションの受け入れ基準に固定 ID（`AC-NN-k`）、観察可能な動作、根拠、検証方法を付けて `checklist.md` にまとめ、すべての課題に AC があること、すべての AC が検証可能であること、AC 同士が矛盾しないことを確認します。Poseidon・Daedalus・Chronos は同じ `checklist-status.md` 台帳に進捗を記録し（`proved` には実行した証拠が必要で、全行が `proved` のときだけ完了）、Argos はその証拠を再実行して確認し（Phase 4A）、Clio は未達の AC を NO-GO の理由に数えます。`api-spec.md` は各画面が表示・操作する内容から始まり、すべての一覧 API にページネーションを、エラーには共通のコード形式を適用し、一覧の絞り込み・並べ替え列をインデックス計画に反映します。Poseidon の所有権チェックは `HEAD~N` ではなく開始時点の基準と比較し、autoresearch は最適化に使わなかった holdout 入力で最終判定します。同名スキルと重複していたカスタムエージェント 6 個を削除しました（エージェントソース 42 → 36）。

[変更履歴](CHANGELOG.md)

## v6.14.1 — Python の判定を名前ではなく実行で行う

フックとインストール点検が、名前だけの Python を本物と取り違えなくなりました。Windows の `python`・`python3` は PATH にあっても実行できないストアのエイリアスの場合があり、macOS には `python3` しかありません。アンカー索引の再生成フックと API 検証フックは、`python`・`py`・`python3` のうち実際に実行できる最初のコマンドを使うため、再生成を飛ばしたり偽の構文エラーを出したりせず、空白を含むプロジェクトパスでも動作します。`install.js --check` は Python のインストール方法とエイリアスの無効化方法を案内し、エージェントは 3 つすべてが失敗したときだけ引き継ぎツールを使えないと報告します。

[変更履歴](CHANGELOG.md)

## v6.14.0 — Mnemo 引き継ぎのコンポーネントマップ点検

TermSnap のコンポーネントマップ（`codemap/component-map.json`）があるプロジェクトでは、`create_handoff.py` が `Component map:` 行を書きます。TermSnap が生成する `codemap/components/owners.json` を読み、今回のセッションのファイルのうち担当コンポーネントがないもの、マップの再生成が必要なもの、マップのエラーを知らせます。`validate_handoff.py` は、その結果に `→ 배정함:`（割り当て済み）も `→ 보류:`（保留）もない場合に警告します。マップのないプロジェクトには行が付きません。スキルは契約ファイルを読むだけで、マップの修正や TermSnap のソース判定規則の再実装は行いません。あわせて、ドットで始まるフォルダー（`.github/…`）のパスが先頭のドットを失い、Files Modified とアンカー照会から漏れていた問題も修正しました。

[変更履歴](CHANGELOG.md)

## v6.13.0 — Mnemo タグ予約フィールド

タグ行の予約フィールドに `arch:NNN` に加えて `learned:NNN`・`gotcha:NNN` を追加しました。`validate_handoff.py` は、**現在のセッション**が触れた記憶エントリーの番号がタグ行にない場合や、`arch-057` のようにハイフンで書かれた場合に警告します。セッションは引き継ぎの出所にある `session <uuid>` で特定するため、同じ日の別セッションの項目は混ざりません。更新は Windows で `install.bat`、macOS/Linux で `bash install.sh` を実行します。

[変更履歴](CHANGELOG.md)

## v6.12.0 — Mnemo 更新

Mnemo 専用のセッション学習・プロジェクト内スキル改善・比較評価の手順を、Claude Code、Codex、Antigravity、Grok の各アダプターに同梱しました。単独導入に共有スキル `skill-evolve`、`autoresearch`、`memory-distill` は不要です。引き継ぎは確認した依頼と根拠を `--origin` と `--origin-source` の組で渡し、未指定の出所を推測しません。更新は Windows で `install.bat`、macOS/Linux で `bash install.sh` を実行します。プロジェクト規則の自動初期化と doctor 連携は未実装で、LLM の改善判断品質は未測定です。

[専用手順](skills/mnemo/references/self-improvement.md) · [変更履歴](CHANGELOG.md)
