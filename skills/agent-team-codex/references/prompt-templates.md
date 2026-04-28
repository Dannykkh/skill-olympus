# Prompt Templates

## 1) Explorer 스폰

```text
spawn explorer to analyze {target_scope}, map dependency risks, and propose a wave plan. no edits.
```

## 2) Worker 스폰

```text
spawn worker for {owned_files}. implement {task_goal}. run related tests. edit only {owned_files}. log activity to conversations/{date}-team-poseidon.md (START/DECISION/ERROR/FILE/DONE). if docs/domain-dictionary.md exists, follow it strictly: use its english identifiers for code symbols, korean labels for UI strings, and never use forbidden terms listed in the dictionary.
```

## 3) Custom Worker 스폰

```text
spawn fast_worker for {owned_files}. implement {task_goal}. keep output concise and run tests. follow docs/domain-dictionary.md if present.
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
spawn worker for {section_files}. implement section {section_id} from docs/plan/{plan_name}/sections/{section_file}. edit only assigned files and run tests. log activity to conversations/{date}-team-poseidon.md (START/DECISION/ERROR/FILE/DONE). if docs/domain-dictionary.md exists, follow it strictly: english identifiers for code, korean labels for UI, no forbidden terms.
```

## 6) 도메인사전 컨텍스트 (모든 worker 공통)

`docs/domain-dictionary.md`가 존재하면 **모든 worker 프롬프트 끝에 다음을 추가**:

```text

## Domain Dictionary (필수 준수)

The project has a confirmed domain dictionary at docs/domain-dictionary.md.
You MUST:
- Use the english identifiers from the dictionary for all code symbols (class/function/variable/type names)
- Use the korean labels from the dictionary for all UI strings (menus, buttons, messages)
- Never use forbidden terms (e.g. if dictionary says cart, never use basket/bag)
- If you encounter a new domain term not in the dictionary, report it to the lead instead of inventing one
- Technical infrastructure terms (cache, queue, worker, etc.) are not subject to this rule
```
