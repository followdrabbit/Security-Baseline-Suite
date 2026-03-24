import React from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { HelpCircle } from 'lucide-react';

interface InfoTooltipProps {
  content: string;
  className?: string;
}

const InfoTooltip: React.FC<InfoTooltipProps> = ({ content, className = '' }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <HelpCircle className={`inline-block h-3.5 w-3.5 text-muted-foreground/50 hover:text-primary cursor-help transition-colors ${className}`} />
    </TooltipTrigger>
    <TooltipContent side="top" className="max-w-xs text-xs leading-relaxed bg-popover border-border shadow-premium-lg">
      {content}
    </TooltipContent>
  </Tooltip>
);

export default InfoTooltip;
