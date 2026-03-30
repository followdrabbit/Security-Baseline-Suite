import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useI18n } from '@/contexts/I18nContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { FileText, FileType, Download, Loader2, CheckCircle2, Settings2 } from 'lucide-react';
import { generateBaselinePDF, generateBaselineDOCX, DEFAULT_SECTIONS } from '@/services/baselineDocumentService';
import type { DocumentSections } from '@/services/baselineDocumentService';
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

const SECTION_KEYS: (keyof DocumentSections)[] = [
  'cover', 'toc', 'executiveSummary', 'projectOverview', 'securityControls', 'annexA', 'annexB',
];

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
  const [sections, setSections] = useState<DocumentSections>({ ...DEFAULT_SECTIONS });
  const [showCustomize, setShowCustomize] = useState(false);

  const doc = (t as any).baselineDocument || {};

  const sectionLabels: Record<keyof DocumentSections, string> = {
    cover: doc.coverPage || 'Cover Page',
    toc: doc.toc || 'Table of Contents',
    executiveSummary: doc.execSummary || 'Executive Summary',
    projectOverview: doc.projOverview || 'Project Overview',
    securityControls: doc.secControls || 'Security Controls (by category)',
    annexA: doc.annexFramework || 'Annex A — Framework Coverage',
    annexB: doc.annexSources || 'Annex B — Source Traceability',
  };

  const toggleSection = (key: keyof DocumentSections) => {
    setSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const enabledCount = SECTION_KEYS.filter(k => sections[k]).length;

  const handleGenerate = async (format: 'pdf' | 'docx') => {
    setGenerating(format);
    try {
      await new Promise(r => setTimeout(r, 500));
      const opts = {
        projectName,
        technology,
        version,
        publishedAt,
        locale: locale as Locale,
        controls,
        sources,
        sections,
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

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { onClose(); setDone(new Set()); setShowCustomize(false); } }}>
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

          {/* Section customization toggle */}
          <button
            type="button"
            onClick={() => setShowCustomize(!showCustomize)}
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
          >
            <Settings2 className="h-3.5 w-3.5" />
            <span>{doc.customizeSections || 'Customize sections'}</span>
            <span className="ml-auto text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">
              {enabledCount}/{SECTION_KEYS.length}
            </span>
          </button>

          {/* Section checkboxes */}
          <AnimatePresence>
            {showCustomize && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="bg-primary/5 rounded-lg p-3 border border-primary/10 space-y-2">
                  {SECTION_KEYS.map((key) => (
                    <label
                      key={key}
                      className="flex items-center gap-2.5 cursor-pointer group"
                    >
                      <Checkbox
                        checked={sections[key]}
                        onCheckedChange={() => toggleSection(key)}
                        className="h-3.5 w-3.5"
                      />
                      <span className={`text-xs transition-colors ${sections[key] ? 'text-foreground' : 'text-muted-foreground line-through'}`}>
                        {sectionLabels[key]}
                      </span>
                    </label>
                  ))}
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setSections({ ...DEFAULT_SECTIONS })}
                      className="text-[10px] text-primary hover:underline"
                    >
                      {doc.selectAll || 'Select all'}
                    </button>
                    <span className="text-[10px] text-muted-foreground">·</span>
                    <button
                      type="button"
                      onClick={() => setSections({ cover: false, toc: false, executiveSummary: false, projectOverview: false, securityControls: false, annexA: false, annexB: false })}
                      className="text-[10px] text-muted-foreground hover:text-foreground hover:underline"
                    >
                      {doc.deselectAll || 'Deselect all'}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Document structure preview (when not customizing) */}
          {!showCustomize && (
            <div className="bg-primary/5 rounded-lg p-3 border border-primary/10">
              <p className="text-[10px] uppercase tracking-wider text-primary/60 font-semibold mb-2">
                {doc.structure || 'Document Structure'}
              </p>
              <div className="space-y-1">
                {SECTION_KEYS.filter(k => sections[k]).map((key) => (
                  <div key={key} className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary/40" />
                    <span className="text-xs text-muted-foreground">{sectionLabels[key]}</span>
                  </div>
                ))}
                {enabledCount === 0 && (
                  <p className="text-xs text-muted-foreground italic">{doc.noSections || 'No sections selected'}</p>
                )}
              </div>
            </div>
          )}

          {/* Format buttons */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                className="w-full gold-gradient text-primary-foreground hover:opacity-90 h-11"
                onClick={() => handleGenerate('pdf')}
                disabled={generating !== null || enabledCount === 0}
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
                disabled={generating !== null || enabledCount === 0}
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
