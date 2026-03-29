import React from 'react';
import { cn } from '@/lib/utils';
import { Info, AlertTriangle, Lightbulb, Zap, CheckCircle2 } from 'lucide-react';

type CalloutVariant = 'info' | 'warning' | 'tip' | 'success' | 'example';

const variantConfig: Record<CalloutVariant, { icon: React.ElementType; bg: string; border: string; iconColor: string }> = {
  info: { icon: Info, bg: 'bg-blue-500/5', border: 'border-blue-500/20', iconColor: 'text-blue-500' },
  warning: { icon: AlertTriangle, bg: 'bg-amber-500/5', border: 'border-amber-500/20', iconColor: 'text-amber-500' },
  tip: { icon: Lightbulb, bg: 'bg-primary/5', border: 'border-primary/20', iconColor: 'text-primary' },
  success: { icon: CheckCircle2, bg: 'bg-emerald-500/5', border: 'border-emerald-500/20', iconColor: 'text-emerald-500' },
  example: { icon: Zap, bg: 'bg-violet-500/5', border: 'border-violet-500/20', iconColor: 'text-violet-500' },
};

interface DocCalloutProps {
  variant?: CalloutVariant;
  title?: string;
  children: React.ReactNode;
}

const DocCallout: React.FC<DocCalloutProps> = ({ variant = 'info', title, children }) => {
  const config = variantConfig[variant];
  const Icon = config.icon;

  return (
    <div className={cn('rounded-lg border p-4 flex gap-3', config.bg, config.border)}>
      <Icon className={cn('h-5 w-5 shrink-0 mt-0.5', config.iconColor)} />
      <div className="min-w-0">
        {title && <p className="text-sm font-semibold text-foreground mb-1">{title}</p>}
        <div className="text-sm text-muted-foreground leading-relaxed">{children}</div>
      </div>
    </div>
  );
};

export default DocCallout;
