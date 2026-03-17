import { execa } from "execa";
import { existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

export async function openInTerminal(
  directory: string,
  command: string
): Promise<void> {
  const terminalScriptPath = join(getScriptsDir(), "terminals", "iterm2.sh");

  await execa("bash", [terminalScriptPath, directory, command]);
}

function getScriptsDir(): string {
  const currentFilePath = fileURLToPath(import.meta.url);
  const currentDir = dirname(currentFilePath);

  const distCandidate = join(currentDir, "..", "scripts");
  if (existsSync(distCandidate)) {
    return distCandidate;
  }

  return join(currentDir, "..", "..", "scripts");
}
