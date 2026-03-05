import React from "react";
import { Box, Text } from "ink";

interface PanelProps {
  title: string;
  active?: boolean;
  width?: number | string;
  children: React.ReactNode;
}

export function Panel({ title, active = false, width = "50%", children }: PanelProps): JSX.Element {
  return (
    <Box width={width} borderStyle="round" borderColor={active ? "cyan" : "gray"} flexDirection="column" paddingX={1}>
      <Text color={active ? "cyan" : "gray"}>{title}</Text>
      <Box marginTop={1} flexDirection="column">
        {children}
      </Box>
    </Box>
  );
}
