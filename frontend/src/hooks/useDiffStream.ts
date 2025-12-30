import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Diff, PatchType } from 'shared/types';
import { useJsonPatchWsStream } from './useJsonPatchWsStream';

interface DiffEntries {
  [filePath: string]: PatchType;
}

type DiffStreamEvent = {
  entries: DiffEntries;
};

export interface UseDiffStreamOptions {
  statsOnly?: boolean;
}

interface UseDiffStreamResult {
  diffs: Diff[];
  error: string | null;
  isInitialized: boolean;
}

/** Query key for diff stream refresh - invalidate this to force reconnection */
export const diffStreamKeys = {
  refresh: (attemptId: string | null) =>
    ['diffStreamRefresh', attemptId] as const,
};

export const useDiffStream = (
  attemptId: string | null,
  enabled: boolean,
  options?: UseDiffStreamOptions
): UseDiffStreamResult => {
  // Subscribe to a refresh key that can be invalidated to force WebSocket reconnection
  // The data value itself doesn't matter - we just need the query to trigger re-renders
  const { data: refreshNonce } = useQuery({
    queryKey: diffStreamKeys.refresh(attemptId),
    queryFn: () => Date.now(),
    staleTime: Infinity,
    gcTime: Infinity,
    enabled: !!attemptId,
  });

  const endpoint = (() => {
    if (!attemptId) return undefined;
    const query = `/api/task-attempts/${attemptId}/diff/ws`;
    if (typeof options?.statsOnly === 'boolean') {
      const params = new URLSearchParams();
      params.set('stats_only', String(options.statsOnly));
      // Include refresh nonce to force new connection when invalidated
      if (refreshNonce) {
        params.set('_refresh', String(refreshNonce));
      }
      return `${query}?${params.toString()}`;
    } else {
      // Include refresh nonce to force new connection when invalidated
      if (refreshNonce) {
        return `${query}?_refresh=${refreshNonce}`;
      }
      return query;
    }
  })();

  const initialData = useCallback(
    (): DiffStreamEvent => ({
      entries: {},
    }),
    []
  );

  const { data, error, isInitialized } = useJsonPatchWsStream<DiffStreamEvent>(
    endpoint,
    enabled && !!attemptId,
    initialData
    // No need for injectInitialEntry or deduplicatePatches for diffs
  );

  const diffs = useMemo(() => {
    return Object.values(data?.entries ?? {})
      .filter((entry) => entry?.type === 'DIFF')
      .map((entry) => entry.content);
  }, [data?.entries]);

  return { diffs, error, isInitialized };
};
