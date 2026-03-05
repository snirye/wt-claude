import React from "react";
import { Box, Text } from "ink";
import type { PullRequestStatus, Worktree } from "../../git.js";

interface WorktreeListProps {
  worktrees: Worktree[];
  loading: boolean;
  query: string;
  selectedIndex: number;
}

function getPrStatusText(prStatus: PullRequestStatus | undefined): string {
  if (!prStatus) return "[unknown]";

  if (prStatus.lifecycle === "open") {
    const draftLabel = prStatus.isDraft ? " draft" : "";
    const numberLabel = prStatus.number ? ` #${prStatus.number}` : "";
    return `[open${draftLabel}${numberLabel}]`;
  }
  if (prStatus.lifecycle === "merged") return "[merged]";
  if (prStatus.lifecycle === "closed") return "[closed]";
  if (prStatus.lifecycle === "no-pr") return "[no PR]";
  return "[unknown]";
}

function getPrStatusColor(
  prStatus: PullRequestStatus | undefined
): "green" | "magenta" | "red" | "gray" | "yellow" {
  if (!prStatus) return "yellow";
  if (prStatus.lifecycle === "open") return "green";
  if (prStatus.lifecycle === "merged") return "magenta";
  if (prStatus.lifecycle === "closed") return "red";
  if (prStatus.lifecycle === "no-pr") return "gray";
  return "yellow";
}

export function WorktreeList({
  worktrees,
  loading,
  query,
  selectedIndex,
}: WorktreeListProps): JSX.Element {
  if (loading) {
    return <Text color="blue">Loading worktrees...</Text>;
  }

  const visibleWindowSize = 10;
  const selectedWorktreeIndex = selectedIndex - 1;
  const maxStartIndex = Math.max(0, worktrees.length - visibleWindowSize);
  const startIndex =
    selectedWorktreeIndex <= 0
      ? 0
      : Math.min(
          Math.max(0, selectedWorktreeIndex - (visibleWindowSize - 1)),
          maxStartIndex
        );
  const endIndex = Math.min(worktrees.length, startIndex + visibleWindowSize);
  const visible = worktrees.slice(startIndex, endIndex);
  const remaining = Math.max(0, worktrees.length - endIndex);
  const selectedWorktree = selectedIndex > 0 ? worktrees[selectedIndex - 1] : null;
  const canDeleteSelectedMerged = selectedWorktree?.prStatus?.lifecycle === "merged";

  return (
    <Box flexDirection="column">
      <Text color={selectedIndex === 0 ? "magenta" : undefined}>
        {selectedIndex === 0 ? ">" : " "} + New worktree
      </Text>
      {visible.length === 0 ? (
        <Text color="yellow">  No matching branches.</Text>
      ) : (
        visible.map((worktree, index) => {
          const selected = selectedIndex === startIndex + index + 1;
          return (
            <Text key={worktree.path} color={selected ? "green" : undefined}>
              {selected ? ">" : " "} {worktree.branch}{" "}
              <Text color={getPrStatusColor(worktree.prStatus)}>
                {getPrStatusText(worktree.prStatus)}
              </Text>{" "}
              <Text color="gray">({worktree.commit})</Text>
            </Text>
          );
        })
      )}
      <Box marginTop={1}>
        <Text color="gray">Search: {query || "(type branch, or type 'new')"}</Text>
      </Box>
      <Box marginTop={1}>
        <Text color="gray">Enter select. Del deletes selected merged branch. Esc goes back.</Text>
      </Box>
      {canDeleteSelectedMerged ? (
        <Box>
          <Text color="magenta">Selected branch is merged. Press Del to delete it.</Text>
        </Box>
      ) : null}
      {remaining > 0 ? (
        <Box>
          <Text color="gray">...and {remaining} more</Text>
        </Box>
      ) : null}
    </Box>
  );
}
