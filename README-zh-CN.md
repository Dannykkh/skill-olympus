**语言:** [English](README.md) | [한국어](README-ko.md) | [日本語](README-ja.md) | 简体中文

# Skill Olympus

### 为你的编码智能体配上一支持续工作的产品团队。

从规划、实现、验收、测试到文档和跨会话记忆，一套流程贯穿到底。
各个 CLI 自带的原生智能体仍然是主要执行者。

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

Skill Olympus 面向使用 **Claude Code**、**Codex CLI**、**Antigravity CLI** 或
**Grok Build** 的独立开发者。你可以在多个 CLI 中安装同一套工作流，按需调用一个
专门能力，也可以让 Zeus 推进完整的交付流程。

```text
/zeus "用 React、Spring Boot 和 PostgreSQL 构建一个小型库存管理 SaaS"
```

一句需求会转化为可保存的设计资料、实现、验收、可执行测试和证据报告。仅仅耗尽对话
轮次不算完成。

[快速开始](#快速开始) · [选择工作流](#选择工作流) · [CLI 支持](#cli-支持) · [English 详细版](README.md)

> Olympus 不是把大量提示词全部塞进上下文。默认只公开 18 个清晰入口，底层 76 个
> source-only 模块会在真正需要时通过目录读取。

---

## 为什么使用 Olympus

| 你的目标 | Olympus 提供的能力 |
|---|---|
| **从一句话开始构建产品** | `/zeus` 串联规划、实现、验收、运行环境、测试和最终报告 |
| **持续修复而不假装成功** | `/chronos` 执行 FIND → FIX → VERIFY，并如实记录失败和阻塞 |
| **证明实现符合设计** | `/argos` 对照规格、代码、API、QA 场景、流程图和安全边界 |
| **真正运行浏览器测试** | `/minos` 生成并执行 Playwright 场景，在有限循环内修复失败 |
| **跨会话保留记忆** | `mnemo` 保存索引、语义记忆、可搜索对话和可恢复交接 |
| **保持较小的启动上下文** | 少量入口只在需要时加载 source-only 模块 |

仓库公开跟踪 100 个技能源。默认 allowlist 的并集为 24 个；集成 CLI 会启用 20 或 21 个，
skills-only 主机会启用 18 个，其余 76 个保持 source-only。

---

## 快速开始

需要 Git 和 Node.js LTS。目标 AI CLI 可以在 Olympus 之前或之后安装；如果稍后才安装 CLI，
再次运行同一个安装器即可完成依赖该 CLI 的注册步骤。

### 安装四个集成运行时

```bash
git clone https://github.com/Dannykkh/skill-olympus.git
cd skill-olympus

# Windows
.\install.bat

# macOS/Linux
chmod +x install.sh && ./install.sh
```

不带参数运行就是默认完整安装，目标为 Claude、Codex、Antigravity 和 Grok。即使 CLI
可执行文件不在 `PATH` 中，安装器也会准备相关文件；只有 MCP 注册等必须调用 CLI 的步骤
会被跳过。

### 先试试这些工作流

```text
/zeus "用 React、Spring Boot 和 PostgreSQL 构建一个小型库存管理 SaaS"
/chronos "修复结账流程，直到测试通过"
/aphrodite "围绕运营人员每天的任务重新设计这个仪表盘"
/argos docs/plan/checkout
/mnemo "我们对认证方案做过什么决定？"
```

与技能描述相符的自然语言请求也可以触发工作流。使用 slash 名称可以更明确地指定意图。

### OpenClaw 和 Hermes Agent：skills-only 安装

专用安装器会安装 18 个通用用户入口和 76 个 source-only 模块，不会安装插件、hooks、
Mnemo、MCP、自定义智能体，也不会安装四个集成 CLI 的专用适配器。

```powershell
# Windows
.\install-openclaw.bat
.\install-hermes.bat

# 也可以通过面向 TermSnap 的安装器显式选择
.\install.bat --llm openclaw,hermes
```

```bash
# macOS/Linux
bash ./install-openclaw.sh
bash ./install-hermes.sh
```

给主机专用安装器加上 `--uninstall`，只会移除 Olympus 在该主机管理的技能。正常更新前
不需要先卸载。

<details>
<summary><strong>更新与 source-only 模块</strong></summary>

```powershell
git pull
.\install.bat
```

重新运行安装器只会按当前策略同步 Olympus 管理的名称，不会删除名称不同的第三方技能。
同名但被修改过的内容不会丢失，而会移动到 `_olympus-preserved`。

source-only 表示保留当前版本的 `SKILL.md` 和配套文件，但不把它们注册到 CLI 的自动发现
目录。若要把所有兼容模块重新加入 slash 菜单和自动匹配，请使用：

```powershell
.\install.bat --include-source-only-skills
```

完整规则请参阅[技能注册表迁移指南](docs/skill-registry-migration.md)。

</details>

---

## 工作原理

Zeus 是整个流程的控制层：它把请求拆成设计任务，推进实现与验收，准备运行环境，执行
测试并生成证据报告。Chronos 保存持续状态，Zephermine 产出设计，当前 CLI 的原生工作者
负责实现。只有 Argos、Docker 和 Minos 的验证证据齐备后，流程才允许返回 SUCCESS。

<p align="center">
  <img src="docs/assets/zeus-harness-engineering-codex-imagegen.png" alt="Zeus 从 Chronos、Zephermine、Poseidon、Argos、Docker、Minos 走向证据报告的流程" width="1100">
</p>

```text
需求
  → Chronos：持续状态与完成条件
  → Zephermine：研究与设计资料
  → Native workers：实现与局部测试
  → Argos：规格一致性验收
  → Docker：可复现运行环境
  → Minos：Playwright 运行验证
  → 带证据的最终报告
```

---

## 选择工作流

| 场景 | 调用方式 | 主要产物 |
|---|---|---|
| 从一句话构建到交付 | `/zeus` | 设计、实现、验收、运行环境、测试、报告 |
| 实现前明确需求 | `/zephermine` | 规格、API、QA 场景、流程图 |
| 多个工作者并行实现 | `/agent-team` | 明确文件归属的并行实现和集成结果 |
| 没有预先设计就直接推进 | `workpm` / `/daedalus` | 调研、任务拆分、实现、验证 |
| 重新设计 UI | `/aphrodite` | Experience Contract、设计方向、实现、视觉验证 |
| 对照设计验收实现 | `/argos` | 基于证据的符合或不符合判定 |
| 修复直到 QA 通过 | `/minos` | Playwright 测试和修复日志 |
| 持续逐项修复 | `/chronos` | 审计日志、验证结果、可恢复状态 |
| 查找过去的决定 | `/mnemo` | 对话搜索、语义记忆、会话交接 |

完整技能、智能体参考和 hook 清单请查看[英文 README](README.md#whats-inside)。

---

## CLI 支持

| 主机 | 支持级别 | 主要集成 |
|---|---|---|
| Claude Code | 集成 | skills、hooks、Mnemo、MCP、原生子智能体 |
| Codex CLI | 集成 | skills、基于 notify 的 Mnemo、MCP、原生子智能体 |
| Antigravity CLI | 集成 | skills、原生 hooks、Mnemo、MCP、原生工作流 |
| Grok Build | 集成 | 与 Claude 共享的 skill 表面、hooks、Mnemo、原生工作者 |
| OpenClaw | skills-only | 可移植技能和 source-only 目录 |
| Hermes Agent | skills-only | 可移植技能和 source-only 目录 |

skills-only 并不代表不支持。它表示通用 `SKILL.md` 工作流可以使用，但 Olympus 不负责该
主机的专用 hook、记忆、MCP 或智能体注册。

---

## 文档

- [完整英文 README](README.md)
- [安装与选项](SETUP.md)
- [工作流指南](docs/workflow-guide.md)
- [技能注册表与冲突恢复](docs/skill-registry-migration.md)
- [变更记录](CHANGELOG.md)

## 参与贡献

欢迎提交 Issue 和 Pull Request。发起 PR 前请阅读 [AGENTS.md](AGENTS.md)，并运行仓库测试。

```powershell
$tests = (Get-ChildItem scripts/tests -Filter '*.test.js').FullName
node --test $tests
```

```bash
node --test scripts/tests/*.test.js
```

如果 Olympus 帮你减少了一次返工、一次中断的交接或一轮调试，请为仓库点亮 Star，帮助
更多独立开发者发现它。

---

## 许可证

[MIT](LICENSE)

---

**最后更新：** 2026-09-01
