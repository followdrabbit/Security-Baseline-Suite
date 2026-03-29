import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useI18n } from '@/contexts/I18nContext';
import {
  BookOpen, LayoutDashboard, Plus, Library, Settings2, Cpu, FileEdit, GitBranch,
  History, ArrowUpDown, Brain, Users, Settings, Shield, Search,
  Zap, Target, Lock, Eye, Bell, HelpCircle, MessageCircleQuestion,
  FileText, Globe, Layers, BarChart3, Download, Upload, Key, MousePointerClick,
  ChevronLeft, ChevronRight, Sparkles,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import DocTableOfContents from '@/components/docs/DocTableOfContents';
import DocCallout from '@/components/docs/DocCallout';
import DocFeatureGrid from '@/components/docs/DocFeatureGrid';
import DocStepList from '@/components/docs/DocStepList';

type DocCategory = 'getting-started' | 'core' | 'ai' | 'management' | 'advanced';

const categoryConfig: Record<DocCategory, { label: string; color: string }> = {
  'getting-started': { label: 'Getting Started', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  'core': { label: 'Core Features', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  'ai': { label: 'AI & Automation', color: 'bg-violet-500/10 text-violet-600 border-violet-500/20' },
  'management': { label: 'Management', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  'advanced': { label: 'Advanced', color: 'bg-rose-500/10 text-rose-600 border-rose-500/20' },
};

interface DocSection {
  id: string;
  icon: React.ElementType;
  title: string;
  badge?: string;
  category: DocCategory;
  keywords: string;
  content: React.ReactNode;
}

const HighlightText: React.FC<{ text: string; highlight: string }> = ({ text, highlight }) => {
  if (!highlight.trim()) return <>{text}</>;
  const regex = new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-primary/20 text-primary font-semibold rounded-sm px-0.5">{part}</mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
};

const SectionHeader: React.FC<{ title: string; subtitle?: string; icon: React.ElementType; badge?: string }> = ({ title, subtitle, icon: Icon, badge }) => (
  <div className="mb-8 pb-6 border-b border-border/50">
    <div className="flex items-center gap-3 mb-2">
      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-display font-semibold text-foreground">{title}</h2>
          {badge && <Badge variant="secondary" className="text-[10px]">{badge}</Badge>}
        </div>
        {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
    </div>
  </div>
);

const SubSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="mb-6">
    <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
      <div className="h-1 w-1 rounded-full bg-primary" />
      {title}
    </h3>
    <div className="text-sm text-muted-foreground leading-relaxed space-y-3">{children}</div>
  </div>
);

const FeatureItem: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex gap-3 py-2 border-b border-border/30 last:border-0">
    <span className="text-sm font-medium text-foreground whitespace-nowrap">{label}</span>
    <span className="text-sm text-muted-foreground">{children}</span>
  </div>
);

const KeyboardShortcut: React.FC<{ keys: string }> = ({ keys }) => (
  <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-muted border border-border rounded text-muted-foreground">{keys}</kbd>
);

const StatusPill: React.FC<{ color: string; label: string; desc: string }> = ({ color, label, desc }) => (
  <div className="flex items-center gap-3 py-2">
    <span className={`h-2 w-2 rounded-full ${color}`} />
    <span className="text-sm font-medium text-foreground min-w-[100px]">{label}</span>
    <span className="text-sm text-muted-foreground">{desc}</span>
  </div>
);

const Documentation: React.FC = () => {
  const { t } = useI18n();
  const location = useLocation();
  const d = (t as any).docs;
  const [search, setSearch] = useState('');
  const [activeSection, setActiveSection] = useState('overview');
  const [activeCategory, setActiveCategory] = useState<DocCategory | 'all'>('all');

  useEffect(() => {
    const hash = location.hash.replace('#', '');
    if (hash) setActiveSection(hash);
  }, [location.hash]);

  const sections: DocSection[] = [
    {
      id: 'overview', icon: Shield, title: d.overviewTitle,
      category: 'getting-started',
      keywords: 'overview architecture pipeline traceability governance capabilities multi-language security',
      content: (
        <div className="space-y-6">
          <p className="text-sm text-muted-foreground leading-relaxed">{d.overviewDesc}</p>

          <DocFeatureGrid features={[
            { icon: Target, title: d.overviewPipeline, description: d.overviewPipelineDesc },
            { icon: GitBranch, title: d.overviewTraceability, description: d.overviewTraceabilityDesc },
            { icon: Lock, title: d.overviewGovernance, description: d.overviewGovernanceDesc },
          ]} />

          <DocCallout variant="info" title="Architecture">
            Aureum uses a multi-stage AI pipeline that processes evidence sources through ingestion, extraction, normalization, grouping, deduplication, and baseline composition — all backed by immutable version snapshots for full auditability.
          </DocCallout>

          <SubSection title="Key Capabilities">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { icon: Cpu, label: 'AI-Powered Generation', desc: 'Automated control creation from diverse sources' },
                { icon: GitBranch, label: 'Full Traceability', desc: 'Source → Control → Framework mapping' },
                { icon: History, label: 'Version Control', desc: 'Immutable snapshots with diff comparison' },
                { icon: Users, label: 'Team Collaboration', desc: 'Shared projects with role-based access' },
                { icon: Globe, label: 'Multi-Language', desc: 'Interface and output in EN, PT-BR, ES' },
                { icon: Shield, label: 'Enterprise Security', desc: 'RLS, encrypted keys, audit trails' },
              ].map(item => (
                <div key={item.label} className="flex items-start gap-3 p-3 rounded-lg bg-muted/20 border border-border/30">
                  <item.icon className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </SubSection>
        </div>
      ),
    },
    {
      id: 'getting-started', icon: Zap, title: d.gettingStartedTitle, badge: d.gettingStartedBadge,
      category: 'getting-started',
      keywords: 'quick start register login create project sources rules pipeline review workflow tutorial',
      content: (
        <div className="space-y-6">
          <DocCallout variant="tip" title="Quick Start">
            {d.demoTip}
          </DocCallout>

          <DocStepList steps={[
            { title: d.step1Title, description: d.step1Desc, detail: 'Navigate to /auth → Register → Check email → Confirm' },
            { title: d.step2Title, description: d.step2Desc, detail: 'Dashboard → "Create New Baseline" → Fill fields → Save' },
            { title: d.step3Title, description: d.step3Desc, detail: 'Source Library → Add URL or Upload → Wait for extraction' },
            { title: d.step4Title, description: d.step4Desc, detail: 'Rules & Templates → Select template → Customize fields' },
            { title: d.step5Title, description: d.step5Desc, detail: 'AI Workspace → Start Pipeline → Monitor stages' },
            { title: d.step6Title, description: d.step6Desc, detail: 'Baseline Editor → Review → Approve/Reject/Adjust' },
          ]} />

          <DocCallout variant="example" title="Example Workflow">
            Creating an AWS S3 baseline: Create project "AWS S3 Hardening 2025" → Add CIS Benchmark URL + AWS Security Guide PDF → Use "Balanced" template → Run pipeline → Review 45 generated controls → Approve baseline → Export as PDF for audit.
          </DocCallout>
        </div>
      ),
    },
    {
      id: 'dashboard', icon: LayoutDashboard, title: d.dashboardTitle,
      category: 'core',
      keywords: 'dashboard metrics projects activity trends statistics overview quick actions',
      content: (
        <div className="space-y-6">
          <p className="text-sm text-muted-foreground leading-relaxed">{d.dashboardDesc}</p>

          <SubSection title="Metrics Panel">
            <div className="space-y-1">
              <FeatureItem label={d.dashboardMetrics}>{d.dashboardMetricsDesc}</FeatureItem>
              <FeatureItem label={d.dashboardRecent}>{d.dashboardRecentDesc}</FeatureItem>
              <FeatureItem label={d.dashboardActivity}>{d.dashboardActivityDesc}</FeatureItem>
              <FeatureItem label={d.dashboardTrends}>{d.dashboardTrendsDesc}</FeatureItem>
              <FeatureItem label={d.dashboardQuick}>{d.dashboardQuickDesc}</FeatureItem>
            </div>
          </SubSection>

          <DocCallout variant="tip">
            The dashboard updates in real-time. Use the trend charts to identify patterns — a declining confidence score may indicate sources need updating.
          </DocCallout>

          <SubSection title="Quick Actions">
            <div className="flex flex-wrap gap-2">
              {['Create New Baseline', 'Import Project', 'View All Projects'].map(action => (
                <div key={action} className="px-3 py-2 rounded-lg bg-primary/5 border border-primary/20 text-xs font-medium text-primary flex items-center gap-2">
                  <MousePointerClick className="h-3 w-3" />
                  {action}
                </div>
              ))}
            </div>
          </SubSection>
        </div>
      ),
    },
    {
      id: 'new-project', icon: Plus, title: d.newProjectTitle,
      category: 'core',
      keywords: 'new project create technology vendor version category tags setup configuration',
      content: (
        <div className="space-y-6">
          <p className="text-sm text-muted-foreground leading-relaxed">{d.newProjectDesc}</p>

          <SubSection title="Required Fields">
            <div className="space-y-1">
              <FeatureItem label={d.newProjectName}>{d.newProjectNameDesc}</FeatureItem>
              <FeatureItem label={d.newProjectTech}>{d.newProjectTechDesc}</FeatureItem>
              <FeatureItem label={d.newProjectVendor}>{d.newProjectVendorDesc}</FeatureItem>
              <FeatureItem label={d.newProjectVersion}>{d.newProjectVersionDesc}</FeatureItem>
              <FeatureItem label={d.newProjectCategory}>{d.newProjectCategoryDesc}</FeatureItem>
              <FeatureItem label={d.newProjectLang}>{d.newProjectLangDesc}</FeatureItem>
              <FeatureItem label={d.newProjectTags}>{d.newProjectTagsDesc}</FeatureItem>
            </div>
          </SubSection>

          <DocCallout variant="tip">{d.newProjectTip}</DocCallout>

          <DocCallout variant="example" title="Example Project Setup">
            <strong>Name:</strong> "Kubernetes Production Baseline 2025"<br/>
            <strong>Technology:</strong> Kubernetes<br/>
            <strong>Vendor:</strong> CNCF<br/>
            <strong>Version:</strong> 1.29<br/>
            <strong>Category:</strong> Cloud / Container Orchestration<br/>
            <strong>Tags:</strong> production, critical-infra, compliance
          </DocCallout>
        </div>
      ),
    },
    {
      id: 'sources', icon: Library, title: d.sourcesTitle,
      category: 'core',
      keywords: 'sources library url document upload extract content CIS NIST OWASP benchmark',
      content: (
        <div className="space-y-6">
          <p className="text-sm text-muted-foreground leading-relaxed">{d.sourcesDesc}</p>

          <SubSection title={d.sourcesTypesTitle}>
            <DocFeatureGrid columns={2} features={[
              { icon: Globe, title: 'URL Sources', description: d.sourcesUrlDesc },
              { icon: FileText, title: 'Document Sources', description: d.sourcesDocDesc },
            ]} />
          </SubSection>

          <SubSection title={d.sourcesStatusTitle}>
            <div className="bg-muted/20 rounded-lg p-4 border border-border/30 space-y-1">
              <StatusPill color="bg-amber-400" label={d.sourcesPending} desc={d.sourcesPendingDesc} />
              <StatusPill color="bg-blue-400" label={d.sourcesExtracting} desc={d.sourcesExtractingDesc} />
              <StatusPill color="bg-cyan-400" label={d.sourcesNormalized} desc={d.sourcesNormalizedDesc} />
              <StatusPill color="bg-emerald-400" label={d.sourcesProcessed} desc={d.sourcesProcessedDesc} />
              <StatusPill color="bg-red-400" label={d.sourcesFailed} desc={d.sourcesFailedDesc} />
            </div>
          </SubSection>

          <DocCallout variant="tip">{d.sourcesTip}</DocCallout>

          <DocCallout variant="example" title="Recommended Sources">
            <ul className="list-disc pl-4 space-y-1 mt-1">
              <li>CIS Benchmarks (e.g., CIS AWS Foundations)</li>
              <li>NIST Special Publications (800-53, 800-171)</li>
              <li>Vendor hardening guides (AWS, Azure, GCP)</li>
              <li>OWASP Testing Guide, ASVS</li>
              <li>ISO 27001 / 27002 control catalogs</li>
            </ul>
          </DocCallout>
        </div>
      ),
    },
    {
      id: 'rules', icon: Settings2, title: d.rulesTitle,
      category: 'ai',
      keywords: 'rules templates structure writing risk criticality deduplication mapping threat scenarios',
      content: (
        <div className="space-y-6">
          <p className="text-sm text-muted-foreground leading-relaxed">{d.rulesDesc}</p>

          <SubSection title={d.rulesFieldsTitle}>
            <div className="space-y-1">
              <FeatureItem label={d.rulesStructure}>{d.rulesStructureDesc}</FeatureItem>
              <FeatureItem label={d.rulesWriting}>{d.rulesWritingDesc}</FeatureItem>
              <FeatureItem label={d.rulesRisk}>{d.rulesRiskDesc}</FeatureItem>
              <FeatureItem label={d.rulesCriticality}>{d.rulesCriticalityDesc}</FeatureItem>
              <FeatureItem label={d.rulesDedup}>{d.rulesDedupDesc}</FeatureItem>
              <FeatureItem label={d.rulesMapping}>{d.rulesMappingDesc}</FeatureItem>
              <FeatureItem label={d.rulesThreat}>{d.rulesThreatDesc}</FeatureItem>
            </div>
          </SubSection>

          <DocCallout variant="tip">{d.rulesTip}</DocCallout>

          <SubSection title="Criticality Scale">
            <div className="bg-muted/20 rounded-lg p-4 border border-border/30 space-y-1">
              <StatusPill color="bg-red-500" label="Critical" desc="Immediate risk — must be implemented. Exploitation leads to full compromise." />
              <StatusPill color="bg-orange-500" label="High" desc="Significant risk — prioritize implementation. Major impact if exploited." />
              <StatusPill color="bg-amber-400" label="Medium" desc="Moderate risk — plan implementation. Moderate impact on security." />
              <StatusPill color="bg-blue-400" label="Low" desc="Minor risk — implement as resources allow." />
              <StatusPill color="bg-slate-400" label="Informational" desc="Best practice — no direct risk but improves posture." />
            </div>
          </SubSection>
        </div>
      ),
    },
    {
      id: 'workspace', icon: Cpu, title: d.workspaceTitle,
      category: 'ai',
      keywords: 'workspace pipeline stages ingestion extraction normalization grouping deduplication generation AI',
      content: (
        <div className="space-y-6">
          <p className="text-sm text-muted-foreground leading-relaxed">{d.workspaceDesc}</p>

          <SubSection title="Pipeline Stages">
            <DocStepList steps={(d.workspaceStages as [string, string][]).map(([stage, desc]) => ({
              title: stage,
              description: desc,
            }))} />
          </SubSection>

          <DocCallout variant="tip">{d.workspaceTip}</DocCallout>

          <DocCallout variant="warning" title="Important">
            Make sure you have at least one AI provider configured in AI Integrations before running the pipeline. The generation quality depends on the model and source quality.
          </DocCallout>
        </div>
      ),
    },
    {
      id: 'editor', icon: FileEdit, title: d.editorTitle,
      category: 'core',
      keywords: 'editor baseline controls review approve reject adjust confidence STRIDE filters mind map',
      content: (
        <div className="space-y-6">
          <p className="text-sm text-muted-foreground leading-relaxed">{d.editorDesc}</p>

          <SubSection title="Control Details">
            <div className="space-y-1">
              <FeatureItem label={d.editorView}>{d.editorViewDesc}</FeatureItem>
              <FeatureItem label={d.editorStride}>{d.editorStrideDesc}</FeatureItem>
              <FeatureItem label={d.editorConfidence}>{d.editorConfidenceDesc}</FeatureItem>
              <FeatureItem label={d.editorStatus}>{d.editorStatusDesc}</FeatureItem>
              <FeatureItem label={d.editorNotes}>{d.editorNotesDesc}</FeatureItem>
              <FeatureItem label={d.editorMindmap}>{d.editorMindmapDesc}</FeatureItem>
            </div>
          </SubSection>

          <SubSection title={d.editorFiltersTitle}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {[d.editorFilter1, d.editorFilter2, d.editorFilter3, d.editorFilter4].map((filter: string, i: number) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-md bg-muted/20 border border-border/30">
                  <Search className="h-3 w-3 text-primary shrink-0" />
                  <span className="text-xs text-muted-foreground">{filter}</span>
                </div>
              ))}
            </div>
          </SubSection>

          <SubSection title="Review Workflow">
            <div className="flex items-center gap-2 flex-wrap text-xs">
              {['Pending', '→', 'Reviewed', '→', 'Approved / Rejected / Adjusted'].map((item, i) => (
                item === '→' ? (
                  <ChevronRight key={i} className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <span key={i} className="px-3 py-1.5 rounded-full bg-muted/40 border border-border/50 font-medium text-foreground">{item}</span>
                )
              ))}
            </div>
          </SubSection>

          <DocCallout variant="tip">
            Start reviewing controls with the lowest confidence scores first — they are most likely to need manual adjustment.
          </DocCallout>
        </div>
      ),
    },
    {
      id: 'traceability', icon: GitBranch, title: d.traceabilityTitle,
      category: 'advanced',
      keywords: 'traceability frameworks NIST ISO CIS MITRE PCI SOC GDPR radar chart mapping export',
      content: (
        <div className="space-y-6">
          <p className="text-sm text-muted-foreground leading-relaxed">{d.traceabilityDesc}</p>

          <SubSection title="Features">
            <div className="space-y-1">
              <FeatureItem label={d.traceabilityFrameworks}>{d.traceabilityFrameworksDesc}</FeatureItem>
              <FeatureItem label={d.traceabilityRadar}>{d.traceabilityRadarDesc}</FeatureItem>
              <FeatureItem label={d.traceabilityCards}>{d.traceabilityCardsDesc}</FeatureItem>
              <FeatureItem label={d.traceabilityFilters}>{d.traceabilityFiltersDesc}</FeatureItem>
              <FeatureItem label={d.traceabilityExport}>{d.traceabilityExportDesc}</FeatureItem>
            </div>
          </SubSection>

          <SubSection title="Supported Frameworks">
            <div className="flex flex-wrap gap-2">
              {['NIST 800-53', 'ISO 27001', 'CIS Controls', 'MITRE ATT&CK', 'PCI DSS', 'SOC 2', 'GDPR'].map(fw => (
                <span key={fw} className="px-2.5 py-1 rounded-full bg-primary/5 border border-primary/20 text-xs font-medium text-primary">{fw}</span>
              ))}
            </div>
          </SubSection>

          <DocCallout variant="tip">{d.traceabilityTip}</DocCallout>
        </div>
      ),
    },
    {
      id: 'history', icon: History, title: d.historyTitle,
      category: 'advanced',
      keywords: 'history versions side-by-side comparison diff restore snapshots audit trail',
      content: (
        <div className="space-y-6">
          <p className="text-sm text-muted-foreground leading-relaxed">{d.historyDesc}</p>

          <SubSection title="Features">
            <div className="space-y-1">
              <FeatureItem label={d.historyVersions}>{d.historyVersionsDesc}</FeatureItem>
              <FeatureItem label={d.historySideBySide}>{d.historySideBySideDesc}</FeatureItem>
              <FeatureItem label={d.historyStats}>{d.historyStatsDesc}</FeatureItem>
              <FeatureItem label={d.historyFilters}>{d.historyFiltersDesc}</FeatureItem>
              <FeatureItem label={d.historyExport}>{d.historyExportDesc}</FeatureItem>
              <FeatureItem label={d.historyRestore}>{d.historyRestoreDesc}</FeatureItem>
            </div>
          </SubSection>

          <DocCallout variant="warning" title="Before Restoring">
            Always create a snapshot of the current version before restoring an older one. While the system creates automatic backups, it's good practice to have an explicit save point.
          </DocCallout>

          <DocCallout variant="tip">{d.historyTip}</DocCallout>
        </div>
      ),
    },
    {
      id: 'export-import', icon: ArrowUpDown, title: d.exportTitle,
      category: 'advanced',
      keywords: 'export import JSON markdown PDF CSV backup format download upload',
      content: (
        <div className="space-y-6">
          <p className="text-sm text-muted-foreground leading-relaxed">{d.exportDesc}</p>

          <SubSection title="Export Formats">
            <DocFeatureGrid columns={2} features={[
              { icon: FileText, title: 'JSON', description: d.exportJsonDesc },
              { icon: FileText, title: 'Markdown', description: d.exportMarkdownDesc },
              { icon: Download, title: 'PDF', description: d.exportPdfDesc },
              { icon: Layers, title: 'CSV', description: d.exportCsvDesc },
            ]} />
          </SubSection>

          <DocCallout variant="tip">{d.exportTip}</DocCallout>

          <DocCallout variant="example" title="Format Guide">
            <ul className="list-disc pl-4 space-y-1 mt-1">
              <li><strong>JSON</strong> — Best for backups and importing into other instances</li>
              <li><strong>Markdown</strong> — Ideal for documentation wikis (Confluence, Notion, GitHub)</li>
              <li><strong>PDF</strong> — Use for formal audit reports and management presentations</li>
              <li><strong>CSV</strong> — Perfect for spreadsheet analysis and custom reporting</li>
            </ul>
          </DocCallout>
        </div>
      ),
    },
    {
      id: 'ai-integrations', icon: Brain, title: d.aiTitle,
      category: 'ai',
      keywords: 'AI integrations providers GPT Gemini Claude model API key configuration default',
      content: (
        <div className="space-y-6">
          <p className="text-sm text-muted-foreground leading-relaxed">{d.aiDesc}</p>

          <SubSection title="Configuration">
            <div className="space-y-1">
              <FeatureItem label={d.aiProviders}>{d.aiProvidersDesc}</FeatureItem>
              <FeatureItem label={d.aiModel}>{d.aiModelDesc}</FeatureItem>
              <FeatureItem label={d.aiTest}>{d.aiTestDesc}</FeatureItem>
              <FeatureItem label={d.aiDefault}>{d.aiDefaultDesc}</FeatureItem>
            </div>
          </SubSection>

          <DocCallout variant="tip">{d.aiTip}</DocCallout>

          <DocCallout variant="info" title="Model Recommendations">
            <ul className="list-disc pl-4 space-y-1 mt-1">
              <li><strong>GPT-5 / Gemini Pro</strong> — Best for complex baselines with many sources</li>
              <li><strong>GPT-5 Mini / Gemini Flash</strong> — Good balance of speed and quality</li>
              <li><strong>Claude</strong> — Excellent for detailed, well-structured control descriptions</li>
            </ul>
          </DocCallout>
        </div>
      ),
    },
    {
      id: 'teams', icon: Users, title: d.teamsTitle,
      category: 'management',
      keywords: 'teams collaboration roles members shared projects notifications invite',
      content: (
        <div className="space-y-6">
          <p className="text-sm text-muted-foreground leading-relaxed">{d.teamsDesc}</p>

          <SubSection title="Features">
            <div className="space-y-1">
              <FeatureItem label={d.teamsCreate}>{d.teamsCreateDesc}</FeatureItem>
              <FeatureItem label={d.teamsRoles}>{d.teamsRolesDesc}</FeatureItem>
              <FeatureItem label={d.teamsShared}>{d.teamsSharedDesc}</FeatureItem>
              <FeatureItem label={d.teamsNotifications}>{d.teamsNotificationsDesc}</FeatureItem>
            </div>
          </SubSection>

          <DocCallout variant="tip">{d.teamsTip}</DocCallout>
        </div>
      ),
    },
    {
      id: 'notifications', icon: Bell, title: d.notificationsTitle,
      category: 'management',
      keywords: 'notifications alerts badge read unread types updates',
      content: (
        <div className="space-y-6">
          <p className="text-sm text-muted-foreground leading-relaxed">{d.notificationsDesc}</p>

          <SubSection title="Details">
            <div className="space-y-1">
              <FeatureItem label={d.notificationsTypes}>{d.notificationsTypesDesc}</FeatureItem>
              <FeatureItem label={d.notificationsBadge}>{d.notificationsBadgeDesc}</FeatureItem>
              <FeatureItem label={d.notificationsRead}>{d.notificationsReadDesc}</FeatureItem>
            </div>
          </SubSection>
        </div>
      ),
    },
    {
      id: 'settings', icon: Settings, title: d.settingsTitle,
      category: 'management',
      keywords: 'settings language output theme tooltips format AI strictness backup preferences',
      content: (
        <div className="space-y-6">
          <p className="text-sm text-muted-foreground leading-relaxed">{d.settingsDesc}</p>

          <SubSection title="Options">
            <div className="space-y-1">
              <FeatureItem label={d.settingsLang}>{d.settingsLangDesc}</FeatureItem>
              <FeatureItem label={d.settingsOutput}>{d.settingsOutputDesc}</FeatureItem>
              <FeatureItem label={d.settingsTheme}>{d.settingsThemeDesc}</FeatureItem>
              <FeatureItem label={d.settingsTooltips}>{d.settingsTooltipsDesc}</FeatureItem>
              <FeatureItem label={d.settingsFormat}>{d.settingsFormatDesc}</FeatureItem>
              <FeatureItem label={d.settingsAi}>{d.settingsAiDesc}</FeatureItem>
              <FeatureItem label={d.settingsBackup}>{d.settingsBackupDesc}</FeatureItem>
            </div>
          </SubSection>

          <DocCallout variant="info" title="AI Strictness Levels">
            <ul className="list-disc pl-4 space-y-1 mt-1">
              <li><strong>Conservative</strong> — Higher precision, fewer controls. Best for audit-critical baselines.</li>
              <li><strong>Balanced</strong> — Good mix of coverage and precision. Recommended default.</li>
              <li><strong>Aggressive</strong> — Maximum coverage, may include more speculative controls.</li>
            </ul>
          </DocCallout>
        </div>
      ),
    },
    {
      id: 'mindmap', icon: Eye, title: d.mindmapTitle,
      category: 'advanced',
      keywords: 'mind map visualization controls categories nodes zoom pan filters toolbar interactive',
      content: (
        <div className="space-y-6">
          <p className="text-sm text-muted-foreground leading-relaxed">{d.mindmapDesc}</p>

          <SubSection title="Components">
            <div className="space-y-1">
              <FeatureItem label={d.mindmapRoot}>{d.mindmapRootDesc}</FeatureItem>
              <FeatureItem label={d.mindmapCategory}>{d.mindmapCategoryDesc}</FeatureItem>
              <FeatureItem label={d.mindmapControl}>{d.mindmapControlDesc}</FeatureItem>
              <FeatureItem label={d.mindmapInteract}>{d.mindmapInteractDesc}</FeatureItem>
              <FeatureItem label={d.mindmapFilters}>{d.mindmapFiltersDesc}</FeatureItem>
              <FeatureItem label={d.mindmapToolbar}>{d.mindmapToolbarDesc}</FeatureItem>
            </div>
          </SubSection>

          <DocCallout variant="tip">
            Use the mind map for a high-level overview of your baseline structure. Click any control node to see its full details in the side panel.
          </DocCallout>
        </div>
      ),
    },
    {
      id: 'security', icon: Lock, title: d.securityTitle,
      category: 'advanced',
      keywords: 'security authentication RLS isolation snapshots encryption keys audit compliance enterprise',
      content: (
        <div className="space-y-6">
          <p className="text-sm text-muted-foreground leading-relaxed">{d.securityDesc}</p>

          <SubSection title="Security Layers">
            <div className="space-y-1">
              <FeatureItem label={d.securityAuth}>{d.securityAuthDesc}</FeatureItem>
              <FeatureItem label={d.securityRls}>{d.securityRlsDesc}</FeatureItem>
              <FeatureItem label={d.securityIsolation}>{d.securityIsolationDesc}</FeatureItem>
              <FeatureItem label={d.securitySnapshots}>{d.securitySnapshotsDesc}</FeatureItem>
              <FeatureItem label={d.securityKeys}>{d.securityKeysDesc}</FeatureItem>
            </div>
          </SubSection>

          <DocCallout variant="success" title="Compliance Ready">
            Aureum's security architecture is designed for enterprise compliance. Immutable version snapshots, full audit trails, and row-level security ensure your baseline data meets regulatory requirements.
          </DocCallout>
        </div>
      ),
    },
    {
      id: 'shortcuts', icon: Zap, title: d.tipsTitle,
      category: 'getting-started',
      keywords: 'tips shortcuts productivity best practices recommendations optimization workflow',
      content: (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[d.tip1, d.tip2, d.tip3, d.tip4, d.tip5, d.tip6, d.tip7, d.tip8].map((tip: string, i: number) => (
              <DocCallout key={i} variant="tip">{tip}</DocCallout>
            ))}
          </div>
        </div>
      ),
    },
    {
      id: 'faq', icon: MessageCircleQuestion, title: d.faqTitle,
      category: 'getting-started',
      keywords: 'FAQ frequently asked questions help support troubleshooting answers common',
      content: (
        <div className="space-y-4">
          {([1,2,3,4,5,6,7,8,9,10] as const).map(n => (
            <div key={n} className="bg-muted/20 border border-border/30 rounded-lg overflow-hidden">
              <div className="p-4">
                <p className="text-sm font-semibold text-foreground flex items-start gap-2.5">
                  <HelpCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  {(d as any)[`faq${n}Q`]}
                </p>
                <p className="text-sm text-muted-foreground mt-2 ml-6.5 leading-relaxed">{(d as any)[`faq${n}A`]}</p>
              </div>
            </div>
          ))}
        </div>
      ),
    },
  ];

  const searchLower = search.toLowerCase();
  const filteredSections = sections.filter(s => {
    const matchesCategory = activeCategory === 'all' || s.category === activeCategory;
    const matchesSearch = !search ||
      s.title.toLowerCase().includes(searchLower) ||
      s.keywords.toLowerCase().includes(searchLower);
    return matchesCategory && matchesSearch;
  });

  const activeContent = filteredSections.find(s => s.id === activeSection) || filteredSections[0];
  const activeIndex = filteredSections.findIndex(s => s.id === activeContent?.id);

  const handleTocSelect = (id: string) => {
    setActiveSection(id);
    const mainEl = document.querySelector('main');
    if (mainEl) mainEl.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const tocItems = filteredSections.map(s => ({ id: s.id, icon: s.icon, title: s.title }));

  const categoryCounts = Object.keys(categoryConfig).reduce((acc, cat) => {
    acc[cat] = sections.filter(s => {
      const matchesSearch = !search ||
        s.title.toLowerCase().includes(searchLower) ||
        s.keywords.toLowerCase().includes(searchLower);
      return s.category === cat && matchesSearch;
    }).length;
    return acc;
  }, {} as Record<string, number>);

  const getMatchSnippet = (s: DocSection): string | null => {
    if (!search) return null;
    const words = s.keywords.split(' ');
    const matched = words.filter(w => w.toLowerCase().includes(searchLower));
    return matched.length > 0 ? matched.slice(0, 4).join(', ') : null;
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto flex gap-8">
      <DocTableOfContents
        items={tocItems}
        activeId={activeContent?.id ?? null}
        onSelect={handleTocSelect}
        search={search}
      />

      <div className="flex-1 min-w-0 max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl gold-gradient flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-display font-semibold text-foreground">{d.title}</h1>
              <p className="text-sm text-muted-foreground">{d.subtitle}</p>
            </div>
          </div>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={d.searchPlaceholder}
              value={search}
              onChange={e => {
                const val = e.target.value;
                setSearch(val);
                if (val) {
                  const matches = sections.filter(s =>
                    s.title.toLowerCase().includes(val.toLowerCase()) ||
                    s.keywords.toLowerCase().includes(val.toLowerCase())
                  );
                  if (matches.length === 1) setActiveSection(matches[0].id);
                }
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

          {/* Category filter bar */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveCategory('all')}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                activeCategory === 'all'
                  ? 'bg-primary/10 text-primary border-primary/30 shadow-sm'
                  : 'bg-muted/30 text-muted-foreground border-border/50 hover:bg-muted/50'
              )}
            >
              All ({sections.filter(s => !search || s.title.toLowerCase().includes(searchLower) || s.keywords.toLowerCase().includes(searchLower)).length})
            </button>
            {(Object.entries(categoryConfig) as [DocCategory, typeof categoryConfig[DocCategory]][]).map(([key, config]) => (
              <button
                key={key}
                onClick={() => setActiveCategory(activeCategory === key ? 'all' : key)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                  activeCategory === key
                    ? `${config.color} shadow-sm`
                    : 'bg-muted/30 text-muted-foreground border-border/50 hover:bg-muted/50',
                  categoryCounts[key] === 0 && 'opacity-40 pointer-events-none'
                )}
              >
                {config.label} ({categoryCounts[key]})
              </button>
            ))}
          </div>
        </div>

        {/* Search results preview */}
        {search && filteredSections.length > 0 && (
          <div className="mb-4 bg-muted/20 border border-border/50 rounded-lg p-3 space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              <Search className="h-3 w-3 inline mr-1" />
              {filteredSections.length} result{filteredSections.length !== 1 ? 's' : ''} for "<HighlightText text={search} highlight={search} />"
            </p>
            {filteredSections.map(s => {
              const snippet = getMatchSnippet(s);
              return (
                <button
                  key={s.id}
                  onClick={() => handleTocSelect(s.id)}
                  className={cn(
                    "w-full text-left flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-xs",
                    activeContent?.id === s.id
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-muted/50 text-foreground"
                  )}
                >
                  <s.icon className="h-3.5 w-3.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <span className="font-medium"><HighlightText text={s.title} highlight={search} /></span>
                    {snippet && (
                      <span className="block text-[10px] text-muted-foreground mt-0.5 truncate">
                        Keywords: <HighlightText text={snippet} highlight={search} />
                      </span>
                    )}
                  </div>
                  <Badge variant="outline" className={cn("text-[9px] shrink-0", categoryConfig[s.category].color)}>
                    {categoryConfig[s.category].label}
                  </Badge>
                </button>
              );
            })}
          </div>
        )}

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
                <div className="mb-8 pb-6 border-b border-border/50">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <activeContent.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-xl font-display font-semibold text-foreground">
                          <HighlightText text={activeContent.title} highlight={search} />
                        </h2>
                        {activeContent.badge && <Badge variant="secondary" className="text-[10px]">{activeContent.badge}</Badge>}
                        <Badge variant="outline" className={cn("text-[9px] ml-auto", categoryConfig[activeContent.category].color)}>
                          {categoryConfig[activeContent.category].label}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-sm">{activeContent.content}</div>
              </div>

              {/* Bottom navigation */}
              <div className="border-t border-border/50 px-6 lg:px-8 py-4 bg-muted/20 flex items-center justify-between">
                <button
                  onClick={() => activeIndex > 0 && handleTocSelect(filteredSections[activeIndex - 1].id)}
                  disabled={activeIndex <= 0}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">{activeIndex > 0 ? filteredSections[activeIndex - 1].title : ''}</span>
                  <span className="sm:hidden">Previous</span>
                </button>

                <span className="text-xs text-muted-foreground tabular-nums">{activeIndex + 1} / {filteredSections.length}</span>

                <button
                  onClick={() => activeIndex < filteredSections.length - 1 && handleTocSelect(filteredSections[activeIndex + 1].id)}
                  disabled={activeIndex >= filteredSections.length - 1}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <span className="hidden sm:inline">{activeIndex < filteredSections.length - 1 ? filteredSections[activeIndex + 1].title : ''}</span>
                  <span className="sm:hidden">Next</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {search && filteredSections.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Search className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">{d.noResults} "{search}"</p>
            <button
              onClick={() => { setSearch(''); setActiveCategory('all'); }}
              className="mt-3 text-xs text-primary hover:underline"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Documentation;

  const handleTocSelect = (id: string) => {
    setActiveSection(id);
    // Scroll to top of content
    const mainEl = document.querySelector('main');
    if (mainEl) mainEl.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // If search is active, filter the TOC items
  const tocItems = (search ? filteredSections : sections).map(s => ({ id: s.id, icon: s.icon, title: s.title }));

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto flex gap-8">
      <DocTableOfContents
        items={tocItems}
        activeId={activeSection}
        onSelect={handleTocSelect}
      />

      <div className="flex-1 min-w-0 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl gold-gradient flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-display font-semibold text-foreground">{d.title}</h1>
              <p className="text-sm text-muted-foreground">{d.subtitle}</p>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={d.searchPlaceholder}
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                // If search matches one section, auto-select it
                const matches = sections.filter(s => s.title.toLowerCase().includes(e.target.value.toLowerCase()));
                if (matches.length === 1) setActiveSection(matches[0].id);
              }}
              className="pl-9"
            />
          </div>
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
                <SectionHeader
                  title={activeContent.title}
                  icon={activeContent.icon}
                  badge={activeContent.badge}
                />
                <div className="text-sm">{activeContent.content}</div>
              </div>

              {/* Bottom navigation */}
              <div className="border-t border-border/50 px-6 lg:px-8 py-4 bg-muted/20 flex items-center justify-between">
                <button
                  onClick={() => activeIndex > 0 && handleTocSelect(sections[activeIndex - 1].id)}
                  disabled={activeIndex <= 0}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">{activeIndex > 0 ? sections[activeIndex - 1].title : ''}</span>
                  <span className="sm:hidden">Previous</span>
                </button>

                <span className="text-xs text-muted-foreground tabular-nums">{activeIndex + 1} / {sections.length}</span>

                <button
                  onClick={() => activeIndex < sections.length - 1 && handleTocSelect(sections[activeIndex + 1].id)}
                  disabled={activeIndex >= sections.length - 1}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <span className="hidden sm:inline">{activeIndex < sections.length - 1 ? sections[activeIndex + 1].title : ''}</span>
                  <span className="sm:hidden">Next</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {search && filteredSections.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Search className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">{d.noResults} "{search}"</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Documentation;
