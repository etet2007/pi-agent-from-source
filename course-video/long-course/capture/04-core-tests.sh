#!/usr/bin/env bash

set -u
source "$(dirname "$0")/lib.sh"

title "04 / VERIFY THE AGENT RUNTIME"
cd "$ROOT/archive/pi-agent-study/pi"

prompt "npx vitest run packages/agent/test/agent-loop.test.ts packages/agent/test/agent.test.ts"
npx vitest run \
	packages/agent/test/agent-loop.test.ts \
	packages/agent/test/agent.test.ts \
	2>&1 | shorten_paths

pause_for_reading 5
