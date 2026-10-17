"""Real ZIP/analyzer checks plus fault injection at the subprocess boundary."""

import contextlib
import importlib.util
import io
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch
import zipfile


ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("package_gate", ROOT / "scripts/check-package.py")
GATE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(GATE)


class PackageGateTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.package = self.root / "extension.zip"
        self.report = self.root / "report"
        self.files = {name: (ROOT / name).read_bytes()
                      for name in ("extension.js", "fuzzyTime.js", "metadata.json", "COPYING")}

    def pack(self):
        with zipfile.ZipFile(self.package, "w") as archive:
            for name, data in self.files.items():
                archive.writestr(name, data)

    def run_gate(self, expected):
        with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
            self.assertEqual(GATE.check(self.package, self.report), expected)
        self.assertTrue((self.report / "analysis.json").exists())
        self.assertTrue((self.report / "stderr.txt").exists())
        return json.loads((self.report / "gate.json").read_text())

    def test_reviewed_package_retains_both_original_findings(self):
        self.pack()
        gate = self.run_gate(0)
        result = json.loads((self.report / "analysis.json").read_bytes())
        self.assertEqual(len(gate["exceptions"]), 2)
        self.assertEqual(result["summary"]["finding_count"], 2)
        self.assertEqual(gate["analyzer_exit_code"], 0)

    def test_clean_package_needs_no_exceptions(self):
        self.files = {
            "extension.js": b"export default class Extension { enable() {} disable() {} }",
            "metadata.json": json.dumps({"uuid": "test@example.com", "name": "Test",
                                         "description": "Test", "shell-version": ["50"]}).encode(),
        }
        self.pack()
        self.assertEqual(self.run_gate(0)["exceptions"], [])

    def test_prohibited_import_in_imported_module_blocks_despite_cli_zero(self):
        self.files["fuzzyTime.js"] += b"\nimport Gtk from 'gi://Gtk';\n"
        self.pack()
        gate = self.run_gate(1)
        result = json.loads((self.report / "analysis.json").read_bytes())
        self.assertEqual(gate["analyzer_exit_code"], 0)
        self.assertIn("EGO-I-002", [f["rule_id"] for f in result["findings"]])
        self.assertEqual(gate["status"], "blocked")

    def test_schema_exception_does_not_cover_different_schema(self):
        self.files["extension.js"] = self.files["extension.js"].replace(
            b"org.gnome.desktop.interface", b"org.gnome.shell.extensions.test")
        self.pack()
        gate = self.run_gate(1)
        result = json.loads((self.report / "analysis.json").read_bytes())
        self.assertIn("EGO-P-003", [result["findings"][i]["rule_id"]
                                      for i in gate["blocking_findings"]])

    def test_version_exception_does_not_cover_future_or_malformed_versions(self):
        for versions in (["45", "52"], ["45", "51", "bad"], [51]):
            with self.subTest(versions=versions):
                metadata = json.loads(self.files["metadata.json"])
                metadata["shell-version"] = versions
                self.files["metadata.json"] = json.dumps(metadata).encode()
                self.pack()
                self.assertEqual(self.run_gate(1)["exceptions"][0]["finding_index"], 0)

    def test_warning_blocks(self):
        metadata = json.loads(self.files["metadata.json"])
        metadata["session-modes"] = ["user"]
        self.files["metadata.json"] = json.dumps(metadata).encode()
        self.pack()
        gate = self.run_gate(1)
        result = json.loads((self.report / "analysis.json").read_bytes())
        self.assertIn("warning", [result["findings"][i]["severity"]
                                  for i in gate["blocking_findings"]])

    def test_invalid_zip_is_analyzer_failure_with_traceback(self):
        self.package.write_bytes(b"not a zip")
        self.assertEqual(self.run_gate(1)["status"], "analysis_failed")
        self.assertIn("Unsupported input", (self.report / "stderr.txt").read_text())

    def test_missing_package_clears_stale_report_and_fails(self):
        self.pack()
        self.run_gate(0)
        self.package.unlink()
        self.assertEqual(self.run_gate(1)["status"], "analysis_failed")
        self.assertEqual((self.report / "analysis.json").read_bytes(), b"")

    def test_analyzer_process_and_output_failures(self):
        self.pack()
        for process in (
            subprocess.CompletedProcess([], 1, b"partial output", b"dependency error"),
            subprocess.CompletedProcess([], 0, b"", b""),
            subprocess.CompletedProcess([], 0, b"{}", b""),
        ):
            with self.subTest(process=process), patch.object(GATE.subprocess, "run", return_value=process):
                self.assertEqual(self.run_gate(1)["status"], "analysis_failed")
                self.assertEqual((self.report / "analysis.json").read_bytes(), process.stdout)
                self.assertEqual((self.report / "stderr.txt").read_bytes(), process.stderr)

    def test_timeout_preserves_partial_output(self):
        self.pack()
        error = subprocess.TimeoutExpired("shexli", 120, output=b"partial", stderr=b"slow")
        with patch.object(GATE.subprocess, "run", side_effect=error):
            self.assertEqual(self.run_gate(1)["status"], "analysis_failed")
        self.assertEqual((self.report / "analysis.json").read_bytes(), b"partial")
        self.assertEqual((self.report / "stderr.txt").read_bytes(), b"slow")

    def test_inconsistent_result_fails_closed(self):
        self.pack()
        self.run_gate(0)
        result = json.loads((self.report / "analysis.json").read_bytes())
        result["summary"]["status"] = "clean"
        process = subprocess.CompletedProcess([], 0, json.dumps(result).encode(), b"")
        with patch.object(GATE.subprocess, "run", return_value=process):
            self.assertEqual(self.run_gate(1)["status"], "analysis_failed")


if __name__ == "__main__":
    unittest.main()
