#!/usr/bin/env bash

set -u
source "$(dirname "$0")/lib.sh"

title "03 / REAL RUNTIME, DETERMINISTIC MODEL"
cd "$ROOT/archive/pi-agent-study/pi"

printf '\033[2mThe Agent Loop and tools are production code. Only the model stream is deterministic.\033[0m\n'
prompt "npx tsx scripts/video-evidence-traces.ts"
npx tsx scripts/video-evidence-traces.ts

pause_for_reading 5
