import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import BranchSelector from '@/components/tasks/BranchSelector';
import type { GitBranch, CherryPickToNewBranchResponse, CherryPickToNewBranchError } from 'shared/types';
import NiceModal, { useModal } from '@ebay/nice-modal-react';
import { defineModal } from '@/lib/modals';
import { useCherryPickToNewBranch } from '@/hooks/useCherryPickToNewBranch';

export interface CherryPickToNewBranchDialogProps {
  attemptId: string;
  repoId: string;
  branches: GitBranch[];
  currentBranchName: string;
  targetBranchName: string;
}

export type CherryPickToNewBranchDialogResult = {
  action: 'confirmed' | 'canceled';
  newBranchName?: string;
  baseBranch?: string;
};

const CherryPickToNewBranchDialogImpl =
  NiceModal.create<CherryPickToNewBranchDialogProps>(
    ({ attemptId, repoId, branches, currentBranchName, targetBranchName }) => {
      const modal = useModal();
      const { t } = useTranslation(['tasks', 'common']);
      const [newBranchName, setNewBranchName] = useState<string>('');
      const [baseBranch, setBaseBranch] = useState<string>(targetBranchName);
      const [error, setError] = useState<string | null>(null);

      // Map API error types to user-friendly messages
      const getApiErrorMessage = (apiError: CherryPickToNewBranchError | undefined): string => {
        if (!apiError) {
          return t('cherryPickToNewBranch.dialog.error');
        }
        switch (apiError.type) {
          case 'empty_branch_name':
            return t('cherryPickToNewBranch.dialog.errors.emptyName');
          case 'invalid_branch_name_format':
            return t('cherryPickToNewBranch.dialog.errors.emptyName');
          case 'branch_already_exists':
            return `Branch "${apiError.branch_name}" already exists`;
          case 'base_branch_not_found':
            return `Base branch "${apiError.branch_name}" not found`;
          case 'no_commits_to_cherry_pick':
            return 'No commits to cherry-pick. The task may not have any changes.';
          case 'no_task_start_commit':
            return t('cherryPickToNewBranch.dialog.errors.noTaskStartCommit');
          case 'rebase_in_progress':
            return `A rebase is in progress in ${apiError.repo_name}. Complete or abort it first.`;
          case 'cherry_pick_in_progress':
            return `A cherry-pick is in progress in ${apiError.repo_name}. Complete or abort it first.`;
          case 'worktree_dirty':
            return `${apiError.repo_name} has uncommitted changes. Commit or stash them first.`;
          case 'cherry_pick_conflicts':
            return apiError.message;
          default:
            return t('cherryPickToNewBranch.dialog.error');
        }
      };

      const cherryPickMutation = useCherryPickToNewBranch(
        attemptId,
        repoId,
        (data: CherryPickToNewBranchResponse) => {
          modal.resolve({
            action: 'confirmed',
            newBranchName: data.branch,
            baseBranch: baseBranch,
          } as CherryPickToNewBranchDialogResult);
          modal.hide();
        },
        (err) => {
          const apiError = !err.success ? err.error : undefined;
          setError(getApiErrorMessage(apiError));
        }
      );

      const handleConfirm = () => {
        const trimmedName = newBranchName.trim();

        if (!trimmedName) {
          setError(t('cherryPickToNewBranch.dialog.errors.emptyName'));
          return;
        }

        if (trimmedName === currentBranchName) {
          setError(t('cherryPickToNewBranch.dialog.errors.sameName'));
          return;
        }

        if (trimmedName.includes(' ')) {
          setError(t('cherryPickToNewBranch.dialog.errors.hasSpaces'));
          return;
        }

        if (!baseBranch) {
          setError(t('cherryPickToNewBranch.dialog.errors.noBaseBranch'));
          return;
        }

        setError(null);
        cherryPickMutation.mutate({
          repoId,
          newBranchName: trimmedName,
          baseBranch,
        });
      };

      const handleCancel = () => {
        modal.resolve({
          action: 'canceled',
        } as CherryPickToNewBranchDialogResult);
        modal.hide();
      };

      const handleOpenChange = (open: boolean) => {
        if (!open) {
          handleCancel();
        }
      };

      return (
        <Dialog open={modal.visible} onOpenChange={handleOpenChange}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {t('cherryPickToNewBranch.dialog.title')}
              </DialogTitle>
              <DialogDescription>
                {t('cherryPickToNewBranch.dialog.description')}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="new-branch-name" className="text-sm font-medium">
                  {t('cherryPickToNewBranch.dialog.newBranchNameLabel')}
                </label>
                <Input
                  id="new-branch-name"
                  type="text"
                  value={newBranchName}
                  onChange={(e) => {
                    setNewBranchName(e.target.value);
                    setError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !cherryPickMutation.isPending) {
                      handleConfirm();
                    }
                  }}
                  placeholder={t('cherryPickToNewBranch.dialog.newBranchNamePlaceholder')}
                  disabled={cherryPickMutation.isPending}
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="base-branch" className="text-sm font-medium">
                  {t('cherryPickToNewBranch.dialog.baseBranchLabel')}
                </label>
                <BranchSelector
                  branches={branches}
                  selectedBranch={baseBranch}
                  onBranchSelect={(branch) => {
                    setBaseBranch(branch);
                    setError(null);
                  }}
                  placeholder={t('cherryPickToNewBranch.dialog.baseBranchPlaceholder')}
                  excludeCurrentBranch={false}
                />
                <p className="text-xs text-muted-foreground">
                  {t('cherryPickToNewBranch.dialog.baseBranchHelp')}
                </p>
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={cherryPickMutation.isPending}
              >
                {t('common:buttons.cancel')}
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={
                  cherryPickMutation.isPending ||
                  !newBranchName.trim() ||
                  !baseBranch
                }
              >
                {cherryPickMutation.isPending
                  ? t('cherryPickToNewBranch.dialog.inProgress')
                  : t('cherryPickToNewBranch.dialog.action')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );
    }
  );

export const CherryPickToNewBranchDialog = defineModal<
  CherryPickToNewBranchDialogProps,
  CherryPickToNewBranchDialogResult
>(CherryPickToNewBranchDialogImpl);
