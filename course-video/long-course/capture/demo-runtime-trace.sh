#!/usr/bin/env bash

set -euo pipefail

if [[ $# -ne 1 ]]; then
	echo "Usage: $0 <no-tool|single-tool|parallel-tools>" >&2
	exit 2
fi

TRACE_NAME="$1"
case "$TRACE_NAME" in
	no-tool|single-tool|parallel-tools) ;;
	*)
		echo "Unknown trace: $TRACE_NAME" >&2
		exit 2
		;;
esac

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/lib.sh"

ensure_node24
cd "$ROOT/archive/pi-agent-study/pi"

TRACE_OUTPUT="$(mktemp)"
SELECTED_TRACE="$(mktemp)"
trap 'rm -f "$TRACE_OUTPUT" "$SELECTED_TRACE"' EXIT

npx tsx scripts/video-evidence-traces.ts > "$TRACE_OUTPUT"

{
	printf '{\n'
	awk -v trace="\"name\": \""$TRACE_NAME"\"" '
		index($0, trace) { printing = 1 }
		printing { print }
		printing && /^}$/ { exit }
	' "$TRACE_OUTPUT"
} > "$SELECTED_TRACE"

jq -r '
	"trace: \(.name)",
	"",
	"observed events:",
	(.events[] | "  " + .),
	"",
	"returned messages:",
	(.messages[] |
		"  " + .role +
		(if .toolCallId then " (" + .toolCallId + ")" else "" end)
	)
' "$SELECTED_TRACE"
