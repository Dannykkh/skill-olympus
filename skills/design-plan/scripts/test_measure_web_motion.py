"""Known-good and deliberately broken browser controls for motion measurement."""

from __future__ import annotations

import copy
import os
import tempfile
import unittest
from pathlib import Path

from measure_web_motion import capture, evaluate_checks, validate_scenario


FIXTURE = """<!doctype html><html lang="en"><meta charset="utf-8">
<style>
body {margin:0; min-height:2600px; background:#eee;}
button {position:fixed; top:10px; left:10px; height:30px;}
#disc {position:absolute; left:40px; top:90px; width:40px; height:40px;
       background:#254b87; transition:transform 300ms linear;}
#disc.active {transform:translateX(100px);}
canvas {position:absolute; left:40px; top:200px;}
FAULT_STYLE
@media(prefers-reduced-motion:reduce) {#disc {transition:none;}}
</style>
<button id="activate">Move object</button><div id="disc"></div>
<canvas id="scene" width="160" height="80"></canvas>
<script>
const scene = document.querySelector('#scene'), ctx = scene.getContext('2d');
window.motionState = {x:20};
function draw() {
  ctx.clearRect(0,0,160,80); ctx.fillStyle='#254b87';
  ctx.fillRect(motionState.x,20,20,20);
}
draw();
document.querySelector('#activate').addEventListener('click', () => {
  FAULT_HANDLER
  document.querySelector('#disc').classList.add('active');
  motionState.x=120; draw();
});
</script></html>"""


def scenario() -> dict:
    return {
        "observe": {"disc": "#disc"}, "warmup_ms": 80, "sample_ms": 8,
        "steps": [{"action": "click", "selector": "#activate"}, {"action": "wait", "ms": 700}],
        "checks": [
            {"kind": "range", "metric": "elements.disc.document_x", "min": 95},
            {"kind": "visits", "metric": "elements.disc.document_x", "min": 65, "max": 115},
            {"kind": "settled", "metric": "elements.disc.document_x", "window_ms": 180, "max": 0.5},
        ],
    }


class ContractTests(unittest.TestCase):
    def test_missing_metric_cannot_pass(self) -> None:
        samples = [{"time_ms": 0}, {"time_ms": 500}]
        self.assertEqual(evaluate_checks(samples, scenario()["checks"])[0]["status"], "FAIL")

    def test_insufficient_settling_window_cannot_pass(self) -> None:
        samples = [{"time_ms": 0, "state": {"x": 2}}, {"time_ms": 90, "state": {"x": 2}}]
        check = {"kind": "settled", "metric": "state.x", "window_ms": 200, "max": 1}
        self.assertEqual(evaluate_checks(samples, [check])[0]["status"], "FAIL")

    def test_nonfinite_state_cannot_pass(self) -> None:
        samples = [{"time_ms": 0, "state": {"x": 0}}, {"time_ms": 500, "state": {"x": float("nan")}}]
        check = {"kind": "final", "metric": "state.x", "max": 100}
        self.assertEqual(evaluate_checks(samples, [check])[0]["status"], "FAIL")

    def test_invalid_action_and_bounds_are_rejected(self) -> None:
        for change in ({"steps": [{"action": "teleport"}]},
                       {"checks": [{"kind": "final", "metric": "state.x", "min": 20, "max": 10}]}):
            with self.subTest(change=change), self.assertRaises(ValueError):
                validate_scenario({**scenario(), **change})


class BrowserTests(unittest.TestCase):
    def setUp(self) -> None:
        self.directory = tempfile.TemporaryDirectory(prefix="aphrodite-motion-")
        self.addCleanup(self.directory.cleanup)
        self.target = Path(self.directory.name) / "motion fixture.html"
        self.channel = os.environ.get("APHRODITE_BROWSER_CHANNEL")

    def page(self, fault: str = "") -> str:
        html = FIXTURE.replace("FAULT_STYLE", "#disc {transition:none;}" if fault == "jump" else "")
        self.target.write_text(html.replace("FAULT_HANDLER", "return;" if fault == "dead" else ""), encoding="utf-8")
        return str(self.target)

    def measure(self, config: dict | None = None, fault: str = "", **kwargs) -> dict:
        return capture(self.page(fault), config or scenario(), channel=self.channel, **kwargs)

    def test_real_click_continuous_transition_and_settling_pass(self) -> None:
        report = self.measure()
        self.assertEqual(report["status"], "PASS", report["checks"])
        self.assertGreater(len(report["samples"]), 10)
        clicks = [event for event in report["inputs"] if event["type"] == "click"]
        self.assertEqual(len(clicks), 1)
        self.assertTrue(clicks[0]["trusted"])
        self.assertLess(clicks[0]["time_ms"], report["samples"][-1]["time_ms"])
        self.assertAlmostEqual(report["samples"][-1]["elements"]["disc"]["document_x"], 140, delta=0.1)

    def test_jump_reaches_destination_but_fails_transition_contract(self) -> None:
        report = self.measure(fault="jump")
        self.assertEqual(report["checks"][0]["status"], "PASS")
        self.assertEqual(report["checks"][1]["status"], "FAIL")
        self.assertEqual(report["status"], "FAIL")

    def test_dead_interaction_fails_response_contract(self) -> None:
        report = self.measure(fault="dead")
        self.assertEqual(report["status"], "FAIL")
        self.assertEqual(report["checks"][0]["status"], "FAIL")

    def test_native_scroll_is_distinct_from_object_motion(self) -> None:
        config = scenario()
        config["steps"] = [{"action": "wheel", "dy": 350}, {"action": "wait", "ms": 350}]
        config["checks"] = [
            {"kind": "range", "metric": "elements.disc.document_y", "max": 0.5},
            {"kind": "range", "metric": "elements.disc.viewport_y", "min": 200},
        ]
        report = self.measure(config)
        self.assertEqual(report["status"], "PASS", report["checks"])
        self.assertTrue(any(event["type"] == "wheel" and event["deltaY"] == 350 for event in report["inputs"]))

    def test_canvas_state_is_measured_separately_from_its_dom_box(self) -> None:
        config = scenario()
        config.update(observe={"canvas": "#scene"}, state="motionState")
        config["checks"] = [
            {"kind": "range", "metric": "state.x", "min": 95},
            {"kind": "range", "metric": "elements.canvas.document_x", "max": 0.5},
        ]
        report = self.measure(config)
        self.assertEqual(report["status"], "PASS", report["checks"])

    def test_reduced_motion_keeps_content_and_final_action_available(self) -> None:
        config = scenario()
        config["checks"] = [
            {"kind": "final", "metric": "elements.disc.document_x", "min": 139, "max": 141},
            {"kind": "final", "metric": "elements.disc.width", "min": 39},
            {"kind": "final", "metric": "elements.disc.opacity", "min": 1},
        ]
        report = self.measure(config, width=390, height=844, reduced_motion=True)
        self.assertEqual(report["status"], "PASS", report["checks"])
        self.assertTrue(report["reduced_motion"])

    def test_measurement_without_contract_does_not_claim_pass(self) -> None:
        config = scenario()
        config["checks"] = []
        report = self.measure(config)
        self.assertEqual(report["status"], "UNVERIFIED")

    def test_broken_state_reader_fails_even_when_dom_contract_passes(self) -> None:
        config = copy.deepcopy(scenario())
        config["state"] = "notInstalled.read"
        report = self.measure(config)
        self.assertEqual(report["status"], "FAIL")
        self.assertTrue(report["errors"])


if __name__ == "__main__":
    unittest.main()
