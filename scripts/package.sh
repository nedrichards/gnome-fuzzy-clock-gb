#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd -- "${SCRIPT_DIR}/.." && pwd)"
METADATA_FILE="${REPO_DIR}/metadata.json"
DIST_DIR="${REPO_DIR}/dist"

if [[ ! -f "${METADATA_FILE}" ]]; then
    echo "metadata.json not found in ${REPO_DIR}" >&2
    exit 1
fi

UUID="$(sed -n 's/.*"uuid":[[:space:]]*"\([^"]*\)".*/\1/p' "${METADATA_FILE}" | head -n 1)"

if [[ -z "${UUID}" ]]; then
    echo "Could not read extension UUID from ${METADATA_FILE}" >&2
    exit 1
fi

mkdir -p "${DIST_DIR}"

OUTPUT_FILE="${DIST_DIR}/${UUID}.zip"

rm -f "${OUTPUT_FILE}"

cd "${REPO_DIR}"
zip -r "${OUTPUT_FILE}" \
    metadata.json \
    extension.js \
    fuzzyTime.js \
    README.md

echo "Created ${OUTPUT_FILE}"
