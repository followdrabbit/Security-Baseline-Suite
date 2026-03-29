import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import StatusBadge from '@/components/StatusBadge';
import ConfidenceScore from '@/components/ConfidenceScore';
import { X, Clock, Cpu, Eye, EyeOff, Database, FileText, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';

const EXTRACTION_METHOD_LABELS: Record<string, string> = {
  direct_text: 'Direct Text Read',
  ai_gemini_pdf: 'AI (Gemini) PDF Extraction',
  office_xml_ai: 'Office XML + AI Structuring',
  ai_url_extraction: 'AI Web Content Extraction',
  unsupported: 'Unsupported Format',
  none: 'None',
};

interface SourceDetailPanelProps {
  source: any;
  onClose: () => void;
}

const SourceDetailPanel: React.FC<SourceDetailPanelProps> = ({ source, onClose }) => {
  const [activeTab, setActiveTab] = useState('info');
  const [showRaw, setShowRaw] = useState(false);

  const extractionMethod = source.extraction_method || 'none';
  const hasRawContent = !!source.raw_content;
  const hasExtractedContent = !!source.extracted_content;
  const processedAt = source.processed_at;
  const addedAt = source.added_at;

  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      className="w-96 shrink-0 bg-card border border-border rounded-lg shadow-premium h-fit sticky top-6 hidden lg:block overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground truncate pr-2">{source.name}</h3>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground shrink-0">
          <X className="h-4 w-4" />
        </button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full rounded-none border-b border-border bg-muted/30 p-0 h-auto">
          <TabsTrigger value="info" className="flex-1 rounded-none text-xs py-2 data-[state=active]:bg-background data-[state=active]:shadow-none">
            Info
          </TabsTrigger>
          <TabsTrigger value="content" className="flex-1 rounded-none text-xs py-2 data-[state=active]:bg-background data-[state=active]:shadow-none">
            Content
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex-1 rounded-none text-xs py-2 data-[state=active]:bg-background data-[state=active]:shadow-none">
            Audit
          </TabsTrigger>
        </TabsList>

        {/* Info Tab */}
        <TabsContent value="info" className="p-4 space-y-3 text-xs mt-0">
          <div>
            <span className="text-muted-foreground">Type</span>
            <p className="font-medium text-foreground mt-0.5 flex items-center gap-1.5">
              {source.type === 'url' ? <Globe className="h-3.5 w-3.5 text-info" /> : <FileText className="h-3.5 w-3.5 text-warning" />}
              {source.type?.toUpperCase()} {source.file_type && `(${source.file_type.toUpperCase()})`}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Status</span>
            <div className="mt-1"><StatusBadge status={source.status} /></div>
          </div>
          <div>
            <span className="text-muted-foreground">Origin</span>
            <p className="font-medium text-foreground mt-0.5">{source.origin}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Confidence</span>
            <div className="mt-1"><ConfidenceScore score={source.confidence ?? 0} size="md" /></div>
          </div>
          <div>
            <span className="text-muted-foreground">Extraction Method</span>
            <p className="font-medium text-foreground mt-0.5 flex items-center gap-1.5">
              <Cpu className="h-3.5 w-3.5 text-primary" />
              {EXTRACTION_METHOD_LABELS[extractionMethod] || extractionMethod}
            </p>
          </div>
          {source.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {source.tags.map((tag: string) => (
                <span key={tag} className="px-2 py-0.5 bg-muted rounded-full text-[10px] text-muted-foreground">{tag}</span>
              ))}
            </div>
          )}
          {source.preview && (
            <div>
              <span className="text-muted-foreground">Preview</span>
              <p className="text-foreground/80 mt-0.5 leading-relaxed line-clamp-4">{source.preview}</p>
            </div>
          )}
        </TabsContent>

        {/* Content Tab */}
        <TabsContent value="content" className="mt-0">
          <div className="p-3 border-b border-border flex items-center justify-between">
            <span className="text-xs font-medium text-foreground">
              {showRaw ? 'Raw Content' : 'Extracted Content'}
            </span>
            {hasRawContent && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[10px] px-2 gap-1"
                onClick={() => setShowRaw(!showRaw)}
              >
                {showRaw ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                {showRaw ? 'Show Extracted' : 'Show Raw'}
              </Button>
            )}
          </div>
          <ScrollArea className="h-[300px]">
            <div className="p-4">
              {showRaw ? (
                hasRawContent ? (
                  <pre className="text-[11px] text-foreground/80 whitespace-pre-wrap font-mono leading-relaxed break-all">
                    {source.raw_content}
                  </pre>
                ) : (
                  <p className="text-xs text-muted-foreground italic">No raw content stored for this source.</p>
                )
              ) : (
                hasExtractedContent ? (
                  <div className="text-[11px] text-foreground/80 whitespace-pre-wrap leading-relaxed">
                    {source.extracted_content}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">No extracted content yet. Processing may still be in progress.</p>
                )
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Audit Tab */}
        <TabsContent value="audit" className="p-4 space-y-4 text-xs mt-0">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Database className="h-3 w-3 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">Source Added</p>
                <p className="text-muted-foreground mt-0.5">
                  {addedAt ? format(new Date(addedAt), 'dd/MM/yyyy HH:mm:ss') : '—'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="mt-0.5 h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Cpu className="h-3 w-3 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">Extraction Method</p>
                <p className="text-muted-foreground mt-0.5">
                  {EXTRACTION_METHOD_LABELS[extractionMethod] || extractionMethod}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="mt-0.5 h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Clock className="h-3 w-3 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">Processed At</p>
                <p className="text-muted-foreground mt-0.5">
                  {processedAt ? format(new Date(processedAt), 'dd/MM/yyyy HH:mm:ss') : 'Not processed yet'}
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-border pt-3 space-y-2">
            <h4 className="font-semibold text-foreground text-[11px] uppercase tracking-wider">Storage Summary</h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-muted/40 rounded-md p-2">
                <p className="text-[10px] text-muted-foreground">Raw Content</p>
                <p className="font-medium text-foreground">
                  {hasRawContent ? `${(source.raw_content.length / 1024).toFixed(1)} KB` : '—'}
                </p>
              </div>
              <div className="bg-muted/40 rounded-md p-2">
                <p className="text-[10px] text-muted-foreground">Extracted Content</p>
                <p className="font-medium text-foreground">
                  {hasExtractedContent ? `${(source.extracted_content.length / 1024).toFixed(1)} KB` : '—'}
                </p>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
};

export default SourceDetailPanel;
