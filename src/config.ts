import { readFile, writeFile, mkdir, readdir, stat } from "fs/promises";
import { existsSync } from "fs";
import { homedir } from "os";
import { join, resolve, basename, dirname } from "path";

export interface Repository {
  path: string;
  name: string;
}

export interface Config {
  repositories: Repository[];
  systemPrompt: string;
  systemPromptFile: string;
  worktreesDir: string;
}

const CONFIG_DIR = join(homedir(), ".wt-claude");
const CONFIG_FILE = join(CONFIG_DIR, "wt-config.json");
const LEGACY_CONFIG_FILE = join(CONFIG_DIR, "config.json");
const WORKTREES_DIR = join(CONFIG_DIR, "worktrees");
const DEFAULT_SYSTEM_PROMPT_FILE = join(CONFIG_DIR, "system-prompt.md");

const DEFAULT_SYSTEM_PROMPT = `You are working inside a git worktree — an isolated working directory tied to a specific feature branch. The main repository checkout exists elsewhere; do not modify it.

- You are on a feature branch. Stay on it — never switch to main/master.
- Keep commits focused and atomic. Each commit should represent a single logical change.
- When the work is ready, create a pull request with a concise summary and test plan.
- Start by understanding the task on this branch. If the branch name or initial prompt hints at the goal, confirm your understanding before diving in.`;

const DEFAULT_CONFIG: Config = {
  repositories: [],
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
  systemPromptFile: DEFAULT_SYSTEM_PROMPT_FILE,
  worktreesDir: WORKTREES_DIR,
};

export async function ensureConfigDir(): Promise<void> {
  if (!existsSync(CONFIG_DIR)) {
    await mkdir(CONFIG_DIR, { recursive: true });
  }
  if (!existsSync(WORKTREES_DIR)) {
    await mkdir(WORKTREES_DIR, { recursive: true });
  }
}

export async function loadConfig(): Promise<Config> {
  await ensureConfigDir();

  if (!existsSync(CONFIG_FILE) && existsSync(LEGACY_CONFIG_FILE)) {
    const legacyContent = await readFile(LEGACY_CONFIG_FILE, "utf-8");
    const legacyConfig = JSON.parse(legacyContent) as Partial<Config>;
    const migratedConfig = {
      ...DEFAULT_CONFIG,
      ...legacyConfig,
    };
    await saveConfig(migratedConfig);
    await ensureSystemPromptFile(migratedConfig.systemPrompt, migratedConfig.systemPromptFile);
    return migratedConfig;
  }

  if (!existsSync(CONFIG_FILE)) {
    await saveConfig(DEFAULT_CONFIG);
    await ensureSystemPromptFile(DEFAULT_CONFIG.systemPrompt, DEFAULT_CONFIG.systemPromptFile);
    return DEFAULT_CONFIG;
  }

  try {
    const content = await readFile(CONFIG_FILE, "utf-8");
    const config = JSON.parse(content) as Partial<Config>;
    const merged = {
      ...DEFAULT_CONFIG,
      ...config,
    };
    await ensureSystemPromptFile(merged.systemPrompt, merged.systemPromptFile);
    return merged;
  } catch {
    await ensureSystemPromptFile(DEFAULT_CONFIG.systemPrompt, DEFAULT_CONFIG.systemPromptFile);
    return DEFAULT_CONFIG;
  }
}

export async function saveConfig(config: Config): Promise<void> {
  await ensureConfigDir();
  await writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
}

export async function addRepository(repoPath: string): Promise<boolean> {
  const config = await loadConfig();
  const absolutePath = resolve(repoPath);

  if (config.repositories.some((r) => r.path === absolutePath)) {
    return false;
  }

  const gitDir = join(absolutePath, ".git");
  if (!existsSync(gitDir)) {
    throw new Error(`Not a git repository: ${absolutePath}`);
  }

  config.repositories.push({
    path: absolutePath,
    name: basename(absolutePath),
  });

  await saveConfig(config);
  return true;
}

export async function removeRepository(repoPath: string): Promise<boolean> {
  const config = await loadConfig();
  const absolutePath = resolve(repoPath);

  const index = config.repositories.findIndex((r) => r.path === absolutePath);
  if (index === -1) {
    return false;
  }

  config.repositories.splice(index, 1);
  await saveConfig(config);
  return true;
}

export async function getRepositories(): Promise<Repository[]> {
  const config = await loadConfig();
  return config.repositories;
}

export async function setSystemPrompt(prompt: string): Promise<void> {
  const config = await loadConfig();
  config.systemPrompt = prompt;
  await saveConfig(config);
  await mkdir(dirname(config.systemPromptFile), { recursive: true });
  await writeFile(config.systemPromptFile, prompt, "utf-8");
}

export async function getSystemPrompt(): Promise<string> {
  const config = await loadConfig();
  return readFile(config.systemPromptFile, "utf-8");
}

export async function getWorktreesDir(): Promise<string> {
  const config = await loadConfig();
  return config.worktreesDir;
}

export async function scanForRepositories(
  directory: string
): Promise<string[]> {
  const absoluteDir = resolve(directory);
  const found: string[] = [];

  try {
    const entries = await readdir(absoluteDir);

    for (const entry of entries) {
      const entryPath = join(absoluteDir, entry);
      const entryStat = await stat(entryPath);

      if (entryStat.isDirectory()) {
        const gitDir = join(entryPath, ".git");
        if (existsSync(gitDir)) {
          found.push(entryPath);
        }
      }
    }
  } catch {
    throw new Error(`Cannot read directory: ${absoluteDir}`);
  }

  return found;
}

export async function registerScannedRepos(directory: string): Promise<number> {
  const repos = await scanForRepositories(directory);
  let added = 0;

  for (const repoPath of repos) {
    if (await addRepository(repoPath)) {
      added++;
    }
  }

  return added;
}

export function getConfigDir(): string {
  return CONFIG_DIR;
}

export async function getSystemPromptFilePath(): Promise<string> {
  const config = await loadConfig();
  return config.systemPromptFile;
}

async function ensureSystemPromptFile(defaultPrompt: string, promptFilePath: string): Promise<void> {
  if (!existsSync(promptFilePath)) {
    await mkdir(dirname(promptFilePath), { recursive: true });
    await writeFile(promptFilePath, defaultPrompt, "utf-8");
  }
}
