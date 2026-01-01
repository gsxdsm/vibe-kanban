import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Project, Repo, RunDeploymentScriptResponse } from 'shared/types';
import { useRepoBranches } from '@/hooks/useRepoBranches';
import { projectsApi } from '@/lib/api';
import {
  Loader2,
  Rocket,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import NiceModal, { useModal } from '@ebay/nice-modal-react';
import { defineModal } from '@/lib/modals';
import { useQuery } from '@tanstack/react-query';

export interface RunDeploymentScriptDialogProps {
  project: Project;
}

interface RunDeploymentScriptDialogResult {
  started: boolean;
}

const CURRENT_BRANCH_VALUE = '__current__';

const RunDeploymentScriptDialogImpl =
  NiceModal.create<RunDeploymentScriptDialogProps>(({ project }) => {
    const modal = useModal();
    const { t } = useTranslation('projects');
    const [selectedBranch, setSelectedBranch] = useState<string>(CURRENT_BRANCH_VALUE);
    const [isRunning, setIsRunning] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [output, setOutput] = useState<RunDeploymentScriptResponse | null>(null);
    const [isOutputOpen, setIsOutputOpen] = useState(true);

    // Fetch repositories for this project
    const { data: repositories } = useQuery<Repo[]>({
      queryKey: ['projectRepositories', project.id],
      queryFn: () => projectsApi.getRepositories(project.id),
    });

    // Get the first repository's ID for branch listing
    const firstRepoId = repositories?.[0]?.id;
    const { data: branches, isLoading: branchesLoading } = useRepoBranches(
      firstRepoId,
      { enabled: !!firstRepoId }
    );

    const handleRun = async () => {
      setIsRunning(true);
      setError(null);

      try {
        const result = await projectsApi.runDeploymentScript(project.id, {
          branch: selectedBranch === CURRENT_BRANCH_VALUE ? null : selectedBranch,
        });

        if ('type' in result) {
          // It's an error
          switch (result.type) {
            case 'no_script_configured':
              setError(t('deployment.errors.noScriptConfigured'));
              break;
            case 'no_repositories':
              setError(t('deployment.errors.noRepositories'));
              break;
            case 'git_checkout_failed':
              setError(
                t('deployment.errors.gitCheckoutFailed', {
                  message: result.message,
                })
              );
              break;
          }
        } else {
          // Completed (success or failure based on exit code)
          setOutput(result);
          if (result.exit_code === 0) {
            setSuccess(true);
          } else {
            setError(
              t('deployment.errors.scriptFailed', {
                exitCode: result.exit_code ?? 'unknown',
              })
            );
          }
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : t('deployment.errors.unknown')
        );
      } finally {
        setIsRunning(false);
      }
    };

    const handleCancel = () => {
      modal.resolve({ started: false });
      modal.hide();
    };

    const handleOpenChange = (open: boolean) => {
      if (!open && !isRunning) {
        handleCancel();
      }
    };

    return (
      <Dialog open={modal.visible} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Rocket className="h-5 w-5" />
              {t('deployment.dialog.title')}
            </DialogTitle>
            <DialogDescription>
              {t('deployment.dialog.description', { name: project.name })}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t('deployment.dialog.scriptLabel')}
              </label>
              <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto max-h-[200px] overflow-y-auto font-mono whitespace-pre-wrap break-words">
                {project.deployment_script || t('deployment.errors.noScriptConfigured')}
              </pre>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t('deployment.dialog.branchLabel')}
              </label>
              <Select
                value={selectedBranch}
                onValueChange={setSelectedBranch}
                disabled={branchesLoading || isRunning}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={t('deployment.dialog.branchPlaceholder')}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={CURRENT_BRANCH_VALUE}>
                    {t('deployment.dialog.currentBranch')}
                  </SelectItem>
                  {branches?.map((branch) => (
                    <SelectItem key={branch.name} value={branch.name}>
                      {branch.name}
                      {branch.is_current && ' (current)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                {t('deployment.dialog.branchHelper')}
              </p>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-600">
                  {t('deployment.dialog.success')}
                </AlertDescription>
              </Alert>
            )}

            {output && (output.stdout || output.stderr) && (
              <div className="space-y-2">
                <Button
                  variant="ghost"
                  className="w-full justify-between p-2 h-auto"
                  onClick={() => setIsOutputOpen(!isOutputOpen)}
                >
                  <span className="text-sm font-medium">
                    {t('deployment.dialog.outputLabel')}
                  </span>
                  {isOutputOpen ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
                {isOutputOpen && (
                  <div className="space-y-2">
                    {output.stdout && (
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">
                          stdout
                        </label>
                        <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto max-h-[150px] overflow-y-auto font-mono whitespace-pre-wrap break-words">
                          {output.stdout}
                        </pre>
                      </div>
                    )}
                    {output.stderr && (
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">
                          stderr
                        </label>
                        <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto max-h-[150px] overflow-y-auto font-mono whitespace-pre-wrap break-words text-red-600 dark:text-red-400">
                          {output.stderr}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            {output ? (
              <Button onClick={handleCancel}>
                {t('deployment.dialog.close')}
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isRunning}
                >
                  {t('deployment.dialog.cancel')}
                </Button>
                <Button onClick={handleRun} disabled={isRunning}>
                  {isRunning ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('deployment.dialog.running')}
                    </>
                  ) : (
                    <>
                      <Rocket className="mr-2 h-4 w-4" />
                      {t('deployment.dialog.run')}
                    </>
                  )}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  });

export const RunDeploymentScriptDialog = defineModal<
  RunDeploymentScriptDialogProps,
  RunDeploymentScriptDialogResult
>(RunDeploymentScriptDialogImpl);
