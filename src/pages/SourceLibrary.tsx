import React, { useState, useCallback, useRef } from 'react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { useI18n } from '@/contexts/I18nContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import StatusBadge from '@/components/StatusBadge';
import ConfidenceScore from '@/components/ConfidenceScore';
import { TableSkeleton } from '@/components/skeletons/SkeletonPremium';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Search, Upload, Link2, FileText, Globe, X, Sparkles, Loader2, CheckCircle2, AlertCircle, Clock, Database, Cpu, Eye, EyeOff } from 'lucide-react';
import HelpButton from '@/components/HelpButton';
import { toast } from 'sonner';

const ACCEPTED_TYPES = '.pdf,.docx,.pptx,.xlsx,.csv,.json,.txt,.md,.html';

const SourceLibrary: React.FC = () => {
  const { t } = useI18n();
  const { user, session } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selected, setSelected] = useState<string[]>([]);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [urlDialogOpen, setUrlDialogOpen] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [urlLoading, setUrlLoading] = useState(false);

  // For now, use first project or allow "no project" scenario
  const { data: projects } = useQuery({
    queryKey: ['projects', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('projects').select('id, name').order('updated_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  // Auto-select first project
  React.useEffect(() => {
    if (projects?.length && !selectedProjectId) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

  // Fetch sources from DB
  const { data: sources = [], isLoading } = useQuery({
    queryKey: ['sources', user?.id, selectedProjectId],
    queryFn: async () => {
      let query = supabase.from('sources').select('*').order('added_at', { ascending: false });
      if (selectedProjectId) {
        query = query.eq('project_id', selectedProjectId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const filtered = sources.filter((s: any) => {
    if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== 'all' && s.status !== statusFilter) return false;
    if (typeFilter !== 'all' && s.type !== typeFilter) return false;
    return true;
  });

  const previewSource = previewId ? sources.find((s: any) => s.id === previewId) : null;

  const toggleSelect = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  // Upload mutation
  const uploadFile = async (file: File) => {
    if (!selectedProjectId) {
      toast.error('Selecione um projeto primeiro');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('projectId', selectedProjectId);

    const { data: { session: currentSession } } = await supabase.auth.getSession();

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-document`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${currentSession?.access_token}`,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Upload failed');
    }

    return response.json();
  };

  const handleFiles = async (files: FileList | File[]) => {
    setUploading(true);
    const fileArray = Array.from(files);
    let successCount = 0;
    let failCount = 0;

    for (const file of fileArray) {
      try {
        await uploadFile(file);
        successCount++;
      } catch (err: any) {
        failCount++;
        toast.error(`Falha ao enviar ${file.name}: ${err.message}`);
      }
    }

    setUploading(false);
    queryClient.invalidateQueries({ queryKey: ['sources'] });

    if (successCount > 0) {
      toast.success(`${successCount} arquivo(s) enviado(s) com sucesso`);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, [selectedProjectId]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => setIsDragging(false), []);

  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from('sources').delete().in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sources'] });
      setSelected([]);
      toast.success('Fontes removidas');
    },
  });

  const handleAddUrl = async () => {
    if (!urlInput.trim() || !selectedProjectId) return;
    setUrlLoading(true);

    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-url`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${currentSession?.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ url: urlInput.trim(), projectId: selectedProjectId }),
        }
      );

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to process URL');
      }

      queryClient.invalidateQueries({ queryKey: ['sources'] });
      toast.success(`URL processada com sucesso: ${result.source?.name || urlInput}`);
      setUrlInput('');
      setUrlDialogOpen(false);
    } catch (err: any) {
      toast.error(`Falha ao processar URL: ${err.message}`);
    } finally {
      setUrlLoading(false);
    }
  };

  return (
    <div
      className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-semibold text-foreground">{t.sources.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t.sources.subtitle}</p>
        </div>
        <HelpButton section="sources" />
      </div>

      {/* Drag overlay */}
      <AnimatePresence>
        {isDragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-primary/10 backdrop-blur-sm flex items-center justify-center"
          >
            <div className="bg-card border-2 border-dashed border-primary rounded-2xl p-12 text-center">
              <Upload className="h-12 w-12 text-primary mx-auto mb-3" />
              <p className="text-lg font-semibold text-foreground">{t.sources.dragDrop}</p>
              <p className="text-sm text-muted-foreground mt-1">{t.sources.dragDropSub}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Actions bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder={t.sources.search} value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>

        {projects && projects.length > 1 && (
          <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Projeto" /></SelectTrigger>
            <SelectContent>
              {projects.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder={t.sources.allStatuses} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.sources.allStatuses}</SelectItem>
            <SelectItem value="pending">{t.common.pending}</SelectItem>
            <SelectItem value="validated">{t.common.validated}</SelectItem>
            <SelectItem value="extracting">{t.common.extracting}</SelectItem>
            <SelectItem value="normalized">{t.common.normalized}</SelectItem>
            <SelectItem value="processed">{t.common.processed}</SelectItem>
            <SelectItem value="failed">{t.common.failed}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[130px]"><SelectValue placeholder={t.sources.allTypes} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.sources.allTypes}</SelectItem>
            <SelectItem value="url">URL</SelectItem>
            <SelectItem value="document">Document</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex gap-2 ml-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setUrlDialogOpen(true)}
            disabled={!selectedProjectId}
          >
            <Link2 className="h-4 w-4 mr-1.5" />{t.sources.addUrl}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || !selectedProjectId}
          >
            {uploading ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Upload className="h-4 w-4 mr-1.5" />}
            {t.sources.uploadDoc}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ACCEPTED_TYPES}
            className="hidden"
            onChange={e => e.target.files && handleFiles(e.target.files)}
          />
        </div>
      </div>

      {!selectedProjectId && projects?.length === 0 && (
        <div className="p-6 bg-muted/30 border border-border rounded-lg text-center">
          <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm font-medium text-muted-foreground">Crie um projeto primeiro para começar a adicionar fontes.</p>
        </div>
      )}

      {selected.length > 0 && (
        <div className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-lg text-sm">
          <span className="text-primary font-medium">{selected.length} {t.sources.selected}</span>
          <Button variant="destructive" size="sm" onClick={() => deleteMutation.mutate(selected)}>
            <X className="h-3 w-3 mr-1" />{t.sources.remove}
          </Button>
        </div>
      )}

      <div className="flex gap-6">
        {/* Table */}
        {isLoading ? (
          <div className="flex-1">
            <TableSkeleton rows={8} columns={6} />
          </div>
        ) : (
          <div className="flex-1 bg-card border border-border rounded-lg overflow-hidden shadow-premium">
            {filtered.length === 0 ? (
              <div
                className="p-12 text-center cursor-pointer hover:bg-muted/10 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Sparkles className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm font-medium text-muted-foreground">{t.sources.noSources}</p>
                <p className="text-xs text-muted-foreground/70 mt-1">{t.sources.noSourcesDesc}</p>
                {selectedProjectId && (
                  <p className="text-xs text-primary mt-3">{t.sources.dragDrop}</p>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="w-10 py-3 px-3"><input type="checkbox" className="rounded border-border" /></th>
                      <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">{t.sources.name}</th>
                      <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">{t.sources.type}</th>
                      <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">{t.sources.status}</th>
                      <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">{t.sources.origin}</th>
                      <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">{t.sources.confidence}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((source: any) => (
                      <tr
                        key={source.id}
                        className={`border-b border-border/50 hover:bg-muted/20 transition-colors cursor-pointer ${previewId === source.id ? 'bg-primary/5' : ''}`}
                        onClick={() => setPreviewId(source.id)}
                      >
                        <td className="py-3 px-3" onClick={e => { e.stopPropagation(); toggleSelect(source.id); }}>
                          <input type="checkbox" checked={selected.includes(source.id)} readOnly className="rounded border-border" />
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            {source.type === 'url' ? <Globe className="h-3.5 w-3.5 text-info shrink-0" /> : <FileText className="h-3.5 w-3.5 text-warning shrink-0" />}
                            <span className="font-medium text-foreground truncate max-w-[250px]">{source.name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-xs text-muted-foreground uppercase">{source.type}</td>
                        <td className="py-3 px-3"><StatusBadge status={source.status} /></td>
                        <td className="py-3 px-3 text-xs text-muted-foreground">{source.origin}</td>
                        <td className="py-3 px-3">{source.confidence > 0 ? <ConfidenceScore score={source.confidence} /> : <span className="text-xs text-muted-foreground">—</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Preview panel */}
        {previewSource && (
          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            className="w-80 shrink-0 bg-card border border-border rounded-lg p-5 shadow-premium h-fit sticky top-6 hidden lg:block"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground">{t.sources.preview}</h3>
              <button onClick={() => setPreviewId(null)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <span className="text-muted-foreground">{t.sources.name}</span>
                <p className="font-medium text-foreground mt-0.5">{previewSource.name}</p>
              </div>
              <div>
                <span className="text-muted-foreground">{t.sources.type}</span>
                <p className="font-medium text-foreground mt-0.5 uppercase">{previewSource.type}</p>
              </div>
              <div>
                <span className="text-muted-foreground">{t.sources.status}</span>
                <div className="mt-1"><StatusBadge status={previewSource.status} /></div>
              </div>
              <div>
                <span className="text-muted-foreground">{t.sources.origin}</span>
                <p className="font-medium text-foreground mt-0.5">{previewSource.origin}</p>
              </div>
              <div>
                <span className="text-muted-foreground">{t.sources.confidence}</span>
                <div className="mt-1"><ConfidenceScore score={previewSource.confidence ?? 0} size="md" /></div>
              </div>
              {previewSource.preview && (
                <div>
                  <span className="text-muted-foreground">{t.sources.preview}</span>
                  <p className="text-foreground/80 mt-0.5 leading-relaxed">{previewSource.preview}</p>
                </div>
              )}
              {previewSource.tags && previewSource.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {previewSource.tags.map((tag: string) => (
                    <span key={tag} className="px-2 py-0.5 bg-muted rounded-full text-[10px] text-muted-foreground">{tag}</span>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>

      {/* Add URL Dialog */}
      <Dialog open={urlDialogOpen} onOpenChange={setUrlDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              Add URL Source
            </DialogTitle>
            <DialogDescription>
              Enter a web page URL to automatically fetch and extract its content for analysis.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Input
              placeholder="https://docs.aws.amazon.com/..."
              value={urlInput}
              onChange={e => setUrlInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !urlLoading && handleAddUrl()}
              disabled={urlLoading}
            />
            <p className="text-[11px] text-muted-foreground">
              The page content will be fetched, extracted using AI, and saved as a processed source ready for control generation.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUrlDialogOpen(false)} disabled={urlLoading}>
              Cancel
            </Button>
            <Button onClick={handleAddUrl} disabled={urlLoading || !urlInput.trim()}>
              {urlLoading ? (
                <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Processing...</>
              ) : (
                <><Link2 className="h-4 w-4 mr-1.5" />Add & Process</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SourceLibrary;
