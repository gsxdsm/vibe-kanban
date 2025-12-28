import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Project } from 'shared/types';
import { ProjectFormDialog } from '@/components/dialogs/projects/ProjectFormDialog';
import { AlertCircle, Loader2, Plus, Download, Upload } from 'lucide-react';
import ProjectCard from '@/components/projects/ProjectCard.tsx';
import { useKeyCreate, Scope } from '@/keyboard';
import { useProjects } from '@/hooks/useProjects';
import { projectsApi } from '@/lib/api';
import { useRef } from 'react';

export function ProjectList() {
  const navigate = useNavigate();
  const { t } = useTranslation('projects');
  const { projects, isLoading, error: projectsError } = useProjects();
  const [error, setError] = useState('');
  const [focusedProjectId, setFocusedProjectId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCreateProject = async () => {
    try {
      const result = await ProjectFormDialog.show({});
      if (result === 'saved') return;
    } catch (error) {
      // User cancelled - do nothing
    }
  };

  const handleExportAll = async () => {
    try {
      const data = await projectsApi.exportAll();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vibe-kanban-projects-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      setError('Failed to export projects');
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const imports = Array.isArray(data) ? data : [data];
      await projectsApi.import(imports);
      window.location.reload(); 
    } catch (error) {
       setError('Failed to import projects');
    }
    event.target.value = '';
  };

  // Semantic keyboard shortcut for creating new project
  useKeyCreate(handleCreateProject, { scope: Scope.PROJECTS });

  const handleEditProject = (project: Project) => {
    navigate(`/settings/projects?projectId=${project.id}`);
  };

  // Set initial focus when projects are loaded
  useEffect(() => {
    if (projects.length === 0) {
      setFocusedProjectId(null);
      return;
    }

    if (!focusedProjectId || !projects.some((p) => p.id === focusedProjectId)) {
      setFocusedProjectId(projects[0].id);
    }
  }, [projects, focusedProjectId]);

  return (
    <div className="space-y-6 p-8 pb-16 md:pb-8 h-full overflow-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground">{t('subtitle')}</p>
        </div>
        <div className="flex gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImport}
              className="hidden"
              accept=".json"
            />
            <Button variant="outline" onClick={handleImportClick}>
              <Upload className="mr-2 h-4 w-4" />
              Import
            </Button>
            <Button variant="outline" onClick={handleExportAll}>
              <Download className="mr-2 h-4 w-4" />
              Export All
            </Button>
            <Button onClick={handleCreateProject}>
              <Plus className="mr-2 h-4 w-4" />
              {t('createProject')}
            </Button>
        </div>
      </div>

      {(error || projectsError) && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error || projectsError?.message || t('errors.fetchFailed')}
          </AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {t('loading')}
        </div>
      ) : projects.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
              <Plus className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">{t('empty.title')}</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {t('empty.description')}
            </p>
            <Button className="mt-4" onClick={handleCreateProject}>
              <Plus className="mr-2 h-4 w-4" />
              {t('empty.createFirst')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              isFocused={focusedProjectId === project.id}
              setError={setError}
              onEdit={handleEditProject}
            />
          ))}
        </div>
      )}
    </div>
  );
}
