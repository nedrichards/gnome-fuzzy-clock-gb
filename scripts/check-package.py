#!/usr/bin/env python3
"""Fail closed on shexli findings/errors; retain untouched output and decisions."""

import argparse
from collections import Counter
from hashlib import sha256
from importlib.metadata import PackageNotFoundError, version
import json
from pathlib import Path
import subprocess
import sys
import zipfile


VERSIONS = [str(n) for n in range(45, 52)]
# Deliberately invalidate the schema exception on ANY runtime source change.
# Re-review system-schema-only usage before refreshing these fingerprints.
SCHEMA_SOURCES = {
    "extension.js": "6241186700e89ef085f7916833ac1f19861238709c9ffc49a3877c30f54fe558",
    "fuzzyTime.js": "dbc82a3268797f18c2e6a1fddf942ddf7ae31e9deef36119eb50f85f96fa86ea",
}
SCHEMA_MESSAGE = (
    "Extension appears to use GSettings but no `.gschema.xml` file is included in the package."
)
VERSION_MESSAGE = (
    "Field `shell-version` contains invalid values, more than one development release, "
    "or implausible future releases."
)


def exception_for(finding, archive, metadata, package, analyzer_version):
    """Exact known false positives only. See docs/maintenance.md for removal conditions."""
    if analyzer_version != "0.2.1":
        return None
    if metadata.get("uuid") != "fuzzy-clock-gb@nedrichards":
        return None
    if finding["severity"] != "error":
        return None
    if (finding["rule_id"] == "EGO-P-003"
            and finding["message"] == SCHEMA_MESSAGE
            and finding["evidence"] == []
            and "settings-schema" not in metadata
            and set(archive.namelist()) == {"extension.js", "fuzzyTime.js", "metadata.json", "COPYING"}
            and all(sha256(archive.read(name)).hexdigest() == digest
                    for name, digest in SCHEMA_SOURCES.items())):
        return "system-schema-only: exact reviewed runtime source fingerprints"
    if (finding["rule_id"] == "EGO-M-004"
            and finding["message"] == VERSION_MESSAGE
            and metadata.get("shell-version") == VERSIONS
            and finding["evidence"] == [{
                "path": f"{package}:metadata.json", "line": None,
                "snippet": f"shell-version={VERSIONS!r}",
            }]):
        return "Shell 51 is released; 0.2.1 hard-codes major > 50 as future"
    return None


def validate_result(result):
    """Refuse empty, incomplete or inconsistent analyzer output."""
    if result["spec_version"] != "2026-04-02":
        raise ValueError("Unreviewed analyzer report specification")
    findings = result["findings"]
    if not isinstance(findings, list):
        raise ValueError("Invalid findings list")
    for finding in findings:
        for key in ("rule_id", "severity", "message", "title"):
            if not isinstance(finding[key], str) or not finding[key]:
                raise ValueError(f"Invalid finding {key}")
        if not isinstance(finding["evidence"], list):
            raise ValueError("Invalid finding evidence")
    summary = result["summary"]
    if (summary["finding_count"] != len(findings)
            or summary["status"] != ("issues_found" if findings else "clean")
            or summary["severity_counts"] != dict(Counter(f["severity"] for f in findings))
            or result["artifacts"]["js_file_count"] < 1):
        raise ValueError("Incomplete or inconsistent analysis")


def check(package, report_dir):
    package = Path(package).resolve()
    report_dir = Path(report_dir)
    report_dir.mkdir(parents=True, exist_ok=True)
    # Clear stale reports before any operation that can fail.
    for name in ("analysis.json", "stderr.txt", "gate.json"):
        (report_dir / name).write_text("", encoding="utf-8")
    gate = {"package": str(package), "status": "analysis_failed",
            "versions": {}, "exceptions": [], "blocking_findings": []}
    try:
        for dependency in ("shexli", "tree-sitter", "tree-sitter-javascript"):
            try:
                gate["versions"][dependency] = version(dependency)
            except PackageNotFoundError:
                gate["versions"][dependency] = None
        gate["sha256"] = sha256(package.read_bytes()).hexdigest()
        command = [sys.executable, "-m", "shexli", str(package), "--format", "json"]
        try:
            process = subprocess.run(command, capture_output=True, timeout=120)
        except subprocess.TimeoutExpired as error:
            (report_dir / "analysis.json").write_bytes(error.stdout or b"")
            (report_dir / "stderr.txt").write_bytes(error.stderr or b"")
            raise
        (report_dir / "analysis.json").write_bytes(process.stdout)
        (report_dir / "stderr.txt").write_bytes(process.stderr)
        gate["analyzer_exit_code"] = process.returncode
        if process.returncode != 0:
            raise ValueError(f"Analyzer exited {process.returncode}; see stderr.txt")
        result = json.loads(process.stdout)
        validate_result(result)
        with zipfile.ZipFile(package) as archive:
            metadata = json.loads(archive.read("metadata.json"))
            archive.getinfo("extension.js")
            if len(archive.namelist()) != len(set(archive.namelist())):
                raise ValueError("Duplicate archive members")
            for index, finding in enumerate(result["findings"]):
                reason = exception_for(finding, archive, metadata, package,
                                       gate["versions"]["shexli"])
                if reason:
                    gate["exceptions"].append({"finding_index": index, "reason": reason})
                else:
                    gate["blocking_findings"].append(index)
        gate["status"] = "blocked" if gate["blocking_findings"] else "passed"
    except Exception as error:
        gate["error"] = f"{type(error).__name__}: {error}"
    finally:
        (report_dir / "gate.json").write_text(json.dumps(gate, indent=2) + "\n", encoding="utf-8")
    print(f"shexli gate: {gate['status']}; full report: {report_dir}")
    if "error" in gate:
        print(gate["error"], file=sys.stderr)
    return 0 if gate["status"] == "passed" else 1


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("package", type=Path, help="Installable release ZIP")
    parser.add_argument("--report-dir", type=Path, default=Path("dist/shexli"))
    args = parser.parse_args()
    sys.exit(check(args.package, args.report_dir))
