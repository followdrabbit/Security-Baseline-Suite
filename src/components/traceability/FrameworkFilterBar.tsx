import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useI18n } from '@/contexts/I18nContext';
import { Shield, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  selectedFramework: string | null;
  filteredCount: number;
  onClear: () => void;
}

const FrameworkFilterBar: React.FC<Props> = ({ selectedFramework, filteredCount, onClear }) => {
  const { t } = useI18n();

  return (
    <AnimatePresence>
      {selectedFramework && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-primary/20 bg-primary/5"
        >
          <Shield className="h-4 w-4 text-primary/60" />
          <span className="text-sm text-foreground">
            {t.traceabilityPage.filteringBy}:{' '}
            <strong>{selectedFramework}</strong>
          </span>
          <span className="text-xs text-muted-foreground">
            ({filteredCount} {t.traceabilityPage.controlsMapped})
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground ml-auto"
            onClick={onClear}
          >
            <X className="h-3.5 w-3.5 mr-1" />
            {t.traceabilityPage.clearFilter}
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FrameworkFilterBar;
