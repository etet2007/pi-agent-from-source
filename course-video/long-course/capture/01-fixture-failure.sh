#!/usr/bin/env bash

set -u
source "$(dirname "$0")/lib.sh"

title "01 / A CLEAR EXPECTATION, THEN A REAL FAILURE"
cd "$ROOT/archive/pi-agent-study/pi-agent-video-fixture"

prompt "pwd"
short_pwd

prompt "sed -n '1,20p' discount.test.js"
sed -n '1,20p' discount.test.js

printf '\n\033[1;34mExpected business result:\033[0m 200 x (1 - 15%%) = 170\n'
pause_for_reading 1.5

prompt "npm test --silent"
npm test --silent 2>&1 | shorten_paths || true

pause_for_reading 4
