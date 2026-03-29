import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import StatusBadge from '@/components/StatusBadge';
import ConfidenceScore from '@/components/ConfidenceScore';
import { X, Clock, Cpu, Eye, EyeOff, Database, FileText, Globe, ArrowRight, Plus, CheckCircle2, AlertCircle, Loader2, Download } from 'lucide-react';
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

const STATUS_ICONS: Record<string, React.ReactNode> = {
  created: <Plus className="h-3 w-3" />,
  pending: <Clock className="h-3 w-3" />,
  extracting: <Loader2 className="h-3 w-3" />,
  processed: <CheckCircle2 className="h-3 w-3" />,
  failed: <AlertCircle className="h-3 w-3" />,
  validated: <CheckCircle2 className="h-3 w-3" />,
  normalized: <CheckCircle2 className="h-3 w-3" />,
};

const STATUS_COLORS: Record<string, string> = {
  created: 'bg-info/10 text-info',
  pending: 'bg-warning/10 text-warning',
  extracting: 'bg-primary/10 text-primary',
  processed: 'bg-success/10 text-success',
  failed: 'bg-destructive/10 text-destructive',
  validated: 'bg-success/10 text-success',
  normalized: 'bg-info/10 text-info',
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

  // Fetch activity logs for this source
  const { data: activityLogs = [], isLoading: logsLoading } = useQuery({
    queryKey: ['source-activity-logs', source.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('source_activity_logs' as any)
        .select('*')
        .eq('source_id', source.id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as any[];
    },
    enabled: activeTab === 'audit',
  });

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
        <TabsContent value="audit" className="mt-0">
          <ScrollArea className="h-[420px]">
            <div className="p-4 space-y-4 text-xs">
              {/* Activity Timeline */}
              <div>
                <h4 className="font-semibold text-foreground text-[11px] uppercase tracking-wider mb-3">Activity Log</h4>
                {logsLoading ? (
                  <div className="flex items-center gap-2 text-muted-foreground py-4 justify-center">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Loading logs...</span>
                  </div>
                ) : activityLogs.length === 0 ? (
                  <p className="text-muted-foreground italic text-center py-4">
                    No activity logs yet. Upload a new source to see status transitions here.
                  </p>
                ) : (
                  <div className="relative">
                    {/* Timeline line */}
                    <div className="absolute left-[11px] top-3 bottom-3 w-px bg-border" />

                    <div className="space-y-0">
                      {activityLogs.map((log: any, index: number) => {
                        const isCreated = log.event_type === 'created';
                        const statusColor = STATUS_COLORS[log.new_status] || 'bg-muted text-muted-foreground';
                        const icon = isCreated
                          ? STATUS_ICONS.created
                          : STATUS_ICONS[log.new_status] || <ArrowRight className="h-3 w-3" />;

                        return (
                          <div key={log.id} className="relative flex items-start gap-3 pb-4 last:pb-0">
                            {/* Timeline dot */}
                            <div className={`relative z-10 mt-0.5 h-6 w-6 rounded-full flex items-center justify-center shrink-0 ${statusColor}`}>
                              {icon}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {isCreated ? (
                                  <span className="font-medium text-foreground">Source created</span>
                                ) : (
                                  <>
                                    <StatusBadge status={log.previous_status || 'unknown'} />
                                    <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                                    <StatusBadge status={log.new_status} />
                                  </>
                                )}
                              </div>
                              <p className="text-[10px] text-muted-foreground mt-1">
                                {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss')}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Summary section */}
              <div className="border-t border-border pt-3 space-y-3">
                <h4 className="font-semibold text-foreground text-[11px] uppercase tracking-wider">Summary</h4>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Added</span>
                    <span className="font-medium text-foreground">
                      {addedAt ? format(new Date(addedAt), 'dd/MM/yyyy HH:mm:ss') : '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Processed</span>
                    <span className="font-medium text-foreground">
                      {processedAt ? format(new Date(processedAt), 'dd/MM/yyyy HH:mm:ss') : '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Method</span>
                    <span className="font-medium text-foreground text-right max-w-[180px] truncate">
                      {EXTRACTION_METHOD_LABELS[extractionMethod] || extractionMethod}
                    </span>
                  </div>
                  {processedAt && addedAt && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Duration</span>
                      <span className="font-medium text-foreground">
                        {(() => {
                          const ms = new Date(processedAt).getTime() - new Date(addedAt).getTime();
                          if (ms < 1000) return `${ms}ms`;
                          if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
                          return `${(ms / 60000).toFixed(1)}min`;
                        })()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Storage */}
              <div className="border-t border-border pt-3 space-y-2">
                <h4 className="font-semibold text-foreground text-[11px] uppercase tracking-wider">Storage</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-muted/40 rounded-md p-2">
                    <p className="text-[10px] text-muted-foreground">Raw Content</p>
                    <p className="font-medium text-foreground">
                      {hasRawContent ? `${(source.raw_content.length / 1024).toFixed(1)} KB` : '—'}
                    </p>
                  </div>
                  <div className="bg-muted/40 rounded-md p-2">
                    <p className="text-[10px] text-muted-foreground">Extracted</p>
                    <p className="font-medium text-foreground">
                      {hasExtractedContent ? `${(source.extracted_content.length / 1024).toFixed(1)} KB` : '—'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
};

export default SourceDetailPanel;
