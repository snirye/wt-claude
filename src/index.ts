import { Command } from "commander";
import chalk from "chalk";
import {
  addRepository,
  removeRepository,
  getRepositories,
  registerScannedRepos,
  setSystemPrompt,
  getSystemPrompt,
} from "./config.js";
import { listWorktrees } from "./git.js";
import { runInteractiveMenu } from "./prompts.js";
import { runFullScreenUI } from "./ui/index.js";
import { logSuccess, logError, logInfo, logWarning } from "./utils.js";

const program = new Command();

program
  .name("wt")
  .description("Manage git worktrees with Claude Code integration")
  .version("1.0.0");

program.option("--minimal-ui", "Use minimal interactive UI instead of full-screen");

program
  .command("add <path>")
  .description("Register a repository")
  .action(async (path: string) => {
    try {
      const added = await addRepository(path);
      if (added) {
        logSuccess(`Registered repository: ${path}`);
      } else {
        logWarning(`Repository already registered: ${path}`);
      }
    } catch (error) {
      if (error instanceof Error) {
        logError(error.message);
      }
      process.exit(1);
    }
  });

program
  .command("remove <path>")
  .description("Unregister a repository")
  .action(async (path: string) => {
    try {
      const removed = await removeRepository(path);
      if (removed) {
        logSuccess(`Unregistered repository: ${path}`);
      } else {
        logWarning(`Repository not found: ${path}`);
      }
    } catch (error) {
      if (error instanceof Error) {
        logError(error.message);
      }
      process.exit(1);
    }
  });

program
  .command("list")
  .description("List all registered repositories and their worktrees")
  .action(async () => {
    try {
      const repos = await getRepositories();

      if (repos.length === 0) {
        logInfo("No repositories registered.");
        console.log(chalk.gray("Use 'wt add <path>' or 'wt scan <dir>' to add repositories."));
        return;
      }

      for (const repo of repos) {
        console.log(chalk.cyan(`\n${repo.name}`));
        console.log(chalk.gray(`  Path: ${repo.path}`));

        const allWorktrees = await listWorktrees(repo.path);
        const worktrees = allWorktrees.filter((wt) => !wt.isMain);

        if (worktrees.length === 0) {
          console.log(chalk.gray(`  Worktrees: (none)`));
        } else {
          console.log(chalk.gray(`  Worktrees:`));
          for (const wt of worktrees) {
            console.log(
              chalk.white(`    - ${wt.branch} ${chalk.gray(`(${wt.commit})`)}`)
            );
            console.log(chalk.gray(`      ${wt.path}`));
          }
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        logError(error.message);
      }
      process.exit(1);
    }
  });

program
  .command("scan [directory]")
  .description("Auto-detect and register git repositories in a directory")
  .action(async (directory?: string) => {
    const dir = directory || process.cwd();
    try {
      logInfo(`Scanning for repositories in: ${dir}`);
      const count = await registerScannedRepos(dir);

      if (count > 0) {
        logSuccess(`Registered ${count} new repository(ies)`);
      } else {
        logInfo("No new repositories found.");
      }
    } catch (error) {
      if (error instanceof Error) {
        logError(error.message);
      }
      process.exit(1);
    }
  });

const configCmd = program
  .command("config")
  .description("Manage configuration");

configCmd
  .command("system-prompt [prompt]")
  .description("Get or set the global system prompt for Claude Code sessions")
  .action(async (prompt?: string) => {
    try {
      if (prompt === undefined) {
        const current = await getSystemPrompt();
        if (current) {
          console.log(chalk.cyan("Current system prompt:"));
          console.log(current);
        } else {
          logInfo("No system prompt configured.");
          console.log(chalk.gray("Use 'wt config system-prompt \"your prompt\"' to set one."));
        }
      } else {
        await setSystemPrompt(prompt);
        logSuccess("System prompt updated.");
      }
    } catch (error) {
      if (error instanceof Error) {
        logError(error.message);
      }
      process.exit(1);
    }
  });

program
  .action(async () => {
    try {
      const options = program.opts<{ minimalUi?: boolean }>();
      if (options.minimalUi) {
        await runInteractiveMenu();
      } else {
        await runFullScreenUI();
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes("User force closed")) {
        console.log(chalk.gray("\nCancelled."));
        process.exit(0);
      }
      throw error;
    }
  });

program.parse();
