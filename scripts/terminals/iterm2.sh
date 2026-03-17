#!/usr/bin/env bash
set -euo pipefail

directory="${1:-}"
command="${2:-}"

if [[ -z "${directory}" || -z "${command}" ]]; then
  echo "Usage: $0 <directory> <command>" >&2
  exit 1
fi

osascript - "${directory}" "${command}" <<'APPLESCRIPT'
on run argv
  set targetDir to item 1 of argv
  set runCommand to item 2 of argv

  tell application "iTerm"
    activate

    if (count of windows) is 0 then
      create window with default profile
    end if

    tell current window
      create tab with default profile
      tell current session
        write text "cd " & quoted form of targetDir & " && " & runCommand
      end tell
    end tell
  end tell
end run
APPLESCRIPT
