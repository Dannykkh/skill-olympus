#!/usr/bin/env python3
"""Record real browser input and verify only scene-specific numeric contracts.

Python Playwright and a Chromium browser are optional runtime dependencies.
Without checks this tool records evidence and reports UNVERIFIED, never PASS.
"""

from __future__ import annotations

import argparse
import json
import math
import re
import sys
import uuid
from pathlib import Path
from typing import Any, TYPE_CHECKING

if TYPE_CHECKING:
    from playwright.sync_api import Page


RECORDER_JS = """({slot, observe, statePath, interval, limit}) => {
  const started = performance.now();
  const data = {samples: [], inputs: [], errors: [], raf: null};
  const inputTypes = ['pointermove', 'pointerdown', 'pointerup', 'wheel', 'click', 'keydown', 'keyup'];
  const recordInput = event => {
    if (data.inputs.length >= 10000) {
      if (!data.errors.includes('input budget exceeded')) data.errors.push('input budget exceeded');
      return;
    }
    const input = {type: event.type, time_ms: performance.now() - started, trusted: event.isTrusted};
    for (const field of ['clientX', 'clientY', 'button', 'deltaX', 'deltaY', 'deltaMode', 'key']) {
      if (event[field] !== undefined) input[field] = event[field];
    }
    data.inputs.push(input);
  };
  for (const type of inputTypes) document.addEventListener(type, recordInput, {capture: true, passive: true});
  const snapshot = () => {
    const elements = {};
    for (const [name, selector] of Object.entries(observe)) {
      const el = document.querySelector(selector);
      if (!el) { elements[name] = null; continue; }
      const r = el.getBoundingClientRect(), s = getComputedStyle(el);
      elements[name] = {
        viewport_x: r.x, viewport_y: r.y,
        document_x: r.x + scrollX, document_y: r.y + scrollY,
        width: r.width, height: r.height, opacity: Number(s.opacity),
        transform: s.transform, display: s.display, visibility: s.visibility,
        stroke_dashoffset: s.strokeDashoffset
      };
    }
    let state = null;
    if (statePath) {
      try {
        const keys = statePath.split('.');
        const leaf = keys.pop();
        const owner = keys.reduce((obj, key) => obj?.[key], window);
        const value = owner?.[leaf];
        if (value === undefined) throw new Error('state reader not found: ' + statePath);
        state = JSON.parse(JSON.stringify(
          typeof value === 'function' ? value.call(owner) : value));
      } catch (error) {
        const message = String(error);
        if (!data.errors.includes(message)) data.errors.push(message);
      }
    }
    data.samples.push({time_ms: performance.now() - started,
      scroll_x: scrollX, scroll_y: scrollY, elements, state});
  };
  const tick = () => {
    if (performance.now() - started > limit || data.samples.length >= 10000) {
      data.errors.push('capture exceeded its time/sample budget'); return;
    }
    const previous = data.samples[data.samples.length - 1];
    if (performance.now() - started - previous.time_ms >= interval) snapshot();
    data.raf = requestAnimationFrame(tick);
  };
  data.stop = () => {
    cancelAnimationFrame(data.raf); snapshot();
    for (const type of inputTypes) document.removeEventListener(type, recordInput, true);
    return {samples: data.samples, inputs: data.inputs, errors: data.errors};
  };
  window[slot] = data;
  snapshot(); data.raf = requestAnimationFrame(tick);
}"""


def is_number(value: Any) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)


def number(value: Any, label: str, minimum: float | None = None) -> float:
    if not is_number(value) or (minimum is not None and value < minimum):
        raise ValueError(f"{label} must be a finite number" +
                         (f" >= {minimum}" if minimum is not None else ""))
    return float(value)


def validate_scenario(scenario: dict[str, Any]) -> None:
    observe = scenario.get("observe", {})
    if not isinstance(observe, dict) or any(
        not re.fullmatch(r"[A-Za-z_][\w-]*", name) or not isinstance(selector, str) or not selector
        for name, selector in observe.items()
    ):
        raise ValueError("observe must map simple names to nonempty CSS selectors")
    state = scenario.get("state")
    if state is not None and (not isinstance(state, str) or
                              not re.fullmatch(r"[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*", state)):
        raise ValueError("state must be a dotted window property or snapshot method")
    if not observe and not state:
        raise ValueError("provide observe selectors or a state reader")
    number(scenario.get("sample_ms", 16), "sample_ms", 1)
    number(scenario.get("warmup_ms", 250), "warmup_ms", 0)
    if "ready" in scenario and (not isinstance(scenario["ready"], str) or not scenario["ready"]):
        raise ValueError("ready must be a nonempty CSS selector")
    steps = scenario.get("steps")
    if not isinstance(steps, list) or not steps:
        raise ValueError("steps must be a nonempty list")
    duration = 0.0
    for step in steps:
        if not isinstance(step, dict):
            raise ValueError("each input step must be an object")
        action = step.get("action")
        if action not in {"move", "drag", "wheel", "click", "key", "wait"}:
            raise ValueError(f"unknown input action: {action}")
        if action in {"move", "drag"} or (action == "click" and "selector" not in step):
            number(step.get("x"), "x", 0); number(step.get("y"), "y", 0)
        if action == "click" and "selector" in step:
            if not isinstance(step["selector"], str) or not step["selector"]:
                raise ValueError("click selector must be nonempty")
        if action == "wheel":
            number(step.get("dy"), "dy"); number(step.get("dx", 0), "dx")
        if action == "key" and (not isinstance(step.get("key"), str) or not step["key"]):
            raise ValueError("key action needs a nonempty key")
        if action in {"move", "drag", "wait"}:
            duration += number(step.get("ms", 0) if action != "wait" else step.get("ms"), "ms", 0)
    if duration > 60000:
        raise ValueError("one capture supports at most 60 seconds of scheduled input")
    checks = scenario.get("checks", [])
    if not isinstance(checks, list):
        raise ValueError("checks must be a list")
    for check in checks:
        if not isinstance(check, dict) or check.get("kind") not in {"range", "final", "visits", "settled"}:
            raise ValueError("check kind must be range, final, visits or settled")
        if not isinstance(check.get("metric"), str) or not check["metric"]:
            raise ValueError("each check needs a metric path")
        if "min" not in check and "max" not in check:
            raise ValueError("each check needs min and/or max")
        for bound in ("min", "max"):
            if bound in check:
                number(check[bound], bound)
        if check.get("min", -math.inf) > check.get("max", math.inf):
            raise ValueError("check min must not exceed max")
        if check["kind"] == "settled":
            number(check.get("window_ms"), "window_ms", 1)
            number(check.get("max"), "settled max", 0)


def metric_value(sample: dict[str, Any], path: str) -> Any:
    value: Any = sample
    for key in path.split("."):
        if not isinstance(value, dict) or key not in value:
            return None
        value = value[key]
    return value


def evaluate_checks(samples: list[dict[str, Any]], checks: list[dict[str, Any]]) -> list[dict[str, Any]]:
    results = []
    for check in checks:
        result = {"contract": check, "status": "FAIL"}
        values = [metric_value(sample, check["metric"]) for sample in samples]
        if len(values) < 2 or not all(is_number(value) for value in values):
            result["reason"] = "metric missing, non-finite/non-numeric, or fewer than two samples"
        else:
            low, high = check.get("min", -math.inf), check.get("max", math.inf)
            kind = check["kind"]
            if kind == "visits":
                value = sum(low <= value <= high for value in values)
                passed = value > 0
            else:
                window_values = values
                if kind == "settled":
                    cutoff = samples[-1]["time_ms"] - check["window_ms"]
                    window_values = [value for sample, value in zip(samples, values)
                                     if sample["time_ms"] >= cutoff]
                    if samples[0]["time_ms"] > cutoff or len(window_values) < 2:
                        result["reason"] = "capture does not cover the requested settling window"
                        results.append(result); continue
                value = values[-1] if kind == "final" else max(window_values) - min(window_values)
                passed = low <= value <= high
            result.update(value=value, status="PASS" if passed else "FAIL")
        results.append(result)
    return results


def apply_step(page: Page, step: dict[str, Any], pointer: list[float], sample_ms: float) -> None:
    action = step["action"]
    if action in {"move", "drag"}:
        start = pointer[:]
        duration = step.get("ms", 0)
        count = max(1, math.ceil(duration / max(sample_ms, 8)))
        if action == "drag":
            page.mouse.down()
        try:
            for i in range(1, count + 1):
                fraction = i / count
                page.mouse.move(start[0] + (step["x"] - start[0]) * fraction,
                                start[1] + (step["y"] - start[1]) * fraction)
                if duration:
                    page.wait_for_timeout(duration / count)
        finally:
            if action == "drag":
                page.mouse.up()
        pointer[:] = [step["x"], step["y"]]
    elif action == "wheel":
        page.mouse.wheel(step.get("dx", 0), step["dy"])
    elif action == "click":
        if "selector" in step:
            element = page.locator(step["selector"])
            element.click()
            box = element.bounding_box()
            if box:
                pointer[:] = [box["x"] + box["width"] / 2, box["y"] + box["height"] / 2]
        else:
            page.mouse.click(step["x"], step["y"])
            pointer[:] = [step["x"], step["y"]]
    elif action == "key":
        page.keyboard.press(step["key"])
    else:
        page.wait_for_timeout(step["ms"])


def capture(target: str, scenario: dict[str, Any], *, width: int = 1440, height: int = 900,
            reduced_motion: bool = False, channel: str | None = None) -> dict[str, Any]:
    validate_scenario(scenario)
    from playwright.sync_api import sync_playwright

    url = target if target.startswith(("http://", "https://", "file://")) else Path(target).resolve().as_uri()
    slot = "__aphroditeCapture_" + uuid.uuid4().hex
    errors: list[str] = []
    with sync_playwright() as runtime:
        browser = runtime.chromium.launch(headless=True, **({"channel": channel} if channel else {}))
        try:
            context = browser.new_context(viewport={"width": width, "height": height},
                                          reduced_motion="reduce" if reduced_motion else "no-preference")
            page = context.new_page()
            page.on("pageerror", lambda error: errors.append(str(error)))
            page.on("console", lambda message: errors.append(message.text) if message.type == "error" else None)
            page.goto(url, wait_until="domcontentloaded", timeout=30000)
            if scenario.get("ready"):
                page.locator(scenario["ready"]).wait_for(state="visible")
            page.wait_for_timeout(scenario.get("warmup_ms", 250))
            planned_ms = sum(step.get("ms", 0) for step in scenario["steps"])
            page.evaluate(RECORDER_JS, {"slot": slot, "observe": scenario.get("observe", {}),
                                       "statePath": scenario.get("state"),
                                       "interval": scenario.get("sample_ms", 16), "limit": planned_ms + 10000})
            pointer = [0.0, 0.0]
            for step in scenario["steps"]:
                apply_step(page, step, pointer, scenario.get("sample_ms", 16))
            trace = page.evaluate("slot => { const trace = window[slot].stop(); delete window[slot]; return trace; }", slot)
            checks = evaluate_checks(trace["samples"], scenario.get("checks", []))
            errors.extend(trace["errors"])
            status = "FAIL" if errors or any(c["status"] == "FAIL" for c in checks) else (
                "PASS" if checks else "UNVERIFIED")
            return {"version": 1, "target": url, "viewport": {"width": width, "height": height},
                    "reduced_motion": reduced_motion, "browser": browser.version,
                    "scenario": scenario, "inputs": trace["inputs"],
                    "status": status, "errors": errors, "checks": checks, "samples": trace["samples"]}
        finally:
            browser.close()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("target", help="HTTP(S) URL or local HTML path")
    parser.add_argument("--scenario", required=True, type=Path)
    parser.add_argument("--out", type=Path, help="JSON report; otherwise stdout")
    parser.add_argument("--width", type=int, default=1440)
    parser.add_argument("--height", type=int, default=900)
    parser.add_argument("--reduced-motion", action="store_true")
    parser.add_argument("--channel", choices=("chrome", "msedge"), help="use an installed browser")
    args = parser.parse_args()
    try:
        if args.width < 1 or args.height < 1:
            raise ValueError("viewport dimensions must be positive")
        scenario = json.loads(args.scenario.read_text(encoding="utf-8-sig"))
        if not isinstance(scenario, dict):
            raise ValueError("scenario must be an object")
        report = capture(args.target, scenario, width=args.width, height=args.height,
                         reduced_motion=args.reduced_motion, channel=args.channel)
    except Exception as error:
        report = {"version": 1, "status": "FAIL", "errors": [str(error)], "checks": [], "samples": []}
    output = json.dumps(report, ensure_ascii=False, indent=2, allow_nan=False) + "\n"
    if args.out:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(output, encoding="utf-8")
        print(f"{report['status']}: {len(report['samples'])} samples -> {args.out}", file=sys.stderr)
    else:
        print(output, end="")
    return 1 if report["status"] == "FAIL" else 0


if __name__ == "__main__":
    raise SystemExit(main())
