import React from "react";
import { Box, Text } from "ink";

interface HeaderProps {
  subtitle?: string;
}

export function Header({ subtitle }: HeaderProps): JSX.Element {
  return (
    <Box justifyContent="space-between" borderStyle="round" borderColor="blue" paddingX={1}>
      <Text bold color="blue">
        wt-claude Dashboard
      </Text>
      <Text color="gray">{subtitle ?? "Git worktree manager"}</Text>
    </Box>
  );
}
