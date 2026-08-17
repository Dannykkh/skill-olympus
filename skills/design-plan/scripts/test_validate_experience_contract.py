#!/usr/bin/env python3

from __future__ import annotations

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


if __name__ == "__main__":
    unittest.main()
