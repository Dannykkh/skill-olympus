import copy
import importlib.util
from pathlib import Path
import sys
import json
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('evaluation', ROOT / 'scripts/run-evaluation.py')
runner = importlib.util.module_from_spec(spec)
spec.loader.exec_module(runner)


def plan(mode='fixed', grade=1):
    # Synthetic basis tests the gate; it is never an actual institution profile.
    cases = [{'id': area, 'area': area, 'required': True, 'criterion': 'synthetic-only',
              'na_reason': 'excluded by synthetic gate fixture', 'na_reviewed': True}
             for area in runner.AREAS - {'security'}]
    cases.append({'id': 'API', 'area': 'security', 'required': True,
                  'criterion': 'synthetic API contract', 'expected': 'deny without state/event change',
                  'assertions_reviewed': True,
                  'argv': [sys.executable, str(ROOT / 'tests/sample-product.py'), mode]})
    return {'grade': grade, 'institution': 'SYNTHETIC, NOT CERTIFICATION', 'build': mode,
            'environment': 'loopback sample', 'criteria_source': 'synthetic fixture',
            'criteria_version': '1', 'criteria_reviewed': True, 'cases': cases}


class EvaluationTests(unittest.TestCase):
    def test_real_http_defects_and_fixed_regression(self):
        for mode in ('broken-auth', 'broken-input', 'write-before-deny'):
            with self.subTest(mode=mode):
                self.assertEqual(runner.evaluate(plan(mode), ROOT)['decision'], 'NEEDS_WORK')
        self.assertEqual(runner.evaluate(plan(), ROOT)['decision'], 'EVIDENCE_COMPLETE')

    def test_missing_grade_rejected(self):
        for grade in (None, 0, 3, True, '1'):
            with self.assertRaises(ValueError):
                runner.evaluate(plan(grade=grade), ROOT)

    def test_grade_two_requires_business_evidence(self):
        p = plan(grade=2)
        self.assertEqual(runner.evaluate(p, ROOT)['decision'], 'INCOMPLETE')
        p['cases'].append({'id': 'business', 'area': 'business', 'required': True,
                           'criterion': 'synthetic', 'expected': 'target workflow'})
        self.assertEqual(runner.evaluate(p, ROOT)['results'][-1]['status'], 'NOT RUN')

    def test_unreviewed_criteria_cannot_complete(self):
        p = plan()
        p['criteria_reviewed'] = False
        self.assertEqual(runner.evaluate(p, ROOT)['decision'], 'INCOMPLETE')

    def test_zero_exit_without_review_is_unverified(self):
        p = plan()
        p['cases'][-1]['assertions_reviewed'] = False
        self.assertEqual(runner.evaluate(p, ROOT)['results'][-1]['status'], 'UNVERIFIED')

    def test_missing_command_and_open_defect(self):
        p = plan()
        p['cases'][-1]['argv'] = ['nonexistent-gs-test-executable']
        self.assertEqual(runner.evaluate(p, ROOT)['decision'], 'INCOMPLETE')
        p['open_defects'] = ['DEF-1']
        self.assertEqual(runner.evaluate(p, ROOT)['decision'], 'NEEDS_WORK')

    def test_duplicate_ids_fail_before_execution(self):
        p = plan()
        p['cases'].append(copy.deepcopy(p['cases'][0]))
        with self.assertRaises(ValueError):
                runner.evaluate(p, ROOT)

    def test_timeout_is_not_a_pass(self):
        p = plan()
        p['cases'][-1].update(argv=[sys.executable, '-c', 'import time; time.sleep(1)'], timeout=0.05)
        self.assertEqual(runner.evaluate(p, ROOT)['results'][-1]['status'], 'NOT RUN')

    def test_grade_two_business_failure_and_regression(self):
        p = plan(grade=2)
        case = {'id': 'business', 'area': 'business', 'required': True,
                'criterion': 'synthetic calculation workflow', 'expected': '2 items at 3 units total 6',
                'assertions_reviewed': True, 'argv': [sys.executable, '-c', 'assert 2 * 3 == 7']}
        p['cases'].append(case)
        self.assertEqual(runner.evaluate(p, ROOT)['decision'], 'NEEDS_WORK')
        case['argv'][-1] = 'assert 2 * 3 == 6'
        self.assertEqual(runner.evaluate(p, ROOT)['decision'], 'EVIDENCE_COMPLETE')

    def test_cli_writes_evidence_and_preserves_previous_run(self):
        with tempfile.TemporaryDirectory(prefix='gs-evaluation-') as folder:
            path = Path(folder)
            manifest = path / 'plan.json'
            output = path / 'execution.json'
            manifest.write_text(json.dumps(plan()), encoding='utf-8')
            argv = [sys.executable, str(ROOT / 'scripts/run-evaluation.py'), str(manifest),
                    '--root', str(ROOT), '--output', str(output)]
            result = subprocess.run(argv, capture_output=True)
            self.assertEqual(result.returncode, 0, result.stderr)
            original = output.read_bytes()
            record = json.loads(original)
            self.assertEqual(record['decision'], 'EVIDENCE_COMPLETE')
            self.assertIn('stdout_sha256', record['results'][-1])
            self.assertEqual(subprocess.run(argv, capture_output=True).returncode, 2)
            self.assertEqual(output.read_bytes(), original)


if __name__ == '__main__':
    unittest.main()
