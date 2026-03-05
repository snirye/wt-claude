import React from "react";
import { Box, Text } from "ink";

interface StatusBarProps {
  mode: "repo-menu" | "branch-menu" | "create-worktree";
  confirmingDelete?: boolean;
}

export function StatusBar({ mode, confirmingDelete = false }: StatusBarProps): JSX.Element {
  const controls =
    confirmingDelete
      ? "Enter confirm delete  Esc cancel  q Quit"
      : mode === "repo-menu"
      ? "Type search  Up/Down move  Enter pick repo  q Quit"
      : mode === "branch-menu"
        ? "Type search  Up/Down move  Enter pick  Del delete merged  Esc back  q Quit"
        : "Type feature description  Enter create  Esc cancel  q Quit";

  return (
    <Box borderStyle="round" borderColor="gray" paddingX={1}>
      <Text color="gray">{controls}</Text>
    </Box>
  );
}
