import { readFile, writeFile, mkdir, readdir, stat } from "fs/promises";
import { existsSync } from "fs";
import { homedir } from "os";
import { join, resolve, basename } from "path";

export interface Repository {
  path: string;
  name: string;
}

export interface Config {
  repositories: Repository[];
  systemPrompt: string;
  worktreesDir: string;
}

const CONFIG_DIR = join(homedir(), ".wt-claude");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");
const WORKTREES_DIR = join(CONFIG_DIR, "worktrees");

const DEFAULT_CONFIG: Config = {
  repositories: [],
  systemPrompt: "",
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

  if (!existsSync(CONFIG_FILE)) {
    await saveConfig(DEFAULT_CONFIG);
    return DEFAULT_CONFIG;
  }

  try {
    const content = await readFile(CONFIG_FILE, "utf-8");
    const config = JSON.parse(content) as Partial<Config>;
    return {
      ...DEFAULT_CONFIG,
      ...config,
    };
  } catch {
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
}

export async function getSystemPrompt(): Promise<string> {
  const config = await loadConfig();
  return config.systemPrompt;
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
