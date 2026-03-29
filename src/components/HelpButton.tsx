import React from 'react';
import { useNavigate } from 'react-router-dom';
import { HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useI18n } from '@/contexts/I18nContext';

interface HelpButtonProps {
  section: string;
}

const HelpButton: React.FC<HelpButtonProps> = ({ section }) => {
  const navigate = useNavigate();
  const { t } = useI18n();
  const d = (t as any).docs;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={() => navigate(`/docs#${section}`)}
          className="h-7 w-7 rounded-full bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-colors"
          aria-label={d?.title || 'Help'}
        >
          <HelpCircle className="h-3.5 w-3.5 text-primary" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <p className="text-xs">{d?.title || 'Documentation'}</p>
      </TooltipContent>
    </Tooltip>
  );
};

export default HelpButton;
