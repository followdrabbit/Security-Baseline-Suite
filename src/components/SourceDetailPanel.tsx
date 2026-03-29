import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import StatusBadge from '@/components/StatusBadge';
import ConfidenceScore from '@/components/ConfidenceScore';
import { X, Clock, Cpu, Eye, EyeOff, Database, FileText, Globe, ArrowRight, Plus, CheckCircle2, AlertCircle, Loader2, Download, Sparkles, Hash, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const REPROCESS_MODELS: Record<string, string> = {
  'google/gemini-2.5-flash': 'Gemini 2.5 Flash',
  'google/gemini-2.5-pro': 'Gemini 2.5 Pro',
  'google/gemini-3-flash-preview': 'Gemini 3 Flash',
  'google/gemini-3.1-pro-preview': 'Gemini 3.1 Pro',
  'openai/gpt-5': 'GPT-5',
  'openai/gpt-5-mini': 'GPT-5 Mini',
};

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
  onReprocessed?: () => void;
}

const SourceDetailPanel: React.FC<SourceDetailPanelProps> = ({ source, onClose, onReprocessed }) => {
  const [activeTab, setActiveTab] = useState('info');
  
  const [showReprocess, setShowReprocess] = useState(false);
  const [reprocessModel, setReprocessModel] = useState(source.extraction_model || 'google/gemini-2.5-flash');
  const [contentView, setContentView] = useState<'extracted' | 'raw' | 'compare'>('extracted');
  const queryClient = useQueryClient();

  const reprocessMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('reprocess-source', {
        body: { sourceId: source.id, model: reprocessModel, maxTokens: 65000 },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success('Source reprocessed successfully');
      setShowReprocess(false);
      queryClient.invalidateQueries({ queryKey: ['sources'] });
      onReprocessed?.();
    },
    onError: (err: any) => {
      toast.error(`Reprocessing failed: ${err.message}`);
    },
  });

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

  const generateAuditPdf = () => {
    const fmtDate = (d: string | null) => d ? format(new Date(d), 'dd/MM/yyyy HH:mm:ss') : '—';
    const duration = processedAt && addedAt
      ? (() => {
          const ms = new Date(processedAt).getTime() - new Date(addedAt).getTime();
          if (ms < 1000) return `${ms}ms`;
          if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
          return `${(ms / 60000).toFixed(1)}min`;
        })()
      : '—';

    const escHtml = (s: string) => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

    const timelineHtml = activityLogs.length > 0
      ? activityLogs.map((log: any) => {
          const isCreated = log.event_type === 'created';
          return `<tr>
            <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;font-size:12px;color:#6b7280;">${fmtDate(log.created_at)}</td>
            <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;font-size:12px;">${isCreated ? 'Source Created' : `${(log.previous_status || '—').toUpperCase()} → ${log.new_status.toUpperCase()}`}</td>
            <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;font-size:12px;color:#6b7280;">${log.event_type}</td>
          </tr>`;
        }).join('')
      : '<tr><td colspan="3" style="padding:12px;text-align:center;color:#9ca3af;font-style:italic;">No activity logs recorded</td></tr>';

    const html = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<title>Audit Report — ${escHtml(source.name)}</title>
<style>
  @media print { body { margin: 0; } .no-print { display: none; } }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1f2937; max-width: 800px; margin: 0 auto; padding: 40px 32px; }
  h1 { font-size: 20px; margin: 0 0 4px; color: #111827; }
  h2 { font-size: 15px; margin: 32px 0 12px; color: #111827; border-bottom: 2px solid #d4a853; padding-bottom: 6px; }
  h3 { font-size: 13px; margin: 24px 0 8px; color: #374151; }
  .subtitle { font-size: 12px; color: #6b7280; margin-bottom: 24px; }
  .badge { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 11px; font-weight: 600; }
  .badge-processed { background: #d1fae5; color: #065f46; }
  .badge-pending { background: #fef3c7; color: #92400e; }
  .badge-extracting { background: #dbeafe; color: #1e40af; }
  .badge-failed { background: #fee2e2; color: #991b1b; }
  table { width: 100%; border-collapse: collapse; margin: 8px 0; }
  th { text-align: left; padding: 8px 12px; background: #f9fafb; border-bottom: 2px solid #e5e7eb; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 8px 0; }
  .info-item { background: #f9fafb; border-radius: 8px; padding: 12px; }
  .info-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #9ca3af; margin-bottom: 4px; }
  .info-value { font-size: 13px; font-weight: 600; color: #111827; }
  .content-block { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 8px 0; font-size: 12px; line-height: 1.6; white-space: pre-wrap; word-break: break-word; max-height: 400px; overflow: hidden; }
  .content-block.mono { font-family: 'SF Mono', 'Fira Code', monospace; font-size: 11px; }
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 10px; color: #9ca3af; text-align: center; }
  .print-btn { position: fixed; top: 16px; right: 16px; padding: 8px 20px; background: #d4a853; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600; }
  .print-btn:hover { background: #c49a40; }
</style>
</head><body>
<button class="print-btn no-print" onclick="window.print()">Print / Save PDF</button>

<h1>📋 Source Audit Report</h1>
<p class="subtitle">Generated on ${format(new Date(), 'dd/MM/yyyy HH:mm:ss')} — Aureum Baseline Studio</p>

<h2>Source Information</h2>
<div class="info-grid">
  <div class="info-item"><div class="info-label">Name</div><div class="info-value">${escHtml(source.name)}</div></div>
  <div class="info-item"><div class="info-label">Type</div><div class="info-value">${source.type?.toUpperCase() || '—'} ${source.file_type ? `(${source.file_type.toUpperCase()})` : ''}</div></div>
  <div class="info-item"><div class="info-label">Status</div><div class="info-value"><span class="badge badge-${source.status}">${source.status?.toUpperCase()}</span></div></div>
  <div class="info-item"><div class="info-label">Confidence</div><div class="info-value">${source.confidence != null ? `${Math.round(source.confidence * 100)}%` : '—'}</div></div>
  <div class="info-item"><div class="info-label">Origin</div><div class="info-value">${escHtml(source.origin || '—')}</div></div>
  <div class="info-item"><div class="info-label">Extraction Method</div><div class="info-value">${EXTRACTION_METHOD_LABELS[extractionMethod] || extractionMethod}</div></div>
  <div class="info-item"><div class="info-label">AI Model</div><div class="info-value">${source.extraction_model ? source.extraction_model.replace('google/', '').replace('openai/', '') : '—'}</div></div>
  <div class="info-item"><div class="info-label">Tokens Used</div><div class="info-value">${source.extraction_tokens != null ? source.extraction_tokens.toLocaleString() : '—'}</div></div>
  <div class="info-item"><div class="info-label">Added At</div><div class="info-value">${fmtDate(addedAt)}</div></div>
  <div class="info-item"><div class="info-label">Processed At</div><div class="info-value">${fmtDate(processedAt)}</div></div>
  <div class="info-item"><div class="info-label">Processing Duration</div><div class="info-value">${duration}</div></div>
  <div class="info-item"><div class="info-label">Storage</div><div class="info-value">Raw: ${hasRawContent ? `${(source.raw_content.length / 1024).toFixed(1)} KB` : '—'} / Extracted: ${hasExtractedContent ? `${(source.extracted_content.length / 1024).toFixed(1)} KB` : '—'}</div></div>
</div>

<h2>Activity Timeline</h2>
<table>
  <thead><tr><th>Timestamp</th><th>Event</th><th>Type</th></tr></thead>
  <tbody>${timelineHtml}</tbody>
</table>

${hasExtractedContent ? `<h2>Extracted Content</h2><div class="content-block">${escHtml(source.extracted_content)}</div>` : ''}

${hasRawContent ? `<h2>Raw / Original Content</h2><div class="content-block mono">${escHtml(source.raw_content.length > 50000 ? source.raw_content.substring(0, 50000) + '\n\n[... truncated at 50KB ...]' : source.raw_content)}</div>` : ''}

<div class="footer">Aureum Baseline Studio — Source Audit Report — ${source.name}</div>
</body></html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      className="w-96 shrink-0 bg-card border border-border rounded-lg shadow-premium h-fit sticky top-6 hidden lg:block overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground truncate pr-2">{source.name}</h3>
        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={generateAuditPdf} title="Export Audit PDF">
            <Download className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setShowReprocess(!showReprocess)}
            title="Reprocess with different model"
            disabled={reprocessMutation.isPending}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${reprocessMutation.isPending ? 'animate-spin' : ''}`} />
          </Button>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Reprocess Bar */}
      {showReprocess && (
        <div className="p-3 border-b border-border bg-muted/30 space-y-2">
          <p className="text-[11px] font-medium text-foreground">Re-process with a different model</p>
          <Select value={reprocessModel} onValueChange={setReprocessModel}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(REPROCESS_MODELS).map(([id, label]) => (
                <SelectItem key={id} value={id} className="text-xs">
                  {label}
                  {id === source.extraction_model && ' (current)'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Button
              size="sm"
              className="h-7 text-xs flex-1 gap-1"
              onClick={() => reprocessMutation.mutate()}
              disabled={reprocessMutation.isPending}
            >
              {reprocessMutation.isPending ? (
                <><Loader2 className="h-3 w-3 animate-spin" /> Processing...</>
              ) : (
                <><RefreshCw className="h-3 w-3" /> Reprocess</>
              )}
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowReprocess(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

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
          {source.extraction_model && (
            <div>
              <span className="text-muted-foreground">AI Model</span>
              <p className="font-medium text-foreground mt-0.5 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-warning" />
                {source.extraction_model.replace('google/', '').replace('openai/', '')}
              </p>
            </div>
          )}
          {source.extraction_tokens != null && (
            <div>
              <span className="text-muted-foreground">Tokens Used</span>
              <p className="font-medium text-foreground mt-0.5 flex items-center gap-1.5">
                <Hash className="h-3.5 w-3.5 text-info" />
                {source.extraction_tokens.toLocaleString()}
              </p>
            </div>
          )}
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
          <div className="p-3 border-b border-border flex items-center justify-between gap-1">
            <span className="text-xs font-medium text-foreground shrink-0">
              {contentView === 'raw' ? 'Raw Content' : contentView === 'compare' ? 'Compare' : 'Extracted Content'}
            </span>
            <div className="flex items-center gap-1">
              {source.previous_extracted_content && (
                <Button
                  variant={contentView === 'compare' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-6 text-[10px] px-2 gap-1"
                  onClick={() => setContentView(contentView === 'compare' ? 'extracted' : 'compare')}
                >
                  <ArrowRight className="h-3 w-3" />
                  {contentView === 'compare' ? 'Single' : 'Compare'}
                </Button>
              )}
              {hasRawContent && contentView !== 'compare' && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[10px] px-2 gap-1"
                  onClick={() => setContentView(contentView === 'raw' ? 'extracted' : 'raw')}
                >
                  {contentView === 'raw' ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                  {contentView === 'raw' ? 'Extracted' : 'Raw'}
                </Button>
              )}
            </div>
          </div>

          {contentView === 'compare' && source.previous_extracted_content ? (
            <div className="flex flex-col h-[360px]">
              {/* Compare headers */}
              <div className="grid grid-cols-2 border-b border-border text-[10px] font-medium">
                <div className="p-2 bg-destructive/5 text-destructive border-r border-border flex items-center gap-1">
                  <Sparkles className="h-2.5 w-2.5" />
                  {source.previous_extraction_model
                    ? source.previous_extraction_model.replace('google/', '').replace('openai/', '')
                    : 'Previous'}
                  {source.previous_extraction_tokens != null && (
                    <span className="text-muted-foreground ml-auto">{source.previous_extraction_tokens.toLocaleString()} tok</span>
                  )}
                </div>
                <div className="p-2 bg-success/5 text-success flex items-center gap-1">
                  <Sparkles className="h-2.5 w-2.5" />
                  {source.extraction_model
                    ? source.extraction_model.replace('google/', '').replace('openai/', '')
                    : 'Current'}
                  {source.extraction_tokens != null && (
                    <span className="text-muted-foreground ml-auto">{source.extraction_tokens.toLocaleString()} tok</span>
                  )}
                </div>
              </div>
              {/* Compare content */}
              <div className="grid grid-cols-2 flex-1 overflow-hidden">
                <ScrollArea className="h-full border-r border-border">
                  <div className="p-3 text-[10px] text-foreground/80 whitespace-pre-wrap leading-relaxed">
                    {source.previous_extracted_content}
                  </div>
                </ScrollArea>
                <ScrollArea className="h-full">
                  <div className="p-3 text-[10px] text-foreground/80 whitespace-pre-wrap leading-relaxed">
                    {source.extracted_content}
                  </div>
                </ScrollArea>
              </div>
            </div>
          ) : (
            <ScrollArea className="h-[300px]">
              <div className="p-4">
                {contentView === 'raw' ? (
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
          )}
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
                  {source.extraction_model && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">AI Model</span>
                      <span className="font-medium text-foreground text-right max-w-[180px] truncate flex items-center gap-1">
                        <Sparkles className="h-3 w-3 text-warning" />
                        {source.extraction_model.replace('google/', '').replace('openai/', '')}
                      </span>
                    </div>
                  )}
                  {source.extraction_tokens != null && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Tokens Used</span>
                      <span className="font-medium text-foreground flex items-center gap-1">
                        <Hash className="h-3 w-3 text-info" />
                        {source.extraction_tokens.toLocaleString()}
                      </span>
                    </div>
                  )}
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
