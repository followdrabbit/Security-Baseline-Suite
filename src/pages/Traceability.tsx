import React, { useState, useEffect, useMemo } from 'react';
import { useI18n } from '@/contexts/I18nContext';
import { mockControls } from '@/data/mockData';
import InfoTooltip from '@/components/InfoTooltip';
import { TraceabilityCardSkeleton } from '@/components/skeletons/SkeletonPremium';
import { getFrameworkPrefix, FRAMEWORK_COLORS } from '@/components/traceability/utils';
import FrameworkRadarChart from '@/components/traceability/FrameworkRadarChart';
import FrameworkFilterBar from '@/components/traceability/FrameworkFilterBar';
import TraceabilityControlCard from '@/components/traceability/TraceabilityControlCard';

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
      <div>
        <h1 className="text-2xl lg:text-3xl font-display font-semibold text-foreground">{t.traceabilityPage.title}</h1>
        <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
          {t.traceabilityPage.subtitle} <InfoTooltip content={t.tooltips.traceability} />
        </p>
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
