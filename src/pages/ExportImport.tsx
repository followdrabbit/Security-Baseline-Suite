import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useI18n } from '@/contexts/I18nContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { ExportCardSkeleton } from '@/components/skeletons/SkeletonPremium';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, Upload, FileJson, FileText, FileType, Archive, Settings2, Layers, Sparkles, FileSpreadsheet, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import type { ControlItem, SourceTraceability, ThreatScenario } from '@/types';
import { exportToCSV, exportToPDF, exportToJSON } from '@/components/traceability/exportUtils';

const ExportImport: React.FC = () => {
  const { t } = useI18n();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [exportFormat, setExportFormat] = useState('json');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const { data: projects = [] } = useQuery({
    queryKey: ['export-projects', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, technology, control_count')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const handleExportBaseline = async () => {
    if (!user || !selectedProjectId) {
      toast.error('Please select a project first');
      return;
    }

    setExporting(true);
    try {
      const { data, error } = await supabase
        .from('controls')
        .select('*')
        .eq('user_id', user.id)
        .eq('project_id', selectedProjectId)
        .order('control_id', { ascending: true });

      if (error) throw error;
      if (!data || data.length === 0) {
        toast.error('No controls found for this project');
        setExporting(false);
        return;
      }

      const controls: ControlItem[] = data.map((c) => ({
        id: c.id,
        projectId: c.project_id,
        controlId: c.control_id,
        title: c.title,
        description: c.description || '',
        applicability: c.applicability || '',
        securityRisk: c.security_risk || '',
        criticality: (c.criticality as ControlItem['criticality']) || 'medium',
        defaultBehaviorLimitations: c.default_behavior_limitations || '',
        automation: c.automation || '',
        references: c.references || [],
        frameworkMappings: c.framework_mappings || [],
        threatScenarios: (c.threat_scenarios as unknown as ThreatScenario[]) || [],
        sourceTraceability: (c.source_traceability as unknown as SourceTraceability[]) || [],
        confidenceScore: Number(c.confidence_score) || 0,
        reviewStatus: (c.review_status as ControlItem['reviewStatus']) || 'pending',
        reviewerNotes: c.reviewer_notes || '',
        version: c.version || 1,
        category: c.category || '',
      }));

      const project = projects.find(p => p.id === selectedProjectId);
      const filename = `baseline-${project?.name?.replace(/\s+/g, '-').toLowerCase() || 'export'}`;

      if (exportFormat === 'csv') {
        exportToCSV(controls, filename);
      } else if (exportFormat === 'pdf') {
        exportToPDF(controls, null);
      } else {
        exportToJSON(controls, filename);
      }

      toast.success(`Baseline exported as ${exportFormat.toUpperCase()} (${controls.length} controls)`);
    } catch (err) {
      console.error('Export error:', err);
      toast.error('Failed to export baseline');
    } finally {
      setExporting(false);
    }
  };

  const exportItems = [
    {
      key: 'baseline',
      icon: FileText,
      titleKey: 'exportBaseline',
      description: 'Export the current baseline with all controls, metadata, and framework mappings',
      hasFormats: true,
    },
    { key: 'project', icon: Archive, titleKey: 'exportProject', description: 'Complete project backup including sources, rules, versions, and configurations' },
    { key: 'config', icon: Settings2, titleKey: 'exportConfig', description: 'Export your workspace configuration, AI settings, and preferences' },
    { key: 'template', icon: Layers, titleKey: 'exportTemplate', description: 'Export templates and rule sets for reuse in other projects' },
  ];

  const importItems = [
    { icon: Archive, titleKey: 'importProject', description: 'Import a previously exported project with all associated data' },
    { icon: Settings2, titleKey: 'importConfig', description: 'Restore workspace configuration from a backup file' },
    { icon: Layers, titleKey: 'importTemplate', description: 'Import templates and rule sets from other projects or team members' },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-display font-semibold text-foreground">{t.exportImport.title}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t.exportImport.subtitle}</p>
      </div>

      <Tabs defaultValue="export">
        <TabsList className="bg-muted/50 border border-border">
          <TabsTrigger value="export" className="data-[state=active]:bg-card"><Download className="h-3.5 w-3.5 mr-1.5" />{t.exportImport.export}</TabsTrigger>
          <TabsTrigger value="import" className="data-[state=active]:bg-card"><Upload className="h-3.5 w-3.5 mr-1.5" />{t.exportImport.import}</TabsTrigger>
        </TabsList>

        <TabsContent value="export" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => <ExportCardSkeleton key={i} />)
            ) : (
              exportItems.map((item, i) => (
                <motion.div
                  key={item.key}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="bg-card border border-border rounded-lg p-5 shadow-premium hover:shadow-premium-lg transition-all"
                >
                  <div className="flex items-start gap-3 mb-4">
                    <div className="h-9 w-9 rounded-lg bg-accent flex items-center justify-center shrink-0">
                      <item.icon className="h-4 w-4 text-accent-foreground" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">{(t.exportImport as Record<string, string>)[item.titleKey]}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                    </div>
                  </div>

                  {item.hasFormats && (
                    <>
                      {/* Project selector */}
                      <div className="mb-3">
                        <label className="text-[10px] uppercase tracking-wider text-muted-foreground/60 mb-1.5 block">Project</label>
                        <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder="Select a project" />
                          </SelectTrigger>
                          <SelectContent>
                            {projects.map(p => (
                              <SelectItem key={p.id} value={p.id}>
                                <div className="flex items-center gap-1.5">
                                  <span>{p.name}</span>
                                  <span className="text-muted-foreground text-[10px]">({p.control_count || 0} controls)</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Format selector */}
                      <div className="mb-3">
                        <label className="text-[10px] uppercase tracking-wider text-muted-foreground/60 mb-1.5 block">{t.exportImport.format}</label>
                        <Select value={exportFormat} onValueChange={setExportFormat}>
                          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="json"><div className="flex items-center gap-1.5"><FileJson className="h-3 w-3" />{t.exportImport.json}</div></SelectItem>
                            <SelectItem value="csv"><div className="flex items-center gap-1.5"><FileSpreadsheet className="h-3 w-3" />CSV</div></SelectItem>
                            <SelectItem value="pdf"><div className="flex items-center gap-1.5"><FileType className="h-3 w-3" />{t.exportImport.pdf}</div></SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}

                  <Button
                    size="sm"
                    className="w-full gold-gradient text-primary-foreground hover:opacity-90"
                    onClick={item.hasFormats ? handleExportBaseline : undefined}
                    disabled={item.hasFormats ? (!selectedProjectId || exporting) : false}
                  >
                    {exporting && item.hasFormats ? (
                      <><CheckCircle2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Exporting...</>
                    ) : (
                      <><Download className="h-3.5 w-3.5 mr-1.5" />{t.exportImport.download}</>
                    )}
                  </Button>
                  <p className="text-[10px] text-muted-foreground/50 mt-2">{t.exportImport.lastExport}: {t.exportImport.never}</p>
                </motion.div>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="import" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => <ExportCardSkeleton key={i} />)
            ) : (
              importItems.map((item, i) => (
                <motion.div
                  key={item.titleKey}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="bg-card border border-border rounded-lg p-5 shadow-premium hover:shadow-premium-lg transition-all"
                >
                  <div className="flex items-start gap-3 mb-4">
                    <div className="h-9 w-9 rounded-lg bg-accent flex items-center justify-center shrink-0">
                      <item.icon className="h-4 w-4 text-accent-foreground" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">{(t.exportImport as Record<string, string>)[item.titleKey]}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                    </div>
                  </div>
                  <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/40 transition-colors cursor-pointer mb-3">
                    <Sparkles className="h-6 w-6 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">{t.exportImport.dragDropImport}</p>
                  </div>
                  <Button variant="outline" size="sm" className="w-full">
                    <Upload className="h-3.5 w-3.5 mr-1.5" />{t.exportImport.selectFile}
                  </Button>
                </motion.div>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ExportImport;
