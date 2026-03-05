import { execa } from "execa";
import type { TerminalAdapter } from "./index.js";

export class iTerm2Adapter implements TerminalAdapter {
  getName(): string {
    return "iTerm2";
  }

  async openTabWithCommand(directory: string, command: string): Promise<void> {
    const escapedDir = directory.replace(/"/g, '\\"');
    const escapedCommand = command.replace(/"/g, '\\"');

    const script = `
      tell application "iTerm"
        activate
        tell current window
          create tab with default profile
          tell current session
            write text "cd \\"${escapedDir}\\" && ${escapedCommand}"
          end tell
        end tell
      end tell
    `;

    await execa("osascript", ["-e", script]);
  }
}

export async function openInITerm2(
  directory: string,
  command: string
): Promise<void> {
  const adapter = new iTerm2Adapter();
  await adapter.openTabWithCommand(directory, command);
}
