**言語:** [English](README.md) | [한국어](README-ko.md) | 日本語 | [简体中文](README-zh-CN.md)

# Skill Olympus

### コーディングエージェントに、動き続けるプロダクトチームを。

設計、実装、監査、テスト、文書化、そして次のセッションへの引き継ぎまで。
CLIが備えるネイティブエージェントは、そのまま活用します。

[![Stars](https://img.shields.io/github/stars/Dannykkh/skill-olympus?style=flat)](https://github.com/Dannykkh/skill-olympus/stargazers)
[![Forks](https://img.shields.io/github/forks/Dannykkh/skill-olympus?style=flat)](https://github.com/Dannykkh/skill-olympus/network/members)
[![Latest release](https://img.shields.io/github/v/release/Dannykkh/skill-olympus?display_name=tag)](https://github.com/Dannykkh/skill-olympus/releases/latest)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
![Claude Code](https://img.shields.io/badge/Claude_Code-supported-D97757?logo=anthropic&logoColor=white)
![Codex CLI](https://img.shields.io/badge/Codex_CLI-supported-412991?logo=openai&logoColor=white)
![Antigravity CLI](https://img.shields.io/badge/Antigravity_CLI-supported-4285F4?logo=google&logoColor=white)
![Grok Build](https://img.shields.io/badge/Grok_Build-supported-000000)
![OpenClaw](https://img.shields.io/badge/OpenClaw-skills--only-5B4B8A)
![Hermes Agent](https://img.shields.io/badge/Hermes_Agent-skills--only-8A5A44)

Skill Olympusは、**Claude Code**、**Codex CLI**、**Antigravity CLI**、**Grok Build**を使う
個人開発者向けの実践的なハーネスです。複数のCLIに同じワークフローを導入し、必要な
専門機能だけを呼び出すことも、Zeusに開発全体を任せることもできます。

```text
/zeus "React、Spring Boot、PostgreSQLで小規模な在庫管理SaaSを作って"
```

一つの依頼から、保存可能な設計資料、実装、監査、実行テスト、根拠付きレポートまでを
つなげます。ターンを使い切っただけでは、完了と判定しません。

[クイックスタート](#クイックスタート) · [ワークフローを選ぶ](#ワークフローを選ぶ) · [CLI対応](#cli対応) · [Englishの詳細版](README.md)

> Olympusは、大量のプロンプトを常時読み込む仕組みではありません。普段は18個の
> 入口だけを公開し、下位モジュール76個は必要になった時点でカタログから読み込みます。

---

## Olympusを使う理由

| やりたいこと | Olympusが加えるもの |
|---|---|
| **一文からプロダクトを作る** | `/zeus`が設計、実装、監査、実行環境、テスト、最終レポートを一つにつなぐ |
| **途中で止まらない修正ループ** | `/chronos`が FIND → FIX → VERIFY を繰り返し、失敗やブロッカーも正直に記録する |
| **仕様どおりに作れたか確かめる** | `/argos`が仕様、コード、API、QAシナリオ、図、セキュリティ境界を照合する |
| **ブラウザテストを実際に動かす** | `/minos`がPlaywrightシナリオを生成・実行し、上限付きのループで失敗を直す |
| **セッションをまたいで記憶する** | `mnemo`が索引、意味記憶、検索可能な会話、再開用ハンドオフを残す |
| **開始時のコンテキストを軽くする** | 少数の入口から、必要なsource-onlyモジュールだけを読む |

公開スキルソースは100個です。標準のallowlistは24個の和集合で、統合CLIでは20個または
21個、skills-onlyホストでは18個が有効になります。残り76個はsource-onlyです。

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

専用インストーラーは、共通のユーザー向けスキル18個とsource-onlyモジュール76個を
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
  <img src="docs/assets/zeus-harness-engineering-codex-imagegen.png" alt="ChronosからZephermine、Poseidon、Argos、Docker、Minos、根拠レポートへ進むZeusのパイプライン" width="1100">
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
| UIを再設計する | `/aphrodite` | Experience Contract、デザイン方針、実装、視覚検証 |
| 実装を仕様と照合する | `/argos` | 根拠付きの適合・不適合判定 |
| QAが通るまで直す | `/minos` | Playwrightテストと修正ログ |
| 一件ずつ修正を続ける | `/chronos` | 監査ログ、検証結果、再開可能な状態 |
| 過去の決定を探す | `/mnemo` | 会話検索、意味記憶、ハンドオフ |

全スキル、エージェント参考資料、フックの一覧は[英語版README](README.md#whats-inside)に
まとめています。

---

## CLI対応

| ホスト | 対応レベル | 主な統合 |
|---|---|---|
| Claude Code | 統合 | skills、hooks、Mnemo、MCP、ネイティブサブエージェント |
| Codex CLI | 統合 | skills、notifyベースMnemo、MCP、ネイティブサブエージェント |
| Antigravity CLI | 統合 | skills、native hooks、Mnemo、MCP、ネイティブワークフロー |
| Grok Build | 統合 | Claude共有skill表面、hooks、Mnemo、ネイティブワーカー |
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

**最終更新:** 2026-09-01
