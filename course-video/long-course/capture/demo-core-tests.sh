#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/lib.sh"

ensure_node24
cd "$ROOT/archive/pi-agent-study/pi"

npx vitest run \
	packages/agent/test/agent-loop.test.ts \
	packages/agent/test/agent.test.ts \
	2>&1 | sed "s|$ROOT/archive/pi-agent-study/pi|~/pi-source|g"
