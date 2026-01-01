import { useMutation, useQueryClient } from '@tanstack/react-query';
import { attemptsApi, Result } from '@/lib/api';
import type {
  CherryPickToNewBranchRequest,
  CherryPickToNewBranchResponse,
  CherryPickToNewBranchError,
} from 'shared/types';
import { repoBranchKeys } from './useRepoBranches';
import { diffStreamKeys } from './useDiffStream';

export function useCherryPickToNewBranch(
  attemptId: string | undefined,
  repoId: string | undefined,
  onSuccess?: (data: CherryPickToNewBranchResponse) => void,
  onError?: (
    err: Result<CherryPickToNewBranchResponse, CherryPickToNewBranchError>
  ) => void
) {
  const queryClient = useQueryClient();

  type CherryPickMutationArgs = {
    repoId: string;
    newBranchName: string;
    baseBranch: string;
  };

  return useMutation<
    CherryPickToNewBranchResponse,
    Result<CherryPickToNewBranchResponse, CherryPickToNewBranchError>,
    CherryPickMutationArgs
  >({
    mutationFn: async (args) => {
      if (!attemptId) {
        throw { success: false, error: undefined, message: 'No attempt ID' };
      }
      const { repoId, newBranchName, baseBranch } = args;

      const data: CherryPickToNewBranchRequest = {
        repo_id: repoId,
        new_branch_name: newBranchName,
        base_branch: baseBranch,
      };

      const res = await attemptsApi.cherryPickToNewBranch(attemptId, data);
      if (!res.success) {
        return Promise.reject(res);
      }
      return res.data;
    },
    onSuccess: (data) => {
      // Refresh branch status immediately
      queryClient.invalidateQueries({
        queryKey: ['branchStatus', attemptId],
      });

      // Invalidate taskAttempt query to refresh attempt.branch
      queryClient.invalidateQueries({
        queryKey: ['taskAttempt', attemptId],
      });

      // Refresh branch list
      if (repoId) {
        queryClient.invalidateQueries({
          queryKey: repoBranchKeys.byRepo(repoId),
        });
      }

      // Force diff stream to reconnect with fresh base_commit after cherry-pick
      queryClient.invalidateQueries({
        queryKey: diffStreamKeys.refresh(attemptId ?? null),
      });

      onSuccess?.(data);
    },
    onError: (
      err: Result<CherryPickToNewBranchResponse, CherryPickToNewBranchError>
    ) => {
      console.error('Failed to cherry-pick to new branch:', err);
      // Even on failure, re-fetch branch status
      queryClient.invalidateQueries({
        queryKey: ['branchStatus', attemptId],
      });
      onError?.(err);
    },
  });
}
