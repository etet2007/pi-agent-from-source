#!/usr/bin/env bash

set -u
source "$(dirname "$0")/lib.sh"

title "02 / THE REAL CLI ENTRY"
cd "$ROOT/archive/pi-agent-study/pi"

prompt "./pi-test.sh --help"
./pi-test.sh --help 2>&1 \
	| sed '/^coding-agent main\.ts main()$/d; /^\[time\]/d' \
	| sed -n '1,58p'

pause_for_reading 4
