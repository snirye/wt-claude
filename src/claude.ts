import { getSystemPromptFilePath } from "./config.js";
import { existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

export interface ImprovedPromptResult {
  improvedPrompt: string;
  branchName: string;
}

export async function buildResumeCommand(): Promise<string> {
  const systemPromptFilePath = await getSystemPromptFilePath();
  const scriptPath = join(getScriptsDir(), "resume.sh");

  return `bash ${shellQuote(scriptPath)} --system-prompt-path ${shellQuote(systemPromptFilePath)}`;
}

export async function buildNewSessionCommand(prompt: string): Promise<string> {
  const systemPromptFilePath = await getSystemPromptFilePath();
  const scriptPath = join(getScriptsDir(), "new-feature.sh");

  return `bash ${shellQuote(scriptPath)} --system-prompt-path ${shellQuote(systemPromptFilePath)} --prompt ${shellQuote(prompt)}`;
}

export function deriveBranchAndPrompt(userPrompt: string): ImprovedPromptResult {
  return {
    improvedPrompt: userPrompt,
    branchName: deriveBranchFromPrompt(userPrompt),
  };
}

const STOP_WORDS = new Set([
  "the", "and", "for", "that", "this", "with", "from", "have", "has",
  "are", "was", "were", "been", "being", "will", "would", "could", "should",
  "can", "may", "might", "must", "shall", "into", "onto", "upon", "about",
  "how", "what", "when", "where", "which", "who", "whom", "why", "way",
  "now", "then", "here", "there", "some", "any", "all", "both", "each",
  "check", "suggest", "better", "happen", "happens", "make", "get", "set",
]);

function deriveBranchFromPrompt(prompt: string): string {
  const words = prompt
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w))
    .slice(0, 4);

  return `feature/${words.join("-") || "new-feature"}`;
}

function getScriptsDir(): string {
  const currentFilePath = fileURLToPath(import.meta.url);
  const currentDir = dirname(currentFilePath);

  const distCandidate = join(currentDir, "scripts");
  if (existsSync(distCandidate)) {
    return distCandidate;
  }

  return join(currentDir, "..", "scripts");
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, "'\\''")}'`;
}
