import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '@/contexts/I18nContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import HelpButton from '@/components/HelpButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check, ChevronRight, ChevronLeft, ChevronDown, ChevronUp, Sparkles, Cpu, Loader2, Globe, X, Upload, FileText, AlertCircle, Eye, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import type { Locale } from '@/types';
import { aiConfigService } from '@/services/aiService';

const steps = ['step1', 'step2', 'step3', 'step4', 'step5'] as const;

const ACCEPTED_TYPES = '.pdf,.docx,.pptx,.xlsx,.csv,.json,.txt,.md,.html';
const ACCEPTED_EXTENSIONS = ACCEPTED_TYPES.split(',');
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB in bytes
const MAX_FILE_SIZE_MB = 20;

// Maps user-facing model names to Lovable AI gateway model IDs
const LOVABLE_MODEL_MAP: Record<string, string> = {
  'gemini-3-flash (padrão)': 'google/gemini-3-flash-preview',
  'gemini-2.5-pro': 'google/gemini-2.5-pro',
  'gemini-2.5-flash': 'google/gemini-2.5-flash',
  'gpt-5': 'openai/gpt-5',
  'gpt-5-mini': 'openai/gpt-5-mini',
};

function resolveModelId(providerConfig: any): string {
  if (!providerConfig) return 'google/gemini-2.5-flash';
  const selectedModel = providerConfig.selected_model || '';
  if (providerConfig.provider_id === 'lovable_ai') {
    return LOVABLE_MODEL_MAP[selectedModel] || 'google/gemini-2.5-flash';
  }
  return 'google/gemini-2.5-flash';
}

function resolveMaxTokens(providerConfig: any): number {
  const extra = providerConfig?.extra_config;
  if (extra && typeof extra === 'object' && (extra as any).max_tokens) {
    return Number((extra as any).max_tokens) || 65000;
  }
  return 65000;
}

type SourceItem = {
  id: string;
  name: string;
  status: 'pending' | 'processing' | 'done' | 'error' | 'oversized';
  type: 'url' | 'file';
  progress?: number;
  preview?: string;
  showPreview?: boolean;
  fileSize?: number;
  errorMessage?: string;
  originalUrl?: string;
  originalFile?: File;
};

const SourceSelectionStep: React.FC<{ projectId: string | null; t: any; onSourceCountChange?: (count: number) => void }> = ({ projectId, t, onSourceCountChange }) => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [urlInput, setUrlInput] = useState('');
  const [addedSources, setAddedSources] = useState<SourceItem[]>([]);
  const [loadingUrl, setLoadingUrl] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const doneCount = addedSources.filter(s => s.status === 'done').length;
    onSourceCountChange?.(doneCount);
  }, [addedSources, onSourceCountChange]);

  const handleAddUrl = async () => {
    const url = urlInput.trim();
    if (!url) { toast.error(t.sources.urlPlaceholder); return; }
    if (!projectId) { toast.error('Crie o projeto primeiro (passo 1)'); return; }

    const itemId = `url-${Date.now()}`;
    setLoadingUrl(true);
    setAddedSources(prev => [...prev, { id: itemId, name: url, status: 'processing', type: 'url', originalUrl: url }]);
    setUrlInput('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await supabase.functions.invoke('parse-url', {
        body: { url, projectId },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });

      if (resp.error) throw new Error(resp.error.message);

      setAddedSources(prev => prev.map(s => s.id === itemId
        ? { ...s, status: 'done', name: resp.data?.source?.name || url, preview: resp.data?.source?.preview || '' }
        : s
      ));
      toast.success(t.sources.urlAdded || 'URL adicionada com sucesso');
    } catch (err: any) {
      setAddedSources(prev => prev.map(s => s.id === itemId ? { ...s, status: 'error' } : s));
      toast.error(`Erro: ${err.message}`);
    } finally {
      setLoadingUrl(false);
    }
  };

  const uploadFile = (file: File, itemId: string): Promise<any> => {
    return new Promise(async (resolve, reject) => {
      if (!projectId) {
        reject(new Error('Crie o projeto primeiro (passo 1)'));
        return;
      }

      const defaultConfig = await aiConfigService.getDefault();
      const model = resolveModelId(defaultConfig);
      const maxTokens = resolveMaxTokens(defaultConfig);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('projectId', projectId);
      formData.append('model', model);
      formData.append('maxTokens', String(maxTokens));

      const { data: { session } } = await supabase.auth.getSession();

      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-document`);
      xhr.setRequestHeader('Authorization', `Bearer ${session?.access_token}`);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 100);
          setAddedSources(prev => prev.map(s => s.id === itemId ? { ...s, progress: pct } : s));
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            resolve(JSON.parse(xhr.responseText));
          } catch {
            resolve({});
          }
        } else {
          try {
            const err = JSON.parse(xhr.responseText);
            reject(new Error(err.error || 'Upload failed'));
          } catch {
            reject(new Error('Upload failed'));
          }
        }
      };

      xhr.onerror = () => reject(new Error('Network error'));
      xhr.send(formData);
    });
  };

  const handleFiles = async (files: FileList | File[]) => {
    if (!projectId) {
      toast.error('Crie o projeto primeiro (passo 1)');
      return;
    }

    setUploading(true);
    const fileArray = Array.from(files);

    // Validate file sizes and add to list
    const newItems: SourceItem[] = fileArray.map((f, i) => {
      const isOversized = f.size > MAX_FILE_SIZE;
      return {
        id: `file-${Date.now()}-${i}`,
        name: f.name,
        status: isOversized ? 'oversized' : 'processing' as const,
        type: 'file' as const,
        fileSize: f.size,
        errorMessage: isOversized ? `Arquivo excede ${MAX_FILE_SIZE_MB}MB` : undefined,
        originalFile: f,
      };
    });
    
    setAddedSources(prev => [...prev, ...newItems]);

    // Show toast for oversized files
    const oversizedFiles = newItems.filter(item => item.status === 'oversized');
    if (oversizedFiles.length > 0) {
      toast.error(`${oversizedFiles.length} arquivo(s) excedem o limite de ${MAX_FILE_SIZE_MB}MB`);
    }

    // Process only valid files
    const validItems = newItems.filter(item => item.status !== 'oversized');
    
    for (let i = 0; i < validItems.length; i++) {
      const itemId = validItems[i].id;
      const fileIndex = fileArray.findIndex(f => f.name === validItems[i].name && f.size === validItems[i].fileSize);
      const file = fileArray[fileIndex];
      
      try {
        const result = await uploadFile(file, itemId);
        setAddedSources(prev => prev.map(s => s.id === itemId
          ? { ...s, status: 'done', name: result?.source?.name || file.name, preview: result?.source?.preview || '' }
          : s
        ));
      } catch (err: any) {
        setAddedSources(prev => prev.map(s => s.id === itemId ? { ...s, status: 'error', errorMessage: err.message } : s));
        toast.error(`Falha: ${file.name} — ${err.message}`);
      }
    }

    setUploading(false);
    const doneCount = validItems.length;
    if (doneCount > 0) toast.success(`${doneCount} arquivo(s) enviado(s)`);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, [projectId]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => setIsDragging(false), []);

  const removeSource = (id: string) => setAddedSources(prev => prev.filter(s => s.id !== id));

  const reprocessSource = async (item: SourceItem) => {
    if (!projectId) { toast.error('Crie o projeto primeiro (passo 1)'); return; }

    // Reset status to processing
    setAddedSources(prev => prev.map(s => s.id === item.id ? { ...s, status: 'processing' as const, progress: undefined, errorMessage: undefined } : s));

    if (item.type === 'url' && item.originalUrl) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const resp = await supabase.functions.invoke('parse-url', {
          body: { url: item.originalUrl, projectId },
          headers: { Authorization: `Bearer ${session?.access_token}` },
        });
        if (resp.error) throw new Error(resp.error.message);
        setAddedSources(prev => prev.map(s => s.id === item.id
          ? { ...s, status: 'done' as const, name: resp.data?.source?.name || item.originalUrl!, preview: resp.data?.source?.preview || '' }
          : s
        ));
        toast.success('URL reprocessada com sucesso');
      } catch (err: any) {
        setAddedSources(prev => prev.map(s => s.id === item.id ? { ...s, status: 'error' as const, errorMessage: err.message } : s));
        toast.error(`Erro ao reprocessar: ${err.message}`);
      }
    } else if (item.type === 'file' && item.originalFile) {
      try {
        const result = await uploadFile(item.originalFile, item.id);
        setAddedSources(prev => prev.map(s => s.id === item.id
          ? { ...s, status: 'done' as const, name: result?.source?.name || item.originalFile!.name, preview: result?.source?.preview || '' }
          : s
        ));
        toast.success('Arquivo reprocessado com sucesso');
      } catch (err: any) {
        setAddedSources(prev => prev.map(s => s.id === item.id ? { ...s, status: 'error' as const, errorMessage: err.message } : s));
        toast.error(`Erro ao reprocessar: ${err.message}`);
      }
    } else {
      toast.error('Não é possível reprocessar — dados originais não disponíveis');
    }
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">{t.sources.subtitle}</p>
      {/* URL input */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <Input
            placeholder={t.sources.urlPlaceholder}
            className="flex-1"
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddUrl()}
            disabled={loadingUrl}
          />
          <Button variant="outline" onClick={handleAddUrl} disabled={loadingUrl || !urlInput.trim()}>
            {loadingUrl ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Globe className="h-4 w-4 mr-1" />}
            {t.sources.addUrl}
          </Button>
        </div>
      </div>

      {/* Upload area */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-10 text-center transition-colors cursor-pointer ${
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/40'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES}
          multiple
          className="hidden"
          onChange={e => e.target.files && handleFiles(e.target.files)}
        />
        <div className="flex flex-col items-center gap-2">
          <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
            uploading ? 'bg-primary/10' : 'bg-muted'
          }`}>
            {uploading
              ? <Loader2 className="h-5 w-5 text-primary animate-spin" />
              : <Upload className="h-5 w-5 text-primary" />
            }
          </div>
          <p className="text-sm font-medium text-foreground">
            {uploading ? (t.sources.uploading || 'Enviando...') : t.sources.dragDrop}
          </p>
          <p className="text-xs text-muted-foreground">{t.sources.dragDropSub}</p>
          <p className="text-[10px] text-muted-foreground/70 px-3 py-1 bg-muted/50 rounded-full mt-1">
            Máximo {MAX_FILE_SIZE_MB}MB por arquivo
          </p>
        </div>
      </div>

      {/* Added sources list */}
      {addedSources.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            {t.sources.added || 'Fontes adicionadas'} ({addedSources.length})
          </p>
          {addedSources.map((item) => (
            <div key={item.id} className="space-y-1">
              <div className={`flex items-center gap-2 px-3 py-2 rounded-md border text-sm ${
                item.status === 'oversized' 
                  ? 'bg-destructive/10 border-destructive/30' 
                  : 'bg-muted/40 border-border'
              }`}>
                {item.status === 'processing' && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary shrink-0" />}
                {item.status === 'done' && <Check className="h-3.5 w-3.5 text-success shrink-0" />}
                {item.status === 'error' && <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0" />}
                {item.status === 'oversized' && <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0" />}
                {item.type === 'file'
                  ? <FileText className={`h-3.5 w-3.5 shrink-0 ${item.status === 'oversized' ? 'text-destructive' : 'text-muted-foreground'}`} />
                  : <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                }
                <div className="flex-1 min-w-0">
                  <span className={`truncate block ${item.status === 'oversized' ? 'text-destructive' : ''}`}>
                    {item.name}
                  </span>
                  {item.type === 'file' && item.fileSize !== undefined && (
                    <span className="text-[10px] text-muted-foreground/70 block">
                      {(item.fileSize / (1024 * 1024)).toFixed(2)} MB
                      {item.status === 'oversized' && (
                        <span className="text-destructive ml-1">— Limite: {MAX_FILE_SIZE_MB}MB</span>
                      )}
                    </span>
                  )}
                </div>
                {item.status === 'processing' && item.progress !== undefined && item.progress < 100 && (
                  <span className="text-[10px] font-medium text-primary shrink-0">{item.progress}%</span>
                )}
                {item.status === 'processing' && item.progress === 100 && (
                  <span className="text-[10px] font-medium text-muted-foreground shrink-0">Processando…</span>
                )}
                {item.status === 'done' && item.preview && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setAddedSources(prev => prev.map(s => s.id === item.id ? { ...s, showPreview: !s.showPreview } : s));
                    }}
                    className="text-muted-foreground hover:text-primary transition-colors"
                    title="Preview"
                  >
                    {item.showPreview ? <ChevronUp className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                )}
                <button 
                  onClick={(e) => { e.stopPropagation(); removeSource(item.id); }} 
                  className="text-muted-foreground hover:text-destructive"
                  title={item.errorMessage || 'Remover'}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              {item.status === 'processing' && item.type === 'file' && item.progress !== undefined && (
                <div className="h-1 w-full bg-secondary rounded-full overflow-hidden mx-0">
                  <div
                    className="h-full bg-primary transition-all duration-300 ease-out rounded-full"
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
              )}
              {item.showPreview && item.preview && (
                <div className="mx-1 px-3 py-2 bg-muted/20 border border-border/50 rounded text-xs text-muted-foreground leading-relaxed max-h-32 overflow-y-auto whitespace-pre-wrap">
                  {item.preview}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const NewProject: React.FC = () => {
  const { t } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [current, setCurrent] = useState(0);
  const [saving, setSaving] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [sourceCount, setSourceCount] = useState(0);
  const [form, setForm] = useState({
    name: '', technology: '', vendor: '', version: '', category: '', outputLanguage: 'en' as Locale, notes: '', tags: '',
  });

  const stepLabels = [t.project.step1, t.project.step2, t.project.step3, t.project.step4, t.project.step5];

  const updateForm = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl lg:text-3xl font-display font-semibold text-foreground">{t.project.new}</h1>
        <HelpButton section="new-project" />
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-1">
        {stepLabels.map((label, i) => (
          <React.Fragment key={i}>
            <button
              onClick={() => setCurrent(i)}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium transition-all ${
                i === current ? 'bg-primary/10 text-primary border border-primary/20' :
                i < current ? 'text-success' : 'text-muted-foreground'
              }`}
            >
              <div className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                i < current ? 'bg-success text-success-foreground' :
                i === current ? 'gold-gradient text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                {i < current ? <Check className="h-3 w-3" /> : i + 1}
              </div>
              <span className="hidden sm:inline">{label}</span>
              {i === 1 && sourceCount > 0 && (
                <span className="ml-1 h-4 min-w-[16px] px-1 rounded-full bg-primary/20 text-primary text-[10px] font-bold flex items-center justify-center">
                  {sourceCount}
                </span>
              )}
            </button>
            {i < stepLabels.length - 1 && <ChevronRight className="h-3 w-3 text-border shrink-0" />}
          </React.Fragment>
        ))}
      </div>

      {/* Step content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.25 }}
          className="bg-card border border-border rounded-lg p-6 lg:p-8 shadow-premium"
        >
          {current === 0 && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">{t.project.name}</label>
                  <Input placeholder={t.project.namePlaceholder} value={form.name} onChange={e => updateForm('name', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">{t.project.technology}</label>
                  <Input placeholder={t.project.technologyPlaceholder} value={form.technology} onChange={e => updateForm('technology', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">{t.project.vendor}</label>
                  <Input placeholder={t.project.vendorPlaceholder} value={form.vendor} onChange={e => updateForm('vendor', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">{t.project.version}</label>
                  <Input placeholder={t.project.versionPlaceholder} value={form.version} onChange={e => updateForm('version', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">{t.project.category}</label>
                  <Select value={form.category} onValueChange={v => updateForm('category', v)}>
                    <SelectTrigger><SelectValue placeholder={t.project.categoryPlaceholder} /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(t.categories).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">{t.project.outputLanguage}</label>
                  <Select value={form.outputLanguage} onValueChange={v => updateForm('outputLanguage', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English (US)</SelectItem>
                      <SelectItem value="pt">Português (BR)</SelectItem>
                      <SelectItem value="es">Español (ES)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">{t.project.tags}</label>
                <Input placeholder={t.project.tagsPlaceholder} value={form.tags} onChange={e => updateForm('tags', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">{t.project.notes}</label>
                <Textarea placeholder={t.project.notesPlaceholder} value={form.notes} onChange={e => updateForm('notes', e.target.value)} rows={3} />
              </div>
            </div>
          )}

          {current === 1 && (
            <SourceSelectionStep projectId={projectId} t={t} onSourceCountChange={setSourceCount} />
          )}



          {current === 2 && (
            <div className="space-y-5">
              <p className="text-sm text-muted-foreground">{t.rules.subtitle}</p>
              <div className="grid gap-4">
                {[t.rules.template, t.rules.controlStructure, t.rules.writingStandards, t.rules.consolidation, t.rules.deduplication, t.rules.criticality, t.rules.frameworks].map((label) => (
                  <div key={label} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border">
                    <span className="text-sm font-medium text-foreground">{label}</span>
                    <Button variant="outline" size="sm">{t.common.edit}</Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {current === 3 && (
            <div className="space-y-6 text-center py-8">
              <div className="h-16 w-16 rounded-full gold-gradient mx-auto flex items-center justify-center animate-pulse-gold">
                <Cpu className="h-8 w-8 text-primary-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-display font-semibold text-foreground">{t.workspace.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{t.workspace.subtitle}</p>
              </div>
              <Button className="gold-gradient text-primary-foreground hover:opacity-90">
                <Sparkles className="h-4 w-4 mr-2" />{t.workspace.startPipeline}
              </Button>
            </div>
          )}

          {current === 4 && (
            <div className="space-y-6 text-center py-8">
              <div className="h-16 w-16 rounded-full bg-success/10 mx-auto flex items-center justify-center">
                <Check className="h-8 w-8 text-success" />
              </div>
              <div>
                <h3 className="text-lg font-display font-semibold text-foreground">{t.project.step5}</h3>
                <p className="text-sm text-muted-foreground mt-1">47 {t.common.items}</p>
              </div>
              <Button className="gold-gradient text-primary-foreground hover:opacity-90">
                {t.project.generate}
              </Button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setCurrent(Math.max(0, current - 1))} disabled={current === 0}>
          <ChevronLeft className="h-4 w-4 mr-1" />{t.project.previous}
        </Button>
        {current < 4 ? (
          <Button
            onClick={async () => {
              if (current === 0 && !projectId) {
                if (!form.name || !form.technology) {
                  toast.error('Preencha nome e tecnologia');
                  return;
                }
                setSaving(true);
                try {
                  const { data, error } = await supabase.from('projects').insert({
                    name: form.name,
                    technology: form.technology,
                    vendor: form.vendor || null,
                    version: form.version || null,
                    category: form.category || null,
                    output_language: form.outputLanguage,
                    notes: form.notes || null,
                    tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
                    user_id: user!.id,
                    status: 'draft',
                  }).select('id').single();
                  if (error) throw error;
                  setProjectId(data.id);
                  toast.success('Projeto criado com sucesso');
                } catch (err: any) {
                  toast.error(`Erro ao criar projeto: ${err.message}`);
                  setSaving(false);
                  return;
                }
                setSaving(false);
              }
              if (current === 1 && sourceCount === 0) {
                toast.error('Adicione pelo menos uma fonte antes de avançar');
                return;
              }
              setCurrent(current + 1);
            }}
            className="gold-gradient text-primary-foreground hover:opacity-90"
            disabled={saving}
          >
            {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
            {t.project.next}<ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button
            className="gold-gradient text-primary-foreground hover:opacity-90"
            onClick={() => navigate('/sources')}
          >
            {t.project.save}
          </Button>
        )}
      </div>
    </div>
  );
};

export default NewProject;

// Fix: need to import Cpu at top
