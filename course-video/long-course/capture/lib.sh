#!/usr/bin/env bash

set -u

CAPTURE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$CAPTURE_DIR/../../.." && pwd)"

export NO_COLOR=1
export FORCE_COLOR=0

ensure_node24() {
	if command -v node >/dev/null 2>&1 && [[ "$(node -p 'process.versions.node.split(\".\")[0]')" -ge 24 ]]; then
		return
	fi

	if [[ -s "$HOME/.nvm/nvm.sh" ]]; then
		# shellcheck disable=SC1091
		source "$HOME/.nvm/nvm.sh"
		nvm use 24 >/dev/null
	fi

	if ! command -v node >/dev/null 2>&1 || [[ "$(node -p 'process.versions.node.split(\".\")[0]')" -lt 24 ]]; then
		echo "Node.js 24 or newer is required." >&2
		return 1
	fi
}

title() {
	printf '\033]0;Pi Agent Source Walkthrough\007'
	printf '\033[2J\033[H'
	printf '\033[1;36mPI AGENT / REAL TERMINAL\033[0m\n'
	printf '\033[2m%s\033[0m\n\n' "$1"
}

prompt() {
	printf '\n\033[1;32m$\033[0m \033[1m%s\033[0m\n' "$1"
	sleep 0.7
}

pause_for_reading() {
	sleep "${1:-2}"
}

short_pwd() {
	case "$PWD" in
		"$ROOT/archive/pi-agent-study/pi-agent-video-fixture")
			printf '%s\n' '~/pi-agent-demo'
			;;
		"$ROOT/archive/pi-agent-study/pi")
			printf '%s\n' '~/pi-source'
			;;
		*)
			pwd | sed "s|^$HOME|~|"
			;;
	esac
}

shorten_paths() {
	sed \
		-e "s|$ROOT/archive/pi-agent-study/pi-agent-video-fixture|~/pi-agent-demo|g" \
		-e "s|$ROOT/archive/pi-agent-study/pi|~/pi-source|g" \
		-e "s|$HOME|~|g"
}
