import React from 'react';

interface ConfidenceScoreProps {
  score: number;
  size?: 'sm' | 'md';
}

const ConfidenceScore: React.FC<ConfidenceScoreProps> = ({ score, size = 'sm' }) => {
  const pct = Math.round(score * 100);
  const getColor = () => {
    if (pct >= 90) return 'text-success';
    if (pct >= 75) return 'text-primary';
    if (pct >= 60) return 'text-warning';
    return 'text-destructive';
  };

  const barWidth = size === 'sm' ? 'w-12' : 'w-20';
  const barH = size === 'sm' ? 'h-1' : 'h-1.5';

  return (
    <div className="flex items-center gap-2">
      <span className={`text-xs font-semibold tabular-nums ${getColor()}`}>{pct}%</span>
      <div className={`${barWidth} ${barH} bg-muted rounded-full overflow-hidden`}>
        <div className={`h-full rounded-full transition-all duration-500 ${pct >= 90 ? 'bg-success' : pct >= 75 ? 'bg-primary' : pct >= 60 ? 'bg-warning' : 'bg-destructive'}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

export default ConfidenceScore;
