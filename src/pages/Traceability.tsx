import React, { useState, useMemo } from 'react';
import { useI18n } from '@/contexts/I18nContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import InfoTooltip from '@/components/InfoTooltip';
import HelpButton from '@/components/HelpButton';
import { TraceabilityCardSkeleton } from '@/components/skeletons/SkeletonPremium';
import { getFrameworkPrefix, FRAMEWORK_COLORS } from '@/components/traceability/utils';
import FrameworkRadarChart from '@/components/traceability/FrameworkRadarChart';
import FrameworkFilterBar from '@/components/traceability/FrameworkFilterBar';
import TraceabilityControlCard from '@/components/traceability/TraceabilityControlCard';
import { exportToCSV, exportToPDF, exportToJSON } from '@/components/traceability/exportUtils';
import { Button } from '@/components/ui/button';
import { Download, FileText, Braces } from 'lucide-react';
import type { ControlItem, SourceTraceability, ThreatScenario } from '@/types';

const Traceability: React.FC = () => {
  const { t } = useI18n();
  const { user } = useAuth();
  const [selectedFramework, setSelectedFramework] = useState<string | null>(null);

  const { data: controls = [], isLoading: loading } = useQuery({
    queryKey: ['traceability-controls', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('controls')
        .select('*')
        .eq('user_id', user.id)
        .order('control_id', { ascending: true });

      if (error) throw error;

      return (data || []).map((c): ControlItem => ({
        id: c.id,
        projectId: c.project_id,
        controlId: c.control_id,
        title: c.title,
        description: c.description || '',
        applicability: c.applicability || '',
        securityRisk: c.security_risk || '',
        criticality: (c.criticality as ControlItem['criticality']) || 'medium',
        defaultBehaviorLimitations: c.default_behavior_limitations || '',
        automation: c.automation || '',
        references: c.references || [],
        frameworkMappings: c.framework_mappings || [],
        threatScenarios: (c.threat_scenarios as unknown as ThreatScenario[]) || [],
        sourceTraceability: (c.source_traceability as unknown as SourceTraceability[]) || [],
        confidenceScore: Number(c.confidence_score) || 0,
        reviewStatus: (c.review_status as ControlItem['reviewStatus']) || 'pending',
        reviewerNotes: c.reviewer_notes || '',
        version: c.version || 1,
        category: c.category || '',
      }));
    },
    enabled: !!user,
  });

  const frameworkData = useMemo(() => {
    const counts: Record<string, Set<string>> = {};
    for (const control of controls) {
      for (const mapping of control.frameworkMappings) {
        const prefix = getFrameworkPrefix(mapping);
        if (!counts[prefix]) counts[prefix] = new Set();
        counts[prefix].add(control.id);
      }
    }
    return Object.entries(counts)
      .map(([framework, controlSet]) => ({
        framework,
        controls: controlSet.size,
        fullMark: controls.length,
        color: FRAMEWORK_COLORS[framework] || FRAMEWORK_COLORS['Other'],
      }))
      .sort((a, b) => b.controls - a.controls);
  }, [controls]);

  const filteredControls = useMemo(() => {
    if (!selectedFramework) return controls;
    return controls.filter(c =>
      c.frameworkMappings.some(m => getFrameworkPrefix(m) === selectedFramework)
    );
  }, [selectedFramework, controls]);

  const handleFrameworkClick = (framework: string) => {
    setSelectedFramework(prev => prev === framework ? null : framework);
  };

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-semibold text-foreground">{t.traceabilityPage.title}</h1>
          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
            {t.traceabilityPage.subtitle} <InfoTooltip content={t.tooltips.traceability} />
          </p>
        </div>
        {!loading && controls.length > 0 && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs gap-1.5"
              onClick={() => exportToCSV(filteredControls, selectedFramework ? `traceability-${selectedFramework}` : 'traceability-all')}
            >
              <Download className="h-3.5 w-3.5" />
              CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs gap-1.5"
              onClick={() => exportToJSON(filteredControls, selectedFramework ? `traceability-${selectedFramework}` : 'traceability-all')}
            >
              <Braces className="h-3.5 w-3.5" />
              JSON
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs gap-1.5"
              onClick={() => exportToPDF(filteredControls, selectedFramework)}
            >
              <FileText className="h-3.5 w-3.5" />
              PDF
            </Button>
          </div>
        )}
      </div>

      {!loading && controls.length > 0 && (
        <FrameworkRadarChart
          frameworkData={frameworkData}
          selectedFramework={selectedFramework}
          onFrameworkClick={handleFrameworkClick}
          totalControls={controls.length}
          allControls={controls}
        />
      )}

      <FrameworkFilterBar
        selectedFramework={selectedFramework}
        filteredCount={filteredControls.length}
        onClear={() => setSelectedFramework(null)}
      />

      <div className="space-y-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <TraceabilityCardSkeleton key={i} />)
        ) : controls.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-sm">No controls found. Generate controls in the AI Workspace first.</p>
          </div>
        ) : (
          filteredControls.map((control, i) => (
            <TraceabilityControlCard key={control.id} control={control} index={i} />
          ))
        )}
      </div>
    </div>
  );
};

export default Traceability;
