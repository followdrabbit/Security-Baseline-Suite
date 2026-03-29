import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useI18n } from '@/contexts/I18nContext';
import InfoTooltip from '@/components/InfoTooltip';
import HelpButton from '@/components/HelpButton';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Settings2, FileText, PenLine, Layers, Copy, AlertTriangle, BarChart3, GitBranch, BookOpen, Globe, Brain, Save, FolderOpen, Crosshair } from 'lucide-react';

interface RuleBlock {
  id: string;
  icon: React.ElementType;
  labelKey: string;
  tooltipKey?: string;
  content: string;
}

const RulesTemplates: React.FC = () => {
  const { t } = useI18n();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [aiStrictness, setAiStrictness] = useState('balanced');

  const blocks: RuleBlock[] = [
    { id: 'template', icon: FileText, labelKey: 'template', content: 'Enterprise Standard Template — Comprehensive structure with ID, Title, Description, Applicability, Risk, Criticality, Automation, References, and Framework Mappings.' },
    { id: 'structure', icon: Layers, labelKey: 'controlStructure', content: 'Each control must contain: unique ID (format: TECH-SEC-NNN), descriptive title, detailed description, applicability scope, security risk assessment, criticality level, automation guidance, references, and framework mappings.' },
    { id: 'writing', icon: PenLine, labelKey: 'writingStandards', content: 'Professional tone. Imperative mood for requirements. Specific and actionable language. Avoid ambiguous terms. Maximum 3 paragraphs per description. Use active voice.' },
    { id: 'consolidation', icon: Settings2, labelKey: 'consolidation', content: 'Group related evidence by topic similarity > 0.80. Consolidate controls addressing the same security concern. Preserve unique aspects from each source.' },
    { id: 'dedup', icon: Copy, labelKey: 'deduplication', tooltipKey: 'deduplication', content: 'Semantic similarity threshold: 0.85 triggers merge review. Title similarity threshold: 0.90 auto-merge. Preserve the most comprehensive description. Union of all references and mappings.' },
    { id: 'criticality', icon: AlertTriangle, labelKey: 'criticality', tooltipKey: 'criticality', content: 'Critical: Exploitable vulnerability with high impact. High: Significant risk with moderate exploitability. Medium: Moderate risk or limited exploitability. Low: Minor risk. Informational: Best practice.' },
    { id: 'risk', icon: BarChart3, labelKey: 'risk', content: 'Assess using CIA triad (Confidentiality, Integrity, Availability). Consider business impact, regulatory implications, and threat landscape. Score: (Exploitability × Impact) / Mitigating Controls.' },
    { id: 'frameworks', icon: GitBranch, labelKey: 'frameworks', tooltipKey: 'frameworkMapping', content: 'Map to: CIS Benchmarks, NIST 800-53 Rev. 5, ISO 27001:2022, SOC 2 Type II, PCI DSS v4.0, CSA CCM v4. Use official control IDs. Map only when direct correlation exists.' },
    { id: 'references', icon: BookOpen, labelKey: 'references', content: 'Include official vendor documentation, CIS benchmarks, NIST publications, and relevant security advisories. Each control must have at least 1 reference. Prefer primary sources.' },
    { id: 'language', icon: Globe, labelKey: 'outputLanguage', tooltipKey: 'outputLanguage', content: 'Generate baseline content in the selected output language. Technical terms may remain in English when no standard translation exists.' },
    { id: 'threatModeling', icon: Crosshair, labelKey: 'threatModeling', tooltipKey: 'threatModeling', content: 'STRIDE-based threat analysis per control. Each threat scenario must include: threat name, STRIDE category (Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege), attack vector description, threat agent identification, preconditions for exploitation, impact assessment, likelihood rating (Very High/High/Medium/Low/Very Low), specific mitigations, and residual risk evaluation. Minimum 1 threat scenario per control. Align threat likelihood with control criticality level.' },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl lg:text-3xl font-display font-semibold text-foreground">{t.rules.title}</h1>
            <p className="text-sm text-muted-foreground mt-1">{t.rules.subtitle}</p>
          </div>
          <HelpButton section="rules" />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm"><FolderOpen className="h-4 w-4 mr-1.5" />{t.rules.loadTemplate}</Button>
          <Button size="sm" className="gold-gradient text-primary-foreground hover:opacity-90"><Save className="h-4 w-4 mr-1.5" />{t.rules.saveTemplate}</Button>
        </div>
      </div>

      {/* AI Strictness */}
      <div className="bg-card border border-border rounded-lg p-5 shadow-premium">
        <div className="flex items-center gap-2 mb-3">
          <Brain className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">{t.rules.aiStrictness}</span>
          <InfoTooltip content={t.tooltips.aiStrictness} />
        </div>
        <div className="flex gap-2">
          {(['conservative', 'balanced', 'aggressive'] as const).map(level => (
            <button
              key={level}
              onClick={() => setAiStrictness(level)}
              className={`px-4 py-2 rounded-md text-xs font-medium transition-all ${
                aiStrictness === level ? 'gold-gradient text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.rules[level]}
            </button>
          ))}
        </div>
      </div>

      {/* Rule blocks */}
      <div className="space-y-3">
        {blocks.map((block) => (
          <motion.div
            key={block.id}
            className="bg-card border border-border rounded-lg overflow-hidden shadow-premium"
          >
            <button
              className="w-full flex items-center justify-between p-4 hover:bg-muted/20 transition-colors"
              onClick={() => setExpandedId(expandedId === block.id ? null : block.id)}
            >
              <div className="flex items-center gap-3">
                <block.icon className="h-4 w-4 text-primary/70" />
                <span className="text-sm font-medium text-foreground">{(t.rules as Record<string, string>)[block.labelKey]}</span>
                {block.tooltipKey && <InfoTooltip content={(t.tooltips as Record<string, string>)[block.tooltipKey] || ''} />}
              </div>
              <span className="text-xs text-muted-foreground">{expandedId === block.id ? '−' : '+'}</span>
            </button>
            {expandedId === block.id && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-t border-border"
              >
                <div className="p-4">
                  <Textarea value={block.content} rows={4} className="text-sm" readOnly />
                  <div className="flex justify-end mt-3">
                    <Button variant="outline" size="sm">{t.common.edit}</Button>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default RulesTemplates;
