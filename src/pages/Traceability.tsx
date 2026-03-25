import React, { useState, useEffect, useMemo } from 'react';
import { useI18n } from '@/contexts/I18nContext';
import { mockControls } from '@/data/mockData';
import InfoTooltip from '@/components/InfoTooltip';
import { TraceabilityCardSkeleton } from '@/components/skeletons/SkeletonPremium';
import { getFrameworkPrefix, FRAMEWORK_COLORS } from '@/components/traceability/utils';
import FrameworkRadarChart from '@/components/traceability/FrameworkRadarChart';
import FrameworkFilterBar from '@/components/traceability/FrameworkFilterBar';
import TraceabilityControlCard from '@/components/traceability/TraceabilityControlCard';
import { exportToCSV, exportToPDF, exportToJSON } from '@/components/traceability/exportUtils';
import { Button } from '@/components/ui/button';
import { Download, FileText, Braces } from 'lucide-react';

const Traceability: React.FC = () => {
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [selectedFramework, setSelectedFramework] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1400);
    return () => clearTimeout(timer);
  }, []);

  const frameworkData = useMemo(() => {
    const counts: Record<string, Set<string>> = {};
    for (const control of mockControls) {
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
        fullMark: mockControls.length,
        color: FRAMEWORK_COLORS[framework] || FRAMEWORK_COLORS['Other'],
      }))
      .sort((a, b) => b.controls - a.controls);
  }, []);

  const filteredControls = useMemo(() => {
    if (!selectedFramework) return mockControls;
    return mockControls.filter(c =>
      c.frameworkMappings.some(m => getFrameworkPrefix(m) === selectedFramework)
    );
  }, [selectedFramework]);

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
        {!loading && (
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

      {!loading && (
        <FrameworkRadarChart
          frameworkData={frameworkData}
          selectedFramework={selectedFramework}
          onFrameworkClick={handleFrameworkClick}
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
