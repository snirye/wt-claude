import { execa } from "execa";
import { join, basename } from "path";
import { mkdir } from "fs/promises";
import { existsSync } from "fs";
import { getWorktreesDir } from "./config.js";

export interface Worktree {
  path: string;
  branch: string;
  commit: string;
  isMain: boolean;
  prStatus?: PullRequestStatus;
}

export type PullRequestLifecycle = "open" | "merged" | "closed" | "no-pr" | "unknown";

export interface PullRequestStatus {
  lifecycle: PullRequestLifecycle;
  number?: number;
  title?: string;
  url?: string;
  isDraft?: boolean;
}

export async function listWorktrees(repoPath: string): Promise<Worktree[]> {
  try {
    const { stdout } = await execa("git", ["worktree", "list", "--porcelain"], {
      cwd: repoPath,
    });

    const worktrees: Worktree[] = [];
    const blocks = stdout.split("\n\n").filter((b) => b.trim());

    for (const block of blocks) {
      const lines = block.split("\n");
      let path = "";
      let commit = "";
      let branch = "";

      for (const line of lines) {
        if (line.startsWith("worktree ")) {
          path = line.replace("worktree ", "");
        } else if (line.startsWith("HEAD ")) {
          commit = line.replace("HEAD ", "").substring(0, 7);
        } else if (line.startsWith("branch ")) {
          branch = line.replace("branch refs/heads/", "");
        } else if (line === "detached") {
          branch = "(detached)";
        }
      }

      if (path) {
        const isMain = path === repoPath;
        worktrees.push({ path, branch, commit, isMain });
      }
    }

    return worktrees;
  } catch {
    return [
      {
        path: repoPath,
        branch: await getCurrentBranch(repoPath),
        commit: await getCurrentCommit(repoPath),
        isMain: true,
      },
    ];
  }
}

export async function getCurrentBranch(repoPath: string): Promise<string> {
  try {
    const { stdout } = await execa(
      "git",
      ["rev-parse", "--abbrev-ref", "HEAD"],
      { cwd: repoPath }
    );
    return stdout.trim();
  } catch {
    return "unknown";
  }
}

export async function getCurrentCommit(repoPath: string): Promise<string> {
  try {
    const { stdout } = await execa("git", ["rev-parse", "--short", "HEAD"], {
      cwd: repoPath,
    });
    return stdout.trim();
  } catch {
    return "unknown";
  }
}

interface GithubPullRequestRow {
  number: number;
  title: string;
  url: string;
  state: "OPEN" | "CLOSED";
  isDraft: boolean;
  mergedAt: string | null;
}

function resolveLifecycle(pr: GithubPullRequestRow): PullRequestLifecycle {
  if (pr.state === "OPEN") {
    return "open";
  }

  if (pr.mergedAt) {
    return "merged";
  }

  return "closed";
}

function noPullRequestStatus(): PullRequestStatus {
  return { lifecycle: "no-pr" };
}

export async function getBranchPullRequestStatus(
  repoPath: string,
  branchName: string
): Promise<PullRequestStatus> {
  if (!branchName || branchName === "(detached)") {
    return noPullRequestStatus();
  }

  try {
    const { stdout } = await execa(
      "gh",
      [
        "pr",
        "list",
        "--head",
        branchName,
        "--state",
        "all",
        "--limit",
        "1",
        "--json",
        "number,title,url,state,isDraft,mergedAt",
      ],
      { cwd: repoPath }
    );

    const parsed = JSON.parse(stdout) as GithubPullRequestRow[];
    const pr = parsed[0];
    if (!pr) {
      return noPullRequestStatus();
    }

    return {
      lifecycle: resolveLifecycle(pr),
      number: pr.number,
      title: pr.title,
      url: pr.url,
      isDraft: pr.isDraft,
    };
  } catch {
    return { lifecycle: "unknown" };
  }
}

export async function createWorktree(
  repoPath: string,
  branchName: string,
  baseBranch?: string
): Promise<string> {
  const worktreesDir = await getWorktreesDir();
  const repoName = basename(repoPath);
  const sanitizedBranch = branchName.replace(/\//g, "-");
  const worktreePath = join(worktreesDir, repoName, sanitizedBranch);

  const repoWorktreesDir = join(worktreesDir, repoName);
  if (!existsSync(repoWorktreesDir)) {
    await mkdir(repoWorktreesDir, { recursive: true });
  }

  const base = baseBranch || (await getDefaultBranch(repoPath));

  await execa("git", ["worktree", "add", "-b", branchName, worktreePath, base], {
    cwd: repoPath,
  });

  return worktreePath;
}

export async function getDefaultBranch(repoPath: string): Promise<string> {
  try {
    const { stdout } = await execa(
      "git",
      ["symbolic-ref", "refs/remotes/origin/HEAD", "--short"],
      { cwd: repoPath }
    );
    return stdout.trim().replace("origin/", "");
  } catch {
    try {
      const { stdout } = await execa(
        "git",
        ["branch", "--list", "main", "master"],
        { cwd: repoPath }
      );
      if (stdout.includes("main")) return "main";
      if (stdout.includes("master")) return "master";
    } catch {
      // Fall through
    }
    return "main";
  }
}

export async function isGitRepository(path: string): Promise<boolean> {
  try {
    await execa("git", ["rev-parse", "--git-dir"], { cwd: path });
    return true;
  } catch {
    return false;
  }
}

export async function removeWorktree(
  repoPath: string,
  worktreePath: string
): Promise<void> {
  await execa("git", ["worktree", "remove", worktreePath], { cwd: repoPath });
}

export async function deleteLocalBranch(
  repoPath: string,
  branchName: string
): Promise<void> {
  await execa("git", ["branch", "-d", branchName], { cwd: repoPath });
}
