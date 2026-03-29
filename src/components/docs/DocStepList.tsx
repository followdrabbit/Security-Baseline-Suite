import React from 'react';

interface Step {
  title: string;
  description: string;
  detail?: string;
}

interface DocStepListProps {
  steps: Step[];
}

const DocStepList: React.FC<DocStepListProps> = ({ steps }) => {
  return (
    <div className="relative space-y-0">
      {steps.map((step, i) => (
        <div key={i} className="flex gap-4 pb-6 last:pb-0">
          {/* Connector line */}
          <div className="flex flex-col items-center">
            <div className="h-8 w-8 rounded-full gold-gradient flex items-center justify-center shrink-0 z-10">
              <span className="text-xs font-bold text-primary-foreground">{i + 1}</span>
            </div>
            {i < steps.length - 1 && (
              <div className="w-px flex-1 bg-border mt-1" />
            )}
          </div>
          <div className="pt-1 pb-2">
            <p className="text-sm font-semibold text-foreground">{step.title}</p>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{step.description}</p>
            {step.detail && (
              <div className="mt-2 bg-muted/40 rounded-md px-3 py-2 text-xs text-muted-foreground border border-border/50 font-mono">
                {step.detail}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default DocStepList;
