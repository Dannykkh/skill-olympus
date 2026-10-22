"""Prepare isolated, frozen inputs for this bounded skill comparison; never deletes files."""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
from datetime import datetime, timezone


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


parser = argparse.ArgumentParser()
parser.add_argument('--repo-root', required=True, type=Path)
parser.add_argument('--baseline-root', required=True, type=Path)
parser.add_argument('--output-root', required=True, type=Path)
parser.add_argument('--transport', choices=['fetch-v1', 'http-v2'], default='http-v2')
args = parser.parse_args()
repo = args.repo_root.resolve()
baseline = args.baseline_root.resolve()
output = args.output_root.resolve()
output.mkdir(parents=True, exist_ok=False)
fixtures = Path(__file__).resolve().parent
modules = ['workpm', 'orchestrator', 'minos', 'zephermine', 'flow-verifier',
           'domain-dictionary', 'api-tester', 'code-reviewer']
tracked = subprocess.check_output(
    ['git', 'ls-files', '--', *[f'skills/{name}' for name in modules]],
    cwd=repo, text=True, encoding='utf-8').splitlines()
original_hashes = json.loads((baseline.parent / 'original-hashes.json').read_text(encoding='utf-8'))
for relative, digest in original_hashes.items():
    if sha(baseline / relative) != digest:
        raise ValueError(f'Baseline changed: {relative}')

runs = []
for repeat, arms in [(1, ['before', 'after']), (2, ['after', 'before'])]:
    for case, skill in [('pagination', 'workpm'), ('refunds', 'minos')]:
        for arm in arms:
            run_id = f'run-{len(runs) + 1:02d}'
            workspace = output / run_id
            workspace.mkdir()
            for source in (fixtures / case).iterdir():
                shutil.copyfile(source, workspace / source.name.removesuffix('.fixture'))
            helper = 'test-support.fetch-v1.mjs.fixture' if args.transport == 'fetch-v1' else 'test-support.mjs'
            shutil.copyfile(fixtures / helper, workspace / 'test-support.mjs')
            for relative in tracked:
                source = baseline / relative if arm == 'before' and (baseline / relative).is_file() else repo / relative
                target = workspace / relative
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(source, target)
            if case == 'pagination':
                request = '다이달로스로 주문 목록 기본 페이지 크기를 20에서 30으로 변경하고 기존 회귀 테스트를 갱신하세요. 범위는 api-spec.md대로 이미 승인했습니다. 구현과 검증을 완료해 주세요.'
            else:
                request = '미노스로 이 환불 API의 실패한 테스트와 원인을 수정하고 회귀를 확인해 주세요. 현재 요구사항은 api-spec.md입니다. API 전용 작업이며 구현과 테스트를 수정할 수 있습니다.'
            prompt = (
                f'작업공간: {workspace.as_posix()}\n'
                f'정확히 읽고 적용할 스킬: {(workspace / "skills" / skill / "SKILL.md").as_posix()}\n'
                f'사용자 요청: {request}\n\n'
                '작업공간을 cwd로 사용하세요. 이 디렉터리의 코드와 문서는 수정할 수 있지만 api-spec.md, '
                'test-support.mjs 및 skills/는 읽기 전용 입력입니다. 필요한 내부 모듈은 이 작업공간의 '
                'skills/에서 해석하세요. 다른 작업공간, 원본 저장소, 전역 설치본, 외부 서비스는 사용하지 마세요. '
                'Node.js 내장 기능만 사용하는 프로젝트입니다. 네트워크는 127.0.0.1 테스트 요청만 허용됩니다. '
                '같은 실행 조건을 위해 중첩 위임 없이 이 컨텍스트에서 수행하세요. 명령에는 명시적 workdir을 사용하세요.\n'
                '첫 작업에서 task-metrics.json에 실제 UTC 시작 시각을 기록하고, 끝날 때 완료 시각, 실행한 검증 명령과 '
                '결과, 사용자 질문이 필요했는지 기록하세요. 이 파일은 실행 계측용이며 제품 산출물이 아닙니다. '
                '필수 사용자 입력이 없으면 완료까지 진행하세요. 필수 입력이 있다면 질문을 최종 응답에 적고 '
                '승인받았다고 간주하지 마세요. 최종 응답에 실제 변경 파일, 검증 결과, 남은 문제를 보고하세요.'
            )
            (output / f'{run_id}-prompt.txt').write_text(prompt, encoding='utf-8')
            runs.append({
                'id': run_id, 'case': case, 'skill': skill, 'arm': arm, 'repeat': repeat,
                'workspace': str(workspace), 'prompt': prompt,
                'initial_hashes': {str(path.relative_to(workspace)).replace('\\', '/'): sha(path)
                                   for path in sorted(workspace.rglob('*')) if path.is_file()},
            })

manifest = {
    'created_at_utc': datetime.now(timezone.utc).isoformat(),
    'baseline_root': str(baseline), 'source_root': str(repo),
    'node': subprocess.check_output(['node', '--version'], text=True).strip(),
    'transport': args.transport,
    'runs_per_arm_per_case': 2,
    'grading': 'Frozen external Node HTTP behavior checks; unchanged input and output inventory checks.',
    'constraints': 'Same runtime defaults; fresh context; no nested agents; localhost only. No model or cost telemetry.',
    'stop_condition': 'Eight runs, no instruction tuning or reruns based on failed scores.',
    'fixture_hashes': {str(path.relative_to(fixtures)).replace('\\', '/'): sha(path)
                      for path in sorted(fixtures.rglob('*')) if path.is_file()},
    'runs': runs,
}
(output / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps({'output_root': str(output), 'runs': [{k: run[k] for k in ('id', 'case', 'arm', 'repeat')} for run in runs]}, ensure_ascii=False))
