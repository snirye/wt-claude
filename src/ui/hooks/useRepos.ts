import { useCallback, useEffect, useState } from "react";
import { getRepositories, type Repository } from "../../config.js";

interface UseReposResult {
  repos: Repository[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useRepos(): UseReposResult {
  const [repos, setRepos] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await getRepositories();
      setRepos(next);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to load repositories");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { repos, loading, error, refresh };
}
