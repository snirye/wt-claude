import { useInput } from "ink";

export interface KeyboardKey {
  upArrow: boolean;
  downArrow: boolean;
  leftArrow: boolean;
  rightArrow: boolean;
  delete?: boolean;
  return: boolean;
  escape: boolean;
  tab: boolean;
  ctrl: boolean;
}

type KeyboardHandler = (input: string, key: KeyboardKey) => void;

export function useKeyboard(handler: KeyboardHandler): void {
  useInput((input, key) => {
    handler(input, key as KeyboardKey);
  });
}
