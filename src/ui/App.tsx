import React, { useEffect, useMemo, useState } from "react";
import { Box, Text, useApp } from "ink";
import TextInput from "ink-text-input";
import {
  buildNewSessionCommand,
  buildResumeCommand,
  deriveBranchAndPrompt,
} from "../claude.js";
import { createWorktree, deleteLocalBranch, removeWorktree, type Worktree } from "../git.js";
import { openInITerm2 } from "../terminal/iterm2.js";
import { CreateWorktree } from "./components/CreateWorktree.js";
import { Header } from "./components/Header.js";
import { Panel } from "./components/Panel.js";
import { RepoList } from "./components/RepoList.js";
import { StatusBar } from "./components/StatusBar.js";
import { WorktreeList } from "./components/WorktreeList.js";
import { useKeyboard } from "./hooks/useKeyboard.js";
import { useRepos } from "./hooks/useRepos.js";
import { useWorktrees } from "./hooks/useWorktrees.js";

type ViewMode = "repo-menu" | "branch-menu" | "create-worktree";

function fuzzyMatch(pattern: string, text: string): boolean {
  if (!pattern) return true;
  const patternLower = pattern.toLowerCase();
  const textLower = text.toLowerCase();
  let patternIdx = 0;

  for (let i = 0; i < textLower.length && patternIdx < patternLower.length; i += 1) {
    if (textLower[i] === patternLower[patternIdx]) {
      patternIdx += 1;
    }
  }

  return patternIdx === patternLower.length;
}

export function App(): JSX.Element {
  const { exit } = useApp();
  const [viewMode, setViewMode] = useState<ViewMode>("repo-menu");
  const [repoQuery, setRepoQuery] = useState("");
  const [branchQuery, setBranchQuery] = useState("");
  const [repoCursor, setRepoCursor] = useState(0);
  const [branchCursor, setBranchCursor] = useState(0);
  const [chosenRepoPath, setChosenRepoPath] = useState<string | null>(null);
  const [featureDescription, setFeatureDescription] = useState("");
  const [pendingDeleteWorktree, setPendingDeleteWorktree] = useState<Worktree | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const { repos, loading: loadingRepos, error: reposError, refresh: refreshRepos } = useRepos();
  const filteredRepos = useMemo(
    () => repos.filter((repo) => fuzzyMatch(repoQuery, `${repo.name} ${repo.path}`)),
    [repos, repoQuery]
  );
  const focusedRepo = useMemo(
    () => filteredRepos[repoCursor] ?? null,
    [filteredRepos, repoCursor]
  );
  const selectedRepo = useMemo(
    () => repos.find((repo) => repo.path === chosenRepoPath) ?? null,
    [repos, chosenRepoPath]
  );
  const displayRepo = viewMode === "repo-menu" ? focusedRepo : (selectedRepo ?? focusedRepo);
  const {
    worktrees,
    loading: loadingWorktrees,
    error: worktreesError,
    refresh: refreshWorktrees,
  } = useWorktrees(displayRepo?.path ?? null);

  const filteredWorktrees = useMemo(
    () => worktrees.filter((wt) => fuzzyMatch(branchQuery.trim().toLowerCase(), wt.branch.toLowerCase())),
    [worktrees, branchQuery]
  );

  useEffect(() => {
    if (filteredRepos.length === 0) {
      setRepoCursor(0);
      return;
    }
    if (repoCursor > filteredRepos.length - 1) {
      setRepoCursor(filteredRepos.length - 1);
    }
  }, [filteredRepos, repoCursor]);

  useEffect(() => {
    const maxIndex = filteredWorktrees.length;
    if (branchCursor > maxIndex) {
      setBranchCursor(maxIndex);
    }
  }, [filteredWorktrees, branchCursor]);

  async function openSelectedWorktree(selectedWorktree = filteredWorktrees[0] ?? null): Promise<void> {
    if (!selectedWorktree) return;
    setBusy(true);
    setNotice(null);
    try {
      const command = await buildResumeCommand();
      await openInITerm2(selectedWorktree.path, command);
      setNotice(`Opened ${selectedWorktree.branch} in iTerm2`);
    } catch (error) {
      if (error instanceof Error) {
        setNotice(`Failed to open worktree: ${error.message}`);
      } else {
        setNotice("Failed to open worktree");
      }
    } finally {
      setBusy(false);
    }
  }

  async function createNewWorktree(): Promise<void> {
    if (!selectedRepo || !featureDescription.trim()) return;
    setBusy(true);
    setNotice(null);
    try {
      const { improvedPrompt, branchName } = deriveBranchAndPrompt(featureDescription.trim());

      const worktreePath = await createWorktree(selectedRepo.path, branchName);
      const command = await buildNewSessionCommand(improvedPrompt);
      await openInITerm2(worktreePath, command);
      await refreshWorktrees();
      setFeatureDescription("");
      setViewMode("branch-menu");
      setBranchQuery("");
      setNotice(`Created ${branchName} and opened in iTerm2`);
    } catch (error) {
      if (error instanceof Error) {
        setNotice(`Failed to create worktree: ${error.message}`);
      } else {
        setNotice("Failed to create worktree");
      }
    } finally {
      setBusy(false);
    }
  }

  async function deleteSelectedMergedWorktree(worktree: Worktree): Promise<void> {
    if (!selectedRepo) return;
    setBusy(true);
    setNotice(null);
    try {
      await removeWorktree(selectedRepo.path, worktree.path);
      await deleteLocalBranch(selectedRepo.path, worktree.branch);
      await refreshWorktrees();
      setBranchCursor(0);
      setNotice(`Deleted ${worktree.branch}`);
    } catch (error) {
      if (error instanceof Error) {
        setNotice(`Failed to delete ${worktree.branch}: ${error.message}`);
      } else {
        setNotice(`Failed to delete ${worktree.branch}`);
      }
    } finally {
      setBusy(false);
      setPendingDeleteWorktree(null);
    }
  }

  function isDeleteKeyPressed(input: string, key: { delete?: boolean }): boolean {
    return key.delete === true || input === "\u001b[3~";
  }

  useKeyboard((input, key) => {
    if (key.ctrl && input === "c") {
      exit();
      return;
    }

    if (busy) {
      return;
    }

    if (pendingDeleteWorktree) {
      if (key.escape) {
        setPendingDeleteWorktree(null);
        setNotice("Delete cancelled");
        return;
      }

      if (key.return) {
        void deleteSelectedMergedWorktree(pendingDeleteWorktree);
      }
      return;
    }

    if (viewMode === "create-worktree") {
      if (key.escape) {
        setViewMode("branch-menu");
        setFeatureDescription("");
        return;
      }
      if (key.return) {
        void createNewWorktree();
      }
      return;
    }

    if (key.ctrl && input === "r" && viewMode !== "create-worktree") {
      void refreshRepos();
      void refreshWorktrees();
      setNotice("Refreshed");
      return;
    }

    if (viewMode === "repo-menu" && key.return) {
      const pickedRepo = filteredRepos[repoCursor] ?? null;
      if (pickedRepo) {
        setChosenRepoPath(pickedRepo.path);
        setViewMode("branch-menu");
        setBranchQuery("");
        setBranchCursor(0);
        setNotice(`Selected ${pickedRepo.name}`);
      }
      return;
    }

    if (viewMode === "branch-menu") {
      if (key.escape) {
        setViewMode("repo-menu");
        setBranchQuery("");
        return;
      }

      if (key.upArrow) {
        setBranchCursor((prev) => Math.max(0, prev - 1));
        return;
      }

      if (key.downArrow) {
        setBranchCursor((prev) => Math.min(filteredWorktrees.length, prev + 1));
        return;
      }

      if (key.return) {
        if (branchCursor === 0) {
          setViewMode("create-worktree");
          setFeatureDescription("");
          return;
        }

        const selectedWorktree = filteredWorktrees[branchCursor - 1] ?? null;
        if (selectedWorktree) {
          void openSelectedWorktree(selectedWorktree);
          return;
        }
      }

      if (isDeleteKeyPressed(input, key)) {
        const selectedWorktree = filteredWorktrees[branchCursor - 1] ?? null;
        if (!selectedWorktree) {
          setNotice("Select a branch to delete");
          return;
        }
        if (selectedWorktree.prStatus?.lifecycle !== "merged") {
          setNotice("Delete is only available for merged branches");
          return;
        }
        setPendingDeleteWorktree(selectedWorktree);
        setNotice(`Confirm delete ${selectedWorktree.branch}? Enter confirm, Esc cancel`);
      }
      return;
    }

    if (viewMode === "repo-menu" && key.escape) {
      exit();
      return;
    }

    if (viewMode === "repo-menu" && key.upArrow) {
      setRepoCursor((prev) => Math.max(0, prev - 1));
      return;
    }

    if (viewMode === "repo-menu" && key.downArrow) {
      setRepoCursor((prev) => Math.min(Math.max(0, filteredRepos.length - 1), prev + 1));
      return;
    }

  });

  const subtitle = displayRepo
    ? `Repositories and branches for ${displayRepo.name}`
    : "Choose repository";
  const errorText = reposError ?? worktreesError;

  return (
    <Box flexDirection="column">
      <Header subtitle={subtitle} />
      {loadingRepos ? (
        <Box marginTop={1}>
          <Text color="blue">Loading repositories...</Text>
        </Box>
      ) : null}
      {errorText ? (
        <Box marginTop={1}>
          <Text color="red">{errorText}</Text>
        </Box>
      ) : null}
      {repos.length === 0 ? (
        <Box marginTop={1} borderStyle="round" borderColor="yellow" paddingX={1} flexDirection="column">
          <Text color="yellow">No repositories registered.</Text>
          <Text color="gray">Use `wt add /path/to/repo` or `wt scan /path/to/dir`, then reopen dashboard.</Text>
        </Box>
      ) : (
        <Box marginTop={1} flexDirection="row">
          <Box width="50%" paddingRight={1}>
            <Panel title="Repositories" active={viewMode === "repo-menu"} width="100%">
              <Box flexDirection="column">
                <Text color="gray">Type to fuzzy search, then Enter to choose.</Text>
                <Box marginTop={1}>
                  <Text color="cyan">Search: </Text>
                  {viewMode === "repo-menu" ? (
                    <TextInput
                      value={repoQuery}
                      onChange={(value) => {
                        setRepoQuery(value);
                        setRepoCursor(0);
                      }}
                    />
                  ) : (
                    <Text color="gray">{repoQuery || "(inactive while in branches menu)"}</Text>
                  )}
                </Box>
                <Box marginTop={1}>
                  <RepoList repos={filteredRepos} query={repoQuery} selectedIndex={repoCursor} />
                </Box>
              </Box>
            </Panel>
          </Box>

          <Box width="50%" paddingLeft={1}>
            <Panel title={`Branches for ${displayRepo?.name ?? "-"}`} active={viewMode === "branch-menu"} width="100%">
              <Box flexDirection="column">
                {!displayRepo ? (
                  <Text color="gray">Choose a repository to load branches.</Text>
                ) : (
                  <Text color="gray">Type to filter branches. Select `+ New worktree` and Enter to create.</Text>
                )}
                <Box marginTop={1}>
                  <Text color="green">Filter: </Text>
                  {viewMode === "branch-menu" ? (
                    <TextInput
                      value={branchQuery}
                      onChange={(value) => {
                        setBranchQuery(value);
                        setBranchCursor(0);
                      }}
                    />
                  ) : (
                    <Text color="gray">{branchQuery || "(inactive while in repo menu)"}</Text>
                  )}
                </Box>
                <Box marginTop={1}>
                  {displayRepo ? (
                    <WorktreeList
                      worktrees={filteredWorktrees}
                      loading={loadingWorktrees}
                      query={branchQuery}
                      selectedIndex={branchCursor}
                    />
                  ) : (
                    <Text color="gray">No repository selected yet.</Text>
                  )}
                </Box>
              </Box>
            </Panel>
          </Box>
        </Box>
      )}
      {viewMode === "create-worktree" ? (
        <Box marginTop={1}>
          <CreateWorktree
            featureDescription={featureDescription}
            onChange={setFeatureDescription}
            onSubmit={() => {
              void createNewWorktree();
            }}
            onCancel={() => {
              setViewMode("branch-menu");
              setFeatureDescription("");
            }}
            busy={busy}
          />
        </Box>
      ) : null}
      <Box marginTop={1}>
        <StatusBar
          mode={viewMode}
          confirmingDelete={Boolean(pendingDeleteWorktree)}
        />
      </Box>
      <Box marginTop={1}>
        <Text color={busy ? "yellow" : notice ? "green" : "gray"}>
          {busy ? "Working..." : (notice ?? "Ready")}
        </Text>
      </Box>
      {pendingDeleteWorktree ? (
        <Box marginTop={1} borderStyle="round" borderColor="red" paddingX={1} flexDirection="column">
          <Text color="red">Delete merged branch?</Text>
          <Text>
            {pendingDeleteWorktree.branch} <Text color="gray">({pendingDeleteWorktree.commit})</Text>
          </Text>
          <Text color="gray">Enter confirms delete. Esc cancels.</Text>
        </Box>
      ) : null}
    </Box>
  );
}
