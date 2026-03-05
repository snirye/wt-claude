import React from "react";
import { render } from "ink";
import { App } from "./App.js";

export async function runFullScreenUI(): Promise<void> {
  const enterAlternateScreen = "\u001B[?1049h\u001B[H";
  const leaveAlternateScreen = "\u001B[?1049l";
  const canUseAltScreen = Boolean(process.stdout.isTTY);

  if (canUseAltScreen) {
    process.stdout.write(enterAlternateScreen);
  }

  try {
    const { waitUntilExit } = render(<App />);
    await waitUntilExit();
  } finally {
    if (canUseAltScreen) {
      process.stdout.write(leaveAlternateScreen);
    }
  }
}
