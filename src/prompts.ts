import { select, input, confirm } from "@inquirer/prompts";
import search from "@inquirer/search";
import chalk from "chalk";
import { getRepositories, type Repository } from "./config.js";
import { listWorktrees, createWorktree, type Worktree } from "./git.js";
import { openInITerm2 } from "./terminal/iterm2.js";
import {
  buildResumeCommand,
  buildNewSessionCommand,
  deriveBranchAndPrompt,
} from "./claude.js";

const CREATE_NEW_WORKTREE = "__create_new__";
const GO_BACK = "__go_back__";

function fuzzyMatch(pattern: string, text: string): boolean {
  if (!pattern) return true;
  pattern = pattern.toLowerCase();
  text = text.toLowerCase();
  
  let patternIdx = 0;
  for (let i = 0; i < text.length && patternIdx < pattern.length; i++) {
    if (text[i] === pattern[patternIdx]) {
      patternIdx++;
    }
  }
  return patternIdx === pattern.length;
}

export async function runInteractiveMenu(): Promise<void> {
  const repos = await getRepositories();

  if (repos.length === 0) {
    console.log(chalk.yellow("No repositories registered."));
    console.log(
      chalk.gray("Use 'wt add <path>' to register a repository, or 'wt scan <dir>' to auto-detect.")
    );
    return;
  }

  const repo = await selectRepository(repos);
  if (!repo) return;

  await handleWorktreeMenu(repo);
}

async function selectRepository(repos: Repository[]): Promise<Repository | null> {
  if (repos.length <= 5) {
    const choices = repos.map((r) => ({
      name: `${r.name} ${chalk.gray(`(${r.path})`)}`,
      value: r,
    }));

    return select({
      message: "Select a repository:",
      choices,
    });
  }

  const selected = await search<Repository>({
    message: "Search for a repository:",
    source: async (term: string | undefined) => {
      return repos
        .filter((r) => fuzzyMatch(term || "", `${r.name} ${r.path}`))
        .map((r) => ({
          name: `${r.name} ${chalk.gray(`(${r.path})`)}`,
          value: r,
        }));
    },
  });

  return selected;
}

async function handleWorktreeMenu(repo: Repository): Promise<void> {
  const allWorktrees = await listWorktrees(repo.path);
  const worktrees = allWorktrees.filter((wt) => !wt.isMain);

  const createNewChoice = { name: chalk.green("+ Create new worktree"), value: CREATE_NEW_WORKTREE };
  const backChoice = { name: chalk.gray("← Back"), value: GO_BACK };

  if (worktrees.length <= 5) {
    const choices = [
      { name: chalk.green("+ Create new worktree"), value: CREATE_NEW_WORKTREE },
      ...worktrees.map((wt) => ({
        name: formatWorktreeChoice(wt),
        value: wt.path,
      })),
      { name: chalk.gray("← Back"), value: GO_BACK },
    ];

    const selected = await select({
      message: `Worktrees for ${chalk.cyan(repo.name)}:`,
      choices,
    });

    if (selected === GO_BACK) {
      return;
    }

    if (selected === CREATE_NEW_WORKTREE) {
      await handleCreateWorktree(repo);
      return;
    }

    await openWorktreeInTerminal(selected);
    return;
  }

  const worktreeChoices = worktrees.map((wt) => ({
    name: formatWorktreeChoice(wt),
    value: wt.path,
    branch: wt.branch,
  }));

  const selected = await search<string>({
    message: `Search worktrees for ${chalk.cyan(repo.name)}:`,
    source: async (term: string | undefined) => {
      const filtered = worktreeChoices.filter((c) =>
        fuzzyMatch(term || "", c.branch)
      );
      return [
        createNewChoice,
        ...filtered.map((c) => ({ name: c.name, value: c.value })),
        backChoice,
      ];
    },
  });

  if (selected === GO_BACK) {
    return;
  }

  if (selected === CREATE_NEW_WORKTREE) {
    await handleCreateWorktree(repo);
    return;
  }

  await openWorktreeInTerminal(selected);
}

function formatWorktreeChoice(wt: Worktree): string {
  return `${wt.branch} ${chalk.gray(`(${wt.commit})`)}`;
}

async function openWorktreeInTerminal(worktreePath: string): Promise<void> {
  console.log(chalk.blue(`Opening worktree: ${worktreePath}`));

  const command = await buildResumeCommand();
  console.log(chalk.gray(`Running: ${command}`));

  await openInITerm2(worktreePath, command);
  console.log(chalk.green("✓ Opened in new iTerm2 tab"));
}

async function handleCreateWorktree(repo: Repository): Promise<void> {
  const featureDescription = await input({
    message: "Describe the feature you want to develop:",
    validate: (value) => (value.trim() ? true : "Please enter a description"),
  });

  console.log(chalk.blue("Deriving branch name..."));

  const { improvedPrompt, branchName } = deriveBranchAndPrompt(featureDescription);

  console.log(chalk.gray(`Branch name: ${branchName}`));

  const proceed = await confirm({
    message: `Create worktree with branch '${branchName}'?`,
    default: true,
  });

  if (!proceed) {
    console.log(chalk.yellow("Cancelled."));
    return;
  }

  console.log(chalk.blue("Creating worktree..."));

  try {
    const worktreePath = await createWorktree(repo.path, branchName);
    console.log(chalk.green(`✓ Created worktree at: ${worktreePath}`));

    const command = await buildNewSessionCommand(improvedPrompt);
    console.log(chalk.gray(`Running: ${command.substring(0, 80)}...`));

    await openInITerm2(worktreePath, command);
    console.log(chalk.green("✓ Opened in new iTerm2 tab with Claude"));
  } catch (error) {
    if (error instanceof Error) {
      console.error(chalk.red(`Failed to create worktree: ${error.message}`));
    } else {
      console.error(chalk.red("Failed to create worktree"));
    }
  }
}
