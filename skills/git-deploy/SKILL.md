# Git Deploy Skill

Git push with deploy mode selection for Git Deploy Monitor integration.

---

## Triggers

| Trigger | Example |
|---------|---------|
| Deploy to server | "/git-deploy", "deploy", "push and deploy" |
| Reset deploy | "/git-deploy reset", "deploy with reset" |

---

## Workflow

```
/git-deploy
    │
    ▼
┌─────────────────────────────────────────┐
│ 1. Check git status                     │
│    - Uncommitted changes?               │
│    - What files changed?                │
├─────────────────────────────────────────┤
│ 2. Analyze changes                      │
│    - DB schema changes? (migrations/)   │
│    - Code only changes?                 │
│    - deploy.bat changes?                │
├─────────────────────────────────────────┤
│ 3. Ask deploy mode (AskUserQuestion)    │
│    - UPDATE: Keep DB, cache build       │
│    - RESET: Delete DB, full reinstall   │
├─────────────────────────────────────────┤
│ 4. Write .deploy-mode file              │
│    - "update" or "reset"                │
├─────────────────────────────────────────┤
│ 5. Commit all changes                   │
│    - Include .deploy-mode               │
│    - Descriptive commit message         │
├─────────────────────────────────────────┤
│ 6. Push to remote                       │
│    - Git Deploy Monitor will detect     │
│    - deploy.bat auto will run           │
└─────────────────────────────────────────┘
```

---

## Deploy Modes

| Mode | .deploy-mode | Action |
|------|--------------|--------|
| **Update** | `update` | DB preserved, Docker cache build (~30s-2min) |
| **Reset** | `reset` | DB deleted, full reinstall (~3-5min) |

---

## Instructions

### Step 1: Check Git Status

```bash
git status
git diff --stat
```

Show user what will be deployed.

### Step 2: Analyze Changes

Check for:
- `database/migrations/*.sql` - New migrations = suggest UPDATE
- `database/schema.sql` changes - Major DB changes = warn about RESET
- `backend/` or `frontend/` only - Code changes = suggest UPDATE
- First deploy - suggest RESET

### Step 3: Ask Deploy Mode

Use AskUserQuestion:

```
Which deploy mode?

[UPDATE (Recommended)]
- Keep existing database
- Use Docker cache (fast)
- Apply new migrations only

[RESET]
- Delete all data
- Full reinstall
- Use for major DB schema changes
```

If RESET selected, confirm:
```
WARNING: All database data will be deleted!
Are you sure? (yes/no)
```

### Step 4: Write .deploy-mode

Create `.deploy-mode` file in project root:

```bash
echo "update" > .deploy-mode
# or
echo "reset" > .deploy-mode
```

### Step 5: Commit Changes

Stage all changes including .deploy-mode:

```bash
git add -A
git commit -m "deploy: [description]

Mode: UPDATE|RESET
Changes:
- [list of changes]

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

### Step 6: Push

```bash
git push origin master
```

Report success:
```
✅ Pushed to origin/master
📡 Git Deploy Monitor will auto-deploy
🔧 Mode: UPDATE (DB preserved)
```

---

## deploy.bat Integration

The deploy.bat must read `.deploy-mode` file:

```batch
REM Read deploy mode from file
set "DEPLOY_MODE=update"
if exist ".deploy-mode" (
    set /p DEPLOY_MODE=<.deploy-mode
    del .deploy-mode >nul 2>&1
)

if /i "!DEPLOY_MODE!"=="reset" (
    set "MODE=reset"
) else (
    set "MODE=update"
)
```

---

## Examples

### Example 1: Code-only change
```
User: /git-deploy
Assistant:
  Changes detected:
  - frontend/src/pages/WeeklyReport.tsx (modified)

  Recommended: UPDATE (code only, no DB changes)

  [Asks user to confirm UPDATE mode]
  [Writes .deploy-mode = update]
  [Commits and pushes]
```

### Example 2: New migration
```
User: /git-deploy
Assistant:
  Changes detected:
  - database/migrations/003_add_new_table.sql (new)
  - backend/app/models/new_model.py (new)

  Recommended: UPDATE (new migration will be applied)

  [Asks user to confirm]
  [Commits and pushes]
```

### Example 3: Major schema change
```
User: /git-deploy reset
Assistant:
  WARNING: RESET mode requested
  - All database data will be deleted
  - Full reinstall will be performed

  [Confirms with user]
  [Writes .deploy-mode = reset]
  [Commits and pushes]
```

---

## Anti-Patterns

| Avoid | Why | Instead |
|-------|-----|---------|
| Push without asking mode | User should decide | Always ask |
| Default to RESET | Data loss risk | Default to UPDATE |
| Skip .deploy-mode | Deploy won't know mode | Always write file |
| Forget to delete .deploy-mode after use | Next deploy might use wrong mode | deploy.bat deletes it |

---

## Checklist

- [ ] Git status checked
- [ ] Changes analyzed
- [ ] Deploy mode selected by user
- [ ] .deploy-mode file written
- [ ] All changes committed
- [ ] Pushed to remote
- [ ] Success message shown
