import React from "react";
import { Box, Text } from "ink";
import TextInput from "ink-text-input";
import { deriveBranchAndPrompt } from "../../claude.js";

interface CreateWorktreeProps {
  featureDescription: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  busy: boolean;
}

export function CreateWorktree({
  featureDescription,
  onChange,
  onSubmit,
  onCancel: _onCancel,
  busy,
}: CreateWorktreeProps): JSX.Element {
  const derived = featureDescription.trim()
    ? deriveBranchAndPrompt(featureDescription).branchName
    : "feature/new-feature";

  return (
    <Box borderStyle="round" borderColor="magenta" flexDirection="column" paddingX={1}>
      <Text color="magenta" bold>
        Create new worktree
      </Text>
      <Box marginTop={1}>
        <Text>Describe the feature:</Text>
      </Box>
      <TextInput value={featureDescription} onChange={onChange} onSubmit={onSubmit} />
      <Box marginTop={1}>
        <Text color="gray">Branch preview: {derived}</Text>
      </Box>
      <Box marginTop={1}>
        <Text color="gray">Enter to create, Esc to cancel</Text>
      </Box>
      {busy ? (
        <Box marginTop={1}>
          <Text color="blue">Creating worktree and opening iTerm2...</Text>
        </Box>
      ) : null}
      <Box marginTop={1}>
        <Text color="gray" dimColor>
          Press Esc to close this panel.
        </Text>
      </Box>
    </Box>
  );
}
