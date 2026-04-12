import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useI18n } from '@/contexts/I18nContext';
import { useAuth } from '@/contexts/AuthContext';
import { localDb } from '@/integrations/localdb/client';
import { useQuery } from '@tanstack/react-query';
import HelpButton from '@/components/HelpButton';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Play, CheckCircle2, Circle, Loader2, XCircle, Sparkles, FileText, AlertCircle, ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';
import type { PipelineStageStatus } from '@/types';
import { aiConfigService, AI_CONFIGURATION_REQUIRED_MESSAGE } from '@/services/aiService';

interface PipelineStep {
  id: string;
  label: string;
  status: PipelineStageStatus;
  message: string;
}

const statusIcon: Record<PipelineStageStatus, React.ReactNode> = {
  pending: <Circle className="h-4 w-4 text-muted-foreground" />,
  running: <Loader2 className="h-4 w-4 text-primary animate-spin" />,
  completed: <CheckCircle2 className="h-4 w-4 text-success" />,
  failed: <XCircle className="h-4 w-4 text-destructive" />,
};

const LOCAL_API_URL = import.meta.env.VITE_LOCAL_API_URL || 'http://127.0.0.1:8787';

const AIWorkspace: React.FC = () => {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const tPipeline = (t.workspace as any).pipeline || {};
  const createInitialSteps = (): PipelineStep[] => ([
    {
      id: 'fetch_sources',
      label: tPipeline.fetchSourcesLabel || 'Fetching processed sources',
      status: 'pending',
      message: '',
    },
    {
      id: 'prepare',
      label: tPipeline.prepareLabel || 'Preparing source content',
      status: 'pending',
      message: '',
    },
    {
      id: 'ai_generate',
      label: tPipeline.aiGenerateLabel || 'AI generating controls (STRIDE)',
      status: 'pending',
      message: '',
    },
    {
      id: 'save',
      label: tPipeline.saveLabel || 'Saving controls to database',
      status: 'pending',
      message: '',
    },
    {
      id: 'update_project',
      label: tPipeline.updateProjectLabel || 'Updating project status',
      status: 'pending',
      message: '',
    },
  ]);
  const aiConfigRequiredMessage = t.common.aiIntegrationRequired || AI_CONFIGURATION_REQUIRED_MESSAGE;
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [steps, setSteps] = useState<PipelineStep[]>(() => createInitialSteps());
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<{ count: number } | null>(null);

  // Fetch projects
  const { data: projects = [] } = useQuery({
    queryKey: ['projects', user?.id],
    queryFn: async () => {
      const { data, error } = await localDb
        .from('projects')
        .select('id, name, technology, status, source_count, control_count')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch processed sources for selected project
  const { data: sources = [] } = useQuery({
    queryKey: ['sources-processed', selectedProjectId],
    queryFn: async () => {
      const { data, error } = await localDb
        .from('sources')
        .select('id, name, type, extracted_content, status, confidence')
        .eq('project_id', selectedProjectId)
        .eq('status', 'processed');
      if (error) throw error;
      return data;
    },
    enabled: !!selectedProjectId,
  });

  const selectedProject = projects.find((p: any) => p.id === selectedProjectId);

  const updateStep = (id: string, updates: Partial<PipelineStep>) => {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const runPipeline = async () => {
    if (!selectedProjectId || !selectedProject) return;

    const hasAiConfigured = await aiConfigService.hasConfiguredProvider();
    if (!hasAiConfigured) {
      toast.error(aiConfigRequiredMessage);
      return;
    }

    setIsRunning(true);
    setResult(null);
    setSteps(createInitialSteps());

    try {
      // Step 1: Fetch sources
      updateStep('fetch_sources', {
        status: 'running',
        message: tPipeline.loadingSources || 'Loading processed sources...',
      });
      const { data: processedSources, error: srcError } = await localDb
        .from('sources')
        .select('id, name, type, extracted_content')
        .eq('project_id', selectedProjectId)
        .eq('status', 'processed');

      if (srcError) {
        throw new Error(`${tPipeline.fetchSourcesFailed || 'Failed to fetch sources'}: ${srcError.message}`);
      }
      updateStep('fetch_sources', {
        status: 'completed',
        message: `${processedSources?.length || 0} ${tPipeline.processedSourcesFoundSuffix || 'processed sources found'}`,
      });

      // Step 2: Prepare content
      updateStep('prepare', {
        status: 'running',
        message: tPipeline.preparingContent || 'Preparing source texts for AI...',
      });
      const sourceTexts = (processedSources || [])
        .filter((s: any) => s.extracted_content)
        .map((s: any) => ({ name: s.name, content: s.extracted_content }));

      updateStep('prepare', {
        status: 'completed',
        message: `${sourceTexts.length} ${tPipeline.sourcesReadySuffix || 'sources with content ready'}`,
      });

      // Step 3: Call generate-controls
      updateStep('ai_generate', {
        status: 'running',
        message: tPipeline.aiGenerating || 'AI is analyzing sources and generating security controls...',
      });

      const { data: { session } } = await localDb.auth.getSession();
      const response = await fetch(
        `${LOCAL_API_URL}/functions/v1/generate-controls`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            projectId: selectedProjectId,
            sourceTexts,
            technology: (selectedProject as any).technology,
            language: locale,
          }),
        }
      );

      if (!response.ok) {
        const err = await response.json();
        if (response.status === 429) {
          toast.error(tPipeline.rateLimitExceeded || 'Rate limit exceeded. Try again in a few minutes.');
          throw new Error(tPipeline.rateLimitExceededShort || 'Rate limit exceeded');
        }
        if (response.status === 402) {
          toast.error(tPipeline.paymentRequired || 'Insufficient credits. Add funds to your workspace.');
          throw new Error(tPipeline.paymentRequiredShort || 'Payment required');
        }
        throw new Error(err.error || tPipeline.aiGenerationFailed || 'AI generation failed');
      }

      const data = await response.json();
      updateStep('ai_generate', {
        status: 'completed',
        message: `${data.count} ${tPipeline.controlsGeneratedSuffix || 'security controls generated'}`,
      });

      // Step 4: Save (already done by the edge function)
      updateStep('save', {
        status: 'completed',
        message: `${data.count} ${tPipeline.controlsSavedSuffix || 'controls saved to database'}`,
      });

      // Step 5: Update project
      updateStep('update_project', {
        status: 'completed',
        message: tPipeline.projectUpdated || 'Project status updated to review',
      });

      setResult({ count: data.count });
      toast.success(`${data.count} ${tPipeline.successToastSuffix || 'security controls generated successfully!'}`);
    } catch (err: any) {
      const failedStep = steps.find(s => s.status === 'running')?.id;
      if (failedStep) {
        updateStep(failedStep, { status: 'failed', message: err.message });
      }
      toast.error(`${tPipeline.pipelineFailedPrefix || 'Pipeline failed'}: ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const completedCount = steps.filter(s => s.status === 'completed').length;
  const overallProgress = (completedCount / steps.length) * 100;

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-semibold text-foreground">{t.workspace.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t.workspace.subtitle}</p>
        </div>
        <HelpButton section="workspace" />
      </div>

      {/* Project selector + info */}
      <div className="bg-card border border-border rounded-lg p-5 shadow-premium space-y-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[250px]">
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              {tPipeline.projectLabel || 'Project'}
            </label>
            <Select value={selectedProjectId} onValueChange={v => { setSelectedProjectId(v); setSteps(createInitialSteps()); setResult(null); }}>
              <SelectTrigger><SelectValue placeholder={tPipeline.selectProjectPlaceholder || 'Select a project'} /></SelectTrigger>
              <SelectContent>
                {projects.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} — {p.technology}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={runPipeline}
            disabled={!selectedProjectId || isRunning || sources.length === 0}
            className="gold-gradient text-primary-foreground hover:opacity-90"
          >
            {isRunning ? (
              <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />{tPipeline.processing || 'Processing...'}</>
            ) : (
              <><Sparkles className="h-4 w-4 mr-1.5" />{t.workspace.startPipeline}</>
            )}
          </Button>
        </div>

        {/* Source summary */}
        {selectedProjectId && (
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              <span>{sources.length} {tPipeline.processedSourcesLabel || 'processed sources'}</span>
            </div>
            {sources.length === 0 && (
              <div className="flex items-center gap-1.5 text-warning">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>{tPipeline.noProcessedSourcesWarning || 'No processed sources found. Upload in Source Library first.'}</span>
              </div>
            )}
            {selectedProject && (
              <div className="flex items-center gap-1.5">
                <span>{tPipeline.technologyLabel || 'Technology'}: <span className="font-medium text-foreground">{(selectedProject as any).technology}</span></span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Pipeline steps */}
      {(isRunning || completedCount > 0) && (
        <>
          {/* Overall progress */}
          <div className="bg-card border border-border rounded-lg p-5 shadow-premium">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">{tPipeline.progressTitle || 'Pipeline Progress'}</span>
              </div>
              <span className="text-xs text-muted-foreground tabular-nums">{completedCount} / {steps.length}</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full gold-gradient rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${overallProgress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          <div className="space-y-3">
            {steps.map((step, i) => (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`bg-card border rounded-lg p-4 shadow-premium transition-all ${
                  step.status === 'running' ? 'border-primary/30 ring-1 ring-primary/10' :
                  step.status === 'completed' ? 'border-success/20' :
                  step.status === 'failed' ? 'border-destructive/20' : 'border-border'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {statusIcon[step.status]}
                    <span className="text-sm font-medium text-foreground">{step.label}</span>
                  </div>
                </div>
                {step.message && (
                  <p className="text-xs text-muted-foreground mt-1.5 ml-7">{step.message}</p>
                )}
              </motion.div>
            ))}
          </div>
        </>
      )}

      {/* Result */}
      {result && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-success/5 border border-success/20 rounded-lg p-6 text-center space-y-3"
        >
          <CheckCircle2 className="h-10 w-10 text-success mx-auto" />
          <h3 className="text-lg font-display font-semibold text-foreground">
            {result.count} {tPipeline.resultTitleSuffix || 'Controls Generated'}
          </h3>
          <p className="text-sm text-muted-foreground">
            {tPipeline.resultDescription || 'Controls were saved and are ready for review in Baseline Editor.'}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.href = '/editor'}
          >
            <ArrowRight className="h-4 w-4 mr-1.5" />
            {tPipeline.goToEditor || 'Go to Baseline Editor'}
          </Button>
        </motion.div>
      )}

      {/* Empty state */}
      {!selectedProjectId && !isRunning && (
        <div className="bg-card border border-border rounded-lg p-12 text-center">
          <Sparkles className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-medium text-muted-foreground">{tPipeline.emptyStateTitle || 'Select a project to start the control-generation pipeline'}</p>
          <p className="text-xs text-muted-foreground/70 mt-1">{tPipeline.emptyStateDescription || 'AI Workspace analyzes processed sources and automatically generates security controls.'}</p>
        </div>
      )}
    </div>
  );
};

export default AIWorkspace;


