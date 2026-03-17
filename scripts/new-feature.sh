#!/usr/bin/env bash
set -euo pipefail

prompt=""
system_prompt_file=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --prompt)
      if [[ $# -lt 2 ]]; then
        echo "Missing value for --prompt" >&2
        exit 1
      fi
      prompt="$2"
      shift 2
      ;;
    --system-prompt-path)
      if [[ $# -lt 2 ]]; then
        echo "Missing value for --system-prompt-path" >&2
        exit 1
      fi
      system_prompt_file="$2"
      shift 2
      ;;
    *)
      echo "Unknown argument: $1" >&2
      echo "Usage: $0 --system-prompt-path <system_prompt_file> --prompt <prompt>" >&2
      exit 1
      ;;
  esac
done

if [[ -z "${prompt}" ]]; then
  echo "Usage: $0 --system-prompt-path <system_prompt_file> --prompt <prompt>" >&2
  exit 1
fi

if [[ -n "${system_prompt_file}" && -f "${system_prompt_file}" ]]; then
  exec claude "${prompt}" --system-prompt "$(cat "${system_prompt_file}")"
fi

exec claude "${prompt}"
