import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useI18n } from '@/contexts/I18nContext';
import { mockSources } from '@/data/mockData';
import StatusBadge from '@/components/StatusBadge';
import ConfidenceScore from '@/components/ConfidenceScore';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Upload, Link2, FileText, Globe, X, Sparkles } from 'lucide-react';

const SourceLibrary: React.FC = () => {
  const { t } = useI18n();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selected, setSelected] = useState<string[]>([]);
  const [previewId, setPreviewId] = useState<string | null>(null);

  const filtered = mockSources.filter(s => {
    if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== 'all' && s.status !== statusFilter) return false;
    if (typeFilter !== 'all' && s.type !== typeFilter) return false;
    return true;
  });

  const previewSource = previewId ? mockSources.find(s => s.id === previewId) : null;

  const toggleSelect = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-display font-semibold text-foreground">{t.sources.title}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t.sources.subtitle}</p>
      </div>

      {/* Actions bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder={t.sources.search} value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
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
          <Button variant="outline" size="sm"><Link2 className="h-4 w-4 mr-1.5" />{t.sources.addUrl}</Button>
          <Button variant="outline" size="sm"><Upload className="h-4 w-4 mr-1.5" />{t.sources.uploadDoc}</Button>
        </div>
      </div>

      {selected.length > 0 && (
        <div className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-lg text-sm">
          <span className="text-primary font-medium">{selected.length} {t.sources.selected}</span>
          <Button variant="destructive" size="sm"><X className="h-3 w-3 mr-1" />{t.sources.remove}</Button>
        </div>
      )}

      <div className="flex gap-6">
        {/* Table */}
        <div className="flex-1 bg-card border border-border rounded-lg overflow-hidden shadow-premium">
          {filtered.length === 0 ? (
            <div className="p-12 text-center">
              <Sparkles className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm font-medium text-muted-foreground">{t.sources.noSources}</p>
              <p className="text-xs text-muted-foreground/70 mt-1">{t.sources.noSourcesDesc}</p>
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
                  {filtered.map((source) => (
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
                <div className="mt-1"><ConfidenceScore score={previewSource.confidence} size="md" /></div>
              </div>
              <div>
                <span className="text-muted-foreground">{t.sources.preview}</span>
                <p className="text-foreground/80 mt-0.5 leading-relaxed">{previewSource.preview}</p>
              </div>
              {previewSource.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {previewSource.tags.map(tag => (
                    <span key={tag} className="px-2 py-0.5 bg-muted rounded-full text-[10px] text-muted-foreground">{tag}</span>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default SourceLibrary;
