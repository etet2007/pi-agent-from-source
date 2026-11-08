#!/usr/bin/env bash

set -euo pipefail

if [[ $# -ne 3 ]]; then
	echo "Usage: $0 <capture-script> <duration-seconds> <output.mov>" >&2
	exit 2
fi

CAPTURE_SCRIPT="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"
DURATION="$2"
OUTPUT="$(cd "$(dirname "$3")" && pwd)/$(basename "$3")"

WINDOW_LEFT=50
WINDOW_TOP=40
WINDOW_RIGHT=1300
WINDOW_BOTTOM=743
CAPTURE_WIDTH=$((WINDOW_RIGHT - WINDOW_LEFT))
CAPTURE_HEIGHT=$((WINDOW_BOTTOM - WINDOW_TOP))

ORIGINAL_SETTINGS="$(osascript <<'APPLESCRIPT'
tell application "Terminal"
	set targetSettings to settings set "Basic"
	set fontName to font of targetSettings
	set fontPointSize to font size of targetSettings
	set backgroundRgb to background color of targetSettings
	set normalRgb to normal text color of targetSettings
	set boldRgb to bold text color of targetSettings
	set antialiasingEnabled to font antialiasing of targetSettings
	return fontName & "|" & fontPointSize & "|" & item 1 of backgroundRgb & "," & item 2 of backgroundRgb & "," & item 3 of backgroundRgb & "|" & item 1 of normalRgb & "," & item 2 of normalRgb & "," & item 3 of normalRgb & "|" & item 1 of boldRgb & "," & item 2 of boldRgb & "," & item 3 of boldRgb & "|" & antialiasingEnabled
end tell
APPLESCRIPT
)"

IFS='|' read -r \
	ORIGINAL_FONT \
	ORIGINAL_SIZE \
	ORIGINAL_BACKGROUND \
	ORIGINAL_NORMAL \
	ORIGINAL_BOLD \
	ORIGINAL_ANTIALIASING <<< "$ORIGINAL_SETTINGS"

restore_terminal_settings() {
	osascript <<APPLESCRIPT >/dev/null
tell application "Terminal"
	set targetSettings to settings set "Basic"
	set font of targetSettings to "$ORIGINAL_FONT"
	set font size of targetSettings to $ORIGINAL_SIZE
	set background color of targetSettings to {$ORIGINAL_BACKGROUND}
	set normal text color of targetSettings to {$ORIGINAL_NORMAL}
	set bold text color of targetSettings to {$ORIGINAL_BOLD}
	set font antialiasing of targetSettings to $ORIGINAL_ANTIALIASING
end tell
APPLESCRIPT
}

trap restore_terminal_settings EXIT

osascript <<APPLESCRIPT
tell application "Terminal"
	set targetSettings to settings set "Basic"
	set font of targetSettings to "Menlo"
	set font size of targetSettings to 20
	set background color of targetSettings to {0, 0, 0}
	set normal text color of targetSettings to {62000, 62000, 62000}
	set bold text color of targetSettings to {65535, 65535, 65535}
	set font antialiasing of targetSettings to true

	activate
	set captureTab to do script "sleep 2; zsh " & quoted form of "$CAPTURE_SCRIPT"
	set bounds of front window to {$WINDOW_LEFT, $WINDOW_TOP, $WINDOW_RIGHT, $WINDOW_BOTTOM}
	set current settings of captureTab to targetSettings
end tell
APPLESCRIPT

sleep 0.8
screencapture \
	-x \
	-v \
	-V"$DURATION" \
	-R"$WINDOW_LEFT,$WINDOW_TOP,$CAPTURE_WIDTH,$CAPTURE_HEIGHT" \
	"$OUTPUT"

ffprobe -v error \
	-show_entries format=duration,size \
	-of default=noprint_wrappers=1 \
	"$OUTPUT"

osascript <<'APPLESCRIPT'
tell application "Terminal"
	repeat with terminalWindow in windows
		if name of terminalWindow contains "Pi Agent Source Walkthrough" then
			close terminalWindow
			exit repeat
		end if
	end repeat
end tell
APPLESCRIPT

restore_terminal_settings
trap - EXIT
