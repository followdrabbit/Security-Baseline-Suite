import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useI18n } from '@/contexts/I18nContext';
import { mockPipeline } from '@/data/mockData';
import type { PipelineStep, PipelineStageStatus } from '@/types';
import { Button } from '@/components/ui/button';
import { Play, Pause, RotateCcw, CheckCircle2, Circle, Loader2, XCircle, Sparkles } from 'lucide-react';

const statusIcon: Record<PipelineStageStatus, React.ReactNode> = {
  pending: <Circle className="h-4 w-4 text-muted-foreground" />,
  running: <Loader2 className="h-4 w-4 text-primary animate-spin" />,
  completed: <CheckCircle2 className="h-4 w-4 text-success" />,
  failed: <XCircle className="h-4 w-4 text-destructive" />,
};

const AIWorkspace: React.FC = () => {
  const { t } = useI18n();
  const [pipeline, setPipeline] = useState<PipelineStep[]>(mockPipeline);
  const [isRunning, setIsRunning] = useState(true);

  // Simulate progress
  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      setPipeline(prev => prev.map(step => {
        if (step.status === 'running' && step.progress < 100) {
          const newProgress = Math.min(100, step.progress + Math.random() * 3);
          if (newProgress >= 100) {
            return { ...step, progress: 100, status: 'completed' as const, message: `${step.itemsTotal} items processed successfully` };
          }
          return { ...step, progress: newProgress, itemsProcessed: Math.floor((newProgress / 100) * (step.itemsTotal || 0)) };
        }
        return step;
      }));
    }, 800);
    return () => clearInterval(interval);
  }, [isRunning]);

  const completedCount = pipeline.filter(s => s.status === 'completed').length;
  const totalSteps = pipeline.length;
  const overallProgress = (completedCount / totalSteps) * 100;

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-semibold text-foreground">{t.workspace.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t.workspace.subtitle}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsRunning(!isRunning)}>
            {isRunning ? <><Pause className="h-4 w-4 mr-1.5" />{t.workspace.pausePipeline}</> : <><Play className="h-4 w-4 mr-1.5" />{t.workspace.startPipeline}</>}
          </Button>
          <Button variant="outline" size="sm"><RotateCcw className="h-4 w-4 mr-1.5" />{t.workspace.resetPipeline}</Button>
        </div>
      </div>

      {/* Overall progress */}
      <div className="bg-card border border-border rounded-lg p-5 shadow-premium">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Pipeline Progress</span>
          </div>
          <span className="text-xs text-muted-foreground tabular-nums">{completedCount} / {totalSteps}</span>
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

      {/* Pipeline stages */}
      <div className="space-y-3">
        {pipeline.map((step, i) => {
          const stageLabel = (t.workspace.stages as Record<string, string>)[step.stage] || step.stage;
          return (
            <motion.div
              key={step.stage}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`bg-card border rounded-lg p-4 shadow-premium transition-all ${
                step.status === 'running' ? 'border-primary/30 ring-1 ring-primary/10' :
                step.status === 'completed' ? 'border-success/20' :
                step.status === 'failed' ? 'border-destructive/20' : 'border-border'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  {statusIcon[step.status]}
                  <span className="text-sm font-medium text-foreground">{stageLabel}</span>
                </div>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {step.status === 'running' && `${Math.round(step.progress)}%`}
                  {step.status === 'completed' && '100%'}
                </span>
              </div>
              {(step.status === 'running' || step.status === 'completed') && (
                <div className="h-1 bg-muted rounded-full overflow-hidden mb-2">
                  <motion.div
                    className={`h-full rounded-full ${step.status === 'completed' ? 'bg-success' : 'gold-gradient'}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${step.progress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              )}
              <p className="text-xs text-muted-foreground">{step.message}</p>
              {step.itemsProcessed !== undefined && step.itemsTotal !== undefined && (
                <p className="text-[11px] text-muted-foreground/60 mt-1 tabular-nums">{step.itemsProcessed} / {step.itemsTotal} {t.common.items}</p>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default AIWorkspace;
