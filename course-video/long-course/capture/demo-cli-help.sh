#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/lib.sh"

ensure_node24
cd "$ROOT/archive/pi-agent-study/pi"

./pi-test.sh --help 2>&1 \
	| sed \
		-e '/^coding-agent /d' \
		-e '/^\[time\]/d' \
	| awk '
		NR <= 38 { print }
		/^Built-in Tool Names:/ { tools = 1 }
		tools { print }
	'
