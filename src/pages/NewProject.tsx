import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '@/contexts/I18nContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check, ChevronRight, ChevronLeft, Sparkles, Cpu, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Locale } from '@/types';

const steps = ['step1', 'step2', 'step3', 'step4', 'step5'] as const;

const NewProject: React.FC = () => {
  const { t } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [current, setCurrent] = useState(0);
  const [saving, setSaving] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '', technology: '', vendor: '', version: '', category: '', outputLanguage: 'en' as Locale, notes: '', tags: '',
  });

  const stepLabels = [t.project.step1, t.project.step2, t.project.step3, t.project.step4, t.project.step5];

  const updateForm = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl lg:text-3xl font-display font-semibold text-foreground">{t.project.new}</h1>
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
            <div className="space-y-6">
              <p className="text-sm text-muted-foreground">{t.sources.subtitle}</p>
              {/* URL input */}
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input placeholder={t.sources.urlPlaceholder} className="flex-1" />
                  <Button variant="outline">{t.sources.addUrl}</Button>
                </div>
              </div>
              {/* Upload area */}
              <div className="border-2 border-dashed border-border rounded-lg p-10 text-center hover:border-primary/40 transition-colors cursor-pointer">
                <div className="flex flex-col items-center gap-2">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  <p className="text-sm font-medium text-foreground">{t.sources.dragDrop}</p>
                  <p className="text-xs text-muted-foreground">{t.sources.dragDropSub}</p>
                </div>
              </div>
            </div>
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
          <Button onClick={() => setCurrent(current + 1)} className="gold-gradient text-primary-foreground hover:opacity-90">
            {t.project.next}<ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button className="gold-gradient text-primary-foreground hover:opacity-90">
            {t.project.save}
          </Button>
        )}
      </div>
    </div>
  );
};

export default NewProject;

// Fix: need to import Cpu at top
