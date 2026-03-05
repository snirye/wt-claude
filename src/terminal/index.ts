export interface TerminalAdapter {
  openTabWithCommand(directory: string, command: string): Promise<void>;
  getName(): string;
}

export { iTerm2Adapter } from "./iterm2.js";
