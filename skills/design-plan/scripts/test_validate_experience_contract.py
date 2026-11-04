#!/usr/bin/env python3

from __future__ import annotations

import re
import tempfile
import unittest
from pathlib import Path

from validate_experience_contract import (
    BENCHMARK_SECTIONS,
    COMMON_SECTIONS,
    FLOW_SECTIONS,
    ROLE_SECTIONS,
    normalize,
    validate_contract,
    validate_product,
)


VALID_PRODUCT = """# PRODUCT.md — 플로우보드

## Strategy

| Decision | Value | Source |
|---|---|---|
| 핵심 사람 | 가입 직후 프로젝트 0개인 팀 리더 | AI 권장 — docs/plan/projectflow/spec.md P1 |
| 첫 과업 | 첫 프로젝트 생성 → 팀원 초대 | 사용자 — 2026-11-04 대화 |

## Scope

| Kind | Item | Reason | Reopen When | Source |
|---|---|---|---|---|
| include | 프로젝트 생성 마법사 | 첫 가치 도달 | - | AI 권장 — docs/athena/projectflow.md |
| exclude | 팀 성과 KPI 대시보드 | 보여줄 데이터 없음 | 활성 팀 100개 이후 | AI 권장 — docs/athena/projectflow.md |

## Open Decisions

| Decision | Layer | Recommendation | Owner |
|---|---|---|---|
| member의 초대 권한 | scope | 숨김 | 제품 소유자 |
"""


VALID_BENCHMARK = """# Experience Contract: PDF Library

## Source Mode
- Mode: benchmark
- Evidence: docs/design-refs/2026-08-09-benchmark-reader.md

## Product Facts
| Claim | Source | Captured at | Freshness/status | Allowed presentation |
|---|---|---|---|---|
| The file was opened before | local reading history | 2026-08-09 | current | Show the recorded timestamp |

## Benchmark Sources
- https://example.com captured on 2026-08-09 for structure only.

## Page Goal
- Resume the most recent document.

## Audience and Tasks
- Researchers resume reading and recover from missing files.

## Header and Navigation
- Library, search, and add-document action in that order.

## Core Message
- Resume where you stopped, supported by real progress data.

## Content Integrity
| Content item | Classification | Evidence | Presentation rule |
|---|---|---|---|
| Reading progress | verified | local reading history | Show the recorded value only |

## Section Order
1. Recent document
2. Library
3. Reading history

## CTA Strategy
- Primary: Continue reading.

## Trust Strategy
- Show the local filename and last-opened timestamp before the action.

## Asset Provenance
- Not applicable — project-internal icons and text only.

## Desktop Structure
- A library pane and a reading pane share the viewport.

## Mobile Transformations
| Desktop element | Operation | Mobile result | Reason |
|---|---|---|---|
| Two panes | replace | Library then full-screen reader | Preserve reading width |

## States
| State | Trigger | User sees | Available action | Recovery |
|---|---|---|---|---|
| loading | open | progress | cancel | retry |
| empty | no files | explanation | add PDF | add PDF |
| error | missing file | reason | locate file | choose replacement |
| success | opened | page | read | continue |

## Performance Budget
- Defer PDF page rendering outside the viewport.

## Accessibility Contract
- Preserve heading order, keyboard focus, labels, and reduced motion.

## Adopt
- Show actual progress as evidence.

## Adapt
- Convert a commerce sticky CTA to reading controls.

## Avoid
- Avoid autoplay media.

## Prompt Contract
GOAL — Resume reading.
TASK — Open the latest PDF.
FACTS — Use local reading history only.
CONTENT_INTEGRITY — Mark recorded values as verified.
ASSETS — Use project-internal icons and text only.
RESPONSIVE — Replace panes with sequential views.
STATES — Implement loading, empty, error, and success.
SUCCESS — A user resumes in one action.

## Success Checks
- The latest document and primary action are clear.
"""


OBJECT_FLOWS = """
## Object Flows
| Object | Create | View | Edit | After |
|---|---|---|---|---|
| 수업 예약 | class-detail → booking-form | my-bookings | booking-cancel | booking-done (예약 완료) |
| 리뷰 | review-write | class-detail | n/a — 작성 후 수정 없음(PRD F9) | review-done |

## Scenario Facts
| Fact | Value | Screens |
|---|---|---|
| 남은 수강 횟수 | 7회 | home, my-pass, booking-done |
"""


def with_object_flows(flows: str = OBJECT_FLOWS) -> str:
    return VALID_BENCHMARK.replace("## Performance Budget", flows.strip() + "\n\n## Performance Budget")


class ExperienceContractValidationTests(unittest.TestCase):
    def validate_text(self, text: str) -> dict[str, object]:
        with tempfile.TemporaryDirectory() as temp_dir:
            path = Path(temp_dir) / "experience.md"
            path.write_text(text, encoding="utf-8")
            return validate_contract(path)

    def test_valid_benchmark_contract_passes(self) -> None:
        result = self.validate_text(VALID_BENCHMARK)
        self.assertTrue(result["valid"], result)
        self.assertEqual(result["mode"], "benchmark")

    def test_missing_benchmark_decisions_fail(self) -> None:
        invalid = VALID_BENCHMARK.replace("## Adopt", "## Removed Adopt")
        result = self.validate_text(invalid)
        self.assertFalse(result["valid"])
        self.assertIn("adopt", result["missingSections"])

    def test_mobile_stack_without_operation_fails(self) -> None:
        invalid = VALID_BENCHMARK.replace(
            "| Two panes | replace | Library then full-screen reader | Preserve reading width |",
            "- Stack all columns on mobile.",
        )
        result = self.validate_text(invalid)
        self.assertFalse(result["valid"])
        self.assertTrue(
            any("transformation operation" in error for error in result["errors"])
        )

    def test_product_derived_does_not_require_benchmark_decisions(self) -> None:
        contract = VALID_BENCHMARK.replace("Mode: benchmark", "Mode: product-derived")
        for heading in ("Benchmark Sources", "Adopt", "Adapt", "Avoid"):
            start = contract.index(f"## {heading}")
            next_heading = contract.find("\n## ", start + 4)
            if next_heading == -1:
                contract = contract[:start]
            else:
                contract = contract[:start] + contract[next_heading + 1 :]
        result = self.validate_text(contract)
        self.assertTrue(result["valid"], result)

    def test_missing_content_evidence_sections_fail(self) -> None:
        invalid = VALID_BENCHMARK.replace("## Product Facts", "## Removed Product Facts")
        invalid = invalid.replace("## Asset Provenance", "## Removed Asset Provenance")
        result = self.validate_text(invalid)
        self.assertFalse(result["valid"])
        self.assertIn("product facts", result["missingSections"])
        self.assertIn("asset provenance", result["missingSections"])

    def test_placeholder_classification_warns_without_shape_failure(self) -> None:
        contract = VALID_BENCHMARK.replace(
            "| Reading progress | verified | local reading history | Show the recorded value only |",
            "| Example progress | placeholder | none | Replace before final delivery |",
        )
        result = self.validate_text(contract)
        self.assertTrue(result["valid"], result)
        self.assertTrue(
            any("placeholder content" in warning for warning in result["warnings"])
        )

    def test_complete_object_flows_pass(self) -> None:
        result = self.validate_text(with_object_flows())
        self.assertTrue(result["valid"], result)

    def test_object_flow_ending_on_its_list_screen_fails(self) -> None:
        # 업스트림 v14에서 끝 칸에 완료 화면 대신 목록 화면을 적어 형식만 통과한 실패를 막는다.
        flows = OBJECT_FLOWS.replace("| booking-done (예약 완료) |", "| my-bookings |")
        result = self.validate_text(with_object_flows(flows))
        self.assertFalse(result["valid"])
        self.assertTrue(
            any("must end on a result screen" in error for error in result["errors"]),
            result,
        )

    def test_after_with_reasoned_na_still_fails(self) -> None:
        # 결과 화면을 그리지 않으려고 끝 칸에 이유 붙은 n/a를 적어도 통과하지 않는다.
        flows = OBJECT_FLOWS.replace("| review-done |", "| n/a — 결과 화면 없음 |")
        result = self.validate_text(with_object_flows(flows))
        self.assertFalse(result["valid"])
        self.assertTrue(
            any("has no After screen" in error for error in result["errors"]),
            result,
        )

    def test_object_flows_require_scenario_facts(self) -> None:
        flows = OBJECT_FLOWS[: OBJECT_FLOWS.index("## Scenario Facts")]
        result = self.validate_text(with_object_flows(flows))
        self.assertFalse(result["valid"])
        self.assertIn("scenario facts", result["missingSections"])

    def test_bare_na_edit_and_missing_create_fail(self) -> None:
        flows = OBJECT_FLOWS.replace("| n/a — 작성 후 수정 없음(PRD F9) |", "| n/a |")
        flows = flows.replace("| review-write |", "| - |")
        result = self.validate_text(with_object_flows(flows))
        self.assertFalse(result["valid"])
        errors = " ".join(result["errors"])
        self.assertIn("needs an Edit screen", errors)
        self.assertIn("has no Create screen", errors)

    def test_korean_mobile_app_guide_examples_pass(self) -> None:
        # 참조 문서의 예시를 그대로 넣었을 때 통과해야 문서와 검증기가 같은 계약을 말한다.
        guide = Path(__file__).resolve().parent.parent / "references" / "korean-mobile-app.md"
        blocks = re.findall(r"```markdown\r?\n(.*?)```", guide.read_text(encoding="utf-8"), re.DOTALL)
        flows = [block for block in blocks if "## Object Flows" in block]
        facts = [block for block in blocks if "## Scenario Facts" in block]
        self.assertEqual((len(flows), len(facts)), (1, 1))
        result = self.validate_text(with_object_flows(flows[0] + "\n" + facts[0]))
        self.assertTrue(result["valid"], result)

    def test_braces_inside_code_spans_are_not_placeholders(self) -> None:
        # 기준선 S3: 링크 이름 표기 `{프로젝트명} 보드`(런타임 보간)를 빈칸으로 오탐했다.
        line = "- Preserve heading order, keyboard focus, labels, and reduced motion."
        coded = VALID_BENCHMARK.replace(line, line + " Row links read `{프로젝트명} 보드`.")
        self.assertTrue(self.validate_text(coded)["valid"])
        bare = VALID_BENCHMARK.replace(line, line + " Row links read {프로젝트명} 보드.")
        result = self.validate_text(bare)
        self.assertFalse(result["valid"])
        self.assertIn("accessibility contract", result["placeholderSections"])

    def with_open_decisions(self, rows: str) -> str:
        table = (
            "## Open Decisions\n"
            "| Decision | Layer | Recommendation | Owner |\n|---|---|---|---|\n" + rows + "\n\n"
        )
        return VALID_BENCHMARK.replace("## Performance Budget", table + "## Performance Budget")

    def test_open_structure_decision_passes_with_a_warning(self) -> None:
        result = self.validate_text(
            self.with_open_decisions("| 초대 링크 유효 기간 | structure | 7일 | 제품 소유자 |")
        )
        self.assertTrue(result["valid"], result)
        self.assertTrue(any("초대 링크 유효 기간" in w for w in result["warnings"]), result)

    def test_open_strategy_or_scope_decision_blocks_implementation(self) -> None:
        result = self.validate_text(
            self.with_open_decisions(
                "| 첫 화면의 주인 | strategy | 프로젝트 0개인 신규 owner | 제품 소유자 |\n"
                "| 팀 성과 탭 포함 여부 | scope | MVP 제외 유지 | 제품 소유자 |"
            )
        )
        self.assertFalse(result["valid"])
        self.assertEqual(result["blockingDecisions"], ["첫 화면의 주인", "팀 성과 탭 포함 여부"])

    def test_open_decision_needs_layer_recommendation_and_owner(self) -> None:
        result = self.validate_text(
            self.with_open_decisions(
                "| 기간 기본값 | layout | 4주 | 제품 소유자 |\n| 집계 주기 | structure | - | - |"
            )
        )
        self.assertFalse(result["valid"])
        errors = " ".join(result["errors"])
        self.assertIn("'기간 기본값' needs a layer", errors)
        self.assertIn("'집계 주기' needs a recommendation", errors)
        self.assertIn("'집계 주기' needs an owner", errors)

    def test_undecided_markers_without_ledger_warn(self) -> None:
        contract = VALID_BENCHMARK.replace(
            "- Resume the most recent document.",
            "- Resume the most recent document. 대상 사용자는 미결.",
        )
        result = self.validate_text(contract)
        self.assertTrue(result["valid"], result)
        self.assertTrue(any("Open Decisions" in w for w in result["warnings"]), result)

    def validate_product_text(self, text: str) -> dict[str, object]:
        with tempfile.TemporaryDirectory() as temp_dir:
            path = Path(temp_dir) / "PRODUCT.md"
            path.write_text(text, encoding="utf-8")
            return validate_product(path)

    def test_valid_product_passes_and_lists_open_decisions_without_blocking(self) -> None:
        result = self.validate_product_text(VALID_PRODUCT)
        self.assertTrue(result["valid"], result)
        self.assertEqual(result["openDecisions"], ["member의 초대 권한"])

    def test_product_rows_need_one_of_three_source_labels(self) -> None:
        # "상류 문서"는 라벨이 아니다. 사람의 확인 기록이 없으면 AI 권장이다.
        text = VALID_PRODUCT.replace("| AI 권장 — docs/plan/projectflow/spec.md P1 |", "| spec.md |")
        result = self.validate_product_text(text)
        self.assertFalse(result["valid"])
        self.assertTrue(any("'핵심 사람' needs a source label" in e for e in result["errors"]), result)

    def test_product_exclusion_needs_reason_and_reopen_condition(self) -> None:
        text = VALID_PRODUCT.replace("| 활성 팀 100개 이후 |", "| - |")
        result = self.validate_product_text(text)
        self.assertFalse(result["valid"])
        self.assertTrue(any("needs a reason and a reopen condition" in e for e in result["errors"]))

    def test_product_scope_needs_an_exclusion_or_explicit_none(self) -> None:
        without = "\n".join(
            line for line in VALID_PRODUCT.splitlines() if not line.startswith("| exclude")
        )
        self.assertFalse(self.validate_product_text(without)["valid"])
        start = VALID_PRODUCT.index("## Scope")
        end = VALID_PRODUCT.index("## Open Decisions")
        explicit = VALID_PRODUCT[:start] + "## Scope\n\n해당 없음 — 단일 기능 도구\n\n" + VALID_PRODUCT[end:]
        self.assertTrue(self.validate_product_text(explicit)["valid"])

    def test_product_stays_within_sixty_lines(self) -> None:
        padded = VALID_PRODUCT + "\n".join(f"- 메모 {n}" for n in range(60))
        result = self.validate_product_text(padded)
        self.assertFalse(result["valid"])
        self.assertTrue(any("within 60" in e for e in result["errors"]))

    def test_guide_template_lists_every_section_the_validator_can_require(self) -> None:
        # 2026-11-04 재평가 N4: 검증기는 Role Variants를 요구하는데 템플릿에 절이 없어 작업자가 헤맸다.
        guide = Path(__file__).resolve().parent.parent / "references" / "experience-contract-guide.md"
        template = re.search(r"````markdown\r?\n(.*?)````", guide.read_text(encoding="utf-8"), re.DOTALL)
        self.assertIsNotNone(template)
        headings = {normalize(h) for h in re.findall(r"^## (.+?)\s*$", template.group(1), re.MULTILINE)}
        expected = set(COMMON_SECTIONS) | set(BENCHMARK_SECTIONS) | set(ROLE_SECTIONS) | set(FLOW_SECTIONS)
        expected |= {"system roles", "object flows", "open decisions"}
        self.assertEqual(sorted(expected - headings), [])

    def with_roles(self, variants: str | None) -> str:
        roles = (
            "## System Roles\n| Role ID | 표시명 | 화면 |\n|---|---|---|\n"
            "| owner | 팀 소유자 | 공용 권한차등 |\n| member | 팀원 | 공용 권한차등 |\n\n"
        )
        if variants is not None:
            roles += "## Role Variants\n| 요소 | owner | member |\n|---|---|---|\n" + variants + "\n\n"
        return VALID_BENCHMARK.replace("## Performance Budget", roles + "## Performance Budget")

    def test_system_roles_require_role_variants(self) -> None:
        result = self.validate_text(self.with_roles(None))
        self.assertFalse(result["valid"])
        self.assertIn("role variants", result["missingSections"])
        self.assertTrue(self.validate_text(self.with_roles("| 팀원 초대 | 표시 | 숨김 |"))["valid"])

    def test_role_variants_must_use_visibility_words(self) -> None:
        result = self.validate_text(self.with_roles("| 팀원 초대 | 있음 | 없음 |"))
        self.assertFalse(result["valid"])
        self.assertTrue(any("per-role visibility" in e for e in result["errors"]), result)

    def test_single_role_skips_role_variants(self) -> None:
        contract = VALID_BENCHMARK.replace(
            "## Performance Budget",
            "## System Roles\n- NOT APPLICABLE: single role\n\n## Performance Budget",
        )
        result = self.validate_text(contract)
        self.assertTrue(result["valid"], result)
        self.assertNotIn("role variants", result["missingSections"])

    def test_object_flows_not_applicable_skips_flow_checks(self) -> None:
        flows = "## Object Flows\n- NOT APPLICABLE — single landing page\n"
        result = self.validate_text(with_object_flows(flows))
        self.assertTrue(result["valid"], result)
        self.assertNotIn("scenario facts", result["missingSections"])


if __name__ == "__main__":
    unittest.main()
