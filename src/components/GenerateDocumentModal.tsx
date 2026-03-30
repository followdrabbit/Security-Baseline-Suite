import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useI18n } from '@/contexts/I18nContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { FileText, FileType, Download, Loader2, CheckCircle2 } from 'lucide-react';
import { generateBaselinePDF, generateBaselineDOCX } from '@/services/baselineDocumentService';
import type { ControlItem } from '@/types';
import type { Locale } from '@/types';

interface GenerateDocumentModalProps {
  open: boolean;
  onClose: () => void;
  projectName: string;
  technology: string;
  version: number;
  publishedAt?: string;
  controls: ControlItem[];
  sources?: any[];
}

const GenerateDocumentModal: React.FC<GenerateDocumentModalProps> = ({
  open,
  onClose,
  projectName,
  technology,
  version,
  publishedAt,
  controls,
  sources,
}) => {
  const { t, locale } = useI18n();
  const [generating, setGenerating] = useState<'pdf' | 'docx' | null>(null);
  const [done, setDone] = useState<Set<string>>(new Set());

  const handleGenerate = async (format: 'pdf' | 'docx') => {
    setGenerating(format);
    try {
      await new Promise(r => setTimeout(r, 500)); // brief delay for UX
      const opts = {
        projectName,
        technology,
        version,
        publishedAt,
        locale: locale as Locale,
        controls,
        sources,
      };
      if (format === 'pdf') {
        generateBaselinePDF(opts);
      } else {
        generateBaselineDOCX(opts);
      }
      setDone(prev => new Set(prev).add(format));
    } finally {
      setGenerating(null);
    }
  };

  const doc = (t as any).baselineDocument || {};

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { onClose(); setDone(new Set()); } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            {doc.generateTitle || 'Generate Baseline Document'}
          </DialogTitle>
          <DialogDescription>
            {doc.generateDesc || 'Generate a standardized baseline document for the selected technology.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          {/* Project info */}
          <div className="bg-muted/40 rounded-lg p-3 border border-border/50 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{doc.project || 'Project'}</span>
              <span className="text-xs font-semibold text-foreground">{projectName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{doc.tech || 'Technology'}</span>
              <span className="text-xs font-medium text-foreground">{technology}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{doc.ver || 'Version'}</span>
              <span className="text-xs font-mono text-foreground">v{version}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{doc.controlsLabel || 'Controls'}</span>
              <span className="text-xs font-semibold text-primary">{controls.length}</span>
            </div>
          </div>

          {/* Document structure preview */}
          <div className="bg-primary/5 rounded-lg p-3 border border-primary/10">
            <p className="text-[10px] uppercase tracking-wider text-primary/60 font-semibold mb-2">
              {doc.structure || 'Document Structure'}
            </p>
            <div className="space-y-1">
              {[
                doc.coverPage || 'Cover Page',
                doc.toc || 'Table of Contents',
                doc.execSummary || 'Executive Summary',
                doc.projOverview || 'Project Overview',
                doc.secControls || 'Security Controls (by category)',
                doc.annexFramework || 'Annex A — Framework Coverage',
                doc.annexSources || 'Annex B — Source Traceability',
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary/40" />
                  <span className="text-xs text-muted-foreground">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Format buttons */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                className="w-full gold-gradient text-primary-foreground hover:opacity-90 h-11"
                onClick={() => handleGenerate('pdf')}
                disabled={generating !== null}
              >
                {generating === 'pdf' ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : done.has('pdf') ? (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                ) : (
                  <FileType className="h-4 w-4 mr-2" />
                )}
                {doc.downloadPdf || 'Download PDF'}
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                variant="outline"
                className="w-full h-11"
                onClick={() => handleGenerate('docx')}
                disabled={generating !== null}
              >
                {generating === 'docx' ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : done.has('docx') ? (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                ) : (
                  <FileText className="h-4 w-4 mr-2" />
                )}
                {doc.downloadDocx || 'Download DOCX'}
              </Button>
            </motion.div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GenerateDocumentModal;
