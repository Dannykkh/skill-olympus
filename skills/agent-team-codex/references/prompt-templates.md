# Prompt Templates

## 1) Explorer 스폰

```text
spawn explorer to analyze {target_scope}, map dependency risks, and propose a wave plan. no edits.
```

## 2) Worker 스폰

공유 파일 접근이 가능하면 프로젝트 루트·섹션·참조의 정확한 절대경로를 전달하고 직접 읽게 합니다.
프롬프트에는 목표·AC ID·필수 제약·소유권·선행 계약·검증 명령과 아래 반환 형식을 남깁니다.
접근할 수 없을 때만 담당 범위에 필요한 원문을 포함하고, 부족한 입력은 Lead에게 반환하게 합니다.

```text
spawn worker for {owned_files} in {project_root_absolute}. read {input_absolute_paths}. implement {task_goal} with {ac_ids}, {essential_constraints}, and {dependency_contracts}. run {related_verification_commands}. edit only {owned_files}. if an edge case forces a deviation from the plan, choose the conservative option and include reason/alternative/affected files under "Deviations" in the final report. return changed files, commands/results, AC ID | evidence | proposed state, deviations, and remaining risks. do not edit shared activity logs or implementation-notes.md; the lead owns them. if docs/domain-dictionary.md exists, follow it strictly: use its english identifiers for code symbols, korean labels for UI strings, and never use forbidden terms listed in the dictionary.
```

## 3) 리드 통합 지시

실패한 worker는 실패 명령·출력 또는 로그 경로, 시도한 변경, 부족했던 입력을 반환합니다.
실행 방식 변경은 Lead가 판단합니다. 비교 태스크에는 Lead가 고정한 시작 상태·입력·검증 기준·
남은 상한과 변경 가설 하나를 전달하고, worker는 실제 산출물·실행 결과·관측 비용을 반환합니다.

```text
summarize all active agent outputs, list conflicts by file, then produce a merge-ready final plan.
```

## 4) 섹션 모드 템플릿

```text
spawn explorer to parse {sections_index_absolute}, extract dependencies, and return wave groups. flag missing dependency targets; never drop unresolved dependencies. no edits.
```

```text
spawn worker for {section_files} in {project_root_absolute}. read {section_file_absolute} and {reference_absolute_paths}; implement section {section_id}, preserving {ac_ids}, {essential_constraints}, and {dependency_contracts}. edit only assigned files and run {related_verification_commands}. if an edge case forces a deviation from the section plan, choose the conservative option and return reason/alternative/affected files under "Deviations". return changed files, commands/results, AC ID | evidence | proposed state, deviations, and remaining risks. do not edit shared activity logs or implementation-notes.md; the lead owns them. if docs/domain-dictionary.md exists, follow it strictly: english identifiers for code, korean labels for UI, no forbidden terms.
```

## 5) 도메인사전 컨텍스트 (모든 worker 공통)

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
