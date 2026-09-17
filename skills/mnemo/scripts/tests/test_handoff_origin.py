"""Origin records why the work was requested — the one thing a session cannot recover later.

It is gated the same way the composition diagram is: required when the session actually
built or changed a feature, waived when it only explored, tidied, or wrote docs. Forcing
it everywhere would make handoffs heavier, which is how the last inventory died.
"""

import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parents[1]
VALIDATE = SCRIPTS / "validate_handoff.py"
CREATE = SCRIPTS / "create_handoff.py"

ORIGIN = """## Origin

| 항목 | 내용 |
|------|------|
| 요구 | 사용자가 계정으로 로그인하게 해달라 |
| 출처 | 사용자 요청 2026-09-16 |
| 해결할 문제 | 공유 계정을 쓰고 있어 감사 추적이 불가능하다 |
"""

BODY = """## Current State Summary

로그인 기능을 구현했고 통합 테스트까지 통과한 상태로 남겨두었습니다. 다음 세션은 권한 검사를 이어가면 됩니다.

## Feature/Flow/Decision Snapshot

이 세션이 구현한 기능의 지도입니다. 아래 표와 구성도를 함께 보면 전체 흐름을 파악할 수 있습니다.

### Implemented Features

| Feature/Change | Visible Behavior | Entry Point | Implementation Anchors | Verification |
|---|---|---|---|---|
| {feature_row} |

### Composition Diagram

```mermaid
flowchart TB
    User --> Login --> AuthService
```

## Important Context

인증 토큰은 메모리에만 두고 디스크에 쓰지 않습니다. 이 제약은 보안 검토에서 합의된 사항입니다.

## Immediate Next Steps

1. 권한 검사 구현을 이어가고 만료 정책을 정한다
2. 세션 만료 처리를 추가하고 회귀 테스트를 작성한다
"""

FEATURE_ROW = "로그인 | 사용자가 로그인할 수 있다 | /login | src/Auth.cs | 통합 테스트"
NON_FEATURE_ROW = "none — 탐색만 한 세션 | - | - | - | -"


class HandoffOriginTests(unittest.TestCase):
    def validate(self, path):
        return subprocess.run([sys.executable, str(VALIDATE), str(path)],
                              capture_output=True, text=True, encoding="utf-8",
                              errors="replace", timeout=60)

    def write_handoff(self, temp, *, origin: str, feature: bool):
        path = Path(temp) / "docs" / "handoffs"
        path.mkdir(parents=True)
        doc = path / "2026-09-16-120000-login.md"
        row = FEATURE_ROW if feature else NON_FEATURE_ROW
        doc.write_text("# Handoff: 로그인\n\n" + origin + "\n" + BODY.format(feature_row=row),
                       encoding="utf-8")
        return doc

    def test_feature_session_without_origin_is_rejected(self):
        with tempfile.TemporaryDirectory() as temp:
            doc = self.write_handoff(temp, origin="", feature=True)
            result = self.validate(doc)
            self.assertIn("Origin (missing)", result.stdout)
            self.assertIn("NEEDS WORK", result.stdout)
            self.assertNotEqual(result.returncode, 0)

    def test_feature_session_with_origin_passes(self):
        with tempfile.TemporaryDirectory() as temp:
            doc = self.write_handoff(temp, origin=ORIGIN, feature=True)
            result = self.validate(doc)
            self.assertNotIn("Origin (missing)", result.stdout)
            self.assertNotIn("Origin (incomplete)", result.stdout)
            self.assertIn("READY for handoff", result.stdout)

    def test_non_feature_session_is_not_forced_to_state_an_origin(self):
        """탐색만 한 세션에까지 요구하면 핸드오프가 무거워진다 — 다이어그램과 같은 판단."""
        with tempfile.TemporaryDirectory() as temp:
            doc = self.write_handoff(temp, origin="", feature=False)
            result = self.validate(doc)
            self.assertNotIn("Origin", result.stdout)

    def test_unfilled_origin_placeholder_does_not_count_as_filled(self):
        with tempfile.TemporaryDirectory() as temp:
            placeholder = ("## Origin\n\n| 항목 | 내용 |\n|---|---|\n"
                           "| 요구 | [TODO: 요청받은 것] |\n| 출처 | [TODO: 출처] |\n"
                           "| 해결할 문제 | [TODO: 문제] |\n")
            doc = self.write_handoff(temp, origin=placeholder, feature=True)
            result = self.validate(doc)
            self.assertIn("Origin (incomplete)", result.stdout)

    def test_scaffold_emits_origin_and_inherits_source_when_continuing(self):
        with tempfile.TemporaryDirectory() as temp:
            project = Path(temp) / "project"
            project.mkdir()
            subprocess.run(["git", "init", "-q"], cwd=project, check=True, timeout=30)

            first = subprocess.run([sys.executable, str(CREATE), "first-task"], cwd=project,
                                   capture_output=True, text=True, encoding="utf-8",
                                   errors="replace", timeout=60)
            self.assertEqual(first.returncode, 0, first.stderr)
            created = sorted((project / "docs" / "handoffs").glob("*.md"))
            self.assertEqual(len(created), 1)
            self.assertIn("## Origin", created[0].read_text(encoding="utf-8"))

            second = subprocess.run(
                [sys.executable, str(CREATE), "second-task", "--continues-from", created[0].name],
                cwd=project, capture_output=True, text=True, encoding="utf-8",
                errors="replace", timeout=60)
            self.assertEqual(second.returncode, 0, second.stderr)
            newest = max((project / "docs" / "handoffs").glob("*.md"), key=lambda p: p.name)
            text = newest.read_text(encoding="utf-8")
            # 이어받은 세션은 출처를 다시 묻지 않고 선행 핸드오프를 가리킨다.
            self.assertIn(created[0].name, text.split("## Current State Summary")[0])


if __name__ == "__main__":
    unittest.main()
