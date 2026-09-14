#!/usr/bin/env python3
"""Execute reviewed project assertions; never infer certification from exit codes."""
import argparse
import datetime as dt
import hashlib
import json
from pathlib import Path
import subprocess
import time

AREAS = {'functional', 'performance', 'compatibility', 'usability', 'reliability',
         'security', 'maintainability', 'portability', 'documentation'}


def evaluate(plan: dict, root: Path) -> dict:
    """Run argv without a shell and return an evidence-completeness decision."""
    grade = plan.get('grade')
    if type(grade) is not int or grade not in (1, 2):
        raise ValueError('grade must be 1 or 2')
    cases = plan.get('cases', [])
    if not isinstance(cases, list) or not cases:
        raise ValueError('non-empty cases required')
    if any(not isinstance(c, dict) for c in cases):
        raise ValueError('cases must contain objects')
    ids = [c.get('id') for c in cases]
    if any(not isinstance(i, str) or not i for i in ids) or len(set(ids)) != len(ids):
        raise ValueError('case IDs must be non-empty and unique')
    gaps = []
    for key in ('institution', 'build', 'environment', 'criteria_source', 'criteria_version'):
        if not isinstance(plan.get(key), str) or not plan[key].strip():
            gaps.append('missing ' + key)
    if plan.get('criteria_reviewed') is not True:
        gaps.append('institution criteria coverage not reviewed')
    areas = AREAS | ({'business'} if grade == 2 else set())
    covered = {c.get('area') for c in cases}
    gaps.extend('unmapped area: ' + a for a in sorted(areas - covered))
    # Validate every command before executing any of them.
    for c in cases:
        if c.get('area') not in AREAS | {'business'}:
            raise ValueError('unknown quality area')
        argv = c.get('argv')
        if argv is not None and (not isinstance(argv, list) or not argv or
                                 any(not isinstance(a, str) or not a for a in argv)):
            raise ValueError('argv must be a non-empty string array')
        timeout = c.get('timeout', 60)
        if type(timeout) not in (int, float) or not 0 < timeout <= 3600:
            raise ValueError('timeout must be within 0..3600 seconds')
        if type(c.get('required')) is not bool:
            raise ValueError('required must be a boolean')
    results = []
    for c in cases:
        result = {'id': c['id'], 'area': c.get('area'), 'required': c['required'],
                  'criterion': c.get('criterion'), 'expected': c.get('expected'),
                  'started': dt.datetime.now(dt.timezone.utc).isoformat()}
        if c.get('na_reason'):
            result['status'] = 'N/A' if c.get('na_reviewed') is True and c.get('criterion') else 'UNVERIFIED'
            result['reason'] = c['na_reason']
        elif not c.get('argv'):
            result.update(status='NOT RUN', reason='no executable assertion')
        else:
            started = time.monotonic()
            result['argv'] = c['argv']
            try:
                run = subprocess.run(c['argv'], cwd=root, shell=False, capture_output=True,
                                     timeout=c.get('timeout', 60))
                result.update(exit_code=run.returncode,
                              stdout_sha256=hashlib.sha256(run.stdout).hexdigest(),
                              stderr_sha256=hashlib.sha256(run.stderr).hexdigest())
                result['status'] = 'PASS' if run.returncode == 0 else 'FAIL'
                if result['status'] == 'PASS' and (c.get('assertions_reviewed') is not True or
                                                   not c.get('criterion') or not c.get('expected')):
                    result.update(status='UNVERIFIED', reason='assertion or criterion not reviewed')
            except subprocess.TimeoutExpired:
                result.update(status='NOT RUN', reason='runner timeout; inspect child processes before retry')
            except OSError as exc:
                result.update(status='NOT RUN', reason=type(exc).__name__)
            result['elapsed_seconds'] = round(time.monotonic() - started, 4)
        results.append(result)
    failures = [x['id'] for x in results if x['status'] == 'FAIL' and
                (x['required'] or x['area'] == 'security')]
    gaps.extend(x['id'] + ': ' + x['status'] for x in results if x['required'] and
                x['status'] not in ('PASS', 'N/A', 'FAIL'))
    if plan.get('open_defects'):
        failures.append('open defects require review')
    decision = 'NEEDS_WORK' if failures else 'INCOMPLETE' if gaps else 'EVIDENCE_COMPLETE'
    return {'grade': grade, 'build': plan.get('build'), 'environment': plan.get('environment'),
            'plan_sha256': hashlib.sha256(json.dumps(plan, sort_keys=True).encode()).hexdigest(),
            'decision': decision, 'failures': failures, 'gaps': gaps, 'results': results,
            'note': 'EVIDENCE_COMPLETE requires Argos review before READY; not GS certification'}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('plan', type=Path)
    parser.add_argument('--root', required=True, type=Path)
    parser.add_argument('--output', type=Path)
    args = parser.parse_args()
    root = args.root.resolve(strict=True)
    if not root.is_dir():
        parser.error('root must be a directory')
    if args.output and args.output.exists():
        parser.error('output exists; choose a new run path')
    try:
        result = evaluate(json.loads(args.plan.read_text(encoding='utf-8-sig')), root)
    except (ValueError, TypeError, KeyError) as exc:
        parser.error(str(exc))
    rendered = json.dumps(result, ensure_ascii=False, indent=2)
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        with args.output.open('x', encoding='utf-8') as stream:
            stream.write(rendered + '\n')
    print(rendered)
    return 0 if result['decision'] == 'EVIDENCE_COMPLETE' else 1


if __name__ == '__main__':
    raise SystemExit(main())
