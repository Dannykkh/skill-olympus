"""Exercise setup and cleanup with disposable evaluation directories."""

import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

EVALS = Path(__file__).resolve().parents[2] / "evals"


class EvalSetupTests(unittest.TestCase):
    def setUp(self) -> None:
        temp = tempfile.TemporaryDirectory(prefix="mnemo-eval-test-")
        self.addCleanup(temp.cleanup)
        self.root = Path(temp.name).resolve()
        self.project = self.root / "evaluation"

    def run_setup(self, *args: str, default: bool = False) -> subprocess.CompletedProcess:
        # Exercise argparse's default branch without touching the machine's actual default.
        if default:
            command = ["-c", "import setup_test_env as s; "
                       "s.DEFAULT_TEST_PATH = 'evaluation'; s.main()"]
        else:
            command = [str(EVALS / "setup_test_env.py"), "--path", str(self.project)]
        return subprocess.run(
            [sys.executable, "-B", "-X", "utf8", *command, *args],
            cwd=self.root, env={**os.environ, "PYTHONPATH": str(EVALS)},
            capture_output=True, encoding="utf-8",
        )

    def test_unmanaged_directory_preserved_on_setup_and_cleanup(self) -> None:
        self.project.mkdir()
        sentinel = self.project / "keep.txt"
        sentinel.write_bytes(b"original contents")
        for default in (True, False):
            for args in ((), ("--clean",)):
                with self.subTest(default=default, args=args):
                    result = self.run_setup(*args, default=default)
                    self.assertNotEqual(result.returncode, 0)
                    self.assertIn("Not a managed evaluation directory", result.stderr)
                    self.assertEqual([sentinel], list(self.project.iterdir()))
                    self.assertEqual(sentinel.read_bytes(), b"original contents")

    def test_generated_project_can_be_recreated_and_cleaned(self) -> None:
        created = self.run_setup(default=True)
        self.assertEqual(created.returncode, 0, created.stderr)
        disposable = self.project / "old-evaluation-output"
        disposable.touch()
        reset = self.run_setup()
        self.assertEqual(reset.returncode, 0, reset.stderr)
        self.assertFalse(disposable.exists())
        self.assertTrue((self.project / ".git" / "HEAD").is_file())
        self.assertEqual(3, len(list((self.project / "docs" / "handoffs").glob("*.md"))))
        for default in (True, False):
            cleaned = self.run_setup("--clean", default=default)
            self.assertEqual(cleaned.returncode, 0, cleaned.stderr)
            self.assertFalse(self.project.exists())

    def test_moved_fixture_is_not_owned_at_its_new_path(self) -> None:
        created = self.run_setup()
        self.assertEqual(created.returncode, 0, created.stderr)
        moved = self.root / "moved"
        self.project.rename(moved)
        self.project = moved
        cleaned = self.run_setup("--clean")
        self.assertNotEqual(cleaned.returncode, 0)
        self.assertTrue((moved / "README.md").is_file())

    @unittest.skipUnless(os.name == "nt", "Windows prevents unlinking an open file")
    def test_cleanup_can_be_retried_after_a_locked_file(self) -> None:
        created = self.run_setup()
        self.assertEqual(created.returncode, 0, created.stderr)
        with (self.project / "locked.txt").open("w") as locked:
            locked.write("evaluation output")
            self.assertNotEqual(self.run_setup("--clean").returncode, 0)
        retried = self.run_setup("--clean")
        self.assertEqual(retried.returncode, 0, retried.stderr)
        self.assertFalse(self.project.exists())

    def test_directory_link_does_not_grant_ownership_of_its_target(self) -> None:
        created = self.run_setup()
        self.assertEqual(created.returncode, 0, created.stderr)
        owned = self.project
        alias = self.root / "alias"
        try:
            alias.symlink_to(owned, target_is_directory=True)
        except OSError as error:
            self.skipTest(f"directory symlink unavailable: {error}")
        self.project = alias
        for args in ((), ("--clean",)):
            self.assertNotEqual(self.run_setup(*args).returncode, 0)
            self.assertTrue(alias.is_symlink())
            self.assertTrue((owned / "README.md").is_file())
