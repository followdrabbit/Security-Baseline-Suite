import React from 'react';

interface Feature {
  icon: React.ElementType;
  title: string;
  description: string;
}

interface DocFeatureGridProps {
  features: Feature[];
  columns?: 2 | 3;
}

const DocFeatureGrid: React.FC<DocFeatureGridProps> = ({ features, columns = 3 }) => {
  const gridCols = columns === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3';

  return (
    <div className={`grid grid-cols-1 ${gridCols} gap-4`}>
      {features.map((f, i) => (
        <div
          key={i}
          className="bg-muted/30 border border-border/50 rounded-lg p-4 hover:bg-muted/50 transition-colors group"
        >
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
            <f.icon className="h-4.5 w-4.5 text-primary" />
          </div>
          <p className="text-sm font-semibold text-foreground mb-1">{f.title}</p>
          <p className="text-xs text-muted-foreground leading-relaxed">{f.description}</p>
        </div>
      ))}
    </div>
  );
};

export default DocFeatureGrid;
