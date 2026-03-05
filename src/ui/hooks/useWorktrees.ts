import { useCallback, useEffect, useRef, useState } from "react";
import {
  getBranchPullRequestStatus,
  listWorktrees,
  type Worktree,
} from "../../git.js";

interface UseWorktreesResult {
  worktrees: Worktree[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useWorktrees(repoPath: string | null): UseWorktreesResult {
  const [worktrees, setWorktrees] = useState<Worktree[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refreshTokenRef = useRef(0);

  const refresh = useCallback(async () => {
    const refreshToken = refreshTokenRef.current + 1;
    refreshTokenRef.current = refreshToken;

    if (!repoPath) {
      setWorktrees([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const next = await listWorktrees(repoPath);

      const branchWorktrees = next.filter((wt) => !wt.isMain);
      if (refreshTokenRef.current !== refreshToken) {
        return;
      }

      setWorktrees(branchWorktrees);
      setLoading(false);
      const hydrated = await Promise.all(
        branchWorktrees.map(async (worktree) => ({
          ...worktree,
          prStatus: await getBranchPullRequestStatus(repoPath, worktree.branch),
        }))
      );
      if (refreshTokenRef.current !== refreshToken) {
        return;
      }

      setWorktrees(hydrated);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to load worktrees");
      }
    } finally {
      if (refreshTokenRef.current === refreshToken) {
        setLoading(false);
      }
    }
  }, [repoPath]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { worktrees, loading, error, refresh };
}
