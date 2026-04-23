#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd -- "${SCRIPT_DIR}/.." && pwd)"
METADATA_FILE="${REPO_DIR}/metadata.json"
EXTENSIONS_DIR="${HOME}/.local/share/gnome-shell/extensions"

if [[ ! -f "${METADATA_FILE}" ]]; then
    echo "metadata.json not found in ${REPO_DIR}" >&2
    exit 1
fi

UUID="$(sed -n 's/.*"uuid":[[:space:]]*"\([^"]*\)".*/\1/p' "${METADATA_FILE}" | head -n 1)"

if [[ -z "${UUID}" ]]; then
    echo "Could not read extension UUID from ${METADATA_FILE}" >&2
    exit 1
fi

TARGET_DIR="${EXTENSIONS_DIR}/${UUID}"

mkdir -p "${EXTENSIONS_DIR}"
ln -sfn "${REPO_DIR}" "${TARGET_DIR}"

echo "Installed symlink:"
echo "  ${TARGET_DIR} -> ${REPO_DIR}"
echo
echo "Enable with:"
echo "  gnome-extensions enable ${UUID}"
echo
echo "If GNOME Shell does not pick it up immediately, restart the shell on X11 or log out and back in on Wayland."
