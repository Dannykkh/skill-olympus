# Prompt Templates

## 1) Explorer 스폰

```text
spawn explorer to analyze {target_scope}, map dependency risks, and propose a wave plan. no edits.
```

## 2) Worker 스폰

```text
spawn worker for {owned_files}. implement {task_goal}. run related tests. edit only {owned_files}. log activity to conversations/{date}-team-dannys.md (START/DECISION/ERROR/FILE/DONE).
```

## 3) Custom Worker 스폰

```text
spawn fast_worker for {owned_files}. implement {task_goal}. keep output concise and run tests.
```

## 4) 리드 통합 지시

```text
summarize all active agent outputs, list conflicts by file, then produce a merge-ready final plan.
```

## 5) 섹션 모드 템플릿

```text
spawn explorer to parse docs/plan/{plan_name}/sections/index.md, extract dependencies, and return wave groups. no edits.
```

```text
spawn worker for {section_files}. implement section {section_id} from docs/plan/{plan_name}/sections/{section_file}. edit only assigned files and run tests. log activity to conversations/{date}-team-dannys.md (START/DECISION/ERROR/FILE/DONE).
```
