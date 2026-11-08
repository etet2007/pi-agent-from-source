#!/usr/bin/env bash

set -euo pipefail

if [[ $# -ne 1 ]]; then
	echo "Usage: $0 <file.tape>" >&2
	exit 2
fi

if command -v vhs-ipv4 >/dev/null 2>&1; then
	exec vhs-ipv4 "$1"
fi

exec vhs "$1"
