# wt-claude

CLI tool to manage git worktrees with Claude Code integration.

## Installation

```bash
npm install
npm run build
npm link
```

## Usage

### Interactive Mode

Run `wt` without arguments to enter interactive mode:

```bash
wt
```

This will:
1. Show a menu of registered repositories
2. Let you select a worktree or create a new one
3. Open iTerm2 with the worktree directory and start Claude Code

### Commands

```bash
# Register a repository
wt add /path/to/repo

# Unregister a repository
wt remove /path/to/repo

# Auto-detect and register all git repos in a directory
wt scan /path/to/directory
wt scan  # scans current directory

# List all repositories and their worktrees
wt list

# Set the global system prompt for Claude Code
wt config system-prompt "Your system prompt here"

# View the current system prompt
wt config system-prompt
```

## Configuration

Configuration is stored at `~/.wt-claude/config.json`.

Worktrees are stored under `~/.wt-claude/worktrees/<repo-name>/<branch>/` to keep your development directories clean.

## Features

- **Repository management**: Register repos manually or auto-scan directories
- **Worktree management**: List, create, and open worktrees
- **Claude Code integration**: 
  - Opens existing worktrees with `claude --resume`
  - Creates new worktrees with AI-improved prompts
  - Passes a configurable system prompt to all sessions
- **iTerm2 integration**: Opens new tabs with the correct working directory
