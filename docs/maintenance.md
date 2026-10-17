# Maintenance

Dependabot proposes npm, pip (shexli and its parser dependencies), and GitHub Actions updates weekly. The Check workflow runs lint, unit tests, analyzer gate regressions, and package checks on changes and on demand. After packaging, it scans the actual installable ZIP before uploading it. Tested extension ZIPs are named by checkout SHA and retained for 14 days, with download links in the Actions summary. GNOME Shell compatibility still needs validation in a real session before publishing an extension update.

## Local package gate

Install Node/npm, Python 3.14 with venv support, and `gnome-extensions`
(Ubuntu: `sudo apt-get install gnome-shell python3-venv`). Use an isolated
environment; the analyzer is a development dependency and is never bundled:

```sh
npm ci
python3.14 -m venv .venv-shexli
. .venv-shexli/bin/activate
python -m pip install -r requirements-shexli.txt
npm test
python -m unittest discover -s tests -p 'test_*.py' -v
npm run check:package
```

To inspect an existing ZIP without rebuilding:

```sh
python scripts/check-package.py dist/fuzzy-clock-gb@nedrichards.shell-extension.zip
```

`scripts/package.sh` remains a packaging-only command. Use `check:package` for
a checked distributable; do not upload a ZIP after a failed gate. There is no
release-publishing or EGO-upload workflow in this repository.

The gate returns 0 only for a completed analysis with no unexcepted findings
(warnings also block), and 1 for findings, invalid output, exceptions, missing
dependencies, or a 120-second analyzer timeout. Shexli's own CLI returns 0 even
for findings, so its exit status alone is insufficient. The wrapper validates
the JSON result as well as the process exit code.

`dist/shexli/analysis.json` is untouched analyzer stdout (possibly incomplete
on failure); `stderr.txt` retains diagnostics; `gate.json` records the ZIP SHA256,
installed dependency versions, decision, errors, blocking finding indices, and
exception reasons. CI uploads this directory with `always()`, including blocked
and failed scans, for 14 days. Failures before the analyzer step have no analysis
report; see the job logs. The ZIP upload requires every preceding check to pass.

When updating pins, rerun the regression suite and scan a newly built ZIP.
Review changed rule semantics/output as well as dependency compatibility.
Exceptions are limited to shexli 0.2.1 and the reviewed report specification;
new analyzer versions require re-evaluation. Runtime source changes deliberately
invalidate the schema exception fingerprints: re-review schema usage rather
than updating hashes mechanically. Do not disable whole rules or modify the
analyzer report.

The two narrowly matched exceptions in `scripts/check-package.py` address
verified shexli 0.2.1 implementation limitations:

- EGO-P-003 treats any GSettings use as requiring bundled schema XML. This
  extension only reads GNOME's `org.gnome.desktop.interface` system schema.
  Matching requires the reviewed JS fingerprints, four exact archive members,
  UUID, absent private-schema metadata, and exact finding message/evidence.
  Remove the exception when upstream distinguishes system schemas, or if this
  extension starts owning a schema (then include its XML).
- EGO-M-004 hard-codes Shell versions above 50 as future. Shell 51 is released.
  Matching requires the exact supported list 45–51, UUID and finding evidence.
  Remove the exception when upstream recognizes 51 or the support list changes.

Both exceptions require analyzer 0.2.1. The upstream causes are in
[`artifact.py`](https://gitlab.gnome.org/Infrastructure/extensions-web/-/blob/e053667b046ba8a9dbfd74503fdd0f5dc90939c5/shexli/shexli/analyzer/rules/artifact.py)
and [`metadata.py`](https://gitlab.gnome.org/Infrastructure/extensions-web/-/blob/e053667b046ba8a9dbfd74503fdd0f5dc90939c5/shexli/shexli/analyzer/rules/metadata.py).
The original findings remain in every report; no rule is disabled globally.

GitHub repository settings also enable dependency vulnerability alerts, Dependabot security updates, and weekly CodeQL default setup. Security updates propose pull requests; they do not merge them or publish app releases. The default CodeQL configuration lives in GitHub settings, alongside these versioned maintenance workflows.
