"""Exercise the actual handoff commands from changing working directories."""

import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

SCRIPTS = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SCRIPTS))
from mnemo_project_root import detect_project_root


class HandoffRootTests(unittest.TestCase):
    def invoke(self, script, cwd, *args, env=None):
        return subprocess.run([sys.executable, str(SCRIPTS / script), *map(str, args)],
                              cwd=cwd, capture_output=True, text=True, encoding="utf-8",
                              timeout=30, env=env)

    def test_subdirectory_create_list_and_staleness_share_git_root(self):
        with tempfile.TemporaryDirectory() as temp:
            project = Path(temp) / "project"
            child = project / "src" / "feature"
            child.mkdir(parents=True)
            (project / ".git").mkdir()
            result = self.invoke("create_handoff.py", child, "nested-work")
            self.assertEqual(0, result.returncode, result.stderr)
            handoffs = list((project / "docs" / "handoffs").glob("*.md"))
            self.assertEqual(1, len(handoffs))
            self.assertIn(str(project.resolve()), handoffs[0].read_text(encoding="utf-8"))
            self.assertFalse((child / "docs").exists())
            listed = self.invoke("list_handoffs.py", child)
            self.assertEqual(0, listed.returncode, listed.stderr)
            self.assertIn(handoffs[0].name, listed.stdout)
            checked = self.invoke("check_staleness.py", child)
            self.assertIn(handoffs[0].name, checked.stdout)

    def test_unknown_cwd_requires_explicit_project_and_marker_survives_move(self):
        with tempfile.TemporaryDirectory() as temp:
            project = Path(temp) / "project"
            project.mkdir()
            denied = self.invoke("create_handoff.py", project, "unconfirmed")
            self.assertNotEqual(0, denied.returncode)
            self.assertEqual([], list(project.iterdir()))
            created = self.invoke("create_handoff.py", Path(temp), "initial", "--project-root", project)
            self.assertEqual(0, created.returncode, created.stderr)
            self.assertEqual("", (project / ".mnemo-root").read_text())
            moved = Path(temp) / "moved"
            project.rename(moved)
            child = moved / "src"
            child.mkdir()
            continued = self.invoke("create_handoff.py", child, "continued")
            self.assertEqual(0, continued.returncode, continued.stderr)
            self.assertEqual(2, len(list((moved / "docs/handoffs").glob("*.md"))))
            self.assertFalse((child / "docs").exists())

    def test_inherited_git_environment_cannot_redirect_recovery(self):
        with tempfile.TemporaryDirectory() as temp:
            project = Path(temp) / "project"
            child = project / "src"
            child.mkdir(parents=True)
            (project / ".git").write_text("gitdir: /unavailable/worktree-metadata\n")
            foreign = Path(temp) / "foreign"
            (foreign / ".git").mkdir(parents=True)
            previous = {key: os.environ.get(key) for key in ("GIT_DIR", "GIT_WORK_TREE")}
            try:
                os.environ.update(GIT_DIR=str(foreign / ".git"), GIT_WORK_TREE=str(foreign))
                self.assertEqual(project.resolve(), detect_project_root(child))
            finally:
                for key, value in previous.items():
                    if value is None:
                        os.environ.pop(key, None)
                    else:
                        os.environ[key] = value

    def test_handoff_rejects_external_storage_link_and_cli_internal_path(self):
        with tempfile.TemporaryDirectory() as temp:
            project = Path(temp) / "project"
            (project / "docs").mkdir(parents=True)
            (project / ".mnemo-root").touch()
            outside = Path(temp) / "outside"
            outside.mkdir()
            link = project / "docs" / "handoffs"
            # Node's junction mode also works on Windows without symlink privileges.
            subprocess.run(["node", "-e", "require('fs').symlinkSync(process.argv[1], process.argv[2], process.platform === 'win32' ? 'junction' : 'dir')", str(outside), str(link)], check=True)
            try:
                rejected = self.invoke("create_handoff.py", project, "escape")
                self.assertNotEqual(0, rejected.returncode)
                self.assertEqual([], list(outside.iterdir()))
            finally:
                if os.name == "nt":
                    link.rmdir()
                else:
                    link.unlink()
            internal = Path(temp) / ".codex" / "sessions"
            internal.mkdir(parents=True)
            rejected = self.invoke("create_handoff.py", project, "internal", "--project-root", internal)
            self.assertNotEqual(0, rejected.returncode)
            self.assertFalse((internal / "docs").exists())


if __name__ == "__main__":
    unittest.main()
