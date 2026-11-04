#!/usr/bin/env python3

from __future__ import annotations

import re
import tempfile
import unittest
from pathlib import Path

from validate_experience_contract import validate_contract


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

    def test_object_flows_not_applicable_skips_flow_checks(self) -> None:
        flows = "## Object Flows\n- NOT APPLICABLE — single landing page\n"
        result = self.validate_text(with_object_flows(flows))
        self.assertTrue(result["valid"], result)
        self.assertNotIn("scenario facts", result["missingSections"])


if __name__ == "__main__":
    unittest.main()
