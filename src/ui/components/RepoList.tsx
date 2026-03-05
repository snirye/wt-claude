import React from "react";
import { Box, Text } from "ink";
import type { Repository } from "../../config.js";

interface RepoListProps {
  repos: Repository[];
  query: string;
  selectedIndex: number;
}

export function RepoList({ repos, query, selectedIndex }: RepoListProps): JSX.Element {
  if (repos.length === 0) {
    return <Text color="yellow">No repositories match your search.</Text>;
  }

  return (
    <Box flexDirection="column">
      {repos.map((repo, index) => {
        const selected = index === selectedIndex;
        return (
          <Text key={repo.path} color={selected ? "cyan" : undefined}>
            {selected ? ">" : " "} {repo.name} <Text color="gray">({repo.path})</Text>
          </Text>
        );
      })}
      <Box marginTop={1}>
        <Text color="gray">Search: {query || "(type to filter)"}</Text>
      </Box>
    </Box>
  );
}
