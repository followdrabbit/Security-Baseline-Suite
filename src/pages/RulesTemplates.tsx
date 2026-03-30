import React, { useState, useMemo, useRef } from 'react';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip, Legend,
} from 'recharts';
import { useI18n } from '@/contexts/I18nContext';
import InfoTooltip from '@/components/InfoTooltip';
import HelpButton from '@/components/HelpButton';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useRuleValues } from '@/hooks/useRuleValues';
import { useTemplateVersions, TemplateVersion, MAX_TEMPLATE_VERSIONS } from '@/hooks/useTemplateVersions';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import VersionComparePanel from '@/components/VersionComparePanel';
import {
  Settings2, FileText, PenLine, Layers, Copy, AlertTriangle, BarChart3, GitBranch,
  BookOpen, Globe, Brain, Save, FolderOpen, Crosshair, Search, RotateCcw,
  ChevronLeft, ChevronRight, List, Check, Undo2, Download, Upload, History, Trash2, Clock, ArrowLeftRight, CopyPlus, Pencil,
  Shield, Scale, Zap,
} from 'lucide-react';

interface RuleSection {
  id: string;
  icon: React.ElementType;
  labelKey: string;
  tooltipKey?: string;
  defaultContent: string;
}

const DEFAULT_SECTIONS: RuleSection[] = [
  { id: 'aiStrictness', icon: Brain, labelKey: 'aiStrictness', tooltipKey: 'aiStrictness', defaultContent: 'balanced' },
  { id: 'template', icon: FileText, labelKey: 'template', defaultContent: 'Enterprise Standard Template — Comprehensive structure with ID, Title, Description, Applicability, Risk, Criticality, Automation, References, and Framework Mappings.' },
  { id: 'structure', icon: Layers, labelKey: 'controlStructure', defaultContent: 'Each control must contain: unique ID (format: TECH-SEC-NNN), descriptive title, detailed description, applicability scope, security risk assessment, criticality level, automation guidance, references, and framework mappings.' },
  { id: 'writing', icon: PenLine, labelKey: 'writingStandards', defaultContent: 'Professional tone. Imperative mood for requirements. Specific and actionable language. Avoid ambiguous terms. Maximum 3 paragraphs per description. Use active voice.' },
  { id: 'consolidation', icon: Settings2, labelKey: 'consolidation', defaultContent: 'Group related evidence by topic similarity > 0.80. Consolidate controls addressing the same security concern. Preserve unique aspects from each source.' },
  { id: 'dedup', icon: Copy, labelKey: 'deduplication', tooltipKey: 'deduplication', defaultContent: 'Semantic similarity threshold: 0.85 triggers merge review. Title similarity threshold: 0.90 auto-merge. Preserve the most comprehensive description. Union of all references and mappings.' },
  { id: 'criticality', icon: AlertTriangle, labelKey: 'criticality', tooltipKey: 'criticality', defaultContent: 'Critical: Exploitable vulnerability with high impact. High: Significant risk with moderate exploitability. Medium: Moderate risk or limited exploitability. Low: Minor risk. Informational: Best practice.' },
  { id: 'risk', icon: BarChart3, labelKey: 'risk', defaultContent: 'Assess using CIA triad (Confidentiality, Integrity, Availability). Consider business impact, regulatory implications, and threat landscape. Score: (Exploitability × Impact) / Mitigating Controls.' },
  { id: 'frameworks', icon: GitBranch, labelKey: 'frameworks', tooltipKey: 'frameworkMapping', defaultContent: 'Map to: CIS Benchmarks, NIST 800-53 Rev. 5, ISO 27001:2022, SOC 2 Type II, PCI DSS v4.0, CSA CCM v4. Use official control IDs. Map only when direct correlation exists.' },
  { id: 'references', icon: BookOpen, labelKey: 'references', defaultContent: 'Include official vendor documentation, CIS benchmarks, NIST publications, and relevant security advisories. Each control must have at least 1 reference. Prefer primary sources.' },
  { id: 'language', icon: Globe, labelKey: 'outputLanguage', tooltipKey: 'outputLanguage', defaultContent: 'Generate baseline content in the selected output language. Technical terms may remain in English when no standard translation exists.' },
  { id: 'threatModeling', icon: Crosshair, labelKey: 'threatModeling', tooltipKey: 'threatModeling', defaultContent: 'STRIDE-based threat analysis per control. Each threat scenario must include: threat name, STRIDE category (Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege), attack vector description, threat agent identification, preconditions for exploitation, impact assessment, likelihood rating (Very High/High/Medium/Low/Very Low), specific mitigations, and residual risk evaluation. Minimum 1 threat scenario per control. Align threat likelihood with control criticality level.' },
];

const DEFAULT_VALUES: Record<string, string> = DEFAULT_SECTIONS.reduce((acc, s) => {
  acc[s.id] = s.defaultContent;
  return acc;
}, {} as Record<string, string>);

/* ── Sidebar TOC ── */
const RulesToc: React.FC<{
  items: { id: string; icon: React.ElementType; label: string; isModified: boolean }[];
  activeId: string;
  onSelect: (id: string) => void;
  search: string;
}> = ({ items, activeId, onSelect, search }) => {
  const activeIndex = items.findIndex(i => i.id === activeId);
  return (
    <nav className="hidden xl:block w-60 shrink-0">
      <div className="sticky top-6 space-y-1">
        <div className="flex items-center gap-2 mb-4 px-3">
          <List className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold text-foreground uppercase tracking-wider">Sections</span>
        </div>
        <div className="space-y-0.5 max-h-[calc(100vh-180px)] overflow-y-auto">
          {items.map(item => {
            const isActive = activeId === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelect(item.id)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all text-xs relative group",
                  isActive
                    ? "bg-primary/10 text-primary font-semibold shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                )}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-full" />
                )}
                <item.icon className={cn("h-3.5 w-3.5 shrink-0", isActive && "text-primary")} />
                <span className="truncate flex-1">{item.label}</span>
                {item.isModified && (
                  <div className="h-1.5 w-1.5 rounded-full bg-warning shrink-0" title="Modified" />
                )}
              </button>
            );
          })}
        </div>
        {activeId && (
          <div className="flex items-center gap-2 pt-4 px-3 border-t border-border/50 mt-4">
            <button
              onClick={() => activeIndex > 0 && onSelect(items[activeIndex - 1].id)}
              disabled={activeIndex <= 0}
              className="flex-1 flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed py-1.5 rounded-md hover:bg-muted/50 transition-colors"
            >
              <ChevronLeft className="h-3 w-3" /> Prev
            </button>
            <span className="text-[10px] text-muted-foreground tabular-nums">{activeIndex + 1}/{items.length}</span>
            <button
              onClick={() => activeIndex < items.length - 1 && onSelect(items[activeIndex + 1].id)}
              disabled={activeIndex >= items.length - 1}
              className="flex-1 flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed py-1.5 rounded-md hover:bg-muted/50 transition-colors"
            >
              Next <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};

/* ── AI Strictness Section ── */
const STRICTNESS_ICONS: Record<string, React.FC<{ className?: string }>> = {
  conservative: (props) => <Shield {...props} />,
  balanced: (props) => <Scale {...props} />,
  aggressive: (props) => <Zap {...props} />,
};

const STRICTNESS_METRICS: Record<string, { precision: number; coverage: number; reviewEffort: number; estimatedControls: [number, number] }> = {
  conservative: { precision: 95, coverage: 55, reviewEffort: 20, estimatedControls: [15, 30] },
  balanced:     { precision: 78, coverage: 78, reviewEffort: 50, estimatedControls: [30, 60] },
  aggressive:   { precision: 55, coverage: 95, reviewEffort: 85, estimatedControls: [55, 100] },
};

const ImpactBar: React.FC<{ label: string; tooltip?: string; value: number; isActive: boolean }> = ({ label, tooltip, value, isActive }) => (
  <div className="flex items-center gap-2">
    <span className={cn("text-[10px] w-[72px] shrink-0 text-right inline-flex items-center justify-end gap-0.5 transition-colors duration-300", isActive ? 'text-foreground/60' : 'text-muted-foreground/50')}>
      {label}
      {tooltip && <InfoTooltip content={tooltip} className="h-2.5 w-2.5 ml-0.5" />}
    </span>
    <div className="flex-1 h-1.5 rounded-full bg-muted/60 overflow-hidden">
      <motion.div
        className={cn("h-full rounded-full", isActive ? 'bg-primary' : 'bg-muted-foreground/30')}
        initial={false}
        animate={{ width: `${value}%` }}
        transition={{ type: 'spring', stiffness: 120, damping: 18, mass: 0.8 }}
      />
    </div>
    <motion.span
      key={value}
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn("text-[10px] w-7 tabular-nums transition-colors duration-300", isActive ? 'text-foreground/60' : 'text-muted-foreground/50')}
    >
      {value}%
    </motion.span>
  </div>
);

const AIStrictnessSection: React.FC<{
  value: string;
  defaultValue: string;
  onChange: (v: string) => void;
  onRestore: () => void;
  t: any;
}> = ({ value, defaultValue, onChange, onRestore, t }) => {
  const isModified = value !== defaultValue;
  const rules = t.rules as Record<string, string>;
  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        {rules.aiStrictnessDesc}
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {(['conservative', 'balanced', 'aggressive'] as const).map(level => {
          const isActive = value === level;
          const Icon = STRICTNESS_ICONS[level];
          const metrics = STRICTNESS_METRICS[level];
          return (
            <button
              key={level}
              onClick={() => onChange(level)}
              className={cn(
                "relative flex flex-col items-start gap-2 p-4 rounded-xl text-left transition-all border-2",
                isActive
                  ? 'border-primary bg-primary/5 shadow-md'
                  : 'border-border bg-muted/30 hover:border-muted-foreground/30 hover:bg-muted/50'
              )}
            >
              {/* Tag badge */}
              <span className={cn(
                "absolute top-2.5 right-2.5 text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide",
                isActive
                  ? 'bg-primary/15 text-primary'
                  : 'bg-muted text-muted-foreground'
              )}>
                {rules[`${level}Tag`]}
              </span>

              {/* Icon + title */}
              <div className="flex items-center gap-2">
                <div className={cn(
                  "flex items-center justify-center h-8 w-8 rounded-lg",
                  isActive ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
                )}>
                  <Icon className="h-4 w-4" />
                </div>
                <span className={cn(
                  "text-sm font-semibold",
                  isActive ? 'text-foreground' : 'text-muted-foreground'
                )}>
                  {rules[level]}
                </span>
              </div>

              {/* Description */}
              <p className={cn(
                "text-xs leading-relaxed",
                isActive ? 'text-foreground/80' : 'text-muted-foreground/70'
              )}>
                {rules[`${level}Desc`]}
              </p>

              {/* Estimated controls */}
              <div className={cn(
                "w-full flex items-center justify-center gap-1.5 mt-1 pt-2 border-t border-border/50",
              )}>
                <Layers className={cn("h-3 w-3", isActive ? 'text-primary' : 'text-muted-foreground/50')} />
                <motion.span
                  key={`${level}-controls`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className={cn("text-xs font-semibold tabular-nums", isActive ? 'text-foreground' : 'text-muted-foreground/60')}
                >
                  {metrics.estimatedControls[0]}–{metrics.estimatedControls[1]}
                </motion.span>
                <span className={cn("text-[10px]", isActive ? 'text-foreground/60' : 'text-muted-foreground/40')}>
                  {rules.estimatedControls}
                </span>
              </div>

              {/* Impact bars */}
              <div className="w-full space-y-1 mt-1 pt-2 border-t border-border/50">
                <ImpactBar label={rules.precision} tooltip={rules.precisionTip} value={metrics.precision} isActive={isActive} />
                <ImpactBar label={rules.coverage} tooltip={rules.coverageTip} value={metrics.coverage} isActive={isActive} />
                <ImpactBar label={rules.reviewEffort} tooltip={rules.reviewEffortTip} value={metrics.reviewEffort} isActive={isActive} />
              </div>

              {/* Active indicator */}
              {isActive && (
                <div className="flex items-center gap-1 mt-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                  <span className="text-[10px] font-medium text-primary uppercase tracking-wider">Active</span>
                </div>
              )}
            </button>
          );
        })}
      </div>
      {isModified && (
        <button onClick={onRestore} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <Undo2 className="h-3 w-3" /> {rules.restoreDefaults}
        </button>
      )}
    </div>
  );
};

/* ── Generic Rule Section ── */
const RuleContentSection: React.FC<{
  value: string;
  defaultValue: string;
  onChange: (v: string) => void;
  onRestore: () => void;
  t: any;
}> = ({ value, defaultValue, onChange, onRestore, t }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const isModified = value !== defaultValue;

  const handleEdit = () => { setDraft(value); setEditing(true); };
  const handleSave = () => { onChange(draft); setEditing(false); toast.success(t.rules.saved); };
  const handleCancel = () => { setDraft(value); setEditing(false); };

  return (
    <div className="space-y-4">
      {isModified && (
        <Badge variant="outline" className="text-[10px] bg-warning/10 text-warning border-warning/30">
          {t.rules.customValue}
        </Badge>
      )}
      {editing ? (
        <>
          <Textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            rows={6}
            className="text-sm font-mono bg-muted/30 focus:bg-background transition-colors"
            autoFocus
          />
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleSave} className="gold-gradient text-primary-foreground hover:opacity-90">
              <Check className="h-3.5 w-3.5 mr-1.5" /> {t.rules.saveValue}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleCancel}>{t.rules.cancelEdit}</Button>
          </div>
        </>
      ) : (
        <>
          <div className="bg-muted/30 border border-border/50 rounded-lg p-4 text-sm leading-relaxed text-foreground whitespace-pre-wrap">
            {value}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleEdit}>
              <PenLine className="h-3.5 w-3.5 mr-1.5" /> {t.rules.editValue}
            </Button>
            {isModified && (
              <Button variant="ghost" size="sm" onClick={onRestore} className="text-muted-foreground">
                <Undo2 className="h-3.5 w-3.5 mr-1.5" /> {t.rules.restoreDefaults}
              </Button>
            )}
          </div>
          {isModified && (
            <details className="text-xs">
              <summary className="text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                {t.rules.defaultValue}
              </summary>
              <div className="mt-2 bg-muted/20 border border-border/30 rounded-md p-3 text-muted-foreground whitespace-pre-wrap">
                {defaultValue}
              </div>
            </details>
          )}
        </>
      )}
    </div>
  );
};

/* ── Main Page ── */
const RulesTemplates: React.FC = () => {
  const { t } = useI18n();
  const [search, setSearch] = useState('');
  const [activeSection, setActiveSection] = useState(DEFAULT_SECTIONS[0].id);
  const { values, loading, saving, updateValue, restoreOne, restoreAll } = useRuleValues({ defaults: DEFAULT_VALUES });
  const { versions, loading: versionsLoading, saveVersion, deleteVersion, renameVersion } = useTemplateVersions();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importPreview, setImportPreview] = useState<{ data: Record<string, string>; count: number; overwriteCount: number } | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [saveLabel, setSaveLabel] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [restorePreview, setRestorePreview] = useState<TemplateVersion | null>(null);
  const [duplicateTarget, setDuplicateTarget] = useState<TemplateVersion | null>(null);
  const [duplicateLabel, setDuplicateLabel] = useState('');
  const [renameTarget, setRenameTarget] = useState<TemplateVersion | null>(null);
  const [renameLabel, setRenameLabel] = useState('');
  const [compareSelection, setCompareSelection] = useState<TemplateVersion[]>([]);

  const handleExportJSON = () => {
    const onlyCustom: Record<string, string> = {};
    DEFAULT_SECTIONS.forEach(s => {
      if (values[s.id] !== s.defaultContent) {
        onlyCustom[s.id] = values[s.id];
      }
    });
    const payload = {
      _type: 'aureum-rules-template',
      _version: 1,
      exportedAt: new Date().toISOString(),
      allValues: values,
      customValues: onlyCustom,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rules-template-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Template exported');
  };

  // Zod schema for imported template JSON
  const templateSchema = useMemo(() => {
    const knownKeys = Object.keys(DEFAULT_VALUES);
    const ruleValueSchema = z.string().min(1, 'Rule value cannot be empty').max(10000, 'Rule value exceeds 10 000 characters');
    const rulesRecord = z.record(z.string(), ruleValueSchema).refine(
      (obj) => Object.keys(obj).some((k) => knownKeys.includes(k)),
      { message: 'No recognised rule IDs found' }
    );
    return z.union([
      z.object({ allValues: rulesRecord }).transform((d) => d.allValues),
      z.object({ customValues: rulesRecord }).transform((d) => d.customValues),
      rulesRecord,
    ]);
  }, []);

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 512 * 1024) {
      toast.error('File too large (max 512 KB)');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const raw = JSON.parse(ev.target?.result as string);
        const result = templateSchema.safeParse(raw);
        if (!result.success) {
          const firstIssue = result.error.issues[0];
          toast.error(`Invalid template: ${firstIssue?.message || 'schema validation failed'}`);
          return;
        }
        const imported = result.data;
        const validEntries: Record<string, string> = {};
        let overwriteCount = 0;
        for (const [key, val] of Object.entries(imported)) {
          if (key in DEFAULT_VALUES) {
            validEntries[key] = val;
            if (values[key] !== DEFAULT_VALUES[key]) overwriteCount++;
          }
        }
        if (Object.keys(validEntries).length === 0) {
          toast.error('No valid rules found in the file');
          return;
        }
        setImportPreview({ data: validEntries, count: Object.keys(validEntries).length, overwriteCount });
      } catch {
        toast.error('Invalid JSON file — could not parse');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleConfirmImport = async () => {
    if (!importPreview) return;
    try {
      for (const [key, val] of Object.entries(importPreview.data)) {
        await updateValue(key, val);
      }
      toast.success(`Imported ${importPreview.count} rule(s)`);
    } catch {
      toast.error('Failed to import');
    }
    setImportPreview(null);
  };

  const handleUpdateValue = async (id: string, val: string) => {
    await updateValue(id, val);
    toast.success(t.rules.saved);
  };

  const handleRestoreOne = async (id: string) => {
    await restoreOne(id);
    toast.success(t.rules.restoreDefaults);
  };

  const handleRestoreAll = async () => {
    await restoreAll();
    toast.success(t.rules.restoreAll);
  };

  const handleSaveVersion = async () => {
    const label = saveLabel.trim() || `Version ${format(new Date(), 'yyyy-MM-dd HH:mm')}`;
    await saveVersion(label, { ...values });
    setShowSaveDialog(false);
    setSaveLabel('');
  };

  const handleRestoreVersion = async (version: TemplateVersion) => {
    try {
      for (const [key, val] of Object.entries(version.snapshot)) {
        if (key in DEFAULT_VALUES) {
          await updateValue(key, val);
        }
      }
      toast.success(`Restored "${version.label}"`);
      setRestorePreview(null);
      setShowHistory(false);
    } catch {
      toast.error('Failed to restore version');
    }
  };

  const searchLower = search.toLowerCase();
  const filteredSections = useMemo(() =>
    DEFAULT_SECTIONS.filter(s => {
      if (!search) return true;
      const label = ((t.rules as Record<string, string>)[s.labelKey] || '').toLowerCase();
      const content = (values[s.id] || '').toLowerCase();
      return label.includes(searchLower) || content.includes(searchLower);
    }),
    [search, searchLower, t, values]
  );

  const activeContent = filteredSections.find(s => s.id === activeSection) || filteredSections[0];
  const activeIndex = filteredSections.findIndex(s => s.id === activeContent?.id);

  const tocItems = filteredSections.map(s => ({
    id: s.id,
    icon: s.icon,
    label: (t.rules as Record<string, string>)[s.labelKey] || s.labelKey,
    isModified: values[s.id] !== s.defaultContent,
  }));

  const modifiedCount = DEFAULT_SECTIONS.filter(s => values[s.id] !== s.defaultContent).length;

  const handleSelect = (id: string) => {
    setActiveSection(id);
    const mainEl = document.querySelector('[data-rules-main]');
    if (mainEl?.scrollTo) mainEl.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto flex gap-8">
      <RulesToc
        items={tocItems}
        activeId={activeContent?.id ?? ''}
        onSelect={handleSelect}
        search={search}
      />

      <div className="flex-1 min-w-0 max-w-4xl" data-rules-main>
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl gold-gradient flex items-center justify-center">
                <Settings2 className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl lg:text-3xl font-display font-semibold text-foreground">{t.rules.title}</h1>
                <p className="text-sm text-muted-foreground mt-0.5">{t.rules.subtitle}</p>
              </div>
              <HelpButton section="rules" />
            </div>
            <div className="flex gap-2 flex-wrap">
              {modifiedCount > 0 && (
                <Button variant="outline" size="sm" onClick={handleRestoreAll} disabled={saving} className="text-muted-foreground">
                  <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> {t.rules.restoreAll}
                  <Badge variant="secondary" className="ml-1.5 text-[10px] h-4 px-1">{modifiedCount}</Badge>
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => setShowHistory(!showHistory)}>
                <History className="h-4 w-4 mr-1.5" />{t.rules.history}
                {versions.length > 0 && <Badge variant="secondary" className="ml-1.5 text-[10px] h-4 px-1">{versions.length}</Badge>}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowSaveDialog(true)}>
                <Save className="h-4 w-4 mr-1.5" />{t.rules.saveVersion}
              </Button>
              <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleFileSelected} />
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4 mr-1.5" />{t.rules.import}
              </Button>
              <Button size="sm" className="gold-gradient text-primary-foreground hover:opacity-90" onClick={handleExportJSON}>
                <Download className="h-4 w-4 mr-1.5" />{t.rules.export}
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t.rules.searchRules}
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                const matches = DEFAULT_SECTIONS.filter(s => {
                  const label = ((t.rules as Record<string, string>)[s.labelKey] || '').toLowerCase();
                  return label.includes(e.target.value.toLowerCase());
                });
                if (matches.length === 1) setActiveSection(matches[0].id);
              }}
              className="pl-9"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Version History Panel */}
        <AnimatePresence>
          {showHistory && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden mb-6"
            >
              <div className="bg-card border border-border rounded-xl p-5 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <History className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">{t.rules.versionHistory}</h3>
                  <span className="text-xs text-muted-foreground">({versions.length}/{MAX_TEMPLATE_VERSIONS})</span>
                  {compareSelection.length > 0 && (
                    <div className="ml-auto flex items-center gap-2">
                      <span className="text-[11px] text-muted-foreground">
                        {compareSelection.length}/2 {t.rules.selected}
                      </span>
                      {compareSelection.length === 2 && (
                        <Badge className="text-[10px] bg-primary/10 text-primary border-primary/30 animate-pulse">
                          {t.rules.readyToCompare}
                        </Badge>
                      )}
                      <Button variant="ghost" size="sm" className="h-6 text-[10px] text-muted-foreground" onClick={() => setCompareSelection([])}>
                        {t.rules.clear}
                      </Button>
                    </div>
                  )}
                </div>
                {versions.length >= 2 && compareSelection.length === 0 && (
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                    <ArrowLeftRight className="h-3 w-3" /> {t.rules.compareTip}
                  </p>
                )}
                {versionsLoading ? (
                  <Skeleton className="h-16 w-full" />
                ) : versions.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">{t.rules.noVersions}</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {versions.map(v => {
                      const changedKeys = Object.keys(v.snapshot).filter(k => k in DEFAULT_VALUES && v.snapshot[k] !== DEFAULT_VALUES[k]);
                      const isSelected = compareSelection.some(c => c.id === v.id);
                      const handleCompareToggle = () => {
                        if (isSelected) {
                          setCompareSelection(prev => prev.filter(c => c.id !== v.id));
                        } else if (compareSelection.length < 2) {
                          setCompareSelection(prev => [...prev, v]);
                        }
                      };
                      return (
                        <div
                          key={v.id}
                          className={cn(
                            "flex items-center gap-3 border rounded-lg p-3 group cursor-pointer transition-all",
                            isSelected
                              ? "bg-primary/5 border-primary/30 ring-1 ring-primary/20"
                              : "bg-muted/30 border-border/50 hover:border-border"
                          )}
                          onClick={handleCompareToggle}
                        >
                          <div className={cn(
                            "h-8 w-8 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                            isSelected ? "bg-primary/20" : "bg-primary/10"
                          )}>
                            {isSelected ? (
                              <ArrowLeftRight className="h-4 w-4 text-primary" />
                            ) : (
                              <Clock className="h-4 w-4 text-primary" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{v.label}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {format(new Date(v.created_at), 'MMM d, yyyy HH:mm')}
                              {changedKeys.length > 0 && <span className="ml-2">· {changedKeys.length} {t.rules.customRules}</span>}
                            </p>
                          </div>
                          <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setRestorePreview(v)}>
                              <Undo2 className="h-3 w-3 mr-1" />{t.rules.restore}
                            </Button>
                            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => { setRenameTarget(v); setRenameLabel(v.label); }}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => { setDuplicateTarget(v); setDuplicateLabel(`${v.label} (copy)`); }}>
                              <CopyPlus className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:text-destructive" onClick={() => deleteVersion(v.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Version Compare Panel */}
        <AnimatePresence>
          {compareSelection.length === 2 && (
            <VersionComparePanel
              versionA={compareSelection[0]}
              versionB={compareSelection[1]}
              sections={DEFAULT_SECTIONS}
              labels={t.rules as Record<string, string>}
              defaults={DEFAULT_VALUES}
              onClose={() => setCompareSelection([])}
            />
          )}
        </AnimatePresence>

        {/* Mobile section selector (visible on <xl) */}
        <div className="xl:hidden mb-4 flex gap-2 overflow-x-auto pb-2">
          {tocItems.map(item => (
            <button
              key={item.id}
              onClick={() => handleSelect(item.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border whitespace-nowrap transition-all",
                activeContent?.id === item.id
                  ? "bg-primary/10 text-primary border-primary/30"
                  : "bg-muted/30 text-muted-foreground border-border/50 hover:bg-muted/50"
              )}
            >
              <item.icon className="h-3 w-3" />
              {item.label}
              {item.isModified && <div className="h-1.5 w-1.5 rounded-full bg-warning" />}
            </button>
          ))}
        </div>

        {/* Active Section Content */}
        <AnimatePresence mode="wait">
          {activeContent && (
            <motion.div
              key={activeContent.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="bg-card border border-border rounded-xl shadow-premium overflow-hidden"
            >
              <div className="p-6 lg:p-8">
                {/* Section header */}
                <div className="mb-6 pb-5 border-b border-border/50">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <activeContent.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-xl font-display font-semibold text-foreground">
                          {(t.rules as Record<string, string>)[activeContent.labelKey]}
                        </h2>
                        {activeContent.tooltipKey && (
                          <InfoTooltip content={(t.tooltips as Record<string, string>)[activeContent.tooltipKey] || ''} />
                        )}
                        {values[activeContent.id] !== activeContent.defaultContent && (
                          <Badge variant="outline" className="text-[10px] bg-warning/10 text-warning border-warning/30 ml-auto">
                            {t.rules.modified}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section content */}
                {activeContent.id === 'aiStrictness' ? (
                  <AIStrictnessSection
                    value={values[activeContent.id]}
                    defaultValue={activeContent.defaultContent}
                    onChange={v => handleUpdateValue(activeContent.id, v)}
                    onRestore={() => handleRestoreOne(activeContent.id)}
                    t={t}
                  />
                ) : (
                  <RuleContentSection
                    value={values[activeContent.id]}
                    defaultValue={activeContent.defaultContent}
                    onChange={v => handleUpdateValue(activeContent.id, v)}
                    onRestore={() => handleRestoreOne(activeContent.id)}
                    t={t}
                  />
                )}
              </div>

              {/* Bottom navigation */}
              <div className="border-t border-border/50 px-6 lg:px-8 py-4 bg-muted/20 flex items-center justify-between">
                <button
                  onClick={() => activeIndex > 0 && handleSelect(filteredSections[activeIndex - 1].id)}
                  disabled={activeIndex <= 0}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">
                    {activeIndex > 0 ? (t.rules as Record<string, string>)[filteredSections[activeIndex - 1].labelKey] : ''}
                  </span>
                </button>
                <span className="text-xs text-muted-foreground tabular-nums">{activeIndex + 1} / {filteredSections.length}</span>
                <button
                  onClick={() => activeIndex < filteredSections.length - 1 && handleSelect(filteredSections[activeIndex + 1].id)}
                  disabled={activeIndex >= filteredSections.length - 1}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <span className="hidden sm:inline">
                    {activeIndex < filteredSections.length - 1 ? (t.rules as Record<string, string>)[filteredSections[activeIndex + 1].labelKey] : ''}
                  </span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {search && filteredSections.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Search className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">{t.rules.noResults} "{search}"</p>
            <button onClick={() => setSearch('')} className="mt-3 text-xs text-primary hover:underline">{t.rules.clearSearch}</button>
          </div>
        )}
      </div>

      {/* Import Confirmation Modal */}
      <AnimatePresence>
        {importPreview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
              onClick={() => setImportPreview(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="relative bg-card border border-border rounded-xl shadow-premium p-6 max-w-md w-full mx-4 space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-warning/10 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">{t.rules.confirmImport}</h3>
                  <p className="text-sm text-muted-foreground">{t.rules.overwriteWarning}</p>
                </div>
              </div>

              <div className="bg-muted/30 border border-border/50 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t.rules.rulesToImport}</span>
                  <span className="font-medium text-foreground">{importPreview.count}</span>
                </div>
                {importPreview.overwriteCount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-warning">{t.rules.customOverwrite}</span>
                    <span className="font-medium text-warning">{importPreview.overwriteCount}</span>
                  </div>
                )}
              </div>

              {/* Preview of changes */}
              <div className="max-h-56 overflow-y-auto space-y-2">
                {Object.entries(importPreview.data).map(([ruleId, newVal]) => {
                  const section = DEFAULT_SECTIONS.find(s => s.id === ruleId);
                  if (!section) return null;
                  const label = (t.rules as Record<string, string>)[section.labelKey] || section.labelKey;
                  const currentVal = values[ruleId];
                  const isChanged = currentVal !== newVal;
                  if (!isChanged) return null;
                  return (
                    <div key={ruleId} className="bg-muted/20 border border-border/30 rounded-lg p-3 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <section.icon className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span className="text-xs font-semibold text-foreground">{label}</span>
                        {currentVal !== DEFAULT_VALUES[ruleId] && (
                          <Badge variant="outline" className="text-[9px] bg-warning/10 text-warning border-warning/30 ml-auto">{t.rules.overwrite}</Badge>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                        <span className="text-destructive/70 line-through">{currentVal.slice(0, 80)}{currentVal.length > 80 ? '…' : ''}</span>
                      </div>
                      <div className="text-[11px] text-primary line-clamp-2 leading-relaxed">
                        → {newVal.slice(0, 80)}{newVal.length > 80 ? '…' : ''}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => setImportPreview(null)}>
                  {t.rules.cancel}
                </Button>
                <Button size="sm" className="gold-gradient text-primary-foreground hover:opacity-90" onClick={handleConfirmImport} disabled={saving}>
                  <Upload className="h-3.5 w-3.5 mr-1.5" />
                  {t.rules.importRules} {importPreview.count} {t.rules.rules}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Save Version Dialog */}
      <AnimatePresence>
        {showSaveDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
              onClick={() => setShowSaveDialog(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="relative bg-card border border-border rounded-xl shadow-premium p-6 max-w-sm w-full mx-4 space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Save className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">{t.rules.saveVersionTitle}</h3>
                  <p className="text-sm text-muted-foreground">{t.rules.saveVersionSubtitle}</p>
                </div>
              </div>
              <Input
                placeholder={`Version ${format(new Date(), 'yyyy-MM-dd HH:mm')}`}
                value={saveLabel}
                onChange={e => setSaveLabel(e.target.value)}
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => { setShowSaveDialog(false); setSaveLabel(''); }}>
                  {t.rules.cancel}
                </Button>
                <Button size="sm" className="gold-gradient text-primary-foreground hover:opacity-90" onClick={handleSaveVersion}>
                  <Save className="h-3.5 w-3.5 mr-1.5" />{t.rules.save}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Restore Version Confirm Modal */}
      <AnimatePresence>
        {restorePreview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
              onClick={() => setRestorePreview(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="relative bg-card border border-border rounded-xl shadow-premium p-6 max-w-md w-full mx-4 space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-warning/10 flex items-center justify-center">
                  <Undo2 className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">{t.rules.restoreVersion}</h3>
                  <p className="text-sm text-muted-foreground">"{restorePreview.label}"</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                {t.rules.restoreVersionWarning}
              </p>
              <div className="max-h-48 overflow-y-auto space-y-2">
                {Object.entries(restorePreview.snapshot)
                  .filter(([k, v]) => k in DEFAULT_VALUES && v !== values[k])
                  .map(([ruleId, newVal]) => {
                    const section = DEFAULT_SECTIONS.find(s => s.id === ruleId);
                    if (!section) return null;
                    const label = (t.rules as Record<string, string>)[section.labelKey] || section.labelKey;
                    return (
                      <div key={ruleId} className="bg-muted/20 border border-border/30 rounded-lg p-3 space-y-1">
                        <div className="flex items-center gap-2">
                          <section.icon className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span className="text-xs font-semibold text-foreground">{label}</span>
                        </div>
                        <div className="text-[11px] text-primary line-clamp-2">→ {newVal.slice(0, 100)}{newVal.length > 100 ? '…' : ''}</div>
                      </div>
                    );
                  })}
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => setRestorePreview(null)}>
                  {t.rules.cancel}
                </Button>
                <Button size="sm" className="gold-gradient text-primary-foreground hover:opacity-90" onClick={() => handleRestoreVersion(restorePreview)} disabled={saving}>
                  <Undo2 className="h-3.5 w-3.5 mr-1.5" />{t.rules.restore}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Duplicate Version Dialog */}
      <AnimatePresence>
        {duplicateTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setDuplicateTarget(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="relative bg-card border border-border rounded-xl shadow-premium p-6 max-w-sm w-full mx-4 space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <CopyPlus className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">{t.rules.duplicateVersion}</h3>
                  <p className="text-sm text-muted-foreground">{t.rules.duplicateVersionSubtitle} "{duplicateTarget.label}"</p>
                </div>
              </div>
              <Input
                placeholder={t.rules.newVersionName}
                value={duplicateLabel}
                onChange={e => setDuplicateLabel(e.target.value)}
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => { setDuplicateTarget(null); setDuplicateLabel(''); }}>
                  {t.rules.cancel}
                </Button>
                <Button
                  size="sm"
                  className="gold-gradient text-primary-foreground hover:opacity-90"
                  disabled={!duplicateLabel.trim()}
                  onClick={async () => {
                    await saveVersion(duplicateLabel.trim(), { ...duplicateTarget.snapshot });
                    setDuplicateTarget(null);
                    setDuplicateLabel('');
                  }}
                >
                  <CopyPlus className="h-3.5 w-3.5 mr-1.5" />{t.rules.duplicate}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Rename Version Dialog */}
      <AnimatePresence>
        {renameTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setRenameTarget(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="relative bg-card border border-border rounded-xl shadow-premium p-6 max-w-sm w-full mx-4 space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Pencil className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">{t.rules.renameVersion}</h3>
                  <p className="text-sm text-muted-foreground">{t.rules.renameVersionSubtitle}</p>
                </div>
              </div>
              <Input
                placeholder={t.rules.versionName}
                value={renameLabel}
                onChange={e => setRenameLabel(e.target.value)}
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => { setRenameTarget(null); setRenameLabel(''); }}>
                  {t.rules.cancel}
                </Button>
                <Button
                  size="sm"
                  className="gold-gradient text-primary-foreground hover:opacity-90"
                  disabled={!renameLabel.trim() || renameLabel.trim() === renameTarget.label}
                  onClick={async () => {
                    await renameVersion(renameTarget.id, renameLabel.trim());
                    setRenameTarget(null);
                    setRenameLabel('');
                  }}
                >
                  <Pencil className="h-3.5 w-3.5 mr-1.5" />{t.rules.rename}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RulesTemplates;
