#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd -- "${SCRIPT_DIR}/.." && pwd)"
DIST_DIR="${REPO_DIR}/dist"

mkdir -p "${DIST_DIR}"

gnome-extensions pack \
    --force \
    --out-dir="${DIST_DIR}" \
    --extra-source=fuzzyTime.js \
    --extra-source=COPYING \
    "${REPO_DIR}"
