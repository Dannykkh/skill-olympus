# Command Patterns

This document describes the common patterns for slash commands, helping you choose the right structure for your workflow.

## Pattern Categories

### 1. Workflow Automation Pattern

**Structure:** Analyze → Act → Report

**When to use:**

- Multi-step workflows with clear sequence
- Commands that need to analyze before acting
- Workflows that produce specific outputs (commits, PRs, reports)

**Example workflow:**

1. Check for context files (e.g., `.PLAN.md`)
2. Analyze current state (git status, file changes)
3. Perform actions (create commit, submit PR)
4. Report results to user

**Key features:**

- Explicit file check order
- Conditional logic based on file existence
- Clear success output format
- Context-aware decision making

**Pattern example:**

```markdown
1. Check for .PLAN.md in repository root
   - If exists: use plan context for commit message
   - If not: analyze git changes and draft message

2. Review git status and diff
   - Identify staged and unstaged changes
   - Determine scope of changes

3. Create commit with descriptive message
   - Follow repository's commit message style
   - Include co-author attribution

4. Submit PRs with Graphite
   - Use gt stack submit
   - Report PR URLs to user
```

### 2. Iterative Fixing Pattern

**Structure:** Run → Parse → Fix → Repeat

**When to use:**

- Commands that fix issues iteratively (linting, tests, CI)
- Workflows that need multiple attempts to succeed
- Tasks with clear pass/fail criteria

**Example workflow:**

1. Run check command (e.g., `make all-ci`)
2. Parse failures by type
3. Apply targeted fixes
4. Run check again to verify
5. Repeat until success or max iterations reached

**Key features:**

- Iteration control (max attempts, stuck detection)
- Progress tracking with TodoWrite
- Clear stopping conditions
- Categorization of failure types
- Incremental fix application

**Pattern example:**

```markdown
1. Run make all-ci (max 10 iterations)

2. If check fails:
   - Parse error output by category (pyright, ruff, tests)
   - Create todos for each error category
   - Apply fixes for each category sequentially
   - Mark todo complete after fixing each category

3. After each fix iteration:
   - Run make all-ci again
   - Check if new errors appeared
   - If stuck (same errors 2+ times): stop and report

4. Stop when:
   - All checks pass (exit code 0)
   - Max iterations reached
   - Detected stuck state
```

### 3. Agent Delegation Pattern

**Structure:** Context → Delegate → Iterate

**When to use:**

- Complex tasks requiring specialized agents
- Multi-phase workflows with human review
- Tasks that benefit from agent specialization

**Example workflow:**

1. Present planning context to user
2. Delegate the bounded analysis to an appropriate built-in role
3. The delegated role returns a plan or output to the main context
4. Plan is reviewed and refined by user
5. Save results to disk after approval

**Key features:**

- Clear agent invocation instructions
- Phase-based workflow (planning → review → execution)
- Explicit save-to-disk trigger
- User review checkpoints
- Context gathering before delegation

**Pattern example:**

```markdown
1. Present planning context
   - Explain what the agent will do
   - Set expectations for iterative process
   - Mention that user can refine the output

2. Delegate planning
   - Claude Code command: invoke the current Agent tool with built-in `Explore`
   - Portable workflow: request a semantic read-only explorer
   - Pass the task, source scope, evidence requirements, and return format
   - Require a returned draft only; `Explore` must not write the plan file
   - If native delegation is unavailable, perform the same planning pass sequentially in the main context

3. Main context owns iteration
   - Present the returned plan
   - Refine it from user feedback
   - Keep shared approval state in the main context

4. After user approves plan
   - Have the main context save `.PLAN.md`
   - Confirm location with user
   - Explain next steps (execution)
```

For a delegated implementation rather than planning, use Claude's built-in `general-purpose` role or a
portable general-writer contract. Give it exact allowed write paths and verification commands. Never use
a source-only custom agent name as the target.

### 4. Simple Execution Pattern

**Structure:** Parse Arguments → Execute → Return Output

**When to use:**

- Single-step commands with arguments
- Wrapper commands for existing tools
- Commands that simply run and report

**Example workflow:**

1. Parse command arguments
2. Run specific command or script with arguments
3. Handle and display output
4. Report success or failure

**Key features:**

- Argument handling (required vs optional)
- Direct tool invocation
- Minimal logic
- Output formatting

**Pattern example:**

```markdown
1. Parse [base-branch] argument
   - If provided: use specified branch
   - If not provided: use main/master

2. Run codex-review script
   - Pass base-branch to script
   - Capture output

3. Display results
   - Show review findings
   - Report issues found
   - Suggest fixes if applicable
```

## Advanced Patterns

### Multi-Agent Orchestration

**When to use:** Complex workflows requiring multiple specialized agents in sequence

**Pattern:**

```markdown
1. Run read-only discovery
   - Claude command: use Agent with built-in `Explore`
   - Portable workflow: use a semantic read-only explorer
   - Search for specific patterns
   - Identify key components
   - Return file:line evidence; do not write files

2. Create the plan in the main context from discovery results
   - Pass context from exploration
   - Generate detailed implementation plan
   - Review with user

3. Execute the approved plan
   - Claude command: use built-in `general-purpose` only for explicitly assigned write paths, or execute in main
   - Portable workflow: use a semantic general writer with the same boundaries
   - If delegation is unavailable, execute stages sequentially in the main context
   - Load plan from .PLAN.md
   - Use TodoWrite to track phases
   - Report completion
```

### Context File Priority Checks

**When to use:** Commands that can operate in different modes based on available context

**Pattern:**

```markdown
Check these files in order for context:

1. .PLAN.md - implementation plan (highest priority)
2. .github/CONTRIBUTING.md - contribution guidelines
3. AGENTS.md - coding standards
4. README.md - project overview

Use the first file found to inform the workflow. Different files trigger different behaviors.
```

### Conditional Tool Selection

**When to use:** Commands that choose tools/approach based on task complexity

**Pattern:**

```markdown
Analyze scope of changes:

If changes span 3+ files OR involve new abstractions:

- Use a read-only planning role to return a detailed plan
- Keep plan approval in the main context
- For Claude writes, use Agent with built-in `general-purpose` and exact allowed paths
- For portable workflows, use a semantic general writer; fall back to sequential main-context execution

Otherwise:

- Execute changes directly
- Use simpler workflow
- Skip planning overhead
```

### Makefile Integration Pattern

**When to use:** Commands that need to run make targets

**Pattern:**

```markdown
**IMPORTANT:** Always use Bash tool for pytest/pyright/ruff/prettier/make/gt commands

1. Use Bash tool directly
   - Run commands like: "make all-ci", "pytest tests/", "pyright", etc.
   - Bash tool will execute and return output

2. Process command results
   - Check exit code
   - Parse any errors
   - Apply fixes if needed
```

### Progressive Disclosure Pattern

**When to use:** Commands that start simple but can get more complex based on results

**Pattern:**

```markdown
1. Start with minimal check
   - Run basic validation
   - Identify if deeper work needed

2. If issues found:
   - Expand scope progressively
   - Add todos for each issue category
   - Handle incrementally

3. Only go deeper if necessary
   - Don't over-analyze upfront
   - Let results guide next steps
   - Stop when criteria met
```

## Pattern Selection Guide

| If the command needs to...              | Use this pattern           |
| --------------------------------------- | -------------------------- |
| Create commits/PRs based on analysis    | Workflow Automation        |
| Fix issues iteratively until passing    | Iterative Fixing           |
| Create plans or delegate to specialists | Agent Delegation           |
| Run a tool and display results          | Simple Execution           |
| Coordinate multiple agents              | Multi-Agent Orchestration  |
| Check multiple context files            | Context File Priority      |
| Choose approach based on complexity     | Conditional Tool Selection |
| Run make targets                        | Makefile Integration       |
| Start simple and expand as needed       | Progressive Disclosure     |

## Combining Patterns

Commands often combine multiple patterns. For example:

**submit-stack combines:**

- Context File Priority (check .PLAN.md)
- Workflow Automation (analyze → commit → submit)
- Conditional Tool Selection (use plan if exists)

**ensure-ci combines:**

- Iterative Fixing (run → fix → repeat)
- Makefile Integration (use makefile-runner)
- Progressive Disclosure (expand todos as issues found)

## Writing Pattern-Specific Instructions

When implementing a pattern, include these elements:

### For All Patterns

- Clear sequence of steps (numbered)
- Expected outcomes at each step
- Error handling approach
- Success criteria

### Pattern-Specific Elements

**Workflow Automation:**

- File checks before analysis
- Conditional branches
- Output format specifications

**Iterative Fixing:**

- Max iteration count
- Stuck detection logic
- Progress tracking requirements
- Per-category fix instructions

**Agent Delegation:**

- Runtime contract: Claude Agent role or portable semantic role
- Read-only versus write boundary
- Context, evidence, allowed paths, and return format
- Main-context sequential fallback for portable workflows
- User review checkpoints
- Save-to-disk instructions

**Simple Execution:**

- Argument parsing logic
- Command invocation syntax
- Output formatting requirements
