# Maintenance

Dependabot proposes npm and GitHub Actions updates weekly. The Check workflow runs lint, unit tests, and package checks on changes and on demand. Tested extension ZIPs are named by checkout SHA and retained for 14 days, with download links in the Actions summary. GNOME Shell compatibility still needs validation in a real session before publishing an extension update.

GitHub repository settings also enable dependency vulnerability alerts, Dependabot security updates, and weekly CodeQL default setup. Security updates propose pull requests; they do not merge them or publish app releases. The default CodeQL configuration lives in GitHub settings, alongside these versioned maintenance workflows.
