import { getSystemPrompt } from "./config.js";

export interface ImprovedPromptResult {
  improvedPrompt: string;
  branchName: string;
}

export async function buildResumeCommand(): Promise<string> {
  const systemPrompt = await getSystemPrompt();
  if (systemPrompt) {
    const escapedPrompt = systemPrompt.replace(/'/g, "'\\''");
    return `claude --resume --system-prompt '${escapedPrompt}'`;
  }
  return "claude --resume";
}

export async function buildNewSessionCommand(prompt: string): Promise<string> {
  const systemPrompt = await getSystemPrompt();
  const escapedPrompt = prompt.replace(/'/g, "'\\''");

  if (systemPrompt) {
    const escapedSystemPrompt = systemPrompt.replace(/'/g, "'\\''");
    return `claude -p '${escapedPrompt}' --system-prompt '${escapedSystemPrompt}'`;
  }
  return `claude -p '${escapedPrompt}'`;
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
