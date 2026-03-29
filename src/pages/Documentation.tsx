import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useI18n } from '@/contexts/I18nContext';
import {
  BookOpen, LayoutDashboard, Plus, Library, Settings2, Cpu, FileEdit, GitBranch,
  History, ArrowUpDown, Brain, Users, Settings, Shield, Search, ChevronRight,
  ChevronDown, Zap, Target, Lock, Eye, Bell,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface DocSection {
  id: string;
  icon: React.ElementType;
  title: string;
  badge?: string;
  content: React.ReactNode;
}

const SectionCard: React.FC<{ section: DocSection; isOpen: boolean; onToggle: () => void }> = ({ section, isOpen, onToggle }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-card border border-border rounded-lg shadow-premium overflow-hidden"
  >
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-3 p-5 text-left hover:bg-muted/30 transition-colors"
    >
      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <section.icon className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">{section.title}</span>
          {section.badge && <Badge variant="secondary" className="text-[10px]">{section.badge}</Badge>}
        </div>
      </div>
      {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
    </button>
    {isOpen && (
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="px-5 pb-5 border-t border-border"
      >
        <div className="pt-4 prose-sm text-muted-foreground space-y-3 max-w-none text-sm leading-relaxed">
          {section.content}
        </div>
      </motion.div>
    )}
  </motion.div>
);

const Step: React.FC<{ n: number; title: string; children: React.ReactNode }> = ({ n, title, children }) => (
  <div className="flex gap-3">
    <div className="h-6 w-6 rounded-full gold-gradient flex items-center justify-center shrink-0 mt-0.5">
      <span className="text-[10px] font-bold text-primary-foreground">{n}</span>
    </div>
    <div>
      <p className="text-foreground font-medium text-sm">{title}</p>
      <div className="text-muted-foreground text-xs mt-1">{children}</div>
    </div>
  </div>
);

const Tip: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="bg-primary/5 border border-primary/20 rounded-md p-3 flex items-start gap-2">
    <Zap className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
    <span className="text-xs text-foreground">{children}</span>
  </div>
);

const Li: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <li><strong className="text-foreground">{label}</strong> {children}</li>
);

const Documentation: React.FC = () => {
  const { t } = useI18n();
  const location = useLocation();
  const d = (t as any).docs;
  const [search, setSearch] = useState('');
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['overview']));

  useEffect(() => {
    const hash = location.hash.replace('#', '');
    if (hash) {
      setOpenSections(new Set([hash]));
      setTimeout(() => {
        document.getElementById(`doc-section-${hash}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [location.hash]);

  const toggle = (id: string) => {
    setOpenSections(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const sections: DocSection[] = [
    {
      id: 'overview', icon: Shield, title: d.overviewTitle,
      content: (
        <>
          <p>{d.overviewDesc}</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
            {[
              { icon: Target, label: d.overviewPipeline, desc: d.overviewPipelineDesc },
              { icon: GitBranch, label: d.overviewTraceability, desc: d.overviewTraceabilityDesc },
              { icon: Lock, label: d.overviewGovernance, desc: d.overviewGovernanceDesc },
            ].map(f => (
              <div key={f.label} className="bg-muted/50 rounded-md p-3 text-center">
                <f.icon className="h-5 w-5 text-primary mx-auto mb-1.5" />
                <p className="text-xs font-semibold text-foreground">{f.label}</p>
                <p className="text-[11px] text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </>
      ),
    },
    {
      id: 'getting-started', icon: Zap, title: d.gettingStartedTitle, badge: d.gettingStartedBadge,
      content: (
        <div className="space-y-4">
          <Step n={1} title={d.step1Title}>{d.step1Desc}</Step>
          <Step n={2} title={d.step2Title}>{d.step2Desc}</Step>
          <Step n={3} title={d.step3Title}>{d.step3Desc}</Step>
          <Step n={4} title={d.step4Title}>{d.step4Desc}</Step>
          <Step n={5} title={d.step5Title}>{d.step5Desc}</Step>
          <Step n={6} title={d.step6Title}>{d.step6Desc}</Step>
          <Tip>{d.demoTip}</Tip>
        </div>
      ),
    },
    {
      id: 'dashboard', icon: LayoutDashboard, title: d.dashboardTitle,
      content: (
        <>
          <p>{d.dashboardDesc}</p>
          <ul className="list-disc pl-4 space-y-1.5">
            <Li label={d.dashboardMetrics}>{d.dashboardMetricsDesc}</Li>
            <Li label={d.dashboardRecent}>{d.dashboardRecentDesc}</Li>
            <Li label={d.dashboardActivity}>{d.dashboardActivityDesc}</Li>
            <Li label={d.dashboardTrends}>{d.dashboardTrendsDesc}</Li>
            <Li label={d.dashboardQuick}>{d.dashboardQuickDesc}</Li>
          </ul>
        </>
      ),
    },
    {
      id: 'new-project', icon: Plus, title: d.newProjectTitle,
      content: (
        <>
          <p>{d.newProjectDesc}</p>
          <ul className="list-disc pl-4 space-y-1.5">
            <Li label={d.newProjectName}>{d.newProjectNameDesc}</Li>
            <Li label={d.newProjectTech}>{d.newProjectTechDesc}</Li>
            <Li label={d.newProjectVendor}>{d.newProjectVendorDesc}</Li>
            <Li label={d.newProjectVersion}>{d.newProjectVersionDesc}</Li>
            <Li label={d.newProjectCategory}>{d.newProjectCategoryDesc}</Li>
            <Li label={d.newProjectLang}>{d.newProjectLangDesc}</Li>
            <Li label={d.newProjectTags}>{d.newProjectTagsDesc}</Li>
          </ul>
          <Tip>{d.newProjectTip}</Tip>
        </>
      ),
    },
    {
      id: 'sources', icon: Library, title: d.sourcesTitle,
      content: (
        <>
          <p>{d.sourcesDesc}</p>
          <p className="font-medium text-foreground mt-2">{d.sourcesTypesTitle}</p>
          <ul className="list-disc pl-4 space-y-1.5">
            <Li label={d.sourcesUrl}>{d.sourcesUrlDesc}</Li>
            <Li label={d.sourcesDoc}>{d.sourcesDocDesc}</Li>
          </ul>
          <p className="font-medium text-foreground mt-2">{d.sourcesStatusTitle}</p>
          <ul className="list-disc pl-4 space-y-1.5">
            <Li label={d.sourcesPending}>{d.sourcesPendingDesc}</Li>
            <Li label={d.sourcesExtracting}>{d.sourcesExtractingDesc}</Li>
            <Li label={d.sourcesNormalized}>{d.sourcesNormalizedDesc}</Li>
            <Li label={d.sourcesProcessed}>{d.sourcesProcessedDesc}</Li>
            <Li label={d.sourcesFailed}>{d.sourcesFailedDesc}</Li>
          </ul>
          <Tip>{d.sourcesTip}</Tip>
        </>
      ),
    },
    {
      id: 'rules', icon: Settings2, title: d.rulesTitle,
      content: (
        <>
          <p>{d.rulesDesc}</p>
          <p className="font-medium text-foreground mt-2">{d.rulesFieldsTitle}</p>
          <ul className="list-disc pl-4 space-y-1.5">
            <Li label={d.rulesStructure}>{d.rulesStructureDesc}</Li>
            <Li label={d.rulesWriting}>{d.rulesWritingDesc}</Li>
            <Li label={d.rulesRisk}>{d.rulesRiskDesc}</Li>
            <Li label={d.rulesCriticality}>{d.rulesCriticalityDesc}</Li>
            <Li label={d.rulesDedup}>{d.rulesDedupDesc}</Li>
            <Li label={d.rulesMapping}>{d.rulesMappingDesc}</Li>
            <Li label={d.rulesThreat}>{d.rulesThreatDesc}</Li>
          </ul>
          <Tip>{d.rulesTip}</Tip>
        </>
      ),
    },
    {
      id: 'workspace', icon: Cpu, title: d.workspaceTitle,
      content: (
        <>
          <p>{d.workspaceDesc}</p>
          <div className="space-y-2 mt-2">
            {(d.workspaceStages as [string, string][]).map(([stage, desc]: [string, string], i: number) => (
              <div key={stage} className="flex items-start gap-2">
                <span className="text-xs font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded shrink-0">{i + 1}</span>
                <div>
                  <span className="text-xs font-semibold text-foreground">{stage}</span>
                  <span className="text-xs text-muted-foreground ml-1">— {desc}</span>
                </div>
              </div>
            ))}
          </div>
          <Tip>{d.workspaceTip}</Tip>
        </>
      ),
    },
    {
      id: 'editor', icon: FileEdit, title: d.editorTitle,
      content: (
        <>
          <p>{d.editorDesc}</p>
          <ul className="list-disc pl-4 space-y-1.5">
            <Li label={d.editorView}>{d.editorViewDesc}</Li>
            <Li label={d.editorStride}>{d.editorStrideDesc}</Li>
            <Li label={d.editorConfidence}>{d.editorConfidenceDesc}</Li>
            <Li label={d.editorStatus}>{d.editorStatusDesc}</Li>
            <Li label={d.editorNotes}>{d.editorNotesDesc}</Li>
            <Li label={d.editorMindmap}>{d.editorMindmapDesc}</Li>
          </ul>
          <p className="font-medium text-foreground mt-2">{d.editorFiltersTitle}</p>
          <ul className="list-disc pl-4 space-y-1">
            <li>{d.editorFilter1}</li>
            <li>{d.editorFilter2}</li>
            <li>{d.editorFilter3}</li>
            <li>{d.editorFilter4}</li>
          </ul>
        </>
      ),
    },
    {
      id: 'traceability', icon: GitBranch, title: d.traceabilityTitle,
      content: (
        <>
          <p>{d.traceabilityDesc}</p>
          <ul className="list-disc pl-4 space-y-1.5">
            <Li label={d.traceabilityFrameworks}>{d.traceabilityFrameworksDesc}</Li>
            <Li label={d.traceabilityRadar}>{d.traceabilityRadarDesc}</Li>
            <Li label={d.traceabilityCards}>{d.traceabilityCardsDesc}</Li>
            <Li label={d.traceabilityFilters}>{d.traceabilityFiltersDesc}</Li>
            <Li label={d.traceabilityExport}>{d.traceabilityExportDesc}</Li>
          </ul>
          <Tip>{d.traceabilityTip}</Tip>
        </>
      ),
    },
    {
      id: 'history', icon: History, title: d.historyTitle,
      content: (
        <>
          <p>{d.historyDesc}</p>
          <ul className="list-disc pl-4 space-y-1.5">
            <Li label={d.historyVersions}>{d.historyVersionsDesc}</Li>
            <Li label={d.historySideBySide}>{d.historySideBySideDesc}</Li>
            <Li label={d.historyStats}>{d.historyStatsDesc}</Li>
            <Li label={d.historyFilters}>{d.historyFiltersDesc}</Li>
            <Li label={d.historyExport}>{d.historyExportDesc}</Li>
            <Li label={d.historyRestore}>{d.historyRestoreDesc}</Li>
          </ul>
          <Tip>{d.historyTip}</Tip>
        </>
      ),
    },
    {
      id: 'export-import', icon: ArrowUpDown, title: d.exportTitle,
      content: (
        <>
          <p>{d.exportDesc}</p>
          <ul className="list-disc pl-4 space-y-1.5">
            <Li label={d.exportJson}>{d.exportJsonDesc}</Li>
            <Li label={d.exportMarkdown}>{d.exportMarkdownDesc}</Li>
            <Li label={d.exportPdf}>{d.exportPdfDesc}</Li>
            <Li label={d.exportCsv}>{d.exportCsvDesc}</Li>
          </ul>
          <Tip>{d.exportTip}</Tip>
        </>
      ),
    },
    {
      id: 'ai-integrations', icon: Brain, title: d.aiTitle,
      content: (
        <>
          <p>{d.aiDesc}</p>
          <ul className="list-disc pl-4 space-y-1.5">
            <Li label={d.aiProviders}>{d.aiProvidersDesc}</Li>
            <Li label={d.aiModel}>{d.aiModelDesc}</Li>
            <Li label={d.aiTest}>{d.aiTestDesc}</Li>
            <Li label={d.aiDefault}>{d.aiDefaultDesc}</Li>
          </ul>
          <Tip>{d.aiTip}</Tip>
        </>
      ),
    },
    {
      id: 'teams', icon: Users, title: d.teamsTitle,
      content: (
        <>
          <p>{d.teamsDesc}</p>
          <ul className="list-disc pl-4 space-y-1.5">
            <Li label={d.teamsCreate}>{d.teamsCreateDesc}</Li>
            <Li label={d.teamsRoles}>{d.teamsRolesDesc}</Li>
            <Li label={d.teamsShared}>{d.teamsSharedDesc}</Li>
            <Li label={d.teamsNotifications}>{d.teamsNotificationsDesc}</Li>
          </ul>
          <Tip>{d.teamsTip}</Tip>
        </>
      ),
    },
    {
      id: 'notifications', icon: Bell, title: d.notificationsTitle,
      content: (
        <>
          <p>{d.notificationsDesc}</p>
          <ul className="list-disc pl-4 space-y-1.5">
            <Li label={d.notificationsTypes}>{d.notificationsTypesDesc}</Li>
            <Li label={d.notificationsBadge}>{d.notificationsBadgeDesc}</Li>
            <Li label={d.notificationsRead}>{d.notificationsReadDesc}</Li>
          </ul>
        </>
      ),
    },
    {
      id: 'settings', icon: Settings, title: d.settingsTitle,
      content: (
        <>
          <p>{d.settingsDesc}</p>
          <ul className="list-disc pl-4 space-y-1.5">
            <Li label={d.settingsLang}>{d.settingsLangDesc}</Li>
            <Li label={d.settingsOutput}>{d.settingsOutputDesc}</Li>
            <Li label={d.settingsTheme}>{d.settingsThemeDesc}</Li>
            <Li label={d.settingsTooltips}>{d.settingsTooltipsDesc}</Li>
            <Li label={d.settingsFormat}>{d.settingsFormatDesc}</Li>
            <Li label={d.settingsAi}>{d.settingsAiDesc}</Li>
            <Li label={d.settingsBackup}>{d.settingsBackupDesc}</Li>
          </ul>
        </>
      ),
    },
    {
      id: 'mindmap', icon: Eye, title: d.mindmapTitle,
      content: (
        <>
          <p>{d.mindmapDesc}</p>
          <ul className="list-disc pl-4 space-y-1.5">
            <Li label={d.mindmapRoot}>{d.mindmapRootDesc}</Li>
            <Li label={d.mindmapCategory}>{d.mindmapCategoryDesc}</Li>
            <Li label={d.mindmapControl}>{d.mindmapControlDesc}</Li>
            <Li label={d.mindmapInteract}>{d.mindmapInteractDesc}</Li>
            <Li label={d.mindmapFilters}>{d.mindmapFiltersDesc}</Li>
            <Li label={d.mindmapToolbar}>{d.mindmapToolbarDesc}</Li>
          </ul>
        </>
      ),
    },
    {
      id: 'security', icon: Lock, title: d.securityTitle,
      content: (
        <>
          <p>{d.securityDesc}</p>
          <ul className="list-disc pl-4 space-y-1.5">
            <Li label={d.securityAuth}>{d.securityAuthDesc}</Li>
            <Li label={d.securityRls}>{d.securityRlsDesc}</Li>
            <Li label={d.securityIsolation}>{d.securityIsolationDesc}</Li>
            <Li label={d.securitySnapshots}>{d.securitySnapshotsDesc}</Li>
            <Li label={d.securityKeys}>{d.securityKeysDesc}</Li>
          </ul>
        </>
      ),
    },
    {
      id: 'shortcuts', icon: Zap, title: d.tipsTitle,
      content: (
        <div className="space-y-2">
          <Tip>{d.tip1}</Tip>
          <Tip>{d.tip2}</Tip>
          <Tip>{d.tip3}</Tip>
          <Tip>{d.tip4}</Tip>
          <Tip>{d.tip5}</Tip>
          <Tip>{d.tip6}</Tip>
          <Tip>{d.tip7}</Tip>
          <Tip>{d.tip8}</Tip>
        </div>
      ),
    },
  ];

  const filtered = sections.filter(s =>
    !search || s.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="h-9 w-9 rounded-lg gold-gradient flex items-center justify-center">
            <BookOpen className="h-4.5 w-4.5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-display font-semibold text-foreground">{d.title}</h1>
            <p className="text-sm text-muted-foreground">{d.subtitle}</p>
          </div>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={d.searchPlaceholder}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setOpenSections(new Set(sections.map(s => s.id)))}
          className="text-xs text-primary hover:underline"
        >
          {d.expandAll}
        </button>
        <span className="text-muted-foreground text-xs">•</span>
        <button
          onClick={() => setOpenSections(new Set())}
          className="text-xs text-primary hover:underline"
        >
          {d.collapseAll}
        </button>
      </div>

      <div className="space-y-3">
        {filtered.map(section => (
          <SectionCard
            key={section.id}
            section={section}
            isOpen={openSections.has(section.id)}
            onToggle={() => toggle(section.id)}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Search className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">{d.noResults} "{search}"</p>
        </div>
      )}
    </div>
  );
};

export default Documentation;
